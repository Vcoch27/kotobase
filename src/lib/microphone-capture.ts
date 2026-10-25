import {
  microphoneConstraints,
  MicrophoneSettings,
} from "./microphone-settings";

export interface MicrophoneCapture {
  stream: MediaStream;
  source: MediaStream;
  analyser: AnalyserNode;
  settings: MediaTrackSettings;
  stopInput(): void;
  dispose(): void;
}
/** No connection to speakers: testing never feeds live mic audio back into itself. */
export async function openMicrophone(
  settings: MicrophoneSettings,
  signal?: AbortSignal,
): Promise<MicrophoneCapture> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Micro cần HTTPS và trình duyệt hỗ trợ ghi âm.");
  }
  const context = new AudioContext();
  let source: MediaStream | undefined;
  let destination: MediaStreamAudioDestinationNode | undefined;
  const aborted = () => {
    source?.getTracks().forEach((track) => track.stop());
    destination?.stream.getTracks().forEach((track) => track.stop());
    void context.close().catch(() => {});
  };
  const check = () => {
    if (signal?.aborted)
      throw new DOMException("Microphone cancelled", "AbortError");
  };
  signal?.addEventListener("abort", aborted, { once: true });
  try {
    check();
    await context.resume();
    check();
    source = await navigator.mediaDevices.getUserMedia(
      microphoneConstraints(
        settings,
        navigator.mediaDevices.getSupportedConstraints(),
      ),
    );
    check();
    const input = context.createMediaStreamSource(source);
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = settings.highPass ? 80 : 0;
    const gain = context.createGain();
    gain.gain.value = settings.gain;
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    destination = context.createMediaStreamDestination();
    input.connect(filter);
    filter.connect(gain);
    gain.connect(analyser);
    analyser.connect(destination);
    let disposed = false;
    return {
      stream: destination.stream,
      source,
      analyser,
      settings: source.getAudioTracks()[0]?.getSettings() || {},
      stopInput: () => source?.getTracks().forEach((track) => track.stop()),
      dispose: () => {
        if (disposed) return;
        disposed = true;
        signal?.removeEventListener("abort", aborted);
        source?.getTracks().forEach((track) => track.stop());
        destination?.stream.getTracks().forEach((track) => track.stop());
        input.disconnect();
        filter.disconnect();
        gain.disconnect();
        analyser.disconnect();
        void context.close().catch(() => {});
      },
    };
  } catch (error) {
    signal?.removeEventListener("abort", aborted);
    source?.getTracks().forEach((track) => track.stop());
    destination?.stream.getTracks().forEach((track) => track.stop());
    void context.close().catch(() => {});
    throw error;
  }
}
