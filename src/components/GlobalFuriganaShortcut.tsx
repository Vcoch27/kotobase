'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'kotobase_hide_furigana';

export function GlobalFuriganaShortcut() {
  useEffect(() => {
    try {
      document.documentElement.dataset.furiganaHidden = localStorage.getItem(STORAGE_KEY) === 'true' ? 'true' : 'false';
    } catch {
      document.documentElement.dataset.furiganaHidden = 'false';
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || !event.altKey || !event.shiftKey || event.code !== 'KeyF') return;
      event.preventDefault();
      const hidden = document.documentElement.dataset.furiganaHidden !== 'true';
      document.documentElement.dataset.furiganaHidden = String(hidden);
      try { localStorage.setItem(STORAGE_KEY, String(hidden)); } catch { /* storage may be unavailable */ }
      toast(hidden ? 'Đã ẩn furigana · Alt + Shift + F để hiện lại' : 'Đã hiện furigana');
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);
  return null;
}
