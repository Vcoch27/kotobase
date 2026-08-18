"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

export async function getKanjiNote(character: string): Promise<{ id: string; hanviet?: string; mnemonic?: string; meaning?: string; character: string } | null> {
  noStore();
  if (!character) return null;
  const trimmed = character.trim();
  try {
    // 1. Thử tìm trực tiếp theo Doc ID = character
    const docRef = await adminDb.collection("kanji_notes").doc(trimmed).get();
    if (docRef.exists) {
      const data = docRef.data() as any;
      return {
        id: docRef.id,
        character: data.character || trimmed,
        hanviet: data.hanviet || "",
        meaning: data.meaning || "",
        mnemonic: data.mnemonic || "",
      };
    }

    // 2. Fallback: Tìm theo field character
    const snapshot = await adminDb.collection("kanji_notes")
      .where("character", "==", trimmed)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data() as any;
      return {
        id: doc.id,
        character: data.character || trimmed,
        hanviet: data.hanviet || "",
        meaning: data.meaning || "",
        mnemonic: data.mnemonic || "",
      };
    }

    return null;
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

export async function getBulkKanjiNotes(characters: string[]) {
  if (!characters.length) return [];
  try {
    // Firestore 'in' query has a limit of 10 items.
    // If characters list is large, we need to chunk it.
    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < characters.length; i += chunkSize) {
      chunks.push(characters.slice(i, i + chunkSize));
    }

    const allNotes: any[] = [];
    
    for (const chunk of chunks) {
      const snapshot = await adminDb.collection("kanji_notes")
        .where("character", "in", chunk)
        .get();
        
      snapshot.docs.forEach(doc => {
        allNotes.push({ id: doc.id, ...doc.data() });
      });
    }
    
    return allNotes;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách Hán tự:", error);
    return [];
  }
}

export async function getAllKanjiNotes() {
  noStore();
  try {
    const snapshot = await adminDb.collection("kanji_notes").get();
    const notes: any[] = [];
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as any;
      notes.push({ 
        id: doc.id, 
        character: data.character || "",
        hanviet: data.hanviet || "",
        meaning: data.meaning || "",
        mnemonic: data.mnemonic || "",
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : (data.updatedAt?.toDate?.().toISOString() || new Date().toISOString())
      });
    });
    // Sort by updated time desc (optional)
    notes.sort((a, b) => {
      const dateA = new Date(a.updatedAt || 0).getTime();
      const dateB = new Date(b.updatedAt || 0).getTime();
      return dateB - dateA;
    });
    return notes;
  } catch (error) {
    console.error("Lỗi khi lấy toàn bộ Hán tự:", error);
    return [];
  }
}
