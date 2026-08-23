import toast from 'react-hot-toast';

export type TTSProvider = 'voicevox' | 'elevenlabs' | 'browser';

export interface TTSSettings {
  provider: TTSProvider;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  provider: 'voicevox',
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
      const parsed = JSON.parse(saved);
      if (parsed.provider === 'edge') {
        parsed.provider = 'voicevox';
      }
      return { ...DEFAULT_TTS_SETTINGS, ...parsed };
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

const playVoicevox = async (text: string): Promise<boolean> => {
  try {
    stopCurrentAudio();
    const cacheKey = `voicevox:${text}`;
    let audioUrl = audioBlobCache.get(cacheKey);

    if (!audioUrl) {
      const voicevoxUrl = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(text)}&speaker=14`;
      const queryRes = await fetch(voicevoxUrl);
      if (queryRes.ok) {
        const data = await queryRes.json();
        if (data.success && typeof data.wavDownloadUrl === 'string' && data.wavDownloadUrl) {
          audioUrl = data.wavDownloadUrl;
          audioBlobCache.set(cacheKey, data.wavDownloadUrl);
        }
      }
    }

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      currentPlayingAudio = audio;
      await audio.play();
      return true;
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

  // 1. Nếu chọn ElevenLabs
  if (settings.provider === 'elevenlabs' && settings.elevenLabsApiKey) {
    try {
      stopCurrentAudio();
      const cacheKey = `elevenlabs:${settings.elevenLabsVoiceId}:${cleanText}`;
      let audioUrl = audioBlobCache.get(cacheKey);

      if (!audioUrl) {
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
          audioUrl = url;
          audioBlobCache.set(cacheKey, url);
        } else {
          toast.error('ElevenLabs báo lỗi (hết token hoặc sai key). Chuyển sang dự phòng...', { id: 'tts-el-fail' });
        }
      }

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        currentPlayingAudio = audio;
        await audio.play();
        return;
      }
    } catch (e) {
      console.warn('ElevenLabs failed:', e);
      toast.error('ElevenLabs mất kết nối. Chuyển sang dự phòng...', { id: 'tts-el-fail' });
    }
  }

  // 2. Nếu chọn Voicevox
  if (settings.provider === 'voicevox') {
    const voicevoxSuccess = await playVoicevox(cleanText);
    if (voicevoxSuccess) return;
    toast.error('Voicevox Server quá tải, chuyển sang giọng mặc định thiết bị...', { id: 'tts-vv-fail' });
  }

  // 3. Nếu chọn Trình duyệt (Browser)
  if (settings.provider === 'browser') {
    playBrowserTTS(cleanText);
    return;
  }

  // Fallback chuỗi: Voicevox -> Trình duyệt
  const fallbackVoicevox = await playVoicevox(cleanText);
  if (fallbackVoicevox) return;

  toast('Phát âm bằng giọng mặc định của thiết bị.', { id: 'tts-browser-fallback', icon: '💻' });
  playBrowserTTS(cleanText);
};
