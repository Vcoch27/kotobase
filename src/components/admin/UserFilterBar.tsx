"use client";

import React from "react";
import { Search, X, RotateCcw, UserPlus, Filter } from "lucide-react";

interface UserFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  role: string;
  onRoleChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onOpenCreateModal: () => void;
  totalCount: number;
}

export function UserFilterBar({
  search,
  onSearchChange,
  role,
  onRoleChange,
  status,
  onStatusChange,
  onRefresh,
  isRefreshing = false,
  onOpenCreateModal,
  totalCount,
}: UserFilterBarProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo Tên, Email hoặc UID..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Button: Create User */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm người dùng</span>
          </button>
        </div>
      </div>

      {/* Filter Badges & Count */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Bộ lọc:
          </span>

          {/* Role Filter */}
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-0 focus:ring-1 focus:ring-indigo-500 text-xs cursor-pointer"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="user">Học viên (User)</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-0 focus:ring-1 focus:ring-indigo-500 text-xs cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">🟢 Đang hoạt động</option>
            <option value="disabled">🔴 Đã bị khóa</option>
          </select>

          {/* Reset Filters button if any active */}
          {(role !== "all" || status !== "all" || search) && (
            <button
              onClick={() => {
                onSearchChange("");
                onRoleChange("all");
                onStatusChange("all");
              }}
              className="text-[11px] font-bold text-rose-500 hover:underline px-1.5 py-0.5"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Counter */}
        <div className="text-[11px] font-bold text-slate-400 ml-auto">
          Tìm thấy <span className="text-slate-800 dark:text-slate-200">{totalCount}</span> người dùng
        </div>
      </div>
    </div>
  );
}
