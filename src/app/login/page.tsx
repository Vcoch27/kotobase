"use client";

import React, { useState } from "react";
import { login, loginWithGoogle } from "@/app/actions/auth";
import { Lock, ArrowRight, ShieldAlert, Sparkles, Chrome } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { auth } from "@/lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  // Đăng nhập bằng mật khẩu chung
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await login(password);
      if (res.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(res.error || "Mật khẩu không hợp lệ.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setError("Lỗi máy chủ. Vui lòng xem log ở Terminal.");
      setLoading(false);
    }
  };

  // Đăng nhập bằng Google OAuth
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Lấy Firebase ID Token để gửi lên server
      const idToken = await result.user.getIdToken();
      
      const res = await loginWithGoogle(idToken);
      if (res.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(res.error || "Không thể đăng nhập bằng Google.");
        setGoogleLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Đã huỷ đăng nhập Google.");
      } else {
        setError("Lỗi khi đăng nhập Google. Vui lòng thử lại.");
      }
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl animate-fadeIn relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 text-center mb-8">
          <div className="flex justify-center mb-6">
            <AppLogo size="2xl" className="shadow-2xl shadow-indigo-500/20 hover:scale-105 transition-transform" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2 flex items-center justify-center gap-2">
            KotoBase <Sparkles className="w-5 h-5 text-amber-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Nền tảng học từ vựng tiếng Nhật dùng chung.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {/* Nút đăng nhập Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl font-bold text-sm text-slate-700 dark:text-slate-200 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? "Đang xử lý..." : "Tiếp tục với Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">hoặc</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
          </div>

          {/* Form mật khẩu chung */}
          <form onSubmit={handleLogin} className="space-y-4">
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
              disabled={loading || googleLoading || !password.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Mở khoá Workspace <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-400 dark:text-slate-600 pt-2">
            Đăng nhập bằng Google để quản lý thư mục cá nhân.<br />
            Mật khẩu chung: chỉ xem, không thể tạo/sửa/xóa.
          </p>
        </div>
      </div>
    </div>
  );
}
