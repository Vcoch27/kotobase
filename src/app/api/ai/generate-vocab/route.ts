import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Timeout 60s cho AI response

interface GeneratedVocabItem {
  word: string;
  meaning: string;
  reading?: string;
  sinoVietnamese?: string;
  example?: string;
  exampleMeaning?: string;
}

// System prompt hướng dẫn AI tạo đúng định dạng JSON
const SYSTEM_PROMPT = `Bạn là một chuyên gia ngôn ngữ tiếng Nhật và dịch thuật Nhật - Việt cao cấp.
Nhiệm vụ của bạn là nhận yêu cầu/danh sách từ vựng/đoạn văn từ người dùng và trả về danh sách từ vựng tiếng Nhật ở định dạng JSON thuần túy (Mảng các Object).

Mỗi phần tử trong mảng JSON PHẢI có cấu trúc chuẩn như sau:
[
  {
    "word": "từ vựng Kanji hoặc Kana (bắt buộc, ví dụ: 食べる hoặc 約束)",
    "meaning": "nghĩa tiếng Việt súc tích, chuẩn ngữ cảnh (bắt buộc, ví dụ: ăn hoặc lời hứa)",
    "reading": "cách đọc Hiragana chuẩn (ví dụ: たべる hoặc やくそく)",
    "sinoVietnamese": "âm Hán Việt viết HOA nếu từ có chữ Hán (ví dụ: THỰC hoặc ƯỚC THÚC, nếu là từ thuần Kana để trống)",
    "example": "câu ví dụ tiếng Nhật tự nhiên (ví dụ: 友達と映画を見る約束をした。)",
    "exampleMeaning": "nghĩa tiếng Việt của câu ví dụ (ví dụ: Tôi đã hẹn xem phim với bạn.)"
  }
]

QUY TẮC BẮT BUỘC:
1. CHỈ TRẢ VỀ DUY NHẤT MẢNG JSON HỢP LỆ.
2. TUYỆT ĐỐI KHÔNG VIẾT BẤT KỲ LỜI MỞ ĐẦU, LỜI KẾT, HAY GIẢI THÍCH NÀO NGOÀI JSON.
3. Không đặt dấu phẩy thừa ở phần tử cuối cùng.`;

// Hàm trích xuất mảng JSON an toàn từ phản hồi của AI
function extractJsonArray(rawText: string): GeneratedVocabItem[] {
  let cleaned = rawText.trim();

  // Bỏ markdown block nếu có ```json ... ``` hoặc ``` ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  // Tìm vị trí mở [ và đóng ] đầu/cuối cùng
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("Phản hồi từ AI không phải là danh sách mảng từ vựng.");
  }

  return parsed.map((item: any) => ({
    word: String(item.word || "").trim(),
    meaning: String(item.meaning || "").trim(),
    reading: String(item.reading || "").trim(),
    sinoVietnamese: String(item.sinoVietnamese || "").trim(),
    example: item.example ? String(item.example).trim() : "",
    exampleMeaning: item.exampleMeaning ? String(item.exampleMeaning).trim() : "",
  })).filter((v: GeneratedVocabItem) => v.word && v.meaning);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt?.trim();
    const count = body.count ? parseInt(body.count, 10) : undefined;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Vui lòng cung cấp yêu cầu hoặc danh sách từ vựng." },
        { status: 400 }
      );
    }

    let userInstruction = `Hãy tạo danh sách từ vựng tiếng Nhật dựa trên yêu cầu sau:\n"${prompt}"`;
    if (count && count > 0) {
      userInstruction += `\nSố lượng từ vựng cần tạo: khoảng ${count} từ.`;
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userInstruction },
    ];

    let aiContent = "";
    let lastError: any = null;

    // -------------------------------------------------------------
    // Provider 0: Local chatgpt2api (C:\mydata\DevTools\chatgpt2api)
    // -------------------------------------------------------------
    const localChatGptUrl = process.env.CHATGPT2API_URL || "http://127.0.0.1:8001/v1/chat/completions";
    const localChatGptKey = process.env.CHATGPT2API_KEY || "16022005";
    try {
      const res = await fetch(localChatGptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localChatGptKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(15000), // timeout 15s nếu local server chưa bật
      });

      if (res.ok) {
        const data = await res.json();
        aiContent = data.choices?.[0]?.message?.content || "";
        console.log("-> Đã tạo từ vựng thành công qua chatgpt2api local!");
      }
    } catch (e: any) {
      // Nếu chatgpt2api chưa chạy thì tự động fallback sang Provider Online
      console.log("chatgpt2api local không khả dụng, chuyển sang Free AI Gateway.");
    }

    // -------------------------------------------------------------
    // Provider 1: Pollinations OpenAI-compatible Free Gateway (GPT-4o / Qwen)
    // -------------------------------------------------------------
    if (!aiContent) {
      try {
        const res = await fetch("https://text.pollinations.ai/openai/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai",
            messages,
            temperature: 0.3,
            response_format: { type: "json_object" },
            seed: Math.floor(Math.random() * 100000),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          aiContent = data.choices?.[0]?.message?.content || "";
        } else {
          throw new Error(`Pollinations OpenAI gateway returned HTTP ${res.status}`);
        }
      } catch (e: any) {
        console.warn("Provider 1 lỗi, thử Provider 2 Fallback:", e.message);
        lastError = e;
      }
    }

    // -------------------------------------------------------------
    // Provider 2 Fallback: Direct Raw Pollinations Text Engine
    // -------------------------------------------------------------
    if (!aiContent) {
      try {
        const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: ${userInstruction}\n\nJSON Output:`;
        const res = await fetch("https://text.pollinations.ai/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: fullPrompt }],
            model: "openai",
            jsonMode: true,
          }),
        });

        if (res.ok) {
          aiContent = await res.text();
        } else {
          throw new Error(`Pollinations raw gateway returned HTTP ${res.status}`);
        }
      } catch (e: any) {
        console.warn("Provider 2 lỗi, thử Provider 3 Fallback:", e.message);
        lastError = e;
      }
    }

    // -------------------------------------------------------------
    // Provider 3 Fallback: Gemini API (nếu có key trong env)
    // -------------------------------------------------------------
    if (!aiContent && process.env.GEMINI_API_KEY) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${userInstruction}` }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        });

        if (res.ok) {
          const gData = await res.json();
          aiContent = gData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      } catch (e: any) {
        console.warn("Provider 3 Gemini lỗi:", e.message);
        lastError = e;
      }
    }

    if (!aiContent) {
      throw lastError || new Error("Không thể kết nối đến máy chủ AI.");
    }

    // Trích xuất JSON mảng từ vựng
    const vocabularies = extractJsonArray(aiContent);

    if (vocabularies.length === 0) {
      return NextResponse.json(
        { success: false, error: "AI không tạo được từ vựng nào hợp lệ. Vui lòng thử lại với câu lệnh rõ ràng hơn." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: vocabularies,
      count: vocabularies.length,
    });
  } catch (error: any) {
    console.error("Lỗi tạo từ vựng bằng AI:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Đã xảy ra lỗi khi tạo từ vựng bằng AI." },
      { status: 500 }
    );
  }
}
