import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "KotoBase - Japanese Vocabulary & Kanji Manager",
  description: "Ứng dụng quản lý và học Từ vựng, Hán tự tiếng Nhật thông minh với phương pháp Anki SRS và Active Recall.",
  icons: {
    icon: [
      { url: "/logo.png" },
    ],
    shortcut: ["/logo.png"],
    apple: [
      { url: "/logo.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
