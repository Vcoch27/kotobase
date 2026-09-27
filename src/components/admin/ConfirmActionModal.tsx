"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X, Trash2, Lock } from "lucide-react";

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  confirmVariant?: "danger" | "warning";
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmActionModal({
  isOpen,
  title,
  description,
  confirmText = "Xác nhận",
  confirmVariant = "danger",
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const isDanger = confirmVariant === "danger";

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5">
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      <div 
        className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200/80 dark:border-slate-800 flex flex-col animate-fadeIn scale-in my-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isDanger
                ? "bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
            }`}
          >
            {loading ? "Đang xử lý..." : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
