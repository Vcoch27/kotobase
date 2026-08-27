import toast from 'react-hot-toast';
import { Client } from '@gradio/client';

export type TTSProvider = 'kotobase-ai' | 'voicevox' | 'elevenlabs' | 'browser';

export interface TTSSettings {
  provider: TTSProvider;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  provider: 'kotobase-ai',
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
      if (parsed.provider === 'edge' || parsed.provider === 'voicevox') {
        parsed.provider = 'kotobase-ai';
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

const playKotobaseAI = async (text: string): Promise<boolean> => {
  try {
    stopCurrentAudio();
    const cacheKey = `kotobase-ai:${text}`;
    let audioUrl = audioBlobCache.get(cacheKey);

    if (!audioUrl) {
      const client = await Client.connect("Vcoch27/kotobase-voice");
      const result = await client.predict("/tts", { 
          text: text, 
          voice_name: "JVNV-F1 - Giọng nữ 1 (Chuẩn, trong trẻo, tự nhiên)", 
          speed: 1.0, 
          style: "Neutral", 
          style_weight: 1.0 
      });

      let extractedUrl = "";
      if (result && result.data) {
        if (Array.isArray(result.data)) {
          const first = result.data[0];
          if (typeof first === 'object' && first !== null && 'url' in first) {
            extractedUrl = first.url as string;
          } else if (typeof first === 'string') {
            extractedUrl = first;
          }
        } else if (typeof result.data === 'string') {
          extractedUrl = result.data;
        }
      }

      if (extractedUrl) {
        audioUrl = extractedUrl;
        audioBlobCache.set(cacheKey, extractedUrl);
      }
    }

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      currentPlayingAudio = audio;
      await audio.play();
      return true;
    }
  } catch (error) {
    console.warn('KotoBase AI failed:', error);
  }
  return false;
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

  // 0. Nếu chọn KotoBase AI
  if (settings.provider === 'kotobase-ai') {
    const aiSuccess = await playKotobaseAI(cleanText);
    if (aiSuccess) return;
    toast.error('KotoBase AI đang khởi động hoặc lỗi, thử lại sau nhé...', { id: 'tts-ai-fail' });
  }

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
          toast.error('ElevenLabs báo lỗi. Chuyển sang dự phòng...', { id: 'tts-el-fail' });
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
      toast.error('ElevenLabs lỗi mạng. Chuyển sang dự phòng...', { id: 'tts-el-fail' });
    }
  }

  // 2. Nếu chọn Voicevox
  if (settings.provider === 'voicevox') {
    const voicevoxSuccess = await playVoicevox(cleanText);
    if (voicevoxSuccess) return;
    toast.error('Voicevox Server lỗi, chuyển thiết bị...', { id: 'tts-vv-fail' });
  }

  // 3. Nếu chọn Trình duyệt (Browser)
  if (settings.provider === 'browser') {
    playBrowserTTS(cleanText);
    return;
  }

  // Fallback chuỗi
  if (settings.provider !== 'kotobase-ai') {
    const fallbackKotoBase = await playKotobaseAI(cleanText);
    if (fallbackKotoBase) return;
  }
  
  const fallbackVoicevox = await playVoicevox(cleanText);
  if (fallbackVoicevox) return;

  toast('Phát âm thiết bị.', { id: 'tts-browser-fallback', icon: '💻' });
  playBrowserTTS(cleanText);
};
