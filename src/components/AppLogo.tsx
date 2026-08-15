"use client";

import React, { useState } from "react";

interface AppLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function AppLogo({ className = "", size = "md" }: AppLogoProps) {
  const [hasError, setHasError] = useState(false);

  const dimension = 
    size === "sm" ? "w-8 h-8" : 
    size === "lg" ? "w-12 h-12" : 
    size === "xl" ? "w-16 h-16" : 
    "w-8 h-8 md:w-10 md:h-10";
    
  const textSize = 
    size === "sm" ? "text-sm" : 
    size === "lg" ? "text-2xl" : 
    size === "xl" ? "text-3xl" : 
    "text-base md:text-xl";

  if (!hasError) {
    return (
      <div className={`relative ${dimension} rounded-xl md:rounded-2xl overflow-hidden shadow-md flex items-center justify-center shrink-0 bg-transparent ${className}`}>
        <img
          src="/logo.png"
          alt="KotoBase Logo"
          className="w-full h-full object-contain"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  // Fallback dự phòng khi chưa có file logo.png trong public/
  return (
    <div className={`${dimension} rounded-xl md:rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white font-extrabold ${textSize} shadow-lg shadow-amber-500/20 shrink-0 ${className}`}>
      言
    </div>
  );
}
