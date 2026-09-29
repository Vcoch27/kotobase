"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCachedAllKanjiNotes, clearKanjiNotesMemoryCache, type CachedKanjiNote } from "@/lib/cache";

export async function getKanjiNote(character: string): Promise<{ id: string; hanviet?: string; mnemonic?: string; meaning?: string; character: string } | null> {
  if (!character) return null;
  const trimmed = character.trim();
  try {
    const note = (await getCachedAllKanjiNotes())[trimmed];
    return note ? { id: trimmed, ...note } : null;
  } catch (error) {
    console.error("Lỗi khi lấy thông tin Hán tự:", error);
    return null;
  }
}

export async function upsertKanjiNote(
  character: string,
  data: {
    hanviet?: string;
    meaning?: string;
    mnemonic?: string;
  }
): Promise<{ success: true; data: { character: string; hanviet?: string; meaning?: string; mnemonic?: string } } | { success: false; error: string }> {
  if (!character || !character.trim()) {
    return { success: false, error: "Ký tự Hán tự không được để trống." };
  }

  const trimmed = character.trim();

  try {
    // Tìm xem đã có bản ghi nào của character này chưa
    const snapshot = await adminDb.collection("kanji_notes")
      .where("character", "==", trimmed)
      .limit(1)
      .get();

    let docRef;
    let existingData: any = {};

    if (!snapshot.empty) {
      docRef = snapshot.docs[0].ref;
      existingData = snapshot.docs[0].data();
    } else {
      docRef = adminDb.collection("kanji_notes").doc(trimmed);
      const directDoc = await docRef.get();
      if (directDoc.exists) {
        existingData = directDoc.data();
      }
    }

    const payload: any = {
      character: trimmed,
      hanviet: data.hanviet !== undefined ? (data.hanviet?.trim() || null) : (existingData.hanviet || null),
      meaning: data.meaning !== undefined ? (data.meaning?.trim() || null) : (existingData.meaning || null),
      mnemonic: data.mnemonic !== undefined ? (data.mnemonic?.trim() || null) : (existingData.mnemonic || null),
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(payload, { merge: true });

    clearKanjiNotesMemoryCache();
    try {
      revalidateTag("kanji_notes");
    } catch {}
    revalidatePath("/");
    revalidatePath("/kanji");
    return {
      success: true,
      data: {
        character: trimmed,
        hanviet: payload.hanviet || "",
        meaning: payload.meaning || "",
        mnemonic: payload.mnemonic || "",
      }
    };
  } catch (error: any) {
    console.error("Lỗi khi lưu Hán tự:", error);
    return { success: false, error: error.message || "Không thể lưu ghi chú Hán tự." };
  }
}

/**
 * Lấy toàn bộ ghi chú qua Data Cache; Firestore chỉ được đọc khi cache cần làm mới.
 */
export async function getAllKanjiNotesMap(): Promise<Record<string, CachedKanjiNote>> {
  try {
    return await getCachedAllKanjiNotes();
  } catch (error) {
    console.error("Lỗi getAllKanjiNotesMap:", error);
    return {};
  }
}

export async function getBulkKanjiNotes(characters: string[]) {
  if (!characters.length) return [];
  try {
    const notes = await getCachedAllKanjiNotes();
    return Array.from(new Set(characters.map((char) => char.trim())))
      .filter((char) => !!notes[char])
      .map((char) => ({ id: char, ...notes[char] }));
  } catch (error) {
    console.error("Lỗi khi lấy danh sách Hán tự:", error);
    return [];
  }
}

export async function fetchAllKanjiNotes() {
  // Data Cache dùng chung giữa các request; lỗi đọc được báo cho trang để dùng bản lưu cục bộ.
  try {
    const notesMap = await getCachedAllKanjiNotes();
    const notes = Object.values(notesMap).map((note: CachedKanjiNote) => ({
      id: note.character, // Dùng character làm ID (khớp với doc ID trong Firestore)
      character: note.character,
      hanviet: note.hanviet || "",
      meaning: note.meaning || "",
      mnemonic: note.mnemonic || "",
      updatedAt: note.updatedAt || new Date().toISOString(),
    }));
    // Sắp xếp theo thời gian cập nhật mới nhất
    notes.sort((a, b) => {
      const dateA = new Date(a.updatedAt || 0).getTime();
      const dateB = new Date(b.updatedAt || 0).getTime();
      return dateB - dateA;
    });
    return notes;
  } catch (error) {
    console.error("Lỗi khi lấy toàn bộ Hán tự:", error);
    throw error;
  }
}
