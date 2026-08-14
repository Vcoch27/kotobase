"use client";

import React, { useState } from "react";
import { login } from "@/app/actions/auth";
import { Lock, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await login(password);
      if (res.success) {
        router.push("/");
        router.refresh(); // Force refresh to apply auth state across the app
      } else {
        setError(res.error || "Mật khẩu không hợp lệ.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setError("Lỗi máy chủ (Server Error). Vui lòng xem log ở Terminal.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl animate-fadeIn relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2 flex items-center justify-center gap-2">
            KotoBase <Sparkles className="w-5 h-5 text-amber-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Không gian học tập dùng chung. Vui lòng nhập mật khẩu truy cập.
          </p>
        </div>

        <form onSubmit={handleLogin} className="relative z-10 space-y-6">
          <div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Nhập mật khẩu truy cập..."
                className={`w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border-2 text-center text-lg tracking-widest transition-all outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 ${
                  error 
                    ? "border-rose-300 dark:border-rose-500/50 focus:border-rose-500 dark:focus:border-rose-500 bg-rose-50 dark:bg-rose-500/5 animate-shake" 
                    : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                }`}
                autoFocus
              />
            </div>
            
            {error && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-500 dark:text-rose-400 animate-fadeIn">
                <ShieldAlert className="w-4 h-4" /> {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>Mở khoá Workspace <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
