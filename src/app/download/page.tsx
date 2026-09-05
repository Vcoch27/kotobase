import React from "react";
import Link from "next/link";
import { 
  Download, Smartphone, Apple, CheckCircle2, 
  HelpCircle, Sparkles, ArrowLeft, ShieldCheck, 
  WifiOff, Layers, Zap, Share2, PlusSquare, 
  ExternalLink, HardDrive, RefreshCw
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import releaseData from "@/config/app-release.json";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tải ứng dụng KotoBase - Android APK & iOS IPA / PWA",
  description: "Tải app KotoBase học tiếng Nhật trên điện thoại di động Android và iOS. Hỗ trợ học Offline 100% không cần mạng.",
};

export default function DownloadPage() {
  const { android, ios, version, releaseDate, changelog } = releaseData;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased pb-24 md:pb-16 transition-colors duration-300">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại KotoBase</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Bản phát hành v{version}
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 pt-10 md:pt-16 text-center space-y-4">
        <div className="inline-flex p-3 rounded-3xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 mb-2">
          <AppLogo size="xl" />
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
          KotoBase trên Di Động
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Trải nghiệm học Từ vựng, Hán tự và Ngữ pháp tiếng Nhật mượt mà trên điện thoại. Hỗ trợ lưu trữ dữ liệu để học <strong>Offline 100%</strong> không cần kết nối mạng.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Bản cài nội bộ an toàn
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <WifiOff className="w-3.5 h-3.5" /> Học Offline trơn tru
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Zap className="w-3.5 h-3.5" /> Cập nhật liên tục
          </span>
        </div>
      </section>

      {/* Main Download Options (2 Cards: Android & iOS) */}
      <section className="max-w-4xl mx-auto px-4 pt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: ANDROID (.APK) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 w-fit">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Android (.APK)
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Dành cho máy Android
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Samsung, Xiaomi, Oppo, Vivo, Realme, Google Pixel...
                </p>
              </div>

              {/* Thông số */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Phiên bản:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">v{android.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Dung lượng:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{android.fileSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Yêu cầu hệ điều hành:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{android.minAndroidVersion}</span>
                </div>
              </div>

              {/* Nút Tải APK */}
              <a
                href={android.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
              >
                <Download className="w-5 h-5" />
                <span>Xem & Tải bản APK trên GitHub</span>
              </a>

              {/* Hướng dẫn cài đặt Android */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
                  Hướng dẫn cài đặt file APK:
                </h4>
                <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  {android.instructions.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* Card 2: iOS / iPhone (.IPA & PWA) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 w-fit">
                  <Apple className="w-6 h-6" />
                </div>
                <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  iPhone / iPad (iOS)
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Dành cho máy Apple iOS
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  iPhone và iPad mọi dòng máy (iOS 14+)
                </p>
              </div>

              {/* Lựa chọn 1: PWA (Khuyên dùng) */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Cách 1: Thêm vào MH Chính (Khuyên dùng)
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-600 text-white rounded-full">
                    1 Chạm
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Không cần máy tính, không sợ hết hạn 7 ngày. App mở lên toàn màn hình và lưu offline như app App Store!
                </p>

                <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 font-medium pt-1">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">1.</span>
                    <span>Mở trang web này trên trình duyệt <strong>Safari</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">2.</span>
                    <span className="flex items-center gap-1 flex-wrap">
                      Bấm nút <strong>Chia sẻ</strong> <Share2 className="w-3 h-3 inline text-blue-500" /> ở dưới cùng Safari
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">3.</span>
                    <span className="flex items-center gap-1 flex-wrap">
                      Chọn <strong>Thêm vào Màn hình chính</strong> <PlusSquare className="w-3 h-3 inline text-slate-600 dark:text-slate-300" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Lựa chọn 2: File .IPA (Dành cho Sideload) */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Cách 2: File .IPA cài đặt nâng cao</span>
                  <span className="text-slate-400 font-normal">{ios.fileSize}</span>
                </div>

                <a
                  href={ios.ipaDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all border border-slate-200 dark:border-slate-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Xem bản phát hành .IPA trên GitHub</span>
                </a>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  * Dành cho người dùng biết cài file bằng công cụ AltStore, Sideloadly hoặc Scarlet.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Features Highlights on Mobile */}
      <section className="max-w-4xl mx-auto px-4 pt-12">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-6">
          Tính năng vượt trội trên bản ứng dụng KotoBase
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <WifiOff className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Học Offline 100%</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Lưu dataset trên điện thoại với IndexedDB, học không lo mất mạng.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Flashcard & SRS Anki</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Lặp lại ngắt quãng thông minh, tối ưu trí nhớ dài hạn.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Quiz Phản Xạ Gõ Phím</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Gõ tiếng Nhật trực tiếp, kiểm tra âm đọc & nghĩa tức thì.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
              <Smartphone className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Giao Diện 1 Tay</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Thanh Bottom Nav tiện dụng, vuốt chạm tối ưu cho ngón cái.
            </p>
          </div>
        </div>
      </section>

      {/* Changelog Section */}
      <section className="max-w-4xl mx-auto px-4 pt-12">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-500" />
              Nhật ký cập nhật (Phiên bản {version})
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Phát hành: {releaseDate}
            </span>
          </div>

          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            {changelog.map((item, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
