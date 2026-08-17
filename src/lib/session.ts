// src/lib/session.ts
// Utility để đọc thông tin user session trong Server Actions & API Routes

import { cookies } from "next/headers";
import { verifyGoogleSession, type UserSession } from "./auth-utils";

const GOOGLE_SESSION_COOKIE = "kotobase_google_session";

/**
 * Lấy thông tin user hiện tại từ Google session cookie.
 * Trả về null nếu chưa đăng nhập Google (chỉ có mật khẩu chung).
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(GOOGLE_SESSION_COOKIE);
    if (!sessionCookie?.value) return null;

    const session = await verifyGoogleSession(sessionCookie.value);
    return session;
  } catch (e) {
    return null;
  }
}

/**
 * Lấy UID của user hiện tại.
 * Trả về null nếu chưa đăng nhập Google.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.uid || null;
}

export { GOOGLE_SESSION_COOKIE };
