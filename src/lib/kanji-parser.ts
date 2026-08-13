/**
 * Utility bóc tách Hán tự (Kanji) từ chuỗi tiếng Nhật.
 * Dùng Regex dải Unicode Hán tự chuẩn CJK Unified Ideographs.
 */

const KANJI_REGEX = /[\u4E00-\u9FAF\u3400-\u4DBF]/;
const KANJI_GLOBAL_REGEX = /[\u4E00-\u9FAF\u3400-\u4DBF]/g;

export function isKanji(char: string): boolean {
  return KANJI_REGEX.test(char);
}

export function extractKanji(text: string): string[] {
  if (!text) return [];
  const matches = text.match(KANJI_GLOBAL_REGEX);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

export interface KanjiSegment {
  text: string;
  isKanji: boolean;
}

export function parseKanjiSegments(text: string): KanjiSegment[] {
  if (!text) return [];
  const result: KanjiSegment[] = [];

  for (const char of text) {
    result.push({
      text: char,
      isKanji: isKanji(char),
    });
  }

  return result;
}
