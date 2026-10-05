"use client";

import React, { useState } from "react";
import {
  X,
  Bell,
  CheckCheck,
  Sparkles,
  Zap,
  Wrench,
  Megaphone,
  ChevronRight,
  ExternalLink,
  LogIn,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { SystemNotificationItem, NotificationType } from "@/app/actions/notification";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SystemNotificationItem[];
  readIds: Set<string>;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  isLoggedIn: boolean;
  onLoginRequest?: () => void;
}

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: React.ElementType; colorClass: string; bgClass: string; borderClass: string }
> = {
  feature: {
    label: "Tính năng mới",
    icon: Sparkles,
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-50 dark:bg-indigo-500/10",
    borderClass: "border-indigo-200/80 dark:border-indigo-500/30",
  },
  improvement: {
    label: "Cải tiến",
    icon: Zap,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-500/10",
    borderClass: "border-amber-200/80 dark:border-amber-500/30",
  },
  fix: {
    label: "Sửa lỗi",
    icon: Wrench,
    colorClass: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-50 dark:bg-rose-500/10",
    borderClass: "border-rose-200/80 dark:border-rose-500/30",
  },
  announcement: {
    label: "Thông báo",
    icon: Megaphone,
    colorClass: "text-sky-600 dark:text-sky-400",
    bgClass: "bg-sky-50 dark:bg-sky-500/10",
    borderClass: "border-sky-200/80 dark:border-sky-500/30",
  },
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  readIds,
  onMarkAsRead,
  onMarkAllAsRead,
  isLoggedIn,
  onLoginRequest,
}: NotificationDrawerProps) {
  const [selectedNotification, setSelectedNotification] = useState<SystemNotificationItem | null>(null);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const handleSelect = (n: SystemNotificationItem) => {
    setSelectedNotification(n);
    if (!readIds.has(n.id)) {
      onMarkAsRead(n.id);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <aside
        className={cn(
          "relative w-full max-w-md sm:max-w-lg h-full bg-white dark:bg-slate-900",
          "border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10",
          "animate-slideInRight duration-200 ease-out"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-500/20">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Thông báo & Cập nhật
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white animate-pulse">
                    {unreadCount} mới
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nhật ký tính năng & cải tiến KotoBase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đã đọc tất cả</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chưa đăng nhập -> Banner nhắc nhở */}
        {!isLoggedIn && (
          <div className="m-3 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="text-amber-800 dark:text-amber-300">
              <span className="font-bold">Đăng nhập để nhận thông báo:</span>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-0.5">
                Đồng bộ trạng thái đã đọc và cập nhật mới nhất trên mọi thiết bị.
              </p>
            </div>
            {onLoginRequest && (
              <button
                type="button"
                onClick={onLoginRequest}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 shadow-sm transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                Đăng nhập
              </button>
            )}
          </div>
        )}

        {/* Danh sách thông báo */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold">Chưa có thông báo nào</p>
              <p className="text-[11px] mt-1">Các bản cập nhật mới sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            notifications.map((item) => {
              const isRead = readIds.has(item.id);
              const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.feature;
              const IconComp = config.icon;
              const isExpanded = selectedNotification?.id === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer group text-left relative",
                    isRead
                      ? "bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      : "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-300 shadow-xs"
                  )}
                >
                  {/* Chấm tròn chưa đọc */}
                  {!isRead && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
                  )}

                  {/* Header thẻ */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        config.bgClass,
                        config.colorClass,
                        config.borderClass
                      )}
                    >
                      <IconComp className="w-2.5 h-2.5" />
                      {item.tag || config.label}
                    </span>

                    {item.version && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {item.version}
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 ml-auto mr-4">
                      <Calendar className="w-2.5 h-2.5" />
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  {/* Tiêu đề & Tóm tắt */}
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {item.summary}
                  </p>

                  {/* Chi tiết khi mở rộng */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2 animate-fadeIn whitespace-pre-line leading-relaxed bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                      {item.content}

                      {item.link && (
                        <div className="pt-2">
                          <a
                            href={item.link}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Trải nghiệm ngay <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer hint */}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                    <span>{isExpanded ? "Thu gọn" : "Bấm để xem chi tiết"}</span>
                    {isRead ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Đã đọc
                      </span>
                    ) : (
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                        Chưa đọc <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
          KotoBase • Nền tảng học tiếng Nhật thông minh
        </div>
      </aside>
    </div>
  );
}
