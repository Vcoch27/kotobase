export interface PromptVariable {
  name: string;
  description: string;
}

export interface PromptConfig {
  id: string;
  title: string;
  description: string;
  category: "vocabulary" | "sentence" | "grammar";
  categoryLabel: string;
  content: string;
  defaultContent: string;
  variables?: PromptVariable[];
  updatedAt?: string;
  updatedBy?: string;
  version?: number;
}

export const DEFAULT_PROMPTS: Record<string, PromptConfig> = {
  vocab_ai_extract: {
    id: "vocab_ai_extract",
    title: "Gemini AI: Phân tích & Trích xuất từ vựng thô",
    description: "System Prompt gửi trực tiếp tới Gemini API khi người dùng dán danh sách từ thô vào phần Thêm hàng loạt (Bulk AI).",
    category: "vocabulary",
    categoryLabel: "Tiện ích Từ vựng",
    variables: [
      { name: "{{RAW_TEXT}}", description: "Đoạn văn bản/danh sách từ vựng thô do người dùng nhập vào" }
    ],
    defaultContent: `Bạn là một chuyên gia ngôn ngữ tiếng Nhật và từ điển học. 
Nhiệm vụ của bạn là phân tích văn bản/danh sách từ vựng thô dưới đây và trích xuất thành danh sách các từ vựng tiếng Nhật chuẩn xác.

Yêu cầu cho từng từ vựng:
- word (bắt buộc): Từ vựng tiếng Nhật viết bằng chữ Hán (Kanji) hoặc Kana chuẩn (ví dụ: "逃げる", "しっかり").
- meaning (bắt buộc): Nghĩa tiếng Việt chính xác, súc tích (ví dụ: "chạy trốn, tẩu thoát").
- reading: Cách đọc viết hoàn toàn bằng Hiragana hoặc Katakana (ví dụ: "にげる").
- sinoVietnamese: Âm Hán Việt in hoa (ví dụ nếu từ có chữ Hán như 逃げる -> "ĐÀO", 将来的 -> "TƯƠNG LAI ĐÍCH", nếu không có chữ Hán thì để null).
- example: Một câu ví dụ tiếng Nhật ngắn gọn, thực tế kèm dịch nghĩa tiếng Việt trong ngoặc đơn (ví dụ: "犯人は海外に逃げた。(Thủ phạm đã trốn ra nước ngoài.)").

Văn bản đầu vào từ người dùng:
"""
{{RAW_TEXT}}
"""`,
    content: `Bạn là một chuyên gia ngôn ngữ tiếng Nhật và từ điển học. 
Nhiệm vụ của bạn là phân tích văn bản/danh sách từ vựng thô dưới đây và trích xuất thành danh sách các từ vựng tiếng Nhật chuẩn xác.

Yêu cầu cho từng từ vựng:
- word (bắt buộc): Từ vựng tiếng Nhật viết bằng chữ Hán (Kanji) hoặc Kana chuẩn (ví dụ: "逃げる", "しっかり").
- meaning (bắt buộc): Nghĩa tiếng Việt chính xác, súc tích (ví dụ: "chạy trốn, tẩu thoát").
- reading: Cách đọc viết hoàn toàn bằng Hiragana hoặc Katakana (ví dụ: "にげる").
- sinoVietnamese: Âm Hán Việt in hoa (ví dụ nếu từ có chữ Hán như 逃げる -> "ĐÀO", 将来的 -> "TƯƠNG LAI ĐÍCH", nếu không có chữ Hán thì để null).
- example: Một câu ví dụ tiếng Nhật ngắn gọn, thực tế kèm dịch nghĩa tiếng Việt trong ngoặc đơn (ví dụ: "犯人は海外に逃げた。(Thủ phạm đã trốn ra nước ngoài.)").

Văn bản đầu vào từ người dùng:
"""
{{RAW_TEXT}}
"""`
  },

  vocab_copy_template: {
    id: "vocab_copy_template",
    title: "Mẫu Copy Prompt: Tạo JSON từ vựng (ChatGPT / Claude)",
    description: "Mẫu prompt chuẩn hiển thị cho người dùng sao chép để dán vào ChatGPT/Claude/DeepSeek tạo mảng JSON từ vựng.",
    category: "vocabulary",
    categoryLabel: "Tiện ích Từ vựng",
    variables: [],
    defaultContent: `Hãy đóng vai một chuyên gia tiếng Nhật. Trả lời bằng định dạng JSON chuẩn (mảng các object). Hãy tạo cho tôi danh sách từ vựng tiếng Nhật.
Mỗi từ vựng phải tuân theo cấu trúc sau:
{
  "word": "từ vựng (bắt buộc)",
  "meaning": "nghĩa tiếng Việt (bắt buộc)",
  "reading": "cách đọc Hiragana",
  "sinoVietnamese": "âm Hán Việt",
  "example": "ví dụ câu (tiếng Nhật - tiếng Việt)"
}
Ví dụ:
[
  {
    "word": "逃げる",
    "meaning": "chạy trốn",
    "reading": "にげる",
    "sinoVietnamese": "ĐÀO",
    "example": "犯人は海外に逃げた。(Thủ phạm đã trốn ra nước ngoài.)"
  }
]`,
    content: `Hãy đóng vai một chuyên gia tiếng Nhật. Trả lời bằng định dạng JSON chuẩn (mảng các object). Hãy tạo cho tôi danh sách từ vựng tiếng Nhật.
Mỗi từ vựng phải tuân theo cấu trúc sau:
{
  "word": "từ vựng (bắt buộc)",
  "meaning": "nghĩa tiếng Việt (bắt buộc)",
  "reading": "cách đọc Hiragana",
  "sinoVietnamese": "âm Hán Việt",
  "example": "ví dụ câu (tiếng Nhật - tiếng Việt)"
}
Ví dụ:
[
  {
    "word": "逃げる",
    "meaning": "chạy trốn",
    "reading": "にげる",
    "sinoVietnamese": "ĐÀO",
    "example": "犯人は海外に逃げた。(Thủ phạm đã trốn ra nước ngoài.)"
  }
]`
  },

  sentence_ai_template: {
    id: "sentence_ai_template",
    title: "Mẫu Copy Prompt: Tạo Mẫu câu giao tiếp",
    description: "Mẫu prompt dùng khi người dùng cần tạo danh sách mẫu câu giao tiếp kèm từ vựng và cấu trúc ngữ pháp.",
    category: "sentence",
    categoryLabel: "Mẫu câu Giao tiếp",
    variables: [],
    defaultContent: `Hãy đóng vai một chuyên gia giảng dạy tiếng Nhật. Hãy tạo danh sách mẫu câu giao tiếp tiếng Nhật theo chủ đề tôi yêu cầu (hoặc phân tích đoạn văn/danh sách câu tôi cung cấp).

BẮT BUỘC trả về kết quả dưới định dạng JSON thuần túy (Mảng các Object), không bao bọc thêm bất kỳ lời giải thích nào.

Cấu trúc JSON mỗi phần tử bắt buộc:
[
  {
    "japanese": "Câu tiếng Nhật hoàn chỉnh có Kanji (Ví dụ: 先生のおかげで、合格できた。)",
    "meaning": "Dịch nghĩa tiếng Việt tự nhiên, chuẩn xác",
    "vocabularies": [
      { "word": "Từ vựng có trong câu", "reading": "cách đọc Hiragana", "meaning": "nghĩa tiếng Việt" }
    ],
    "grammars": [
      { "grammar": "Cấu trúc ngữ pháp trọng tâm", "meaning": "ý nghĩa / cách dùng của ngữ pháp" }
    ],
    "note": "Ghi chú thêm về sắc thái, hoàn cảnh giao tiếp (nếu có)"
  }
]

Ví dụ mẫu:
[
  {
    "japanese": "先生のおかげで、合格できた。",
    "meaning": "Nhờ có thầy giáo mà tôi đã đỗ.",
    "vocabularies": [
      { "word": "先生", "reading": "せんせい", "meaning": "giáo viên, thầy giáo" },
      { "word": "合格", "reading": "ごうかく", "meaning": "đỗ, trúng tuyển" }
    ],
    "grammars": [
      { "grammar": "おかげで", "meaning": "nhờ có, nhờ vào (kết quả tích cực)" }
    ],
    "note": "Dùng trong giao tiếp lịch sự, thể hiện lòng biết ơn chân thành"
  }
]`,
    content: `Hãy đóng vai một chuyên gia giảng dạy tiếng Nhật. Hãy tạo danh sách mẫu câu giao tiếp tiếng Nhật theo chủ đề tôi yêu cầu (hoặc phân tích đoạn văn/danh sách câu tôi cung cấp).

BẮT BUỘC trả về kết quả dưới định dạng JSON thuần túy (Mảng các Object), không bao bọc thêm bất kỳ lời giải thích nào.

Cấu trúc JSON mỗi phần tử bắt buộc:
[
  {
    "japanese": "Câu tiếng Nhật hoàn chỉnh có Kanji (Ví dụ: 先生のおかげで、合格できた。)",
    "meaning": "Dịch nghĩa tiếng Việt tự nhiên, chuẩn xác",
    "vocabularies": [
      { "word": "Từ vựng có trong câu", "reading": "cách đọc Hiragana", "meaning": "nghĩa tiếng Việt" }
    ],
    "grammars": [
      { "grammar": "Cấu trúc ngữ pháp trọng tâm", "meaning": "ý nghĩa / cách dùng của ngữ pháp" }
    ],
    "note": "Ghi chú thêm về sắc thái, hoàn cảnh giao tiếp (nếu có)"
  }
]

Ví dụ mẫu:
[
  {
    "japanese": "先生のおかげで、合格できた。",
    "meaning": "Nhờ có thầy giáo mà tôi đã đỗ.",
    "vocabularies": [
      { "word": "先生", "reading": "せんせい", "meaning": "giáo viên, thầy giáo" },
      { "word": "合格", "reading": "ごうかく", "meaning": "đỗ, trúng tuyển" }
    ],
    "grammars": [
      { "grammar": "おかげで", "meaning": "nhờ có, nhờ vào (kết quả tích cực)" }
    ],
    "note": "Dùng trong giao tiếp lịch sự, thể hiện lòng biết ơn chân thành"
  }
]`
  },

  grammar_import_template: {
    id: "grammar_import_template",
    title: "Mẫu Copy Prompt: Trích xuất & Import Ngữ pháp",
    description: "Mẫu prompt chuẩn hóa tài liệu hoặc danh sách ngữ pháp thô thành mảng JSON để import vào KotoBase.",
    category: "grammar",
    categoryLabel: "Ngữ pháp",
    variables: [],
    defaultContent: `Bạn là biên tập viên ngữ pháp tiếng Nhật cho KotoBase. Tôi sẽ gửi danh sách ngữ pháp thô sau prompt này. Hãy chuẩn hóa thành một mảng JSON hợp lệ để dán trực tiếp vào chức năng Import JSON.

Quy tắc:
- Mỗi mục ngữ pháp đầu vào thành đúng một object. Giữ thứ tự nguồn; không tự thêm, bỏ, gộp hoặc suy đoán cấu trúc không có trong nguồn.
- Dùng đúng các khóa: number (số thứ tự, tùy chọn), title (tùy chọn), structure (bắt buộc, tiếng Nhật), formation (cách kết hợp, tùy chọn), meaning (bắt buộc, tiếng Việt), nuance (sắc thái/lưu ý, tùy chọn), example (câu ví dụ tiếng Nhật, tùy chọn), exampleMeaning (dịch câu ví dụ, tùy chọn), jlptLevel (N5/N4/N3/N2/N1 nếu nguồn nêu rõ), usageContext (chuỗi phân cách dấu phẩy, tùy chọn), tags (mảng chuỗi, tùy chọn). Có thể thêm examples là mảng {"jpn":"...","vie":"..."}. Nếu một cấu trúc có nhiều cách dùng, thêm blocks là mảng {"blockNumber":1,"heading":"...","formation":"...","meaning":"...","nuance":"...","examples":[{"jpn":"...","vie":"..."}]}; meaning cấp trên là tóm tắt tất cả cách dùng.
- Nếu nguồn có Unit/Bài/Chương thì gán tags tương ứng, ví dụ ["Unit 1"]. Giữ tag nhất quán; không dùng tags để thay thế structure hoặc folder. Người dùng chọn thư mục đích trên web.
- Chỉ dịch/giải thích khi có đủ ngữ cảnh. Phần nào không chắc thì để chuỗi rỗng hoặc bỏ khóa tùy chọn; không bịa ví dụ hay cách đọc. Không chèn furigana vào trường structure/example.
- Chuẩn hóa xuống dòng bằng \\n trong chuỗi JSON. Escape dấu ngoặc kép đúng chuẩn. Không đưa HTML, Markdown hoặc lời giải thích ngoài JSON.
- Chỉ trả về mảng JSON, không bọc trong code fence. Ví dụ định dạng:
[{"number":1,"structure":"〜によって","formation":"N + によって","meaning":"Do/vì…","nuance":"Dùng trong văn viết.","example":"天候によって予定が変わります。","exampleMeaning":"Lịch trình thay đổi tùy thời tiết.","jlptLevel":"N3","usageContext":"writing","tags":["Unit 1"]}]

Danh sách ngữ pháp thô:`,
    content: `Bạn là biên tập viên ngữ pháp tiếng Nhật cho KotoBase. Tôi sẽ gửi danh sách ngữ pháp thô sau prompt này. Hãy chuẩn hóa thành một mảng JSON hợp lệ để dán trực tiếp vào chức năng Import JSON.

Quy tắc:
- Mỗi mục ngữ pháp đầu vào thành đúng một object. Giữ thứ tự nguồn; không tự thêm, bỏ, gộp hoặc suy đoán cấu trúc không có trong nguồn.
- Dùng đúng các khóa: number (số thứ tự, tùy chọn), title (tùy chọn), structure (bắt buộc, tiếng Nhật), formation (cách kết hợp, tùy chọn), meaning (bắt buộc, tiếng Việt), nuance (sắc thái/lưu ý, tùy chọn), example (câu ví dụ tiếng Nhật, tùy chọn), exampleMeaning (dịch câu ví dụ, tùy chọn), jlptLevel (N5/N4/N3/N2/N1 nếu nguồn nêu rõ), usageContext (chuỗi phân cách dấu phẩy, tùy chọn), tags (mảng chuỗi, tùy chọn). Có thể thêm examples là mảng {"jpn":"...","vie":"..."}. Nếu một cấu trúc có nhiều cách dùng, thêm blocks là mảng {"blockNumber":1,"heading":"...","formation":"...","meaning":"...","nuance":"...","examples":[{"jpn":"...","vie":"..."}]}; meaning cấp trên là tóm tắt tất cả cách dùng.
- Nếu nguồn có Unit/Bài/Chương thì gán tags tương ứng, ví dụ ["Unit 1"]. Giữ tag nhất quán; không dùng tags để thay thế structure hoặc folder. Người dùng chọn thư mục đích trên web.
- Chỉ dịch/giải thích khi có đủ ngữ cảnh. Phần nào không chắc thì để chuỗi rỗng hoặc bỏ khóa tùy chọn; không bịa ví dụ hay cách đọc. Không chèn furigana vào trường structure/example.
- Chuẩn hóa xuống dòng bằng \\n trong chuỗi JSON. Escape dấu ngoặc kép đúng chuẩn. Không đưa HTML, Markdown hoặc lời giải thích ngoài JSON.
- Chỉ trả về mảng JSON, không bọc trong code fence. Ví dụ định dạng:
[{"number":1,"structure":"〜によって","formation":"N + によって","meaning":"Do/vì…","nuance":"Dùng trong văn viết.","example":"天候によって予定が変わります。","exampleMeaning":"Lịch trình thay đổi tùy thời tiết.","jlptLevel":"N3","usageContext":"writing","tags":["Unit 1"]}]

Danh sách ngữ pháp thô:`
  }
};
