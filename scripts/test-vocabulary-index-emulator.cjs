const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const ts = require('typescript');
const admin = require('firebase-admin');

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Emulator required; this test never connects to production.');
admin.initializeApp({ projectId: 'demo-kotobase' });
const db = admin.firestore();
// The Firestore SDK checks instanceof Promise. VM async functions use another
// realm, so normalize only the test callback to the SDK's native Promise realm.
const moduleDb = new Proxy(db, { get(target, key) {
  if (key === 'runTransaction') return (callback, options) => target.runTransaction(transaction => Promise.resolve(callback(transaction)), options);
  const value = target[key];
  return typeof value === 'function' ? value.bind(target) : value;
} });
function load(path, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, console, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
    return dependencies[name];
  }};
  vm.runInNewContext(code, context);
  return context.exports;
}
const values = new Map();
const cache = {
  unstable_cache: (fn, key, options) => async () => {
    const id = JSON.stringify(key);
    if (!values.has(id)) values.set(id, { promise: fn(), tags: options.tags });
    return values.get(id).promise;
  },
  revalidateTag: tag => { for (const [key, value] of values) if (value.tags.includes(tag)) values.delete(key); },
  revalidatePath: () => {},
};
const schema = load('src/lib/vocabulary-index-schema.ts');
const view = load('src/lib/vocabulary-view.ts');
const index = load('src/lib/vocabulary-index.ts', {
  'next/cache': cache, './firebase-admin': { adminDb: moduleDb },
  'firebase-admin/firestore': require('firebase-admin/firestore'), './vocabulary-index-schema': schema,
});
const folders = [{ id: 'debug', parentId: null, isPublic: true }, { id: 'a', parentId: 'debug', isPublic: true }, { id: 'b', parentId: 'debug', isPublic: true }];
const actions = load('src/app/actions/vocabulary.ts', {
  '@/lib/firebase-admin': { adminDb: db }, '@/lib/session': { getCurrentUser: async () => ({ uid: 'admin', email: 'hoangtungmy123@gmail.com' }) },
  'next/cache': cache, '@/lib/cache': { getCachedFoldersRaw: async () => folders },
  '@/lib/vocabulary-index': index, '@/lib/vocabulary-pagination': load('src/lib/vocabulary-pagination.ts', { './vocabulary-index-schema': schema }),
  '@/lib/vocabulary-view': view, '@/lib/kanji-parser': { extractKanji: () => [] },
});

