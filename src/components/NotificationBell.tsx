"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  getSystemNotifications,
  getUserReadNotificationIds,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type SystemNotificationItem,
} from "@/app/actions/notification";
import { NotificationDrawer } from "./NotificationDrawer";
import { NotificationAlertToast } from "./NotificationAlertToast";

const LOCAL_STORAGE_READ_KEY = "kotobase_read_notification_ids";

interface NotificationBellProps {
  currentUser?: { uid: string; email: string; name?: string; picture?: string } | null;
  onLoginRequest?: () => void;
  className?: string;
}

export function NotificationBell({
  currentUser,
  onLoginRequest,
  className,
}: NotificationBellProps) {
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Đọc danh sách ID đã đọc từ localStorage
  const getLocalReadIds = useCallback((): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_READ_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {}
    return new Set();
  }, []);

  // Lưu danh sách ID đã đọc vào localStorage
  const saveLocalReadIds = useCallback((newSet: Set<string>) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_READ_KEY, JSON.stringify(Array.from(newSet)));
    } catch {}
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Khởi tạo: Lấy thông báo và danh sách đã đọc
  useEffect(() => {
    let isCancelled = false;

    async function init() {
      try {
        // 1. Đọc ngay từ localStorage
        const localRead = getLocalReadIds();
        if (!isCancelled) {
          setReadIds(localRead);
        }

        // 2. Lấy thông báo hệ thống (từ Next.js cache, an toàn)
        const list = await getSystemNotifications();
        if (isCancelled) return;
        setNotifications(Array.isArray(list) ? list : []);

        // 3. Nếu có user đăng nhập -> đồng bộ danh sách đã đọc từ Firestore
        if (currentUser?.uid) {
          const userReadList = await getUserReadNotificationIds(currentUser.uid);
          if (!isCancelled && Array.isArray(userReadList) && userReadList.length > 0) {
            const merged = new Set([...Array.from(localRead), ...userReadList]);
            setReadIds(merged);
            saveLocalReadIds(merged);
          }
        }
      } catch (err) {
        console.warn("Không thể tải thông báo hệ thống:", err);
      } finally {
        if (!isCancelled) {
          setHasLoaded(true);
        }
      }
    }

    init();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.uid, getLocalReadIds, saveLocalReadIds]);

  // Đánh dấu 1 thông báo đã đọc
  const handleMarkAsRead = useCallback(
    async (id: string) => {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        saveLocalReadIds(next);
        return next;
      });

      // Ghi bất đồng bộ lên Firestore nếu đã đăng nhập
      if (currentUser?.uid) {
        try {
          await markNotificationAsRead(id, currentUser.uid);
        } catch (e) {
          console.warn("Lỗi đồng bộ đọc thông báo:", e);
        }
      }
    },
    [currentUser?.uid, saveLocalReadIds]
  );

  // Đánh dấu tất cả thông báo đã đọc
  const handleMarkAllAsRead = useCallback(async () => {
    const allIds = notifications.map((n) => n.id);
    const newSet = new Set(allIds);
    setReadIds(newSet);
    saveLocalReadIds(newSet);

    // Ghi bất đồng bộ lên Firestore nếu đã đăng nhập
    if (currentUser?.uid) {
      try {
        await markAllNotificationsAsRead(allIds, currentUser.uid);
      } catch (e) {
        console.warn("Lỗi đồng bộ đọc tất cả thông báo:", e);
      }
    }
  }, [notifications, currentUser?.uid, saveLocalReadIds]);

  // Đếm số thông báo chưa đọc (chỉ tính khi đã mount)
  const unreadCount = useMemo(() => {
    if (!mounted) return 0;
    return notifications.filter((n) => !readIds.has(n.id)).length;
  }, [notifications, readIds, mounted]);

  // Thông báo mới nhất
  const latestNotification = useMemo(() => {
    return notifications.length > 0 ? notifications[0] : null;
  }, [notifications]);

  const isLatestRead = useMemo(() => {
    if (!latestNotification) return true;
    return readIds.has(latestNotification.id);
  }, [latestNotification, readIds]);

  return (
    <>
      {/* Icon Chuông trên thanh công cụ */}
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        className={cn(
          "relative p-2 rounded-xl transition-all duration-200",
          "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400",
          "hover:bg-slate-100 dark:hover:bg-slate-900",
          unreadCount > 0 && "text-indigo-600 dark:text-indigo-400",
          className
        )}
        title={
          unreadCount > 0
            ? `Có ${unreadCount} thông báo cập nhật mới`
            : "Thông báo & Cập nhật"
        }
      >
        <Bell
          className={cn(
            "w-4 h-4 md:w-5 md:h-5 transition-transform",
            mounted && unreadCount > 0 && "animate-wiggle"
          )}
        />

        {/* Badge số lượng thông báo chưa đọc */}
        {mounted && unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1",
              "flex items-center justify-center",
              "text-[10px] font-extrabold text-white rounded-full",
              "bg-rose-500 shadow-md shadow-rose-500/30 ring-2 ring-white dark:ring-slate-950",
              "animate-scaleIn"
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Drawer xem chi tiết danh sách thông báo */}
      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        notifications={notifications}
        readIds={readIds}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        isLoggedIn={!!currentUser?.uid}
        onLoginRequest={onLoginRequest}
      />

      {/* Alert toast trượt ở góc nếu có thông báo mới chưa đọc */}
      {mounted && hasLoaded && (
        <NotificationAlertToast
          latestNotification={latestNotification}
          isRead={isLatestRead}
          onOpenDrawer={() => setIsDrawerOpen(true)}
        />
      )}
    </>
  );
}
