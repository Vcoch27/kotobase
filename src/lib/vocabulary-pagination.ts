import { VocabularyIndexEntry, VOCABULARY_PAGE_SIZE } from "./vocabulary-index-schema";

export interface VocabularyPageOptions {
  cursor?: string | null;
  limit?: number;
  search?: string;
  sort?: "created_asc" | "created_desc" | "alphabetical";
}

export function paginateVocabularyIndex(entries: VocabularyIndexEntry[], options: VocabularyPageOptions = {}) {
  const query = options.search?.trim().toLowerCase();
  const sorted = entries.filter(entry => !query || [entry.word, entry.meaning, entry.reading, entry.sinoVietnamese]
    .some(value => value?.toLowerCase().includes(query)));
  sorted.sort((a, b) => {
    if (options.sort === "alphabetical") {
      return (a.reading || a.word).toLowerCase().localeCompare((b.reading || b.word).toLowerCase()) || a.id.localeCompare(b.id);
    }
    const difference = (Date.parse(a.createdAt || "") || 0) - (Date.parse(b.createdAt || "") || 0);
    return (options.sort === "created_desc" ? -difference : difference) || a.id.localeCompare(b.id);
  });
  const cursorIndex = options.cursor ? sorted.findIndex(entry => entry.id === options.cursor) : -1;
  if (options.cursor && cursorIndex < 0) throw new Error("VOCABULARY_CURSOR_EXPIRED");
  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(100, Math.floor(options.limit!))) : VOCABULARY_PAGE_SIZE;
  const page = sorted.slice(cursorIndex + 1, cursorIndex + 1 + limit);
  return {
    entries: page,
    totalCount: sorted.length,
    nextCursor: cursorIndex + 1 + page.length < sorted.length ? page[page.length - 1].id : null,
  };
}
