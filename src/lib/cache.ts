import { unstable_cache } from 'next/cache';
import { adminDb } from './firebase-admin';

// ==========================================
// FOLDERS CACHE
// ==========================================
export const getCachedFoldersRaw = unstable_cache(
  async () => {
    const snapshot = await adminDb.collection("folders").orderBy("name", "asc").get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      parentId: doc.data().parentId || null,
      ownerId: doc.data().ownerId || null,
      ownerEmail: doc.data().ownerEmail || null,
      ownerName: doc.data().ownerName || null,
      isPublic: doc.data().isPublic !== false,
    }));
  },
  ['folders-raw'],
  { tags: ['folders'], revalidate: 3600 }
);

export const getCachedFolderVocabCount = async (folderId: string) => {
  return unstable_cache(
    async () => {
      const countSnap = await adminDb.collection("vocabularies")
        .where("folderIds", "array-contains", folderId)
        .count()
        .get();
      return countSnap.data().count;
    },
    [`folder-vocab-count-${folderId}`],
    { tags: ['vocabularies', 'folders'], revalidate: 3600 }
  )();
};

// ==========================================
// VOCABULARIES CACHE
// ==========================================
export const getCachedVocabsByFolderId = async (folderId: string) => {
  return unstable_cache(
    async () => {
      const snap = await adminDb.collection("vocabularies")
        .where("folderIds", "array-contains", folderId)
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    [`vocabs-by-folder-${folderId}`],
    { tags: ['vocabularies'], revalidate: 3600 }
  )();
};

export const getCachedAllVocabsLimit = async () => {
  return unstable_cache(
    async () => {
      const snap = await adminDb.collection("vocabularies")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    ['vocabs-all-limit-100'],
    { tags: ['vocabularies'], revalidate: 3600 }
  )();
};

// ==========================================
// GRAMMAR FOLDERS CACHE
// ==========================================
export const getCachedGrammarFoldersRaw = unstable_cache(
  async () => {
    const snapshot = await adminDb.collection("grammar_folders").orderBy("name", "asc").get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      parentId: doc.data().parentId || null,
      ownerId: doc.data().ownerId || null,
      ownerEmail: doc.data().ownerEmail || null,
      ownerName: doc.data().ownerName || null,
      isPublic: doc.data().isPublic !== false,
    }));
  },
  ['grammar-folders-raw'],
  { tags: ['grammar_folders'], revalidate: 3600 }
);

export const getCachedGrammarCountByFolderId = async (folderId: string) => {
  return unstable_cache(
    async () => {
      const snap = await adminDb.collection("grammars")
        .where("folderIds", "array-contains", folderId)
        .count()
        .get();
      return snap.data().count;
    },
    [`grammar-count-${folderId}`],
    { tags: ['grammars', 'grammar_folders'], revalidate: 3600 }
  )();
};

// ==========================================
// GRAMMARS CACHE
// ==========================================
export const getCachedGrammarsByFolderId = async (folderId: string) => {
  return unstable_cache(
    async () => {
      const snap = await adminDb.collection("grammars")
        .where("folderIds", "array-contains", folderId)
        .orderBy("createdAt", "desc")
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    [`grammars-by-folder-${folderId}`],
    { tags: ['grammars'], revalidate: 3600 }
  )();
};

export const getCachedAllGrammars = async () => {
  return unstable_cache(
    async () => {
      const snap = await adminDb.collection("grammars")
        .orderBy("createdAt", "desc")
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    ['grammars-all'],
    { tags: ['grammars'], revalidate: 3600 }
  )();
};
// ==========================================
// SENTENCE FOLDERS CACHE
// ==========================================
export const getCachedSentenceFoldersRaw = unstable_cache(
  async () => {
    const snapshot = await adminDb.collection("sentence_folders").orderBy("name", "asc").get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      parentId: doc.data().parentId || null,
      ownerId: doc.data().ownerId || null,
      ownerEmail: doc.data().ownerEmail || null,
      ownerName: doc.data().ownerName || null,
    }));
  },
  ['sentence-folders-raw'],
  { tags: ['sentence_folders'], revalidate: 3600 }
);

export const getCachedSentenceCountByFolderId = async (folderId: string) => {
  return unstable_cache(
    async () => {
      const snap = await adminDb.collection("sentences")
        .where("folderIds", "array-contains", folderId)
        .count()
        .get();
      return snap.data().count;
    },
    [`sentence-count-${folderId}`],
    { tags: ['sentences', 'sentence_folders'], revalidate: 3600 }
  )();
};

