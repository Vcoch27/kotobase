import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Client } from '@gradio/client';

export type TTSProvider = 'kotobase-ai' | 'voicevox' | 'elevenlabs' | 'browser';

export interface TTSSettings {
  provider: TTSProvider;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  hfToken: string; // Token Hugging Face để tăng giới hạn ZeroGPU
  // KotoBase AI Options
  kotobaseVoiceName?: string;
  kotobaseSpeed?: number;
  kotobaseStyle?: string;
  kotobaseStyleWeight?: number;
  volume?: number; // 0.0 - 1.0
}

export const KOTOBASE_VOICE_OPTIONS = [
  { value: "JVNV-F1 - Giọng nữ 1 (Chuẩn, trong trẻo, tự nhiên)", label: "JVNV-F1 - Giọng nữ 1 (Chuẩn, trong trẻo, tự nhiên)" },
  { value: "JVNV-F2 - Giọng nữ 2 (Dịu dàng, biểu cảm phong phú)", label: "JVNV-F2 - Giọng nữ 2 (Dịu dàng, biểu cảm phong phú)" },
  { value: "JVNV-M1 - Giọng nam 1 (Rõ ràng, đĩnh đạc, chuẩn ngữ điệu)", label: "JVNV-M1 - Giọng nam 1 (Rõ ràng, đĩnh đạc, chuẩn ngữ điệu)" },
  { value: "JVNV-M2 - Giọng nam 2 (Trầm ấm, tự nhiên)", label: "JVNV-M2 - Giọng nam 2 (Trầm ấm, tự nhiên)" },
];

export const KOTOBASE_STYLE_OPTIONS = [
  { value: "Neutral", label: "Neutral (Tự nhiên / Chuẩn)" },
  { value: "Happy", label: "Happy (Vui tươi)" },
  { value: "Sad", label: "Sad (Buồn bã)" },
  { value: "Angry", label: "Angry (Giận dữ)" },
  { value: "Fear", label: "Fear (Sợ hãi)" },
  { value: "Surprise", label: "Surprise (Bất ngờ)" },
  { value: "Disgust", label: "Disgust (Chán ghét)" },
];

export const DEFAULT_WEB_VOLUME = 1.0;
export const WEB_VOLUME_KEY = 'kotobase_web_volume';

export function getWebVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_WEB_VOLUME;
  try {
    const saved = localStorage.getItem(WEB_VOLUME_KEY);
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load web volume', e);
  }
  return DEFAULT_WEB_VOLUME;
}

export function setWebVolume(volume: number) {
  if (typeof window === 'undefined') return;
  const clamped = Math.max(0, Math.min(1, volume));
  try {
    localStorage.setItem(WEB_VOLUME_KEY, clamped.toString());
    if (currentPlayingAudio) {
      currentPlayingAudio.volume = clamped;
    }
    window.dispatchEvent(new CustomEvent('kotobase_volume_change', { detail: clamped }));
  } catch (e) {
    console.error('Failed to save web volume', e);
  }
}

export function useWebVolume() {
  const [volume, setVolumeState] = useState<number>(1.0);

  useEffect(() => {
    setVolumeState(getWebVolume());
    const handleVolumeChange = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === 'number') {
        setVolumeState(customEvent.detail);
      }
    };
    window.addEventListener('kotobase_volume_change', handleVolumeChange);
    return () => window.removeEventListener('kotobase_volume_change', handleVolumeChange);
  }, []);

  const changeVolume = (newVolume: number) => {
    setWebVolume(newVolume);
    setVolumeState(newVolume);
  };

  return [volume, changeVolume] as const;
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  provider: 'browser',
  elevenLabsApiKey: '',
  elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL',
  hfToken: '',
  kotobaseVoiceName: 'JVNV-F1 - Giọng nữ 1 (Chuẩn, trong trẻo, tự nhiên)',
  kotobaseSpeed: 1.0,
  kotobaseStyle: 'Neutral',
  kotobaseStyleWeight: 1.0,
  volume: 1.0,
};

// Bộ nhớ đệm âm thanh trong phiên (Audio Cache)
const audioBlobCache = new Map<string, string>();
let currentPlayingAudio: HTMLAudioElement | null = null;

