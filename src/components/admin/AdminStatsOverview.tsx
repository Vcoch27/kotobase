"use client";

import React from "react";
import { Users, UserCheck, UserX, ShieldCheck, Folder, BookOpen } from "lucide-react";
import { type AdminStats } from "@/app/actions/admin";

interface AdminStatsOverviewProps {
  stats: AdminStats | null;
  loading?: boolean;
}

export function AdminStatsOverview({ stats, loading }: AdminStatsOverviewProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs animate-pulse"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 mb-3" />
            <div className="w-16 h-3 rounded bg-slate-200 dark:bg-slate-800 mb-2" />
            <div className="w-24 h-6 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Tổng người dùng",
      value: stats.totalUsers,
      sub: `${stats.totalFolders} thư mục • ${stats.totalVocabs} từ`,
      icon: Users,
      color: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50 dark:bg-blue-500/10",
      textColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-200/70 dark:border-blue-500/20",
    },
    {
      label: "Đang hoạt động",
      value: stats.activeUsers,
      sub: `${Math.round((stats.activeUsers / (stats.totalUsers || 1)) * 100)}% tổng số tài khoản`,
      icon: UserCheck,
      color: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50 dark:bg-emerald-500/10",
      textColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-200/70 dark:border-emerald-500/20",
    },
    {
      label: "Quản trị viên",
      value: stats.adminUsers,
      sub: "Có toàn quyền hệ thống",
      icon: ShieldCheck,
      color: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50 dark:bg-amber-500/10",
      textColor: "text-amber-600 dark:text-amber-400",
      borderColor: "border-amber-200/70 dark:border-amber-500/20",
    },
    {
      label: "Tài khoản bị khóa",
      value: stats.disabledUsers,
      sub: stats.disabledUsers > 0 ? "Đã ngắt quyền truy cập" : "Hệ thống an toàn",
      icon: UserX,
      color: "from-rose-500 to-red-600",
      bgLight: "bg-rose-50 dark:bg-rose-500/10",
      textColor: "text-rose-600 dark:text-rose-400",
      borderColor: "border-rose-200/70 dark:border-rose-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border ${c.borderColor} shadow-xs hover:shadow-md transition-all group`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {c.label}
              </span>
              <div
                className={`w-9 h-9 rounded-xl ${c.bgLight} ${c.textColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
              >
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {c.value.toLocaleString()}
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">
              {c.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
}