// ==========================================
// SENTENCES CACHE
// ==========================================
export const getCachedSentencesByFolderId = async (folderId: string) => {
  return unstable_cache(
    async () => {
      const snap = await adminDb.collection("sentences")
        .where("folderIds", "array-contains", folderId)
        .orderBy("createdAt", "desc")
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    [`sentences-by-folder-${folderId}`],
    { tags: ['sentences'], revalidate: 3600 }
  )();
};

export const getCachedAllSentences = async () => {
  return unstable_cache(
    async () => {
      const snap = await adminDb.collection("sentences")
        .orderBy("createdAt", "desc")
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    ['sentences-all'],
    { tags: ['sentences'], revalidate: 3600 }
  )();
};

// ==========================================
// KANJI NOTES CACHE (Tối ưu tuyệt đối lượt đọc Firebase)
// ==========================================
export interface CachedKanjiNote {
  character: string;
  hanviet?: string;
  meaning?: string;
  mnemonic?: string;
  updatedAt?: string;
}

// Keep hot results briefly in each process. Next's Data Cache is the shared layer.
const KANJI_DATA_TTL_SECONDS = 6 * 60 * 60;
const HOT_CACHE_TTL_MS = 60 * 1000;
const RETRY_DELAY_MS = 5 * 60 * 1000;

let memoryKanjiNotesCache: { data: Record<string, CachedKanjiNote>; expiresAt: number } | null = null;
let pendingKanjiNotes: Promise<Record<string, CachedKanjiNote>> | null = null;
let retryKanjiNotesAt = 0;
let kanjiNotesError: Error | null = null;

export const clearKanjiNotesMemoryCache = () => {
  memoryKanjiNotesCache = null;
  retryKanjiNotesAt = 0;
};

const fetchRawKanjiNotesMap = async (): Promise<Record<string, CachedKanjiNote>> => {
  const snapshot = await adminDb.collection("kanji_notes").get();
  const map: Record<string, CachedKanjiNote> = {};
  snapshot.docs.forEach((doc) => {
    const data = doc.data() as any;
    const char = (data.character || doc.id || "").trim();
    if (char) {
      map[char] = {
        character: char,
        hanviet: data.hanviet || "",
        meaning: data.meaning || "",
        mnemonic: data.mnemonic || "",
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : (data.updatedAt?.toDate?.().toISOString() || ''),
      };
    }
  });
  return map;
};

const getPersistentKanjiNotes = unstable_cache(
  fetchRawKanjiNotesMap,
  ['all-kanji-notes-map-v1'],
  { tags: ['kanji_notes'], revalidate: KANJI_DATA_TTL_SECONDS }
);

export const getCachedAllKanjiNotes = async (): Promise<Record<string, CachedKanjiNote>> => {
  const now = Date.now();
  if (memoryKanjiNotesCache && now < memoryKanjiNotesCache.expiresAt) {
    return memoryKanjiNotesCache.data;
  }
  if (pendingKanjiNotes) return pendingKanjiNotes;
  if (now < retryKanjiNotesAt) {
    if (memoryKanjiNotesCache) return memoryKanjiNotesCache.data;
    throw kanjiNotesError || new Error('Kanji notes are temporarily unavailable');
  }

  pendingKanjiNotes = (async () => {
    try {
      // A shared cache entry prevents every Vercel instance from scanning the collection.
      const data = await getPersistentKanjiNotes();
      memoryKanjiNotesCache = { data, expiresAt: Date.now() + HOT_CACHE_TTL_MS };
      kanjiNotesError = null;
      return data;
    } catch (error) {
      // Some Server Action contexts have no incremental cache. Read once there,
      // while keeping the same single-flight and retry protection.
      if (String(error).includes('incrementalCache missing')) {
        try {
          const data = await fetchRawKanjiNotesMap();
          memoryKanjiNotesCache = { data, expiresAt: Date.now() + KANJI_DATA_TTL_SECONDS * 1000 };
          kanjiNotesError = null;
          return data;
        } catch (fallbackError) {
          error = fallbackError;
        }
      }
      console.error('Lỗi khi đọc Firestore kanji_notes:', error);
      kanjiNotesError = error instanceof Error ? error : new Error(String(error));
      retryKanjiNotesAt = Date.now() + RETRY_DELAY_MS;
      if (memoryKanjiNotesCache) return memoryKanjiNotesCache.data;
      throw kanjiNotesError;
    } finally {
      pendingKanjiNotes = null;
    }
  })();
  return pendingKanjiNotes;
};

// ==========================================
// VOCABULARIES ALL CACHE (Dành cho tra cứu Kanji & Từ vựng liên quan)
// ==========================================
export interface CachedVocabSummary {
  id: string;
  word: string;
  meaning: string;
  reading?: string | null;
  sinoVietnamese?: string | null;
  example?: string | null;
  note?: string | null;
  folderIds?: string[];
  createdAt?: string;
  folderVocabularies?: { folderId: string; folder: { id: string; name: string } }[];
}

let memoryAllVocabsCache: {
  vocabs: CachedVocabSummary[];
  expiresAt: number;
} | null = null;
let pendingAllVocabs: Promise<CachedVocabSummary[]> | null = null;
let retryAllVocabsAt = 0;
let allVocabsError: Error | null = null;

export const clearAllVocabsMemoryCache = () => {
  memoryAllVocabsCache = null;
  retryAllVocabsAt = 0;
};

const fetchRawAllVocabsWithFolders = async (): Promise<CachedVocabSummary[]> => {
  const [vocabsSnap, foldersSnap] = await Promise.all([
    adminDb.collection("vocabularies").get(),
    adminDb.collection("folders").get(),
  ]);

  const folderMap = new Map<string, { id: string; name: string }>();
  foldersSnap.docs.forEach((doc) => {
    folderMap.set(doc.id, {
      id: doc.id,
      name: String(doc.data().name || "Thư mục"),
    });
  });

  const list: CachedVocabSummary[] = [];
  vocabsSnap.docs.forEach((doc) => {
    const d = doc.data();
    const word = String(d.word || "").trim();
    if (!word) return;

    const folderIds: string[] = Array.isArray(d.folderIds) ? d.folderIds : [];
    const folderVocabularies = folderIds.map((fId) => ({
      folderId: fId,
      folder: folderMap.get(fId) || { id: fId, name: "Thư mục" },
    }));

    list.push({
      id: doc.id,
      word,
      meaning: String(d.meaning || "").trim(),
      reading: d.reading ? String(d.reading).trim() : null,
      sinoVietnamese: d.sinoVietnamese ? String(d.sinoVietnamese).trim() : null,
      example: d.example ? String(d.example).trim() : null,
      note: d.note ? String(d.note).trim() : null,
      folderIds,
      createdAt: typeof d.createdAt === "string" ? d.createdAt : (d.createdAt?.toDate?.().toISOString() || new Date(0).toISOString()),
      folderVocabularies,
    });
  });

  return list;
};

const getPersistentAllVocabsForKanji = unstable_cache(
  fetchRawAllVocabsWithFolders,
  ['all-vocabs-for-kanji-v2'],
  { tags: ['vocabularies', 'folders'], revalidate: KANJI_DATA_TTL_SECONDS }
);

export const getCachedAllVocabsForKanji = async (): Promise<CachedVocabSummary[]> => {
  const now = Date.now();
  if (memoryAllVocabsCache && now < memoryAllVocabsCache.expiresAt) {
    return memoryAllVocabsCache.vocabs;
  }
  if (pendingAllVocabs) return pendingAllVocabs;
  if (now < retryAllVocabsAt) {
    if (memoryAllVocabsCache) return memoryAllVocabsCache.vocabs;
    throw allVocabsError || new Error('Kanji vocabulary is temporarily unavailable');
  }

  pendingAllVocabs = (async () => {
    try {
      const vocabs = await getPersistentAllVocabsForKanji();
      memoryAllVocabsCache = { vocabs, expiresAt: Date.now() + HOT_CACHE_TTL_MS };
      allVocabsError = null;
      return vocabs;
    } catch (error) {
      if (String(error).includes('incrementalCache missing')) {
        try {
          const vocabs = await fetchRawAllVocabsWithFolders();
          memoryAllVocabsCache = { vocabs, expiresAt: Date.now() + KANJI_DATA_TTL_SECONDS * 1000 };
          allVocabsError = null;
          return vocabs;
        } catch (fallbackError) {
          error = fallbackError;
        }
      }
      console.error('Lỗi khi nạp bộ nhớ cache từ vựng:', error);
      allVocabsError = error instanceof Error ? error : new Error(String(error));
      retryAllVocabsAt = Date.now() + RETRY_DELAY_MS;
      if (memoryAllVocabsCache) return memoryAllVocabsCache.vocabs;
      throw allVocabsError;
    } finally {
      pendingAllVocabs = null;
    }
  })();
  return pendingAllVocabs;
};



