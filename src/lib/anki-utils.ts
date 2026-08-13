export type AnkiRating = "again" | "hard" | "good" | "easy";

export interface AnkiCardData {
  interval: number; // in days. 0 means learning/today
  easeFactor: number;
  nextReview: number; // timestamp
}

export const DEFAULT_ANKI_DATA: AnkiCardData = {
  interval: 0,
  easeFactor: 2.5,
  nextReview: 0,
};

export function calculateNextReview(rating: AnkiRating, card: AnkiCardData): AnkiCardData {
  let { interval, easeFactor } = card;
  
  // Mapping rating to SM-2 quality (0-5)
  let q = 4;
  if (rating === "again") q = 1;
  else if (rating === "hard") q = 3;
  else if (rating === "good") q = 4;
  else if (rating === "easy") q = 5;

  // Calculate new Ease Factor
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Calculate new Interval
  if (q < 3) {
    interval = 0;
  } else {
    if (interval === 0) {
      interval = rating === "easy" ? 4 : 1;
    } else if (interval === 1) {
      interval = rating === "easy" ? 8 : 6;
    } else {
      const bonus = rating === "easy" ? 1.3 : 1;
      // For hard, we just slightly increase the interval
      if (rating === "hard") {
        interval = Math.round(interval * 1.2);
      } else {
        interval = Math.round(interval * easeFactor * bonus);
      }
    }
  }

  // Next review = now + interval * 24 hours
  // If interval is 0, next review is now (so it stays due today)
  const now = Date.now();
  const nextReview = interval === 0 ? now : now + interval * 24 * 60 * 60 * 1000;

  return { interval, easeFactor, nextReview };
}

// Helpers for localStorage
export const ANKI_STORAGE_KEY = "kotobase_anki_progress";

export function loadAnkiProgress(): Record<string, AnkiCardData> {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(ANKI_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("Lỗi khi đọc Anki Progress", e);
    return {};
  }
}

export function saveAnkiProgress(progress: Record<string, AnkiCardData>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ANKI_STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error("Lỗi khi lưu Anki Progress", e);
  }
}

export function formatInterval(interval: number): string {
  if (interval === 0) return "< 1m";
  if (interval < 30) return `${interval}d`;
  if (interval < 365) return `${Math.round(interval / 30)}mo`;
  return `${(interval / 365).toFixed(1)}y`;
}
