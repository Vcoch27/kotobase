export interface RecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string; confidence?: number };
}
export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<RecognitionResultLike>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(audioTrack?: MediaStreamTrack): void;
  stop(): void;
  abort(): void;
}
export type SpeechStatus =
  | "idle"
  | "starting"
  | "listening"
  | "hearing"
  | "processing"
  | "reconnecting"
  | "paused"
  | "error"
  | "unsupported";
export interface SpeechAttempt {
  text: string;
  matched: boolean;
  alternatives: string[];
}
export interface SpeechSnapshot {
  status: SpeechStatus;
  transcript: string;
  interim: boolean;
  message: string;
  history: SpeechAttempt[];
  attempts: number;
  languageMismatch?: boolean;
}
const blank = (): SpeechSnapshot => ({
  status: "idle",
  transcript: "",
  interim: false,
  message: "",
  history: [],
  attempts: 0,
});

/** A script check, not a language detector: never infer the intended Japanese word. */
export function isNonJapaneseTranscript(text: string): boolean {
  return (
    !/[\u3040-\u30ff\u3400-\u9fff]/u.test(text) &&
    /[À-ÖØ-öø-ÿĂăĐđĨĩŨũƠơƯư\u1ea0-\u1ef9]/u.test(text.normalize("NFC"))
  );
}

/** Owns one microphone session. All delayed events are fenced by a generation ID. */
export class SpeechSession {
  private snapshot = blank();
  private recognition: RecognitionLike | null = null;
  private generation = 0;
  private wanted = false;
  private draining = false;
  private handsFree = true;
  private enabled = false;
  private key = "";
  private disposed = false;
  private idleSince = 0;
  private silentEnds = 0;
  private restartTimer?: ReturnType<typeof setTimeout>;
  private stableTimer?: ReturnType<typeof setTimeout>;
  private pendingMatch: string | null = null;
  private watchdog?: ReturnType<typeof setTimeout>;
  private releaseTimer?: ReturnType<typeof setTimeout>;
  private languageRetries = 0;
  constructor(
    private factory: (() => RecognitionLike) | null,
    private emit: (state: SpeechSnapshot) => void,
    private evaluate: (alternatives: string[]) => string | null,
    private onMatch: (text: string) => void,
    private onAttempt?: (attempt: SpeechAttempt) => void,
  ) {
    if (!factory) this.snapshot.status = "unsupported";
  }

