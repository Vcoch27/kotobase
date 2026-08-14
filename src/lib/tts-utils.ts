export const playAudio = async (text: string) => {
  if (!text) return;

  try {
    // Gọi Public Voicevox API (tts.quest) - Dùng speaker=14 (Mei - Giọng nữ trưởng thành, siêu thực, rất tự nhiên)
    const voicevoxUrl = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(text)}&speaker=14`;
    
    const queryRes = await fetch(voicevoxUrl);
    
    if (queryRes.ok) {
      const data = await queryRes.json();
      
      if (data.success && data.wavDownloadUrl) {
        // Có link file wav, phát luôn
        const audio = new Audio(data.wavDownloadUrl);
        // Play
        await audio.play();
        return; // Thành công với Voicevox, kết thúc
      }
    }
  } catch (error) {
    console.log("Không thể kết nối đến Voicevox API, chuyển sang TTS trình duyệt mặc định.", error);
  }

  // Fallback: Nếu Voicevox lỗi, sử dụng API trình duyệt mặc định
  if ('speechSynthesis' in window) {
    // Hủy các speech cũ nếu đang đọc dở
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP'; // Tiếng Nhật
    utterance.rate = 0.9;     // Chậm hơn 1 chút cho dễ nghe
    
    // Cố gắng tìm giọng đọc tiếng Nhật tốt nhất có sẵn
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(v => v.lang.includes('ja') || v.lang.includes('JP'));
    if (jaVoice) {
      utterance.voice = jaVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }
};
