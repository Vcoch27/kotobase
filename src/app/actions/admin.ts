"use server";

import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { verifyAdminSession, type AppUser, isAdminEmail } from "@/lib/admin";
import { revalidatePath } from "next/cache";

export interface GetUsersFilter {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  adminUsers: number;
  totalFolders: number;
  totalVocabs: number;
}

/**
 * Lấy danh sách người dùng kết hợp giữa Firestore và Firebase Auth
 */
export async function getAdminUsers(filters: GetUsersFilter = {}) {
  const { isAdmin } = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false as const, error: "Bạn không có quyền truy cập trang quản trị." };
  }

  try {
    const { search = "", role = "all", status = "all", page = 1, limit = 10 } = filters;

    // 1. Tải danh sách người dùng từ Firestore `users`
    const usersSnapshot = await adminDb.collection("users").get();
    const firestoreUsersMap = new Map<string, AppUser>();

    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      firestoreUsersMap.set(doc.id, {
        uid: doc.id,
        email: data.email || "",
        displayName: data.displayName || data.name || data.email?.split("@")[0] || "Người dùng",
        photoURL: data.photoURL || data.picture || undefined,
        role: data.role === "admin" || isAdminEmail(data.email) ? "admin" : "user",
        status: data.status === "disabled" ? "disabled" : "active",
        createdAt: data.createdAt || new Date(0).toISOString(),
        lastLoginAt: data.lastLoginAt || undefined,
        notes: data.notes || undefined,
        stats: data.stats || undefined,
      });
    });

    // 2. Lấy thêm danh sách từ Firebase Auth để đảm bảo không bỏ sót ai
    try {
      const authUsersResult = await adminAuth.listUsers(100);
      for (const authUser of authUsersResult.users) {
        if (!firestoreUsersMap.has(authUser.uid)) {
          const isUserAdmin = isAdminEmail(authUser.email);
          const newUser: AppUser = {
            uid: authUser.uid,
            email: authUser.email || "",
            displayName: authUser.displayName || authUser.email?.split("@")[0] || "Người dùng",
            photoURL: authUser.photoURL || undefined,
            role: isUserAdmin ? "admin" : "user",
            status: authUser.disabled ? "disabled" : "active",
            createdAt: authUser.metadata.creationTime ? new Date(authUser.metadata.creationTime).toISOString() : new Date().toISOString(),
            lastLoginAt: authUser.metadata.lastSignInTime ? new Date(authUser.metadata.lastSignInTime).toISOString() : undefined,
          };
          firestoreUsersMap.set(authUser.uid, newUser);

          // Tự động lưu bản ghi vào Firestore để lần sau tra cứu siêu nhanh
          adminDb.collection("users").doc(authUser.uid).set(newUser, { merge: true }).catch(() => {});
        } else {
          // Cập nhật trạng thái disabled nếu từ Auth có thay đổi
          const existing = firestoreUsersMap.get(authUser.uid)!;
          if (authUser.disabled && existing.status !== "disabled") {
            existing.status = "disabled";
          }
        }
      }
    } catch (authErr) {
      console.warn("Không thể list Firebase Auth users (chỉ dùng Firestore):", authErr);
    }

    let allUsers = Array.from(firestoreUsersMap.values());

    // 3. Tìm kiếm theo từ khóa (Tên, Email, UID)
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      allUsers = allUsers.filter(
        (u) =>
          u.displayName.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          u.uid.toLowerCase().includes(s)
      );
    }

    // 4. Lọc theo vai trò (Role)
    if (role && role !== "all") {
      allUsers = allUsers.filter((u) => u.role === role);
    }

    // 5. Lọc theo trạng thái (Status)
    if (status && status !== "all") {
      allUsers = allUsers.filter((u) => u.status === status);
    }

    // Sắp xếp: Quản trị viên lên trước, sau đó theo thời gian tạo mới nhất
    allUsers.sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (b.role === "admin" && a.role !== "admin") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = allUsers.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (currentPage - 1) * limit;
    const paginatedUsers = allUsers.slice(startIndex, startIndex + limit);

    return {
      success: true as const,
      users: paginatedUsers,
      total,
      page: currentPage,
      totalPages,
    };
  } catch (error: any) {
    console.error("Lỗi getAdminUsers:", error);
    return { success: false as const, error: error.message || "Không thể tải danh sách người dùng." };
  }
}

/**
 * Lấy số liệu thống kê tổng quan
 */
export async function getAdminOverviewStats() {
  const { isAdmin } = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false as const, error: "Bạn không có quyền truy cập trang quản trị." };
  }

  try {
    const usersResult = await getAdminUsers({ limit: 1000 });
    const allUsers: AppUser[] = usersResult.success && Array.isArray(usersResult.users) ? usersResult.users : [];
    const totalUsers: number = usersResult.success && typeof usersResult.total === "number" ? usersResult.total : 0;

    let activeUsers = 0;
    let disabledUsers = 0;
    let adminUsers = 0;

    allUsers.forEach((u) => {
      if (u.status === "disabled") disabledUsers++;
      else activeUsers++;
      if (u.role === "admin") adminUsers++;
    });

    // Đếm số lượng thư mục và từ vựng nhanh
    let totalFolders = 0;
    let totalVocabs = 0;
    try {
      const folderSnap = await adminDb.collection("folders").count().get();
      totalFolders = folderSnap.data().count;
    } catch {}

    try {
      const vocabSnap = await adminDb.collection("vocabularies").count().get();
      totalVocabs = vocabSnap.data().count;
    } catch {}

    const stats: AdminStats = {
      totalUsers,
      activeUsers,
      disabledUsers,
      adminUsers,
      totalFolders,
      totalVocabs,
    };

    return { success: true as const, stats };
  } catch (error: any) {
    console.error("Lỗi getAdminOverviewStats:", error);
    return { success: false as const, error: error.message || "Không thể lấy số liệu thống kê." };
  }
}

