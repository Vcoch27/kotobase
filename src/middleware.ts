import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth-utils";

const AUTH_COOKIE_NAME = "kotobase_auth_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bỏ qua nếu route là download hoặc các file tĩnh
  if (
    pathname.startsWith("/download") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Nếu chưa cấu hình biến môi trường, tạm thời bỏ qua
  if (!process.env.APP_ACCESS_PASSWORD) {
    return NextResponse.next();
  }

  const passwordToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isTokenValid = passwordToken ? await verifyToken(passwordToken) : false;
  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");

  // Nếu người dùng đang truy cập trang /login:
  if (isLoginPage) {
    // Nếu key CÒN HẠN -> chuyển hướng ngay về trang chủ, không bắt đăng nhập lại
    if (isTokenValid) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Nếu key HẾT HẠN hoặc KHÔNG HỢP LỆ -> dọn dẹp cookie cũ và cho phép hiển thị trang login
    const response = NextResponse.next();
    if (passwordToken) {
      response.cookies.delete(AUTH_COOKIE_NAME);
    }
    return response;
  }

  // Đối với tất cả các trang cần bảo vệ:
  // Nếu key CÒN HẠN và hợp lệ -> cho qua
  if (isTokenValid) {
    return NextResponse.next();
  }

  // Nếu key không hợp lệ hoặc đã hết hạn -> chuyển hướng về /login và dọn dẹp cookie hết hạn
  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl);
  if (passwordToken) {
    response.cookies.delete(AUTH_COOKIE_NAME);
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|download).*)',
  ],
};
