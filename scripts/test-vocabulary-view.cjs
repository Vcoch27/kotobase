const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, console, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }};
  vm.runInNewContext(code, context);
  return context.exports;
}
const view = load('src/lib/vocabulary-view.ts');
const folders = [
  { id: 'parent', parentId: null, isPublic: true },
  { id: 'a', parentId: 'parent', isPublic: true },
  { id: 'b', parentId: 'parent', isPublic: true },
  { id: 'deep', parentId: 'b', isPublic: true },
  { id: 'private', parentId: 'parent', isPublic: false },
];
const records = [
  { id: 'old', word: '猫', meaning: 'old meaning', folderIds: ['a'], createdAt: '2026-10-20', updatedAt: '2026-10-21' },
  { id: 'new', word: '猫', meaning: 'new meaning', folderIds: ['deep'], createdAt: '2026-10-01', updatedAt: '2026-10-24' },
  { id: 'other', word: '犬', folderIds: ['b'] },
  { id: 'loose', word: '鳥', folderIds: [] },
];
const ids = items => Array.from(items, item => item.id).sort();

test('parent includes deep descendants and chooses latest update, preserving source records', () => {
  const before = JSON.stringify(records);
  assert.deepEqual(ids(view.getVocabularyView(records, 'parent', folders)), ['new', 'other']);
  assert.equal(JSON.stringify(records), before);
  assert.deepEqual(records[1].folderIds, ['deep']);
});
test('leaf retains its own copy; root and overlapping selections are unique', () => {
  assert.deepEqual(ids(view.getVocabularyView(records, 'a', folders)), ['old']);
  assert.deepEqual(ids(view.getVocabularyView(records, 'all', folders)), ['loose', 'new', 'other']);
  assert.deepEqual(ids(view.getVocabularyView(records, ['a', 'b'], folders)), ['new', 'other']);
  assert.deepEqual(ids(view.getVocabularyView(records, ['all', 'a'], folders)), ['loose', 'new', 'other']);
});
test('word equality is exact; timestamps support serialized Firestore and missing/invalid updates', () => {
  const result = view.uniqueVocabularyByWord([
    { id: 'old', word: '猫', createdAt: '2026-01-01', updatedAt: 'invalid' },
    { id: 'new', word: '猫', updatedAt: { _seconds: 1800000000 } },
    { id: 'different', word: '猫 ' }, { id: 'empty1', word: '' }, { id: 'empty2' },
  ]);
  assert.deepEqual(ids(result), ['different', 'empty1', 'empty2', 'new']);
});
test('equal update times choose a stable document independent of query order', () => {
  const copies = [{ id: 'b', word: '猫' }, { id: 'a', word: '猫' }];
  assert.deepEqual(ids(view.uniqueVocabularyByWord(copies)), ['a']);
  assert.deepEqual(ids(view.uniqueVocabularyByWord([...copies].reverse())), ['a']);
});
test('scopes tolerate cycles and support legacy offline membership', () => {
  assert.equal(view.getVocabularyScope('a', [{ id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }]).size, 2);
  assert.deepEqual(ids(view.filterVocabularyScope([{ id: 'legacy', folderVocabularies: [{ folderId: 'deep' }] }], view.getVocabularyScope('parent', folders))), ['legacy']);
});

