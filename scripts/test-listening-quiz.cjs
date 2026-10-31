const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, globals = {}, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, console, ...globals, require(name) {
    if (!(name in dependencies)) throw Error(`Unexpected import ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(code, context);
  return context.exports;
}
const spoken = load("src/lib/speaking-match.ts");
const quiz = load("src/lib/listening-quiz.ts", {}, { "./speaking-match": spoken });
const target = { id: "strong", word: "強み", reading: "つよみ", meaning: "Điểm mạnh, thế mạnh <<tsuyomi>>" };
const pool = [target,
  { id: "reflect", word: "反省", reading: "はんせい", meaning: "Nhìn lại, tự kiểm điểm" },
  { id: "coffee", word: "コーヒー", reading: "コーヒー", meaning: "Cà phê" },
  { id: "weak", word: "弱み", reading: "よわみ", meaning: "Điểm yếu" },
];
test("dictation accepts Japanese word/reading/width but not fuzzy, romaji or polite extensions", () => {
  for (const value of ["強み", "つよみ", "ツヨミ", " つよみ。 "]) assert.equal(quiz.matchListeningText(value, target, pool), true);
  for (const value of ["", "tsuyomi", "つよ", "つよに", "つよみです", "私の強み"]) assert.equal(quiz.matchListeningText(value, target, pool), false);
  assert.equal(quiz.matchListeningText("温める", { ...target, word: "暖める／温める", reading: "あたためる" }), true);
});
test("meaning choices hide reading tips and duplicate/synonymous/homophone meanings cannot be distractors", () => {
  const bridge = { id: "bridge", word: "橋", reading: "はし", meaning: "Cây cầu" };
  const chopsticks = { id: "chopsticks", word: "箸", reading: "はし", meaning: "Đũa" };
  const question = quiz.buildMeaningQuestion(bridge, [bridge, chopsticks,
    { id: "same", word: "同じ", reading: "おなじ", meaning: "Cây cầu <<hashi>>" }, ...pool], () => 0.5);
  assert.ok(question.correctId);
  assert.equal(question.choices.length, 4);
  assert.equal(question.choices.some((choice) => choice.label === "Đũa"), false);
  assert.equal(question.choices.filter((choice) => choice.label === "Cây cầu").length, 1);
  assert.equal(question.choices.some((choice) => /<<|つよみ/.test(choice.label)), false);
  assert.equal(quiz.matchListeningText("箸", bridge, [bridge, chopsticks]), true);
  const synonymous = quiz.buildMeaningQuestion(target, [...pool,
    { id: "duplicate", word: "長所", reading: "ちょうしょ", meaning: "Thế mạnh" }], () => 0.5);
  assert.equal(synonymous.choices.some((choice) => choice.label === "Thế mạnh"), false);
});
test("small or empty-meaning decks never manufacture distractors or claim verified comprehension", () => {
  const question = quiz.buildMeaningQuestion(target, [target]);
  assert.equal(question.correctId, null); assert.equal(question.choices.length, 0);
  const result = quiz.gradeListeningAttempt({ word: target, pool: [target], question, typed: "つよみ", meaningId: null, freeMeaning: "Điểm mạnh" });
  assert.equal(result.dictationCorrect, true); assert.equal(result.meaningCorrect, null); assert.equal(result.mastered, false);
  assert.equal(quiz.buildMeaningQuestion({ ...target, meaning: "<<hint>>" }, pool).correctId, null);
  assert.equal(quiz.cleanListeningMeaning("Cà phê <<こーひー>>"), "Cà phê");
});
test("both independent answers are sufficient without confidence; unknown/skip retain truthful per-step grades", () => {
  const question = quiz.buildMeaningQuestion(target, pool, () => 0.3);
  const base = { word: target, pool, question, typed: "つよみ", meaningId: question.correctId };
  assert.equal(quiz.gradeListeningAttempt(base).mastered, true);
  assert.equal(quiz.listeningReviewReason(quiz.gradeListeningAttempt(base)), "Đúng cả hai bước");
  const wrongTyping = quiz.gradeListeningAttempt({ ...base, typed: "つよに" });
  assert.equal(wrongTyping.meaningCorrect, true); assert.equal(wrongTyping.dictationCorrect, false);
  assert.match(quiz.listeningReviewReason(wrongTyping), /nghe\/gõ/);
  const unknownMeaning = quiz.gradeListeningAttempt({ ...base, meaningId: null });
  assert.equal(unknownMeaning.dictationCorrect, true); assert.equal(unknownMeaning.meaningCorrect, false); assert.equal(unknownMeaning.mastered, false);
  const skipped = quiz.gradeListeningAttempt({ ...base, skipped: true });
  assert.equal(skipped.mastered, false); assert.equal(skipped.dictationCorrect, false);
});
test("distractor creation is bounded, immutable and not tied to the correct option position", () => {
  const original = JSON.stringify(pool);
  const first = quiz.buildMeaningQuestion(target, pool, () => 0);
  const second = quiz.buildMeaningQuestion(target, pool, () => 0.99);
  assert.notEqual(first.choices.findIndex((choice) => choice.id === first.correctId), second.choices.findIndex((choice) => choice.id === second.correctId));
  assert.equal(JSON.stringify(pool), original);
});

function shortcutHarness() {
  const listeners = new Map(), calls = [];
  let stage = "dictation", composing = false;
  const target = {
    addEventListener(name, callback, capture) { assert.equal(capture, true); listeners.set(name, callback); },
    removeEventListener(name, callback, capture) { assert.equal(capture, true); listeners.delete(name); },
  };
  const { bindListeningShortcuts } = load("src/lib/listening-shortcuts.ts");
  const cleanup = bindListeningShortcuts(target, {
    stage: () => stage, composing: () => composing,
    replay: () => calls.push("replay"), skip: () => calls.push("skip"), commit: () => calls.push("commit"),
    advance: () => calls.push("advance"), choose: (position) => calls.push(`choose-${position}`),
  });
  function key(props = {}, { editable = false, own = true, dialog = false } = {}) {
    const event = { key: "`", code: "Backquote", preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; },
      target: { id: "listening-dictation", closest(selector) {
        if (selector === '[role="dialog"]') return dialog;
        if (selector === '[data-listening-quiz]') return own;
        if (selector.startsWith("input,")) return editable;
        return false;
      } }, ...props };
    listeners.get("keydown")?.(event);
    return event;
  }
  return { key, calls, cleanup, listeners, setStage(value) { stage = value; }, compose(value) { composing = value; } };
}
test("Backquote is captured inside the answer input even when IME marks the key composing", () => {
  const h = shortcutHarness(); h.compose(true);
  const event = h.key({ isComposing: true, keyCode: 229 }, { editable: true });
  assert.equal(event.prevented, true); assert.equal(event.stopped, true);
  assert.deepEqual(h.calls, ["replay"]);
  h.key({ repeat: true }, { editable: true });
  assert.equal(h.calls.length, 1);
  h.cleanup(); assert.equal(h.listeners.size, 0);
});
test("replay preserves unrelated fields, dialogs and modified shortcuts", () => {
  const h = shortcutHarness();
  assert.equal(h.key({}, { editable: true, own: false }).prevented, undefined);
  h.key({}, { dialog: true }); h.key({ ctrlKey: true }); h.key({ shiftKey: true });
  assert.equal(h.calls.length, 0); h.cleanup();
});
test("keys 1-4 submit the matching meaning immediately, including from a focused option", () => {
  const h = shortcutHarness(); h.setStage("meaning");
  for (const key of ["1", "2", "3", "4"]) assert.equal(h.key({ key, code: `Digit${key}` }).prevented, true);
  assert.deepEqual(h.calls, ["choose-0", "choose-1", "choose-2", "choose-3"]);
  h.key({ key: "4", code: "Digit4", repeat: true });
  h.compose(true); h.key({ key: "1", code: "Digit1" });
  assert.equal(h.calls.length, 4); h.cleanup();
});
test("IME Enter never submits; dictation Enter, skip and result Enter keep their own stages", () => {
  const h = shortcutHarness();
  h.key({ key: "Enter", code: "Enter", keyCode: 229 }, { editable: true });
  assert.equal(h.calls.length, 0);
  h.key({ key: "Enter", code: "Enter" }, { editable: true });
  h.key({ key: "Tab", code: "Tab", shiftKey: true });
  h.key({ key: "Tab", code: "Tab" });
  h.setStage("result"); h.key({ key: "Enter", code: "Enter" });
  assert.deepEqual(h.calls, ["commit", "skip", "advance"]); h.cleanup();
});

