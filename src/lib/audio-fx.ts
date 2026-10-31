"use client";

import { useState, useEffect } from "react";

export const DEFAULT_SFX_VOLUME = 0.35; // 35% âm lượng chuẩn, êm dịu không chói tai
export const SFX_VOLUME_KEY = "kotobase_sfx_volume";

export function getSfxVolume(): number {
  if (typeof window === "undefined") return DEFAULT_SFX_VOLUME;
  try {
    const saved = localStorage.getItem(SFX_VOLUME_KEY);
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load sfx volume", e);
  }
  return DEFAULT_SFX_VOLUME;
}

export function setSfxVolume(volume: number) {
  if (typeof window === "undefined") return;
  const clamped = Math.max(0, Math.min(1, volume));
  try {
    localStorage.setItem(SFX_VOLUME_KEY, clamped.toString());
    window.dispatchEvent(new CustomEvent("kotobase_sfx_volume_change", { detail: clamped }));
  } catch (e) {
    console.error("Failed to save sfx volume", e);
  }
}

export function useSfxVolume() {
  const [volume, setVolumeState] = useState<number>(DEFAULT_SFX_VOLUME);

  useEffect(() => {
    setVolumeState(getSfxVolume());
    const handleVolumeChange = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === "number") {
        setVolumeState(customEvent.detail);
      }
    };
    window.addEventListener("kotobase_sfx_volume_change", handleVolumeChange);
    return () => window.removeEventListener("kotobase_sfx_volume_change", handleVolumeChange);
  }, []);

  const changeVolume = (newVolume: number) => {
    setSfxVolume(newVolume);
    setVolumeState(newVolume);
  };

  return [volume, changeVolume] as const;
}

class AudioFXSystem {
  private ctx: AudioContext | null = null;

  private getContext() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  /**
   * Phát âm "Ting" tươi sáng khi trả lời đúng (High-pitched chime)
   * Có thể tuỳ chỉnh âm lượng riêng biệt qua getSfxVolume()
   */
  public playCorrect(volumeOverride?: number) {
    const volume = volumeOverride !== undefined ? volumeOverride : getSfxVolume();
    if (volume <= 0) return;

    const ctx = this.getContext();
    if (!ctx) return;
    
    // Đảm bảo AudioContext đang chạy (fix lỗi autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Tạo âm "Ting" tươi sáng (High-pitched chime)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";
    
    // Tần số cao, trong trẻo
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc2.frequency.setValueAtTime(1760, ctx.currentTime); // A6 (hòa âm 1 octave)

    // Hiệu ứng phai dần nhanh (decay), mức âm lượng tối đa êm dịu (0.22 * volume)
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.22 * volume, ctx.currentTime + 0.02); // Attack nhanh
    gainNode.gain.exponentialRampToValueAtTime(0.001 * Math.max(0.01, volume), ctx.currentTime + 0.5); // Decay mượt

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);
    osc2.stop(ctx.currentTime + 0.6);
  }

  /**
   * Phát âm "Buzzer" (ù ù / trầm) khi trả lời sai hoặc vượt quá số lần sai
   */
  public playWrong(volumeOverride?: number) {
    const volume = volumeOverride !== undefined ? volumeOverride : getSfxVolume();
    if (volume <= 0) return;

    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Tạo âm "Buzzer" (Error)
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "triangle";
    
    // Tần số thấp, hơi trầm
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.2); // Rớt tone

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25 * volume, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001 * Math.max(0.01, volume), ctx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  }
}

export const audioFX = new AudioFXSystem();
