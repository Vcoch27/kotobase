"use server";

import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

export async function getFolders() {
  try {
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser?.email === "hoangtungmy123@gmail.com";
    const currentUid = currentUser?.uid;

    const snapshot = await adminDb.collection("folders").orderBy("name", "asc").get();
    
    // Map raw folders
    const allRawFolders = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      parentId: doc.data().parentId || null,
      ownerId: doc.data().ownerId || null,
      ownerEmail: doc.data().ownerEmail || null,
      ownerName: doc.data().ownerName || null,
      isPublic: doc.data().isPublic !== false, // Mặc định là hiển thị (true)
    }));

    // Tạo Map để tra cứu nhanh cha con
    const folderMap = new Map<string, typeof allRawFolders[0]>();
    allRawFolders.forEach(f => folderMap.set(f.id, f));

    // Hàm kiểm tra một thư mục có hiển thị với user hiện tại không
    // Quy tắc kế thừa cha con:
    // 1. Admin luôn thấy tất cả.
    // 2. Chính chủ sở hữu luôn thấy thư mục của mình.
    // 3. Người khác chỉ thấy nếu thư mục đó là công khai VÀ toàn bộ tổ tiên của nó cũng công khai.
    const isFolderVisibleToUser = (folder: typeof allRawFolders[0]): boolean => {
      if (isAdmin) return true;
      if (currentUid && folder.ownerId === currentUid) return true;
      
      // Kiểm tra chính thư mục này
      if (!folder.isPublic) return false;

      // Kiểm tra toàn bộ chuỗi tổ tiên (cha, ông,...)
      let currParentId = folder.parentId;
      const visited = new Set<string>();
      while (currParentId) {
        if (visited.has(currParentId)) break;
        visited.add(currParentId);

        const parentFolder = folderMap.get(currParentId);
        if (!parentFolder) break;

        // Nếu bất kỳ thư mục cha nào bị ẩn => toàn bộ thư mục con cháu bị ẩn với người khác
        if (!parentFolder.isPublic) return false;
        currParentId = parentFolder.parentId;
      }

      return true;
    };

    // Lọc danh sách thư mục hiển thị cho user này
    const visibleFolders = allRawFolders.filter(isFolderVisibleToUser).map(f => ({
      ...f,
      _count: {
        folderVocabularies: 0
      }
    }));

    // Tối ưu hoá: Dùng count() để đếm số lượng từ vựng trong mỗi thư mục hiển thị
    await Promise.all(visibleFolders.map(async (folder) => {
      try {
        const countSnap = await adminDb.collection("vocabularies")
          .where("folderIds", "array-contains", folder.id)
          .count()
          .get();
        folder._count.folderVocabularies = countSnap.data().count;
      } catch (e) {
        folder._count.folderVocabularies = 0;
      }
    }));
    
    return visibleFolders;
  } catch (error: any) {
    console.error("Lỗi khi lấy danh sách thư mục:", error);
    if (error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("Quota exceeded")) {
      return { error: "QUOTA_EXCEEDED" };
    }
    return [];
  }
}

