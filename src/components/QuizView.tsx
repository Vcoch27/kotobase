"use client";

import { useCallback, useEffect, useLayoutEffect, useState, ComponentProps } from "react";
import { Headphones, Keyboard, Mic } from "lucide-react";
import { TypingQuizView } from "./TypingQuizView";
import { SpeakingQuizView } from "./SpeakingQuizView";
import { ListeningQuizView } from "./ListeningQuizView";
import { readQuizMode, studyStorageKey, writeStudyData, type QuizMode } from "@/lib/study-session";

interface QuizViewProps extends Omit<ComponentProps<typeof TypingQuizView>, "sessionKey"> {
  userId?: string;
  requestedListening?: number;
  prepareMode?: (mode: QuizMode) => Promise<boolean>;
}

export function QuizView({ userId, requestedListening, prepareMode, onFullscreenChange, ...props }: QuizViewProps) {
  const modeKey = studyStorageKey(userId, "quiz-mode");
  const [mode, setMode] = useState(() => requestedListening ? "listening" : readQuizMode(modeKey));
  const [preparing, setPreparing] = useState(false);
  const sessionKey = studyStorageKey(userId, mode);
  const [fullscreen, setFullscreen] = useState(false);
  const handleFullscreenChange = useCallback((value: boolean) => {
    setFullscreen(value);
    onFullscreenChange?.(value);
  }, [onFullscreenChange]);
  useEffect(() => { if (requestedListening) setMode("listening"); }, [requestedListening]);
  useLayoutEffect(() => { writeStudyData(modeKey, mode); }, [modeKey, mode]);
  const changeMode = async (next: QuizMode) => {
    if (next === mode || preparing) return;
    if (!prepareMode) {
      setMode(next);
      return;
    }
    setPreparing(true);
    try {
      if (await prepareMode(next)) setMode(next);
    } finally {
      setPreparing(false);
    }
  };
  return (
    <div className="space-y-4">
      {!fullscreen && <div
        className="mx-auto flex w-fit max-w-full flex-wrap justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        role="group"
        aria-label="Cách trả lời Quiz"
      >
        {(
          [
            { id: "typing", label: "Gõ phím", Icon: Keyboard },
            { id: "speaking", label: "Luyện nói", Icon: Mic },
            { id: "listening", label: "Nghe & hiểu", Icon: Headphones },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            type="button"
            key={id}
            aria-pressed={mode === id}
            disabled={preparing}
            onClick={() => { void changeMode(id); }}
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:px-5 ${mode === id ? (id === "speaking" ? "bg-emerald-600 text-white shadow-sm" : "bg-purple-600 text-white shadow-sm") : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>}
      {mode === "typing" ? (
        <TypingQuizView {...props} sessionKey={sessionKey} onFullscreenChange={handleFullscreenChange} />
      ) : mode === "speaking" ? (
        <SpeakingQuizView {...props} sessionKey={sessionKey} onFullscreenChange={handleFullscreenChange} />
      ) : (
        <ListeningQuizView key={requestedListening || "listening"} {...props} sessionKey={sessionKey} onFullscreenChange={handleFullscreenChange} />
      )}
    </div>
  );
}
