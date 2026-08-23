"use server";

import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

// =========================================
// THƯ MỤC MẪU CÂU (SENTENCE FOLDER)
// =========================================

export async function getSentenceFolders(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const snapshot = await adminDb.collection("sentence_folders").orderBy("name", "asc").get();
    
    const folders = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      parentId: doc.data().parentId || null,
      ownerId: doc.data().ownerId || null,
      ownerEmail: doc.data().ownerEmail || null,
      ownerName: doc.data().ownerName || null,
      _count: {
        folderSentences: 0
      }
    }));

    // Đếm số lượng mẫu câu trong mỗi thư mục
    await Promise.all(folders.map(async (folder) => {
      try {
        const countSnap = await adminDb.collection("sentences")
          .where("folderIds", "array-contains", folder.id)
          .count()
          .get();
        folder._count.folderSentences = countSnap.data().count;
      } catch (e) {
        folder._count.folderSentences = 0;
      }
    }));
    
    return { success: true, data: folders };
  } catch (error: any) {
    console.error("Lỗi khi lấy danh sách thư mục:", error);
    return { success: false, error: "Lỗi khi lấy danh sách thư mục mẫu câu." };
  }
}

export async function createSentenceFolder(name: string, parentId?: string) {
  if (!name.trim()) return { success: false, error: "Tên thư mục không được trống." };

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để tạo thư mục." };
  }

  try {
    const docRef = await adminDb.collection("sentence_folders").add({
      name: name.trim(),
      parentId: parentId || null,
      ownerId: currentUser.uid,
      ownerEmail: currentUser.email,
      ownerName: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    revalidatePath("/");
    return { success: true, data: { id: docRef.id } };
  } catch (error) {
    console.error("Lỗi khi tạo thư mục mẫu câu:", error);
    return { success: false, error: "Không thể tạo thư mục." };
  }
}

export async function updateSentenceFolder(id: string, name: string) {
  if (!name.trim()) return { success: false, error: "Tên thư mục không được trống." };

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để sửa thư mục." };
  }

  try {
    const docRef = adminDb.collection("sentence_folders").doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) return { success: false, error: "Thư mục không tồn tại." };
    if (doc.data()?.ownerId !== currentUser.uid && currentUser.email !== "hoangtungmy123@gmail.com") {
      return { success: false, error: "Bạn không có quyền sửa thư mục này." };
    }

    await docRef.update({
      name: name.trim(),
      updatedAt: new Date().toISOString()
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi cập nhật thư mục:", error);
    return { success: false, error: "Không thể cập nhật thư mục." };
  }
}

export async function deleteSentenceFolder(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để xóa thư mục." };
  }

  try {
    const docRef = adminDb.collection("sentence_folders").doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) return { success: false, error: "Thư mục không tồn tại." };
    if (doc.data()?.ownerId !== currentUser.uid && currentUser.email !== "hoangtungmy123@gmail.com") {
      return { success: false, error: "Bạn không có quyền xóa thư mục này." };
    }

    // Xoá toàn bộ mẫu câu trong thư mục này
    const sentencesQuery = await adminDb.collection("sentences")
      .where("folderIds", "array-contains", id)
      .get();
      
    const batch = adminDb.batch();
    sentencesQuery.docs.forEach((sentenceDoc) => {
      batch.delete(sentenceDoc.ref);
    });
    batch.delete(docRef);
    
    await batch.commit();

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xóa thư mục mẫu câu:", error);
    return { success: false, error: "Không thể xóa thư mục." };
  }
}


// =========================================
// MẪU CÂU (SENTENCE)
// =========================================

export async function getSentencesByFolder(folderId: string | "all"): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    let snapshot;
    const collection = adminDb.collection("sentences");

    if (folderId === "all" || !folderId) {
      snapshot = await collection.orderBy("createdAt", "desc").get();
    } else {
      snapshot = await collection.where("folderIds", "array-contains", folderId).orderBy("createdAt", "desc").get();
    }
    
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data };
  } catch (error: any) {
    console.error("Lỗi lấy danh sách mẫu câu:", error);
    return { success: false, error: "Lỗi lấy danh sách mẫu câu." };
  }
}

