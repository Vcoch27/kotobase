"use client";

import { useState, ComponentProps } from "react";
import { Keyboard, Mic } from "lucide-react";
import { TypingQuizView } from "./TypingQuizView";
import { SpeakingQuizView } from "./SpeakingQuizView";

export function QuizView(props: ComponentProps<typeof TypingQuizView>) {
  const [mode, setMode] = useState<"typing" | "speaking">("typing");
  return (
    <div className="space-y-4">
      <div
        className="mx-auto flex w-fit max-w-full gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        role="group"
        aria-label="Cách trả lời Quiz"
      >
        {(
          [
            { id: "typing", label: "Gõ phím", Icon: Keyboard },
            { id: "speaking", label: "Luyện nói", Icon: Mic },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            type="button"
            key={id}
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${mode === id ? (id === "speaking" ? "bg-emerald-600 text-white shadow-sm" : "bg-purple-600 text-white shadow-sm") : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      {mode === "typing" ? (
        <TypingQuizView {...props} />
      ) : (
        <SpeakingQuizView {...props} />
      )}
    </div>
  );
}
