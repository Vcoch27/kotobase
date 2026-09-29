import { NextResponse } from "next/server";
import { getCachedAllKanjiNotes } from "@/lib/cache";

/**
 * GET /api/kanji/notes-map
 * Trả về toàn bộ Map {character -> {hanviet, meaning, mnemonic}} đã lưu trong Firestore.
 * Dùng Data Cache phía server để tránh quét Firestore trên mỗi lần mở trang.
 * Client (FlashcardView) gọi endpoint này để tải dữ liệu mẹo nhớ.
 */
export async function GET() {
  try {
    const map = await getCachedAllKanjiNotes();
    return NextResponse.json(map, {
      headers: {
        // Client keeps its own local copy; the server uses Next's Data Cache.
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Lỗi GET /api/kanji/notes-map:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
