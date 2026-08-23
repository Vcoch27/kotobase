import toast from 'react-hot-toast';

export type TTSProvider = 'edge' | 'voicevox' | 'elevenlabs';

export interface JapaneseVoiceOption {
  id: string;
  name: string;
  gender: 'female' | 'male';
  desc: string;
}

export const JAPANESE_EDGE_VOICES: JapaneseVoiceOption[] = [
  { id: 'ja-JP-NanamiNeural', name: 'Nanami (七海)', gender: 'female', desc: 'Nữ • Tự nhiên, truyền cảm, chuẩn NHK (Khuyên dùng)' },
  { id: 'ja-JP-KeitaNeural', name: 'Keita (圭太)', gender: 'male', desc: 'Nam • Trầm ấm, rõ ràng, dứt khoát' },
  { id: 'ja-JP-AoiNeural', name: 'Aoi (葵)', gender: 'female', desc: 'Nữ • Trong trẻo, thanh thoát' },
  { id: 'ja-JP-DaichiNeural', name: 'Daichi (大地)', gender: 'male', desc: 'Nam • Trẻ trung, tự nhiên' },
  { id: 'ja-JP-MayuNeural', name: 'Mayu (真優)', gender: 'female', desc: 'Nữ • Nhẹ nhàng, biểu cảm' },
  { id: 'ja-JP-NaokiNeural', name: 'Naoki (直樹)', gender: 'male', desc: 'Nam • Điềm đạm, trang trọng' },
];

export interface TTSSettings {
  provider: TTSProvider;
  edgeVoice: string;
  edgeRate: string;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  provider: 'edge', // Mặc định dùng Microsoft Edge Neural TTS
  edgeVoice: 'ja-JP-NanamiNeural',
  edgeRate: '-5%', // Tốc độ hơi chậm một chút rất phù hợp cho học ngoại ngữ
  elevenLabsApiKey: '',
  elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL',
};

// Bộ nhớ đệm âm thanh trong phiên (Audio Cache)
const audioBlobCache = new Map<string, string>();
let currentPlayingAudio: HTMLAudioElement | null = null;

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

const stopCurrentAudio = () => {
  if (currentPlayingAudio) {
    currentPlayingAudio.pause();
    currentPlayingAudio.currentTime = 0;
    currentPlayingAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

const playEdgeTTS = async (text: string, voice = 'ja-JP-NanamiNeural', rate = '-5%'): Promise<boolean> => {
  const cacheKey = `edge:${voice}:${rate}:${text}`;
  try {
    stopCurrentAudio();

    let audioUrl = audioBlobCache.get(cacheKey);

    if (!audioUrl) {
      const res = await fetch(
        `/api/tts/edge?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(rate)}`
      );

      if (!res.ok) throw new Error(`Edge TTS API returned status ${res.status}`);

      const blob = await res.blob();
      audioUrl = URL.createObjectURL(blob);
      audioBlobCache.set(cacheKey, audioUrl);
    }

    const audio = new Audio(audioUrl);
    currentPlayingAudio = audio;
    await audio.play();
    return true;
  } catch (err) {
    console.warn('Edge TTS synthesis failed:', err);
    return false;
  }
};

const playVoicevox = async (text: string): Promise<boolean> => {
  try {
    stopCurrentAudio();
    const voicevoxUrl = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(text)}&speaker=14`;
    const queryRes = await fetch(voicevoxUrl);
    if (queryRes.ok) {
      const data = await queryRes.json();
      if (data.success && data.wavDownloadUrl) {
        const audio = new Audio(data.wavDownloadUrl);
        currentPlayingAudio = audio;
        await audio.play();
        return true;
      }
    }
  } catch (error) {
    console.warn('Voicevox failed:', error);
  }
  return false;
};

const playBrowserTTS = (text: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  stopCurrentAudio();

  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find((v) => v.lang.includes('ja') || v.lang.includes('JP'));
    if (jaVoice) {
      utterance.voice = jaVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      speak();
      window.speechSynthesis.onvoiceschanged = null;
    };
    setTimeout(() => {
      if (window.speechSynthesis.getVoices().length === 0) speak();
    }, 500);
  } else {
    speak();
  }
};

export const playAudio = async (text: string, tempSettings?: TTSSettings) => {
  if (!text || !text.trim()) return;
  const cleanText = text.trim();
  const settings = tempSettings || loadTTSSettings();

  // 1. Nếu chọn Microsoft Edge TTS (hoặc mặc định)
  if (settings.provider === 'edge') {
    const success = await playEdgeTTS(cleanText, settings.edgeVoice, settings.edgeRate);
    if (success) return;
    toast.error('Edge TTS bị lỗi, đang chuyển sang công cụ dự phòng...', { id: 'tts-edge-fail' });
  }

  // 2. Nếu chọn ElevenLabs
  if (settings.provider === 'elevenlabs' && settings.elevenLabsApiKey) {
    try {
      stopCurrentAudio();
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
            text: cleanText,
            model_id: 'eleven_turbo_v2_5',
            language_code: 'ja',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              speed: 0.9,
            },
          }),
        }
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentPlayingAudio = audio;
        await audio.play();
        return;
      }
      toast.error('ElevenLabs báo lỗi (có thể hết token). Đang chuyển sang Edge TTS...', { id: 'tts-el-fail' });
    } catch (e) {
      console.warn('ElevenLabs failed, falling back to Edge TTS...', e);
      toast.error('ElevenLabs mất kết nối. Đang chuyển sang Edge TTS...', { id: 'tts-el-fail' });
    }
  }

  // 3. Nếu chọn Voicevox
  if (settings.provider === 'voicevox') {
    const voicevoxSuccess = await playVoicevox(cleanText);
    if (voicevoxSuccess) return;
    toast.error('Voicevox Server quá tải, đang chuyển sang công cụ dự phòng...', { id: 'tts-vv-fail' });
  }

  // Fallback chuỗi: Edge TTS -> Voicevox -> Trình duyệt
  const fallbackEdge = await playEdgeTTS(cleanText, settings.edgeVoice, settings.edgeRate);
  if (fallbackEdge) return;

  const fallbackVoicevox = await playVoicevox(cleanText);
  if (fallbackVoicevox) return;

  toast('Phát âm bằng giọng mặc định của máy tính.', { id: 'tts-browser-fallback', icon: '💻' });
  playBrowserTTS(cleanText);
};