test('atomic mutations, duplicate winners, cursor pages and one-time rebuild on real Firestore emulator', async () => {
  await db.doc(schema.VOCABULARY_INDEX_META).set({ ready: true, version: schema.VOCABULARY_INDEX_VERSION });
  const seed = db.batch();
  for (let i = 0; i < schema.VOCABULARY_INDEX_SHARDS; i++) seed.set(db.collection(schema.VOCABULARY_INDEX_COLLECTION).doc(String(i).padStart(2, '0')), { entries: {}, version: 1 });
  await seed.commit();
  const first = await actions.createVocabulary({ word: '強み', meaning: 'old', folderIds: ['a'] });
  const second = await actions.createVocabulary({ word: '強み', meaning: 'latest', folderIds: ['b'] });
  assert.equal(first.success, true);
  assert.equal(second.success, true);
  let page = await actions.getVocabularyPage('debug');
  assert.equal(page.totalCount, 1);
  assert.equal(page.vocabularies[0].id, second.data.id);
  assert.equal((await actions.getVocabularyPage('a')).vocabularies[0].id, first.data.id);
  assert.equal((await actions.getVocabularies('debug', undefined, true)).length, 2);

  const invalid = index.createVocabularyWriteBatch();
  invalid.update(db.collection('vocabularies').doc('missing-document'), { word: 'phantom' });
  await assert.rejects(invalid.commit());
  values.clear();
  assert.equal((await index.getVocabularyCatalog()).some(entry => entry.id === 'missing-document'), false);

  await actions.updateVocabulary(first.data.id, { word: '強み', meaning: 'edited winner', note: 'A'.repeat(200000) });
  page = await actions.getVocabularyPage('debug');
  assert.equal(page.vocabularies[0].meaning, 'edited winner');
  const catalogEntry = (await index.getVocabularyCatalog()).find(entry => entry.id === first.data.id);
  assert.equal(catalogEntry.note, undefined);
  assert.equal(catalogEntry.meaning, 'edited winner');

  await actions.assignVocabularyToFolder(first.data.id, 'b');
  assert.equal((await actions.getVocabularyPage('a')).totalCount, 0);
  await actions.copyBulkVocabulary([first.data.id], 'a');
  assert.equal((await actions.getVocabularyPage('a')).totalCount, 1);
  await actions.deleteVocabulary(first.data.id);
  assert.equal((await db.collection('vocabularies').doc(first.data.id).get()).exists, false);
  assert.equal((await index.getVocabularyCatalog()).some(entry => entry.id === first.data.id), false);

  const bulk = Array.from({ length: 405 }, (_, i) => ({ word: `word-${i}`, meaning: `meaning-${i}` }));
  assert.equal((await actions.createBulkVocabulary(JSON.stringify(bulk), ['a'])).count, 405);
  page = await actions.getVocabularyPage('debug');
  assert.equal(page.vocabularies.length, 40);
  assert.equal(page.totalCount, 406);
  const next = await actions.getVocabularyPage('debug', { cursor: page.nextCursor });
  assert.equal(next.vocabularies.some(item => page.vocabularies.some(previous => previous.id === item.id)), false);
  assert.equal((await actions.getVocabularyPage('debug', { search: 'word-404' })).vocabularies.length, 1);

  const moveIds = page.vocabularies.slice(0, 3).map(item => item.id);
  assert.equal((await actions.moveBulkVocabulary(moveIds, 'b')).count, 3);
  const delIds = next.vocabularies.slice(0, 3).map(item => item.id);
  assert.equal((await actions.deleteBulkVocabulary(delIds)).count, 3);

  const before = (await db.collection('vocabularies').get()).docs;
  const output = await promisify(execFile)(process.execPath, ['scripts/build-vocabulary-index.cjs', '--apply', '--max-reads=1000'], {
    env: { ...process.env, NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-kotobase' },
  });
  assert.match(output.stdout, /Index ready/);
  values.clear();
  const rebuilt = await index.getVocabularyCatalog();
  assert.equal(rebuilt.length, before.length);
  assert.equal((await db.collection('vocabularies').get()).size, before.length);
  for (const doc of before) assert.equal(rebuilt.find(entry => entry.id === doc.id).word, doc.get('word'));

  // Exceeding the configured migration budget must leave the previous catalog intact.
  await assert.rejects(promisify(execFile)(process.execPath, ['scripts/build-vocabulary-index.cjs', '--apply', '--max-reads=10'], {
    env: { ...process.env, NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-kotobase' },
  }), /Read budget reached/);
  values.clear();
  assert.equal((await index.getVocabularyCatalog()).length, before.length);

  // Folder-tree deletion must remove catalog membership in the same chunks.
  const folderActions = load('src/app/actions/folder.ts', {
    '@/lib/firebase-admin': { adminDb: db }, '@/lib/session': { getCurrentUser: async () => ({ uid: 'admin', email: 'hoangtungmy123@gmail.com' }) },
    'next/cache': cache, 'firebase-admin/firestore': require('firebase-admin/firestore'),
    '@/lib/cache': { getCachedFoldersRaw: async () => folders }, '@/lib/vocabulary-view': view, '@/lib/vocabulary-index': index,
  });
  for (const folder of folders) await db.collection('folders').doc(folder.id).set(folder);
  assert.equal((await folderActions.deleteFolderAndVocabs('debug')).success, true);
  assert.equal((await db.collection('vocabularies').get()).size, 0);
  assert.equal((await index.getVocabularyCatalog()).length, 0);
});

test.after(async () => { await db.terminate(); await admin.app().delete(); });
