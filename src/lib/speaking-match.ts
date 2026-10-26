/** Speech recognition compares text, not pitch accent or pronunciation quality. */
export interface SpokenVocabulary {
  word: string;
  reading?: string | null;
}
export type SpokenMatchMode = "strict" | "flexible";

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
      [...vocab.word.split(/[/／;；、\n]+/), ...(vocab.reading || "").split(/[/／;；、\n]+/)]
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
  mode: SpokenMatchMode = "strict",
): string | null {
  const answers = [...spokenAnswers(vocab), ...homophones.map(normalizeSpokenJapanese)];
  // Prefer the literal result if any hypothesis is exact, before looser forms.
  const exact = alternatives.find((text) => answers.includes(normalizeSpokenAttempt(text, vocab)));
  if (exact || mode === "strict") return exact ?? null;
  return alternatives.find((text) => flexibleMatch(text, answers)) ?? null;
}

/** Normalize alternative spellings of the SAME long vowel; never delete a mora. */
export function normalizeSpokenReading(text: string): string {
  const groups = [
    ["あかがさざただなはばぱまやらわぁゃ", "あ"],
    ["いきぎしじちぢにひびぴみりぃ", "い"],
    ["うくぐすずつづぬふぶぷむゆるぅゅゔ", "う"],
    ["えけげせぜてでねへべぺめれぇ", "え"],
    ["おこごそぞとどのほぼぽもよろをぉょ", "お"],
  ];
  const expanded: string[] = [];
  for (const ch of normalizeSpokenJapanese(text)) {
    if (ch !== "ー") expanded.push(ch);
    else expanded.push(groups.find(([kana]) => kana.includes(expanded.at(-1) || "\0"))?.[1] || ch);
  }
  return expanded.join("")
    .replace(/([おこごそぞとどのほぼぽもよろをょ])う/g, "$1お")
    .replace(/([えけげせぜてでねへべぺめれ])い/g, "$1え");
}

function naturalSpokenCores(text: string): string[] {
  let core = normalizeSpokenJapanese(text);
  const suffix = /(?:と言います|といいます|ですよ|ですね|です)$/;
  const original = core;
  // Only explicit carrier phrases, not arbitrary words inside a sentence.
  for (let i = 0; i < 2; i++) core = core.replace(/^(?:えっと|えーと|ええと|あのー|あの)(?=.+)/, "");
  core = core.replace(/^(?:答えは|こたえは|読み方は|よみかたは)(?=.+)/, "");
  return [original, original.replace(suffix, ""), core, core.replace(suffix, "")];
}

function flexibleMatch(text: string, answers: string[]): boolean {
  if (!text.trim() || text.length > 240) return false;
  const matches = (value: string) => {
    const candidates = naturalSpokenCores(value);
    return candidates.some((candidate) => !!candidate && answers.some((answer) =>
      candidate === answer || (/^[ぁ-ゖー]+$/.test(candidate) && /^[ぁ-ゖー]+$/.test(answer) &&
        normalizeSpokenReading(candidate) === normalizeSpokenReading(answer)),
    ));
  };
  if (matches(text)) return true;
  // Paused repetitions are okay only when every complete part is the answer.
  // Never cherry-pick a correct word out of an otherwise unrelated sentence.
  const parts = text.trim().split(/[\s、,。.!！?？]+/u).filter(Boolean);
  return parts.length >= 2 && parts.length <= 3 && parts.every(matches);
}

export function spokenMatchExplanation(
  text: string, vocab: SpokenVocabulary, homophones: string[] = [], mode: SpokenMatchMode = "strict",
): string | null {
  if (!matchSpokenAnswer([text], vocab, homophones, mode)) return null;
  if (spokenAnswers(vocab).includes(normalizeSpokenAttempt(text, vocab))) return "Khớp từ vựng hoặc cách đọc.";
  if (homophones.some((word) => normalizeSpokenJapanese(word) === normalizeSpokenAttempt(text, vocab)))
    return "Cùng cách đọc; máy chọn Kanji khác vẫn được chấp nhận.";
  return "Khớp ở chế độ Linh hoạt: bỏ từ đệm/đuôi câu, từ lặp hoặc cách ghi âm dài tương đương.";
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
  ).flatMap((candidate) => candidate.word.split(/[/／;；、\n]+/)).map((word) => word.trim()).filter(Boolean)));
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
  mode: SpokenMatchMode = "strict",
) {
  return [
    { label: "Từ vựng", expected: vocab.word },
    { label: "Cách đọc", expected: vocab.reading || vocab.word },
  ].map((row) => {
    const normalized = normalizeSpokenAttempt(actual, vocab);
    const expected = row.expected.split(/[/／;；、\n]+/);
    const literalMatch = expected.some((value) => normalizeSpokenJapanese(value) === normalized);
    const phoneticMatch = row.label === "Cách đọc" && !literalMatch &&
      (homophones.some((word) => normalizeSpokenJapanese(word) === normalized) ||
        (mode === "flexible" && !!matchSpokenAnswer([actual], vocab, homophones, mode)));
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
