// Usage: node scripts/backfill-vocabulary-kanji-index.cjs [--apply]
// Defaults to a read-only preview. Run --apply before deploying indexed queries.
const { loadEnvConfig } = require('@next/env');
const admin = require('firebase-admin');

loadEnvConfig(process.cwd());

if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error('Firebase Admin credentials are missing');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();
const extractKanji = (word) => Array.from(new Set(
  (String(word || '').match(/[\u4E00-\u9FAF\u3400-\u4DBF]/g) || [])
));

async function main() {
  const snapshot = await db.collection('vocabularies')
    .select('word', 'kanjiCharacters')
    .get();
  const changed = snapshot.docs.filter((doc) => {
    const desired = extractKanji(doc.get('word'));
    const current = doc.get('kanjiCharacters');
    return !Array.isArray(current) ||
      current.length !== desired.length ||
      desired.some((char) => !current.includes(char));
  });

  console.log(`Scanned ${snapshot.size} vocabularies; ${changed.length} need indexing.`);
  if (!process.argv.includes('--apply')) {
    console.log('Read-only preview. Pass --apply to update the index.');
    return;
  }

  for (let offset = 0; offset < changed.length; offset += 250) {
    const batch = db.batch();
    const chunk = changed.slice(offset, offset + 250);
    for (const doc of chunk) {
      batch.update(doc.ref, { kanjiCharacters: extractKanji(doc.get('word')) });
    }
    await batch.commit();
    console.log(`Indexed ${Math.min(offset + chunk.length, changed.length)}/${changed.length}.`);
  }

  const expected = snapshot.docs.filter((doc) => extractKanji(doc.get('word')).includes('津')).length;
  const actual = await db.collection('vocabularies')
    .where('kanjiCharacters', 'array-contains', '津')
    .get();
  if (actual.size !== expected) {
    throw new Error(`津 verification failed: expected ${expected}, got ${actual.size}`);
  }
  console.log(`Verified 津: ${actual.size} matching vocabulary documents.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
