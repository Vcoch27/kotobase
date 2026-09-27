import { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Quản trị hệ thống | KotoBase",
  description: "Trang quản trị người dùng và hệ thống học tập KotoBase",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Kiểm tra quyền Quản trị viên phía Server
  const { isAdmin } = await verifyAdminSession();

  if (!isAdmin) {
    // Không có quyền -> Điều hướng ngay về trang chủ
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[oklch(var(--color-bg))] transition-colors">
      {children}
    </div>
  );
}
