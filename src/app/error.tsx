"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Error Boundary UI — thiết kế có chủ đích, thân thiện người dùng
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log lỗi để debug nhưng KHÔNG hiển thị code kỹ thuật ra UI
    console.error("[KotoBase Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[oklch(var(--color-bg))] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[oklch(var(--color-accent-muted))]">
          <AlertTriangle
            className="w-8 h-8 text-[oklch(var(--color-accent))]"
            strokeWidth={1.5}
          />
        </div>

        {/* Tiêu đề */}
        <div className="space-y-2">
          <h1 className="text-heading-3 font-semibold text-[oklch(var(--color-text-primary))]">
            Có gì đó không ổn
          </h1>
          <p className="text-body-sm text-[oklch(var(--color-text-muted))] max-w-sm mx-auto leading-relaxed">
            KotoBase gặp sự cố không mong muốn. Thử tải lại trang để tiếp tục học.
          </p>
        </div>

        {/* Action */}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[oklch(var(--color-accent))] text-slate-950 font-semibold text-body-sm hover:bg-[oklch(var(--color-accent-hover))] transition-colors duration-150 shadow-elevation-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(var(--ring))] focus-visible:ring-offset-2"
        >
          <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
          Thử lại
        </button>
      </div>
    </div>
  );
}
