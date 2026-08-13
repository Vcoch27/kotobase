import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KotoBase - Japanese Vocabulary & Kanji Manager",
  description: "Ứng dụng quản lý và học Từ vựng, Hán tự tiếng Nhật thông minh với Next.js và Prisma.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