  private update(patch: Partial<SpeechSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    if (!this.disposed) this.emit(this.snapshot);
  }
  private cancel() {
    this.draining = false;
    this.generation++;
    clearTimeout(this.restartTimer);
    clearTimeout(this.stableTimer);
    clearTimeout(this.watchdog);
    clearTimeout(this.releaseTimer);
    this.pendingMatch = null;
    const old = this.recognition;
    this.recognition = null;
    if (old) {
      old.onstart =
        old.onspeechstart =
        old.onspeechend =
        old.onresult =
        old.onerror =
        old.onend =
          null;
      try {
        old.abort();
      } catch {
        /* Already ended. */
      }
    }
  }
  setContext(key: string, enabled: boolean) {
    if (this.key === key && this.enabled === enabled) return;
    this.cancel();
    if (key !== this.key) {
      this.snapshot = blank();
      this.languageRetries = 0;
      if (!this.handsFree) this.wanted = false;
    }
    this.key = key;
    this.enabled = enabled;
    if (!this.factory) {
      this.update({ status: "unsupported" });
      return;
    }
    if (enabled && this.wanted) this.begin();
    else this.update({ status: this.wanted ? "paused" : "idle" });
  }
  start(handsFree = true) {
    if (this.disposed || !this.enabled || !this.factory) return;
    this.cancel();
    this.languageRetries = 0;
    this.handsFree = handsFree;
    this.wanted = true;
    this.idleSince = Date.now();
    this.silentEnds = 0;
    this.begin();
  }
  /** Finish a held utterance without discarding the final recognition result. */
  release() {
    this.wanted = false;
    if (!this.recognition) {
      this.pause("Đã kết thúc lượt nói. Giữ Space để thử lại.");
      return;
    }
    if (this.draining) return;
    this.draining = true;
    clearTimeout(this.restartTimer);
    clearTimeout(this.watchdog);
    this.update({
      status: "processing",
      message: "Đã thả phím. Đang nhận nốt kết quả…",
    });
    this.watchdog = setTimeout(
      () => this.pause("Đã kết thúc lượt nói. Giữ Space để thử lại."),
      3000,
    );
    const epoch = this.generation;
    // Keep a brief tail so a short final vowel reaches Web Audio / ASR buffers.
    this.releaseTimer = setTimeout(() => {
      if (epoch !== this.generation || !this.draining) return;
      try {
        this.recognition?.stop();
      } catch {
        this.pause();
      }
    }, 250);
  }
  pause(message = "Đã tạm dừng micro. Bấm tiếp tục khi sẵn sàng.") {
    this.wanted = false;
    this.cancel();
    this.update({ status: this.factory ? "paused" : "unsupported", message });
  }
  private fail(message: string) {
    this.wanted = false;
    this.cancel();
    this.update({ status: "error", message });
  }
  private record(text: string, alternatives: string[], matched: boolean) {
    this.idleSince = Date.now();
    this.silentEnds = 0;
    this.update({
      transcript: text,
      interim: false,
      attempts: this.snapshot.attempts + 1,
      history: [
        { text, alternatives, matched },
        ...this.snapshot.history,
      ].slice(0, 6),
    });
    this.onAttempt?.({ text, alternatives, matched });
  }
  private accept(text: string, alternatives: string[]) {
    this.record(text, alternatives, true);
    if (!this.handsFree) this.wanted = false;
    this.cancel();
    this.update({ status: "paused", message: "Đã nhận đúng từ." });
    this.onMatch(text);
  }
  private begin() {
    if (!this.wanted || !this.enabled || this.disposed || !this.factory) return;
    this.cancel();
    const epoch = this.generation;
    const live = () =>
      !this.disposed &&
      epoch === this.generation &&
      (this.wanted || this.draining) &&
      this.enabled;
    let recognition: RecognitionLike;
    try {
      recognition = this.factory();
    } catch {
      this.fail(
        "Không khởi tạo được nhận giọng nói. Hãy thử Chrome và tải lại trang.",
      );
      return;
    }
    this.recognition = recognition;
    recognition.lang = "ja-JP";
    recognition.continuous = this.handsFree;
    recognition.interimResults = true;
    recognition.maxAlternatives = 10;
    this.update({
      status: "starting",
      message:
        "Đang mở micro… Chờ trạng thái Đang lắng nghe rồi nói để không mất âm đầu.",
    });
    this.watchdog = setTimeout(() => {
      if (live())
        this.fail(
          "Micro chưa khởi động. Kiểm tra quyền micro rồi bấm thử lại.",
        );
    }, 12000);
    recognition.onstart = () => {
      if (!live()) return;
      if (this.draining) return;
      clearTimeout(this.watchdog);
      this.update({
        status: "listening",
        message:
          "Mic đã sẵn sàng. Bạn có thể nói ngay; từ ngắn có thể nói thêm です.",
      });
      this.watchdog = setTimeout(() => {
        if (live())
          this.pause("Đã nghỉ micro sau 90 giây. Bấm tiếp tục để luyện tiếp.");
      }, 90000);
    };
    recognition.onspeechstart = () => {
      if (live() && !this.draining)
        this.update({ status: "hearing", message: "Đã phát hiện giọng nói…" });
    };
    recognition.onspeechend = () => {
      if (live() && !this.draining)
        this.update({
          status: "listening",
          message: "Đang đối chiếu. Bạn không cần bấm kết thúc.",
        });
    };
    recognition.onresult = (event) => {
      if (!live()) return;
      if (!event.results.length) {
        clearTimeout(this.stableTimer);
        this.pendingMatch = null;
        this.update({ transcript: "", interim: true });
      }
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternatives = Array.from(
          { length: Math.min(10, result.length) },
          (_, n) => result[n].transcript.trim(),
        ).filter(Boolean);
        const text = alternatives[0] || "";
        if (!text) {
          clearTimeout(this.stableTimer);
          this.pendingMatch = null;
          this.update({ transcript: "", interim: !result.isFinal });
          continue;
        }
        const match = this.evaluate(alternatives);
        if (
          !match &&
          result.isFinal &&
          isNonJapaneseTranscript(text) &&
          !alternatives.some((value) =>
            /[\u3040-\u30ff\u3400-\u9fff]/u.test(value),
          )
        ) {
          const resume = this.wanted && this.languageRetries < 1;
          this.languageRetries++;
          this.cancel();
          this.update({
            transcript: text,
            interim: false,
            languageMismatch: true,
            status: resume ? "reconnecting" : "paused",
            message: resume
              ? "Dịch vụ trả kết quả ngoài chữ Nhật. Đang mở lại phiên ja-JP…"
              : "Dịch vụ chưa nhận đúng ngôn ngữ. Bấm tiếp tục hoặc giữ Space để thử lại tiếng Nhật.",
          });
          if (resume) this.restartTimer = setTimeout(() => this.begin(), 400);
          else this.wanted = false;
          return;
        }
        this.update({
          transcript: match || text,
          interim: !result.isFinal,
          languageMismatch: false,
        });
        if (match) {
          if (result.isFinal) this.accept(match, alternatives);
          else if (this.pendingMatch !== match) {
            clearTimeout(this.stableTimer);
            this.pendingMatch = match;
            this.stableTimer = setTimeout(() => {
              if (live()) this.accept(match, alternatives);
            }, 350);
          }
          return;
        }
        clearTimeout(this.stableTimer);
        this.pendingMatch = null;
        if (result.isFinal) this.record(text, alternatives, false);
      }
    };
    recognition.onerror = (event) => {
      if (!live()) return;
      if (event.error === "no-speech") {
        clearTimeout(this.stableTimer);
        this.pendingMatch = null;
        this.update({ message: "Chưa nghe rõ. Đang chờ bạn nói lại…" });
        return;
      }
      const messages: Record<string, string> = {
        "not-allowed":
          "Micro bị chặn. Cho phép micro trong cài đặt trang web rồi bấm thử lại.",
        "service-not-allowed":
          "Trình duyệt chưa cho phép dịch vụ nhận giọng nói. Hãy thử Chrome.",
        "audio-capture":
          "Không tìm thấy micro khả dụng. Kiểm tra kết nối và micro mặc định của thiết bị.",
        "device-unavailable":
          "Micro đã chọn không còn khả dụng. Mở Cài đặt micro và chọn Thiết bị mặc định.",
        "processed-audio":
          "Không mở được luồng mic đã xử lý. Kiểm tra micro trong Cài đặt; thử Chrome/Edge máy tính mới nhất.",
        network:
          "Dịch vụ nhận giọng nói không kết nối được. Kiểm tra mạng rồi bấm thử lại.",
        "language-not-supported":
          "Dịch vụ hiện chưa hỗ trợ tiếng Nhật trên trình duyệt này. Hãy thử Chrome.",
        aborted: "Phiên nghe đã bị ngắt. Bấm tiếp tục để thử lại.",
      };
      this.fail(
        messages[event.error] ||
          `Nhận giọng nói bị gián đoạn (${event.error}). Bấm thử lại.`,
      );
    };
    recognition.onend = () => {
      if (!live()) return;
      if (this.pendingMatch) {
        // Some engines end a very short utterance before emitting a final result.
        this.accept(this.pendingMatch, [this.pendingMatch]);
        return;
      }
      if (this.draining) {
        this.pause("Đã kết thúc lượt nói. Giữ Space để thử lại.");
        return;
      }
      clearTimeout(this.watchdog);
      clearTimeout(this.stableTimer);
      this.silentEnds++;
      if (this.silentEnds >= 8 || Date.now() - this.idleSince > 90000) {
        this.pause(
          "Chưa nhận được giọng nói trong một lúc. Bấm tiếp tục khi sẵn sàng.",
        );
        return;
      }
      this.update({
        status: "reconnecting",
        message: "Đang nghe tiếp… Bạn có thể thử lại, không cần bấm nút.",
      });
      this.restartTimer = setTimeout(() => {
        if (live()) this.begin();
      }, 400);
    };
    try {
      recognition.lang = "ja-JP";
      recognition.start();
    } catch {
      this.fail("Không mở được phiên nghe. Chờ một chút rồi bấm thử lại.");
    }
  }
  dispose() {
    this.disposed = true;
    this.wanted = false;
    this.cancel();
  }
}
