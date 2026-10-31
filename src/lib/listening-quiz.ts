import { normalizeSpokenJapanese, spokenAnswers } from "./speaking-match";

export interface ListeningWord {
  id: string;
  word: string;
  reading?: string | null;
  meaning: string;
  example?: string | null;
  sinoVietnamese?: string | null;
}
export interface MeaningChoice { id: string; label: string }
export interface MeaningQuestion { choices: MeaningChoice[]; correctId: string | null }
export interface ListeningResult {
  word: ListeningWord;
  typed: string;
  selectedMeaning: string;
  dictationCorrect: boolean;
  meaningCorrect: boolean | null;
  mastered: boolean;
  skipped: boolean;
}

export function cleanListeningMeaning(value: string): string {
  return value.replace(/<<[\s\S]*?(?:>>|$)/g, "")
    .replace(/[\u3040-\u30ff\u3400-\u9fff々]+/g, "")
    .replace(/\s+/g, " ").replace(/\s+([,;.])/g, "$1").trim();
}
function meaningKey(text: string) {
  return cleanListeningMeaning(text).normalize("NFKC").toLocaleLowerCase("vi")
    .replace(/\([^)]*\)/g, "").replace(/[\p{P}\p{S}]/gu, " ").replace(/\s+/g, " ").trim();
}
function meaningsOverlap(a: string, b: string): boolean {
  const variants = (text: string) => cleanListeningMeaning(text).split(/[,;；/\n]+/).map(meaningKey).filter(Boolean);
  const left = variants(a), right = variants(b);
  return meaningKey(a) === meaningKey(b) || left.some((part) => right.includes(part));
}
export function sameListeningReading(a: ListeningWord, b: ListeningWord): boolean {
  const reading = (word: ListeningWord) => spokenAnswers({ word: "", reading: word.reading || word.word });
  const left = reading(a), right = reading(b);
  return left.some((value) => right.includes(value));
}
export function matchListeningText(text: string, word: ListeningWord, pool: ListeningWord[] = []): boolean {
  const value = normalizeSpokenJapanese(text);
  if (!value || !/[\u3040-\u30ff\u3400-\u9fff]/.test(value)) return false;
  if (spokenAnswers(word).includes(value)) return true;
  return pool.some((candidate) => spokenAnswers({ word: candidate.word }).includes(value) && sameListeningReading(word, candidate));
}

export function shuffleListening<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Use only already-loaded meanings. Never invent distractors or penalize homophones. */
export function buildMeaningQuestion(word: ListeningWord, pool: ListeningWord[], random: () => number = Math.random): MeaningQuestion {
  const label = cleanListeningMeaning(word.meaning);
  if (!meaningKey(label)) return { choices: [], correctId: null };
  const equivalents = pool.filter((candidate) => candidate.id === word.id || sameListeningReading(word, candidate));
  const choices: MeaningChoice[] = [{ id: "answer", label }];
  for (const candidate of shuffleListening(pool, random)) {
    const other = cleanListeningMeaning(candidate.meaning);
    if (!meaningKey(other) || candidate.id === word.id || sameListeningReading(word, candidate) ||
        normalizeSpokenJapanese(word.word) === normalizeSpokenJapanese(candidate.word) ||
        equivalents.some((equivalent) => meaningsOverlap(equivalent.meaning, other)) ||
        choices.some((choice) => meaningsOverlap(choice.label, other))) continue;
    choices.push({ id: `option-${choices.length}`, label: other });
    if (choices.length === 4) break;
  }
  if (choices.length < 2) return { choices: [], correctId: null };
  return { choices: shuffleListening(choices, random), correctId: "answer" };
}

export function gradeListeningAttempt(input: {
  word: ListeningWord; pool: ListeningWord[]; question: MeaningQuestion;
  typed: string; meaningId: string | null; skipped?: boolean; freeMeaning?: string;
}): ListeningResult {
  const dictationCorrect = !input.skipped && matchListeningText(input.typed, input.word, input.pool);
  const meaningCorrect = input.skipped ? false : input.question.correctId === null ? null : input.meaningId === input.question.correctId;
  return {
    word: input.word, typed: input.typed,
    selectedMeaning: input.question.choices.find((choice) => choice.id === input.meaningId)?.label || input.freeMeaning || "",
    dictationCorrect, meaningCorrect,
    mastered: dictationCorrect && meaningCorrect === true && !input.skipped,
    skipped: !!input.skipped,
  };
}

export function listeningReviewReason(result: ListeningResult): string {
  if (result.skipped) return "Đã bỏ qua";
  if (!result.dictationCorrect && result.meaningCorrect === false) return "Cần luyện cả nghe/gõ và nghĩa";
  if (!result.dictationCorrect) return "Cần luyện nghe/gõ";
  if (result.meaningCorrect === null) return "Nghĩa chưa được kiểm chứng";
  if (!result.meaningCorrect) return "Cần nhớ lại nghĩa";
  return "Đúng cả hai bước";
}
