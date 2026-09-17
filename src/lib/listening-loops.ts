export const MAX_LOOPS = 100;
export const MAX_LOOP_SECONDS = 7200;
export type ListeningLoop = { id: string; name: string; start: number; end: number };
export type LoopSet = { loops: ListeningLoop[]; shared: boolean; revision: number };
export type SharedLoopSet = { ownerId: string; ownerName: string; loops: ListeningLoop[]; updatedAt: string };
export type SharedLoopPage = { sets: SharedLoopSet[]; nextCursor: string | null };
export const emptyLoopSet = (): LoopSet => ({ loops: [], shared: false, revision: 0 });

export function validateLoops(value: unknown): ListeningLoop[] {
  if (!Array.isArray(value) || value.length > MAX_LOOPS) throw new Error(`Mỗi đề lưu tối đa ${MAX_LOOPS} đoạn.`);
  const ids = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(item.id) || ids.has(item.id)) throw new Error("Mã đoạn không hợp lệ hoặc bị trùng.");
    if (typeof item.name !== "string" || !item.name.trim() || item.name.trim().length > 80) throw new Error("Tên đoạn cần từ 1 đến 80 ký tự.");
    if (typeof item.start !== "number" || typeof item.end !== "number" || !Number.isFinite(item.start) || !Number.isFinite(item.end) || item.start < 0 || item.end > MAX_LOOP_SECONDS || item.end - item.start < 1) throw new Error("Mốc B phải sau A ít nhất 1 giây và không vượt 120 phút.");
    ids.add(item.id);
    return { id: item.id, name: item.name.trim(), start: Math.round(item.start * 1000) / 1000, end: Math.round(item.end * 1000) / 1000 };
  });
}

export function loopTime(seconds: number) {
  // Keep millisecond precision when an existing segment is edited.
  const minutes = Math.floor(seconds / 60);
  const rest = (seconds - minutes * 60).toFixed(3).replace(/\.?0+$/, "");
  return `${minutes}:${Number(rest) < 10 ? "0" : ""}${rest || "0"}`;
}

export function parseLoopTime(value: string): number {
  const match = value.trim().match(/^(\d{1,3}):([0-5]?\d(?:\.\d{1,3})?)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
}
