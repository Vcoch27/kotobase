import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "react-hot-toast";
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
          <Toaster 
            position="top-center"
            toastOptions={{
              style: {
                background: '#334155',
                color: '#fff',
                fontSize: '14px',
                borderRadius: '12px',
                fontWeight: '600'
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                style: {
                  background: '#ef4444',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#ef4444',
                },
              }
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
