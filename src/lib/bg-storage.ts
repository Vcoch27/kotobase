export type BgKey = 'dashboard' | 'cardFront' | 'cardBack';

export interface BgImageData {
  dataUrl: string;
  fileName: string;
  updatedAt: number;
}

const DB_NAME = 'kotobase_bg';
const STORE_NAME = 'backgrounds';
const DB_VERSION = 1;

// Mở IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// Giảm kích thước ảnh (client-side) để lưu trữ hiệu quả hơn
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lỗi khi đọc file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Lỗi khi tải ảnh"));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resize nếu chiều rộng lớn hơn 1920px
        const MAX_WIDTH = 1920;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Không thể tạo canvas context"));
        
        ctx.drawImage(img, 0, 0, width, height);
        // Lưu dưới dạng WebP với chất lượng cao (0.9) để ảnh luôn sắc nét, không bị nhòe
        resolve(canvas.toDataURL('image/webp', 0.9));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function saveBgImage(key: BgKey, file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Dung lượng ảnh vượt quá 5MB");
  }
  
  const dataUrl = await compressImage(file);
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const bgData: BgImageData = {
      dataUrl,
      fileName: file.name,
      updatedAt: Date.now()
    };
    
    const request = store.put(bgData, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(dataUrl);
  });
}

export async function getBgImage(key: BgKey): Promise<BgImageData | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function deleteBgImage(key: BgKey): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getAllBgImages(): Promise<Record<BgKey, BgImageData | null>> {
  const [dashboard, cardFront, cardBack] = await Promise.all([
    getBgImage('dashboard'),
    getBgImage('cardFront'),
    getBgImage('cardBack')
  ]);
  
  return { dashboard, cardFront, cardBack };
}
