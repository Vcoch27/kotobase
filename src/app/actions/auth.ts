"use server";

import { cookies } from "next/headers";
import { signToken } from "@/lib/auth-utils";

const AUTH_COOKIE_NAME = "kotobase_auth_token";

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
      
      // Set cookie valid for 1 day
      cookies().set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 day
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

export async function logout() {
  cookies().delete(AUTH_COOKIE_NAME);
  return { success: true };
}
