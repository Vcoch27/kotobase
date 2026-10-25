/** Speech recognition compares text, not pitch accent or pronunciation quality. */
export interface SpokenVocabulary {
  word: string;
  reading?: string | null;
}

export function normalizeSpokenJapanese(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60),
    )
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

export function spokenAnswers(vocab: SpokenVocabulary): string[] {
  return Array.from(
    new Set(
      [vocab.word, ...(vocab.reading || "").split(/[/／;；、\n]+/)]
        .map((value) => value.trim())
        .filter((value) => /[\u3040-\u30ff\u3400-\u9fff]/u.test(value))
        .filter((value) => !/[()（）]/.test(value))
        .map(normalizeSpokenJapanese)
        .filter(Boolean),
    ),
  );
}

export function matchSpokenAnswer(
  alternatives: string[],
  vocab: SpokenVocabulary,
  homophones: string[] = [],
): string | null {
  const answers = [...spokenAnswers(vocab), ...homophones.map(normalizeSpokenJapanese)];
  return (
    alternatives.find((text) =>
      answers.includes(normalizeSpokenAttempt(text, vocab)),
    ) ?? null
  );
}

/** Only paired, exact kana readings establish equivalence; never fuzzy Kanji. */
export function homophonesFromVocabulary(
  vocab: SpokenVocabulary,
  candidates: SpokenVocabulary[],
): string[] {
  const readings = spokenAnswers({ word: "", reading: vocab.reading || vocab.word })
    .filter((value) => /^[ぁ-ゖー]+$/.test(value));
  return Array.from(new Set(candidates.filter((candidate) =>
    spokenAnswers({ word: "", reading: candidate.reading })
      .some((reading) => readings.includes(reading)),
  ).map((candidate) => candidate.word).filter(Boolean)));
}

export function homophonesFromDictionary(vocab: SpokenVocabulary, data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  const candidates: SpokenVocabulary[] = [];
  for (const entry of data) {
    if (!Array.isArray(entry?.japanese)) continue;
    for (const pair of entry.japanese) {
      if (typeof pair?.word === "string" && typeof pair?.reading === "string")
        candidates.push({ word: pair.word, reading: pair.reading });
    }
  }
  return homophonesFromVocabulary(vocab, candidates);
}

const readingCache = new Map<string, Promise<unknown>>();
/** Reuse the app's cached dictionary route; no vocabulary/Firestore queries. */
export async function loadSpokenHomophones(vocab: SpokenVocabulary): Promise<string[]> {
  const readings = spokenAnswers({ word: "", reading: vocab.reading || vocab.word })
    .filter((value) => /^[ぁ-ゖー]+$/.test(value)).slice(0, 4);
  const responses = await Promise.all(readings.map((reading) => {
    let pending = readingCache.get(reading);
    if (!pending) {
      pending = (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch(`/api/jisho?keyword=${encodeURIComponent(reading)}`, {
            signal: controller.signal,
          });
          if (!response.ok) return [];
          return (await response.json()).data;
        } catch {
          return [];
        } finally {
          clearTimeout(timer);
        }
      })();
      if (readingCache.size >= 128) readingCache.delete(readingCache.keys().next().value!);
      readingCache.set(reading, pending);
    }
    return pending;
  }));
  return homophonesFromDictionary(vocab, responses.flatMap((data) => Array.isArray(data) ? data : []));
}

export function isShortSpokenVocabulary(vocab: SpokenVocabulary): boolean {
  return (vocab.reading || vocab.word).split(/[/／;；、\n]+/).some((value) => {
    const kana = normalizeSpokenJapanese(value);
    return (
      /^[ぁ-ゖー]+$/.test(kana) &&
      kana.replace(/[ゃゅょぁぃぅぇぉゎ]/g, "").length <= 2
    );
  });
}
function normalizeSpokenAttempt(text: string, vocab: SpokenVocabulary): string {
  const normalized = normalizeSpokenJapanese(text);
  if (spokenAnswers(vocab).includes(normalized)) return normalized;
  return isShortSpokenVocabulary(vocab) && normalized.endsWith("です")
    ? normalized.slice(0, -2)
    : normalized;
}

export function compareSpokenVocabulary(
  actual: string,
  vocab: SpokenVocabulary,
  homophones: string[] = [],
) {
  return [
    { label: "Từ vựng", expected: vocab.word },
    { label: "Cách đọc", expected: vocab.reading || vocab.word },
  ].map((row) => {
    const normalized = normalizeSpokenAttempt(actual, vocab);
    const expected = row.label === "Cách đọc"
      ? row.expected.split(/[/／;；、\n]+/) : [row.expected];
    const literalMatch = expected.some((value) => normalizeSpokenJapanese(value) === normalized);
    const phoneticMatch = row.label === "Cách đọc" && !literalMatch &&
      homophones.some((word) => normalizeSpokenJapanese(word) === normalized);
    return {
      ...row,
      exact: !!normalized && (literalMatch || phoneticMatch),
      phoneticMatch,
      characters: compareSpokenText(normalized,
        expected.find((value) => normalizeSpokenJapanese(value) === normalized) || expected[0],
      ).map((part) => phoneticMatch ? { ...part, matched: true } : part),
    };
  });
}

export function addReviewWord<T extends { id: string }>(
  items: T[],
  word: T,
): T[] {
  return items.some((item) => item.id === word.id) ? items : [...items, word];
}

/** LCS marks exact normalized characters, without turning similarity into a pass. */
export function compareSpokenText(actual: string, expected: string) {
  const a = Array.from(normalizeSpokenJapanese(actual)).slice(0, 120);
  const b = Array.from(normalizeSpokenJapanese(expected)).slice(0, 120);
  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  const matched = new Set<number>();
  let i = a.length,
    j = b.length;
  while (i && j) {
    if (a[i - 1] === b[j - 1]) {
      matched.add(i - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return a.map((text, index) => ({ text, matched: matched.has(index) }));
}
