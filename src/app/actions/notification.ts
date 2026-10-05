"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCachedSystemNotifications, type CachedSystemNotification } from "@/lib/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getCurrentUser } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";

export type NotificationType = "feature" | "improvement" | "fix" | "announcement";

export interface SystemNotificationItem extends CachedSystemNotification {}

/**
 * Lấy danh sách thông báo hệ thống (qua Next.js Data Cache, 0 read trực tiếp từ Firestore nếu còn cache)
 */
export async function getSystemNotifications(): Promise<SystemNotificationItem[]> {
  try {
    return await getCachedSystemNotifications();
  } catch (error) {
    console.error("Lỗi khi lấy thông báo hệ thống:", error);
    return [];
  }
}

/**
 * Lấy danh sách ID thông báo mà người dùng đã đọc từ Firestore users/{uid}
 */
export async function getUserReadNotificationIds(uid?: string | null): Promise<string[]> {
  if (!uid) return [];
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) return [];
    const data = userDoc.data();
    return Array.isArray(data?.readNotificationIds) ? data.readNotificationIds : [];
  } catch (error) {
    console.error("Lỗi khi lấy readNotificationIds của user:", error);
    return [];
  }
}

/**
 * Đánh dấu 1 thông báo là đã đọc cho người dùng
 */
export async function markNotificationAsRead(notificationId: string, uid?: string | null) {
  if (!notificationId) return { success: false, error: "Thiếu notificationId" };
  if (!uid) {
    // Khách vãng lai: xử lý hoàn toàn qua localStorage ở client
    return { success: true };
  }
  try {
    await adminDb.collection("users").doc(uid).set(
      {
        readNotificationIds: FieldValue.arrayUnion(notificationId),
        lastNotificationReadAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi khi đánh dấu đã đọc thông báo:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Đánh dấu TẤT CẢ thông báo là đã đọc cho người dùng
 */
export async function markAllNotificationsAsRead(notificationIds: string[], uid?: string | null) {
  if (!notificationIds || notificationIds.length === 0) return { success: true };
  if (!uid) {
    return { success: true };
  }
  try {
    await adminDb.collection("users").doc(uid).set(
      {
        readNotificationIds: FieldValue.arrayUnion(...notificationIds),
        lastNotificationReadAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi khi đánh dấu tất cả đã đọc:", error);
    return { success: false, error: error.message };
  }
}

export interface CreateNotificationInput {
  title: string;
  summary: string;
  content: string;
  type?: NotificationType;
  tag?: string;
  link?: string;
  version?: string;
  secretKey?: string; // Dùng cho script CLI hoặc check admin
}

/**
 * Tạo một thông báo hệ thống mới (dành cho Admin hoặc Script Release)
 */
export async function createSystemNotification(input: CreateNotificationInput) {
  const { title, summary, content, type = "feature", tag, link, version, secretKey } = input;

  if (!title?.trim() || !summary?.trim() || !content?.trim()) {
    return { success: false, error: "Tiêu đề, tóm tắt và nội dung không được để trống." };
  }

  // Xác thực quyền tạo thông báo
  const expectedSecret = process.env.APP_ACCESS_PASSWORD;
  const isSecretValid = secretKey && expectedSecret && secretKey === expectedSecret;

  if (!isSecretValid) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isAdminEmail(currentUser.email)) {
      return { success: false, error: "Bạn không có quyền quản trị để tạo thông báo." };
    }
  }

  try {
    const now = new Date().toISOString();
    const docRef = adminDb.collection("system_notifications").doc();

    const payload = {
      id: docRef.id,
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim(),
      type,
      tag: tag?.trim() || (type === "feature" ? "✨ Tính năng mới" : type === "improvement" ? "⚡ Cải tiến" : type === "fix" ? "🛠️ Sửa lỗi" : "📢 Thông báo"),
      link: link?.trim() || null,
      version: version?.trim() || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(payload);

    // Xoá cache để người dùng nhận được thông báo mới nhất ngay lập tức
    try {
      revalidateTag("system_notifications");
    } catch {}
    revalidatePath("/");

    return { success: true, data: payload };
  } catch (error: any) {
    console.error("Lỗi khi tạo thông báo:", error);
    return { success: false, error: error.message || "Không thể tạo thông báo." };
  }
}

/**
 * Khởi tạo thông báo đầu tiên nếu hệ thống chưa có thông báo nào
 */
export async function seedInitialNotificationIfEmpty() {
  try {
    const snap = await adminDb.collection("system_notifications").limit(1).get();
    if (!snap.empty) {
      return { success: true, seeded: false };
    }

    const docRef = adminDb.collection("system_notifications").doc("welcome-notifications");
    const now = new Date().toISOString();

    await docRef.set({
      id: docRef.id,
      title: "Chào mừng bạn đến với KotoBase Updates 🎉",
      summary: "Hệ thống thông báo cập nhật tính năng mới & trải nghiệm người dùng chính thức ra mắt!",
      content: `### Xin chào các bạn học viên KotoBase! 🌸\n\nTừ nay, mọi tính năng mới, cải tiến trải nghiệm học từ vựng, mẹo nhớ Kanji và các sửa lỗi sẽ được cập nhật trực tiếp tại đây để bạn luôn nắm bắt những thay đổi mới nhất.\n\n**Các tính năng nổi bật gần đây:**\n- 🗂️ **Tra cứu Hán tự trong Thư mục**: Xem toàn bộ chữ Kanji thuộc thư mục theo dạng 2 cột trực quan.\n- 💡 **Mẹo nhớ Hán tự trực tiếp**: Xem nhanh câu mẹo, nhấn vào để học hoặc bổ sung mẹo mới.\n- ⌨️ **Phím tắt nhanh**: Tối ưu phím tắt \`Ctrl + \\\` để đóng/mở sidebar không xung đột trình duyệt.\n- 📦 **Thao tác hàng loạt**: Chọn nhiều từ vựng để chuyển thư mục hoặc ôn luyện tập trung.\n\nChúc bạn luôn có những giờ học tiếng Nhật thật hào hứng và hiệu quả! ✨`,
      type: "feature",
      tag: "✨ Tính năng mới",
      link: "/",
      version: "v2.5.0",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    try {
      revalidateTag("system_notifications");
    } catch {}

    return { success: true, seeded: true };
  } catch (error: any) {
    console.error("Lỗi khi seed thông báo khởi đầu:", error);
    return { success: false, error: error.message };
  }
}
