import { KanjiDetail } from "@/app/api/kanji/lookup/route";

// In-memory cache for ultra-fast 0ms access within the session
const memoryKanjiCache = new Map<string, KanjiDetail>();

// LocalStorage key for persisting across page navigations & sessions
const LOCAL_STORAGE_KEY = "kotobase_kanji_details_cache_v1";
const MAX_LOCAL_CACHE_SIZE = 400;

export function getCachedKanjiDetail(character: string): KanjiDetail | null {
  if (!character) return null;
  const char = character.trim();

  // 1. Check memory cache first (instant 0ms)
  if (memoryKanjiCache.has(char)) {
    return memoryKanjiCache.get(char)!;
  }

  // 2. Check localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: Record<string, KanjiDetail> = JSON.parse(stored);
        if (parsed[char]) {
          // Warm up memory cache
          memoryKanjiCache.set(char, parsed[char]);
          return parsed[char];
        }
      }
    } catch (e) {
      console.warn("Failed to read kanji details cache from localStorage", e);
    }
  }

  return null;
}

export function setCachedKanjiDetail(character: string, detail: KanjiDetail) {
  if (!character || !detail) return;
  const char = character.trim();

  // Save in memory
  memoryKanjiCache.set(char, detail);

  // Save in localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const parsed: Record<string, KanjiDetail> = stored ? JSON.parse(stored) : {};
      parsed[char] = detail;

      // Limit size to avoid filling up localStorage
      const keys = Object.keys(parsed);
      if (keys.length > MAX_LOCAL_CACHE_SIZE) {
        delete parsed[keys[0]];
      }

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
    } catch (e) {
      console.warn("Failed to write kanji details cache to localStorage", e);
    }
  }
}

// In-flight request deduplication so simultaneous or rapid clicks share one request
const inFlightRequests = new Map<string, Promise<KanjiDetail | null>>();

export async function fetchKanjiDetailWithCache(character: string): Promise<KanjiDetail | null> {
  if (!character) return null;
  const char = character.trim();

  // 1. Return immediately if cached
  const cached = getCachedKanjiDetail(char);
  if (cached && (cached.on_readings?.length > 0 || cached.kun_readings?.length > 0 || cached.stroke_count)) {
    return cached;
  }

  // 2. Reuse in-flight request if already loading
  if (inFlightRequests.has(char)) {
    return inFlightRequests.get(char)!;
  }

  // 3. Perform network fetch
  const fetchPromise = (async () => {
    try {
      const res = await fetch(`/api/kanji/lookup?query=${encodeURIComponent(char)}`);
      const data = await res.json();
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        const detail = data.data[0] as KanjiDetail;
        // Merge with existing partial cache if any
        const existing = getCachedKanjiDetail(char);
        const merged: KanjiDetail = {
          ...detail,
          hanviet: detail.hanviet || existing?.hanviet || "",
          mean: detail.mean || existing?.mean || "",
          mnemonic: detail.mnemonic || existing?.mnemonic || "",
        };
        setCachedKanjiDetail(char, merged);
        return merged;
      }
      return null;
    } catch (err) {
      console.error(`Error fetching kanji detail for ${char}:`, err);
      return null;
    } finally {
      inFlightRequests.delete(char);
    }
  })();

  inFlightRequests.set(char, fetchPromise);
  return fetchPromise;
}

// Helper to pre-populate cache from initial notes list (from KanjiPage)
export function primeKanjiDetailCache(notes: Array<{ character: string; hanviet?: string | null; meaning?: string | null; mnemonic?: string | null }>) {
  if (!notes || !Array.isArray(notes)) return;
  notes.forEach((note) => {
    if (!note.character) return;
    const char = note.character.trim();
    const existing = getCachedKanjiDetail(char);
    if (!existing) {
      const partial: KanjiDetail = {
        kanji: char,
        hanviet: (note.hanviet || "").toUpperCase(),
        mean: note.meaning || "",
        meanings: note.meaning ? [note.meaning] : [],
        kun_readings: [],
        on_readings: [],
        mnemonic: note.mnemonic || "",
        isSaved: true,
        savedNote: {
          hanviet: (note.hanviet || "").toUpperCase(),
          meaning: note.meaning || "",
          mnemonic: note.mnemonic || "",
        },
      };
      setCachedKanjiDetail(char, partial);
    }
  });
}
