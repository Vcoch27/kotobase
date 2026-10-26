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

test("flexible grading accepts polite endings, bounded fillers and paused repetitions", () => {
  for (const text of ["つよみです", "えっと、強みです", "答えはつよみですよ", "強みと言います", "強み、つよみ。", "つよみ つよみ つよみ"])
    assert.equal(match.matchSpokenAnswer([text], vocab, [], "flexible"), text);
  assert.equal(match.matchSpokenAnswer(["つよみです"], vocab, [], "strict"), null);
  assert.equal(match.matchSpokenAnswer(["あの人です"], { word: "あの人", reading: "あのひと" }, [], "flexible"), "あの人です");
  for (const text of ["私の強み", "弱み、強み", "つよみじゃないです", "強みがあります", "つよに", "つよ", "tsuyomi"])
    assert.equal(match.matchSpokenAnswer([text], vocab, [], "flexible"), null);
});

test("flexible grading equates long-vowel spelling while preserving mora, small kana and voicing", () => {
  for (const [text, reading] of [["こおひい", "コーヒー"], ["せんせー", "せんせい"], ["こーぎょー", "こうぎょう"], ["スーパー", "すうぱあ"]])
    assert.equal(match.matchSpokenAnswer([text], { word: "例", reading }, [], "flexible"), text);
  for (const [text, reading] of [["おばさん", "おばあさん"], ["こと", "コート"], ["びよういん", "びょういん"], ["さか", "さっか"], ["かく", "がく"], ["つよに", "つよみ"]])
    assert.equal(match.matchSpokenAnswer([text], { word: "例", reading }, [], "flexible"), null);
});

test("word variants match separately and flexible homophone carriers explain acceptance", () => {
  const variant = { word: "暖める／温める", reading: "あたためる" };
  for (const text of ["暖める", "温める"])
    assert.equal(match.matchSpokenAnswer([text], variant), text);
  const homophone = { word: "明ける", reading: "あける" };
  assert.equal(match.matchSpokenAnswer(["開けるです"], homophone, ["開ける"], "flexible"), "開けるです");
  assert.equal(match.matchSpokenAnswer(["開けるです"], homophone, ["開ける"], "strict"), null);
  assert.ok(match.spokenMatchExplanation("つよみです", vocab, [], "flexible").includes("Linh hoạt"));
  assert.equal(match.compareSpokenVocabulary("つよみです", vocab, [], "flexible")[1].exact, true);
});

