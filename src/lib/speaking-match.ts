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
): string | null {
  const answers = spokenAnswers(vocab);
  return (
    alternatives.find((text) =>
      answers.includes(normalizeSpokenJapanese(text)),
    ) ?? null
  );
}

export function compareSpokenVocabulary(
  actual: string,
  vocab: SpokenVocabulary,
) {
  return [
    { label: "Từ vựng", expected: vocab.word },
    { label: "Cách đọc", expected: vocab.reading || vocab.word },
  ].map((row) => ({
    ...row,
    exact:
      !!normalizeSpokenJapanese(actual) &&
      (row.label === "Cách đọc"
        ? row.expected.split(/[/／;；、\n]+/)
        : [row.expected]
      ).some(
        (value) =>
          normalizeSpokenJapanese(value) === normalizeSpokenJapanese(actual),
      ),
    characters: compareSpokenText(
      actual,
      row.expected
        .split(/[/／;；、\n]+/)
        .find(
          (value) =>
            normalizeSpokenJapanese(value) === normalizeSpokenJapanese(actual),
        ) || row.expected.split(/[/／;；、\n]+/)[0],
    ),
  }));
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
