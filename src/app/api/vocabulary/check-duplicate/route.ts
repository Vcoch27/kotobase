import { adminDb } from "@/lib/firebase-admin";
import { extractKanji } from "@/lib/kanji-parser";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get("word")?.trim();

  if (!word) {
    return NextResponse.json({ exists: false });
  }

  try {
    // 1. Kiểm tra từ chính xác
    const vocabSnapshot = await adminDb.collection("vocabularies")
      .where("word", "==", word)
      .limit(1)
      .get();
      
    let existingVocab = null;
    if (!vocabSnapshot.empty) {
      existingVocab = {
        id: vocabSnapshot.docs[0].id,
        ...vocabSnapshot.docs[0].data()
      };
    }

    // 2. Bóc tách các Kanji trong chuỗi gõ vào và lấy các KanjiNote đã tồn tại
    const kanjiChars = extractKanji(word);
    let existingKanjiNotes: any[] = [];

    if (kanjiChars.length > 0) {
      // Chunking for "in" query limits (max 10)
      const chunkSize = 10;
      for (let i = 0; i < kanjiChars.length; i += chunkSize) {
        const chunk = kanjiChars.slice(i, i + chunkSize);
        const knSnapshot = await adminDb.collection("kanji_notes")
          .where("character", "in", chunk)
          .get();
          
        knSnapshot.docs.forEach(doc => {
          existingKanjiNotes.push({ id: doc.id, ...doc.data() });
        });
      }
    }

    return NextResponse.json({
      exists: !!existingVocab,
      duplicateVocab: existingVocab || null,
      kanjiNotes: existingKanjiNotes,
    });
  } catch (error) {
    console.error("Lỗi khi check trùng từ vựng:", error);
    return NextResponse.json({ exists: false, error: "Database error" }, { status: 500 });
  }
}
