"use server";

import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
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

// Helper: kiểm tra user có quyền ghi vào folder không
async function checkFolderPermission(folderId: string, currentUid: string, currentUserEmail?: string): Promise<{ allowed: boolean; error?: string }> {
  if (!folderId) return { allowed: true }; // Không thuộc folder nào = không kiểm tra
  
  const isAdmin = currentUserEmail === "hoangtungmy123@gmail.com";
  
  const folderDoc = await adminDb.collection("folders").doc(folderId).get();
  if (!folderDoc.exists) return { allowed: false, error: "Thư mục không tồn tại." };
  
  const data = folderDoc.data();
  // Folder cũ không có ownerId => chỉ Admin mới được sửa
  if (!isAdmin && !data?.ownerId) return { allowed: false, error: "Thư mục này thuộc quyền quản trị của Admin (hoangtungmy123@gmail.com), bạn không có quyền chỉnh sửa." };
  if (!isAdmin && data?.ownerId !== currentUid) return { allowed: false, error: "Bạn không có quyền chỉnh sửa thư mục này." };
  
  return { allowed: true };
}

export async function createVocabulary(input: CreateVocabInput) {
  if (!input.word.trim()) return { success: false, error: "Từ vựng là bắt buộc." };
  if (!input.meaning.trim()) return { success: false, error: "Nghĩa là bắt buộc." };

  // Kiểm tra đăng nhập Google
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để thêm từ vựng." };
  }

  // Kiểm tra quyền trên folder mục tiêu (nếu có)
  if (input.folderIds && input.folderIds.length > 0) {
    for (const fid of input.folderIds) {
      const perm = await checkFolderPermission(fid, currentUser.uid, currentUser.email);
      if (!perm.allowed) return { success: false, error: perm.error };
    }
  }

  try {
    const docRef = await adminDb.collection("vocabularies").add({
      word: input.word.trim(),
      meaning: input.meaning.trim(),
      reading: input.reading?.trim() || null,
      sinoVietnamese: input.sinoVietnamese?.trim() || null,
      example: input.example?.trim() || null,
      note: input.note?.trim() || null,
      folderIds: input.folderIds || [],
      createdBy: currentUser.uid,
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

export async function createBulkVocabulary(jsonString: string, targetFolderIds?: string | string[]) {
  // Kiểm tra đăng nhập Google
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để nhập từ vựng hàng loạt." };
  }

  // Chuẩn hóa mảng folderIds
  const fIds: string[] = Array.isArray(targetFolderIds)
    ? targetFolderIds.filter(Boolean)
    : targetFolderIds ? [targetFolderIds] : [];

  // Kiểm tra quyền trên tất cả folder mục tiêu
  for (const fid of fIds) {
    const perm = await checkFolderPermission(fid, currentUser.uid, currentUser.email);
    if (!perm.allowed) return { success: false, error: perm.error };
  }

  try {
    const dataList = JSON.parse(jsonString);
    if (!Array.isArray(dataList)) {
      return { success: false, error: "Dữ liệu JSON phải là một mảng." };
    }

    const batch = adminDb.batch();
    const vocabRef = adminDb.collection("vocabularies");
    const baseTime = Date.now();
    
    let count = 0;
    for (let i = 0; i < dataList.length; i++) {
      const item = dataList[i];
      if (!item.word || !item.meaning) continue;

      const newDocRef = vocabRef.doc();
      // Gán thời gian tịnh tiến 100ms để đảm bảo thứ tự từ trên xuống dưới của file JSON được bảo toàn 100%
      const itemTime = new Date(baseTime + count * 100).toISOString();

      batch.set(newDocRef, {
        word: item.word.trim(),
        meaning: item.meaning.trim(),
        reading: item.reading?.trim() || null,
        sinoVietnamese: item.sinoVietnamese?.trim() || null,
        example: item.example?.trim() || null,
        note: item.note?.trim() || null,
        folderIds: fIds,
        createdBy: currentUser.uid,
        createdAt: itemTime,
        updatedAt: itemTime,
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
  // Kiểm tra đăng nhập Google
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để chuyển thư mục." };
  }

  // Kiểm tra quyền trên folder đích
  const perm = await checkFolderPermission(folderId, currentUser.uid, currentUser.email);
  if (!perm.allowed) return { success: false, error: perm.error };

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

export async function getVocabularies(folderId?: string | string[], searchQuery?: string) {
  try {
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser?.email === "hoangtungmy123@gmail.com";
    const currentUid = currentUser?.uid;

    // 1. Lấy danh sách folders để map tên & tìm cây thư mục con đệ quy
    const foldersSnapshot = await adminDb.collection("folders").get();
    const folderMap = new Map<string, any>();
    const allFolders = foldersSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      parentId: doc.data().parentId || null,
      ownerId: doc.data().ownerId || null,
      isPublic: doc.data().isPublic !== false,
    }));
    allFolders.forEach(f => folderMap.set(f.id, f));

    // Hàm kiểm tra folder có hiển thị với user không (kế thừa theo cây thư mục)
    const isFolderVisible = (fid: string): boolean => {
      const f = folderMap.get(fid);
      if (!f) return false;
      if (isAdmin) return true;
      if (currentUid && f.ownerId === currentUid) return true;
      if (!f.isPublic) return false;
      
      // Kiểm tra toàn bộ tổ tiên
      let currParentId = f.parentId;
      const visited = new Set<string>();
      while (currParentId) {
        if (visited.has(currParentId)) break;
        visited.add(currParentId);
        const p = folderMap.get(currParentId);
        if (!p) break;
        if (!p.isPublic) return false;
        currParentId = p.parentId;
      }
      return true;
    };

    // Chuẩn hoá inputFolderIds (hỗ trợ cả chọn 1 thư mục hoặc chọn nhiều thư mục gộp)
    const inputFolderIds: string[] = Array.isArray(folderId)
      ? folderId.filter(id => id && id !== "all")
      : (folderId && folderId !== "all" ? [folderId] : []);

    // 2. Tìm tất cả ID thư mục con cháu nếu có chọn thư mục cụ thể (chỉ lấy thư mục con mà user được phép xem)
    const targetFolderIds = new Set<string>();
    if (inputFolderIds.length > 0) {
      inputFolderIds.forEach(fid => {
        if (isFolderVisible(fid)) {
          targetFolderIds.add(fid);
        }
      });

      let added = true;
      while (added) {
        added = false;
        allFolders.forEach(f => {
          if (f.parentId && targetFolderIds.has(f.parentId) && !targetFolderIds.has(f.id)) {
            if (isFolderVisible(f.id)) {
              targetFolderIds.add(f.id);
              added = true;
            }
          }
        });
      }
    }

    // 3. Lấy tất cả từ vựng từ collection
    let snapshotDocs: any[] = [];

    if (inputFolderIds.length > 0) {
      // Nếu có chọn thư mục (1 hoặc nhiều), thực hiện query riêng cho từng folderId và khử trùng bằng docMap
      const promises = Array.from(targetFolderIds).map(fid => 
        adminDb.collection("vocabularies").where("folderIds", "array-contains", fid).get()
      );
      const snapshots = await Promise.all(promises);
      
      const docMap = new Map();
      snapshots.forEach(snap => {
        snap.docs.forEach(doc => {
          docMap.set(doc.id, doc);
        });
      });
      snapshotDocs = Array.from(docMap.values());
    } else {
      // Nếu là tất cả thư mục, buộc phải get(). Để tránh vượt quota và load nhanh, giới hạn 100 từ vựng gần nhất
      const snapshot = await adminDb.collection("vocabularies").orderBy("createdAt", "desc").limit(100).get();
      snapshotDocs = snapshot.docs;
    }

    let vocabs = snapshotDocs
      .map(doc => {
        const data = doc.data();
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

    // Nếu không phải Admin, lọc bỏ các từ vựng chỉ thuộc về các thư mục đang bị ẩn đối với user này
    if (!isAdmin) {
      vocabs = vocabs.filter((v: any) => {
        if (currentUid && v.createdBy === currentUid) return true;
        const fIds: string[] = v.folderIds || [];
        if (fIds.length === 0) return true;
        return fIds.some((fid: string) => isFolderVisible(fid));
      });
    }

    // 4. Lọc tìm kiếm nếu có
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      vocabs = vocabs.filter((v: any) => 
        (v.word && v.word.toLowerCase().includes(q)) ||
        (v.meaning && v.meaning.toLowerCase().includes(q)) ||
        (v.reading && v.reading.toLowerCase().includes(q)) ||
        (v.sinoVietnamese && v.sinoVietnamese.toLowerCase().includes(q))
      );
    }

    // 5. Sắp xếp mặc định theo đúng thứ tự thêm vào (Cũ trước -> Mới sau: dateA - dateB)
    vocabs.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateA - dateB;
    });

    return vocabs;
  } catch (error: any) {
    console.error("Lỗi khi lấy danh sách từ vựng:", error);
    if (error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("Quota exceeded")) {
      return { error: "QUOTA_EXCEEDED" };
    }
    return [];
  }
}

export async function deleteVocabulary(id: string) {
  // Kiểm tra đăng nhập Google
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để xóa từ vựng." };
  }

  try {
    // Lấy vocab để kiểm tra folder
    const vocabDoc = await adminDb.collection("vocabularies").doc(id).get();
    if (vocabDoc.exists) {
      const vocabData = vocabDoc.data();
      const folderIds: string[] = vocabData?.folderIds || [];
      
      // Kiểm tra quyền trên ít nhất 1 folder
      if (folderIds.length > 0) {
        for (const fid of folderIds) {
          const perm = await checkFolderPermission(fid, currentUser.uid, currentUser.email);
          if (!perm.allowed) return { success: false, error: perm.error };
        }
      } else {
        const isAdmin = currentUser.email === "hoangtungmy123@gmail.com";
        if (!isAdmin && vocabData?.createdBy && vocabData.createdBy !== currentUser.uid) {
          return { success: false, error: "Bạn không có quyền xóa từ vựng này." };
        }
      }
    }

    await adminDb.collection("vocabularies").doc(id).delete();
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xóa từ vựng:", error);
    return { success: false, error: "Không thể xóa từ vựng." };
  }
}

export async function updateVocabulary(id: string, input: Partial<CreateVocabInput>) {
  // Kiểm tra đăng nhập Google
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Bạn cần đăng nhập bằng Google để chỉnh sửa từ vựng." };
  }

  try {
    // Lấy vocab để kiểm tra folder
    const vocabDoc = await adminDb.collection("vocabularies").doc(id).get();
    if (vocabDoc.exists) {
      const vocabData = vocabDoc.data();
      const folderIds: string[] = vocabData?.folderIds || [];
      
      if (folderIds.length > 0) {
        for (const fid of folderIds) {
          const perm = await checkFolderPermission(fid, currentUser.uid, currentUser.email);
          if (!perm.allowed) return { success: false, error: perm.error };
        }
      } else {
        const isAdmin = currentUser.email === "hoangtungmy123@gmail.com";
        if (!isAdmin && vocabData?.createdBy && vocabData.createdBy !== currentUser.uid) {
          return { success: false, error: "Bạn không có quyền chỉnh sửa từ vựng này." };
        }
      }
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };
    
    if (input.word !== undefined) updateData.word = input.word.trim();
    if (input.meaning !== undefined) updateData.meaning = input.meaning.trim();
    if (input.reading !== undefined) updateData.reading = input.reading?.trim() || null;
    if (input.sinoVietnamese !== undefined) updateData.sinoVietnamese = input.sinoVietnamese?.trim() || null;
    if (input.example !== undefined) updateData.example = input.example?.trim() || null;
    if (input.note !== undefined) updateData.note = input.note?.trim() || null;
    if (input.folderIds !== undefined) updateData.folderIds = input.folderIds;

    await adminDb.collection("vocabularies").doc(id).update(updateData);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi cập nhật từ vựng:", error);
    return { success: false, error: "Không thể cập nhật từ vựng." };
  }
}