export const loadTTSSettings = (): TTSSettings => {
  if (typeof window === 'undefined') return DEFAULT_TTS_SETTINGS;
  const currentVol = getWebVolume();
  try {
    const saved = localStorage.getItem('koto_tts_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.provider === 'edge' || parsed.provider === 'voicevox') {
        parsed.provider = 'kotobase-ai';
      }
      return { ...DEFAULT_TTS_SETTINGS, volume: currentVol, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load TTS settings', e);
  }
  return { ...DEFAULT_TTS_SETTINGS, volume: currentVol };
};

export const saveTTSSettings = (settings: TTSSettings) => {
  if (typeof window !== 'undefined') {
    if (settings.volume !== undefined) {
      setWebVolume(settings.volume);
    }
    localStorage.setItem('koto_tts_settings', JSON.stringify(settings));
  }
};

let audioRequestId = 0;
let pendingVoiceListener: (() => void) | null = null;
let pendingVoiceTimer: ReturnType<typeof setTimeout> | undefined;
export interface TTSPlaybackCallbacks {
  rate?: number;
  onStart?(): void;
  onEnd?(): void;
  onError?(message: string): void;
}
interface PlaybackContext extends TTSPlaybackCallbacks { active(): boolean }

const stopCurrentAudio = () => {
  clearTimeout(pendingVoiceTimer);
  if (pendingVoiceListener && typeof window !== 'undefined')
    window.speechSynthesis?.removeEventListener('voiceschanged', pendingVoiceListener);
  pendingVoiceListener = null;
  if (currentPlayingAudio) {
    currentPlayingAudio.pause();
    currentPlayingAudio.currentTime = 0;
    currentPlayingAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

/** Also invalidate pending network/voice replies so an old question cannot speak later. */
export const stopVocabularyAudio = () => {
  audioRequestId++;
  stopCurrentAudio();
};

const startHTMLAudio = async (url: string, volume: number, context: PlaybackContext) => {
  if (!context.active()) return false;
  const audio = new Audio(url);
  let began = false;
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.playbackRate = context.rate || 1;
  audio.onended = () => { if (context.active()) context.onEnd?.(); };
  // A pre-start error lets the existing provider fallback run. A later error
  // belongs to this playing prompt and must be reported to the quiz.
  audio.onerror = () => { if (began && context.active()) context.onError?.('Không phát được âm thanh. Hãy thử nghe lại.'); };
  currentPlayingAudio = audio;
  await audio.play();
  if (!context.active()) { audio.pause(); return false; }
  began = true;
  context.onStart?.();
  return true;
};

export async function fetchKotoBaseTTS(
  text: string,
  options?: {
    voiceName?: string;
    speed?: number;
    style?: string;
    styleWeight?: number;
  },
  hfToken: string = ""
) {
  try {
    const connectConfig = hfToken && hfToken.startsWith('hf_') ? { hf_token: hfToken as `hf_${string}` } : {};
    const client = await Client.connect("Vcoch27/kotobase-voice", connectConfig);
    
    const voiceName = options?.voiceName || "JVNV-F1 - Giọng nữ 1 (Chuẩn, trong trẻo, tự nhiên)";
    const speed = options?.speed ?? 1.0;
    const style = options?.style || "Neutral";
    const styleWeight = options?.styleWeight ?? 1.0;

    const result = await client.predict("/tts", { 
      text: text, 
      voice_name: voiceName, 
      speed: speed, 
      style: style, 
      style_weight: styleWeight 
    });
    
    return result.data;
  } catch (error) {
    console.error("Lỗi khi gọi KotoBase TTS API:", error);
    throw error;
  }
}

const playKotobaseAI = async (text: string, settings: TTSSettings | undefined, context: PlaybackContext): Promise<boolean> => {
  try {
    if (!context.active()) return false;
    stopCurrentAudio();
    const voiceName = settings?.kotobaseVoiceName || "JVNV-F1 - Giọng nữ 1 (Chuẩn, trong trẻo, tự nhiên)";
    const speed = settings?.kotobaseSpeed ?? 1.0;
    const style = settings?.kotobaseStyle || "Neutral";
    const styleWeight = settings?.kotobaseStyleWeight ?? 1.0;
    const hfToken = settings?.hfToken || "";

    const cacheKey = `kotobase-ai:${voiceName}:${speed}:${style}:${styleWeight}:${text}`;
    let audioUrl = audioBlobCache.get(cacheKey);

    if (!audioUrl) {
      const data = await fetchKotoBaseTTS(
        text,
        { voiceName, speed, style, styleWeight },
        hfToken
      );

      let extractedUrl = "";
      if (data) {
        if (Array.isArray(data)) {
          const first = data[0];
          if (typeof first === 'object' && first !== null && 'url' in first) {
            extractedUrl = first.url as string;
          } else if (typeof first === 'string') {
            extractedUrl = first;
          }
        } else if (typeof data === 'string') {
          extractedUrl = data;
        }
      }

      if (extractedUrl) {
        audioUrl = extractedUrl;
        audioBlobCache.set(cacheKey, extractedUrl);
      }
    }

    if (audioUrl) {
      const volume = settings?.volume ?? getWebVolume();
      return await startHTMLAudio(audioUrl, volume, context);
    }
  } catch (error) {
    console.warn('KotoBase AI failed:', error);
  }
  return false;
};

const playVoicevox = async (text: string, context: PlaybackContext): Promise<boolean> => {
  try {
    if (!context.active()) return false;
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
      const volume = getWebVolume();
      return await startHTMLAudio(audioUrl, volume, context);
    }
  } catch (error) {
    console.warn('Voicevox failed:', error);
  }
  return false;
};

const playBrowserTTS = (text: string, context: PlaybackContext) => {
  if (!context.active()) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    context.onError?.('Thiết bị chưa hỗ trợ phát giọng Nhật.');
    return;
  }
  stopCurrentAudio();

  const speak = () => {
    if (!context.active()) return;
    clearTimeout(pendingVoiceTimer);
    if (pendingVoiceListener) window.speechSynthesis.removeEventListener('voiceschanged', pendingVoiceListener);
    pendingVoiceListener = null;
    try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85 * (context.rate || 1);
    const vol = getWebVolume();
    utterance.volume = Math.max(0, Math.min(1, vol));
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find((v) => v.lang.includes('ja') || v.lang.includes('JP'));
    if (jaVoice) {
      utterance.voice = jaVoice;
    } else if (context.onError) {
      context.onError('Thiết bị chưa có giọng Nhật. Chọn giọng KotoBase AI trong cài đặt phát âm hoặc cài giọng Nhật trên thiết bị.');
      return;
    }
    utterance.onstart = () => { if (context.active()) context.onStart?.(); };
    utterance.onend = () => { if (context.active()) context.onEnd?.(); };
    utterance.onerror = () => { if (context.active()) context.onError?.('Giọng đọc bị gián đoạn. Bấm nghe lại để tiếp tục.'); };
    window.speechSynthesis.speak(utterance);
    } catch { if (context.active()) context.onError?.('Không khởi tạo được giọng Nhật. Hãy thử nghe lại.'); }
  };

  const available = window.speechSynthesis.getVoices();
  if (!available.length || (context.onError && !available.some((voice) => voice.lang.toLowerCase().startsWith('ja')))) {
    const ready = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.some((voice) => voice.lang.toLowerCase().startsWith('ja')) || (!context.onError && voices.length)) speak();
    };
    pendingVoiceListener = ready;
    window.speechSynthesis.addEventListener('voiceschanged', ready);
    pendingVoiceTimer = setTimeout(speak, 700);
  } else {
    speak();
  }
};

