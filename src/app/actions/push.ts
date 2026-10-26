"use server";

import { verifyAdminSession } from "@/lib/admin";
import { broadcastSystemPush } from "@/lib/web-push";

export async function sendSystemPushAction(notificationId: string) {
  const { isAdmin } = await verifyAdminSession();
  if (!isAdmin) return { success: false as const, error: "Chỉ quản trị viên mới được gửi thông báo." };
  try {
    const result = await broadcastSystemPush(notificationId);
    return { success: true as const, result };
  } catch (error) {
    // Never return endpoint URLs, tokens or raw push-provider error bodies.
    const message = error instanceof Error ? error.message : "";
    const allowed = ["Chưa cấu hình", "Thông báo", "Có hơn 100"];
    return { success: false as const, error: allowed.some((prefix) => message.startsWith(prefix))
      ? message : "Không gửi được thông báo. Kiểm tra kết nối rồi thử lại; hệ thống sẽ chặn gửi trùng." };
  }
}
