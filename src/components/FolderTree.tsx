'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { assignVocabularyToFolder } from '@/app/actions/vocabulary';
import { deleteFolderAndVocabs, renameFolder } from '@/app/actions/folder';
import { Folder, ChevronRight, ChevronDown, Trash2, Pencil, Crown, Users, AlertTriangle, Type } from 'lucide-react';

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
  currentUserEmail?: string | null;
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onRefresh,
  currentUserId,
  currentUserEmail,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kotobase_expanded_folders');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [localFolders, setLocalFolders] = useState<FolderItem[]>([]);

  // States cho Custom Prompt Modal
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'rename';
    targetId: string;
    targetName: string;
  }>({
    isOpen: false,
    type: 'rename',
    targetId: '',
    targetName: ''
  });
  const [promptValue, setPromptValue] = useState('');
  const promptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  useEffect(() => {
    if (promptModal.isOpen && promptInputRef.current) {
      setTimeout(() => {
        promptInputRef.current?.focus();
        if (promptModal.type === 'rename') {
          promptInputRef.current?.select();
        }
      }, 50);
    }
  }, [promptModal.isOpen, promptModal.type]);

  // Tự động mở các thư mục cha chứa thư mục đang được chọn
  React.useEffect(() => {
    if (selectedFolderId && selectedFolderId !== 'all' && folders.length > 0) {
      const folderMap = new Map<string, FolderItem>();
      folders.forEach((f) => folderMap.set(f.id, f));

      const newExpanded: Record<string, boolean> = {};
      let current = folderMap.get(selectedFolderId);
      while (current && current.parentId) {
        newExpanded[current.parentId] = true;
        current = folderMap.get(current.parentId);
      }

      if (Object.keys(newExpanded).length > 0) {
        setExpandedFolders((prev) => {
          const updated = { ...prev, ...newExpanded };
          try {
            localStorage.setItem('kotobase_expanded_folders', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    }
  }, [selectedFolderId, folders]);

  // Build tree from flat list
  const tree = useMemo(() => {
    const map = new Map<string, any>();
    localFolders.forEach((f) => map.set(f.id, { ...f, children: [] }));
    const root: any[] = [];

    map.forEach((node) => {
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
    setExpandedFolders((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('kotobase_expanded_folders', JSON.stringify(updated));
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
    const vocabId = e.dataTransfer.getData('vocabId');
    if (!vocabId) return;

    const res = await assignVocabularyToFolder(vocabId, targetFolderId);
    if (res.success) {
      onRefresh();
    } else {
        toast.error(res.error || 'Lỗi khi chuyển thư mục!');
    }
  };

  const handleDeleteFolder = (folderId: string, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPromptValue('');
    setPromptModal({
      isOpen: true,
      type: 'delete',
      targetId: folderId,
      targetName: folderName
    });
  };

  const handleRenameFolder = (folderId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPromptValue(currentName);
    setPromptModal({
      isOpen: true,
      type: 'rename',
      targetId: folderId,
      targetName: currentName
    });
  };

  const handlePromptSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptModal.isOpen) return;

    const { type, targetId, targetName } = promptModal;
    const value = promptValue.trim();

    // Đóng Modal ngay khi submit
    setPromptModal(prev => ({ ...prev, isOpen: false }));

    if (type === 'delete') {
      if (promptValue === 'XOA') {
        // Optimistic update
        setLocalFolders((prev) => prev.filter((f) => f.id !== targetId && f.parentId !== targetId));
        if (selectedFolderId === targetId) {
          onSelectFolder('all');
        }
        setDeletingFolderId(targetId);

        const res = await deleteFolderAndVocabs(targetId);
        setDeletingFolderId(null);

        if (res.success) {
          toast.success(`Đã xoá thư mục ${targetName}`);
          onRefresh();
        } else {
          setLocalFolders(folders); // Rollback
          toast.error(res.error || 'Không thể xóa thư mục!');
        }
      } else {
        toast.error('Xác nhận không đúng. Đã hủy thao tác xóa.');
      }
    } else if (type === 'rename') {
      if (value && value !== targetName) {
        // Optimistic update
        setLocalFolders((prev) =>
          prev.map((f) => (f.id === targetId ? { ...f, name: value } : f))
        );
        setRenamingFolderId(targetId);

        const res = await renameFolder(targetId, value);
        setRenamingFolderId(null);

        if (res.success) {
          toast.success(`Đã đổi tên thư mục thành ${value}`);
          onRefresh();
        } else {
          setLocalFolders(folders); // Rollback
          toast.error(res.error || 'Không thể đổi tên thư mục!');
        }
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
    return nodes.map((node) => {
      const isExpanded = expandedFolders[node.id];
      const isSelected = selectedFolderId === node.id;
      const hasChildren = node.children.length > 0;
      const isDragOver = dragOverFolderId === node.id;
      const totalCount = getRecursiveCount(node);

      // Phân quyền hiển thị
      const isAdmin = currentUserEmail === "hoangtungmy123@gmail.com";
      const isOwner = currentUserId && node.ownerId && node.ownerId === currentUserId;
      const hasOwner = !!node.ownerId;
      const canEdit = isOwner || isAdmin; // Chủ hoặc Admin mới có thể sửa/xóa

      return (
        <div key={node.id} className="w-full relative">
          <div
            onClick={() => {
              onSelectFolder(node.id);
              if (hasChildren) {
                setExpandedFolders((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
              }
            }}
            onDragOver={(e) => handleDragOver(e, node.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, node.id)}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            className={`group flex items-center gap-2 py-2 pr-2 my-1 rounded-xl cursor-pointer transition-all ${
              isSelected
                ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 font-bold shadow-[0_0_0_1px_rgba(99,102,241,0.2)] dark:shadow-[0_0_0_1px_rgba(99,102,241,0.4)]'
                : isDragOver
                  ? 'bg-amber-50 dark:bg-amber-500/10 shadow-[0_0_0_2px_rgba(245,158,11,1)] text-amber-700 dark:text-amber-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div
              className={`w-5 h-5 flex items-center justify-center rounded-md shrink-0 transition-colors ${hasChildren ? 'hover:bg-slate-200 dark:hover:bg-slate-700' : 'opacity-0'}`}
              onClick={(e) => hasChildren && toggleExpand(node.id, e)}
            >
              {hasChildren &&
                (isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                ))}
            </div>

            {/* Icon thư mục */}
            {isOwner || isAdmin ? (
              <Folder
                className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400 fill-indigo-100 dark:fill-indigo-500/20' : isDragOver ? 'text-amber-500 fill-amber-100' : 'text-indigo-500 dark:text-indigo-500'}`}
              />
            ) : (
              <Folder
                className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-500 dark:text-indigo-400' : isDragOver ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}
              />
            )}

            <span className="text-sm truncate flex-1 leading-none pt-0.5">{node.name}</span>

            {/* Phần thông tin phụ bên phải */}
            <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
              {/* Badge "Của tôi" hoặc icon người dùng khác */}
              {isOwner ? (
                <span
                  className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/30 px-1.5 py-0.5 rounded-md"
                  title={`Thư mục của bạn (${node.ownerEmail || ''})`}
                >
                  me
                </span>
              ) : hasOwner ? (
                <span
                  className="text-[10px] flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-slate-500"
                  title={`Chủ: ${node.ownerName || node.ownerEmail || 'Người dùng khác'}`}
                >
                  <Users className="w-3 h-3" />
                </span>
              ) : null}

              {/* Số lượng */}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center ${isSelected ? 'bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                {totalCount}
              </span>
            </div>

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
            <div className="w-full">{renderTree(node.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="w-full">
      <div
        onClick={() => onSelectFolder('all')}
        className={`flex items-center gap-2 px-2 py-2 mb-2 rounded-lg cursor-pointer transition-all ${
          selectedFolderId === 'all'
            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-500/30 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
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
        <div className="text-xs text-slate-400 dark:text-slate-500 italic px-2">
          Chưa có thư mục nào.
        </div>
      ) : (
        <div className="custom-scrollbar overflow-y-auto max-h-[60vh] pr-1">{renderTree(tree)}</div>
      )}

      {/* Custom Prompt Modal (Thay thế window.prompt) */}
      {promptModal.isOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-50 animate-fadeIn" onClick={() => setPromptModal(prev => ({ ...prev, isOpen: false }))}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 animate-zoomIn overflow-hidden">
            <div className={`p-4 ${promptModal.type === 'delete' ? 'bg-rose-50 dark:bg-rose-500/10 border-b border-rose-100 dark:border-rose-500/20' : 'bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800'}`}>
              <div className="flex items-center gap-3">
                {promptModal.type === 'delete' ? (
                  <div className="p-2 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Type className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className={`font-bold ${promptModal.type === 'delete' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {promptModal.type === 'delete' ? 'CẢNH BÁO NGUY HIỂM' : 'Đổi tên thư mục'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {promptModal.type === 'delete' ? 'Hành động này không thể hoàn tác!' : 'Nhập tên mới cho thư mục này'}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePromptSubmit} className="p-5 space-y-4">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {promptModal.type === 'delete' ? (
                  <>
                    Hành động này sẽ <strong>XÓA VĨNH VIỄN</strong> thư mục <span className="font-bold text-rose-600 dark:text-rose-400">"{promptModal.targetName}"</span>, tất cả thư mục con, <strong>VÀ TOÀN BỘ TỪ VỰNG</strong> bên trong.
                    <p className="mt-3 text-xs">Hãy gõ chữ <strong>"XOA"</strong> (viết hoa, không dấu) để xác nhận:</p>
                  </>
                ) : (
                  <p className="mb-2">Tên cũ: <strong>{promptModal.targetName}</strong></p>
                )}
              </div>

              <input
                ref={promptInputRef}
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={promptModal.type === 'delete' ? 'Gõ XOA vào đây...' : 'Nhập tên mới...'}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none transition-all"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPromptModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={promptModal.type === 'delete' ? promptValue !== 'XOA' : (!promptValue.trim() || promptValue === promptModal.targetName)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-md ${
                    promptModal.type === 'delete'
                      ? (promptValue === 'XOA' ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed')
                      : ((promptValue.trim() && promptValue !== promptModal.targetName) ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed')
                  }`}
                >
                  {promptModal.type === 'delete' ? 'Xóa Vĩnh Viễn' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
