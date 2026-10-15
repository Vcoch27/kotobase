import fs from 'fs';
import path from 'path';

export interface GrammarExample {
  jpn: string;
  vie: string;
}

export interface GrammarBlock {
  blockNumber: number;
  heading?: string;
  formation?: string;
  meaning?: string;
  nuance?: string;
  examples: GrammarExample[];
  html?: string;
}

export interface GrammarItem {
  id: string;
  number?: number;
  title?: string;
  structure: string;
  formation?: string;
  meaning: string;
  nuance?: string;
  example?: string;
  exampleMeaning?: string;
  examples?: GrammarExample[];
  blocks?: GrammarBlock[];
  books?: string[];
  jlptLevel?: string;
  usageContext?: string;
  sourceUrl?: string;
  folderIds?: string[];
  ownerId?: string;
  source?: string;
  articleBlocks?: Array<{ kind: string; heading: string; text: string; html: string }>;
  totalExamplesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// In-memory singleton cache
interface GlobalGrammarCache {
  tndgSummary?: GrammarItem[];
  tndgFullMap?: Map<string, GrammarItem>;
  serverCache?: {
    grammars: GrammarItem[];
    folders: any[];
    timestamp: number;
  };
}

const g = globalThis as unknown as { __grammarCache?: GlobalGrammarCache };
if (!g.__grammarCache) {
  g.__grammarCache = {};
}

/**
 * Đọc danh sách 308 ngữ pháp tóm tắt từ file JSON cục bộ
 * (Tiết kiệm 100% lượt đọc Firestore, tốc độ phản hồi < 5ms)
 */
export function getTndgSummaryGrammars(): GrammarItem[] {
  if (g.__grammarCache?.tndgSummary) {
    return g.__grammarCache.tndgSummary;
  }

  try {
    const filePath = path.join(process.cwd(), 'data/tiengnhatdongian-n3-summary.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const items: GrammarItem[] = parsed.items || [];
      if (!g.__grammarCache) g.__grammarCache = {};
      g.__grammarCache.tndgSummary = items;
      return items;
    }
  } catch (err) {
    console.error('Lỗi khi đọc tiengnhatdongian-n3-summary.json:', err);
  }
  return [];
}

/**
 * Lấy chi tiết đầy đủ của 1 bài học (bao gồm toàn bộ HTML nguyên bản có furigana/ruby, so sánh, phân tích)
 */
export function getTndgFullGrammarDetail(id: string): GrammarItem | null {
  if (!g.__grammarCache?.tndgFullMap) {
    try {
      const filePath = path.join(process.cwd(), 'data/tiengnhatdongian-n3-parsed.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        const map = new Map<string, GrammarItem>();
        (parsed.items || []).forEach((item: GrammarItem) => {
          map.set(item.id, item);
        });
        if (!g.__grammarCache) g.__grammarCache = {};
        g.__grammarCache.tndgFullMap = map;
      }
    } catch (err) {
      console.error('Lỗi khi đọc tiengnhatdongian-n3-parsed.json:', err);
    }
  }

  return g.__grammarCache?.tndgFullMap?.get(id) || null;
}

/**
 * Lấy cache bộ nhớ RAM trên server (TTL: 15 phút)
 */
export function getServerMemoryCache() {
  const cache = g.__grammarCache?.serverCache;
  if (!cache) return null;
  const CACHE_TTL = 15 * 60 * 1000; // 15 phút
  if (Date.now() - cache.timestamp > CACHE_TTL) {
    return null;
  }
  return cache;
}

/**
 * Lưu cache bộ nhớ RAM trên server
 */
export function setServerMemoryCache(folders: any[], grammars: GrammarItem[]) {
  if (!g.__grammarCache) g.__grammarCache = {};
  g.__grammarCache.serverCache = {
    folders,
    grammars,
    timestamp: Date.now(),
  };
}

/**
 * Xóa cache khi có thêm/sửa/xóa để cập nhật dữ liệu mới ngay lập tức
 */
export function invalidateServerMemoryCache() {
  if (g.__grammarCache?.serverCache) {
    g.__grammarCache.serverCache = undefined;
  }
}
