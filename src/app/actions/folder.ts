"use server";

import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCachedFoldersRaw } from "@/lib/cache";
import { getVocabularyCatalog, createVocabularyWriteBatch } from "@/lib/vocabulary-index";
import { uniqueVocabularyByWord } from "@/lib/vocabulary-view";
import { FieldValue } from "firebase-admin/firestore";

type Permission = 'admin' | 'owner' | 'coauthor' | 'none';

async function getEffectivePermission(
  folderId: string,
  userUid: string,
  userEmail: string,
  allFolders: Array<{ id: string; parentId: string | null; ownerId?: string | null; coAuthorEmails?: string[] }>
): Promise<Permission> {
  const ADMIN_EMAIL = 'hoangtungmy123@gmail.com';
  const userEmailNorm = (userEmail || '').trim().toLowerCase();
  if (userEmailNorm === ADMIN_EMAIL) return 'admin';

  const folderMap = new Map(allFolders.map(f => [f.id, f]));
  
  let currentId: string | null = folderId;
  const visited = new Set<string>();
  
  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    
    const folder = folderMap.get(currentId);
    if (!folder) break;
    
    if (currentId === folderId && folder.ownerId === userUid) {
      return 'owner';
    }
    
    if (folder.ownerId === userUid) {
      return 'coauthor';
    }
    
    const coAuthors = (folder.coAuthorEmails || []).map(e => e.trim().toLowerCase());
    if (coAuthors.includes(userEmailNorm)) {
      return 'coauthor';
    }
    
    currentId = folder.parentId;
  }
  
  return 'none';
}

