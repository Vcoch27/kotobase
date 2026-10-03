'use client';

import React, { useState, useMemo } from 'react';
import { 
  FolderInput, 
  Copy, 
  FolderPlus, 
  Search, 
  X, 
  Check, 
  Loader2, 
  Folder, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Globe,
  Lock,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getFolderFullPath, canUserManageFolder, isUserFolderCoAuthor } from '@/lib/folder-utils';
import { moveBulkVocabulary, copyBulkVocabulary } from '@/app/actions/vocabulary';
import { createFolder } from '@/app/actions/folder';

interface SelectedVocabItem {
  id: string;
  word: string;
  meaning?: string;
}

interface BulkFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVocabs: SelectedVocabItem[];
  folders: any[];
  currentUser?: { uid: string; email: string; name?: string; picture?: string } | null;
  onSuccess: () => void;
  onFoldersUpdated?: () => void;
}

export function BulkFolderModal({
  isOpen,
  onClose,
  selectedVocabs,
  folders: initialFolders,
  currentUser,
  onSuccess,
  onFoldersUpdated,
}: BulkFolderModalProps) {
  const [mode, setMode] = useState<'move' | 'copy'>('move');
  const [selectedTargetFolderId, setSelectedTargetFolderId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Thư mục cục bộ (có thể tăng thêm khi tạo nhanh)
  const [localFolders, setLocalFolders] = useState<any[]>(initialFolders);

  // Form tạo nhanh thư mục mới
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string>('');
  const [newFolderIsPublic, setNewFolderIsPublic] = useState(true);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Cập nhật localFolders nếu initialFolders từ props thay đổi
  React.useEffect(() => {
    setLocalFolders(initialFolders);
  }, [initialFolders]);

  if (!isOpen) return null;

  const count = selectedVocabs.length;

  // Lọc các thư mục mà người dùng có quyền quản trị/đồng tác giả/chủ sở hữu
  const manageableFolders = useMemo(() => {
    return localFolders.filter((f) =>
      canUserManageFolder(f, localFolders, currentUser?.uid, currentUser?.email)
    );
  }, [localFolders, currentUser]);

  // Tìm kiếm theo tên hoặc đường dẫn đầy đủ
  const filteredFolders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return manageableFolders;

    return manageableFolders.filter((f) => {
      const fullPath = getFolderFullPath(f, localFolders).toLowerCase();
      return fullPath.includes(q);
    });
  }, [manageableFolders, searchQuery, localFolders]);

  // Tạo nhanh thư mục mới
  const handleQuickCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      toast.error('Vui lòng nhập tên thư mục!');
      return;
    }

    setIsCreatingFolder(true);
    try {
      const res = await createFolder(
        newFolderName.trim(),
        newFolderParentId || undefined,
        newFolderIsPublic
      );

      if (res.success && res.folder) {
        const created = res.folder;
        setLocalFolders((prev) => [...prev, created]);
        setSelectedTargetFolderId(created.id);
        setShowCreateFolder(false);
        setNewFolderName('');
        setNewFolderParentId('');
        toast.success(`Đã tạo thư mục "${created.name}" và chọn làm đích!`);
        onFoldersUpdated?.();
      } else {
        toast.error(res.error || 'Không thể tạo thư mục.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo thư mục.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Thực hiện di chuyển hoặc sao chép
  const handleSubmit = async () => {
    if (!selectedTargetFolderId) {
      toast.error('Vui lòng chọn thư mục đích!');
      return;
    }

    const ids = selectedVocabs.map((v) => v.id);
    setIsSubmitting(true);

    try {
      if (mode === 'move') {
        const res = await moveBulkVocabulary(ids, selectedTargetFolderId);
        if (res.success) {
          toast.success(`Đã di chuyển thành công ${res.count || ids.length} từ vựng!`);
          onSuccess();
          onClose();
        } else {
          toast.error(res.error || 'Lỗi khi di chuyển từ vựng!');
        }
      } else {
        const res = await copyBulkVocabulary(ids, selectedTargetFolderId);
        if (res.success) {
          toast.success(`Đã sao chép thành công ${res.count || ids.length} từ vựng!`);
          onSuccess();
          onClose();
        } else {
          toast.error(res.error || 'Lỗi khi sao chép từ vựng!');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Đã xảy ra lỗi!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTargetFolder = localFolders.find((f) => f.id === selectedTargetFolderId);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              {mode === 'move' ? <FolderInput className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {mode === 'move' ? 'Di chuyển' : 'Sao chép'} {count} từ vựng
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Chọn thư mục đích để gom nhóm từ vựng đã chọn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 [scrollbar-width:thin]">
          {/* Segmented Mode Selector: Di chuyển vs Sao chép */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setMode('move')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                mode === 'move'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FolderInput className="w-4 h-4" />
              <span>Di chuyển (Gỡ khỏi cũ)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('copy')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                mode === 'copy'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Copy className="w-4 h-4" />
              <span>Sao chép (Nhân bản mới)</span>
            </button>
          </div>

          {/* Quick Notice */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 px-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              {mode === 'move'
                ? 'Các từ vựng sẽ được chuyển hẳn sang thư mục mới.'
                : 'Tạo bản sao độc lập của các từ vựng này trong thư mục mới.'}
            </span>
          </div>

          {/* Search & Create New Folder Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Chọn thư mục đích:
              </label>
              <button
                type="button"
                onClick={() => setShowCreateFolder(!showCreateFolder)}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{showCreateFolder ? 'Đóng tạo thư mục' : '+ Tạo thư mục mới'}</span>
              </button>
            </div>

            {/* Inline Create Folder Form */}
            {showCreateFolder && (
              <form
                onSubmit={handleQuickCreateFolder}
                className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 space-y-3 animate-fadeIn"
              >
                <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4 text-indigo-500" />
                  <span>Tạo nhanh thư mục mới</span>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Tên thư mục mới (VD: Unit 11, Từ khó...)"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={newFolderParentId}
                    onChange={(e) => setNewFolderParentId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 text-xs text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="">-- Thư mục gốc (Root) --</option>
                    {manageableFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {getFolderFullPath(f, localFolders)}
                      </option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer px-1">
                    <input
                      type="checkbox"
                      checked={newFolderIsPublic}
                      onChange={(e) => setNewFolderIsPublic(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Công khai thư mục</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreateFolder(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingFolder || !newFolderName.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {isCreatingFolder ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Đang tạo...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Tạo và chọn ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm thư mục đích..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Folder List (Radio selectable) */}
          <div className="space-y-1 max-h-52 overflow-y-auto pr-1 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-900/50 [scrollbar-width:thin]">
            {filteredFolders.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Không tìm thấy thư mục nào phù hợp hoặc bạn chưa có quyền quản lý thư mục nào.
              </div>
            ) : (
              filteredFolders.map((f) => {
                const isSelected = selectedTargetFolderId === f.id;
                const fullPath = getFolderFullPath(f, localFolders);
                const isCoAuthor = isUserFolderCoAuthor(f, localFolders, currentUser?.uid, currentUser?.email);

                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedTargetFolderId(f.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-600/50 text-indigo-950 dark:text-indigo-100 font-bold shadow-xs'
                        : 'hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                      <span className="text-xs truncate" title={fullPath}>
                        {fullPath}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isCoAuthor && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium">
                          Đồng tác giả
                        </span>
                      )}
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Target Preview */}
          {selectedTargetFolder && (
            <div className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/40 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Đích đến:</span>
              <strong className="truncate font-bold">{getFolderFullPath(selectedTargetFolder, localFolders)}</strong>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedTargetFolderId}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : mode === 'move' ? (
              <>
                <FolderInput className="w-3.5 h-3.5" />
                <span>Di chuyển ({count} từ)</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép ({count} từ)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
