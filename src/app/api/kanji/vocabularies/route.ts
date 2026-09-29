import { NextRequest, NextResponse } from "next/server";
import { getCachedVocabsByKanji } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/kanji/vocabularies?kanji=津
 * Tìm tất cả các từ vựng trong CSDL chứa Hán tự này.
 * Dùng chỉ mục kanjiCharacters và Data Cache; chỉ đọc các từ thực sự khớp.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kanji = (searchParams.get("kanji") || "").trim();

    if (!kanji) {
      return NextResponse.json({ success: true, count: 0, data: [] });
    }

    const matches = await getCachedVocabsByKanji(kanji);

    // Sắp xếp từ vựng mới nhất lên đầu
    matches.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json(
      {
        success: true,
        kanji,
        count: matches.length,
        data: matches,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300",
        },
      }
    );
  } catch (error: any) {
    console.error("Lỗi khi tìm từ vựng theo Kanji qua API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi máy chủ", data: [] },
      { status: 500 }
    );
  }
}
