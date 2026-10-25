export interface MicrophoneSettings {
  deviceId: string;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  highPass: boolean;
  gain: number;
}
export const MICROPHONE_SETTINGS_KEY = "kotobase_microphone_settings";
export const MICROPHONE_SETTINGS_EVENT = "kotobase_microphone_settings_changed";
export const DEFAULT_MICROPHONE_SETTINGS: MicrophoneSettings = {
  deviceId: "",
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  highPass: true,
  gain: 1,
};
export function normalizeMicrophoneSettings(
  value: unknown,
): MicrophoneSettings {
  const data =
    value && typeof value === "object"
      ? (value as Partial<MicrophoneSettings>)
      : {};
  const result = { ...DEFAULT_MICROPHONE_SETTINGS };
  for (const key of [
    "noiseSuppression",
    "echoCancellation",
    "autoGainControl",
    "highPass",
  ] as const) {
    if (typeof data[key] === "boolean") result[key] = data[key]!;
  }
  result.deviceId =
    typeof data.deviceId === "string" ? data.deviceId.slice(0, 512) : "";
  result.gain =
    typeof data.gain === "number" && Number.isFinite(data.gain)
      ? Math.max(0.25, Math.min(2, data.gain))
      : 1;
  return result;
}
export function loadMicrophoneSettings(): MicrophoneSettings {
  try {
    return normalizeMicrophoneSettings(
      JSON.parse(localStorage.getItem(MICROPHONE_SETTINGS_KEY) || "{}"),
    );
  } catch {
    return { ...DEFAULT_MICROPHONE_SETTINGS };
  }
}
export function saveMicrophoneSettings(value: MicrophoneSettings): boolean {
  try {
    localStorage.setItem(
      MICROPHONE_SETTINGS_KEY,
      JSON.stringify(normalizeMicrophoneSettings(value)),
    );
    window.dispatchEvent(new Event(MICROPHONE_SETTINGS_EVENT));
    return true;
  } catch {
    return false;
  }
}
export function microphoneConstraints(
  settings: MicrophoneSettings,
  supported: MediaTrackSupportedConstraints,
): MediaStreamConstraints {
  const audio: MediaTrackConstraints = {};
  for (const key of [
    "noiseSuppression",
    "echoCancellation",
    "autoGainControl",
  ] as const) {
    if (supported[key]) audio[key] = { ideal: settings[key] };
  }
  if (settings.deviceId) audio.deviceId = { exact: settings.deviceId };
  return { audio, video: false };
}
/** Conservative compatibility gate: audioTrack is absent on Android and Safari. */
export function supportsProcessedRecognition(userAgent: string): boolean {
  if (/Android|iPhone|iPad|iPod|Mobile|SamsungBrowser|OPR\//i.test(userAgent))
    return false;
  const version = /(?:Chrome|Chromium)\/(\d+)/.exec(userAgent);
  return !!version && Number(version[1]) >= 135;
}
export function microphoneError(error: unknown): string {
  const name = (error as { name?: string })?.name;
  const messages: Record<string, string> = {
    NotAllowedError:
      "Micro bị chặn. Cho phép micro trong cài đặt trang web rồi thử lại.",
    NotFoundError: "Không tìm thấy micro. Hãy kết nối micro rồi thử lại.",
    OverconstrainedError:
      "Micro đã chọn không còn khả dụng. Chọn Thiết bị mặc định rồi thử lại.",
    NotReadableError:
      "Không mở được micro. Kiểm tra ứng dụng khác đang sử dụng thiết bị.",
    AbortError: "Đã dừng yêu cầu mở micro.",
  };
  return (
    messages[name || ""] ||
    "Chưa mở được micro. Hãy kiểm tra thiết bị và thử lại."
  );
}
export function measureMicrophone(samples: Float32Array): {
  level: number;
  db: number;
  clipping: boolean;
} {
  let sum = 0,
    peak = 0;
  for (const value of samples) {
    sum += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  const db = Math.max(-80, Math.min(0, 20 * Math.log10(Math.max(rms, 0.0001))));
  return {
    db,
    level: Math.max(0, Math.min(1, (db + 60) / 60)),
    clipping: peak >= 0.98,
  };
}
