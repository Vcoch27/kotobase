"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export async function getKanjiNote(character: string): Promise<{ id: string; mnemonic?: string; meaning?: string; character: string } | null> {
  if (!character) return null;
  try {
    const docRef = await adminDb.collection("kanji_notes").doc(character).get();
    if (!docRef.exists) {
      return null;
    }
    const data = docRef.data() as { mnemonic?: string; meaning?: string; character: string };
    return {
      id: docRef.id,
      ...data
    };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin Hán tự:", error);
    return null;
  }
}

export async function upsertKanjiNote(
  character: string,
  data: {
    meaning?: string;
    mnemonic?: string;
  }
) {
  if (!character) throw new Error("Ký tự Hán tự không được để trống.");

  try {
    const docRef = adminDb.collection("kanji_notes").doc(character);
    
    await docRef.set({
      character,
      meaning: data.meaning || null,
      mnemonic: data.mnemonic || null,
      updatedAt: new Date().toISOString()
    }, { merge: true }); // Merge true is equivalent to Upsert in Firestore

    revalidatePath("/");
    return { success: true, data: { character, ...data } };
  } catch (error) {
    console.error("Lỗi khi lưu Hán tự:", error);
    return { success: false, error: "Không thể lưu ghi chú Hán tự." };
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
  try {
    const snapshot = await adminDb.collection("kanji_notes").get();
    const notes: any[] = [];
    snapshot.docs.forEach((doc) => {
      notes.push({ id: doc.id, ...doc.data() });
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