export async function getFolders(includeCounts = true) {
  try {
    const currentUser = await getCurrentUser();
    const currentUserEmail = (currentUser?.email || "").trim().toLowerCase();
    const currentUid = currentUser?.uid;
    const isAdmin = currentUserEmail === "hoangtungmy123@gmail.com";

    const allRawFolders = await getCachedFoldersRaw();

    // Tạo Map để tra cứu nhanh cha con
    const folderMap = new Map<string, typeof allRawFolders[0]>();
    allRawFolders.forEach(f => folderMap.set(f.id, f));

    // Tập các ID thư mục mà user này có quyền truy cập trực tiếp (chủ sở hữu hoặc đồng tác giả)
    const directAccessibleFolderIds = new Set<string>();
    if (isAdmin) {
      allRawFolders.forEach(f => directAccessibleFolderIds.add(f.id));
    } else if (currentUserEmail || currentUid) {
      allRawFolders.forEach(f => {
        const isOwner = !!currentUid && f.ownerId === currentUid;
        const isCoAuthor = !!currentUserEmail && (f.coAuthorEmails || []).some(
          (email: string) => email.trim().toLowerCase() === currentUserEmail
        );
        if (isOwner || isCoAuthor) {
          directAccessibleFolderIds.add(f.id);
        }
      });
    }

    // Kế thừa quyền xuống các thư mục con cháu
    const accessibleFolderIds = new Set<string>(directAccessibleFolderIds);
    let expanded = true;
    while (expanded) {
      expanded = false;
      allRawFolders.forEach(f => {
        if (f.parentId && accessibleFolderIds.has(f.parentId) && !accessibleFolderIds.has(f.id)) {
          accessibleFolderIds.add(f.id);
          expanded = true;
        }
      });
    }

    // Đảm bảo các thư mục tổ tiên của thư mục mà user có quyền cũng được giữ để dựng cây thư mục
    const ancestorIds = new Set<string>();
    accessibleFolderIds.forEach(fid => {
      let curr = folderMap.get(fid);
      const visited = new Set<string>();
      while (curr && curr.parentId) {
        if (visited.has(curr.parentId)) break;
        visited.add(curr.parentId);
        ancestorIds.add(curr.parentId);
        curr = folderMap.get(curr.parentId);
      }
    });

    // Hàm kiểm tra một thư mục có hiển thị với user hiện tại không
    const isFolderVisibleToUser = (folder: typeof allRawFolders[0]): boolean => {
      if (isAdmin) return true;

      // Nếu user có quyền trên thư mục này (owner / co-author / con cháu thừa kế) -> luôn hiển thị
      if (accessibleFolderIds.has(folder.id)) return true;

      // Nếu là tổ tiên của thư mục mà user có quyền -> hiển thị làm container dẫn đường
      if (ancestorIds.has(folder.id)) return true;

      // Với người dùng khác: chỉ thấy nếu thư mục này là công khai VÀ toàn bộ tổ tiên công khai
      if (!folder.isPublic) return false;

      let currParentId = folder.parentId;
      const visited = new Set<string>();
      while (currParentId) {
        if (visited.has(currParentId)) break;
        visited.add(currParentId);

        const parentFolder = folderMap.get(currParentId);
        if (!parentFolder) break;

        // Nếu tổ tiên là accessible thì hợp lệ, còn nếu không accessible mà lại ẩn -> chặn nhánh này
        if (!accessibleFolderIds.has(parentFolder.id) && !parentFolder.isPublic) {
          return false;
        }
        currParentId = parentFolder.parentId;
      }

      return true;
    };

    // Lọc danh sách thư mục hiển thị cho user này
    const visibleFolders = allRawFolders.filter(isFolderVisibleToUser).map(f => ({
      ...f,
      vocabularyWords: [] as string[],
      _count: {
        folderVocabularies: 0,
        rootVocabularies: 0,
      }
    }));

    // Catalog shards contain only searchable summaries, never full documents.
    // Do not query count() per folder or sum child document counts.
    if (includeCounts) {
      const visibleIds = new Set(visibleFolders.map(folder => folder.id));
      const records = (await getVocabularyCatalog()).filter((record: any) => {
        if (isAdmin || (currentUid && record.createdBy === currentUid)) return true;
        const ids: string[] = record.folderIds || [];
        return !ids.length || ids.some(id => visibleIds.has(id));
      });
      const wordsByFolder = new Map<string, Set<string>>();
      for (const record of records as Array<{ word?: string; folderIds?: string[] }>) {
        if (!record.word) continue;
        for (const id of record.folderIds || []) {
          if (!visibleIds.has(id)) continue;
          if (!wordsByFolder.has(id)) wordsByFolder.set(id, new Set());
          wordsByFolder.get(id)!.add(record.word);
        }
      }
      const rootCount = uniqueVocabularyByWord(records).length;
      for (const folder of visibleFolders) {
        folder.vocabularyWords = Array.from(wordsByFolder.get(folder.id) || []);
        folder._count.folderVocabularies = folder.vocabularyWords.length;
        folder._count.rootVocabularies = rootCount;
      }
    }
    
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

  // Nếu tạo thư mục con bên trong thư mục cha: Kiểm tra quyền (admin, owner, coauthor)
  if (parentId) {
    const parentDoc = await adminDb.collection("folders").doc(parentId).get();
    if (parentDoc.exists) {
      const allFolders = await getCachedFoldersRaw();
      const perm = await getEffectivePermission(parentId, currentUser.uid, currentUser.email || "", allFolders as any);
      if (perm === 'none') {
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

    revalidatePath("/"); revalidateTag("folders"); revalidateTag("vocabularies");
    revalidateTag("folders");
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

    revalidatePath("/");
    revalidateTag("folders");
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
  
  // Thư mục vô danh (!ownerId) hoặc thư mục của người khác: CHỈ Admin (hoangtungmy123@gmail.com) mới có quyền đổi tên
  // Trừ khi bạn là co-author
  const allFolders = await getCachedFoldersRaw();
  const perm = await getEffectivePermission(id, currentUser.uid, currentUser.email || "", allFolders as any);
  if (perm === 'none') {
    return { success: false, error: "Bạn không có quyền đổi tên thư mục này. Thư mục này chỉ Admin, người tạo hoặc đồng tác giả mới có quyền chỉnh sửa." };
  }

  try {
    await adminDb.collection("folders").doc(id).update({
      name: newName.trim(),
      updatedAt: new Date().toISOString()
    });

    revalidatePath("/");
    revalidateTag("folders");
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
  if (!folderDoc.exists) {
    // Thư mục đã không còn tồn tại trên Firebase (đã bị xóa trước đó hoặc do cache cũ)
    // Revalidate cache ngay để dọn sạch thư mục ma khỏi UI
    revalidatePath("/");
    revalidateTag("folders");
    revalidateTag("vocabularies");
    return { success: true };
  }
  
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

    // Lấy từ vựng thuộc các thư mục này để xóa (chỉ query theo folderIds thay vì get() toàn bộ DB)
    const vocabsToDelete = new Set<string>();
    await Promise.all(
      folderIdsArray.map(async (fid) => {
        try {
          const snap = await adminDb.collection("vocabularies")
            .where("folderIds", "array-contains", fid)
            .get();
          snap.docs.forEach(doc => vocabsToDelete.add(doc.id));
        } catch (err) {
          console.error(`Lỗi khi lấy từ vựng thư mục ${fid}:`, err);
        }
      })
    );

    const allDocRefsToDelete = [
      ...folderIdsArray.map(fid => adminDb.collection("folders").doc(fid)),
      ...Array.from(vocabsToDelete).map(vid => adminDb.collection("vocabularies").doc(vid))
    ];

    // Xóa theo batch để tránh giới hạn 500 của Firestore
    const BATCH_SIZE = 400;
    for (let i = 0; i < allDocRefsToDelete.length; i += BATCH_SIZE) {
      const batch = createVocabularyWriteBatch();
      const chunk = allDocRefsToDelete.slice(i, i + BATCH_SIZE);
      chunk.forEach(ref => batch.delete(ref));
      await batch.commit();
    }

    revalidatePath("/");
    revalidateTag("folders");
    revalidateTag("vocabularies");
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
      revalidatePath("/");
      revalidateTag("folders");
    }

    return { success: true, count };
  } catch (error: any) {
    console.error("Lỗi khi chuyển quyền sở hữu thư mục cũ:", error);
    return { success: false, error: "Không thể cập nhật quyền sở hữu thư mục." };
  }
}

export async function addCoAuthor(folderId: string, email: string) {
  if (!email.trim()) return { success: false, error: "Email không hợp lệ." };
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Chưa đăng nhập." };

  const folderDoc = await adminDb.collection("folders").doc(folderId).get();
  if (!folderDoc.exists) return { success: false, error: "Thư mục không tồn tại." };
  
  const data = folderDoc.data();
  const isAdmin = currentUser.email === "hoangtungmy123@gmail.com";
  const isOwner = !!data?.ownerId && data.ownerId === currentUser.uid;

  if (!isAdmin && !isOwner) {
    return { success: false, error: "Chỉ chủ sở hữu hoặc admin mới được thêm đồng tác giả." };
  }

  try {
    await adminDb.collection("folders").doc(folderId).update({
      coAuthorEmails: FieldValue.arrayUnion(email.trim().toLowerCase()),
      updatedAt: new Date().toISOString()
    });
    revalidatePath("/");
    revalidateTag("folders");
    revalidateTag("vocabularies");
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi thêm đồng tác giả:", error);
    return { success: false, error: "Không thể thêm đồng tác giả." };
  }
}

export async function removeCoAuthor(folderId: string, email: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Chưa đăng nhập." };

  const folderDoc = await adminDb.collection("folders").doc(folderId).get();
  if (!folderDoc.exists) return { success: false, error: "Thư mục không tồn tại." };
  
  const data = folderDoc.data();
  const isAdmin = currentUser.email === "hoangtungmy123@gmail.com";
  const isOwner = !!data?.ownerId && data.ownerId === currentUser.uid;

  if (!isAdmin && !isOwner) {
    return { success: false, error: "Chỉ chủ sở hữu hoặc admin mới được xóa đồng tác giả." };
  }

  try {
    await adminDb.collection("folders").doc(folderId).update({
      coAuthorEmails: FieldValue.arrayRemove(email.trim(), email.trim().toLowerCase()),
      updatedAt: new Date().toISOString()
    });
    revalidatePath("/");
    revalidateTag("folders");
    revalidateTag("vocabularies");
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xóa đồng tác giả:", error);
    return { success: false, error: "Không thể xóa đồng tác giả." };
  }
}

export async function getFolderCoAuthors(folderId: string) {
  try {
    const folderDoc = await adminDb.collection("folders").doc(folderId).get();
    if (!folderDoc.exists) return { success: false, error: "Thư mục không tồn tại." };
    
    const data = folderDoc.data();
    return { 
      success: true, 
      coAuthorEmails: data?.coAuthorEmails || [], 
      ownerEmail: data?.ownerEmail || "", 
      ownerName: data?.ownerName || "" 
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đồng tác giả:", error);
    return { success: false, error: "Không thể lấy danh sách đồng tác giả." };
  }
}
