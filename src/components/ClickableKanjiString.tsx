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
      <span className={`inline ${className}`}>
        {segments.map((segment, idx) => {
          if (segment.isKanji) {
            return (
              <span
                key={idx}
                onClick={(e) => handleKanjiClick(segment.text, e)}
                title={`Bấm để xem & sửa thông tin Hán tự ${segment.text}`}
                className={`cursor-pointer font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10 px-0.5 rounded transition-colors duration-150 ${kanjiClassName}`}
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