function audioHarness() {
  let next = 0;
  const timers = new Map(), calls = [], states = [];
  let stops = 0;
  const { ListeningAudioPlayer } = load("src/lib/listening-audio.ts", {
    setTimeout(fn) { timers.set(++next, fn); return next; }, clearTimeout(id) { timers.delete(id); },
  });
  const player = new ListeningAudioPlayer(async (text, callbacks) => calls.push({ text, callbacks }), () => stops++, (state) => states.push(state));
  return { player, calls, states, timers, state: () => states.at(-1), stops: () => stops };
}
test("audio unlocks answers only after real end, exposes loading/playing and fences previous questions", () => {
  const h = audioHarness(); h.player.play("つよみ", 0.75);
  assert.equal(h.state().status, "loading"); assert.equal(h.state().hasHeard, false);
  const old = h.calls[0].callbacks;
  assert.equal(old.rate, 0.75); old.onStart();
  assert.equal(h.state().status, "playing"); assert.equal(h.state().hasHeard, false);
  old.onEnd(); assert.equal(h.state().hasHeard, true);
  h.player.reset(); old.onEnd(); assert.equal(h.state().hasHeard, false);
  h.player.play("はんせい"); old.onStart(); assert.equal(h.state().status, "loading");
  h.calls[1].callbacks.onError("offline"); assert.equal(h.state().status, "error");
  assert.equal(h.state().hasHeard, false);
});
test("audio timeout/disposal stops playback and late callbacks cannot revive it", () => {
  const h = audioHarness(); h.player.play("つよみ");
  [...h.timers.values()][0](); assert.equal(h.state().status, "error");
  h.calls[0].callbacks.onEnd(); assert.equal(h.state().hasHeard, false);
  h.player.dispose(); const before = h.states.length;
  h.calls[0].callbacks.onStart(); h.player.play("ignored");
  assert.equal(h.states.length, before); assert.equal(h.timers.size, 0);
});

