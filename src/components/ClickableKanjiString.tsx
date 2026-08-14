"use client";

import React, { useState } from "react";
import { parseKanjiSegments } from "@/lib/kanji-parser";
import { KanjiModal } from "./KanjiModal";

interface ClickableKanjiStringProps {
  text: string;
  className?: string;
  kanjiClassName?: string;
}

export function ClickableKanjiString({
  text,
  className = "",
  kanjiClassName = "",
}: ClickableKanjiStringProps) {
  const [selectedKanji, setSelectedKanji] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!text) return null;

  const segments = parseKanjiSegments(text);

  const handleKanjiClick = (char: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài (ví dụ card toggle)
    setSelectedKanji(char);
    setIsModalOpen(true);
  };

  return (
    <>
      <span className={`inline-flex items-center flex-wrap gap-0.5 ${className}`}>
        {segments.map((segment, idx) => {
          if (segment.isKanji) {
            return (
              <span
                key={idx}
                onClick={(e) => handleKanjiClick(segment.text, e)}
                title={`Bấm để xem & sửa thông tin Hán tự ${segment.text}`}
                className={`cursor-pointer px-1 py-0.5 rounded-md font-bold text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/30 hover:border-amber-400 dark:hover:border-amber-400 transition-all duration-150 shadow-sm hover:scale-105 ${kanjiClassName}`}
              >
                {segment.text}
              </span>
            );
          }
          return <span key={idx}>{segment.text}</span>;
        })}
      </span>

      <KanjiModal
        character={selectedKanji}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedKanji(null);
        }}
      />
    </>
  );
}
