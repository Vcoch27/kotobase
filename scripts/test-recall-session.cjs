const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const code = ts.transpileModule(
  fs.readFileSync("src/lib/recall-session.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const context = { exports: {} };
vm.runInNewContext(code, context);
const {
  createRecallSession,
  rateRecall,
  nextRecallRound,
  restoreRecallSession,
} = context.exports;
const ids = Array.from({ length: 17 }, (_, i) => `word-${i}`);
const finish = (s, answer = true) =>
  s.batch.reduce((state, id) => rateRecall(state, id, answer), s);
test("one word requires repeated retrieval, a lapse resets the streak", () => {
  let s = createRecallSession(["one"]);
  s = rateRecall(s, "one", true);
  assert.equal(s.entries[0].streak, 1);
  s = nextRecallRound(s);
  assert.equal(s.round, 3);
  s = rateRecall(s, "one", false);
  assert.equal(s.entries[0].streak, 0);
  assert.equal(s.entries[0].misses, 1);
  s = finish(nextRecallRound(s));
  s = finish(nextRecallRound(s));
  assert.equal(s.entries[0].streak, 2);
  assert.equal(nextRecallRound(s).batch.length, 0);
});
test("ratings preserve slots and cannot be duplicated or target outside the batch", () => {
  const s = createRecallSession(ids);
  assert.equal(nextRecallRound(s), s);
  assert.equal(rateRecall(s, "missing", true), s);
  const rated = rateRecall(s, s.batch[0], true);
  assert.equal(rated.batch, s.batch);
  assert.equal(rateRecall(rated, s.batch[0], false), rated);
});
test("all words finish without starvation, no duplicates and no early repetition", () => {
  let s = createRecallSession(ids);
  for (let i = 0; i < 50 && s.batch.length; i++) {
    assert.equal(new Set(s.batch).size, s.batch.length);
    for (const id of s.batch)
      assert.ok(s.entries.find((e) => e.id === id).due <= s.round);
    s = nextRecallRound(finish(s));
  }
  assert.ok(s.entries.every((e) => e.streak === 2 && e.attempts === 2));
});
test("forgotten words return before remembered words at the next round", () => {
  let s = createRecallSession(["a", "b"]);
  s = rateRecall(s, "a", false);
  s = rateRecall(s, "b", true);
  s = nextRecallRound(s);
  assert.deepEqual(Array.from(s.batch), ["a"]);
});
test("restore survives reload, rejects other scopes and corrupt storage", () => {
  const s = finish(createRecallSession(ids));
  assert.equal(
    JSON.stringify(restoreRecallSession(JSON.stringify(s), ids)),
    JSON.stringify(s),
  );
  assert.equal(restoreRecallSession(JSON.stringify(s), ["other"]), null);
  for (const raw of [
    "bad",
    "null",
    "{}",
    JSON.stringify({ ...s, settings: { target: 1 } }),
    JSON.stringify({ ...s, batch: ["missing"] }),
    JSON.stringify({ ...s, rated: ["missing"] }),
  ])
    assert.equal(restoreRecallSession(raw, ids), null);
});
test("configurable mastery and gap remain in force across rounds", () => {
  let s = createRecallSession(["a"], {
    target: 4,
    gap: 3,
    direction: "alternate",
  });
  for (let i = 0; i < 4; i++) {
    assert.equal(s.round, 1 + i * 3);
    s = nextRecallRound(finish(s));
  }
  assert.equal(s.batch.length, 0);
});
