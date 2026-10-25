"use client";
import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  X,
  RefreshCw,
  ShieldCheck,
  Headphones,
  SlidersHorizontal,
  Save,
} from "lucide-react";
import {
  DEFAULT_MICROPHONE_SETTINGS,
  loadMicrophoneSettings,
  saveMicrophoneSettings,
  supportsProcessedRecognition,
  MicrophoneSettings,
} from "@/lib/microphone-settings";
import { useMicrophoneTest } from "@/hooks/useMicrophoneTest";

export function MicrophoneSettingsModal({ onClose }: { onClose(): void }) {
  const [settings, setSettings] = useState<MicrophoneSettings>(
    DEFAULT_MICROPHONE_SETTINGS,
  );
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [supported, setSupported] = useState<MediaTrackSupportedConstraints>(
    {},
  );
  const [processed, setProcessed] = useState(false);
  const [canRouteSpeaker, setCanRouteSpeaker] = useState(false);
  const [speaker, setSpeaker] = useState("");
  const [volume, setVolume] = useState(0.8);
  const [notice, setNotice] = useState("");
  const modal = useRef<HTMLDivElement>(null),
    audio = useRef<HTMLAudioElement>(null);
  const test = useMicrophoneTest();
  const busy = test.status === "opening" || test.status === "recording";
  const refresh = async () => {
    try {
      if (navigator.mediaDevices?.enumerateDevices)
        setDevices(await navigator.mediaDevices.enumerateDevices());
    } catch {
      setNotice("Chưa đọc được danh sách thiết bị. Bấm Test mic để cấp quyền.");
    }
  };
  useEffect(() => {
    setSettings(loadMicrophoneSettings());
    setProcessed(supportsProcessedRecognition(navigator.userAgent));
    setSupported(navigator.mediaDevices?.getSupportedConstraints?.() || {});
    setCanRouteSpeaker("setSinkId" in HTMLMediaElement.prototype);
    void refresh();
    window.dispatchEvent(new Event("kotobase_microphone_test_opened"));
    const previous = document.activeElement as HTMLElement | null;
    modal.current?.focus();
    const changed = () => {
      void refresh();
    };
    navigator.mediaDevices?.addEventListener("devicechange", changed);
    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", changed);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    if (test.status === "recording") {
      audio.current?.pause();
      void refresh();
    }
  }, [test.status]);
  useEffect(() => {
    const current = audio.current;
    if (!current) return;
    current.volume = volume;
    if ("setSinkId" in current) {
      void (
        current as HTMLAudioElement & { setSinkId(id: string): Promise<void> }
      )
        .setSinkId(speaker)
        .catch(() =>
          setNotice(
            "Chưa chuyển được loa nghe thử. Hãy dùng loa mặc định hoặc cấp quyền thiết bị.",
          ),
        );
    }
  }, [speaker, volume, test.audioUrl]);
  useEffect(() => {
    const current = audio.current;
    return () => {
      current?.pause();
      current?.removeAttribute("src");
      current?.load();
    };
  }, [test.audioUrl]);
  const change = <K extends keyof MicrophoneSettings>(
    key: K,
    value: MicrophoneSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setNotice("Chưa lưu thay đổi. Bấm Lưu để áp dụng cho lượt Quiz tiếp theo.");
  };
  const save = () => {
    test.stop();
    audio.current?.pause();
    if (saveMicrophoneSettings(settings))
      setNotice(
        "Đã lưu trên thiết bị này. Quiz dùng thiết lập mới từ lượt mở mic tiếp theo.",
      );
    else
      setNotice(
        "Trình duyệt chặn lưu cài đặt. Hãy kiểm tra quyền lưu trữ của trang.",
      );
  };
  const inputs = devices.filter((d) => d.kind === "audioinput"),
    outputs = devices.filter((d) => d.kind === "audiooutput");
  const btn =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";
  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="microphone-title"
        tabIndex={-1}
        className="my-auto flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
          if (event.key === "Tab") {
            event.stopPropagation();
            const items = modal.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),select:not(:disabled),input:not(:disabled),audio[controls]",
            );
            if (!items?.length) return;
            const first = items[0],
              last = items[items.length - 1];
            if (
              event.shiftKey &&
              (document.activeElement === first ||
                document.activeElement === modal.current)
            ) {
              event.preventDefault();
              last.focus();
            } else if (
              !event.shiftKey &&
              (document.activeElement === last ||
                document.activeElement === modal.current)
            ) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <Mic size={21} />
            </span>
            <div>
              <h2 id="microphone-title" className="text-lg font-bold">
                Micro & luyện nói
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Kiểm tra đầu vào, lọc âm và nghe lại giọng của bạn
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`${btn} p-2.5`}
            aria-label="Đóng cài đặt micro"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
          <div
            className={`rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${processed ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"}`}
          >
            {processed
              ? "Trình duyệt có hỗ trợ luồng âm đã xử lý cho Quiz. Cài đặt bên dưới áp dụng cho Test mic và lượt nhận giọng tiếp theo."
              : "Trên trình duyệt này, bộ lọc và chọn thiết bị áp dụng cho Test mic. Quiz dùng micro mặc định do trình duyệt quản lý. Dùng Chrome/Edge máy tính mới để áp dụng luồng mic đã xử lý cho Quiz."}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-bold">
              <span className="flex items-center gap-2">
                <Mic size={15} />
                Microphone
              </span>
              <select
                aria-label="Microphone"
                disabled={busy}
                value={settings.deviceId}
                onChange={(e) => change("deviceId", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Thiết bị mặc định</option>
                {settings.deviceId &&
                  !inputs.some((d) => d.deviceId === settings.deviceId) && (
                    <option value={settings.deviceId}>
                      Micro đã lưu (chưa xác định)
                    </option>
                  )}
                {inputs
                  .filter((d) => d.deviceId && d.deviceId !== "default")
                  .map((d, i) => (
                    <option value={d.deviceId} key={d.deviceId}>
                      {d.label || `Micro ${i + 1}`}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-bold">
              <span className="flex items-center gap-2">
                <Headphones size={15} />
                Loa nghe thử
              </span>
              <select
                aria-label="Loa nghe thử"
                disabled={busy || !canRouteSpeaker}
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Loa mặc định của thiết bị</option>
                {outputs
                  .filter((d) => d.deviceId && d.deviceId !== "default")
                  .map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Loa ${i + 1}`}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Tên thiết bị hiện sau khi cấp quyền micro. Chọn loa chỉ áp dụng
              cho bản nghe thử.
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refresh()}
              className="shrink-0 rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              aria-label="Làm mới thiết bị"
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="mb-4 flex items-center justify-between text-sm font-bold">
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={16} />
                Xử lý âm đầu vào
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Không cần API key
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  [
                    "noiseSuppression",
                    "Lọc tiếng ồn",
                    "Giảm tiếng quạt và tạp âm nền",
                  ],
                  [
                    "echoCancellation",
                    "Khử tiếng vọng",
                    "Giảm âm từ loa lọt ngược vào mic",
                  ],
                  [
                    "autoGainControl",
                    "Tự cân bằng âm lượng",
                    "Giữ tiếng nói ổn định hơn",
                  ],
                  [
                    "highPass",
                    "Giảm tiếng ù",
                    "Lọc tần số thấp dưới khoảng 80 Hz",
                  ],
                ] as const
              ).map(([key, title, description]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white p-3 dark:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    disabled={busy || (key !== "highPass" && !supported[key])}
                    onChange={(e) => change(key, e.target.checked)}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <span>
                    <span className="block text-xs font-bold">{title}</span>
                    <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                      {key !== "highPass" && !supported[key]
                        ? "Trình duyệt không cung cấp tùy chọn này"
                        : description}
                    </span>
                    {test.applied && key !== "highPass" && (
                      <span className="mt-1 block text-[11px] text-emerald-700 dark:text-emerald-300">
                        Thực tế:{" "}
                        {typeof test.applied[key] === "boolean"
                          ? test.applied[key]
                            ? "đang bật"
                            : "đang tắt"
                          : "không cung cấp trạng thái"}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            <label className="mt-4 block text-xs font-bold">
              Mức khuếch đại đầu vào · {Math.round(settings.gain * 100)}%
              <input
                aria-label="Mức khuếch đại đầu vào"
                className="mt-3 w-full accent-emerald-600"
                type="range"
                min="25"
                max="200"
                step="5"
                disabled={busy}
                value={Math.round(settings.gain * 100)}
                onChange={(e) => change("gain", Number(e.target.value) / 100)}
              />
            </label>
          </section>
          <section className="rounded-2xl border border-emerald-200 p-4 dark:border-emerald-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold">Kiểm tra micro</h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {test.status === "recording"
                  ? `${test.seconds} / 8 giây`
                  : "Micro chỉ mở khi bạn bấm Test"}
              </span>
            </div>
            <div
              role="meter"
              aria-label="Mức âm đầu vào"
              aria-valuenow={Math.round(test.level.level * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="my-4 flex h-7 gap-1"
              aria-valuetext={`${Math.round(test.level.db)} dBFS`}
            >
              {Array.from({ length: 40 }, (_, i) => (
                <span
                  key={i}
                  className={`min-w-0 flex-1 rounded-sm transition-colors ${i / 40 < test.level.level ? (i > 34 ? "bg-amber-500" : "bg-emerald-500") : "bg-slate-200 dark:bg-slate-700"}`}
                />
              ))}
            </div>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              {test.level.clipping
                ? "Âm đang quá lớn, thử giảm mức khuếch đại."
                : test.status === "recording"
                  ? test.level.db < -50
                    ? "Tín hiệu nhỏ. Hãy nói gần micro hơn hoặc tăng âm đầu vào."
                    : "Micro đang nhận âm thanh."
                  : "Không phát trực tiếp ra loa để tránh tiếng hú."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={test.status === "opening"}
                onClick={() => {
                  audio.current?.pause();
                  if (test.status === "recording") test.stop();
                  else void test.start(settings);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? <MicOff size={16} /> : <Mic size={16} />}
                {test.status === "opening"
                  ? "Đang xin quyền…"
                  : test.status === "recording"
                    ? "Dừng & nghe lại"
                    : "Test mic"}
              </button>
              {test.audioUrl && (
                <button
                  type="button"
                  className={btn}
                  onClick={() => {
                    audio.current?.pause();
                    test.discard();
                  }}
                >
                  Xóa bản thử
                </button>
              )}
            </div>
            <p
              role="status"
              className={`mt-3 text-xs leading-relaxed ${test.status === "error" ? "text-rose-600 dark:text-rose-300" : "text-slate-500 dark:text-slate-400"}`}
            >
              {test.message}
            </p>
            {test.audioUrl && (
              <div className="mt-4 space-y-3">
                <audio
                  ref={audio}
                  src={test.audioUrl}
                  controls
                  preload="metadata"
                  className="w-full"
                  aria-label="Nghe lại bản thử micro"
                />
                <label className="block text-xs font-semibold">
                  Âm lượng nghe thử · {Math.round(volume * 100)}%
                  <input
                    type="range"
                    aria-label="Âm lượng nghe thử"
                    min="0"
                    max="100"
                    value={Math.round(volume * 100)}
                    onChange={(e) => setVolume(Number(e.target.value) / 100)}
                    className="mt-2 w-full accent-emerald-600"
                  />
                </label>
              </div>
            )}
          </section>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <ShieldCheck size={17} className="shrink-0" />
            Bản test chỉ nằm trong bộ nhớ thiết bị và được xóa khi đóng cửa sổ.
            Không tải lên máy chủ. Khi luyện Quiz, dịch vụ nhận giọng của trình
            duyệt có thể xử lý âm thanh qua mạng. Hiệu quả lọc phụ thuộc trình
            duyệt và micro; đây không phải Krisp.
          </p>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-800 sm:px-6">
          <p
            role="status"
            className="max-w-sm text-xs text-emerald-700 dark:text-emerald-300"
          >
            {notice}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              className={btn}
              onClick={() => {
                setSettings({ ...DEFAULT_MICROPHONE_SETTINGS });
                setNotice("Đã đặt lại. Bấm Lưu để áp dụng.");
              }}
            >
              Đặt lại
            </button>
            <button
              type="button"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              onClick={save}
            >
              <Save size={15} />
              Lưu
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
