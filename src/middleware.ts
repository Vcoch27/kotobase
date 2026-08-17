import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, verifyGoogleSession } from "./lib/auth-utils";

const AUTH_COOKIE_NAME = "kotobase_auth_token";
const GOOGLE_SESSION_COOKIE = "kotobase_google_session";

export async function middleware(request: NextRequest) {
  // Bỏ qua nếu route là login hoặc các file tĩnh
  if (
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Nếu chưa cấu hình biến môi trường, tạm thời bỏ qua
  if (!process.env.APP_ACCESS_PASSWORD) {
    return NextResponse.next();
  }

  // Kiểm tra password token (mật khẩu chung)
  const passwordToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (passwordToken && (await verifyToken(passwordToken))) {
    return NextResponse.next();
  }

  // Kiểm tra Google session token
  const googleToken = request.cookies.get(GOOGLE_SESSION_COOKIE)?.value;
  if (googleToken && (await verifyGoogleSession(googleToken))) {
    return NextResponse.next();
  }

  // Chuyển hướng về login nếu không có token hợp lệ nào
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
};
