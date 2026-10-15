#!/usr/bin/env node
// Read-only backup of the Firestore half of /grammar before a data migration.
const fs = require('fs');
const path = require('path');
const { loadEnvConfig } = require('@next/env');
const admin = require('firebase-admin');
const root = path.resolve(__dirname, '..');
loadEnvConfig(root);
admin.initializeApp({ credential: admin.credential.cert({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}) });
(async () => {
  const docs = await admin.firestore().collection('grammars').get();
  const items = docs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const target = path.join(root, 'tmp/grammar-firestore-backup-2026-10-15.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify({ exportedAt: new Date().toISOString(), items }, null, 2), { flag: 'wx' });
  console.log(`Backed up ${items.length} grammar documents to ${target}`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
