// Isolated tests: no credentials, network access, or production Firestore writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, require: name => name in dependencies ? dependencies[name] : require(name), console };
  vm.runInNewContext(code, context);
  return context.exports;
}
const model = load('src/lib/listening-loops.ts');
const file = 'exam';
const loop = (id = 'one') => ({ id, name: 'Câu 1', start: 10, end: 20 });

function harness() {
  let user = { uid: 'alice', name: 'Alice' };
  let reads = 0;
  const docs = new Map(), cache = new Map();
  const snapshot = (path) => ({ id: path.split('/').pop(), data: () => docs.get(path) });
  const ref = path => ({
    path, collection: name => ref(`${path}/${name}`), doc: name => ref(`${path}/${name}`),
    get: async () => { reads++; return snapshot(path); },
    orderBy: () => ({ limit: size => {
      let after = '';
      const query = { startAfter: cursor => { after = cursor; return query; }, get: async () => {
        const selected = [...docs.keys()].filter(key => key.startsWith(`${path}/`) && key.slice(path.length + 1) > after).sort().slice(0, size);
        reads += Math.max(1, selected.length);
        return { size: selected.length, docs: selected.map(snapshot) };
      } };
      return query;
    } }),
  });
  const api = load('src/app/actions/listening-loops.ts', {
    '@/lib/listening-loops': model,
    '@/lib/listening-plan': { listeningExams: [{ driveFileId: file }] },
    '@/lib/session': { getCurrentUser: async () => user },
    'firebase-admin/firestore': { FieldPath: { documentId: () => '__name__' } },
    'next/cache': {
      unstable_cache: (fn, keys, options) => async () => {
        const key = keys.join('|');
        if (!cache.has(key)) cache.set(key, { data: await fn(), tags: options.tags });
        return cache.get(key).data;
      },
      revalidateTag: tag => { for (const [key, value] of cache) if (value.tags.includes(tag)) cache.delete(key); },
    },
    '@/lib/firebase-admin': { adminDb: {
      collection: name => ref(name),
      runTransaction: async fn => {
        const writes = [];
        await fn({ get: async reference => { reads++; return snapshot(reference.path); }, set: (reference, value) => writes.push(() => docs.set(reference.path, structuredClone(value))), delete: reference => writes.push(() => docs.delete(reference.path)) });
        writes.forEach(write => write());
      },
    } },
  });
  return { api, docs, reads: () => reads, user: next => { user = next; } };
}

test('reject invalid/oversized/duplicate segments, preserve time precision', () => {
  for (const value of [[{ ...loop(), start: -1 }], [{ ...loop(), end: 10.5 }], [{ ...loop(), end: Infinity }], [{ ...loop(), end: 7201 }], [{ ...loop(), name: ' ' }], [loop(), loop()], Array.from({ length: 101 }, (_, i) => loop(`id-${i}`))]) assert.throws(() => model.validateLoops(value));
  for (const seconds of [0, 10, 60, 61.125, 7199.999]) assert.equal(model.parseLoopTime(model.loopTime(seconds)), seconds);
  assert.ok(Number.isNaN(model.parseLoopTime('1:99')));
});

test('unauthenticated or mismatched account never reads Firestore', async () => {
  const h = harness();
  assert.equal((await h.api.getMyListeningLoops(file, 'bob')).success, false);
  assert.equal((await h.api.saveListeningLoops(file, 'bob', { loops: [loop()], shared: true, revision: 0 })).success, false);
  h.user(null);
  assert.equal((await h.api.getSharedListeningLoops(file, 'alice')).success, false);
  assert.equal(h.reads(), 0);
});

test('private sets isolated; cached reads reused; stale saves cannot overwrite', async () => {
  const h = harness();
  await h.api.getMyListeningLoops(file, 'alice');
  await h.api.getMyListeningLoops(file, 'alice');
  assert.equal(h.reads(), 1);
  assert.equal((await h.api.saveListeningLoops(file, 'alice', { loops: [loop()], shared: false, revision: 0 })).success, true);
  assert.equal(h.reads(), 2);
  const stale = await h.api.saveListeningLoops(file, 'alice', { loops: [], shared: true, revision: 0 });
  assert.equal(stale.conflict, true);
  assert.equal((await h.api.getMyListeningLoops(file, 'alice')).data.loops.length, 1);
  h.user({ uid: 'bob', name: 'Bob' });
  assert.equal((await h.api.getMyListeningLoops(file, 'bob')).data.loops.length, 0);
  assert.equal((await h.api.getSharedListeningLoops(file, 'bob')).data.sets.length, 0);
});

test('publish/unpublish atomically; copying preserves the original owner', async () => {
  const h = harness();
  await h.api.saveListeningLoops(file, 'alice', { loops: [loop()], shared: true, revision: 0 });
  h.user({ uid: 'bob', name: 'Bob' });
  const shared = await h.api.getSharedListeningLoops(file, 'bob');
  assert.equal(shared.data.sets[0].ownerName, 'Alice');
  const count = h.reads();
  await h.api.getSharedListeningLoops(file, 'bob');
  assert.equal(h.reads(), count);
  await h.api.saveListeningLoops(file, 'bob', { loops: [{ ...shared.data.sets[0].loops[0], id: 'copied', name: 'Bản của Bob' }], shared: false, revision: 0 });
  h.user({ uid: 'alice', name: 'Alice' });
  assert.equal((await h.api.getMyListeningLoops(file, 'alice')).data.loops[0].name, 'Câu 1');
  await h.api.saveListeningLoops(file, 'alice', { loops: [loop()], shared: false, revision: 1 });
  assert.equal((await h.api.getSharedListeningLoops(file, 'alice')).data.sets.length, 0);
  assert.equal([...h.docs.keys()].filter(key => key.startsWith('listening_loop_groups/')).length, 0);
});

test('group uses document cursors and reads only 20 sets per page', async () => {
  const h = harness();
  for (let i = 0; i < 21; i++) {
    const uid = `user-${i}`;
    h.user({ uid, name: uid });
    await h.api.saveListeningLoops(file, uid, { loops: [loop()], shared: true, revision: 0 });
  }
  const count = h.reads();
  const first = (await h.api.getSharedListeningLoops(file, 'user-20')).data;
  assert.equal(first.sets.length, 20); assert.equal(h.reads() - count, 20);
  const second = (await h.api.getSharedListeningLoops(file, 'user-20', first.nextCursor)).data;
  assert.equal(second.sets.length, 1); assert.equal(second.nextCursor, null);
  assert.ok(!first.sets.some(set => set.ownerId === second.sets[0].ownerId));
});
