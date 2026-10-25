"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { openMicrophone, MicrophoneCapture } from "@/lib/microphone-capture";
import {
  measureMicrophone,
  microphoneError,
  MicrophoneSettings,
} from "@/lib/microphone-settings";

export function useMicrophoneTest() {
  const [status, setStatus] = useState<
    "idle" | "opening" | "recording" | "recorded" | "error"
  >("idle");
  const [message, setMessage] = useState(
    "Bấm Test mic, nói một câu rồi dừng để nghe lại.",
  );
  const [level, setLevel] = useState({ level: 0, db: -80, clipping: false });
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [applied, setApplied] = useState<MediaTrackSettings | null>(null);
  const epoch = useRef(0),
    pending = useRef(false);
  const capture = useRef<MicrophoneCapture | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const frame = useRef<number>();
  const url = useRef("");
  const controller = useRef<AbortController | null>(null);
  const release = useCallback(() => {
    clearTimeout(timer.current);
    cancelAnimationFrame(frame.current || 0);
    capture.current?.dispose();
    capture.current = null;
  }, []);
  const stop = useCallback(() => {
    const current = recorder.current;
    if (current) {
      if (current.state !== "inactive") {
        current.stop();
        release();
      }
    } else {
      epoch.current++;
      controller.current?.abort();
      release();
      setStatus("idle");
      setMessage("Micro đã dừng.");
    }
    setLevel({ level: 0, db: -80, clipping: false });
  }, [release]);
  const discard = useCallback(() => {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = "";
    setAudioUrl("");
  }, []);
  const start = useCallback(
    async (settings: MicrophoneSettings) => {
      if (pending.current) {
        setMessage(
          "Đang chờ yêu cầu quyền micro trước đó. Hãy cho phép hoặc đóng yêu cầu.",
        );
        return;
      }
      const id = ++epoch.current;
      recorder.current = null;
      release();
      discard();
      setApplied(null);
      setSeconds(0);
      setStatus("opening");
      setMessage("Đang mở micro. Hãy cho phép khi trình duyệt hỏi.");
      pending.current = true;
      controller.current?.abort();
      controller.current = new AbortController();
      try {
        const value = await openMicrophone(settings, controller.current.signal);
        if (id !== epoch.current) {
          value.dispose();
          return;
        }
        capture.current = value;
        setApplied(value.settings);
        setStatus("recording");
        setMessage(
          "Đang thu thử, tối đa 8 giây. Âm thanh chỉ ở trên thiết bị.",
        );
        const started = performance.now();
        let lastMeter = -Infinity;
        const samples = new Float32Array(value.analyser.fftSize);
        const draw = () => {
          if (id !== epoch.current || !capture.current) return;
          const now = performance.now();
          if (now - lastMeter > 75) {
            lastMeter = now;
            value.analyser.getFloatTimeDomainData(samples);
            setLevel(measureMicrophone(samples));
            setSeconds(Math.min(8, Math.floor((now - started) / 1000)));
          }
          frame.current = requestAnimationFrame(draw);
        };
        draw();
        if (typeof MediaRecorder === "undefined") {
          setMessage(
            "Đang đo mức mic. Trình duyệt này chưa hỗ trợ ghi để nghe lại.",
          );
          timer.current = setTimeout(stop, 8000);
          return;
        }
        const current = new MediaRecorder(value.stream);
        recorder.current = current;
        const chunks: Blob[] = [];
        let bytes = 0;
        current.ondataavailable = (event) => {
          if (id !== epoch.current || !event.data.size) return;
          chunks.push(event.data);
          bytes += event.data.size;
          if (bytes > 5_000_000 && current.state === "recording")
            current.stop();
        };
        current.onstop = () => {
          if (id !== epoch.current) return;
          release();
          setLevel({ level: 0, db: -80, clipping: false });
          const blob = new Blob(chunks, {
            type: current.mimeType || chunks[0]?.type || "audio/webm",
          });
          if (!blob.size) {
            setStatus("error");
            setMessage("Chưa ghi được âm thanh. Hãy thử nói lâu hơn một chút.");
            return;
          }
          url.current = URL.createObjectURL(blob);
          setAudioUrl(url.current);
          setStatus("recorded");
          setMessage("Micro đã tắt. Bấm phát bên dưới để nghe lại bản thử.");
        };
        current.onerror = () => {
          if (id === epoch.current) {
            epoch.current++;
            release();
            setStatus("error");
            setMessage(
              "Không ghi được bản thử. Hãy kiểm tra micro rồi thử lại.",
            );
          }
        };
        current.start(200);
        timer.current = setTimeout(() => {
          if (id === epoch.current) stop();
        }, 8000);
      } catch (error) {
        if (id !== epoch.current) return;
        release();
        setStatus("error");
        setMessage(microphoneError(error));
      } finally {
        pending.current = false;
      }
    },
    [release, discard, stop],
  );
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      epoch.current++;
      controller.current?.abort();
      if (recorder.current?.state === "recording") recorder.current.stop();
      release();
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, [stop, release]);
  return {
    status,
    message,
    level,
    seconds,
    audioUrl,
    applied,
    start,
    stop,
    discard,
  };
}
