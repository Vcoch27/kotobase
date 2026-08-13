"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export interface CreateVocabInput {
  word: string;
  meaning: string;
  reading?: string;
  sinoVietnamese?: string;
  example?: string;
  note?: string;
  folderIds?: string[];
}

export async function createVocabulary(input: CreateVocabInput) {
  if (!input.word.trim()) return { success: false, error: "Từ vựng là bắt buộc." };
  if (!input.meaning.trim()) return { success: false, error: "Nghĩa là bắt buộc." };

  try {
    const docRef = await adminDb.collection("vocabularies").add({
      word: input.word.trim(),
      meaning: input.meaning.trim(),
      reading: input.reading?.trim() || null,
      sinoVietnamese: input.sinoVietnamese?.trim() || null,
      example: input.example?.trim() || null,
      note: input.note?.trim() || null,
      folderIds: input.folderIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    revalidatePath("/");
    return { success: true, data: { id: docRef.id } };
  } catch (error) {
    console.error("Lỗi khi thêm từ vựng:", error);
    return { success: false, error: "Không thể thêm từ vựng." };
  }
}

export async function createBulkVocabulary(jsonString: string, targetFolderId?: string) {
  try {
    const dataList = JSON.parse(jsonString);
    if (!Array.isArray(dataList)) {
      return { success: false, error: "Dữ liệu JSON phải là một mảng." };
    }

    const batch = adminDb.batch();
    const vocabRef = adminDb.collection("vocabularies");
    
    let count = 0;
    for (const item of dataList) {
      if (!item.word || !item.meaning) continue;

      const newDocRef = vocabRef.doc();
      batch.set(newDocRef, {
        word: item.word,
        meaning: item.meaning,
        reading: item.reading || null,
        sinoVietnamese: item.sinoVietnamese || null,
        example: item.example || null,
        note: item.note || null,
        folderIds: targetFolderId ? [targetFolderId] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      count++;
    }

    await batch.commit();

    revalidatePath("/");
    return { success: true, count };
  } catch (error) {
    console.error("Lỗi import hàng loạt:", error);
    return { success: false, error: "Dữ liệu JSON không hợp lệ hoặc lỗi DB." };
  }
}

export async function assignVocabularyToFolder(vocabularyId: string, folderId: string) {
  try {
    const docRef = adminDb.collection("vocabularies").doc(vocabularyId);
    
    // Ghi đè toàn bộ thư mục cũ bằng thư mục mới (Move semantics)
    await docRef.update({
      folderIds: [folderId],
      updatedAt: new Date().toISOString()
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi chuyển thư mục cho từ vựng:", error);
    return { success: false, error: "Không thể kéo thả chuyển thư mục." };
  }
}

export async function getVocabularies(folderId?: string, searchQuery?: string) {
  try {
    let query: FirebaseFirestore.Query = adminDb.collection("vocabularies");

    if (folderId && folderId !== "all") {
      query = query.where("folderIds", "array-contains", folderId);
    }

    const snapshot = await query.get();
    
    // Khởi tạo lấy danh sách folder để map tên (Do Firebase không có Include/Join)
    const foldersSnapshot = await adminDb.collection("folders").get();
    const folderMap = new Map<string, any>();
    foldersSnapshot.docs.forEach(doc => {
      folderMap.set(doc.id, { id: doc.id, name: doc.data().name });
    });

    let vocabs = snapshot.docs.map(doc => {
      const data = doc.data();
      // Tái tạo lại cấu trúc folderVocabularies giống Prisma cũ để Frontend không bị lỗi
      const folderVocabularies = (data.folderIds || []).map((fId: string) => ({
        folderId: fId,
        folder: folderMap.get(fId) || { id: fId, name: "Thư mục không xác định" }
      }));

      return {
        id: doc.id,
        ...data,
        folderVocabularies
      };
    });

    // Lọc thủ công tìm kiếm (Firestore không hỗ trợ OR + Fulltext Search tốt cho nhiều trường)
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      vocabs = vocabs.filter((v: any) => 
        (v.word && v.word.toLowerCase().includes(q)) ||
        (v.meaning && v.meaning.toLowerCase().includes(q)) ||
        (v.reading && v.reading.toLowerCase().includes(q)) ||
        (v.sinoVietnamese && v.sinoVietnamese.toLowerCase().includes(q))
      );
    }

    // Sort by createdAt desc
    vocabs.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return vocabs;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách từ vựng:", error);
    return [];
  }
}

export async function deleteVocabulary(id: string) {
  try {
    await adminDb.collection("vocabularies").doc(id).delete();
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xóa từ vựng:", error);
    return { success: false, error: "Không thể xóa từ vựng." };
  }
}
