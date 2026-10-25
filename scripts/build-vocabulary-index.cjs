// No reads without an explicit --status, --preview or --apply flag.
// One-time bootstrap/rebuild; canonical vocabulary documents are never modified.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const admin = require('firebase-admin');
const { loadEnvConfig } = require('@next/env');

const mode = process.argv.find(arg => ['--status', '--preview', '--apply'].includes(arg));
if (!mode) {
  console.log('Usage: node scripts/build-vocabulary-index.cjs --status | --preview | --apply [--max-reads=3500]');
  console.log('--status reads 1 metadata document. Preview/apply reads each vocabulary summary ONCE, capped by --max-reads.');
  process.exit(0);
}
const maxReads = Number(process.argv.find(arg => arg.startsWith('--max-reads='))?.split('=')[1] || 3500);
if (!Number.isInteger(maxReads) || maxReads < 2 || maxReads > 10000) throw new Error('max-reads must be 2..10000');
const compiled = ts.transpileModule(fs.readFileSync('src/lib/vocabulary-index-schema.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const schema = context.exports;
loadEnvConfig(process.cwd());
admin.initializeApp({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kotobase-42cdc',
  ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }) }),
});
const db = admin.firestore();
const metaRef = db.doc(schema.VOCABULARY_INDEX_META);
const query = db.collection('vocabularies')
  .select('word', 'meaning', 'reading', 'sinoVietnamese', 'folderIds', 'createdBy', 'createdAt', 'updatedAt')
  .limit(maxReads - 1);

function build(snapshot) {
  if (snapshot.size >= maxReads - 1) throw new Error('Read budget reached. No changes applied; increase --max-reads only after checking quota.');
  const shards = Array.from({ length: schema.VOCABULARY_INDEX_SHARDS }, () => ({}));
  for (const doc of snapshot.docs) {
    const patch = schema.vocabularyIndexPatch(doc.data(), true);
    for (const key of ['createdAt', 'updatedAt']) {
      if (patch[key]?.toDate) patch[key] = patch[key].toDate().toISOString();
    }
    shards[Number(schema.vocabularyShardId(doc.id))][doc.id] = patch;
  }
  let largestBytes = 0;
  for (const entries of shards) {
    const size = Buffer.byteLength(JSON.stringify(entries), 'utf8');
    largestBytes = Math.max(largestBytes, size);
    if (size > 750000) throw new Error('A catalog shard exceeds safe document size. Increase shard count before migrating.');
  }
  console.log(JSON.stringify({ canonicalDocuments: snapshot.size, estimatedDocumentReads: snapshot.size + (mode === '--apply' ? 1 : 0),
    catalogDocuments: shards.length, largestShardBytes: largestBytes, canonicalWrites: 0, mode }));
  return shards;
}

async function main() {
  if (mode === '--status') {
    const meta = await metaRef.get();
    console.log(JSON.stringify({ projectId: db.projectId, index: meta.data() || null }));
    return;
  }
  if (mode === '--preview') { build(await query.get()); return; }
  await db.runTransaction(async transaction => {
    // App writers read this same manifest in their transaction. Bootstrap and
    // concurrent creates/edits/deletes therefore have a serializable order.
    await transaction.get(metaRef);
    const snapshot = await transaction.get(query);
    const shards = build(snapshot);
    shards.forEach((entries, i) => transaction.set(db.collection(schema.VOCABULARY_INDEX_COLLECTION).doc(String(i).padStart(2, '0')), {
      entries, version: schema.VOCABULARY_INDEX_VERSION,
    }));
    transaction.set(metaRef, { ready: true, version: schema.VOCABULARY_INDEX_VERSION,
      shards: schema.VOCABULARY_INDEX_SHARDS, sourceDocuments: snapshot.size, builtAt: new Date().toISOString() });
  }, { maxAttempts: 1 }); // Never repeat a full bootstrap scan automatically.
  console.log('Index ready. Redeploy/revalidate after an offline rebuild to clear stale cache entries.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
