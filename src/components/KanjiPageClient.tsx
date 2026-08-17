"use client";

import React, { useState } from "react";
import { KanjiDictionaryView } from "./KanjiDictionaryView";
import { AppLogo } from "./AppLogo";
import { ArrowLeft, Moon, Sun, User, LogOut, Settings2, Lock } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { loginWithGoogle, logout } from "@/app/actions/auth";
import toast from "react-hot-toast";

interface UserInfo {
  uid: string;
  email: string;
  name: string;
  picture?: string;
}

interface KanjiPageClientProps {
  vocabularies: any[];
  folders: any[];
  currentUser?: UserInfo | null;
}

export function KanjiPageClient({ vocabularies, folders, currentUser }: KanjiPageClientProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center pb-20">
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-colors duration-300">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 py-3 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              title="Quay về Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:block">Quay về</span>
            </Link>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <AppLogo />
              <div>
                <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  Tra cứu Hán tự
                </h1>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">KotoBase — Kanji Dictionary</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* User info */}
            {currentUser ? (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                {currentUser.picture ? (
                  <img src={currentUser.picture} alt={currentUser.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <User className="w-4 h-4 text-slate-500" />
                )}
                <span className="hidden sm:block text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
                  {currentUser.name || currentUser.email}
                </span>
              </div>
            ) : (
              <button
                onClick={async () => {
                  try {
                    const provider = new GoogleAuthProvider();
                    const result = await signInWithPopup(auth, provider);
                    const idToken = await result.user.getIdToken();
                    const res = await loginWithGoogle(idToken);
                    if (res.success) {
                      toast.success('Đăng nhập thành công!');
                      setTimeout(() => window.location.reload(), 1000);
                    } else {
                      toast.error(res.error || 'Đăng nhập Google thất bại');
                    }
                  } catch (error: any) {
                    console.error(error);
                    if (error.code !== "auth/popup-closed-by-user") {
                      toast.error('Lỗi đăng nhập Google: ' + error.message);
                    }
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer"
                title="Đăng nhập Google"
              >
                <span className="hidden sm:block">Đăng nhập Google</span>
              </button>
            )}

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-900"
              title="Đổi giao diện Sáng/Tối"
            >
              {mounted && theme === "dark" ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                className={`p-2 rounded-xl transition-colors ${showSettingsDropdown ? 'bg-slate-100 dark:bg-slate-800 text-amber-500' : 'text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
              >
                <Settings2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              {showSettingsDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettingsDropdown(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
                    {currentUser && (
                      <button 
                        onClick={async () => {
                          setShowSettingsDropdown(false);
                          toast.loading("Đang đăng xuất...");
                          const { auth } = await import('@/lib/firebase');
                          await auth.signOut();
                          const { logoutGoogle } = await import('@/app/actions/auth');
                          await logoutGoogle();
                          document.cookie = "kotobase_google_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                          setTimeout(() => {
                            window.location.href = '/kanji';
                          }, 500);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors text-left border-b border-slate-100 dark:border-slate-800"
                      >
                        <LogOut className="w-4 h-4 text-amber-500" /> Đăng xuất Google
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        setShowSettingsDropdown(false);
                        toast.loading("Đang đăng xuất toàn bộ...");
                        const { auth } = await import('@/lib/firebase');
                        await auth.signOut();
                        const { logoutApp } = await import('@/app/actions/auth');
                        await logoutApp();
                        document.cookie = "kotobase_google_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                        document.cookie = "kotobase_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                        setTimeout(() => {
                          window.location.href = '/login';
                        }, 500);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <Lock className="w-4 h-4 text-rose-500" /> Khoá & Đăng xuất Web
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 lg:px-6 pt-6 pb-12">
        <KanjiDictionaryView
          vocabularies={vocabularies}
          folders={folders}
        />
      </main>
    </div>
  );
}