export async function createFolder(name: string, parentId?: string, isPublic: boolean = true) {
  if (!name.trim()) return { success: false, error: "Tên thư mục không được trống." };

  // Lấy thông tin user hiện tại
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để tạo thư mục." };
  }

  const isAdmin = currentUser.email === "hoangtungmy123@gmail.com";

  // Nếu tạo thư mục con bên trong thư mục cha: Chỉ Admin hoặc chủ sở hữu thư mục cha mới có quyền
  if (parentId) {
    const parentDoc = await adminDb.collection("folders").doc(parentId).get();
    if (parentDoc.exists) {
      const parentData = parentDoc.data();
      const isParentOwner = !!parentData?.ownerId && parentData.ownerId === currentUser.uid;
      if (!isAdmin && !isParentOwner) {
        return { success: false, error: "Bạn không có quyền tạo thư mục con trong thư mục này." };
      }
    }
  }

  try {
    const docRef = await adminDb.collection("folders").add({
      name: name.trim(),
      parentId: parentId || null,
      ownerId: currentUser.uid,
      ownerEmail: currentUser.email,
      ownerName: currentUser.name,
      isPublic: isPublic !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return { 
      success: true, 
      folder: { 
        id: docRef.id, 
        name: name.trim(), 
        parentId: parentId || null,
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email,
        ownerName: currentUser.name,
        isPublic: isPublic !== false,
      } 
    };
  } catch (error) {
    console.error("Lỗi khi tạo thư mục:", error);
    return { success: false, error: "Không thể tạo thư mục." };
  }
}

export async function updateFolderVisibility(id: string, isPublic: boolean) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để thực hiện thao tác này." };
  }
  const isAdmin = currentUser.email === "hoangtungmy123@gmail.com";

  const folderDoc = await adminDb.collection("folders").doc(id).get();
  if (!folderDoc.exists) return { success: false, error: "Thư mục không tồn tại." };

  const folderData = folderDoc.data();
  const isOwner = !!folderData?.ownerId && folderData.ownerId === currentUser.uid;

  if (!isAdmin && !isOwner) {
    return { success: false, error: "Bạn không có quyền thay đổi trạng thái hiển thị của thư mục này." };
  }

  try {
    await adminDb.collection("folders").doc(id).update({
      isPublic: !!isPublic,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, isPublic: !!isPublic };
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái hiển thị thư mục:", error);
    return { success: false, error: "Không thể cập nhật trạng thái hiển thị thư mục." };
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
  const isOwner = !!folderData?.ownerId && folderData.ownerId === currentUser.uid;

  // Thư mục vô danh (!ownerId) hoặc thư mục của người khác: CHỈ Admin (hoangtungmy123@gmail.com) mới có quyền đổi tên
  if (!isAdmin && !isOwner) {
    return { success: false, error: "Bạn không có quyền đổi tên thư mục này. Thư mục này chỉ Admin hoặc người tạo mới có quyền chỉnh sửa." };
  }

  try {
    await adminDb.collection("folders").doc(id).update({
      name: newName.trim(),
      updatedAt: new Date().toISOString()
    });

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
  const isOwner = !!folderData?.ownerId && folderData.ownerId === currentUser.uid;

  // Thư mục vô danh (!ownerId) hoặc thư mục của người khác: CHỈ Admin (hoangtungmy123@gmail.com) mới có quyền xóa
  if (!isAdmin && !isOwner) {
    return { success: false, error: "Bạn không có quyền xóa thư mục này. Thư mục này chỉ Admin hoặc người tạo mới có quyền xóa." };
  }

  try {
    const allFoldersSnapshot = await adminDb.collection("folders").get();
    const allFolders = allFoldersSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      parentId: doc.data().parentId,
      ownerId: doc.data().ownerId 
    }));
    
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

    // Nếu không phải admin, đảm bảo toàn bộ cây thư mục con cũng thuộc quyền sở hữu của user
    if (!isAdmin) {
      for (const fid of Array.from(folderIdsToDelete)) {
        const target = allFolders.find(f => f.id === fid);
        if (!target?.ownerId || target.ownerId !== currentUser.uid) {
          return { success: false, error: "Thư mục này chứa thư mục con không thuộc quyền sở hữu của bạn." };
        }
      }
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

    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xóa thư mục và từ vựng:", error);
    return { success: false, error: "Không thể xóa thư mục." };
  }
}

export async function claimLegacyFolders() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.email !== "hoangtungmy123@gmail.com") {
    return { success: false, error: "Chỉ tài khoản Admin mới có quyền thực hiện thao tác này." };
  }

  try {
    const snapshot = await adminDb.collection("folders").get();
    const batch = adminDb.batch();
    let count = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!data.ownerId) {
        batch.update(doc.ref, {
          ownerId: currentUser.uid,
          ownerEmail: currentUser.email,
          ownerName: currentUser.name || "Hoàng Nguyễn Văn",
          updatedAt: new Date().toISOString(),
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }

    return { success: true, count };
  } catch (error: any) {
    console.error("Lỗi khi chuyển quyền sở hữu thư mục cũ:", error);
    return { success: false, error: "Không thể cập nhật quyền sở hữu thư mục." };
  }
}
