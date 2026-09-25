import { useState, useEffect, useCallback } from 'react';
import { BgKey, BgImageData, getAllBgImages, saveBgImage as saveIdbBg, deleteBgImage as deleteIdbBg } from '@/lib/bg-storage';

export function useCustomBg() {
  const [customBg, setCustomBg] = useState<Record<BgKey, BgImageData | null>>({
    dashboard: null,
    cardFront: null,
    cardBack: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const allBgs = await getAllBgImages();
      setCustomBg(allBgs);
    } catch (error) {
      console.error("Lỗi khi tải ảnh nền:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveBg = async (key: BgKey, file: File) => {
    const dataUrl = await saveIdbBg(key, file);
    setCustomBg(prev => ({
      ...prev,
      [key]: { dataUrl, fileName: file.name, updatedAt: Date.now() }
    }));
    return dataUrl;
  };

  const deleteBg = async (key: BgKey) => {
    await deleteIdbBg(key);
    setCustomBg(prev => ({ ...prev, [key]: null }));
  };

  const refreshBg = async () => {
    await loadAll();
  };

  return {
    ...customBg,
    customBg, // Return full record object as well
    isLoaded,
    saveBg,
    deleteBg,
    refreshBg
  };
}
