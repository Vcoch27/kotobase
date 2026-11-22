"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { readStudySnapshot, wordIds, writeStudyData, type StudyScope } from "@/lib/study-session";

export interface StudyPersistence {
  sessionKey?: string;
  sessionContext?: string;
}

export function useInitialStudySnapshot<S extends StudyScope, T extends { id: string }>(
  key: string | undefined,
  context: string,
  words: T[],
  restore: (snapshot: S, wordsById: ReadonlyMap<string, T>) => S | null,
) {
  const [initial] = useState(() => {
    const saved = readStudySnapshot<S>(key, context);
    if (!saved) return null;
    const wordsById = new Map(words.map(word => [word.id, word]));
    if (!saved.scopeIds.every(id => wordsById.has(id))) return null;
    try {
      const snapshot = restore(saved, wordsById);
      return snapshot ? { snapshot, wordsById } : null;
    } catch {
      return null;
    }
  });
  return initial;
}

export function useSaveStudySnapshot(
  key: string | undefined,
  context: string,
  active: boolean,
  scope: { id: string }[],
  capture: () => object,
) {
  const previous = useRef<string>();
  const saveOnExit = useRef<() => void>();
  useLayoutEffect(() => {
    saveOnExit.current = key && active && scope.length ? () => {
      previous.current = writeStudyData(
        key,
        { context, snapshot: { scopeIds: wordIds(scope), ...capture() } },
        previous.current,
      );
    } : undefined;
    saveOnExit.current?.();
  });

  useLayoutEffect(() => {
    if (!key || !active) return;
    const save = () => saveOnExit.current?.();
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [key, active]);
}
