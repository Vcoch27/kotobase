export type Cue = { start: number; end: number; speaker: string; ja: string; vi: string };
export type Lesson = {
  id: string; group: string; title: string; filename: string; audio: string;
  source: string; note: string; cues: Cue[];
};

export function plainJapanese(text: string) {
  return text.replace(/([一-龯々ヶヵ]+)\(([ぁ-んァ-ンー]+)\)/g, "$1");
}

export function normalizedJapanese(text: string) {
  return plainJapanese(text).normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();
}

export type DiffPart = { value: string; kind: "same" | "missing" | "extra" | "wrong" };

export function compareJapanese(input: string, answer: string) {
  const actual = Array.from(normalizedJapanese(input));
  const expected = Array.from(normalizedJapanese(answer));
  const rows = expected.length + 1;
  const cols = actual.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) for (let j = 1; j < cols; j++) {
    dp[i][j] = Math.min(
      dp[i - 1][j] + 1,
      dp[i][j - 1] + 1,
      dp[i - 1][j - 1] + (expected[i - 1] === actual[j - 1] ? 0 : 1),
    );
  }
  const answerParts: DiffPart[] = [];
  const inputParts: DiffPart[] = [];
  let i = expected.length; let j = actual.length;
  while (i || j) {
    if (i && j && expected[i - 1] === actual[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      answerParts.unshift({ value: expected[--i], kind: "same" });
      inputParts.unshift({ value: actual[--j], kind: "same" });
    } else if (i && j && dp[i][j] === dp[i - 1][j - 1] + 1) {
      answerParts.unshift({ value: expected[--i], kind: "wrong" });
      inputParts.unshift({ value: actual[--j], kind: "wrong" });
    } else if (i && dp[i][j] === dp[i - 1][j] + 1) {
      answerParts.unshift({ value: expected[--i], kind: "missing" });
    } else {
      inputParts.unshift({ value: actual[--j], kind: "extra" });
    }
  }
  return {
    score: expected.length ? Math.max(0, Math.round((1 - dp[expected.length][actual.length] / expected.length) * 100)) : 100,
    correct: dp[expected.length][actual.length] === 0,
    answerParts, inputParts,
  };
}
