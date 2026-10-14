/**
 * Quản lý bộ nhớ đệm (IndexedDB Cache) cho các file PDF giáo trình.
 * Giúp tải sách cực nhanh (<0.3s) trong các lần mở tiếp theo,
 * tiết kiệm băng thông và hoàn toàn không phụ thuộc vào tình trạng mạng hay Google Drive.
 */

const DB_NAME = 'kotobase_pdf_store';
const STORE_NAME = 'pdf_documents';
const DB_VERSION = 1;

function openPdfDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => {
        console.warn('Không thể mở IndexedDB cho PDF Cache:', request.error);
        resolve(null);
      };
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    } catch (e) {
      console.warn('IndexedDB không khả dụng:', e);
      resolve(null);
    }
  });
}

/**
 * Lấy file PDF (dạng ArrayBuffer) từ bộ nhớ đệm trình duyệt
 */
export async function getPdfFromCache(fileId: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openPdfDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(fileId);

        req.onsuccess = () => {
          const res = req.result;
          if (res instanceof ArrayBuffer) {
            resolve(res);
          } else if (res && res.data instanceof ArrayBuffer) {
            resolve(res.data);
          } else {
            resolve(null);
          }
        };

        req.onerror = () => resolve(null);
      } catch (e) {
        console.warn('Lỗi khi đọc PDF từ cache:', e);
        resolve(null);
      }
    });
  } catch (err) {
    console.warn('Lỗi getPdfFromCache:', err);
    return null;
  }
}

/**
 * Lưu file PDF (ArrayBuffer) vào bộ nhớ đệm trình duyệt
 */
export async function savePdfToCache(fileId: string, buffer: ArrayBuffer): Promise<boolean> {
  try {
    const db = await openPdfDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(buffer, fileId);

        req.onsuccess = () => resolve(true);
        req.onerror = () => {
          console.warn('Không thể lưu PDF vào cache (có thể do hết dung lượng):', req.error);
          resolve(false);
        };
      } catch (e) {
        console.warn('Lỗi khi ghi PDF vào cache:', e);
        resolve(false);
      }
    });
  } catch (err) {
    console.warn('Lỗi savePdfToCache:', err);
    return false;
  }
}

/**
 * Kiểm tra xem tài liệu đã có trong bộ nhớ đệm chưa
 */
export async function isPdfCached(fileId: string): Promise<boolean> {
  try {
    const db = await openPdfDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.count(fileId);

        req.onsuccess = () => resolve(req.result > 0);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

/**
 * Xóa cache của 1 tài liệu (khi cần tải lại bản mới)
 */
export async function removePdfFromCache(fileId: string): Promise<boolean> {
  try {
    const db = await openPdfDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(fileId);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}
