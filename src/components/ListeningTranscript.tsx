"use client";

import { useEffect, useMemo, useRef } from "react";

export type ListeningTranscriptData = {
  schemaVersion: number;
  status: "machine_transcript";
  index: number;
  label: string;
  driveFileId: string;
  duration: number;
  sections: { part: number; label: string; start: number; end: number }[];
  cues: { start: number; end: number; ja: string }[];
};

function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function ListeningTranscript({ data, position, focusPart, onSeek }: {
  data: ListeningTranscriptData;
  position: number;
  focusPart?: number;
  onSeek: (time: number) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const activeRow = useRef<HTMLButtonElement>(null);
  const activeIndex = useMemo(() => {
    for (let index = data.cues.length - 1; index >= 0; index--) {
      if (position >= data.cues[index].start && position < data.cues[index].end) return index;
    }
    return -1;
  }, [data.cues, position]);
  const activePart = data.sections.find(part => position >= part.start && position < part.end)?.part;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const box = viewport.current;
      const row = activeRow.current;
      if (!box || !row) return;
      const previous = row.previousElementSibling as HTMLElement | null;
      const target = (previous?.getBoundingClientRect().height || 0) + 2;
      const offset = row.getBoundingClientRect().top - box.getBoundingClientRect().top - target;
      if (Math.abs(offset) > 3) box.scrollTop += offset;
    });
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, data]);

  return <section className="flex h-[45vh] min-h-80 max-h-[600px] flex-col bg-surface-raised" aria-label="Script đồng bộ bài nghe">
    <div className="border-b border-primary/10 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-body text-body font-bold">Script đồng bộ · đề {data.label}</h3>
        <span className="text-caption text-text-muted">Bản chép tự động · đối chiếu lại bằng tai</span>
      </div>
      <nav className="mt-3 flex flex-wrap gap-1" aria-label="Chuyển đến dạng nghe">
        {data.sections.map(part => <button key={part.part} type="button" onClick={() => onSeek(part.start)}
          aria-current={activePart === part.part ? "true" : undefined}
          className={`rounded-lg px-2.5 py-1.5 text-caption font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${activePart === part.part ? "bg-primary text-surface" : focusPart === part.part ? "bg-accent-muted text-primary" : "bg-surface text-text-muted hover:text-primary"}`}
          title={`${timeLabel(part.start)} · ${part.label}`}>
          Dạng {part.part}{focusPart === part.part ? " · buổi này" : ""}
        </button>)}
      </nav>
    </div>
    <div ref={viewport} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[360px]" aria-label="Nội dung nghe theo thời gian">
      {data.cues.map((cue, index) => <button key={`${cue.start}-${index}`} type="button" ref={index === activeIndex ? activeRow : undefined}
        onClick={() => onSeek(cue.start)} aria-current={index === activeIndex ? "true" : undefined}
        className={`grid w-full grid-cols-[3.5rem_minmax(0,1fr)] gap-3 rounded-lg border-b border-primary/10 px-2 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${index === activeIndex ? "bg-accent-muted text-primary" : "hover:bg-surface"}`}>
        <span className="pt-0.5 text-caption tabular-nums text-text-muted">{timeLabel(cue.start)}</span>
        <span lang="ja" className="font-body text-body leading-relaxed">{cue.ja}</span>
      </button>)}
    </div>
  </section>;
}
