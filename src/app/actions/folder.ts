"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export async function getFolders() {
  try {
    const snapshot = await adminDb.collection("folders").orderBy("name", "asc").get();
    
    // Đếm số lượng từ vựng cho mỗi thư mục
    // (Trong thực tế nên lưu biến counter trong document của folder, nhưng ở đây ta query array-contains-any hoặc tính toán phía client/server)
    // Để tối ưu, ta có thể lấy toàn bộ vocabularies để tính toán hoặc chỉ trả về folders.
    // Lấy toàn bộ từ vựng để map đếm
    const vocabSnapshot = await adminDb.collection("vocabularies").get();
    const folderCountMap: Record<string, number> = {};
    
    vocabSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.folderIds && Array.isArray(data.folderIds)) {
        data.folderIds.forEach(fId => {
          folderCountMap[fId] = (folderCountMap[fId] || 0) + 1;
        });
      }
    });

    const folders = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      parentId: doc.data().parentId || null,
      _count: {
        folderVocabularies: folderCountMap[doc.id] || 0
      }
    }));
    
    return folders;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách thư mục:", error);
    return [];
  }
}

export async function createFolder(name: string, parentId?: string) {
  if (!name.trim()) return { success: false, error: "Tên thư mục không được trống." };

  try {
    const docRef = await adminDb.collection("folders").add({
      name: name.trim(),
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    revalidatePath("/");
    return { success: true, folder: { id: docRef.id, name: name.trim(), parentId: parentId || null } };
  } catch (error) {
    console.error("Lỗi khi tạo thư mục:", error);
    return { success: false, error: "Không thể tạo thư mục." };
  }
}

export async function deleteFolder(id: string) {
  try {
    await adminDb.collection("folders").doc(id).delete();
    
    // Cần phải gỡ bỏ thư mục này ra khỏi các từ vựng đang chứa nó
    const vocabSnapshot = await adminDb.collection("vocabularies").where("folderIds", "array-contains", id).get();
    const batch = adminDb.batch();
    
    vocabSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const updatedFolderIds = (data.folderIds || []).filter((fid: string) => fid !== id);
      batch.update(doc.ref, { folderIds: updatedFolderIds });
    });
    
    await batch.commit();

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xóa thư mục:", error);
    return { success: false, error: "Không thể xóa thư mục." };
  }
}
