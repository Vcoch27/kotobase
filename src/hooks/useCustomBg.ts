import { useState, useEffect, useCallback } from 'react';
import { BgKey, BgImageData, getAllBgImages, saveBgImage as saveIdbBg, deleteBgImage as deleteIdbBg } from '@/lib/bg-storage';

export interface BgWashSettings {
  dashboardWash: number; // % phủ trắng nền tổng (30 - 95, mặc định 75)
  cardWash: number;      // % tán trắng thẻ học (30 - 95, mặc định 65)
}

export const DEFAULT_WASH_SETTINGS: BgWashSettings = {
  dashboardWash: 75,
  cardWash: 65,
};

const WASH_STORAGE_KEY = 'kotobase_bg_wash_settings';
export const KOTOBASE_BG_CHANGE_EVENT = 'kotobase_bg_updated';

function getStoredWashSettings(): BgWashSettings {
  if (typeof window === 'undefined') return DEFAULT_WASH_SETTINGS;
  try {
    const raw = localStorage.getItem(WASH_STORAGE_KEY);
    if (!raw) return DEFAULT_WASH_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      dashboardWash: typeof parsed.dashboardWash === 'number' ? parsed.dashboardWash : DEFAULT_WASH_SETTINGS.dashboardWash,
      cardWash: typeof parsed.cardWash === 'number' ? parsed.cardWash : DEFAULT_WASH_SETTINGS.cardWash,
    };
  } catch {
    return DEFAULT_WASH_SETTINGS;
  }
}

function broadcastBgChange(payload?: {
  bgs?: Record<BgKey, BgImageData | null>;
  wash?: BgWashSettings;
}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(KOTOBASE_BG_CHANGE_EVENT, { detail: payload }));
  }
}

export function useCustomBg() {
  const [customBg, setCustomBg] = useState<Record<BgKey, BgImageData | null>>({
    dashboard: null,
    cardFront: null,
    cardBack: null,
  });
  const [washSettings, setWashSettings] = useState<BgWashSettings>(getStoredWashSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const allBgs = await getAllBgImages();
      setCustomBg(allBgs);
      setWashSettings(getStoredWashSettings());
    } catch (error) {
      console.error("Lỗi khi tải ảnh nền:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadAll();

    // Lắng nghe sự kiện cập nhật để đồng bộ ngay lập tức giữa mọi component mà không cần F5
    const handleUpdate = (e: any) => {
      if (e.detail?.bgs) {
        setCustomBg(e.detail.bgs);
      }
      if (e.detail?.wash) {
        setWashSettings(e.detail.wash);
      }
      if (!e.detail) {
        loadAll();
      }
    };

    window.addEventListener(KOTOBASE_BG_CHANGE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(KOTOBASE_BG_CHANGE_EVENT, handleUpdate);
    };
  }, [loadAll]);

  const saveBg = async (key: BgKey, file: File) => {
    const dataUrl = await saveIdbBg(key, file);
    const freshAll = await getAllBgImages();
    setCustomBg(freshAll);
    broadcastBgChange({ bgs: freshAll, wash: washSettings });
    return dataUrl;
  };

  const deleteBg = async (key: BgKey) => {
    await deleteIdbBg(key);
    const freshAll = await getAllBgImages();
    setCustomBg(freshAll);
    broadcastBgChange({ bgs: freshAll, wash: washSettings });
  };

  const updateWashSettings = (newSettings: Partial<BgWashSettings>) => {
    const updated: BgWashSettings = {
      ...washSettings,
      ...newSettings,
    };
    setWashSettings(updated);
    try {
      localStorage.setItem(WASH_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    broadcastBgChange({ bgs: customBg, wash: updated });
  };

  const refreshBg = async () => {
    await loadAll();
  };

  return {
    ...customBg,
    customBg,
    washSettings,
    isLoaded,
    saveBg,
    deleteBg,
    updateWashSettings,
    refreshBg,
  };
}
