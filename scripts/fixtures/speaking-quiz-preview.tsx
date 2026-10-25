"use client";
// Temporary local-only fixture. Removed before production build/commit.
import { useEffect, useState, useRef } from "react";
import { QuizView } from "@/components/QuizView";
import type { RecognitionLike } from "@/lib/speech-session";
const words = [
  {
    id: "qa-1",
    word: "強み",
    reading: "つよみ",
    meaning: "Điểm mạnh, thế mạnh <<tsuyomi>>",
    sinoVietnamese: "CƯỜNG",
    example:
      "私の強みはチームワークです。\nĐiểm mạnh của tôi là làm việc nhóm.",
    note: "Dùng khi giới thiệu bản thân.",
  },
  {
    id: "qa-2",
    word: "反省",
    reading: "はんせい",
    meaning: "Nhìn lại, tự kiểm điểm",
    sinoVietnamese: "PHẢN TỈNH",
  },
  { id: "qa-3", word: "コーヒー", reading: "コーヒー", meaning: "Cà phê" },
];
let starts = 0,
  aborts = 0;
export default function SpeakingQA() {
  const current = useRef<RecognitionLike | null>(null);
  const lastSample = useRef<SpeechSynthesisUtterance | null>(null);
  const [ready, setReady] = useState(false);
  const [text, setText] = useState("つよみ");
  const [active, setActive] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const [stats, setStats] = useState("");
  useEffect(() => {
    const originalUtterance = window.SpeechSynthesisUtterance;
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class {
        constructor(public text: string) {}
      },
    });
    const originalSynth = Object.getOwnPropertyDescriptor(
      window,
      "speechSynthesis",
    );
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [{ lang: "ja-JP" }],
        addEventListener() {},
        removeEventListener() {},
        cancel() {
          lastSample.current = null;
        },
        speak(utterance: SpeechSynthesisUtterance) {
          lastSample.current = utterance;
          setStats(
            `Starts ${starts} / Aborts ${aborts} / Audio ${utterance.text}`,
          );
        },
      },
    });
    setEmbedded(new URLSearchParams(location.search).has("embedded"));
    class Mock {
      lang = "";
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onspeechstart = null;
      onspeechend = null;
      onresult = null;
      onerror = null;
      onend = null;
      start() {
        current.current = this;
        starts++;
        setStats(`Starts ${starts} / Aborts ${aborts}`);
        setTimeout(() => this.onstart?.(), 10);
      }
      abort() {
        aborts++;
        if (current.current === this) current.current = null;
        setStats(`Starts ${starts} / Aborts ${aborts}`);
      }
      stop() {
        setStats(`Starts ${starts} / Aborts ${aborts} / Released`);
      }
    }
    Object.assign(window, { SpeechRecognition: Mock });
    setReady(true);
    return () => {
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        configurable: true,
        value: originalUtterance,
      });
      if (originalSynth)
        Object.defineProperty(window, "speechSynthesis", originalSynth);
      else
        delete (window as unknown as { speechSynthesis?: unknown })
          .speechSynthesis;
      delete (window as unknown as { SpeechRecognition?: unknown })
        .SpeechRecognition;
    };
  }, []);
  const result = (isFinal: boolean) =>
    current.current?.onresult?.({
      resultIndex: 0,
      results: [{ 0: { transcript: text }, length: 1, isFinal }],
    });
  return (
    <main className="min-h-screen bg-slate-50 p-3 dark:bg-slate-950 sm:p-6">
      {!embedded && (
        <div className="mb-4 flex gap-3">
          <h1>LOCAL QA · synthetic recognition · no microphone / Firestore</h1>
          <button onClick={() => setMobile((v) => !v)}>Mobile frame</button>
          <button
            onClick={() => document.documentElement.classList.toggle("dark")}
          >
            Dark theme
          </button>
        </div>
      )}
      {mobile && !embedded ? (
        <iframe
          title="Mobile QA"
          src="/speaking-qa?embedded=1"
          width="390"
          height="1100"
        />
      ) : (
        <>
          {ready && <QuizView vocabularies={words} isActive={active} />}
          <aside className="mx-auto mt-5 max-w-4xl rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-900">
            <p>QA fixture: {stats}</p>
            <label>
              Mock transcript{" "}
              <input
                aria-label="Mock transcript"
                className="border"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-3">
              <button onClick={() => result(false)}>Mock interim</button>
              <button onClick={() => result(true)}>Mock final</button>
              <button onClick={() => current.current?.onend?.()}>
                Mock end
              </button>
              <button
                onClick={() =>
                  lastSample.current?.onend?.({} as SpeechSynthesisEvent)
                }
              >
                Mock audio end
              </button>
              <button
                onClick={() => current.current?.onerror?.({ error: "network" })}
              >
                Mock network error
              </button>
              <button
                onClick={() =>
                  current.current?.onerror?.({ error: "not-allowed" })
                }
              >
                Mock denied
              </button>
              <button onClick={() => setActive((v) => !v)}>
                Toggle active
              </button>
              <button
                onClick={() => {
                  current.current?.onresult?.({
                    resultIndex: 0,
                    results: [
                      {
                        0: { transcript: words[0].reading },
                        length: 1,
                        isFinal: true,
                      },
                    ],
                  });
                }}
              >
                Mock 強み
              </button>
            </div>
          </aside>
        </>
      )}
    </main>
  );
}
