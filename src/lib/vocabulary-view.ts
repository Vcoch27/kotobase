type Folder = { id: string; parentId?: string | null };
type Vocabulary = { id: string; word?: string; updatedAt?: unknown; createdAt?: unknown; folderIds?: string[]; folderVocabularies?: { folderId: string }[] };

/** null represents the root view, including vocabulary without a folder. */
export function getVocabularyScope(selection: string | string[] | undefined, folders: Folder[]): Set<string> | null {
  const ids = Array.isArray(selection) ? selection : (selection ? [selection] : []);
  if (!ids.length || ids.includes("all")) return null;
  const scope = new Set(ids);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const folder of folders) {
      if (folder.parentId && scope.has(folder.parentId) && !scope.has(folder.id)) {
        scope.add(folder.id);
        expanded = true;
      }
    }
  }
  return scope;
}

export function filterVocabularyScope<T extends Vocabulary>(records: T[], scope: Set<string> | null): T[] {
  if (!scope) return records;
  return records.filter(record => (record.folderIds ?? record.folderVocabularies?.map(f => f.folderId) ?? [])
    .some(id => scope.has(id)));
}

/** Union word membership instead of summing document counts across children. */
export function getFolderVocabularyWords(selection: string | string[] | undefined, folders: (Folder & { vocabularyWords?: string[] })[]): Set<string> {
  const scope = getVocabularyScope(selection, folders);
  const words = new Set<string>();
  for (const folder of folders) {
    if (!scope || scope.has(folder.id)) {
      for (const word of folder.vocabularyWords ?? []) words.add(word);
    }
  }
  return words;
}

function timestamp(value: unknown): number | undefined {
  if (value == null) return undefined;
  let millis: number;
  if (typeof value === "object") {
    const date = value as { toMillis?: () => number; seconds?: number; _seconds?: number; nanoseconds?: number; _nanoseconds?: number };
    if (value instanceof Date) millis = value.getTime();
    else if (typeof date.toMillis === "function") millis = date.toMillis();
    else if (typeof (date.seconds ?? date._seconds) === "number") {
      millis = (date.seconds ?? date._seconds)! * 1000 + (date.nanoseconds ?? date._nanoseconds ?? 0) / 1e6;
    } else return undefined;
  } else if (typeof value === "string" || typeof value === "number") {
    millis = new Date(value).getTime();
  } else return undefined;
  return Number.isFinite(millis) ? millis : undefined;
}

/** Keep whole records, without combining folder membership or changing storage. */
export function uniqueVocabularyByWord<T extends Vocabulary>(records: T[]): T[] {
  const winners = new Map<string, T>();
  const result: T[] = [];
  for (const record of records) {
    // Malformed records must not collapse into one empty word.
    if (!record.word) { result.push(record); continue; }
    const previous = winners.get(record.word);
    const date = timestamp(record.updatedAt) ?? timestamp(record.createdAt) ?? 0;
    const previousDate = previous ? timestamp(previous.updatedAt) ?? timestamp(previous.createdAt) ?? 0 : 0;
    if (!previous || date > previousDate || (date === previousDate && record.id < previous.id)) {
      winners.set(record.word, record);
    }
  }
  return [...winners.values(), ...result];
}

export function getVocabularyView<T extends Vocabulary>(records: T[], selection: string | string[] | undefined, folders: Folder[]): T[] {
  const scope = getVocabularyScope(selection, folders);
  const scoped = filterVocabularyScope(records, scope);
  // A leaf keeps its original copies. Parent, root and combined views are unique.
  return !scope || scope.size > 1 ? uniqueVocabularyByWord(scoped) : scoped;
}
