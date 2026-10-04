export type RecallSettings = {
  target: number;
  gap: number;
  direction: "forward" | "reverse" | "alternate";
};
export type RecallEntry = {
  id: string;
  streak: number;
  misses: number;
  due: number;
  attempts: number;
};
export type RecallSession = {
  round: number;
  entries: RecallEntry[];
  batch: string[];
  rated: string[];
  settings: RecallSettings;
};
export const defaultRecallSettings: RecallSettings = {
  target: 2,
  gap: 2,
  direction: "forward",
};

// Fisher–Yates: randomize ties without a biased random comparator.
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function nextRecallRound(
  session: RecallSession,
  random = Math.random,
): RecallSession {
  if (session.batch.some((id) => !session.rated.includes(id))) return session;
  const pending = session.entries.filter(
    (e) => e.streak < session.settings.target,
  );
  if (!pending.length) return { ...session, batch: [], rated: [] };
  // If the pool is exhausted, advance to the next due round instead of showing an empty board.
  const round = Math.max(
    session.round + 1,
    Math.min(...pending.map((e) => e.due)),
  );
  const eligible = shuffle(
    pending.filter((e) => e.due <= round),
    random,
  );
  // Oldest due first prevents starvation; difficult words win ties.
  eligible.sort((a, b) => a.due - b.due || b.misses - a.misses);
  return {
    ...session,
    round,
    batch: eligible.slice(0, 6).map((e) => e.id),
    rated: [],
  };
}

export function createRecallSession(
  ids: string[],
  settings = defaultRecallSettings,
  random = Math.random,
): RecallSession {
  return nextRecallRound(
    {
      round: 0,
      settings: { ...settings },
      batch: [],
      rated: [],
      entries: [...new Set(ids)].map((id) => ({
        id,
        streak: 0,
        misses: 0,
        due: 1,
        attempts: 0,
      })),
    },
    random,
  );
}

export function rateRecall(
  session: RecallSession,
  id: string,
  remembered: boolean,
): RecallSession {
  if (!session.batch.includes(id) || session.rated.includes(id)) return session;
  return {
    ...session,
    rated: [...session.rated, id],
    entries: session.entries.map((e) =>
      e.id !== id
        ? e
        : {
            ...e,
            streak: remembered ? e.streak + 1 : 0,
            misses: e.misses + (remembered ? 0 : 1),
            attempts: e.attempts + 1,
            due: session.round + (remembered ? session.settings.gap : 1),
          },
    ),
  };
}

export function restoreRecallSession(
  raw: string | null,
  ids: string[],
): RecallSession | null {
  try {
    const s: RecallSession = JSON.parse(raw || "null");
    const integer = (v: number) => Number.isSafeInteger(v) && v >= 0;
    if (
      !s ||
      !integer(s.round) ||
      s.round < 1 ||
      ![2, 3, 4].includes(s.settings.target) ||
      ![1, 2, 3].includes(s.settings.gap) ||
      !["forward", "reverse", "alternate"].includes(s.settings.direction)
    )
      return null;
    if (
      !Array.isArray(s.entries) ||
      s.entries.length !== new Set(ids).size ||
      new Set(s.entries.map((e) => e.id)).size !== s.entries.length
    )
      return null;
    if (
      s.entries.some(
        (e) =>
          !ids.includes(e.id) ||
          ![e.streak, e.misses, e.due, e.attempts].every(integer) ||
          e.streak > s.settings.target,
      )
    )
      return null;
    if (
      !Array.isArray(s.batch) ||
      s.batch.length > 6 ||
      new Set(s.batch).size !== s.batch.length ||
      s.batch.some((id) => !ids.includes(id))
    )
      return null;
    if (
      !Array.isArray(s.rated) ||
      new Set(s.rated).size !== s.rated.length ||
      s.rated.some((id) => !s.batch.includes(id))
    )
      return null;
    if (
      s.batch.some(
        (id) =>
          !s.rated.includes(id) &&
          s.entries.find((e) => e.id === id)!.streak >= s.settings.target,
      )
    )
      return null;
    if (!s.batch.length && s.entries.some((e) => e.streak < s.settings.target))
      return null;
    return s;
  } catch {
    return null;
  }
}
