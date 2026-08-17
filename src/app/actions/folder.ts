"use server";

import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getFolders() {
  try {
    const snapshot = await adminDb.collection("folders").orderBy("name", "asc").get();
    
    // Đếm số lượng từ vựng cho mỗi thư mục
    const vocabSnapshot = await adminDb.collection("vocabularies").get();
    const folderCountMap: Record<string, number> = {};
    
    vocabSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.folderIds && Array.isArray(data.folderIds)) {
        data.folderIds.forEach((fId: string) => {
          folderCountMap[fId] = (folderCountMap[fId] || 0) + 1;
        });
      }
    });

    const folders = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      parentId: doc.data().parentId || null,
      ownerId: doc.data().ownerId || null,
      ownerEmail: doc.data().ownerEmail || null,
      ownerName: doc.data().ownerName || null,
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

  // Lấy thông tin user hiện tại
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để tạo thư mục." };
  }

  try {
    const docRef = await adminDb.collection("folders").add({
      name: name.trim(),
      parentId: parentId || null,
      ownerId: currentUser.uid,
      ownerEmail: currentUser.email,
      ownerName: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    revalidatePath("/");
    return { 
      success: true, 
      folder: { 
        id: docRef.id, 
        name: name.trim(), 
        parentId: parentId || null,
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email,
        ownerName: currentUser.name,
      } 
    };
  } catch (error) {
    console.error("Lỗi khi tạo thư mục:", error);
    return { success: false, error: "Không thể tạo thư mục." };
  }
}

export async function renameFolder(id: string, newName: string) {
  if (!newName.trim()) return { success: false, error: "Tên thư mục không được để trống." };

  // Kiểm tra quyền
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để thực hiện thao tác này." };
  }
  const isAdmin = currentUser.email === "hoangtungmy123@gmail.com";

  // Kiểm tra owner
  const folderDoc = await adminDb.collection("folders").doc(id).get();
  if (!folderDoc.exists) return { success: false, error: "Thư mục không tồn tại." };
  
  const folderData = folderDoc.data();
  if (!isAdmin && folderData?.ownerId && folderData.ownerId !== currentUser.uid) {
    return { success: false, error: "Bạn không có quyền đổi tên thư mục này." };
  }

  try {
    await adminDb.collection("folders").doc(id).update({
      name: newName.trim(),
      updatedAt: new Date().toISOString()
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi đổi tên thư mục:", error);
    return { success: false, error: "Không thể đổi tên thư mục." };
  }
}

export async function deleteFolderAndVocabs(id: string) {
  // Kiểm tra quyền
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để thực hiện thao tác này." };
  }
  const isAdmin = currentUser.email === "hoangtungmy123@gmail.com";

  // Kiểm tra owner của thư mục gốc
  const folderDoc = await adminDb.collection("folders").doc(id).get();
  if (!folderDoc.exists) return { success: false, error: "Thư mục không tồn tại." };
  
  const folderData = folderDoc.data();
  if (!isAdmin && folderData?.ownerId && folderData.ownerId !== currentUser.uid) {
    return { success: false, error: "Bạn không có quyền xóa thư mục này." };
  }

  try {
    const allFoldersSnapshot = await adminDb.collection("folders").get();
    const allFolders = allFoldersSnapshot.docs.map(doc => ({ id: doc.id, parentId: doc.data().parentId }));
    
    const folderIdsToDelete = new Set<string>();
    folderIdsToDelete.add(id);

    // Thu thập đệ quy tất cả các thư mục con
    let addedNew = true;
    while (addedNew) {
      addedNew = false;
      allFolders.forEach(f => {
        if (f.parentId && folderIdsToDelete.has(f.parentId) && !folderIdsToDelete.has(f.id)) {
          folderIdsToDelete.add(f.id);
          addedNew = true;
        }
      });
    }

    const folderIdsArray = Array.from(folderIdsToDelete);

    // Lấy tất cả từ vựng để xóa
    const vocabSnapshot = await adminDb.collection("vocabularies").get();
    const vocabsToDelete: string[] = [];
    
    vocabSnapshot.docs.forEach(doc => {
      const folderIds = doc.data().folderIds || [];
      const hasMatch = folderIds.some((fid: string) => folderIdsToDelete.has(fid));
      if (hasMatch) {
        vocabsToDelete.push(doc.id);
      }
    });

    const allDocRefsToDelete = [
      ...folderIdsArray.map(fid => adminDb.collection("folders").doc(fid)),
      ...vocabsToDelete.map(vid => adminDb.collection("vocabularies").doc(vid))
    ];

    // Xóa theo batch để tránh giới hạn 500 của Firestore
    const BATCH_SIZE = 400;
    for (let i = 0; i < allDocRefsToDelete.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      const chunk = allDocRefsToDelete.slice(i, i + BATCH_SIZE);
      chunk.forEach(ref => batch.delete(ref));
      await batch.commit();
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xóa thư mục và từ vựng:", error);
    return { success: false, error: "Không thể xóa thư mục." };
  }
}