test("exact hypotheses take precedence and the tenth recognition alternative can pass", () => {
  assert.equal(match.matchSpokenAnswer(["つよみです", "強み"], vocab, [], "flexible"), "強み");
  const h = harness();
  h.session.setContext("question-1", true);
  h.session.start();
  const r = h.current();
  r.onstart();
  h.result(r, [...Array(9).fill("別の言葉"), "つよみ"]);
  assert.equal(h.passed.length, 1);
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
      stop() {
        this.stopped = true;
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
  assert.equal(r.maxAlternatives, 10);
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

test("hold release stops audio capture but still accepts a late final result", () => {
  const h = harness();
  h.session.start(false);
  const r = h.current();
  r.onstart();
  h.session.release();
  assert.equal(r.stopped, undefined);
  h.advance(250);
  assert.equal(r.stopped, true);
  assert.equal(r.aborted, undefined);
  assert.equal(h.state().status, "processing");
  h.result(r, ["つよみ"]);
  assert.equal(h.passed.length, 1);
  h.session.setContext("q2", true);
  h.advance(1000);
  assert.equal(h.instances.length, 1);
  h.session.dispose();
});
test("short words accept exact reading plus desu, never unrelated words or substrings", () => {
  const short = { word: "背", reading: "せ" };
  for (const text of ["せ", "背", "せです", "背です"])
    assert.equal(match.matchSpokenAnswer([text], short), text);
  for (const text of ["僕は", "先生です", "せいです", "はせです", "せですね"])
    assert.equal(match.matchSpokenAnswer([text], short), null);
  assert.equal(
    match.matchSpokenAnswer(["です"], { word: "です", reading: "です" }),
    "です",
  );
  assert.equal(match.matchSpokenAnswer(["つよみです"], vocab), null);
  assert.equal(match.compareSpokenVocabulary("せです", short)[1].exact, true);
});
test("short exact interim survives an early engine end instead of being discarded", () => {
  const h = harness();
  h.session.start(false);
  const r = h.current();
  r.onstart();
  h.result(r, ["つよみ"], false);
  r.onend();
  assert.equal(h.passed.length, 1);
  h.advance(500);
  assert.equal(h.passed.length, 1);
  h.session.dispose();
});
test("short speech tail timer is cancelled when changing questions", () => {
  const h = harness();
  h.session.start(false);
  const r = h.current();
  r.onstart();
  h.session.release();
  h.session.setContext("q2", true);
  h.advance(500);
  assert.equal(r.stopped, undefined);
  assert.equal(r.aborted, true);
  h.session.dispose();
});
test("Vietnamese result resets Japanese once without counting a wrong answer", () => {
  const h = harness();
  h.session.start();
  let r = h.current();
  r.onstart();
  h.result(r, ["Cái số cũ", "kaiso"]);
  assert.equal(h.state().languageMismatch, true);
  assert.equal(h.state().attempts, 0);
  assert.equal(h.passed.length, 0);
  h.advance(400);
  r = h.current();
  assert.equal(r.lang, "ja-JP");
  r.onstart();
  h.result(r, ["つよみ"]);
  assert.equal(h.passed.length, 1);
  assert.equal(h.state().languageMismatch, false);
  h.session.dispose();
});
test("Vietnamese result after releasing Space never reopens the mic", () => {
  const h = harness();
  h.session.start(false);
  const r = h.current();
  r.onstart();
  h.session.release();
  h.result(r, ["Cái số cũ"]);
  h.advance(1000);
  assert.equal(h.instances.length, 1);
  assert.equal(h.state().status, "paused");
  assert.equal(h.state().attempts, 0);
  h.session.dispose();
});
test("Vietnamese retry pending is cancelled immediately when Space is released", () => {
  const h = harness();
  h.session.start(false);
  h.current().onstart();
  h.result(h.current(), ["Cái số cũ"]);
  h.session.release();
  h.advance(1000);
  assert.equal(h.instances.length, 1);
  assert.equal(h.state().status, "paused");
  h.session.dispose();
});
test("Vietnamese recovery is bounded and a Japanese alternate is still accepted", () => {
  const h = harness();
  h.session.start();
  h.current().onstart();
  h.result(h.current(), ["Cái số cũ"]);
  h.advance(400);
  h.current().onstart();
  h.result(h.current(), ["Cái số cũ"]);
  h.advance(1000);
  assert.equal(h.instances.length, 2);
  assert.equal(h.state().status, "paused");
  h.session.dispose();
  const valid = harness();
  valid.session.start();
  valid.current().onstart();
  valid.result(valid.current(), ["Cái số cũ", "強み"]);
  assert.equal(valid.passed.length, 1);
  valid.session.dispose();
});
test("released wrong answer never restarts; holding can start another attempt", () => {
  const h = harness();
  h.session.start(false);
  const r = h.current();
  r.onstart();
  h.session.release();
  h.result(r, ["つよに"]);
  r.onend();
  h.advance(1000);
  assert.equal(h.instances.length, 1);
  assert.equal(h.state().status, "paused");
  h.session.start(false);
  assert.equal(h.instances.length, 2);
  h.session.dispose();
});
test("release while permission is starting and missing final both time out safely", () => {
  const h = harness();
  h.session.start(false);
  const r = h.current();
  h.session.release();
  r.onstart();
  h.advance(3000);
  assert.equal(h.state().status, "paused");
  assert.equal(h.passed.length, 0);
  h.session.dispose();
});
test("hold mode cannot arm the next question while the key is still held", () => {
  const h = harness();
  h.session.start(false);
  h.current().onstart();
  h.result(h.current(), ["強み"]);
  h.session.setContext("q2", true);
  h.advance(1000);
  assert.equal(h.instances.length, 1);
  h.session.release();
  h.session.dispose();
});
test("comparison shows distinct word and reading matches including reading variants", () => {
  const rows = match.compareSpokenVocabulary("つよみ", vocab);
  assert.equal(rows[0].expected, "強み");
  assert.equal(rows[0].exact, false);
  assert.equal(rows[1].expected, "つよみ");
  assert.equal(rows[1].exact, true);
  const variants = match.compareSpokenVocabulary("あす", {
    word: "明日",
    reading: "あした／あす",
  });
  assert.equal(variants[1].exact, true);
  assert.equal(
    variants[1].characters.every((c) => c.matched),
    true,
  );
  assert.equal(
    match.compareSpokenVocabulary("", vocab).some((row) => row.exact),
    false,
  );
});
test("review keeps unique missed words even after subsequent correct attempts", () => {
  const list = [vocab];
  const item = { id: "a", ...vocab };
  let review = match.addReviewWord([], item);
  review = match.addReviewWord(review, item);
  review = match.addReviewWord(review, { id: "b", word: "反省" });
  assert.equal(review.length, 2);
  assert.equal(review[0].id, "a");
  assert.equal(list.length, 1);
});

function shortcutHarness() {
  const callbacks = new Map();
  const calls = [];
  let canSpeak = true,
    canSkip = true;
  const target = {
    addEventListener(name, fn) {
      callbacks.set(name, fn);
    },
    removeEventListener(name) {
      callbacks.delete(name);
    },
  };
  const { bindSpeakingShortcuts } = load("src/lib/speaking-shortcuts.ts");
  const cleanup = bindSpeakingShortcuts(target, {
    canSpeak: () => canSpeak,
    canSkip: () => canSkip,
    canAdvance: () => !canSkip,
    canSample: () => true,
    sample: () => calls.push("sample"),
    startHeld: () => calls.push("start"),
    releaseHeld: () => calls.push("release"),
    skip: () => calls.push("skip"),
    advance: () => calls.push("advance"),
    pause: () => calls.push("pause"),
  });
  function event(name, props = {}) {
    const e = {
      key: " ",
      code: "Space",
      target: { closest: () => false },
      preventDefault() {
        this.prevented = true;
      },
      ...props,
    };
    callbacks.get(name)?.(e);
    return e;
  }
  return {
    calls,
    callbacks,
    cleanup,
    event,
    resolve() {
      canSpeak = false;
      canSkip = false;
    },
  };
}
test("Space hold starts once, autorepeat does not restart, keyup releases even from an input", () => {
  const h = shortcutHarness();
  assert.equal(h.event("keydown").prevented, true);
  h.event("keydown", { repeat: true });
  h.event("keyup", { target: { closest: () => true } });
  assert.deepEqual(h.calls, ["start", "release"]);
  h.cleanup();
  assert.equal(h.callbacks.size, 0);
});
test("Backquote plays sample before/after answer, releases held mic and ignores repeats/inputs/modifiers", () => {
  const h = shortcutHarness();
  const key = { key: "`", code: "Backquote" };
  h.event("keydown");
  h.event("keydown", key);
  h.event("keydown", { ...key, repeat: true });
  h.event("keydown", { ...key, target: { closest: () => true } });
  h.event("keydown", { ...key, ctrlKey: true });
  h.event("keydown", { ...key, shiftKey: true });
  assert.deepEqual(h.calls, ["start", "release", "sample"]);
  h.resolve();
  h.event("keydown", key);
  assert.equal(h.calls.at(-1), "sample");
  assert.equal(h.calls.length, 4);
  h.cleanup();
});

test("homophones accept exact shared reading with paired dictionary entries, not similar Kanji", () => {
  const target = { word: "明ける", reading: "あける" };
  const words = match.homophonesFromDictionary(target, [
    { japanese: [{ word: "開ける", reading: "あける" }, { word: "開く", reading: "ひらく" }] },
    { japanese: [{ word: "空ける", reading: "アケル" }] },
    { japanese: [{ word: "明るい", reading: "あかるい" }] },
    { japanese: [{ word: "誤り" }] },
    null,
  ]);
  assert.equal(match.matchSpokenAnswer(["開ける"], target, words), "開ける");
  assert.equal(match.matchSpokenAnswer(["空ける。"], target, words), "空ける。");
  for (const wrong of ["開く", "明るい", "誤り", "開け", "開けるです"])
    assert.equal(match.matchSpokenAnswer([wrong], target, words), null);
  assert.equal(match.compareSpokenVocabulary("開ける", target, words)[1].exact, true);
  assert.equal(match.compareSpokenVocabulary("開ける", target, words)[0].exact, false);
  assert.deepEqual(Array.from(match.homophonesFromDictionary(target, {})), []);
});

test("homophones lookup shares cached reading requests and fails closed without Firestore", async () => {
  let requests = 0;
  const resolver = load("src/lib/speaking-match.ts", {
    AbortController, setTimeout, clearTimeout,
    fetch: async (url) => {
      requests++;
      assert.equal(url.startsWith("/api/jisho?keyword="), true);
      return { ok: true, json: async () => ({ data: [{ japanese: [{ word: "開ける", reading: "あける" }] }] }) };
    },
  });
  const results = await Promise.all([
    resolver.loadSpokenHomophones({ word: "明ける", reading: "あける" }),
    resolver.loadSpokenHomophones({ word: "空ける", reading: "あける" }),
  ]);
  assert.equal(requests, 1);
  assert.equal(results[0][0], "開ける");
  assert.equal(results[1][0], "開ける");
  const failed = load("src/lib/speaking-match.ts", {
    AbortController, setTimeout, clearTimeout,
    fetch: async () => { throw Error("offline"); },
  });
  assert.equal((await failed.loadSpokenHomophones({ word: "明ける", reading: "あける" })).length, 0);
});
test("Tab skips with no repeat; Shift+Tab and text inputs keep native navigation", () => {
  const h = shortcutHarness();
  assert.equal(
    h.event("keydown", { key: "Tab", code: "Tab", shiftKey: true }).prevented,
    undefined,
  );
  h.event("keydown", {
    key: "Tab",
    code: "Tab",
    target: { closest: () => true },
  });
  h.event("keydown", { key: "Tab", code: "Tab" });
  h.event("keydown", { key: "Tab", code: "Tab", repeat: true });
  assert.deepEqual(h.calls, ["skip"]);
  h.cleanup();
});
test("blur/cleanup release held mic; resolved question cannot be skipped again", () => {
  const h = shortcutHarness();
  h.event("keydown");
  h.event("blur");
  assert.deepEqual(h.calls, ["start", "release", "pause"]);
  h.resolve();
  h.event("keydown", { key: "Tab", code: "Tab" });
  h.event("keydown", { key: "Enter", code: "Enter" });
  assert.equal(h.calls.at(-1), "advance");
  assert.equal(h.calls.includes("skip"), false);
  h.cleanup();
});

function sampleHarness(loaded = true) {
  let voiceLoaded = loaded,
    id = 0;
  const timers = new Map(),
    listeners = new Map(),
    utterances = [],
    completed = [],
    statuses = [];
  const { playSpeakingSample } = load("src/lib/speaking-sample.ts", {
    setTimeout(fn) {
      timers.set(++id, fn);
      return id;
    },
    clearTimeout(key) {
      timers.delete(key);
    },
  });
  const synth = {
    cancel() {},
    getVoices: () => (voiceLoaded ? [{ lang: "ja-JP" }] : []),
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
    speak(utterance) {
      utterances.push(utterance);
    },
  };
  const cancel = playSpeakingSample(
    "つよみ／別",
    {
      status: (value) => statuses.push(value),
      done: (error) => completed.push(error),
    },
    synth,
    (text) => ({ text }),
    0.7,
  );
  return {
    utterances,
    completed,
    timers,
    listeners,
    cancel,
    statuses,
    voices() {
      voiceLoaded = true;
      listeners.get("voiceschanged")?.();
    },
    timeout() {
      const fn = timers.values().next().value;
      if (fn) fn();
    },
  };
}
test("sample uses Japanese first reading, reports completion once and respects volume", () => {
  const h = sampleHarness();
  const u = h.utterances[0];
  assert.equal(u.text, "つよみ");
  assert.equal(u.lang, "ja-JP");
  assert.equal(u.volume, 0.7);
  u.onend();
  u.onerror();
  assert.equal(h.completed.length, 1);
  assert.equal(h.timers.size, 0);
  h.cancel();
});
test("delayed voices start sample once; cancel blocks late callbacks", () => {
  const h = sampleHarness(false);
  assert.equal(h.utterances.length, 0);
  h.voices();
  h.voices();
  assert.equal(h.utterances.length, 1);
  h.cancel();
  h.utterances[0].onend();
  assert.equal(h.completed.length, 0);
  assert.equal(h.timers.size, 0);
});
test("missing voices and synthesis errors surface failure without hanging countdown", () => {
  const h = sampleHarness(false);
  h.timeout();
  assert.equal(h.completed.length, 1);
  assert.ok(h.completed[0]);
  h.cancel();
  const broken = sampleHarness();
  broken.utterances[0].onerror();
  assert.equal(broken.completed.length, 1);
  broken.cancel();
});

test("utterance construction failure reports an error instead of leaving audio busy", () => {
  const { playSpeakingSample } = load("src/lib/speaking-sample.ts", {
    setTimeout,
    clearTimeout,
  });
  const completed = [];
  const synth = {
    cancel() {},
    getVoices: () => [{ lang: "ja-JP" }],
    removeEventListener() {},
    speak() {},
  };
  playSpeakingSample(
    "つよみ",
    { status() {}, done: (error) => completed.push(error) },
    synth,
    () => {
      throw new Error("unsupported voice");
    },
  );
  assert.equal(completed.length, 1);
  assert.ok(completed[0]);
});
