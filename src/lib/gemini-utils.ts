"use client";

export interface GeminiSettings {
  apiKey: string;
  model: string;
}

export interface GeminiModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
  badgeColor?: string;
}

export const AVAILABLE_GEMINI_MODELS: GeminiModelOption[] = [
  { 
    id: "gemini-3.6-flash", 
    name: "Gemini 3.6 Flash", 
    description: "Thế hệ mới nhất của Google, siêu thông minh và trích xuất cực kỳ chuẩn xác", 
    badge: "Mới nhất (Khuyên dùng)",
    badgeColor: "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
  },
  { 
    id: "gemini-3.5-flash", 
    name: "Gemini 3.5 Flash", 
    description: "Thế hệ 3.5 Flash tốc độ cao, phân tích từ vựng mượt mà", 
    badge: "3.5 Flash",
    badgeColor: "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300"
  },
  { 
    id: "gemini-3.5-flash-lite", 
    name: "Gemini 3.5 Flash Lite", 
    description: "Hạn mức gọi cao (10 RPM), tối ưu hóa quota hàng ngày", 
    badge: "Nhiều Quota",
    badgeColor: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
  },
  { 
    id: "gemini-1.5-flash", 
    name: "Gemini 1.5 Flash", 
    description: "Bản Flash tiêu chuẩn cực kỳ ổn định", 
    badge: "Phổ biến",
    badgeColor: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
  },
  { 
    id: "gemini-1.5-flash-8b", 
    name: "Gemini 1.5 Flash 8B", 
    description: "Mô hình 8 tỷ tham số siêu tiết kiệm tài nguyên",
    badge: "Siêu nhẹ",
    badgeColor: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
  },
  { 
    id: "gemini-1.5-pro", 
    name: "Gemini 1.5 Pro", 
    description: "Mô hình suy luận sâu nhất cho tài liệu phức tạp" 
  },
];

export const DEFAULT_GEMINI_SETTINGS: GeminiSettings = {
  apiKey: "",
  model: "gemini-3.6-flash",
};

const STORAGE_KEY = "kotobase_gemini_settings";

export function loadGeminiSettings(): GeminiSettings {
  if (typeof window === "undefined") return DEFAULT_GEMINI_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_GEMINI_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error("Lỗi khi load Gemini settings:", e);
  }
  return DEFAULT_GEMINI_SETTINGS;
}

export function saveGeminiSettings(settings: GeminiSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Lỗi khi lưu Gemini settings:", e);
  }
}

export interface ParsedVocabAI {
  word: string;
  meaning: string;
  reading?: string | null;
  sinoVietnamese?: string | null;
  example?: string | null;
  note?: string | null;
}

/**
 * Gọi Gemini API trích xuất danh sách từ vựng có cấu trúc từ văn bản thô
 */
export async function generateVocabulariesFromRawText(
  rawText: string,
  apiKey: string,
  model = "gemini-3.6-flash"
): Promise<{ success: boolean; data?: ParsedVocabAI[]; error?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: "Chưa cấu hình Gemini API Key. Vui lòng vào Cài đặt Gemini AI để thêm API Key." };
  }

  if (!rawText || !rawText.trim()) {
    return { success: false, error: "Vui lòng nhập văn bản hoặc danh sách từ vựng cần xử lý." };
  }

  const modelId = model.trim() || "gemini-3.6-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey.trim()}`;

  const prompt = `Bạn là một chuyên gia ngôn ngữ tiếng Nhật và từ điển học. 
Nhiệm vụ của bạn là phân tích văn bản/danh sách từ vựng thô dưới đây và trích xuất thành danh sách các từ vựng tiếng Nhật chuẩn xác.

Yêu cầu cho từng từ vựng:
- word (bắt buộc): Từ vựng tiếng Nhật viết bằng chữ Hán (Kanji) hoặc Kana chuẩn (ví dụ: "逃げる", "しっかり").
- meaning (bắt buộc): Nghĩa tiếng Việt chính xác, súc tích (ví dụ: "chạy trốn, tẩu thoát").
- reading: Cách đọc viết hoàn toàn bằng Hiragana hoặc Katakana (ví dụ: "にげる").
- sinoVietnamese: Âm Hán Việt in hoa (ví dụ nếu từ có chữ Hán như 逃げる -> "ĐÀO", 将来的 -> "TƯƠNG LAI ĐÍCH", nếu không có chữ Hán thì để null).
- example: Một câu ví dụ tiếng Nhật ngắn gọn, thực tế kèm dịch nghĩa tiếng Việt trong ngoặc đơn (ví dụ: "犯人は海外に逃げた。(Thủ phạm đã trốn ra nước ngoài.)").

Văn bản đầu vào từ người dùng:
"""
${rawText}
"""`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: "application/json",
      response_schema: {
        type: "ARRAY",
        description: "Danh sách từ vựng tiếng Nhật đã phân tích",
        items: {
          type: "OBJECT",
          properties: {
            word: { type: "STRING", description: "Từ vựng tiếng Nhật" },
            meaning: { type: "STRING", description: "Nghĩa tiếng Việt" },
            reading: { type: "STRING", description: "Cách đọc Hiragana/Katakana" },
            sinoVietnamese: { type: "STRING", description: "Âm Hán Việt in hoa" },
            example: { type: "STRING", description: "Ví dụ tiếng Nhật kèm nghĩa tiếng Việt" }
          },
          required: ["word", "meaning"]
        }
      }
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMessage = errData.error?.message || response.statusText;
      
      if (response.status === 400 && errMessage.includes("API key not valid")) {
        return { success: false, error: "Gemini API Key không hợp lệ! Vui lòng kiểm tra lại trong Cài đặt." };
      }
      if (response.status === 429) {
        return { 
          success: false, 
          error: `Model "${modelId}" đã chạm hạn mức (Rate Limit) của Google! Hãy đổi nhanh sang model khác (như gemini-3.5-flash-lite, gemini-1.5-flash, gemini-1.5-flash-8b) để tiếp tục.` 
        };
      }
      return { success: false, error: `Lỗi Gemini API (${response.status}): ${errMessage}` };
    }

    const resData = await response.json();
    const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResult) {
      return { success: false, error: "Gemini không trả về nội dung hợp lệ." };
    }

    const parsed: ParsedVocabAI[] = JSON.parse(textResult);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { success: false, error: "Không thể trích xuất từ vựng nào từ văn bản đã nhập." };
    }

    return { success: true, data: parsed };
  } catch (error: any) {
    console.error("Lỗi khi gọi Gemini API:", error);
    return { success: false, error: error.message || "Lỗi kết nối tới máy chủ Gemini AI." };
  }
}
