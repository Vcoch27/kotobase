"use client";

import React, { useState, useMemo } from "react";
import { assignVocabularyToFolder } from "@/app/actions/vocabulary";
import { deleteFolderAndVocabs, renameFolder } from "@/app/actions/folder";
import { Folder, ChevronRight, ChevronDown, Trash2, Pencil, Crown, Users } from "lucide-react";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  ownerId?: string | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
  _count?: { folderVocabularies: number };
}

interface FolderTreeProps {
  folders: FolderItem[];
  selectedFolderId: string;
  onSelectFolder: (id: string) => void;
  onRefresh: () => void;
  currentUserId?: string | null;
}

export function FolderTree({ folders, selectedFolderId, onSelectFolder, onRefresh, currentUserId }: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("kotobase_expanded_folders");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [localFolders, setLocalFolders] = useState<FolderItem[]>([]);

  React.useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  // Tự động mở các thư mục cha chứa thư mục đang được chọn
  React.useEffect(() => {
    if (selectedFolderId && selectedFolderId !== "all" && folders.length > 0) {
      const folderMap = new Map<string, FolderItem>();
      folders.forEach(f => folderMap.set(f.id, f));

      const newExpanded: Record<string, boolean> = {};
      let current = folderMap.get(selectedFolderId);
      while (current && current.parentId) {
        newExpanded[current.parentId] = true;
        current = folderMap.get(current.parentId);
      }

      if (Object.keys(newExpanded).length > 0) {
        setExpandedFolders(prev => {
          const updated = { ...prev, ...newExpanded };
          try {
            localStorage.setItem("kotobase_expanded_folders", JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    }
  }, [selectedFolderId, folders]);

  // Build tree from flat list
  const tree = useMemo(() => {
    const map = new Map<string, any>();
    localFolders.forEach(f => map.set(f.id, { ...f, children: [] }));
    const root: any[] = [];
    
    map.forEach(node => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId).children.push(node);
      } else {
        root.push(node);
      }
    });
    return root;
  }, [localFolders]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("kotobase_expanded_folders", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (dragOverFolderId !== folderId) setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const vocabId = e.dataTransfer.getData("vocabId");
    if (!vocabId) return;

    const res = await assignVocabularyToFolder(vocabId, targetFolderId);
    if (res.success) {
      onRefresh();
    } else {
      alert(res.error || "Lỗi khi chuyển thư mục!");
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmText = window.prompt(`CẢNH BÁO NGUY HIỂM: Hành động này sẽ XÓA VĨNH VIỄN thư mục "${folderName}", tất cả thư mục con, VÀ TOÀN BỘ TỪ VỰNG bên trong.\n\nHãy gõ chữ "XOA" (viết hoa, không dấu) để xác nhận:`);
    
    if (confirmText === "XOA") {
      // Optimistic update
      setLocalFolders(prev => prev.filter(f => f.id !== folderId && f.parentId !== folderId));
      if (selectedFolderId === folderId) {
        onSelectFolder("all");
      }
      setDeletingFolderId(folderId);

      const res = await deleteFolderAndVocabs(folderId);
      setDeletingFolderId(null);
      
      if (res.success) {
        onRefresh();
      } else {
        setLocalFolders(folders); // Rollback
        alert(res.error || "Không thể xóa thư mục!");
      }
    } else if (confirmText !== null) {
      alert("Xác nhận không đúng. Đã hủy thao tác xóa.");
    }
  };

  const handleRenameFolder = async (folderId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = window.prompt("Nhập tên mới cho thư mục:", currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      const trimmedName = newName.trim();
      
      // Optimistic update
      setLocalFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: trimmedName } : f));
      setRenamingFolderId(folderId);
      
      const res = await renameFolder(folderId, trimmedName);
      setRenamingFolderId(null);
      
      if (res.success) {
        onRefresh();
      } else {
        setLocalFolders(folders); // Rollback
        alert(res.error || "Không thể đổi tên thư mục!");
      }
    }
  };

  // Hàm tính tổng số từ vựng đệ quy (bao gồm cả thư mục con)
  const getRecursiveCount = (node: any): number => {
    let count = node._count?.folderVocabularies || 0;
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => {
        count += getRecursiveCount(child);
      });
    }
    return count;
  };

  // Render recursive
  const renderTree = (nodes: any[], level = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedFolders[node.id];
      const isSelected = selectedFolderId === node.id;
      const hasChildren = node.children.length > 0;
      const isDragOver = dragOverFolderId === node.id;
      const totalCount = getRecursiveCount(node);
      
      // Phân quyền hiển thị
      const isOwner = currentUserId && node.ownerId && node.ownerId === currentUserId;
      const hasOwner = !!node.ownerId;
      const canEdit = isOwner; // Chỉ chủ mới có thể sửa/xóa

      return (
        <div key={node.id} className="w-full">
          <div
            onClick={() => {
              onSelectFolder(node.id);
              if (hasChildren) {
                setExpandedFolders(prev => ({ ...prev, [node.id]: !prev[node.id] }));
              }
            }}
            onDragOver={(e) => handleDragOver(e, node.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, node.id)}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            className={`group flex items-center gap-1.5 py-1.5 pr-2 my-0.5 rounded-lg cursor-pointer transition-all ${
              isSelected ? "bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-500/30 shadow-sm" : 
              isDragOver ? "bg-amber-100 dark:bg-amber-500/20 border-2 border-dashed border-amber-500 text-amber-700 dark:text-amber-300" :
              "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
            }`}
          >
            <div 
              className={`w-4 h-4 flex items-center justify-center rounded-md shrink-0 ${hasChildren ? 'hover:bg-slate-200 dark:hover:bg-slate-700' : 'opacity-0'}`}
              onClick={(e) => hasChildren && toggleExpand(node.id, e)}
            >
              {hasChildren && (isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
            </div>
            
            {/* Icon thư mục với màu phân biệt */}
            {isOwner ? (
              <Folder className={`w-4 h-4 shrink-0 ${isSelected ? "text-indigo-500 dark:text-indigo-400" : isDragOver ? "text-amber-500" : "text-indigo-400 dark:text-indigo-500"}`} />
            ) : (
              <Folder className={`w-4 h-4 shrink-0 ${isSelected ? "text-indigo-500 dark:text-indigo-400" : isDragOver ? "text-amber-500 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"}`} />
            )}
            
            <span className="text-xs truncate flex-1">{node.name}</span>

            {/* Badge "Của tôi" hoặc icon người dùng khác */}
            {isOwner ? (
              <span 
                className="shrink-0 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 px-1.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-0.5 whitespace-nowrap"
                title={`Thư mục của bạn (${node.ownerEmail || ''})`}
              >
                <Crown className="w-2.5 h-2.5" /> Của tôi
              </span>
            ) : hasOwner ? (
              <span 
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-0.5"
                title={`Chủ: ${node.ownerName || node.ownerEmail || 'Người dùng khác'}`}
              >
                <Users className="w-3 h-3" />
              </span>
            ) : null}

            <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-900/50 px-1.5 py-0.5 rounded shrink-0 mr-1">
              {totalCount}
            </span>
            
            {/* Action buttons (Rename + Delete) - chỉ hiện cho chủ sở hữu */}
            {canEdit && (
              <div className="shrink-0 group-hover:opacity-100 opacity-0 transition-opacity flex items-center gap-0.5">
                <button
                  onClick={(e) => handleRenameFolder(node.id, node.name, e)}
                  disabled={renamingFolderId === node.id}
                  className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors disabled:opacity-50"
                  title="Đổi tên thư mục"
                >
                  {renamingFolderId === node.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Pencil className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={(e) => handleDeleteFolder(node.id, node.name, e)}
                  disabled={deletingFolderId === node.id}
                  className="p-1 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors disabled:opacity-50"
                  title="Xóa thư mục và toàn bộ từ vựng bên trong"
                >
                  {deletingFolderId === node.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
          </div>
          
          {hasChildren && isExpanded && (
            <div className="w-full">
              {renderTree(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="w-full">
      <div 
        onClick={() => onSelectFolder("all")}
        className={`flex items-center gap-2 px-2 py-2 mb-2 rounded-lg cursor-pointer transition-all ${
          selectedFolderId === "all" 
          ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-500/30 shadow-sm" 
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
        }`}
      >
        <Folder className="w-4 h-4" />
        <span className="text-xs flex-1">Tất cả từ vựng</span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded">
          {folders.reduce((acc, f) => acc + (f._count?.folderVocabularies || 0), 0)}
        </span>
      </div>
      
      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
        Cây Thư Mục (Kéo thả vào đây)
      </div>
      
      {folders.length === 0 ? (
        <div className="text-xs text-slate-400 dark:text-slate-500 italic px-2">Chưa có thư mục nào.</div>
      ) : (
        <div className="custom-scrollbar overflow-y-auto max-h-[60vh] pr-1">
          {renderTree(tree)}
        </div>
      )}
    </div>
  );
}
