// ===================================================================
// KOTOBASE LOCAL-FIRST DATABASE ENGINE (IndexedDB)
// Hoạt động 100% Client-side, 0 độ trễ, lưu trữ vĩnh viễn trên trình duyệt
// ===================================================================

export interface LocalFolder {
  id: string;
  name: string;
  parentId: string | null;
  order?: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    folderVocabularies: number;
  };
}

export interface LocalVocabulary {
  id: string;
  word: string;
  meaning: string;
  reading?: string;
  sinoVietnamese?: string;
  example?: string;
  exampleMeaning?: string;
  note?: string;
  folderIds?: string[];
  tags?: string[];
  jlptLevel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackupDataPackage {
  version: string;
  exportedAt: string;
  folders: LocalFolder[];
  vocabularies: LocalVocabulary[];
  ankiProgress?: Record<string, any>;
  ankiSettings?: any;
  ttsSettings?: any;
}

const DB_NAME = "kotobase_local_db";
const DB_VERSION = 1;

class KotobaseDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("IndexedDB is only available in browser"));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Object Store: folders
          if (!db.objectStoreNames.contains("folders")) {
            const folderStore = db.createObjectStore("folders", { keyPath: "id" });
            folderStore.createIndex("parentId", "parentId", { unique: false });
            folderStore.createIndex("updatedAt", "updatedAt", { unique: false });
          }

          // Object Store: vocabularies
          if (!db.objectStoreNames.contains("vocabularies")) {
            const vocabStore = db.createObjectStore("vocabularies", { keyPath: "id" });
            vocabStore.createIndex("word", "word", { unique: false });
            vocabStore.createIndex("reading", "reading", { unique: false });
            vocabStore.createIndex("updatedAt", "updatedAt", { unique: false });
          }

          // Object Store: metadata (Settings, Sync state, tokens)
          if (!db.objectStoreNames.contains("metadata")) {
            db.createObjectStore("metadata", { keyPath: "key" });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return this.dbPromise;
  }

  // -------------------------------------------------------------
  // FOLDER OPERATIONS
  // -------------------------------------------------------------

  async getFolders(): Promise<LocalFolder[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["folders", "vocabularies"], "readonly");
      const folderStore = tx.objectStore("folders");
      const vocabStore = tx.objectStore("vocabularies");

      const folderReq = folderStore.getAll();
      const vocabReq = vocabStore.getAll();

      tx.oncomplete = () => {
        const folders: LocalFolder[] = folderReq.result || [];
        const vocabs: LocalVocabulary[] = vocabReq.result || [];

        // Đếm số từ vựng trong mỗi folder
        const countMap: Record<string, number> = {};
        vocabs.forEach((v) => {
          if (v.folderIds && Array.isArray(v.folderIds)) {
            v.folderIds.forEach((fid) => {
              countMap[fid] = (countMap[fid] || 0) + 1;
            });
          }
        });

        const enrichedFolders = folders.map((f) => ({
          ...f,
          _count: {
            folderVocabularies: countMap[f.id] || 0,
          },
        }));

        resolve(enrichedFolders);
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  async saveFolder(folder: Omit<LocalFolder, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }): Promise<LocalFolder> {
    const db = await this.getDB();
    const now = new Date().toISOString();
    const id = folder.id || `folder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const fullFolder: LocalFolder = {
      id,
      name: folder.name.trim(),
      parentId: folder.parentId || null,
      order: folder.order ?? 0,
      createdAt: folder.createdAt || now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction("folders", "readwrite");
      const store = tx.objectStore("folders");
      const req = store.put(fullFolder);

      req.onsuccess = () => resolve(fullFolder);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteFolder(folderId: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["folders", "vocabularies"], "readwrite");
      const folderStore = tx.objectStore("folders");
      const vocabStore = tx.objectStore("vocabularies");

      // Xóa folder
      folderStore.delete(folderId);

      // Cập nhật các folder con: đổi parentId của folder con thành null
      const folderReq = folderStore.getAll();
      folderReq.onsuccess = () => {
        const folders: LocalFolder[] = folderReq.result || [];
        folders.forEach((f) => {
          if (f.parentId === folderId) {
            f.parentId = null;
            f.updatedAt = new Date().toISOString();
            folderStore.put(f);
          }
        });
      };

      // Xóa folderId khỏi danh sách folderIds của các từ vựng
      const vocabReq = vocabStore.getAll();
      vocabReq.onsuccess = () => {
        const vocabs: LocalVocabulary[] = vocabReq.result || [];
        vocabs.forEach((v) => {
          if (v.folderIds && v.folderIds.includes(folderId)) {
            v.folderIds = v.folderIds.filter((id) => id !== folderId);
            v.updatedAt = new Date().toISOString();
            vocabStore.put(v);
          }
        });
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // -------------------------------------------------------------
  // VOCABULARY OPERATIONS
  // -------------------------------------------------------------

  async getVocabularies(folderId?: string): Promise<LocalVocabulary[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("vocabularies", "readonly");
      const store = tx.objectStore("vocabularies");
      const req = store.getAll();

      req.onsuccess = () => {
        let list: LocalVocabulary[] = req.result || [];
        if (folderId && folderId !== "all") {
          list = list.filter((v) => v.folderIds && v.folderIds.includes(folderId));
        }
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getVocabularyById(id: string): Promise<LocalVocabulary | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("vocabularies", "readonly");
      const store = tx.objectStore("vocabularies");
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveVocabulary(vocab: Partial<LocalVocabulary> & { word: string; meaning: string }): Promise<LocalVocabulary> {
    const db = await this.getDB();
    const now = new Date().toISOString();
    const id = vocab.id || `vocab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const fullVocab: LocalVocabulary = {
      id,
      word: vocab.word.trim(),
      meaning: vocab.meaning.trim(),
      reading: vocab.reading?.trim() || "",
      sinoVietnamese: vocab.sinoVietnamese?.trim() || "",
      example: vocab.example?.trim() || "",
      exampleMeaning: vocab.exampleMeaning?.trim() || "",
      note: vocab.note?.trim() || "",
      folderIds: vocab.folderIds || [],
      tags: vocab.tags || [],
      jlptLevel: vocab.jlptLevel || "",
      createdAt: vocab.createdAt || now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction("vocabularies", "readwrite");
      const store = tx.objectStore("vocabularies");
      const req = store.put(fullVocab);

      req.onsuccess = () => resolve(fullVocab);
      req.onerror = () => reject(req.error);
    });
  }

  async saveBulkVocabularies(items: Array<Partial<LocalVocabulary> & { word: string; meaning: string }>, targetFolderId?: string): Promise<number> {
    const db = await this.getDB();
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const tx = db.transaction("vocabularies", "readwrite");
      const store = tx.objectStore("vocabularies");
      let count = 0;

      items.forEach((item) => {
        if (!item.word || !item.meaning) return;

        const id = item.id || `vocab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const folderIds = item.folderIds || (targetFolderId ? [targetFolderId] : []);

        const fullVocab: LocalVocabulary = {
          id,
          word: item.word.trim(),
          meaning: item.meaning.trim(),
          reading: item.reading?.trim() || "",
          sinoVietnamese: item.sinoVietnamese?.trim() || "",
          example: item.example?.trim() || "",
          exampleMeaning: item.exampleMeaning?.trim() || "",
          note: item.note?.trim() || "",
          folderIds,
          tags: item.tags || [],
          jlptLevel: item.jlptLevel || "",
          createdAt: item.createdAt || now,
          updatedAt: now,
        };

        store.put(fullVocab);
        count++;
      });

      tx.oncomplete = () => resolve(count);
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteVocabulary(id: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("vocabularies", "readwrite");
      const store = tx.objectStore("vocabularies");
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async moveVocabulariesToFolder(vocabIds: string[], targetFolderId: string | null): Promise<boolean> {
    const db = await this.getDB();
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const tx = db.transaction("vocabularies", "readwrite");
      const store = tx.objectStore("vocabularies");
      const req = store.getAll();

      req.onsuccess = () => {
        const vocabs: LocalVocabulary[] = req.result || [];
        vocabs.forEach((v) => {
          if (vocabIds.includes(v.id)) {
            if (targetFolderId) {
              v.folderIds = [targetFolderId];
            } else {
              v.folderIds = [];
            }
            v.updatedAt = now;
            store.put(v);
          }
        });
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // -------------------------------------------------------------
  // METADATA & SYNC PACKAGE EXPORT / IMPORT
  // -------------------------------------------------------------

  async getMetadata(key: string): Promise<any> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("metadata", "readonly");
      const store = tx.objectStore("metadata");
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  }

  async setMetadata(key: string, value: any): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("metadata", "readwrite");
      const store = tx.objectStore("metadata");
      const req = store.put({ key, value, updatedAt: new Date().toISOString() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Xuất toàn bộ dữ liệu ra gói Package để backup lên Google Drive
  async exportFullPackage(): Promise<BackupDataPackage> {
    const [folders, vocabularies] = await Promise.all([
      this.getFolders(),
      this.getVocabularies(),
    ]);

    let ankiProgress: any = {};
    let ankiSettings: any = null;
    let ttsSettings: any = null;

    if (typeof window !== "undefined") {
      try {
        const ap = localStorage.getItem("kotobase_anki_progress");
        if (ap) ankiProgress = JSON.parse(ap);
        const as = localStorage.getItem("kotobase_anki_settings");
        if (as) ankiSettings = JSON.parse(as);
        const ts = localStorage.getItem("kotobase_tts_settings");
        if (ts) ttsSettings = JSON.parse(ts);
      } catch (e) {}
    }

    return {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      folders,
      vocabularies,
      ankiProgress,
      ankiSettings,
      ttsSettings,
    };
  }

  // Nhập dữ liệu từ gói Package tải về từ Google Drive (Hỗ trợ Smart 2-way Merge)
  async importFullPackage(pkg: BackupDataPackage, strategy: "merge" | "overwrite" = "merge"): Promise<{ foldersCount: number; vocabsCount: number }> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(["folders", "vocabularies"], "readwrite");
      const folderStore = tx.objectStore("folders");
      const vocabStore = tx.objectStore("vocabularies");

      if (strategy === "overwrite") {
        folderStore.clear();
        vocabStore.clear();

        if (Array.isArray(pkg.folders)) {
          pkg.folders.forEach((f) => folderStore.put(f));
        }
        if (Array.isArray(pkg.vocabularies)) {
          pkg.vocabularies.forEach((v) => vocabStore.put(v));
        }
      } else {
        // Smart Merge theo id và mốc updatedAt
        const currentFoldersReq = folderStore.getAll();
        const currentVocabsReq = vocabStore.getAll();

        currentFoldersReq.onsuccess = () => {
          const currentMap = new Map<string, LocalFolder>();
          (currentFoldersReq.result || []).forEach((f: LocalFolder) => currentMap.set(f.id, f));

          if (Array.isArray(pkg.folders)) {
            pkg.folders.forEach((incoming) => {
              const existing = currentMap.get(incoming.id);
              if (!existing || new Date(incoming.updatedAt) > new Date(existing.updatedAt)) {
                folderStore.put(incoming);
              }
            });
          }
        };

        currentVocabsReq.onsuccess = () => {
          const currentVocabMap = new Map<string, LocalVocabulary>();
          (currentVocabsReq.result || []).forEach((v: LocalVocabulary) => currentVocabMap.set(v.id, v));

          if (Array.isArray(pkg.vocabularies)) {
            pkg.vocabularies.forEach((incoming) => {
              const existing = currentVocabMap.get(incoming.id);
              if (!existing || new Date(incoming.updatedAt) > new Date(existing.updatedAt)) {
                vocabStore.put(incoming);
              }
            });
          }
        };
      }

      // Khôi phục settings vào localStorage nếu có
      if (typeof window !== "undefined") {
        try {
          if (pkg.ankiProgress && Object.keys(pkg.ankiProgress).length > 0) {
            const currentAP = JSON.parse(localStorage.getItem("kotobase_anki_progress") || "{}");
            localStorage.setItem("kotobase_anki_progress", JSON.stringify({ ...currentAP, ...pkg.ankiProgress }));
          }
          if (pkg.ankiSettings) {
            localStorage.setItem("kotobase_anki_settings", JSON.stringify(pkg.ankiSettings));
          }
          if (pkg.ttsSettings) {
            localStorage.setItem("kotobase_tts_settings", JSON.stringify(pkg.ttsSettings));
          }
        } catch (e) {}
      }

      tx.oncomplete = () => {
        resolve({
          foldersCount: pkg.folders?.length || 0,
          vocabsCount: pkg.vocabularies?.length || 0,
        });
      };
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const localDB = new KotobaseDB();