export const playAudio = async (text: string, tempSettings?: TTSSettings, callbacks: TTSPlaybackCallbacks = {}) => {
  if (!text || !text.trim()) return;
  const cleanText = text.trim();
  const requestId = ++audioRequestId;
  stopCurrentAudio();
  const context: PlaybackContext = { ...callbacks, rate: Math.max(0.5, Math.min(1.5, callbacks.rate || 1)), active: () => requestId === audioRequestId };
  const settings = tempSettings || loadTTSSettings();

  // 0. Nếu chọn KotoBase AI
  if (settings.provider === 'kotobase-ai') {
    const aiSuccess = await playKotobaseAI(cleanText, settings, context);
    if (!context.active()) return;
    if (aiSuccess) return;
    toast.error('KotoBase AI đang khởi động hoặc quá tải, thử lại sau nhé...', { id: 'tts-ai-fail' });
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

        if (!context.active()) return;
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          audioUrl = url;
          audioBlobCache.set(cacheKey, url);
        } else {
          toast.error('ElevenLabs báo lỗi. Chuyển sang dự phòng...', { id: 'tts-el-fail' });
        }
      }

      if (!context.active()) return;
      if (audioUrl) {
        const volume = settings?.volume ?? getWebVolume();
        await startHTMLAudio(audioUrl, volume, context);
        return;
      }
    } catch (e) {
      if (!context.active()) return;
      console.warn('ElevenLabs failed:', e);
      toast.error('ElevenLabs lỗi mạng. Chuyển sang dự phòng...', { id: 'tts-el-fail' });
    }
  }

  // 2. Nếu chọn Voicevox
  if (settings.provider === 'voicevox') {
    const voicevoxSuccess = await playVoicevox(cleanText, context);
    if (!context.active()) return;
    if (voicevoxSuccess) return;
    toast.error('Voicevox Server lỗi, chuyển thiết bị...', { id: 'tts-vv-fail' });
  }

  // 3. Nếu chọn Trình duyệt (Browser)
  if (settings.provider === 'browser') {
    playBrowserTTS(cleanText, context);
    return;
  }

  // Fallback chuỗi
  if (settings.provider !== 'kotobase-ai') {
    const fallbackKotoBase = await playKotobaseAI(cleanText, settings, context);
    if (!context.active()) return;
    if (fallbackKotoBase) return;
  }
  
  const fallbackVoicevox = await playVoicevox(cleanText, context);
  if (!context.active()) return;
  if (fallbackVoicevox) return;

  toast('Phát âm thiết bị.', { id: 'tts-browser-fallback', icon: '💻' });
  playBrowserTTS(cleanText, context);
};
