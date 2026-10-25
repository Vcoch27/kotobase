export const VOCABULARY_INDEX_COLLECTION = "vocabulary_catalog";
export const VOCABULARY_INDEX_META = "vocabulary_catalog_meta/current";
export const VOCABULARY_INDEX_VERSION = 1;
export const VOCABULARY_INDEX_SHARDS = 32;
export const VOCABULARY_PAGE_SIZE = 40;

export interface VocabularyIndexEntry {
  id: string;
  word: string;
  meaning?: string;
  reading?: string | null;
  sinoVietnamese?: string | null;
  folderIds?: string[];
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function vocabularyShardId(id: string): string {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return String((hash >>> 0) % VOCABULARY_INDEX_SHARDS).padStart(2, "0");
}

export function vocabularyIndexPatch(data: Record<string, any>, complete = false): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of ["word", "meaning", "reading", "sinoVietnamese", "folderIds", "createdBy", "createdAt", "updatedAt"]) {
    if (data[key] !== undefined) result[key] = (key === "createdAt" || key === "updatedAt") && data[key]?.toDate
      ? data[key].toDate().toISOString() : data[key];
    else if (complete) result[key] = key === "folderIds" ? [] : null;
  }
  return result;
}
