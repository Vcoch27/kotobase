"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, X, ChevronRight, Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SystemNotificationItem } from "@/app/actions/notification";

interface NotificationAlertToastProps {
  latestNotification: SystemNotificationItem | null;
  isRead: boolean;
  onOpenDrawer: () => void;
}

const SESSION_DISMISS_KEY = "kotobase_dismissed_toast_id";

export function NotificationAlertToast({
  latestNotification,
  isRead,
  onOpenDrawer,
}: NotificationAlertToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!latestNotification || isRead) {
      setIsVisible(false);
      return;
    }

    // Kiểm tra xem đã bị dismiss trong phiên làm việc hiện tại chưa
    try {
      const dismissedId = sessionStorage.getItem(SESSION_DISMISS_KEY);
      if (dismissedId === latestNotification.id) {
        return;
      }
    } catch {}

    // Delay 1.5s trước khi trượt ra để trải nghiệm êm ái
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    // Tự động ẩn sau 12s
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 13500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [latestNotification, isRead]);

  const handleDismiss = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsVisible(false);
    setIsDismissed(true);
    if (latestNotification) {
      try {
        sessionStorage.setItem(SESSION_DISMISS_KEY, latestNotification.id);
      } catch {}
    }
  };

  const handleOpen = () => {
    handleDismiss();
    onOpenDrawer();
  };

  if (!latestNotification || isRead || isDismissed || !isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed z-[100] max-w-sm sm:max-w-md w-[calc(100vw-2rem)]",
        "bottom-20 md:bottom-6 right-4 sm:right-6",
        "animate-slideUp transition-all duration-300"
      )}
    >
      <div
        onClick={handleOpen}
        className={cn(
          "relative overflow-hidden cursor-pointer",
          "p-3.5 sm:p-4 rounded-2xl",
          "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md",
          "border border-indigo-200/90 dark:border-indigo-500/30",
          "shadow-2xl shadow-indigo-500/10 hover:shadow-indigo-500/20",
          "hover:border-indigo-400 dark:hover:border-indigo-400 transition-all duration-200",
          "group"
        )}
      >
        {/* Thanh accent màu sắc trên đỉnh card */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />

        <div className="flex items-start gap-3">
          {/* Icon nổi bật với hiệu ứng pulse */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 animate-spin-slow" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                {latestNotification.tag || "Cập nhật mới"}
              </span>
              {latestNotification.version && (
                <span className="text-[10px] text-slate-400 font-semibold">
                  {latestNotification.version}
                </span>
              )}
            </div>

            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {latestNotification.title}
            </h4>

            <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
              {latestNotification.summary}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                Xem chi tiết <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Nút đóng X */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
