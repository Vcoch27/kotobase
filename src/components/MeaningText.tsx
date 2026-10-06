"use client";

import React, { useState } from "react";
import { Lightbulb, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ParsedMeaningData {
  /** Nghĩa chính sau khi đã loại bỏ toàn bộ khối <<...>> */
  cleanMeaning: string;
  /** Danh sách các mẹo nhớ cách đọc tìm thấy trong <<...>> */
  tips: string[];
  /** Có chứa mẹo nhớ cách đọc hay không */
  hasTip: boolean;
}

/**
 * Phân tích chuỗi meaning để trích xuất mẹo nhớ cách đọc trong cú pháp <<...>>
 * Ví dụ: "thêm vào, bổ sung, gia tăng <<kứ wuăng..>>"
 * => cleanMeaning: "thêm vào, bổ sung, gia tăng"
 * => tips: ["kứ wuăng.."]
 */
export function parseMeaning(text?: string | null): ParsedMeaningData {
  if (!text) {
    return { cleanMeaning: "", tips: [], hasTip: false };
  }

  const tips: string[] = [];
  const regex = /<<([^>]+)>>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const rawTip = match[1]?.trim();
    if (rawTip) {
      tips.push(rawTip);
    }
  }

  // Loại bỏ các khối <<...>> và chuẩn hóa dấu phẩy, khoảng trắng thừa
  const cleanMeaning = text
    .replace(/<<[^>]+>>/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,;.])/g, "$1")
    .trim();

  return {
    cleanMeaning,
    tips,
    hasTip: tips.length > 0,
  };
}

interface MeaningTextProps {
  /** Chuỗi nghĩa gốc (có thể chứa <<mẹo đọc>>) */
  text?: string | null;
  /** Class của wrapper ngoài */
  className?: string;
  /** Class riêng cho phần văn bản nghĩa */
  meaningClassName?: string;
  /** Class riêng cho badge mẹo nhớ */
  tipClassName?: string;
  /** Ẩn hoàn toàn mẹo nhớ (chỉ hiện nghĩa sạch) */
  hideTip?: boolean;
  /** Kiểu bố trí mẹo: inline (cùng dòng) hoặc block (xuống dòng) hoặc auto */
  layout?: "inline" | "block" | "auto";
  /** Kích thước hiển thị: sm (table), md (card), lg (flashcard/quiz to) */
  size?: "sm" | "md" | "lg";
}

/**
 * Component hiển thị Nghĩa từ vựng kèm Mẹo nhớ cách đọc được phân tách đẹp mắt
 */
export function MeaningText({
  text,
  className = "",
  meaningClassName = "",
  tipClassName = "",
  hideTip = false,
  layout = "auto",
  size = "md",
}: MeaningTextProps) {
  if (!text) return null;

  const { cleanMeaning, tips, hasTip } = parseMeaning(text);

  if (!hasTip || hideTip) {
    return <span className={cn(meaningClassName, className)}>{cleanMeaning || text}</span>;
  }

  const tipSizeStyles = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm sm:text-base px-3.5 py-1.5 gap-2 font-semibold",
  };

  const isBlock = layout === "block" || (layout === "auto" && size === "lg");

  return (
    <span className={cn(isBlock ? "inline-flex flex-col items-start gap-1.5" : "inline-flex items-baseline flex-wrap gap-1.5", className)}>
      {/* Nghĩa chính */}
      <span className={meaningClassName}>{cleanMeaning}</span>

      {/* Danh sách badge mẹo nhớ cách đọc */}
      {tips.map((tip, idx) => (
        <span
          key={idx}
          title="Mẹo nhớ cách đọc"
          className={cn(
            "inline-flex items-center rounded-xl font-bold select-none",
            "bg-amber-100/80 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300",
            "border border-amber-300/80 dark:border-amber-500/30 shadow-xs",
            "align-middle transition-transform hover:scale-105",
            tipSizeStyles[size],
            tipClassName
          )}
        >
          <Lightbulb className={cn(size === "sm" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5", "text-amber-600 dark:text-amber-400 shrink-0")} />
          <span className="tracking-wide">{tip}</span>
        </span>
      ))}
    </span>
  );
}

interface QuizMeaningPromptProps {
  /** Chuỗi nghĩa gốc của từ vựng */
  text?: string | null;
  /** Class của chữ nghĩa lớn */
  meaningClassName?: string;
}

/**
 * Component dành riêng cho ĐỀ BÀI DẠNG 2 của Quiz:
 * - Hiển thị nghĩa chính to rõ (đã lọc sạch mẹo nhớ để không lộ cách đọc).
 * - Nếu có mẹo nhớ trong <<...>>, cung cấp nút bật/tắt gợi ý khi người học bí.
 */
export function QuizMeaningPrompt({ text, meaningClassName = "" }: QuizMeaningPromptProps) {
  const [showHint, setShowHint] = useState(false);

  if (!text) return null;

  const { cleanMeaning, tips, hasTip } = parseMeaning(text);

  return (
    <div className="flex flex-col items-center justify-center gap-2 max-w-xl mx-auto">
      {/* Nghĩa chính to rõ, đã loại bỏ mẹo đọc */}
      <div className={cn("leading-tight break-words text-center", meaningClassName)}>
        {cleanMeaning}
      </div>

      {/* Switch gợi ý mẹo nhớ cách đọc (chỉ hiện khi từ có mẹo đọc) */}
      {hasTip && (
        <div className="mt-1 flex flex-col items-center gap-1.5 animate-fadeIn">
          {showHint ? (
            <div
              onClick={() => setShowHint(false)}
              className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 shadow-sm animate-scaleIn select-none"
              title="Bấm để ẩn gợi ý mẹo đọc"
            >
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
              <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm font-bold">
                <span className="text-slate-500 dark:text-slate-400 font-normal">Mẹo đọc:</span>
                {tips.map((t, i) => (
                  <span key={i} className="text-amber-700 dark:text-amber-300 underline underline-offset-2">
                    {t}
                  </span>
                ))}
              </div>
              <EyeOff className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 ml-1" />
            </div>
          ) : (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowHint(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:border-amber-300 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Bấm để xem gợi ý mẹo nhớ cách đọc khi chưa nghĩ ra"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Gợi ý mẹo đọc</span>
              <Eye className="w-3 h-3 opacity-60 ml-0.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
