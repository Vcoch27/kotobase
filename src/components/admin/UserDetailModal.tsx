"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  User, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Save, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  FileText, 
  Mail, 
  Fingerprint,
  Sparkles
} from "lucide-react";
import { type AppUser } from "@/lib/admin-shared";
import toast from "react-hot-toast";

interface UserDetailModalProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateRole: (user: AppUser, newRole: "admin" | "user") => void;
  onToggleStatus: (user: AppUser) => void;
  onSaveNotes: (uid: string, notes: string) => Promise<boolean>;
  currentAdminUid?: string;
}

export function UserDetailModal({
  user,
  isOpen,
  onClose,
  onUpdateRole,
  onToggleStatus,
  onSaveNotes,
  currentAdminUid,
}: UserDetailModalProps) {
  const [notes, setNotes] = useState(user?.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setNotes(user?.notes || "");
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const isSelf = currentAdminUid === user.uid;
  const isAdmin = user.role === "admin";
  const isDisabled = user.status === "disabled";

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.uid);
    setCopied(true);
    toast.success("Đã sao chép UID!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const ok = await onSaveNotes(user.uid, notes);
    setSavingNotes(false);
    if (ok) {
      toast.success("Đã lưu ghi chú thành công!");
    } else {
      toast.error("Không thể lưu ghi chú.");
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Chưa xác định";
    try {
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 dark:border-slate-800 flex flex-col animate-fadeIn scale-in my-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with profile banner */}
        <div className="relative p-6 bg-gradient-to-br from-indigo-50/80 dark:from-indigo-950/40 via-white dark:via-slate-900 to-amber-50/80 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    isAdmin
                      ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                      : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20"
                  }`}
                >
                  {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {isAdmin ? "Quản trị viên" : "Học viên"}
                </span>

                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    isDisabled
                      ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 border-rose-200"
                      : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isDisabled ? "bg-rose-500" : "bg-emerald-500"}`} />
                  {isDisabled ? "Đang bị khóa" : "Đang hoạt động"}
                </span>
              </div>

              <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
                {user.displayName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3" /> {user.email}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable details */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar text-xs">
          {/* UID & Metadata grid */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-indigo-500" /> Mã UID:
              </span>
              <button
                type="button"
                onClick={handleCopyUid}
                className="font-mono text-slate-800 dark:text-slate-200 flex items-center gap-1 hover:text-indigo-600 transition-colors"
                title="Sao chép toàn bộ UID"
              >
                <span>{user.uid}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
              <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" /> Ngày tham gia:
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formatDate(user.createdAt)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
              <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" /> Đăng nhập lần cuối:
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formatDate(user.lastLoginAt)}
              </span>
            </div>
          </div>

          {/* Quick Role & Status Actions */}
          {!isSelf && (
            <div className="space-y-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Thay đổi quyền & Trạng thái:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateRole(user, isAdmin ? "user" : "admin")}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isAdmin
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                      : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isAdmin ? "Hạ xuống Học viên" : "Cấp quyền Admin"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleStatus(user)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isDisabled
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100"
                      : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 hover:bg-amber-100"
                  }`}
                >
                  {isDisabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>{isDisabled ? "Mở khóa tài khoản" : "Khóa tài khoản"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Admin Internal Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Ghi chú nội bộ của Quản trị viên:
              </label>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú hoặc nhắc nhở riêng về học viên này..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
            />
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingNotes ? "Đang lưu..." : "Lưu ghi chú"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
