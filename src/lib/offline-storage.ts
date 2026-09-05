/**
 * Module quản lý lưu trữ Offline bằng IndexedDB cho KotoBase.
 * Cung cấp khả năng lưu và truy vấn từ vựng, thư mục ngay trên điện thoại không cần internet.
 */

const DB_NAME = "kotobase_offline_db";
const DB_VERSION = 1;

export interface DownloadedDeckMeta {
  folderId: string;
  folderName: string;
  count: number;
  downloadedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB không khả dụng trong môi trường này"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Bảng từ vựng
      if (!db.objectStoreNames.contains("vocabularies")) {
        const vocabStore = db.createObjectStore("vocabularies", { keyPath: "id" });
        vocabStore.createIndex("folderIds", "folderIds", { multiEntry: true });
        vocabStore.createIndex("createdAt", "createdAt");
      }

      // Bảng thư mục
      if (!db.objectStoreNames.contains("folders")) {
        db.createObjectStore("folders", { keyPath: "id" });
      }

      // Bảng ghi nhận các bộ từ đã tải về máy
      if (!db.objectStoreNames.contains("downloaded_decks")) {
        db.createObjectStore("downloaded_decks", { keyPath: "folderId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Lưu danh sách từ vựng vào IndexedDB (Hỗ trợ upsert)
 */
export async function saveVocabulariesOffline(vocabularies: any[]): Promise<number> {
  if (!vocabularies || vocabularies.length === 0) return 0;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("vocabularies", "readwrite");
    const store = tx.objectStore("vocabularies");

    for (const vocab of vocabularies) {
      if (vocab && vocab.id) {
        store.put(vocab);
      }
    }

    tx.oncomplete = () => resolve(vocabularies.length);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Lưu danh sách thư mục vào IndexedDB
 */
export async function saveFoldersOffline(folders: any[]): Promise<number> {
  if (!folders || folders.length === 0) return 0;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("folders", "readwrite");
    const store = tx.objectStore("folders");

    for (const folder of folders) {
      if (folder && folder.id) {
        store.put(folder);
      }
    }

    tx.oncomplete = () => resolve(folders.length);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Lấy danh sách từ vựng offline theo folderId (hoặc tất cả nếu 'all' hoặc không truyền)
 */
export async function getOfflineVocabularies(folderId: string = "all"): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("vocabularies", "readonly");
      const store = tx.objectStore("vocabularies");
      const request = store.getAll();

      request.onsuccess = () => {
        const allVocabs = request.result || [];
        if (folderId === "all" || !folderId) {
          return resolve(allVocabs);
        }
        // Lọc theo folderId
        const filtered = allVocabs.filter((v: any) => {
          if (Array.isArray(v.folderIds)) {
            return v.folderIds.includes(folderId);
          }
          if (Array.isArray(v.folderVocabularies)) {
            return v.folderVocabularies.some((fv: any) => fv.folderId === folderId);
          }
          return false;
        });
        resolve(filtered);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("Không thể đọc từ vựng offline:", error);
    return [];
  }
}

/**
 * Lấy danh sách tất cả thư mục đã lưu offline
 */
export async function getOfflineFolders(): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("folders", "readonly");
      const store = tx.objectStore("folders");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("Không thể đọc thư mục offline:", error);
    return [];
  }
}

/**
 * Đánh dấu bộ từ đã được tải về máy thành công
 */
export async function markDeckDownloaded(meta: DownloadedDeckMeta): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("downloaded_decks", "readwrite");
    const store = tx.objectStore("downloaded_decks");
    store.put(meta);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Lấy danh sách các bộ từ đã tải về máy
 */
export async function getDownloadedDecks(): Promise<DownloadedDeckMeta[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("downloaded_decks", "readonly");
      const store = tx.objectStore("downloaded_decks");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Xóa một bộ từ khỏi kho lưu trữ offline
 */
export async function deleteDownloadedDeck(folderId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["downloaded_decks", "vocabularies"], "readwrite");
    const deckStore = tx.objectStore("downloaded_decks");
    deckStore.delete(folderId);

    // Nếu không phải 'all', xóa các từ thuộc folderId này (nếu từ đó không thuộc folder khác)
    const vocabStore = tx.objectStore("vocabularies");
    const request = vocabStore.getAll();

    request.onsuccess = () => {
      const allVocabs = request.result || [];
      for (const v of allVocabs) {
        if (folderId === "all") {
          vocabStore.delete(v.id);
        } else if (Array.isArray(v.folderIds) && v.folderIds.includes(folderId)) {
          if (v.folderIds.length <= 1) {
            vocabStore.delete(v.id);
          } else {
            v.folderIds = v.folderIds.filter((id: string) => id !== folderId);
            vocabStore.put(v);
          }
        }
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Xóa toàn bộ dữ liệu offline để dọn dẹp bộ nhớ
 */
export async function clearAllOfflineData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["vocabularies", "folders", "downloaded_decks"], "readwrite");
    tx.objectStore("vocabularies").clear();
    tx.objectStore("folders").clear();
    tx.objectStore("downloaded_decks").clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Thống kê dung lượng offline
 */
export async function getOfflineStorageStats(): Promise<{
  totalVocabs: number;
  totalFolders: number;
  totalDecks: number;
}> {
  try {
    const db = await openDB();
    const countStore = (storeName: string): Promise<number> => {
      return new Promise((res) => {
        const tx = db.transaction(storeName, "readonly");
        const countReq = tx.objectStore(storeName).count();
        countReq.onsuccess = () => res(countReq.result);
        countReq.onerror = () => res(0);
      });
    };

    const [totalVocabs, totalFolders, totalDecks] = await Promise.all([
      countStore("vocabularies"),
      countStore("folders"),
      countStore("downloaded_decks"),
    ]);

    return { totalVocabs, totalFolders, totalDecks };
  } catch {
    return { totalVocabs: 0, totalFolders: 0, totalDecks: 0 };
  }
}
