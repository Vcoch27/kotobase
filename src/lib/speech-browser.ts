import type { RecognitionLike } from "./speech-session";
import {
  loadMicrophoneSettings,
  supportsProcessedRecognition,
} from "./microphone-settings";
import { openMicrophone } from "./microphone-capture";
import { withProcessedMicrophone } from "./microphone-recognition";

export function browserRecognitionFactory(): (() => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const host = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  const Constructor = host.SpeechRecognition || host.webkitSpeechRecognition;
  return Constructor
    ? () => {
        const native = new Constructor();
        return supportsProcessedRecognition(navigator.userAgent)
          ? withProcessedMicrophone(native, (signal) =>
              openMicrophone(loadMicrophoneSettings(), signal),
            )
          : native;
      }
    : null;
}
