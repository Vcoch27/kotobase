#!/usr/bin/env node
// Apply the reviewed normalization preview to the 100 Firestore grammar records.
// Requires the ignored, pre-migration backup created by export-grammar-firestore.cjs.
const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');
const { loadEnvConfig } = require('@next/env');
const admin = require('firebase-admin');

const root = path.resolve(__dirname, '..');
const backup = JSON.parse(fs.readFileSync(path.join(root, 'tmp/grammar-firestore-backup-2026-10-15.json'), 'utf8')).items;
const preview = JSON.parse(fs.readFileSync(path.join(root, 'tmp/grammar-normalization-preview.json'), 'utf8')).firestore;
const backupById = new Map(backup.map(item => [item.id, item]));
if (backup.length !== 100 || preview.length !== 100 || backupById.size !== 100) throw new Error('Unexpected grammar record count');
if (preview.some(item => !backupById.has(item.id) || !item.structure || !item.meaning || !item.examples?.length)) throw new Error('Invalid normalization preview');

const plainFromRuby = text => text.replace(/\{([^{}|]+)\|[^{}]+\}/g, '$1');
for (const item of preview) {
  for (const field of ['structure', 'formation', 'meaning', 'nuance']) {
    if (item[`${field}Ruby`] && plainFromRuby(item[`${field}Ruby`]) !== item[field]) throw new Error(`Ruby mismatch ${item.id}.${field}`);
  }
  for (const example of item.examples) {
    if (example.ruby && plainFromRuby(example.ruby) !== example.jpn) throw new Error(`Ruby mismatch ${item.id}.examples`);
  }
}

const apply = process.argv.includes('--apply');
const verify = process.argv.includes('--verify');
if (!apply && !verify) {
  console.log(`Preview validated: ${preview.length} Firestore grammars. Run with --apply to write or --verify to read back.`);
  process.exit(0);
}

loadEnvConfig(root);
admin.initializeApp({ credential: admin.credential.cert({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}) });

async function main() {
  const db = admin.firestore();
  if (verify) {
    const docs = await db.collection('grammars').get();
    if (docs.size !== preview.length) throw new Error(`Expected ${preview.length} documents, found ${docs.size}`);
    const current = new Map(docs.docs.map(doc => [doc.id, doc.data()]));
    for (const target of preview) {
      const stored = current.get(target.id);
      if (!stored || stored.contentFormatVersion !== 2) throw new Error(`Missing normalized document ${target.id}`);
      for (const [key, value] of Object.entries(target)) {
        if (key !== 'id' && !isDeepStrictEqual(stored[key], value)) throw new Error(`Read-back mismatch ${target.id}.${key}`);
      }
    }
    console.log(`Verified ${preview.length} Firestore grammar documents after migration.`);
    return;
  }
  const refs = preview.map(item => db.collection('grammars').doc(item.id));
  const result = await db.runTransaction(async transaction => {
    const docs = await transaction.getAll(...refs);
    const timestamp = new Date().toISOString();
    let updated = 0;
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i], target = preview[i];
      if (!doc.exists) throw new Error(`Missing document ${target.id}`);
      const current = { id: doc.id, ...doc.data() };
      if (!isDeepStrictEqual(current, backupById.get(target.id))) throw new Error(`Document changed after backup: ${target.id}`);
      const patch = {};
      for (const [key, value] of Object.entries(target)) {
        if (key !== 'id' && !isDeepStrictEqual(current[key], value)) patch[key] = value;
      }
      if (Object.keys(patch).length) {
        patch.contentFormatVersion = 2;
        patch.normalizedAt = timestamp;
        transaction.update(doc.ref, patch);
        updated++;
      }
    }
    return updated;
  }, { maxAttempts: 2 });
  console.log(`Updated ${result} Firestore grammar documents.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
