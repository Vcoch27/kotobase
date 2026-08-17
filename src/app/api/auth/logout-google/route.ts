import { NextResponse } from "next/server";

const GOOGLE_SESSION_COOKIE = "kotobase_google_session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  
  const response = NextResponse.redirect(`${origin}/`);
  
  // Xóa cookie với ĐÚNG Y HỆT thuộc tính lúc tạo
  response.cookies.set({
    name: GOOGLE_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });
  
  return response;
}
