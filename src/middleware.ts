import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth-utils";
import { checkBotAndRateLimit, createBlockedResponse } from "./lib/bot-protection";

const AUTH_COOKIE_NAME = "kotobase_auth_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bỏ qua các file tĩnh và tài nguyên hệ thống (không tính vào rate limit)
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname === "/robots.txt" ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf|mp3|wav|ogg)$/i.test(pathname);

  if (isStaticAsset) {
    return NextResponse.next();
  }

  // 2. Kiểm tra thông minh: Chặn Bot/Crawler độc hại & Giới hạn tần suất thích ứng
  // Phân biệt chính xác giữa bot tự động và người dùng học tập thường xuyên (Zero False Positives)
  const isApi = pathname.startsWith("/api/");
  const botCheck = await checkBotAndRateLimit(request);
  if (!botCheck.allowed) {
    return createBlockedResponse(botCheck, isApi);
  }

  // 3. Nếu là API route đã được xác thực an toàn qua bộ lọc Anti-Bot -> Cho phép xử lý
  if (isApi) {
    return NextResponse.next();
  }

  // 4. Tuyến đường công khai tải ứng dụng (download)
  if (pathname.startsWith("/download")) {
    return NextResponse.next();
  }

  // 5. Nếu chưa cấu hình biến môi trường, tạm thời bỏ qua kiểm tra mật khẩu ứng dụng
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|mp3|wav|ogg)$).*)',
  ],
};
