import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Noto_Serif_JP } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "react-hot-toast";
import "./globals.css";

// ── Font Body: Plus Jakarta Sans (UI text — hiện đại, không phải Inter) ───────
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// ── Font Display: Noto Serif JP (Kanji, headings) ────────────────────────────
const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "700"],
  display: "swap",
  preload: false, // Tránh block render do file lớn
});

import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AppUpdateNotifier } from "@/components/AppUpdateNotifier";

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "KotoBase - Japanese Vocabulary & Kanji Manager",
  description:
    "Ứng dụng quản lý và học Từ vựng, Hán tự tiếng Nhật thông minh với phương pháp Anki SRS và Active Recall.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KotoBase",
  },
  icons: {
    icon: [{ url: "/logo.png" }],
    shortcut: ["/logo.png"],
    apple: [{ url: "/logo.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${notoSerifJP.variable}`}
    >
      <body className="bg-[oklch(var(--color-bg))] text-[oklch(var(--color-text-primary))] min-h-screen transition-colors duration-300 font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          {children}
          <MobileBottomNav />
          <AppUpdateNotifier />

          {/* Đăng ký Service Worker hỗ trợ Offline PWA & Web Cache */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function(e) {});
                  });
                }
              `,
            }}
          />

          {/* Toast — sử dụng CSS variables thay vì hardcode màu */}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "oklch(22% 0.012 250)",
                color: "oklch(94% 0.008 250)",
                fontSize: "14px",
                borderRadius: "12px",
                fontWeight: "600",
                fontFamily: "var(--font-body), system-ui, sans-serif",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.08)",
                border: "1px solid oklch(28% 0.012 250)",
              },
              success: {
                iconTheme: {
                  primary: "oklch(68% 0.18 145)",
                  secondary: "oklch(22% 0.012 250)",
                },
              },
              error: {
                style: {
                  background: "oklch(25% 0.05 25)",
                  border: "1px solid oklch(40% 0.15 25)",
                },
                iconTheme: {
                  primary: "oklch(65% 0.22 25)",
                  secondary: "oklch(25% 0.05 25)",
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
