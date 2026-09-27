"use client";

import React from "react";
import { 
  ShieldCheck, 
  User, 
  Lock, 
  Unlock, 
  Trash2, 
  Eye, 
  MoreHorizontal, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Calendar,
  Clock
} from "lucide-react";
import { type AppUser } from "@/lib/admin-shared";
import toast from "react-hot-toast";

interface UserTableProps {
  users: AppUser[];
  currentAdminUid?: string;
  loading?: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onSelectUser: (user: AppUser) => void;
  onToggleStatus: (user: AppUser) => void;
  onToggleRole: (user: AppUser) => void;
  onDeleteUser: (user: AppUser) => void;
}

export function UserTable({
  users,
  currentAdminUid,
  loading = false,
  page,
  totalPages,
  total,
  onPageChange,
  onSelectUser,
  onToggleStatus,
  onToggleRole,
  onDeleteUser,
}: UserTableProps) {
  const [copiedUid, setCopiedUid] = React.useState<string | null>(null);

  const copyUid = (uid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    toast.success("Đã sao chép UID!");
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Chưa có";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "Chưa từng";
    try {
      const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diffSec < 60) return "Vừa xong";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
      if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)} ngày trước`;
      return formatDate(dateStr);
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center space-y-4 shadow-xs">
        <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 animate-pulse">
          Đang tải danh sách người dùng...
        </p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-xs">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
          <User className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Không tìm thấy người dùng phù hợp
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc vai trò, trạng thái.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
      {/* Table responsive container */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[750px]">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
              <th className="py-3 px-4 sm:px-5">Người dùng</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4 text-center">Vai trò</th>
              <th className="py-3 px-4 text-center">Trạng thái</th>
              <th className="py-3 px-4">Đăng nhập cuối</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
            {users.map((u) => {
              const isSelf = currentAdminUid === u.uid;
              const isAdmin = u.role === "admin";
              const isDisabled = u.status === "disabled";

              return (
                <tr
                  key={u.uid}
                  onClick={() => onSelectUser(u)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  {/* Người dùng: Avatar + Tên + UID */}
                  <td className="py-3.5 px-4 sm:px-5">
                    <div className="flex items-center gap-3">
                      {u.photoURL ? (
                        <img
                          src={u.photoURL}
                          alt={u.displayName}
                          className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          <span>{u.displayName}</span>
                          {isSelf && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                              (Bạn)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono truncate max-w-[100px]">{u.uid}</span>
                          <button
                            type="button"
                            onClick={(e) => copyUid(u.uid, e)}
                            className="p-0.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            title="Sao chép UID"
                          >
                            {copiedUid === u.uid ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-slate-800 dark:text-slate-200 truncate block max-w-[200px]" title={u.email}>
                      {u.email}
                    </span>
                  </td>

                  {/* Vai trò */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleRole(u);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                        isAdmin
                          ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                      }`}
                      title="Nhấn để thay đổi vai trò"
                    >
                      {isAdmin ? <ShieldCheck className="w-3 h-3 text-rose-500" /> : <User className="w-3 h-3 text-slate-400" />}
                      <span>{isAdmin ? "Admin" : "Học viên"}</span>
                    </button>
                  </td>

                  {/* Trạng thái */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isDisabled
                          ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                          : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isDisabled ? "bg-rose-500" : "bg-emerald-500"}`} />
                      <span>{isDisabled ? "Bị khóa" : "Hoạt động"}</span>
                    </span>
                  </td>

                  {/* Lần đăng nhập cuối */}
                  <td className="py-3.5 px-4">
                    <div className="text-slate-800 dark:text-slate-200 font-medium">
                      {formatRelativeTime(u.lastLoginAt)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Tạo: {formatDate(u.createdAt).split(" ")[0]}
                    </div>
                  </td>

                  {/* Thao tác */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Xem chi tiết */}
                      <button
                        type="button"
                        onClick={() => onSelectUser(u)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="Xem hồ sơ chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Khóa / Mở khóa (Không được khóa chính mình) */}
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => onToggleStatus(u)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDisabled
                              ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                              : "text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                          }`}
                          title={isDisabled ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                        >
                          {isDisabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                      )}

                      {/* Xóa người dùng (Không được xóa chính mình) */}
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(u)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Xóa tài khoản vĩnh viễn"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40">
        <div>
          Hiển thị <span className="font-bold text-slate-700 dark:text-slate-300">{users.length}</span> / {total} người dùng
        </div>

        <div className="flex items-center gap-2">
          <span>
            Trang <strong className="text-slate-800 dark:text-slate-200">{page}</strong> / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Trang tiếp"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
