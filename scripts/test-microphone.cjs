const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, globals = {}, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const context = {
    exports: {},
    DOMException,
    AbortController,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`);
      return dependencies[name];
    },
    ...globals,
  };
  vm.runInNewContext(code, context);
  return context.exports;
}
const settings = load("src/lib/microphone-settings.ts");
const prefs = {
  ...settings.DEFAULT_MICROPHONE_SETTINGS,
  deviceId: "usb",
  gain: 1.5,
};
test("preferences reject malformed values and clamp input gain", () => {
  assert.equal(
    settings.normalizeMicrophoneSettings({
      gain: 99,
      noiseSuppression: false,
      echoCancellation: "false",
    }).gain,
    2,
  );
  assert.equal(settings.normalizeMicrophoneSettings({ gain: NaN }).gain, 1);
  assert.equal(
    settings.normalizeMicrophoneSettings({ echoCancellation: "false" })
      .echoCancellation,
    true,
  );
  assert.equal(settings.loadMicrophoneSettings().deviceId, "");
});
test("microphone constraints only request supported processing and chosen device", () => {
  const request = settings.microphoneConstraints(prefs, {
    noiseSuppression: true,
  });
  assert.equal(request.video, false);
  assert.equal(request.audio.deviceId.exact, "usb");
  assert.equal(request.audio.noiseSuppression.ideal, true);
  assert.equal(request.audio.echoCancellation, undefined);
});
test("processed recognition gate excludes mobile, Safari and older Chromium", () => {
  for (const ua of [
    "Mozilla Chrome/135.0.0.0 Safari/537.36",
    "Mozilla Chrome/143.0 Edg/143.0",
  ])
    assert.equal(settings.supportsProcessedRecognition(ua), true);
  for (const ua of [
    "Mozilla Chrome/134.0",
    "Android Chrome/143.0",
    "iPad Safari/18",
    "Safari/18",
    "Chrome/143.0 OPR/100",
    "Mobile Chrome/143.0",
  ])
    assert.equal(settings.supportsProcessedRecognition(ua), false);
});
test("meter handles silence, quiet speech and clipping without NaN", () => {
  assert.equal(settings.measureMicrophone(new Float32Array(8)).db, -80);
  const quiet = settings.measureMicrophone(new Float32Array([0.001, -0.001]));
  assert.ok(Math.abs(quiet.db + 60) < 0.01);
  assert.equal(quiet.clipping, false);
  assert.equal(
    settings.measureMicrophone(new Float32Array([0.99])).clipping,
    true,
  );
});
test("blocked storage does not claim settings were saved", () => {
  const mic = load("src/lib/microphone-settings.ts", {
    localStorage: {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    },
  });
  assert.equal(mic.loadMicrophoneSettings().gain, 1);
  assert.equal(mic.saveMicrophoneSettings(prefs), false);
});

function captureHarness(pending = false) {
  const calls = {
    closed: 0,
    rawStopped: 0,
    processedStopped: 0,
    connections: [],
    requests: [],
  };
  const rawTrack = {
    stop() {
      calls.rawStopped++;
    },
    getSettings: () => ({ noiseSuppression: true, echoCancellation: true }),
  };
  const outputTrack = {
    kind: "audio",
    readyState: "live",
    stop() {
      calls.processedStopped++;
    },
  };
  const raw = { getTracks: () => [rawTrack], getAudioTracks: () => [rawTrack] };
  const stream = {
    getTracks: () => [outputTrack],
    getAudioTracks: () => [outputTrack],
  };
  const node = (name) => ({
    name,
    connect(to) {
      calls.connections.push([name, to.name]);
    },
    disconnect() {},
  });
  let filter, gain, resolve;
  class AudioContext {
    constructor() {
      this.destination = node("speakers");
    }
    resume() {
      return Promise.resolve();
    }
    close() {
      calls.closed++;
      return Promise.resolve();
    }
    createMediaStreamSource() {
      return node("input");
    }
    createBiquadFilter() {
      filter = { ...node("filter"), frequency: { value: 0 } };
      return filter;
    }
    createGain() {
      gain = { ...node("gain"), gain: { value: 0 } };
      return gain;
    }
    createAnalyser() {
      return node("analyser");
    }
    createMediaStreamDestination() {
      return { ...node("output"), stream };
    }
  }
  const mic = load(
    "src/lib/microphone-capture.ts",
    {
      window: { isSecureContext: true },
      AudioContext,
      navigator: {
        mediaDevices: {
          getSupportedConstraints: () => ({ noiseSuppression: true }),
          getUserMedia(request) {
            calls.requests.push(request);
            return pending
              ? new Promise((r) => {
                  resolve = r;
                })
              : Promise.resolve(raw);
          },
        },
      },
    },
    { "./microphone-settings": settings },
  );
  return {
    mic,
    calls,
    stream,
    raw,
    filter: () => filter,
    gain: () => gain,
    resolve: () => resolve(raw),
  };
}
test("capture wires filtered/gained mic to processed track, never to speakers", async () => {
  const h = captureHarness();
  const capture = await h.mic.openMicrophone(prefs);
  assert.equal(h.filter().frequency.value, 80);
  assert.equal(h.gain().gain.value, 1.5);
  assert.equal(
    h.calls.connections.some(([, to]) => to === "speakers"),
    false,
  );
  assert.equal(capture.settings.noiseSuppression, true);
  capture.dispose();
  capture.dispose();
  assert.equal(h.calls.closed, 1);
  assert.equal(h.calls.rawStopped, 1);
  assert.equal(h.calls.processedStopped, 1);
});
test("permission reply after cancellation is closed and never becomes an active capture", async () => {
  const h = captureHarness(true);
  const controller = new AbortController();
  const request = h.mic.openMicrophone(prefs, controller.signal);
  const rejected = assert.rejects(
    request,
    (error) => error.name === "AbortError",
  );
  await new Promise(setImmediate);
  controller.abort();
  h.resolve();
  await rejected;
  assert.ok(h.calls.rawStopped > 0);
  assert.ok(h.calls.closed > 0);
  assert.equal(h.calls.connections.length, 0);
});

const { withProcessedMicrophone } = load("src/lib/microphone-recognition.ts");
function adapterHarness() {
  let resolve;
  const calls = {
    starts: [],
    dispose: 0,
    inputStopped: 0,
    abort: 0,
    stop: 0,
    errors: [],
    ended: 0,
  };
  const native = {
    lang: "",
    start(track) {
      calls.starts.push(track);
    },
    stop() {
      calls.stop++;
    },
    abort() {
      calls.abort++;
    },
    onerror: (event) => calls.errors.push(event.error),
  };
  const track = { kind: "audio", readyState: "live" };
  const value = {
    stream: { getAudioTracks: () => [track] },
    stopInput() {
      calls.inputStopped++;
    },
    dispose() {
      calls.dispose++;
    },
  };
  const proxy = withProcessedMicrophone(
    native,
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  proxy.onend = () => calls.ended++;
  return { calls, native, proxy, value, track, resolve: () => resolve(value) };
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
test("recognition receives processed track; release stops hardware and keeps final callbacks", async () => {
  const h = adapterHarness();
  h.proxy.lang = "ja-JP";
  h.proxy.start();
  h.resolve();
  await flush();
  assert.equal(h.native.lang, "ja-JP");
  assert.equal(h.calls.starts[0], h.track);
  h.proxy.stop();
  assert.equal(h.calls.inputStopped, 1);
  assert.equal(h.calls.stop, 1);
  h.native.onend();
  assert.equal(h.calls.dispose, 1);
  assert.equal(h.calls.ended, 1);
});
test("Japanese language is reapplied immediately before processed recognition starts", async () => {
  const h = adapterHarness();
  h.proxy.lang = "ja-JP";
  h.proxy.start();
  h.native.lang = "vi-VN";
  h.resolve();
  await flush();
  assert.equal(h.native.lang, "ja-JP");
  assert.equal(h.calls.starts[0], h.track);
  h.proxy.abort();
});
test("recognition cancelled before permission reply cannot start later", async () => {
  const h = adapterHarness();
  h.proxy.start();
  h.proxy.abort();
  h.resolve();
  await flush();
  assert.equal(h.calls.starts.length, 0);
  assert.equal(h.calls.dispose, 1);
});
test("release before permission reply ends safely without opening recognition", async () => {
  const h = adapterHarness();
  h.proxy.start();
  h.proxy.stop();
  h.resolve();
  await flush();
  assert.equal(h.calls.ended, 1);
  assert.equal(h.calls.starts.length, 0);
  assert.equal(h.calls.dispose, 1);
});
test("invalid processed track fails explicitly rather than silently using a different mic", async () => {
  const h = adapterHarness();
  h.track.readyState = "ended";
  h.proxy.start();
  h.resolve();
  await flush();
  assert.equal(h.calls.starts.length, 0);
  assert.equal(h.calls.errors[0], "processed-audio");
  assert.equal(h.calls.dispose, 1);
});
