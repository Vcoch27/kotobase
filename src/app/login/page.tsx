import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth-utils";
import { LoginForm } from "@/components/LoginForm";

const AUTH_COOKIE_NAME = "kotobase_auth_token";

export default async function LoginPage() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  
  // Nếu key còn hạn và hợp lệ -> chuyển hướng ngay về trang chủ, không hiển thị form đăng nhập
  if (token && (await verifyToken(token))) {
    redirect("/");
  }

  return <LoginForm />;
}
