'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { assignVocabularyToFolder } from '@/app/actions/vocabulary';
import { deleteFolderAndVocabs, renameFolder } from '@/app/actions/folder';
import {
  Folder,
  ChevronRight,
  ChevronDown,
  Trash2,
  Pencil,
  Users,
  AlertTriangle,
  Type,
  MoreVertical,
  CheckCircle2,
} from 'lucide-react';
import { getDownloadedDecks } from '@/lib/offline-storage';

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
  const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(null);
  const [localFolders, setLocalFolders] = useState<FolderItem[]>([]);
  const [downloadedFolderIds, setDownloadedFolderIds] = useState<Set<string>>(new Set());

  // Lấy danh sách thư mục đã tải offline và lắng nghe thay đổi
  useEffect(() => {
    const updateDownloadedList = async () => {
      try {
        const decks = await getDownloadedDecks();
        setDownloadedFolderIds(new Set(decks.map((d) => d.folderId)));
      } catch (e) {
        console.warn('Lỗi đọc danh sách offline trong FolderTree:', e);
      }
    };

    updateDownloadedList();

    const handleOfflineChanged = () => {
      updateDownloadedList();
    };

    window.addEventListener('kotobase_offline_data_changed', handleOfflineChanged);
    return () => {
      window.removeEventListener('kotobase_offline_data_changed', handleOfflineChanged);
    };
  }, []);

  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'rename';
    targetId: string;
    targetName: string;
  }>({
    isOpen: false,
    type: 'rename',
    targetId: '',
    targetName: '',
  });
  const [promptValue, setPromptValue] = useState('');
  const promptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  // Đóng action menu khi click ra ngoài
  useEffect(() => {
    const handleGlobalClick = () => {
      if (activeMenuFolderId) setActiveMenuFolderId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [activeMenuFolderId]);

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
    setActiveMenuFolderId(null);
    setPromptValue('');
    setPromptModal({
      isOpen: true,
      type: 'delete',
      targetId: folderId,
      targetName: folderName,
    });
  };

  const handleRenameFolder = (folderId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuFolderId(null);
    setPromptValue(currentName);
    setPromptModal({
      isOpen: true,
      type: 'rename',
      targetId: folderId,
      targetName: currentName,
    });
  };

  const handlePromptSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptModal.isOpen) return;

    const { type, targetId, targetName } = promptModal;
    const value = promptValue.trim();

    // Đóng Modal ngay khi submit
    setPromptModal((prev) => ({ ...prev, isOpen: false }));

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
        setLocalFolders((prev) => prev.map((f) => (f.id === targetId ? { ...f, name: value } : f)));
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

  // Hàm kiểm tra thư mục này hoặc bất kỳ thư mục con nào đã được tải offline
  const hasRecursiveDownloaded = (node: any): boolean => {
    if (downloadedFolderIds.has(node.id)) return true;
    if (node.children && node.children.length > 0) {
      return node.children.some((child: any) => hasRecursiveDownloaded(child));
    }
    return false;
  };

  // Render recursive
  const renderTree = (nodes: any[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders[node.id];
      const isSelected = selectedFolderId === node.id;
      const hasChildren = node.children.length > 0;
      const isDragOver = dragOverFolderId === node.id;
      const totalCount = getRecursiveCount(node);
      const isDirectlyDownloaded = downloadedFolderIds.has(node.id);
      const isChildDownloaded = !isDirectlyDownloaded && hasRecursiveDownloaded(node);

      // Phân quyền hiển thị
      const isAdmin = currentUserEmail === 'hoangtungmy123@gmail.com';
      const isOwner = currentUserId && node.ownerId && node.ownerId === currentUserId;
      const hasOwner = !!node.ownerId;
      const canEdit = isOwner || isAdmin; // Chủ hoặc Admin mới có thể sửa/xóa
      const isMenuOpen = activeMenuFolderId === node.id;

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
            style={{ paddingLeft: `${level * 12 + 6}px` }}
            className={`group flex items-center gap-1.5 py-2 pr-2 my-0.5 rounded-xl cursor-pointer transition-all relative ${
              isSelected
                ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 font-bold shadow-[0_0_0_1px_rgba(99,102,241,0.2)] dark:shadow-[0_0_0_1px_rgba(99,102,241,0.4)]'
                : isDragOver
                  ? 'bg-amber-50 dark:bg-amber-500/10 shadow-[0_0_0_2px_rgba(245,158,11,1)] text-amber-700 dark:text-amber-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {/* Nút mở rộng/thu gọn thư mục con */}
            <div
              className={`w-4 h-4 flex items-center justify-center rounded-md shrink-0 transition-colors ${hasChildren ? 'hover:bg-slate-200 dark:hover:bg-slate-700' : 'opacity-0'}`}
              onClick={(e) => hasChildren && toggleExpand(node.id, e)}
            >
              {hasChildren &&
                (isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                ))}
            </div>

            {/* Icon thư mục */}
            <Folder
              className={`w-4 h-4 shrink-0 ${
                isSelected
                  ? 'text-indigo-600 dark:text-indigo-400 fill-indigo-100 dark:fill-indigo-500/20'
                  : isDragOver
                    ? 'text-amber-500 fill-amber-100'
                    : isOwner || isAdmin
                      ? 'text-indigo-500 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-slate-500'
              }`}
            />

            {/* Tên thư mục (Tối đa diện tích hiển thị) */}
            <span className="text-xs sm:text-sm font-medium truncate flex-1 min-w-0 leading-tight">
              {node.name}
            </span>

            {/* Phần thông tin phụ bên phải: Badge me + Số lượng */}
            <div className="flex items-center gap-1 shrink-0">
              {isOwner ? (
                <span
                  className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/25 px-1 py-0.2 rounded"
                  title={`Thư mục của bạn (${node.ownerEmail || ''})`}
                >
                  me
                </span>
              ) : hasOwner ? (
                <span
                  className="text-[9px] flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded text-slate-400"
                  title={`Chủ: ${node.ownerName || node.ownerEmail || 'Người dùng khác'}`}
                >
                  <Users className="w-2.5 h-2.5" />
                </span>
              ) : null}

              {/* Badge Offline nếu thư mục này hoặc thư mục con đã tải */}
              {isDirectlyDownloaded ? (
                <span
                  className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 shrink-0"
                  title="Đã tải về máy để học offline"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span className="inline">Offline</span>
                </span>
              ) : isChildDownloaded ? (
                <span
                  className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shrink-0"
                  title="Có thư mục con đã lưu offline"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span className="inline">Offline</span>
                </span>
              ) : null}

              {/* Số lượng từ */}
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  isSelected
                    ? 'bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                }`}
              >
                {totalCount}
              </span>
            </div>

            {/* Menu 3 chấm thao tác gọn gàng (Đổi tên / Xóa) - Chỉ hiện cho chủ sở hữu */}
            {canEdit && (
              <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuFolderId(isMenuOpen ? null : node.id);
                  }}
                  className={`p-1 rounded-lg transition-colors ${
                    isMenuOpen || isSelected
                      ? 'text-slate-700 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-700'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100'
                  }`}
                  title="Tùy chọn thư mục"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Dropdown Menu Popup */}
                {isMenuOpen && (
                  <div 
                    className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1 overflow-hidden animate-fadeIn text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => handleRenameFolder(node.id, node.name, e)}
                      disabled={renamingFolderId === node.id}
                      className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors text-left"
                    >
                      <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Đổi tên</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteFolder(node.id, node.name, e)}
                      disabled={deletingFolderId === node.id}
                      className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium transition-colors text-left border-t border-slate-100 dark:border-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Xóa thư mục</span>
                    </button>
                  </div>
                )}
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
      {/* Mục Tất cả từ vựng */}
      <div
        onClick={() => onSelectFolder('all')}
        className={`flex items-center justify-between gap-2 px-3 py-2.5 mb-3 rounded-xl cursor-pointer transition-all ${
          selectedFolderId === 'all'
            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-300 dark:border-amber-500/30 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent font-medium'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Folder className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-xs sm:text-sm truncate">Tất cả từ vựng</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {downloadedFolderIds.has('all') && (
            <span
              className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 shrink-0"
              title="Đã tải về máy để học offline"
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span className="hidden xs:inline">Offline</span>
            </span>
          )}
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
            {folders.reduce((acc, f) => acc + (f._count?.folderVocabularies || 0), 0)}
          </span>
        </div>
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
      {promptModal.isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-[9999] animate-fadeIn"
            onClick={() => setPromptModal((prev) => ({ ...prev, isOpen: false }))}
          ></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[9999] animate-zoomIn overflow-hidden">
            <div
              className={`p-4 ${promptModal.type === 'delete' ? 'bg-rose-50 dark:bg-rose-500/10 border-b border-rose-100 dark:border-rose-500/20' : 'bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800'}`}
            >
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
                  <h3
                    className={`font-bold ${promptModal.type === 'delete' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}
                  >
                    {promptModal.type === 'delete' ? 'CẢNH BÁO NGUY HIỂM' : 'Đổi tên thư mục'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {promptModal.type === 'delete'
                      ? 'Hành động này không thể hoàn tác!'
                      : 'Nhập tên mới cho thư mục này'}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePromptSubmit} className="p-5 space-y-4">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {promptModal.type === 'delete' ? (
                  <>
                    Hành động này sẽ <strong>XÓA VĨNH VIỄN</strong> thư mục{' '}
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      "{promptModal.targetName}"
                    </span>
                    , tất cả thư mục con, <strong>VÀ TOÀN BỘ TỪ VỰNG</strong> bên trong.
                    <p className="mt-3 text-xs">
                      Hãy gõ chữ <strong>"XOA"</strong> (viết hoa, không dấu) để xác nhận:
                    </p>
                  </>
                ) : (
                  <p className="mb-2">
                    Tên cũ: <strong>{promptModal.targetName}</strong>
                  </p>
                )}
              </div>

              <input
                ref={promptInputRef}
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={
                  promptModal.type === 'delete' ? 'Gõ XOA vào đây...' : 'Nhập tên mới...'
                }
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none transition-all"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPromptModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={
                    promptModal.type === 'delete'
                      ? promptValue !== 'XOA'
                      : !promptValue.trim() || promptValue === promptModal.targetName
                  }
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-md ${
                    promptModal.type === 'delete'
                      ? promptValue === 'XOA'
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : promptValue.trim() && promptValue !== promptModal.targetName
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {promptModal.type === 'delete' ? 'Xóa Vĩnh Viễn' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
