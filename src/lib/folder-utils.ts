export function getFolderFullPath(folder: any, allFolders: any[], visited = new Set<string>()): string {
  if (!folder) return '';
  if (visited.has(folder.id)) return folder.name || '';
  visited.add(folder.id);

  if (!folder.parentId) return folder.name || '';
  
  const folders = Array.isArray(allFolders) ? allFolders : [];
  const parent = folders.find(f => f && f.id === folder.parentId);
  if (parent) {
    return `${getFolderFullPath(parent, folders, visited)} / ${folder.name || ''}`;
  }
  
  return folder.name || '';
}

/**
 * Kiểm tra xem user có quyền quản lý thư mục không (Admin, Chủ sở hữu hoặc Đồng tác giả)
 * Có hỗ trợ kế thừa từ các thư mục cha/ông/tổ tiên
 */
export function canUserManageFolder(
  folder: any,
  allFolders: any[],
  userUid?: string | null,
  userEmail?: string | null
): boolean {
  if (!folder) return false;
  if (!userEmail) return false;
  if (userEmail === "hoangtungmy123@gmail.com") return true;

  const folderMap = new Map<string, any>();
  if (Array.isArray(allFolders)) {
    allFolders.forEach(f => {
      if (f && f.id) folderMap.set(f.id, f);
    });
  }

  let curr: any = folder;
  const visited = new Set<string>();

  while (curr) {
    if (visited.has(curr.id)) break;
    visited.add(curr.id);

    // Kiểm tra chủ sở hữu
    if (userUid && curr.ownerId && curr.ownerId === userUid) {
      return true;
    }

    // Kiểm tra đồng tác giả
    if (Array.isArray(curr.coAuthorEmails) && curr.coAuthorEmails.includes(userEmail)) {
      return true;
    }

    curr = curr.parentId ? folderMap.get(curr.parentId) : null;
  }

  return false;
}

/**
 * Kiểm tra xem user có phải là Đồng tác giả của thư mục này không (không phải chủ sở hữu, không phải admin)
 */
export function isUserFolderCoAuthor(
  folder: any,
  allFolders: any[],
  userUid?: string | null,
  userEmail?: string | null
): boolean {
  if (!folder) return false;
  if (!userEmail || userEmail === "hoangtungmy123@gmail.com") return false;
  // Nếu là chủ của chính thư mục này thì không gọi là co-author
  if (userUid && folder.ownerId && folder.ownerId === userUid) return false;
  return canUserManageFolder(folder, allFolders, userUid, userEmail);
}
