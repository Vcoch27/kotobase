export type StudyMode = "overview" | "focus" | "flashcard" | "quiz";
export type QuizMode = "typing" | "speaking" | "listening";
export type VocabularySort = "created_asc" | "created_desc" | "alphabetical";

export interface StudyLocation {
  folderIds: string[];
  selectedIds: string[];
  search: string;
  sort: VocabularySort;
  mode: StudyMode;
}

export interface StudyScope {
  scopeIds: string[];
}

export function studyStorageKey(uid: string | undefined, slot: string) {
  return uid ? `kotobase:study:v1:${encodeURIComponent(uid)}:${slot}` : undefined;
}

export function readStudyData<T>(key?: string): T | null {
  if (!key || typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

export function writeStudyData(key: string | undefined, value: unknown, previous?: string): string | undefined {
  if (!key) return;
  try {
    const serialized = JSON.stringify(value);
    if (serialized !== previous && window.localStorage.getItem(key) !== serialized) {
      window.localStorage.setItem(key, serialized);
    }
    return serialized;
  } catch {
    // The current session still works if browser storage is unavailable.
  }
}

export function isStudyIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(id => typeof id === "string" && id.length > 0);
}

export function readStudyLocation(key?: string): StudyLocation | null {
  const saved = readStudyData<StudyLocation>(key);
  if (!saved || !isStudyIdList(saved.folderIds) || !saved.folderIds.length ||
      !isStudyIdList(saved.selectedIds) || typeof saved.search !== "string" ||
      !["created_asc", "created_desc", "alphabetical"].includes(saved.sort) ||
      !["overview", "focus", "flashcard", "quiz"].includes(saved.mode)) return null;
  return saved;
}

export function studyContext(browseKey: string, selectedIds: string[]) {
  return JSON.stringify([browseKey, [...new Set(selectedIds)].sort()]);
}

export function readStudySnapshot<T extends StudyScope>(key: string | undefined, context: string): T | null {
  const saved = readStudyData<{ context: string; snapshot: T }>(key);
  return saved?.context === context && isStudyIdList(saved.snapshot?.scopeIds) ? saved.snapshot : null;
}

export function readQuizMode(key?: string): QuizMode {
  const mode = readStudyData<QuizMode>(key);
  return mode === "speaking" || mode === "listening" ? mode : "typing";
}

export function wordIds(items: { id: string }[]) {
  return items.map(item => item.id);
}

export function wordsInOrder<T>(itemsById: ReadonlyMap<string, T>, ids: string[]) {
  return ids.flatMap(id => {
    const item = itemsById.get(id);
    return item === undefined ? [] : [item];
  });
}
