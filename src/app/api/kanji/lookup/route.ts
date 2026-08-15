import { NextRequest, NextResponse } from "next/server";
import { extractKanji } from "@/lib/kanji-parser";

export interface KanjiDetail {
  kanji: string;
  hanviet?: string;
  mean?: string;
  meanings: string[];
  kun_readings: string[];
  on_readings: string[];
  stroke_count?: number;
  jlpt?: string | number;
  detail?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ data: [] });
  }

  try {
    // 1. Ưu tiên tra cứu từ điển Hán Việt (Mazii / KanjiVN) để có Âm Hán Việt & Nghĩa tiếng Việt chuẩn
    try {
      const maziiRes = await fetch("https://mazii.net/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        body: JSON.stringify({
          dict: "javi",
          type: "kanji",
          query: query,
          page: 1,
          limit: 10
        }),
        next: { revalidate: 86400 } // Cache 24h
      });

      if (maziiRes.ok) {
        const maziiData = await maziiRes.json();
        if (maziiData.results && Array.isArray(maziiData.results) && maziiData.results.length > 0) {
          const formatted: KanjiDetail[] = maziiData.results.map((item: any) => {
            const onList = item.on 
              ? item.on.split(/[\s,、]+/).map((s: string) => s.trim()).filter(Boolean) 
              : [];
            const kunList = item.kun 
              ? item.kun.split(/[\s,、]+/).map((s: string) => s.trim()).filter(Boolean) 
              : [];

            let rawHanviet = (item.hanviet || "").trim();
            let rawMean = (item.mean || "").trim();
            let rawDetail = (item.detail || "").trim();

            let hanviet = "";
            let mean = "";

            // 1. Phân định Âm Hán Việt:
            if (rawHanviet) {
              hanviet = rawHanviet.toUpperCase();
            } else if (rawMean && rawMean.length <= 25 && !rawMean.includes("\n")) {
              // Trong Mazii, trường 'mean' của Kanji chính là Âm Hán Việt in hoa (VD: "CHIẾU", "TÁ", "Ý")
              hanviet = rawMean.toUpperCase();
            }

            // 2. Phân định Nghĩa tiếng Việt từ trường detail hoặc mean
            if (rawDetail) {
              const cleanLines = rawDetail
                .split(/[\r\n]+/)
                .map((line: string) => {
                  return line
                    // Bỏ số thứ tự đầu dòng
                    .replace(/^[\s#*①②③④⑤⑥⑦⑧⑨⑩\d.-]+/, "")
                    // Bỏ toàn bộ phần VD / Ví dụ / ví dụ cùng các từ ghép ví dụ phía sau
                    .replace(/[,;]?\s*(VD|Vd|vd|Ví dụ|Ví Dụ|ví dụ)\s*[:：].*$/i, "")
                    // Bỏ các từ tiếng Nhật trong ngoặc ví dụ nếu có
                    .replace(/[\(（][^\)）]*[\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]+[^\)）]*[\)）]/g, "")
                    // Chuẩn hóa dấu phân cách cuối dòng
                    .replace(/[;,.\s]+$/, "")
                    .trim();
                })
                .filter((line: string) => line.length > 0 && !line.startsWith("Bộ:") && !line.startsWith("Nét:"));
              
              if (cleanLines.length > 0) {
                // Gom tối đa 3 nét nghĩa chính, phân tách bằng dấu phẩy
                mean = cleanLines.slice(0, 3).join(", ");
              }
            }

            if (!mean) {
              if (rawMean && rawMean.toUpperCase() !== hanviet) {
                mean = rawMean.replace(/[,;]?\s*(VD|Vd|vd|Ví dụ|Ví Dụ|ví dụ)\s*[:：].*$/i, "").trim();
              } else {
                mean = hanviet ? `Nghĩa Hán tự: ${hanviet.toLowerCase()}` : "";
              }
            }

            const meaningsList = mean ? mean.split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean) : [];

            let jlptLevel = item.level;
            if (jlptLevel && typeof jlptLevel === "string") {
              jlptLevel = jlptLevel.replace(/^N/i, "");
            }

            return {
              kanji: item.kanji,
              hanviet: hanviet,
              mean: mean,
              meanings: meaningsList,
              kun_readings: kunList,
              on_readings: onList,
              stroke_count: item.stroke_count ? parseInt(item.stroke_count) : undefined,
              jlpt: jlptLevel || undefined,
              detail: rawDetail,
            };
          });

          return NextResponse.json({ data: formatted });
        }
      }
    } catch (err) {
      console.log("Mazii API không phản hồi, chuyển sang fallback KanjiAPI:", err);
    }

    // 2. Fallback sang KanjiAPI nếu không tìm thấy trên Mazii
    let kanjiList: string[] = [];
    const extracted = extractKanji(query);
    if (extracted.length > 0) {
      kanjiList = extracted;
    } else {
      const jishoRes = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(query)}`);
      if (jishoRes.ok) {
        const jishoData = await jishoRes.json();
        const foundKanji = new Set<string>();
        (jishoData.data || []).slice(0, 5).forEach((item: any) => {
          (item.japanese || []).forEach((j: any) => {
            if (j.word) {
              extractKanji(j.word).forEach(k => foundKanji.add(k));
            }
          });
        });
        kanjiList = Array.from(foundKanji);
      }
    }

    if (kanjiList.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const targetKanji = kanjiList.slice(0, 10);
    const details = await Promise.all(
      targetKanji.map(async (char) => {
        try {
          const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(char)}`, {
            next: { revalidate: 86400 }
          });
          if (res.ok) {
            const json = await res.json();
            return {
              kanji: json.kanji,
              hanviet: (json.heisig_en || "").toUpperCase(),
              mean: (json.meanings || []).join(", "),
              meanings: json.meanings || [],
              kun_readings: json.kun_readings || [],
              on_readings: json.on_readings || [],
              stroke_count: json.stroke_count,
              jlpt: json.jlpt,
            } as KanjiDetail;
          }
        } catch (e) {
          console.error(`Lỗi fetch kanji ${char}:`, e);
        }
        return null;
      })
    );

    const validDetails = details.filter(Boolean);
    return NextResponse.json({ data: validDetails });
  } catch (error: any) {
    console.error("Lỗi khi tra cứu Kanji:", error);
    return NextResponse.json({ data: [], error: error.message });
  }
}
