export type TTSProvider = 'voicevox' | 'elevenlabs';

export interface TTSSettings {
  provider: TTSProvider;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  provider: 'voicevox',
  elevenLabsApiKey: '',
  elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL', // Giọng Sarah (Default Premade - Chạy được trên tài khoản Free)
};

export const loadTTSSettings = (): TTSSettings => {
  if (typeof window === 'undefined') return DEFAULT_TTS_SETTINGS;
  try {
    const saved = localStorage.getItem('koto_tts_settings');
    if (saved) {
      return { ...DEFAULT_TTS_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load TTS settings', e);
  }
  return DEFAULT_TTS_SETTINGS;
};

export const saveTTSSettings = (settings: TTSSettings) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('koto_tts_settings', JSON.stringify(settings));
  }
};

// Phát âm qua VOICEVOX Local GPU (Chạy trên máy tính qua cổng 50021)
const playVoicevoxLocal = async (text: string, speakerId = 14): Promise<boolean> => {
  try {
    const queryUrl = `http://127.0.0.1:50021/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`;
    const queryRes = await fetch(queryUrl, {
      method: "POST",
      signal: AbortSignal.timeout(1500), // Timeout 1.5s nếu Local Engine chưa bật
    });

    if (!queryRes.ok) return false;
    const queryJson = await queryRes.json();

    const synthUrl = `http://127.0.0.1:50021/synthesis?speaker=${speakerId}`;
    const synthRes = await fetch(synthUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryJson),
    });

    if (synthRes.ok) {
      const blob = await synthRes.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      console.log("⚡ Đã phát âm siêu tốc qua VOICEVOX Local GPU!");
      return true;
    }
  } catch (e) {
    // Không log lỗi nếu engine chưa chạy, tự động fallback
  }
  return false;
};

// Phát âm qua VOICEVOX Cloud (Dự phòng)
const playVoicevox = async (text: string): Promise<boolean> => {
  // 1. Ưu tiên số 1: VOICEVOX Local GPU
  const localSuccess = await playVoicevoxLocal(text);
  if (localSuccess) return true;

  // 2. Dự phòng số 2: VOICEVOX Cloud API
  try {
    const voicevoxUrl = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(text)}&speaker=14`;
    const queryRes = await fetch(voicevoxUrl);
    if (queryRes.ok) {
      const data = await queryRes.json();
      if (data.success && data.wavDownloadUrl) {
        const audio = new Audio(data.wavDownloadUrl);
        await audio.play();
        return true;
      }
    }
  } catch (error) {
    console.log('Voicevox Cloud failed:', error);
  }
  return false;
};

export const playAudio = async (text: string) => {
  if (!text) return;

  const settings = loadTTSSettings();

  if (settings.provider === 'elevenlabs' && settings.elevenLabsApiKey) {
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${settings.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL'}`,
        {
          method: 'POST',
          headers: {
            Accept: 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': settings.elevenLabsApiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_turbo_v2_5', // Model mới nhất, nhanh hơn và hỗ trợ ép ngôn ngữ
            language_code: 'ja', // Ràng buộc tuyệt đối phải đọc bằng Tiếng Nhật
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              speed: 0.9, // Giảm tốc độ đọc xuống 85% cho học viên dễ nghe
            },
          }),
        }
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        await audio.play();
        return; // Thành công
      } else {
        alert(
          'ElevenLabs API bị lỗi hoặc hết token. Tự động chuyển sang Voicevox để đảm bảo trải nghiệm!'
        );
        console.error('ElevenLabs error:', await res.text());
      }
    } catch (e) {
      alert('Không thể kết nối tới ElevenLabs. Đang chuyển sang Voicevox...');
      console.error('ElevenLabs request failed:', e);
    }
  }

  // Fallback Voicevox
  const voicevoxSuccess = await playVoicevox(text);
  if (voicevoxSuccess) return;

  // Fallback Trình duyệt
  console.log('Sử dụng TTS trình duyệt mặc định.');
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85; // Đọc chậm vừa phải cho người học
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find((v) => v.lang.includes('ja') || v.lang.includes('JP'));
    if (jaVoice) {
      utterance.voice = jaVoice;
    }
    window.speechSynthesis.speak(utterance);
  }
};
