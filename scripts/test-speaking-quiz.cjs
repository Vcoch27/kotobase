const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const context = { exports: {}, ...globals };
  vm.runInNewContext(code, context);
  return context.exports;
}
const match = load("src/lib/speaking-match.ts");
const vocab = { word: "強み", reading: "つよみ" };
test("exact word, reading, full-width and katakana work; punctuation is harmless", () => {
  for (const text of ["強み", "つよみ", "ツヨミ", " つよみ。", "ﾂﾖﾐ"])
    assert.equal(match.matchSpokenAnswer([text], vocab), text);
});
test("no substring, fuzzy, romaji or one-character false pass", () => {
  for (const text of [
    "",
    "つよ",
    "つよみです",
    "私の強み",
    "つよに",
    "tsuyomi",
  ])
    assert.equal(match.matchSpokenAnswer([text], vocab), null);
});
test("long vowels, small kana, geminate and dakuten stay distinct", () => {
  for (const [wrong, reading] of [
    ["こと", "コート"],
    ["きよう", "きょう"],
    ["さか", "さっか"],
    ["かく", "がく"],
  ]) {
    assert.equal(
      match.matchSpokenAnswer([wrong], { word: "例", reading }),
      null,
    );
  }
});
test("explicit reading variants and alternate recognition hypotheses", () => {
  assert.equal(
    match.matchSpokenAnswer(["競合", "キョウゴウ"], {
      word: "強豪",
      reading: "きょうごう",
    }),
    "キョウゴウ",
  );
  assert.equal(
    match.matchSpokenAnswer(["あす"], {
      word: "明日",
      reading: "あした／あす;みょうにち",
    }),
    "あす",
  );
  assert.equal(
    match.matchSpokenAnswer(["くる"], { word: "来る", reading: "くる (come)" }),
    null,
  );
  assert.equal(
    match.matchSpokenAnswer([""], { word: "", reading: null }),
    null,
  );
});
test("diff explains normalized text and stays bounded for long transcripts", () => {
  const diff = match.compareSpokenText("ツヨニ", "つよみ");
  assert.equal(diff.map((x) => x.text).join(""), "つよに");
  assert.equal(diff.filter((x) => x.matched).length, 2);
  assert.equal(match.compareSpokenText("あ".repeat(10000), "あ").length, 120);
});

