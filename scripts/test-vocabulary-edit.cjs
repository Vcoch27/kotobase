const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

// Execute the actual save callback with a loaded, paginated list. A refresh here
// would unmount the dashboard's study views and discard their state/scroll.
function saveHarness() {
  const file = ts.createSourceFile('OverviewView.tsx', fs.readFileSync('src/components/OverviewView.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'VocabularyEditModal') {
      const attr = node.attributes.properties.find(attr => attr.name?.getText(file) === 'onSuccess');
      callback = attr.initializer.expression.getText(file);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(callback, 'edit modal must have a save callback');
  const words = Array.from({ length: 91 }, (_, i) => ({ id: String(i), word: `word${i}`, meaning: 'old', folderVocabularies: [{ folderId: 'folder' }] }));
  let local = words, editing = words[85];
  const updates = [];
  const onSave = vm.runInNewContext(ts.transpile(`(${callback})`, { target: ts.ScriptTarget.ES2022 }), {
    setLocalVocabs: update => { local = update(local); },
    setEditingVocab: value => { editing = value; },
    onVocabularyUpdated: value => updates.push(value),
    onRefresh: () => assert.fail('saving one word must not reload the list'),
    window: { scrollTo: () => assert.fail('saving must not reset scroll') },
    setCurrentPage: () => assert.fail('saving must not reset pagination'),
  });
  return { words, updates, onSave, get local() { return local; }, get editing() { return editing; } };
}

test('edit on a later page updates one row, preserves order/membership and closes without refreshing', () => {
  const h = saveHarness();
  h.onSave({ id: '85', meaning: 'new meaning', updatedAt: '2026-11-07T00:00:00Z' });
  assert.equal(h.local.length, 91);
  assert.deepEqual(h.local.map(word => word.id), h.words.map(word => word.id));
  assert.equal(h.local[85].meaning, 'new meaning');
  assert.strictEqual(h.local[85].folderVocabularies, h.words[85].folderVocabularies);
  assert.strictEqual(h.local[84], h.words[84]);
  assert.equal(h.updates.length, 1);
  assert.equal(h.updates[0].id, '85');
  assert.equal(h.editing, null);
});

test('empty save payload does not trigger a full refresh or discard the list', () => {
  const h = saveHarness();
  h.onSave();
  assert.strictEqual(h.local, h.words);
  assert.equal(h.updates.length, 0);
});
