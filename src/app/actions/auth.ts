"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { signToken, signGoogleSession } from "@/lib/auth-utils";
import { adminAuth } from "@/lib/firebase-admin";
import { GOOGLE_SESSION_COOKIE } from "@/lib/session";

const AUTH_COOKIE_NAME = "kotobase_auth_token";

// ============================================================
// Đăng nhập bằng mật khẩu chung (giữ nguyên)
// ============================================================
export async function login(password: string) {
  console.log("--> Bắt đầu hàm login");
  const secret = process.env.APP_ACCESS_PASSWORD;
  
  if (!secret) {
    console.log("--> Lỗi: Thiếu APP_ACCESS_PASSWORD");
    return { success: false, error: "Hệ thống chưa cấu hình biến môi trường APP_ACCESS_PASSWORD." };
  }

  if (password === secret) {
    console.log("--> Mật khẩu khớp, chuẩn bị signToken");
    try {
      const token = await signToken("authenticated");
      console.log("--> signToken thành công:", token);
      
      cookies().set({
        name: AUTH_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24, // 1 ngày
        path: "/",
        sameSite: "lax",
      });

      console.log("--> Set cookie thành công, trả về success: true");
      return { success: true };
    } catch (e) {
      console.error("--> Lỗi trong quá trình signToken:", e);
      return { success: false, error: "Lỗi hệ thống khi mã hoá token." };
    }
  }

  console.log("--> Mật khẩu SAI");
  return { success: false, error: "Mật khẩu truy cập không chính xác." };
}

// ============================================================
// Đăng nhập bằng Google (Firebase Auth)
// ============================================================
export async function loginWithGoogle(idToken: string) {
  try {
    // Verify Firebase ID Token phía server bằng Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    const { uid, email, name, picture } = decodedToken;
    
    if (!email) {
      return { success: false, error: "Tài khoản Google không có email hợp lệ." };
    }

    // Ký Google session JWT
    const sessionToken = await signGoogleSession({
      uid,
      email: email || "",
      name: name || email || "Người dùng",
      picture: picture,
    });

    // Set Google session cookie (7 ngày)
    cookies().set({
      name: GOOGLE_SESSION_COOKIE,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
      path: "/",
      sameSite: "lax",
    });

    return { 
      success: true, 
      user: { uid, email, name: name || email, picture } 
    };
  } catch (error: any) {
    console.error("--> Lỗi loginWithGoogle:", error);
    return { success: false, error: "Không thể xác thực tài khoản Google. Vui lòng thử lại." };
  }
}

// ============================================================
// Đăng xuất Google (chỉ xóa cookie Google)
// ============================================================
export async function logoutGoogle() {
  cookies().set({
    name: GOOGLE_SESSION_COOKIE,
    value: "",
    expires: new Date(0),
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  cookies().delete({
    name: GOOGLE_SESSION_COOKIE,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  revalidatePath('/');
}

// ============================================================
// Đăng xuất hoàn toàn khỏi ứng dụng (xóa cả 2 cookie)
// ============================================================
export async function logoutApp() {
  cookies().set({
    name: AUTH_COOKIE_NAME,
    value: "",
    expires: new Date(0),
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  cookies().set({
    name: GOOGLE_SESSION_COOKIE,
    value: "",
    expires: new Date(0),
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  cookies().delete({
    name: AUTH_COOKIE_NAME,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  cookies().delete({
    name: GOOGLE_SESSION_COOKIE,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  revalidatePath('/');
}