function actions(extra = []) {
  const hidden = { id: 'hidden', word: '猫', folderIds: ['private'], updatedAt: '2026-10-25' };
  const raw = [...records, hidden, ...extra];
  const calls = [];
  const api = load('src/app/actions/vocabulary.ts', {
    '@/lib/firebase-admin': {}, '@/lib/session': { getCurrentUser: async () => null },
    'next/cache': {}, '@/lib/kanji-parser': {}, '@/lib/vocabulary-view': view,
    '@/lib/cache': {
      getCachedFoldersRaw: async () => folders,
      getCachedAllVocabs: async () => { calls.push('all'); return raw; },
      getCachedVocabsByFolderId: async id => { calls.push(id); return raw.filter(v => v.folderIds.includes(id)); },
    },
  });
  return { api, calls };
}
test('server filters permissions before selecting winners, without per-word reads', async () => {
  const { api, calls } = actions();
  assert.deepEqual(ids(await api.getVocabularies('all')), ['loose', 'new', 'other']);
  assert.deepEqual(calls, ['all']);
});
test('search cannot resurrect an outdated copy; raw mode preserves copies for offline', async () => {
  const { api } = actions();
  assert.deepEqual(ids(await api.getVocabularies('parent', 'old meaning')), []);
  assert.deepEqual(ids(await api.getVocabularies('parent', undefined, true)), ['new', 'old', 'other']);
  assert.deepEqual(ids(await api.getVocabularies('a')), ['old']);
});
test('root remains complete beyond 100 records, including an older-created winner', async () => {
  const extra = Array.from({ length: 150 }, (_, i) => ({ id: `extra-${i}`, word: `word-${i}`, folderIds: ['a'] }));
  const { api } = actions(extra);
  const root = await api.getVocabularies('all');
  assert.equal(root.length, 153);
  assert.equal(root.find(v => v.word === '猫').id, 'new');
  // The raw root/ancestor cache can derive a leaf without another Firestore query.
  const raw = await api.getVocabularies('all', undefined, true);
  const leaf = view.filterVocabularyScope(raw, view.getVocabularyScope('a', folders));
  assert.equal(leaf.length, 151);
  assert.equal(leaf.find(v => v.word === '猫').id, 'old');
});

test('強み counts once in debug, every ancestor, root and overlapping multi-selection', () => {
  const tree = [
    { id: 'top', parentId: null, vocabularyWords: [] },
    { id: 'debug', parentId: 'top', vocabularyWords: [] },
    { id: '1', parentId: 'debug', vocabularyWords: ['強み'] },
    { id: '2', parentId: 'debug', vocabularyWords: ['強み'] },
  ];
  const copies = [
    { id: 'older', word: '強み', folderIds: ['1'], updatedAt: '2026-10-24T07:07:37.642Z' },
    { id: 'newer', word: '強み', folderIds: ['2'], updatedAt: '2026-10-24T07:07:48.798Z' },
  ];
  for (const selection of ['debug', 'top', 'all', ['debug', '1', '2']]) {
    assert.equal(view.getFolderVocabularyWords(selection, tree).size, 1);
    assert.deepEqual(ids(view.getVocabularyView(copies, selection, tree)), ['newer']);
  }
  assert.deepEqual(ids(view.getVocabularyView(copies, '1', tree)), ['older']);
  assert.deepEqual(ids(view.getVocabularyView(copies, '2', tree)), ['newer']);
});

test('folder action builds word membership from shared cache, excluding hidden copies', async () => {
  let reads = 0;
  const api = load('src/app/actions/folder.ts', {
    '@/lib/firebase-admin': {}, '@/lib/session': { getCurrentUser: async () => null },
    'next/cache': {}, 'firebase-admin/firestore': {}, '@/lib/vocabulary-view': view,
    '@/lib/cache': {
      getCachedFoldersRaw: async () => folders,
      getCachedAllVocabs: async () => { reads++; return [...records, { id: 'secret', word: 'secret', folderIds: ['private'] }]; },
    },
  });
  const result = await api.getFolders();
  assert.equal(reads, 1);
  assert.equal(result.some(f => f.id === 'private'), false);
  assert.equal(view.getFolderVocabularyWords('parent', result).size, 2);
  assert.equal(result[0]._count.rootVocabularies, 3); // Includes unfiled 鳥.
  assert.equal(view.getFolderVocabularyWords(['a', 'b'], result).size, 2);
  await api.getFolders(false);
  assert.equal(reads, 1); // Name-only callers do not read vocabulary.
});

test('concurrent folder-count and vocabulary loads share one cold Firestore read', async () => {
  let reads = 0;
  const cache = load('src/lib/cache.ts', {
    'next/cache': { unstable_cache: fn => fn },
    './firebase-admin': { adminDb: { collection: () => ({ get: async () => {
      reads++;
      return { docs: [{ id: 'copy', data: () => ({ word: '強み' }) }] };
    } }) } },
  });
  const [a, b] = await Promise.all([cache.getCachedAllVocabs(), cache.getCachedAllVocabs()]);
  assert.equal(reads, 1);
  assert.equal(a, b);
});
