import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim();

  if (!keyword) {
    return NextResponse.json({ data: [] });
  }

  try {
    const jishoUrl = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`;
    
    const response = await fetch(jishoUrl, {
      headers: {
        "User-Agent": "Kotobase/1.0 (Japanese Learning Assistant)",
        "Accept": "application/json",
      },
      next: { revalidate: 3600 } // Cache kết quả trong 1 giờ để tối ưu tốc độ và không spam Jisho
    });

    if (!response.ok) {
      return NextResponse.json({ data: [], error: `Jisho API returned status ${response.status}` });
    }

    const data = await response.json();
    return NextResponse.json({ data: data.data || [] });
  } catch (error: any) {
    console.error("Lỗi kết nối Jisho API:", error);
    return NextResponse.json({ data: [], error: error.message || "Không thể kết nối đến Jisho" });
  }
}
