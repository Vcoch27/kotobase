export interface ListeningAudioState {
  status: "idle" | "loading" | "playing" | "error";
  hasHeard: boolean;
  message: string;
}
interface Playback {
  rate?: number;
  onStart(): void;
  onEnd(): void;
  onError(message: string): void;
}

/** Fence delayed TTS replies and report real playback events, never estimated timers. */
export class ListeningAudioPlayer {
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private state: ListeningAudioState = { status: "idle", hasHeard: false, message: "" };
  constructor(
    private speak: (text: string, callbacks: Playback) => Promise<void>,
    private stop: () => void,
    private emit: (state: ListeningAudioState) => void,
  ) {}
  private update(patch: Partial<ListeningAudioState>) {
    this.state = { ...this.state, ...patch };
    if (!this.disposed) this.emit(this.state);
  }
  cancel() {
    this.generation++;
    clearTimeout(this.timer);
    this.stop();
    this.update({ status: "idle" });
  }
  reset() {
    this.cancel();
    this.update({ hasHeard: false, message: "" });
  }
  play(text: string, rate = 1) {
    if (this.disposed || !text.trim()) return;
    this.cancel();
    const generation = this.generation;
    const live = () => !this.disposed && generation === this.generation;
    this.update({ status: "loading", message: "Đang chuẩn bị giọng đọc…" });
    const fail = (message: string) => {
      if (!live()) return;
      this.cancel();
      this.update({ status: "error", message });
    };
    this.timer = setTimeout(() => fail("Giọng đọc chưa sẵn sàng. Bấm nghe lại, hoặc đổi giọng trong cài đặt phát âm."), 20000);
    void this.speak(text, {
      rate,
      onStart: () => {
        if (!live()) return;
        clearTimeout(this.timer);
        this.update({ status: "playing", message: "Đang phát tiếng Nhật…" });
        this.timer = setTimeout(() => fail("Âm thanh bị gián đoạn. Bấm nghe lại."), 20000);
      },
      onEnd: () => {
        if (!live()) return;
        clearTimeout(this.timer);
        this.update({ status: "idle", hasHeard: true, message: "Đã nghe xong. Bạn có thể nghe lại bất cứ lúc nào." });
      },
      onError: fail,
    }).catch(() => fail("Chưa phát được âm thanh. Hãy thử nghe lại."));
  }
  dispose() { this.cancel(); this.disposed = true; }
}