function harness(factoryPresent = true) {
  let now = 1000,
    id = 0;
  const timers = new Map();
  const states = [],
    passed = [],
    instances = [];
  class FakeDate extends Date {
    static now() {
      return now;
    }
  }
  const { SpeechSession } = load("src/lib/speech-session.ts", {
    Date: FakeDate,
    setTimeout(fn, ms) {
      timers.set(++id, { fn, at: now + ms });
      return id;
    },
    clearTimeout(key) {
      timers.delete(key);
    },
  });
  function advance(ms) {
    const end = now + ms;
    while (true) {
      const next = [...timers.entries()]
        .filter(([, t]) => t.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].fn();
    }
    now = end;
  }
  const factory = () => {
    const recognition = {
      start() {
        this.started = true;
      },
      abort() {
        this.aborted = true;
      },
    };
    instances.push(recognition);
    return recognition;
  };
  const session = new SpeechSession(
    factoryPresent ? factory : null,
    (state) => states.push(state),
    (alternatives) => match.matchSpokenAnswer(alternatives, vocab),
    (text) => passed.push(text),
  );
  session.setContext("q1", true);
  const result = (r, alternatives, final = true) =>
    r.onresult?.({
      resultIndex: 0,
      results: [
        {
          isFinal: final,
          length: alternatives.length,
          ...Object.fromEntries(
            alternatives.map((transcript, i) => [i, { transcript }]),
          ),
        },
      ],
    });
  return {
    session,
    states,
    passed,
    instances,
    advance,
    result,
    timers,
    current: () => instances.at(-1),
    state: () => states.at(-1),
  };
}
test("explicit start only; Japanese settings and real start/speech events drive status", () => {
  const h = harness();
  assert.equal(h.instances.length, 0);
  h.session.start();
  const r = h.current();
  assert.equal(r.lang, "ja-JP");
  assert.equal(r.interimResults, true);
  assert.equal(r.maxAlternatives, 3);
  assert.equal(h.state().status, "starting");
  r.onstart();
  assert.equal(h.state().status, "listening");
  r.onspeechstart();
  assert.equal(h.state().status, "hearing");
  h.session.dispose();
  assert.equal(r.aborted, true);
  assert.equal(h.timers.size, 0);
});
test("wrong final retries automatically; exact final stops microphone and passes once", () => {
  const h = harness();
  h.session.start();
  let r = h.current();
  r.onstart();
  h.result(r, ["つよに"]);
  assert.equal(h.passed.length, 0);
  assert.equal(h.state().attempts, 1);
  r.onend();
  h.advance(400);
  r = h.current();
  r.onstart();
  const late = r.onresult;
  h.result(r, ["強み"]);
  assert.equal(h.passed.length, 1);
  assert.equal(r.aborted, true);
  late({
    resultIndex: 0,
    results: [{ 0: { transcript: "強み" }, length: 1, isFinal: true }],
  });
  h.advance(1000);
  assert.equal(h.passed.length, 1);
  h.session.dispose();
});
test("interim text is live; stable match accepts after 350ms and revisions cancel it", () => {
  const h = harness();
  h.session.start();
  const r = h.current();
  r.onstart();
  h.result(r, ["つよみ"], false);
  h.advance(200);
  assert.equal(h.passed.length, 0);
  h.result(r, ["つよみです"], false);
  h.advance(400);
  assert.equal(h.passed.length, 0);
  h.result(r, ["つよみ"], false);
  h.advance(350);
  assert.equal(h.passed.length, 1);
  h.session.dispose();
});
test("context change blocks old results and auto-resumes next question without a new click", () => {
  const h = harness();
  h.session.start();
  const old = h.current();
  const late = old.onresult;
  h.session.setContext("q1", false);
  assert.equal(old.aborted, true);
  h.session.setContext("q2", true);
  assert.equal(h.instances.length, 2);
  late({
    resultIndex: 0,
    results: [{ 0: { transcript: "強み" }, length: 1, isFinal: true }],
  });
  assert.equal(h.passed.length, 0);
  assert.equal(h.state().transcript, "");
  h.session.dispose();
});
test("repeated identical interim hypotheses do not postpone a stable match forever", () => {
  const h = harness();
  h.session.start();
  const r = h.current();
  r.onstart();
  h.result(r, ["つよみ"], false);
  h.advance(200);
  h.result(r, ["つよみ"], false);
  h.advance(150);
  assert.equal(h.passed.length, 1);
  h.session.dispose();
});
test("a withdrawn empty hypothesis cancels an interim match", () => {
  const h = harness();
  h.session.start();
  const r = h.current();
  r.onstart();
  h.result(r, ["つよみ"], false);
  h.advance(200);
  h.result(r, [""], false);
  h.advance(400);
  assert.equal(h.passed.length, 0);
  assert.equal(h.state().transcript, "");
  h.session.dispose();
});
test("permission/network/capture errors stop retry loops until explicit restart", () => {
  for (const error of [
    "not-allowed",
    "network",
    "audio-capture",
    "service-not-allowed",
    "language-not-supported",
    "aborted",
  ]) {
    const h = harness();
    h.session.start();
    const r = h.current();
    const lateEnd = r.onend;
    r.onerror({ error });
    assert.equal(h.state().status, "error");
    lateEnd();
    h.advance(100000);
    assert.equal(h.instances.length, 1);
    h.session.start();
    assert.equal(h.instances.length, 2);
    h.session.dispose();
  }
});
test("no-speech is not scored wrong; repeated silence eventually pauses", () => {
  const h = harness();
  h.session.start();
  for (let i = 0; i < 8; i++) {
    const r = h.current();
    r.onstart();
    r.onerror({ error: "no-speech" });
    r.onend();
    h.advance(400);
  }
  assert.equal(h.state().status, "paused");
  assert.equal(h.state().attempts, 0);
  assert.equal(h.passed.length, 0);
  h.advance(100000);
  assert.equal(h.instances.length, 8);
  h.session.dispose();
});
test("pause revokes auto-resume intent, dispose clears timers, unsupported is safe", () => {
  const h = harness();
  h.session.start();
  const oldEnd = h.current().onend;
  h.session.pause();
  oldEnd();
  h.session.setContext("q2", true);
  h.advance(1000);
  assert.equal(h.instances.length, 1);
  h.session.dispose();
  assert.equal(h.timers.size, 0);
  const unsupported = harness(false);
  unsupported.session.start();
  assert.equal(unsupported.state().status, "unsupported");
  unsupported.session.dispose();
});
test("missing onstart times out; no indefinite opening-micro state", () => {
  const h = harness();
  h.session.start();
  h.advance(12000);
  assert.equal(h.state().status, "error");
  assert.equal(h.current().aborted, true);
  h.session.dispose();
});
test("attempt history retains only six actual final attempts", () => {
  const h = harness();
  h.session.start();
  for (let i = 0; i < 12; i++) {
    h.current().onstart();
    h.result(h.current(), ["つよに"]);
    h.current().onend();
    h.advance(400);
  }
  assert.equal(h.state().history.length, 6);
  assert.equal(h.state().attempts, 12);
  h.session.dispose();
});
