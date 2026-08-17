"use client";

import React, { useState } from "react";
import { KanjiDictionaryView } from "./KanjiDictionaryView";
import { AppLogo } from "./AppLogo";
import { ArrowLeft, Moon, Sun, User, LogOut, Settings2 } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect } from "react";

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
            {currentUser && (
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
                    <button
                      onClick={async () => {
                        setShowSettingsDropdown(false);
                        const { logout } = await import('@/app/actions/auth');
                        await logout();
                        window.location.href = '/login';
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" /> Đăng xuất
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
