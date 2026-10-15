"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Question = {
  part: number;
  number: number;
  start: number;
  end: number;
  promptJa?: string;
  promptRuby?: string;
  promptVi?: string;
  timing: "source" | "audio_marker" | "estimated";
};

export type ListeningTranscriptData = {
  schemaVersion: number;
  status: "machine_transcript";
  index: number;
  label: string;
  driveFileId: string;
  duration: number;
  sections: { part: number; label: string; start: number; end: number }[];
  questions?: Question[];
  cues: { start: number; end: number; ja: string; ruby?: string; vi?: string }[];
};

function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function Japanese({ plain, ruby, showRuby }: { plain: string; ruby?: string; showRuby: boolean }) {
  if (!showRuby || !ruby) return <>{plain}</>;
  return <>{ruby.split(/(\{[^{}|]+\|[^{}]+\})/g).map((part, index) => {
    const match = /^\{([^{}|]+)\|([^{}]+)\}$/.exec(part);
    return match ? <ruby key={index}>{match[1]}<rt>{match[2]}</rt></ruby> : <span key={index}>{part}</span>;
  })}</>;
}

export function ListeningTranscript({ data, position, focusPart, onSeek }: {
  data: ListeningTranscriptData;
  position: number;
  focusPart?: number;
  onSeek: (time: number) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const activeRow = useRef<HTMLButtonElement>(null);
  const [showVietnamese, setShowVietnamese] = useState(false);
  const [showRuby, setShowRuby] = useState(false);
  const activeIndex = useMemo(() => {
    for (let index = data.cues.length - 1; index >= 0; index--) {
      if (position >= data.cues[index].start && position < data.cues[index].end) return index;
    }
    return -1;
  }, [data.cues, position]);
  const activePart = data.sections.find(part => position >= part.start && position < part.end)?.part;
  const questions = data.questions || [];
  const activeQuestion = questions.find(question => position >= question.start && position < question.end);
  const visibleQuestions = questions.filter(question => question.part === (activePart || focusPart || 1));
  const firstCueOfQuestion = useMemo(() => {
    const starts = new Map<number, Question[]>();
    for (const question of questions) {
      const cueIndex = data.cues.findIndex(cue => cue.start >= question.start - 0.15);
      if (cueIndex >= 0) starts.set(cueIndex, [...(starts.get(cueIndex) || []), question]);
    }
    return starts;
  }, [data.cues, questions]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const box = viewport.current;
      const row = activeRow.current;
      if (!box || !row) return;
      const previous = row.parentElement?.previousElementSibling as HTMLElement | null;
      const target = Math.min(previous?.getBoundingClientRect().height || 64, 110) + 2;
      const offset = row.getBoundingClientRect().top - box.getBoundingClientRect().top - target;
      if (Math.abs(offset) > 3) box.scrollTop += offset;
    });
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, data]);

  return <section className="listening-transcript flex h-[28rem] min-h-0 min-w-0 flex-col overflow-hidden bg-surface-raised md:h-full" aria-label="Script đồng bộ bài nghe">
    <div className="border-b border-primary/10 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <h3 className="font-body text-body font-bold">Script · đề {data.label}</h3>
        <span className="text-caption text-text-muted">Chép lời tự động</span>
      </div>
      <nav className="mt-2 flex flex-wrap gap-1" aria-label="Chuyển đến Mondai">
        {data.sections.map(part => <button key={part.part} type="button" onClick={() => onSeek(part.start)}
          aria-current={activePart === part.part ? "true" : undefined}
          className={`rounded-md px-2 py-1 text-caption font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${activePart === part.part ? "bg-primary text-surface" : focusPart === part.part ? "bg-accent-muted text-primary" : "bg-surface text-text-muted hover:text-primary"}`}
          title={`${timeLabel(part.start)} · ${part.label}`}>
          Mondai {part.part}
        </button>)}
      </nav>
      {visibleQuestions.length > 0 && <nav className="mt-2 flex gap-1 overflow-x-auto pb-1" aria-label="Chuyển đến câu nghe">
        {visibleQuestions.map(question => <button key={`${question.part}-${question.number}`} type="button" onClick={() => onSeek(question.start)}
          aria-current={activeQuestion === question ? "true" : undefined}
          className={`shrink-0 rounded-md border px-2 py-1 text-caption tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${activeQuestion === question ? "border-primary bg-accent-muted font-bold text-primary" : "border-primary/10 bg-surface text-text-muted hover:text-primary"}`}
          title={`Câu ${question.number} · ${timeLabel(question.start)}${question.timing === "estimated" ? " · mốc ước tính" : ""}`}>
          Câu {question.number}
        </button>)}
      </nav>}
      <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Tùy chọn script">
        <button type="button" aria-pressed={showVietnamese} title="Bản dịch tự động, nên đối chiếu với audio" onClick={() => setShowVietnamese(value => !value)} className={`rounded-md px-2 py-1 text-caption ${showVietnamese ? "bg-primary text-surface" : "bg-surface text-text-muted"}`}>Việt song ngữ</button>
        <button type="button" aria-pressed={showRuby} title="Cách đọc tự động, có thể sai ở một số từ" onClick={() => setShowRuby(value => !value)} className={`rounded-md px-2 py-1 text-caption ${showRuby ? "bg-primary text-surface" : "bg-surface text-text-muted"}`}>振 Furigana</button>
      </div>
    </div>
    <div ref={viewport} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-24" aria-label="Nội dung nghe theo thời gian">
      {data.cues.map((cue, index) => {
        const startingQuestions = firstCueOfQuestion.get(index) || [];
        return <div key={`${cue.start}-${index}`}>
          {startingQuestions.map(question => <div key={`${question.part}-${question.number}`} className={`mt-2 rounded-t-lg border-l-2 px-3 py-2 ${activeQuestion === question ? "border-primary bg-accent-muted" : "border-primary/30 bg-surface"}`}>
            <div className="flex flex-wrap items-center gap-2 text-caption font-bold text-primary">
              <span>Mondai {question.part} · Câu {question.number}</span>
              <span className="font-normal tabular-nums text-text-muted">{timeLabel(question.start)}</span>
              {question.timing === "estimated" && <span className="font-normal text-text-muted">Mốc ước tính</span>}
            </div>
            {question.promptJa && <p lang="ja" className="mt-1 text-body-sm leading-relaxed"><Japanese plain={question.promptJa} ruby={question.promptRuby} showRuby={showRuby} /></p>}
            {showVietnamese && question.promptVi && <p className="mt-1 text-caption text-text-muted">{question.promptVi}</p>}
            {cue.start >= question.end && <p className="mt-1 text-caption text-text-muted">Chưa nhận dạng được lời ở đoạn này.</p>}
          </div>)}
          <button type="button" ref={index === activeIndex ? activeRow : undefined}
            onClick={() => onSeek(cue.start)} aria-current={index === activeIndex ? "true" : undefined}
            className={`grid w-full grid-cols-[2.8rem_minmax(0,1fr)] gap-2 rounded-md border-b border-primary/10 px-2 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${index === activeIndex ? "bg-accent-muted text-primary" : "hover:bg-surface"}`}>
            <span className="pt-0.5 text-caption tabular-nums text-text-muted">{timeLabel(cue.start)}</span>
            <span className="min-w-0"><span lang="ja" className="block font-body text-body-sm leading-relaxed"><Japanese plain={cue.ja} ruby={cue.ruby} showRuby={showRuby} /></span>{showVietnamese && cue.vi && <span className="mt-1 block text-caption leading-relaxed text-text-muted">{cue.vi}</span>}</span>
          </button>
        </div>;
      })}
    </div>
  </section>;
}
