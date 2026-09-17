"use client";

import { useState } from "react";
import Link from "next/link";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { loginWithGoogle } from "@/app/actions/auth";
import { Headphones, Loader2 } from "lucide-react";

export function ListeningSignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setBusy(true); setError("");
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const session = await loginWithGoogle(await result.user.getIdToken());
      if (!session.success) { setError(session.error || "Không thể đăng nhập. Vui lòng thử lại."); return; }
      // A full navigation clears any stale unauthenticated router state.
      window.location.assign("/listening");
    } catch {
      setError("Chưa đăng nhập được. Vui lòng cho phép cửa sổ đăng nhập Google và thử lại.");
    } finally { setBusy(false); }
  }

  return <main className="listening-page flex min-h-screen items-center justify-center bg-bg p-6 pb-28 text-text-primary">
    <section className="w-full max-w-lg space-y-6 rounded-2xl bg-surface p-6 shadow-elevation-md sm:p-8">
      <p className="flex items-center gap-2 font-semibold text-primary"><Headphones size={20} />Luyện nghe N3</p>
      <h1 className="text-heading-2 font-bold">Đăng nhập để bắt đầu luyện nghe</h1>
      <p className="text-body text-text-muted">Đăng nhập tài khoản Google để sử dụng lộ trình 7 tuần và bộ đề nghe của KotoBase.</p>
      {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
      <button disabled={busy} onClick={signIn} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-surface focus-visible:ring-2 disabled:opacity-60">
        {busy && <Loader2 size={18} className="animate-spin" />}{busy ? "Đang đăng nhập…" : "Đăng nhập bằng Google"}
      </button>
      <Link href="/" className="inline-block rounded-lg text-body-sm text-primary focus-visible:ring-2">← Về kho từ vựng</Link>
    </section>
  </main>;
}
