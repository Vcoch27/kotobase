import { getCurrentUser } from "./session";
import { type UserSession } from "./auth-utils";
import { adminDb } from "./firebase-admin";
import { isAdminEmail } from "./admin-shared";

export * from "./admin-shared";

/**
 * Xác thực phiên quản trị viên cho Server Actions và Server Components.
 * Trả về { isAdmin: boolean, user: UserSession | null }.
 */
export async function verifyAdminSession(): Promise<{ isAdmin: boolean; user: UserSession | null }> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.email) {
      return { isAdmin: false, user: null };
    }

    // 1. Kiểm tra nhanh qua email whitelist
    if (isAdminEmail(user.email)) {
      return { isAdmin: true, user };
    }

    // 2. Kiểm tra cờ role trong Firestore users/{uid}
    try {
      const userDoc = await adminDb.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.role === "admin" && data?.status !== "disabled") {
          return { isAdmin: true, user };
        }
      }
    } catch (dbErr) {
      console.warn("verifyAdminSession Firestore check warning:", dbErr);
    }

    return { isAdmin: false, user };
  } catch (err) {
    console.error("Lỗi xác thực Admin Session:", err);
    return { isAdmin: false, user: null };
  }
}
