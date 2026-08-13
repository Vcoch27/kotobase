export function getFolderFullPath(folder: any, allFolders: any[]): string {
  if (!folder.parentId) return folder.name;
  
  const parent = allFolders.find(f => f.id === folder.parentId);
  if (parent) {
    return `${getFolderFullPath(parent, allFolders)} / ${folder.name}`;
  }
  
  return folder.name;
}
