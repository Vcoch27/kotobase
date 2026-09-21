import { NextResponse } from "next/server";
import { getCachedAllKanjiNotes } from "@/lib/cache";

/**
 * GET /api/kanji/notes-map
 * Trả về toàn bộ Map {character -> {hanviet, meaning, mnemonic}} đã lưu trong Firestore.
 * Dùng bộ nhớ đệm RAM phía server, tiêu tốn 0 lượt đọc Firebase sau lần đầu tiên.
 * Client (FlashcardView) gọi endpoint này để tải dữ liệu mẹo nhớ.
 */
export async function GET() {
  try {
    const map = await getCachedAllKanjiNotes();
    return NextResponse.json(map, {
      headers: {
        // Client cache 5 phút, stale-while-revalidate 10 phút
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error: any) {
    console.error("Lỗi GET /api/kanji/notes-map:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
