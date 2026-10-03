'use client';

import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface SelectedVocabItem {
  id: string;
  word: string;
  meaning?: string;
}

interface BulkDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVocabs: SelectedVocabItem[];
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

export function BulkDeleteConfirmModal({
  isOpen,
  onClose,
  selectedVocabs,
  onConfirm,
  loading = false,
}: BulkDeleteConfirmModalProps) {
  if (!isOpen) return null;

  const count = selectedVocabs.length;
  const previewList = selectedVocabs.slice(0, 10);
  const remainingCount = Math.max(0, count - previewList.length);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 animate-scaleUp overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Xác nhận xóa hàng loạt
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thao tác sẽ áp dụng cho toàn bộ từ vựng đã chọn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed font-medium">
            Bạn có chắc chắn muốn xóa vĩnh viễn <strong className="font-extrabold text-rose-900 dark:text-rose-100">{count} từ vựng</strong> đã chọn không? Hành động này <strong>không thể hoàn tác</strong>!
          </div>
        </div>

        {/* Vocabulary Preview List */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Các từ vựng sẽ bị xóa ({count}):
          </label>
          <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-wrap gap-1.5 [scrollbar-width:thin]">
            {previewList.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 shadow-xs"
                title={item.meaning || ''}
              >
                {item.word}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-slate-200/70 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300">
                +{remainingCount} từ khác
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 rounded-xl shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận xóa ({count})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
