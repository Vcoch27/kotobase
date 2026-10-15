import fs from 'fs';
import path from 'path';
import tndgSummaryRaw from '../../data/tiengnhatdongian-n3-summary.json';
import tndgParsedRaw from '../../data/tiengnhatdongian-n3-parsed.json';
import tndgDetailNormalizedRaw from '../../data/tiengnhatdongian-n3-detail-normalized.json';

export interface GrammarExample {
  jpn: string;
  vie: string;
  ruby?: string;
}

export interface GrammarBlock {
  blockNumber: number;
  heading?: string;
  formation?: string;
  formationRuby?: string;
  meaning?: string;
  meaningRuby?: string;
  nuance?: string;
  nuanceRuby?: string;
  examples: GrammarExample[];
  html?: string;
}

export interface GrammarItem {
  id: string;
  number?: number;
  title?: string;
  structure: string;
  structureRuby?: string;
  formation?: string;
  formationRuby?: string;
  meaning: string;
  meaningRuby?: string;
  nuance?: string;
  nuanceRuby?: string;
  example?: string;
  exampleRuby?: string;
  exampleMeaning?: string;
  examples?: GrammarExample[];
  blocks?: GrammarBlock[];
  books?: string[];
  jlptLevel?: string;
  usageContext?: string;
  sourceUrl?: string;
  folderIds?: string[];
  tags?: string[];
  ownerId?: string;
  source?: string;
  articleBlocks?: Array<{ kind: string; heading: string; text?: string; html: string }>;
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
 * Đọc danh sách 308 ngữ pháp tóm tắt từ dữ liệu tĩnh được nhúng (bundled)
 * (Đảm bảo 100% luôn hoạt động trên Vercel Serverless, 0 Firestore reads, 0ms latency)
 */
export function getTndgSummaryGrammars(): GrammarItem[] {
  if (g.__grammarCache?.tndgSummary && g.__grammarCache.tndgSummary.length > 0) {
    return g.__grammarCache.tndgSummary;
  }

  // 1. Lấy trực tiếp từ JSON import tĩnh (Next.js/Webpack bundle)
  if (tndgSummaryRaw && Array.isArray((tndgSummaryRaw as any).items) && (tndgSummaryRaw as any).items.length > 0) {
    const items = (tndgSummaryRaw as any).items as GrammarItem[];
    if (!g.__grammarCache) g.__grammarCache = {};
    g.__grammarCache.tndgSummary = items;
    return items;
  }

  // 2. Dự phòng: Đọc từ file hệ thống nếu có
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
    const map = new Map<string, GrammarItem>();
    const summaryById = new Map(getTndgSummaryGrammars().map(item => [item.id, item]));
    const detailById = new Map((tndgDetailNormalizedRaw.items as Array<{ id: string; examples: GrammarExample[] }>).map(item => [item.id, item]));

    // 1. Lấy từ dữ liệu import tĩnh được bundle
    if (tndgParsedRaw && Array.isArray((tndgParsedRaw as any).items)) {
      ((tndgParsedRaw as any).items as GrammarItem[]).forEach((item) => {
        map.set(item.id, {
          ...item,
          ...summaryById.get(item.id),
          examples: detailById.get(item.id)?.examples || summaryById.get(item.id)?.examples || item.examples,
          articleBlocks: item.articleBlocks,
        });
      });
    }

    // 2. Dự phòng: Đọc từ file nếu map rỗng
    if (map.size === 0) {
      try {
        const filePath = path.join(process.cwd(), 'data/tiengnhatdongian-n3-parsed.json');
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(raw);
          (parsed.items || []).forEach((item: GrammarItem) => {
            map.set(item.id, item);
          });
        }
      } catch (err) {
        console.error('Lỗi khi đọc tiengnhatdongian-n3-parsed.json:', err);
      }
    }

    if (!g.__grammarCache) g.__grammarCache = {};
    g.__grammarCache.tndgFullMap = map;
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
