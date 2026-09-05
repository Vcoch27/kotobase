"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, X, Smartphone } from "lucide-react";

export function AppUpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [latestVersion, setLatestVersion] = useState<string>("");
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Đăng ký Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("Service Worker registered successfully"))
        .catch((err) => console.warn("Service Worker registration failed:", err));
    }

    // Kiểm tra phiên bản mới từ API
    const checkVersion = async () => {
      try {
        // Kiểm tra xem đã dismiss trong ngày hôm nay chưa
        const dismissTime = localStorage.getItem("kotobase_update_dismissed_time");
        if (dismissTime && Date.now() - parseInt(dismissTime, 10) < 24 * 60 * 60 * 1000) {
          return;
        }

        const res = await fetch("/api/app-version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();

        const currentVersion = localStorage.getItem("kotobase_installed_version") || "1.0.0";
        if (data.version && data.version !== currentVersion) {
          setLatestVersion(data.version);
          setUpdateAvailable(true);
        }
      } catch (e) {
        // Bỏ qua lỗi kết nối
      }
    };

    const timer = setTimeout(checkVersion, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("kotobase_update_dismissed_time", Date.now().toString());
    } catch {}
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-auto animate-slideDown">
      <div className="bg-slate-900/95 dark:bg-slate-900/95 text-white p-3.5 px-4 rounded-2xl shadow-2xl border border-indigo-500/40 backdrop-blur-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Bản cập nhật v{latestVersion}</span>
              <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                Mới
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate mt-0.5">
              Học offline & giao diện mobile mới
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/download"
            onClick={() => setDismissed(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
          >
            <span>Tải</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Để sau"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
