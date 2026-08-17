import { NextResponse } from "next/server";

const GOOGLE_SESSION_COOKIE = "kotobase_google_session";
const AUTH_COOKIE_NAME = "kotobase_auth_token";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  
  const response = NextResponse.redirect(`${origin}/login`);
  
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
  
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
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