function ttsHarness() {
  const audios = [], utterances = [], callbacks = [], voiceListeners = new Set();
  let predictions = 0, voices = [{ lang: "ja-JP" }], pendingPredict = null;
  const synth = { cancel() {}, getVoices: () => voices, addEventListener(name, fn) { voiceListeners.add(fn); },
    removeEventListener(name, fn) { voiceListeners.delete(fn); }, speak(utterance) { utterances.push(utterance); } };
  const toast = Object.assign(() => {}, { error() {} });
  const module = load("src/lib/tts-utils.ts", {
    setTimeout, clearTimeout, window: { speechSynthesis: synth, dispatchEvent() {} },
    localStorage: { getItem: () => null },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    Audio: class {
      constructor(url) { this.url = url; audios.push(this); }
      async play() {} pause() { this.paused = true; }
    },
    fetch() { throw Error("Unexpected external request"); },
  }, {
    "react": {}, "react-hot-toast": { default: toast },
    "@gradio/client": { Client: { connect: async () => ({ predict: async () => {
      predictions++;
      if (pendingPredict) return await pendingPredict;
      return { data: [{ url: "https://audio.example/test.wav" }] };
    } }) } },
  });
  const settings = (provider) => ({ provider, elevenLabsApiKey: "", elevenLabsVoiceId: "", hfToken: "" });
  return { module, audios, utterances, voiceListeners, settings,
    events: () => ({ onStart: () => callbacks.push("start"), onEnd: () => callbacks.push("end"), onError: () => callbacks.push("error") }), callbacks,
    delayPrediction(promise) { pendingPredict = promise; }, predictions: () => predictions,
    setVoices(value) { voices = value; },
  };
}
test("configured browser TTS reports real events, volume/rate and cancellation protects late voices", async () => {
  const h = ttsHarness();
  await h.module.playAudio("つよみ", h.settings("browser"), { ...h.events(), rate: 0.75 });
  const utterance = h.utterances[0];
  assert.equal(utterance.lang, "ja-JP"); assert.equal(utterance.rate, 0.85 * 0.75);
  assert.equal(h.callbacks.length, 0);
  utterance.onstart(); utterance.onend(); assert.deepEqual(h.callbacks, ["start", "end"]);
  h.module.stopVocabularyAudio(); utterance.onend(); assert.equal(h.callbacks.length, 2);
  h.setVoices([]);
  await h.module.playAudio("はんせい", h.settings("browser"), h.events());
  h.module.stopVocabularyAudio();
  assert.equal(h.voiceListeners.size, 0);
});
test("configured AI TTS reuses audio cache, reports media end and ignores a reply after cancellation", async () => {
  const h = ttsHarness();
  await h.module.playAudio("つよみ", h.settings("kotobase-ai"), h.events());
  assert.equal(h.audios.length, 1); assert.deepEqual(h.callbacks, ["start"]);
  h.audios[0].onended(); assert.deepEqual(h.callbacks, ["start", "end"]);
  await h.module.playAudio("つよみ", h.settings("kotobase-ai"), h.events());
  assert.equal(h.predictions(), 1);
  let resolve;
  h.delayPrediction(new Promise((done) => { resolve = done; }));
  const pending = h.module.playAudio("はんせい", h.settings("kotobase-ai"), h.events());
  await Promise.resolve(); await Promise.resolve();
  h.module.stopVocabularyAudio();
  resolve({ data: [{ url: "https://audio.example/late.wav" }] }); await pending;
  assert.equal(h.audios.some((audio) => audio.url.includes("late")), false);
});

test("late Japanese voice loading waits through non-Japanese voice events and speaks only once", async () => {
  const h = ttsHarness(); h.setVoices([{ lang: "vi-VN" }]);
  await h.module.playAudio("つよみ", h.settings("browser"), h.events());
  for (const listener of h.voiceListeners) listener();
  assert.equal(h.utterances.length, 0); assert.equal(h.callbacks.length, 0);
  h.setVoices([{ lang: "ja-JP" }]);
  for (const listener of [...h.voiceListeners]) listener();
  assert.equal(h.utterances.length, 1); assert.equal(h.voiceListeners.size, 0);
  h.module.stopVocabularyAudio();
});

test("a newer prompt suppresses previous media events without mixing TTS and SFX volume", async () => {
  const h = ttsHarness();
  await h.module.playAudio("つよみ", { ...h.settings("kotobase-ai"), volume: 0.4 }, h.events());
  const old = h.audios[0]; assert.equal(old.volume, 0.4);
  await h.module.playAudio("はんせい", h.settings("browser"), h.events());
  old.onended(); old.onerror();
  assert.deepEqual(h.callbacks, ["start"]);
  assert.equal(old.paused, true);
  h.module.stopVocabularyAudio();
});