// Cache bộ nhớ tạm trên Server (tồn tại trong vòng đời của Server Node.js)
let cachedAllVocabs: any[] | null = null;
let cachedAllFolders: Map<string, any> | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 15; // 15 phút

export async function getVocabulariesByKanji(character: string) {
  if (!character) return [];
  try {
    const now = Date.now();
    // Nếu cache đã quá hạn hoặc chưa có, ta mới fetch từ Firebase (Tối ưu cực đại Quota)
    if (!cachedAllVocabs || !cachedAllFolders || now - lastCacheTime > CACHE_TTL) {
      console.log("[CACHE MISS] Fetching ALL Vocabs & Folders for Kanji lookup...");
      const snapshot = await adminDb.collection("vocabularies").get();
      const foldersSnapshot = await adminDb.collection("folders").get();
      
      const folderMap = new Map<string, any>();
      foldersSnapshot.docs.forEach(doc => {
        folderMap.set(doc.id, { id: doc.id, name: doc.data().name, parentId: doc.data().parentId });
      });

      const allVocabs: any[] = [];
      snapshot.docs.forEach(doc => {
        allVocabs.push({ id: doc.id, ...doc.data() });
      });

      cachedAllVocabs = allVocabs;
      cachedAllFolders = folderMap;
      lastCacheTime = now;
    } else {
      console.log("[CACHE HIT] Using in-memory vocabs & folders for Kanji lookup.");
    }

    let vocabs: any[] = [];
    cachedAllVocabs.forEach(data => {
      if (data.word && data.word.includes(character)) {
        const folderVocabularies = (data.folderIds || []).map((fId: string) => ({
          folderId: fId,
          folder: cachedAllFolders!.get(fId) || { id: fId, name: "Thư mục không xác định" }
        }));
        vocabs.push({
          ...data,
          folderVocabularies
        });
      }
    });

    // Sort by createdAt desc
    vocabs.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return vocabs;
  } catch (error) {
    console.error("Lỗi khi tìm từ vựng theo Kanji:", error);
    return [];
  }
}
