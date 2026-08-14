import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth-utils";

export async function middleware(request: NextRequest) {
  // Bỏ qua nếu route là login hoặc các file tĩnh
  if (
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.includes(".") // bỏ qua ảnh, favicon, v.v.
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("kotobase_auth_token")?.value;

  // Nếu chưa cấu hình biến môi trường, tạm thời bỏ qua (hoặc bạn có thể chặn tuỳ ý)
  if (!process.env.APP_ACCESS_PASSWORD) {
    return NextResponse.next();
  }

  // Chuyển hướng về login nếu không có token hoặc token không hợp lệ
  if (!token || !(await verifyToken(token))) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (auth page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
};
