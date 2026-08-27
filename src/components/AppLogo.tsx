"use client";

import React, { useState } from "react";
import { cn } from "@/lib/cn";

interface AppLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

export function AppLogo({ className = "", size = "md" }: AppLogoProps) {
  const [hasError, setHasError] = useState(false);

  const dimension =
    size === "sm"  ? "w-8 h-8"  :
    size === "lg"  ? "w-12 h-12" :
    size === "xl"  ? "w-16 h-16" :
    size === "2xl" ? "w-24 h-24 md:w-28 md:h-28" :
    size === "3xl" ? "w-32 h-32 md:w-36 md:h-36" :
    "w-8 h-8 md:w-10 md:h-10";

  const textSize =
    size === "sm"  ? "text-sm" :
    size === "lg"  ? "text-2xl" :
    size === "xl"  ? "text-3xl" :
    size === "2xl" ? "text-5xl" :
    size === "3xl" ? "text-6xl" :
    "text-base md:text-xl";

  if (!hasError) {
    return (
      <div
        className={cn(
          "relative overflow-hidden flex items-center justify-center shrink-0 bg-transparent",
          "rounded-xl md:rounded-2xl",
          // Hover scale nhẹ — elevation thị giác
          "transition-transform duration-200 hover:scale-105",
          dimension,
          className
        )}
        style={{ willChange: "transform" }}
      >
        <img
          src="/logo.png"
          alt="KotoBase Logo"
          className="w-full h-full object-contain"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  // Fallback — dùng accent color từ token thay vì gradient cứng
  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0",
        "rounded-xl md:rounded-2xl",
        "bg-[oklch(var(--color-accent-muted))]",
        "border border-[oklch(var(--color-accent)/0.3)]",
        // Shadow glow nhẹ
        "shadow-[0_0_16px_oklch(var(--color-accent)/0.2)]",
        "transition-transform duration-200 hover:scale-105",
        "font-display font-bold text-[oklch(var(--color-accent))]",
        dimension,
        textSize,
        className
      )}
      style={{ willChange: "transform" }}
    >
      言
    </div>
  );
}
