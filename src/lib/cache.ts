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

// In-memory process cache (Tồn tại trong RAM server Node.js, 0ms, 0 read, chống lỗi missing incrementalCache)
let memoryKanjiNotesCache: { data: Record<string, CachedKanjiNote>; expiresAt: number } | null = null;

export const clearKanjiNotesMemoryCache = () => {
  memoryKanjiNotesCache = null;
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

export const getCachedAllKanjiNotes = async (): Promise<Record<string, CachedKanjiNote>> => {
  const now = Date.now();
  // 1. Kiểm tra RAM cache trước (siêu tốc 0ms, 0 lượt đọc Firebase)
  if (memoryKanjiNotesCache && now < memoryKanjiNotesCache.expiresAt && Object.keys(memoryKanjiNotesCache.data).length > 0) {
    return memoryKanjiNotesCache.data;
  }

  // 2. Thử Next.js Data Cache nếu có sẵn trong runtime
  try {
    const cachedFn = unstable_cache(
      fetchRawKanjiNotesMap,
      ['all-kanji-notes-map-v1'],
      { tags: ['kanji_notes'], revalidate: 3600 }
    );
    const data = await cachedFn();
    if (data && Object.keys(data).length > 0) {
      memoryKanjiNotesCache = { data, expiresAt: now + 3600 * 1000 };
      return data;
    }
  } catch (e) {
    // unstable_cache incrementalCache missing trong Server Action context, tự động fallback xuống bước 3
  }

  // 3. Fallback: Đọc Firestore 1 lần duy nhất và lưu vào RAM trong 1 giờ
  try {
    const data = await fetchRawKanjiNotesMap();
    memoryKanjiNotesCache = { data, expiresAt: now + 3600 * 1000 };
    return data;
  } catch (err) {
    console.error("Lỗi khi đọc Firestore kanji_notes:", err);
    return memoryKanjiNotesCache?.data || {};
  }
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

export const clearAllVocabsMemoryCache = () => {
  memoryAllVocabsCache = null;
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

export const getCachedAllVocabsForKanji = async (): Promise<CachedVocabSummary[]> => {
  const now = Date.now();
  if (memoryAllVocabsCache && now < memoryAllVocabsCache.expiresAt && memoryAllVocabsCache.vocabs.length > 0) {
    return memoryAllVocabsCache.vocabs;
  }

  try {
    const vocabs = await fetchRawAllVocabsWithFolders();
    memoryAllVocabsCache = { vocabs, expiresAt: now + 3600 * 1000 };
    return vocabs;
  } catch (err) {
    console.error("Lỗi khi nạp bộ nhớ cache từ vựng:", err);
    return memoryAllVocabsCache?.vocabs || [];
  }
};



