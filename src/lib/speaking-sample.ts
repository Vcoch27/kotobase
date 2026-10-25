/** Device TTS only: no paid provider, API key or Firestore request. */
export function playSpeakingSample(
  text: string,
  callbacks: { status(message: string): void; done(error?: string): void },
  synth: SpeechSynthesis | undefined = typeof window !== "undefined"
    ? window.speechSynthesis
    : undefined,
  create: (text: string) => SpeechSynthesisUtterance = (text) =>
    new SpeechSynthesisUtterance(text),
  volume = 1,
) {
  let ended = false,
    started = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const finish = (error?: string) => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    synth?.removeEventListener("voiceschanged", voicesReady);
    callbacks.done(error);
  };
  const speak = () => {
    if (ended || started || !synth) return;
    const voice = synth
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith("ja"));
    if (!voice) {
      finish(
        "Thiết bị chưa có giọng Nhật. Bạn có thể xem cách đọc và thử lại.",
      );
      return;
    }
    started = true;
    clearTimeout(timer);
    synth.removeEventListener("voiceschanged", voicesReady);
    try {
      const utterance = create(text.split(/[/／;；、\n]/)[0]);
      utterance.lang = "ja-JP";
      utterance.voice = voice;
      utterance.rate = 0.85;
      utterance.volume = Math.max(0, Math.min(1, volume));
      utterance.onend = () => finish();
      utterance.onerror = () =>
        finish("Chưa phát được giọng mẫu. Hãy kiểm tra âm thanh thiết bị.");
      callbacks.status("Đang phát cách đọc. Micro đã tắt.");
      timer = setTimeout(() => {
        finish("Phát âm bị gián đoạn. Bạn có thể nghe lại hoặc thử nói.");
        synth.cancel();
      }, 15000);
      synth.speak(utterance);
    } catch {
      finish("Chưa phát được giọng mẫu trên thiết bị này.");
    }
  };
  function voicesReady() {
    if (synth?.getVoices().some((v) => v.lang.toLowerCase().startsWith("ja")))
      speak();
  }
  if (!synth)
    finish("Thiết bị chưa hỗ trợ đọc mẫu. Hãy xem cách đọc để thử lại.");
  else {
    synth.cancel();
    if (synth.getVoices().some((v) => v.lang.toLowerCase().startsWith("ja")))
      speak();
    else {
      callbacks.status("Đang tải giọng Nhật…");
      synth.addEventListener("voiceschanged", voicesReady);
      timer = setTimeout(speak, 700);
    }
  }
  return () => {
    ended = true;
    clearTimeout(timer);
    synth?.removeEventListener("voiceschanged", voicesReady);
    synth?.cancel();
  };
}
