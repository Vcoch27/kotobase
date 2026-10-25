"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  browserRecognitionFactory,
  SpeechSession,
  SpeechSnapshot,
  SpeechAttempt,
} from "@/lib/speech-session";

export function useSpeechQuiz(options: {
  questionKey: string;
  enabled: boolean;
  evaluate: (alternatives: string[]) => string | null;
  onMatch: (text: string) => void;
  onAttempt?: (attempt: SpeechAttempt) => void;
}) {
  const latest = useRef(options);
  latest.current = options;
  const session = useRef<SpeechSession | null>(null);
  const contextKey = useRef(options.questionKey);
  const [snapshot, setSnapshot] = useState<SpeechSnapshot>({
    status: "idle",
    transcript: "",
    interim: false,
    message: "",
    history: [],
    attempts: 0,
  });
  useEffect(() => {
    const controller = new SpeechSession(
      browserRecognitionFactory(),
      setSnapshot,
      (alternatives) =>
        contextKey.current === latest.current.questionKey
          ? latest.current.evaluate(alternatives)
          : null,
      (text) => {
        if (contextKey.current === latest.current.questionKey)
          latest.current.onMatch(text);
      },
      (attempt) => {
        if (contextKey.current === latest.current.questionKey)
          latest.current.onAttempt?.(attempt);
      },
    );
    session.current = controller;
    controller.setContext(latest.current.questionKey, latest.current.enabled);
    const hide = () => {
      if (document.hidden)
        controller.pause(
          "Đã tạm dừng khi rời trang. Bấm tiếp tục để mở lại micro.",
        );
    };
    const pagehide = () => controller.pause("Đã rời trang.");
    const offline = () =>
      controller.pause("Bạn đang mất mạng. Kết nối lại rồi bấm tiếp tục.");
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("offline", offline);
    window.addEventListener("pagehide", pagehide);
    return () => {
      controller.dispose();
      session.current = null;
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("offline", offline);
      window.removeEventListener("pagehide", pagehide);
    };
  }, []);
  useEffect(() => {
    contextKey.current = options.questionKey;
    session.current?.setContext(options.questionKey, options.enabled);
    if (!options.enabled) return;
    // A hidden Dashboard tab must never retain microphone permission intent.
    return () => {
      session.current?.setContext(options.questionKey, false);
    };
  }, [options.questionKey, options.enabled]);
  const start = useCallback((holdToTalk = false) => {
    if (!window.isSecureContext) {
      session.current?.pause(
        "Micro cần HTTPS hoặc localhost. Hãy mở bản web HTTPS.",
      );
      return;
    }
    if (!navigator.onLine) {
      session.current?.pause("Cần kết nối mạng để dùng nhận giọng nói.");
      return;
    }
    session.current?.start(!holdToTalk);
  }, []);
  const pause = useCallback(
    (message?: string) => session.current?.pause(message),
    [],
  );
  const suspend = useCallback(
    () => session.current?.setContext(latest.current.questionKey, false),
    [],
  );
  const release = useCallback(() => session.current?.release(), []);
  return { ...snapshot, start, pause, suspend, release };
}
