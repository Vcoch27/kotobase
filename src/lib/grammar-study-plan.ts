import type { GrammarItem } from './grammar-data';

export interface GrammarStudyDay {
  day: number;
  part: string;
  title: string;
  bookPage?: number;
  firestoreNumbers?: [number, number];
  localNumbers?: [number, number];
  localExtraNumbers?: number[];
}

// The order and page references follow the contents on PDF pages 5–9.
// The two mock tests complete the user's 38-day schedule. Only verified
// contiguous lesson groups are mapped; unrelated local lessons stay unassigned.
export const grammarStudyDays: GrammarStudyDay[] = [
  { day: 1, part: 'Phần 1 · Ngữ pháp trong câu', title: 'Bài 1 · ～とき', bookPage: 16, firestoreNumbers: [1, 4], localNumbers: [1, 8] },
  { day: 2, part: 'Phần 1 · Ngữ pháp trong câu', title: 'Bài 2 · ～と関係して', bookPage: 18, firestoreNumbers: [5, 9], localNumbers: [9, 13] },
  { day: 3, part: 'Phần 1 · Ngữ pháp trong câu', title: 'Bài 3 · 比べれば', bookPage: 22, firestoreNumbers: [10, 13], localNumbers: [14, 18] },
  { day: 4, part: 'Phần 1 · Ngữ pháp trong câu', title: 'Bài 4 · ～とは違って', bookPage: 24, firestoreNumbers: [14, 18], localNumbers: [19, 23] },
  { day: 5, part: 'Phần 1 · Ngữ pháp trong câu', title: 'Bài 5 · ～だから', bookPage: 30, firestoreNumbers: [19, 23], localNumbers: [24, 29] },
  { day: 6, part: 'Phần 1 · Ngữ pháp trong câu', title: 'Bài 6 · もし、…', bookPage: 32, firestoreNumbers: [24, 28], localNumbers: [30, 34] },
  { day: 7, part: 'Phần 1 · Ngữ pháp trong câu', title: 'Bài 7 · ～だそうだ', bookPage: 36, firestoreNumbers: [29, 33], localNumbers: [35, 40] },
  { day: 8, part: 'Phần 1 · Ngữ pháp trong câu', title: 'Bài 8 · 絶対～ない', bookPage: 38, firestoreNumbers: [34, 38], localNumbers: [41, 48] },
  { day: 9, part: 'Phần 1 · Ngữ pháp trong câu', title: 'Bài 9 · ～と望む', bookPage: 44, firestoreNumbers: [39, 41], localNumbers: [49, 52] },
  { day: 10, part: 'Phần 1 · Ngữ pháp trong câu', title: 'Bài 10 · ～したほうがいい', bookPage: 46, firestoreNumbers: [42, 45], localNumbers: [53, 57] },
  { day: 11, part: 'Phần 1 · Ngữ pháp trong câu', title: 'Bài 11 · ～(よ)うと思う', bookPage: 50, firestoreNumbers: [46, 49], localNumbers: [58, 62] },
  { day: 12, part: 'Phần 1 · Ngữ pháp trong câu', title: 'Bài 12 · 敬語', bookPage: 52 },
  { day: 13, part: 'Phần 1 · Cách dùng mẫu câu', title: 'A · Trợ từ', bookPage: 58, firestoreNumbers: [50, 57], localNumbers: [63, 71] },
  { day: 14, part: 'Phần 1 · Cách dùng mẫu câu', title: 'B · Từ mang chức năng trợ từ', bookPage: 62, firestoreNumbers: [58, 62], localNumbers: [72, 74] },
  { day: 15, part: 'Phần 1 · Cách dùng mẫu câu', title: 'C · 「こと・の」', bookPage: 66, localExtraNumbers: [126, 217] },
  { day: 16, part: 'Phần 1 · Cách dùng mẫu câu', title: 'D · 「よう」', bookPage: 70, firestoreNumbers: [63, 66], localNumbers: [75, 76] },
  { day: 17, part: 'Phần 1 · Cách dùng mẫu câu', title: 'E · 「わけ」', bookPage: 74, firestoreNumbers: [67, 69], localNumbers: [77, 80] },
  { day: 18, part: 'Phần 1 · Cách dùng mẫu câu', title: 'F · 「ばかり」', bookPage: 80, firestoreNumbers: [70, 74], localNumbers: [81, 83] },
  { day: 19, part: 'Phần 1 · Cách dùng mẫu câu', title: 'G · 「する・なる」', bookPage: 84, firestoreNumbers: [75, 84], localNumbers: [84, 89] },
  { day: 20, part: 'Phần 1 · Cách dùng mẫu câu', title: 'H · 「たら・ば・と・なら」', bookPage: 88, firestoreNumbers: [85, 87], localNumbers: [90, 91] },
  { day: 21, part: 'Phần 1 · Cách dùng mẫu câu', title: 'I · Phó từ đi với mẫu cố định', bookPage: 92 },
  { day: 22, part: 'Phần 1 · Cách dùng mẫu câu', title: 'J · Mở rộng nghĩa động từ, danh từ', bookPage: 96, firestoreNumbers: [88, 100], localNumbers: [92, 105] },
  { day: 23, part: 'Phần 2 · Cấu trúc câu', title: 'Bài 1 · Trích dẫn', bookPage: 104, localExtraNumbers: [179, 180, 215, 220, 277] },
  { day: 24, part: 'Phần 2 · Cấu trúc câu', title: 'Bài 2 · Bổ nghĩa danh từ', bookPage: 106 },
  { day: 25, part: 'Phần 2 · Cấu trúc câu', title: 'Bài 3 · 「～という・～といった」', bookPage: 108, localExtraNumbers: [176, 219, 227] },
  { day: 26, part: 'Phần 2 · Cấu trúc câu', title: 'Bài 4 · Mẫu câu cố định', bookPage: 110 },
  { day: 27, part: 'Phần 3 · Ngữ pháp trong đoạn văn', title: 'Bài 1 · Liên kết đầu và cuối câu', bookPage: 116 },
  { day: 28, part: 'Phần 3 · Ngữ pháp trong đoạn văn', title: 'Bài 2 · Thì và ～ている', bookPage: 118 },
  { day: 29, part: 'Phần 3 · Ngữ pháp trong đoạn văn', title: 'Bài 3 · Tự động từ và tha động từ', bookPage: 122 },
  { day: 30, part: 'Phần 3 · Ngữ pháp trong đoạn văn', title: 'Bài 4 · ～てくる・～ていく', bookPage: 124, localNumbers: [136, 136] },
  { day: 31, part: 'Phần 3 · Ngữ pháp trong đoạn văn', title: 'Bài 5 · Bị động, sai khiến', bookPage: 128, localExtraNumbers: [133, 173, 230, 274] },
  { day: 32, part: 'Phần 3 · Ngữ pháp trong đoạn văn', title: 'Bài 6 · ～てあげる・～てもらう・～てくれる', bookPage: 130, localExtraNumbers: [247, 301] },
  { day: 33, part: 'Phần 3 · Ngữ pháp trong đoạn văn', title: 'Bài 7 · こ・そ・あ', bookPage: 134 },
  { day: 34, part: 'Phần 3 · Ngữ pháp trong đoạn văn', title: 'Bài 8 · は・が', bookPage: 136 },
  { day: 35, part: 'Phần 3 · Ngữ pháp trong đoạn văn', title: 'Bài 9 · Liên từ', bookPage: 140, localExtraNumbers: [192, 193, 194, 195, 200, 201, 202, 208, 209, 271, 308] },
  { day: 36, part: 'Phần 3 · Ngữ pháp trong đoạn văn', title: 'Bài 10 · Thống nhất giọng văn', bookPage: 142 },
  { day: 37, part: 'Luyện tập', title: 'Đề mô phỏng 1', bookPage: 148 },
  { day: 38, part: 'Luyện tập', title: 'Đề mô phỏng 2', bookPage: 152 },
];

export function getGrammarStudyDay(grammar: GrammarItem): number | null {
  if (!Number.isInteger(grammar.number)) return null;
  const number = grammar.number!;
  const isLocal = grammar.id.startsWith('tndg-');
  const isShinKanzen = grammar.folderIds?.includes('E9rOfmF2wzKlWWbpWcFY');
  if (!isLocal && !isShinKanzen) return null;
  const rangeKey = isLocal ? 'localNumbers' : 'firestoreNumbers';
  const match = grammarStudyDays.find(day => {
    const range = day[rangeKey];
    return (range && number >= range[0] && number <= range[1]) ||
      (rangeKey === 'localNumbers' && day.localExtraNumbers?.includes(number));
  });
  return match?.day ?? null;
}
