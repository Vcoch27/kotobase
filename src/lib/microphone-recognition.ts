import type { RecognitionLike } from "./speech-session";
import type { MicrophoneCapture } from "./microphone-capture";

/** Async capture adapter; a permission reply after cancellation can never open ASR. */
export function withProcessedMicrophone(
  native: RecognitionLike,
  open: (signal: AbortSignal) => Promise<MicrophoneCapture>,
): RecognitionLike {
  let cancelled = false,
    capture: MicrophoneCapture | null = null;
  const controller = new AbortController();
  const dispose = () => {
    capture?.dispose();
    capture = null;
  };
  return new Proxy(native, {
    get(target, key) {
      if (key === "start")
        return () => {
          void open(controller.signal)
            .then((value) => {
              if (cancelled) {
                value.dispose();
                return;
              }
              capture = value;
              const track = value.stream.getAudioTracks()[0];
              if (!track || track.readyState !== "live")
                throw new Error("No live processed audio track");
              target.lang = "ja-JP";
              target.start(track);
            })
            .catch((error) => {
              dispose();
              if (cancelled) return;
              const name = (error as { name?: string })?.name;
              target.onerror?.({
                error:
                  name === "NotAllowedError"
                    ? "not-allowed"
                    : name === "OverconstrainedError"
                      ? "device-unavailable"
                      : "processed-audio",
              });
            });
        };
      if (key === "stop")
        return () => {
          capture?.stopInput();
          if (!capture) {
            cancelled = true;
            controller.abort();
            target.onend?.();
            return;
          }
          target.stop();
        };
      if (key === "abort")
        return () => {
          cancelled = true;
          controller.abort();
          dispose();
          target.abort();
        };
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(target, key, value) {
      if (key === "onend" && value) {
        target.onend = () => {
          dispose();
          value();
        };
        return true;
      }
      return Reflect.set(target, key, value, target);
    },
  });
}