/**
 * Cập nhật vai trò người dùng (Admin <-> User)
 */
export async function updateUserRole(uid: string, newRole: "admin" | "user") {
  const { isAdmin, user: adminUser } = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: "Bạn không có quyền quản trị." };
  }

  if (!uid) return { success: false, error: "Thiếu mã định danh người dùng." };

  try {
    // Cập nhật trong Firestore
    await adminDb.collection("users").doc(uid).set({
      role: newRole,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Cập nhật Custom Claims trên Firebase Auth
    try {
      await adminAuth.setCustomUserClaims(uid, { role: newRole });
    } catch {}

    revalidatePath("/admin");
    return { success: true as const };
  } catch (error: any) {
    console.error("Lỗi updateUserRole:", error);
    return { success: false as const, error: error.message || "Lỗi khi cập nhật vai trò." };
  }
}

/**
 * Khóa hoặc Mở khóa tài khoản người dùng
 */
export async function updateUserStatus(uid: string, status: "active" | "disabled") {
  const { isAdmin, user: adminUser } = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: "Bạn không có quyền quản trị." };
  }

  if (!uid) return { success: false, error: "Thiếu mã định danh người dùng." };

  // Bảo vệ: Admin không được tự khóa chính mình
  if (adminUser?.uid === uid) {
    return { success: false, error: "Bạn không thể tự khóa tài khoản của chính mình." };
  }

  try {
    const isDisabled = status === "disabled";

    // 1. Cập nhật trong Firebase Auth
    try {
      await adminAuth.updateUser(uid, { disabled: isDisabled });
      if (isDisabled) {
        // Thu hồi phiên đăng nhập để người dùng bị đăng xuất ngay lập tức
        await adminAuth.revokeRefreshTokens(uid);
      }
    } catch (authErr) {
      console.warn("Không thể cập nhật Firebase Auth disabled:", authErr);
    }

    // 2. Cập nhật trong Firestore
    await adminDb.collection("users").doc(uid).set({
      status,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    revalidatePath("/admin");
    return { success: true as const };
  } catch (error: any) {
    console.error("Lỗi updateUserStatus:", error);
    return { success: false as const, error: error.message || "Lỗi khi cập nhật trạng thái." };
  }
}

/**
 * Cập nhật ghi chú nội bộ của Quản trị viên cho một người dùng
 */
export async function updateUserNotes(uid: string, notes: string) {
  const { isAdmin } = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: "Bạn không có quyền quản trị." };
  }

  if (!uid) return { success: false, error: "Thiếu mã định danh người dùng." };

  try {
    await adminDb.collection("users").doc(uid).set({
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return { success: true as const };
  } catch (error: any) {
    console.error("Lỗi updateUserNotes:", error);
    return { success: false as const, error: error.message || "Lỗi khi lưu ghi chú." };
  }
}

/**
 * Xóa người dùng vĩnh viễn khỏi hệ thống
 */
export async function deleteUserPermanently(uid: string) {
  const { isAdmin, user: adminUser } = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: "Bạn không có quyền quản trị." };
  }

  if (!uid) return { success: false, error: "Thiếu mã định danh người dùng." };

  // Bảo vệ: Admin không được xóa tài khoản của chính mình
  if (adminUser?.uid === uid) {
    return { success: false, error: "Bạn không thể xóa tài khoản của chính mình." };
  }

  try {
    // 1. Xóa trong Firebase Auth
    try {
      await adminAuth.deleteUser(uid);
    } catch (authErr) {
      console.warn("Lỗi khi xóa trong Firebase Auth:", authErr);
    }

    // 2. Xóa trong Firestore users
    await adminDb.collection("users").doc(uid).delete();

    revalidatePath("/admin");
    return { success: true as const };
  } catch (error: any) {
    console.error("Lỗi deleteUserPermanently:", error);
    return { success: false as const, error: error.message || "Lỗi khi xóa người dùng." };
  }
}

/**
 * Tạo người dùng mới thủ công từ giao diện Admin
 */
export async function createAdminUser(data: {
  email: string;
  displayName: string;
  password?: string;
  role?: "admin" | "user";
}) {
  const { isAdmin } = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: "Bạn không có quyền quản trị." };
  }

  const email = data.email?.trim().toLowerCase();
  const displayName = data.displayName?.trim();
  const role = data.role === "admin" ? "admin" : "user";

  if (!email || !displayName) {
    return { success: false, error: "Vui lòng nhập đầy đủ Email và Tên hiển thị." };
  }

  try {
    // Tạo mật khẩu ngẫu nhiên nếu không cung cấp
    const password = data.password || Math.random().toString(36).slice(-10) + "Aa1!";

    // 1. Tạo trong Firebase Auth
    const authUser = await adminAuth.createUser({
      email,
      displayName,
      password,
    });

    const now = new Date().toISOString();
    const newUser: AppUser = {
      uid: authUser.uid,
      email,
      displayName,
      role,
      status: "active",
      createdAt: now,
      lastLoginAt: undefined,
    };

    // 2. Lưu vào Firestore
    await adminDb.collection("users").doc(authUser.uid).set(newUser);

    revalidatePath("/admin");
    return { success: true as const, user: newUser };
  } catch (error: any) {
    console.error("Lỗi createAdminUser:", error);
    return { success: false as const, error: error.message || "Lỗi khi tạo người dùng mới." };
  }
}
