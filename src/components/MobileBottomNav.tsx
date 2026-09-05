"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BookOpen, MessageSquareQuote, Languages, 
  Sparkles, Smartphone, GraduationCap, LayoutGrid 
} from "lucide-react";
import { cn } from "@/lib/cn";

export function MobileBottomNav() {
  const pathname = usePathname();

  // Ẩn thanh bottom nav khi ở trang login
  if (pathname === "/login") return null;

  const navItems = [
    {
      href: "/",
      label: "Từ vựng",
      icon: LayoutGrid,
      isActive: pathname === "/",
      color: "text-amber-500",
      activeBg: "bg-amber-500/10"
    },
    {
      href: "/grammar",
      label: "Ngữ pháp",
      icon: GraduationCap,
      isActive: pathname.startsWith("/grammar"),
      color: "text-violet-500",
      activeBg: "bg-violet-500/10"
    },
    {
      href: "/sentences",
      label: "Mẫu câu",
      icon: MessageSquareQuote,
      isActive: pathname.startsWith("/sentences"),
      color: "text-emerald-500",
      activeBg: "bg-emerald-500/10"
    },
    {
      href: "/kanji",
      label: "Hán tự",
      icon: Languages,
      isActive: pathname.startsWith("/kanji"),
      color: "text-rose-500",
      activeBg: "bg-rose-500/10"
    },
    {
      href: "/download",
      label: "Tải App",
      icon: Smartphone,
      isActive: pathname === "/download",
      color: "text-indigo-500",
      activeBg: "bg-indigo-500/10",
      badge: "Mới"
    }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] transition-colors duration-300">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200",
                item.isActive 
                  ? cn(item.color, item.activeBg, "font-bold scale-105") 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5 transition-transform" />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-3 text-[9px] font-black px-1.5 py-0.2 rounded-full bg-indigo-600 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