export async function createSentence(input: {
  japanese: string;
  meaning: string;
  vocabularies?: any[];
  grammars?: any[];
  note?: string;
  folderId?: string;
}) {
  if (!input.japanese.trim() || !input.meaning.trim()) {
    return { success: false, error: "Câu và nghĩa là bắt buộc." };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để thêm mẫu câu." };
  }

  try {
    const docRef = await adminDb.collection("sentences").add({
      japanese: input.japanese.trim(),
      meaning: input.meaning.trim(),
      vocabularies: input.vocabularies || [],
      grammars: input.grammars || [],
      note: input.note?.trim() || null,
      folderIds: input.folderId ? [input.folderId] : [],
      ownerId: currentUser.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    revalidatePath("/");
    return { success: true, data: { id: docRef.id } };
  } catch (error) {
    console.error("Lỗi khi thêm mẫu câu:", error);
    return { success: false, error: "Không thể thêm mẫu câu." };
  }
}

export async function updateSentence(id: string, input: {
  japanese: string;
  meaning: string;
  vocabularies?: any[];
  grammars?: any[];
  note?: string;
  folderId?: string;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để sửa mẫu câu." };
  }

  try {
    const docRef = adminDb.collection("sentences").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Mẫu câu không tồn tại." };
    
    if (doc.data()?.ownerId !== currentUser.uid && currentUser.email !== "hoangtungmy123@gmail.com") {
      return { success: false, error: "Bạn không có quyền sửa mẫu câu này." };
    }

    await docRef.update({
      japanese: input.japanese.trim(),
      meaning: input.meaning.trim(),
      vocabularies: input.vocabularies || [],
      grammars: input.grammars || [],
      note: input.note?.trim() || null,
      folderIds: input.folderId ? [input.folderId] : [],
      updatedAt: new Date().toISOString(),
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi sửa mẫu câu:", error);
    return { success: false, error: "Không thể sửa mẫu câu." };
  }
}

export async function deleteSentence(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để xóa mẫu câu." };
  }

  try {
    const docRef = adminDb.collection("sentences").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Mẫu câu không tồn tại." };
    
    if (doc.data()?.ownerId !== currentUser.uid && currentUser.email !== "hoangtungmy123@gmail.com") {
      return { success: false, error: "Bạn không có quyền xóa mẫu câu này." };
    }

    await docRef.delete();
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xóa mẫu câu:", error);
    return { success: false, error: "Không thể xóa mẫu câu." };
  }
}

export async function createBulkSentences(jsonString: string, targetFolderId?: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để nhập dữ liệu." };
  }

  try {
    const dataList = JSON.parse(jsonString);
    if (!Array.isArray(dataList)) {
      return { success: false, error: "Dữ liệu JSON phải là một mảng." };
    }

    const batch = adminDb.batch();
    const sentencesRef = adminDb.collection("sentences");
    const baseTime = Date.now();
    
    let count = 0;
    for (let i = 0; i < dataList.length; i++) {
      const item = dataList[i];
      if (!item.japanese || !item.meaning) continue;

      const docRef = sentencesRef.doc();
      // Đảm bảo document đầu tiên có thời gian mới nhất (hoặc cũ nhất, tuỳ logic sắp xếp - ở đây ta cộng i * 100ms)
      const createdAt = new Date(baseTime + i * 100).toISOString();

      batch.set(docRef, {
        japanese: item.japanese.trim(),
        meaning: item.meaning.trim(),
        vocabularies: item.vocabularies || [],
        grammars: item.grammars || [],
        note: item.note?.trim() || null,
        folderIds: targetFolderId ? [targetFolderId] : [],
        ownerId: currentUser.uid,
        createdAt: createdAt,
        updatedAt: createdAt,
      });
      
      count++;
      if (count % 500 === 0) {
        await batch.commit();
      }
    }

    if (count % 500 !== 0) {
      await batch.commit();
    }

    revalidatePath("/");
    return { success: true, count };
  } catch (error: any) {
    console.error("Lỗi khi lưu mẫu câu hàng loạt:", error);
    return { success: false, error: "Không thể lưu dữ liệu." };
  }
}
