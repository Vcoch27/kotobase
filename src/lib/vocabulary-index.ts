import { unstable_cache, revalidateTag } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { VOCABULARY_INDEX_COLLECTION, VOCABULARY_INDEX_META, VOCABULARY_INDEX_SHARDS, VOCABULARY_INDEX_VERSION, VocabularyIndexEntry, vocabularyIndexPatch, vocabularyShardId } from "./vocabulary-index-schema";

const getIndexMeta = unstable_cache(async () => {
  const snapshot = await adminDb.doc(VOCABULARY_INDEX_META).get();
  const meta = snapshot.data();
  // Throw inside the cache callback: an uninitialized manifest must not be
  // cached for an hour after a successful bootstrap.
  if (meta?.version !== VOCABULARY_INDEX_VERSION || !meta?.ready) throw new Error("VOCABULARY_INDEX_NOT_READY");
  return meta;
}, ["vocabulary-index-meta-v1"], { tags: ["vocabulary-index-meta"], revalidate: 3600 });

async function readVocabularyCatalog(): Promise<VocabularyIndexEntry[]> {
  const meta = await getIndexMeta();
  if (meta?.version !== VOCABULARY_INDEX_VERSION || !meta?.ready) {
    // Never silently fall back to an expensive full collection scan.
    throw new Error("VOCABULARY_INDEX_NOT_READY");
  }
  const shards = await Promise.all(Array.from({ length: VOCABULARY_INDEX_SHARDS }, (_, i) => {
    const shard = String(i).padStart(2, "0");
    return unstable_cache(async () => {
      const snapshot = await adminDb.collection(VOCABULARY_INDEX_COLLECTION).doc(shard).get();
      if (!snapshot.exists) throw new Error("VOCABULARY_INDEX_INCOMPLETE");
      return snapshot.data()?.entries || {};
    }, ["vocabulary-index-shard-v1", shard], { tags: [`vocabulary-index:${shard}`], revalidate: 86400 })();
  }));
  return shards.flatMap(entries => Object.entries(entries).map(([id, entry]) => ({ ...(entry as Omit<VocabularyIndexEntry, "id">), id })))
    .filter(entry => typeof entry.word === "string");
}

let pendingCatalog: Promise<VocabularyIndexEntry[]> | null = null;
export function getVocabularyCatalog(): Promise<VocabularyIndexEntry[]> {
  if (!pendingCatalog) pendingCatalog = readVocabularyCatalog().finally(() => { pendingCatalog = null; });
  return pendingCatalog;
}

/** Cache full records separately: large example/note fields never enter the catalog. */
export async function getVocabularyRecords(entries: VocabularyIndexEntry[]): Promise<any[]> {
  const records: any[] = [];
  // Bound concurrent cache/document lookups when explicitly downloading a full deck.
  for (let i = 0; i < entries.length; i += 40) {
    const group = await Promise.all(entries.slice(i, i + 40).map(entry => unstable_cache(async () => {
      const snapshot = await adminDb.collection("vocabularies").doc(entry.id).get();
      if (!snapshot.exists) return null;
      const data = snapshot.data()!;
      for (const field of ["createdAt", "updatedAt"]) {
        if (data[field]?.toDate) data[field] = data[field].toDate().toISOString();
      }
      return { ...data, id: snapshot.id };
    }, ["vocabulary-record-v1", entry.id, String(entry.updatedAt || "")], {
      tags: [`vocabulary-record:${entry.id}`], revalidate: 86400,
    })()));
    records.push(...group.filter(Boolean));
  }
  return records;
}

/** All app vocabulary mutations update canonical documents and catalog atomically. */
export function createVocabularyWriteBatch() {
  const operations: Array<(transaction: FirebaseFirestore.Transaction) => void> = [];
  const changes = new Map<string, Map<string, Record<string, any> | null>>();
  const touched = new Set<string>();
  const track = (ref: FirebaseFirestore.DocumentReference, data: Record<string, any> | null, complete = false) => {
    if (ref.parent.id !== "vocabularies") return;
    const shard = vocabularyShardId(ref.id);
    if (!changes.has(shard)) changes.set(shard, new Map());
    const entries = changes.get(shard)!;
    entries.set(ref.id, data === null ? null : { ...(complete ? {} : entries.get(ref.id)), ...vocabularyIndexPatch(data, complete) });
    touched.add(ref.id);
  };
  return {
    set(ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData) {
      operations.push(transaction => { transaction.set(ref, data); }); track(ref, data, true);
    },
    update(ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>) {
      operations.push(transaction => { transaction.update(ref, data); }); track(ref, data);
    },
    delete(ref: FirebaseFirestore.DocumentReference) {
      operations.push(transaction => { transaction.delete(ref); }); track(ref, null);
    },
    async commit() {
      // Reading the manifest serializes app writes with the one-time index
      // rebuild, preventing a backfill from overwriting concurrent changes.
      const result = await adminDb.runTransaction(async transaction => {
        await transaction.get(adminDb.doc(VOCABULARY_INDEX_META));
        for (const operation of operations) operation(transaction);
        for (const [shard, entries] of changes) {
          transaction.set(adminDb.collection(VOCABULARY_INDEX_COLLECTION).doc(shard), {
            entries: Object.fromEntries(Array.from(entries, ([id, value]) => [id, value ?? FieldValue.delete()])),
            version: VOCABULARY_INDEX_VERSION,
          }, { merge: true });
        }
      });
      for (const shard of changes.keys()) revalidateTag(`vocabulary-index:${shard}`);
      for (const id of touched) revalidateTag(`vocabulary-record:${id}`);
      return result;
    },
  };
}
