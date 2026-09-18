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
