"use client";

import React, { useState } from "react";
import { parseKanjiSegments } from "@/lib/kanji-parser";
import { KanjiModal } from "./KanjiModal";
import { cn } from "@/lib/cn";

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
  const [activeChar, setActiveChar] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!text) return null;

  const segments = parseKanjiSegments(text);

  const handleKanjiClick = (char: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài (ví dụ card toggle)
    setActiveChar(char);
    setSelectedKanji(char);
    setIsModalOpen(true);
  };

  return (
    <>
      <span className={`inline ${className}`}>
        {segments.map((segment, idx) => {
          if (segment.isKanji) {
            const isActive = isModalOpen && activeChar === segment.text;
            return (
              <span
                key={idx}
                onClick={(e) => handleKanjiClick(segment.text, e)}
                title={`Bấm để xem & sửa thông tin Hán tự ${segment.text}`}
                className={cn(
                  "cursor-pointer font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10 px-0.5 rounded transition-all duration-150 active:scale-95 inline-block",
                  isActive && "bg-amber-500/20 ring-1 ring-amber-400 scale-95",
                  kanjiClassName
                )}
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
          setActiveChar(null);
        }}
      />
    </>
  );
}
