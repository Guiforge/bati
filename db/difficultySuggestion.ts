import type { SessionSummary } from "./completed";
import type { DifficultyCode } from "./schema";

export function suggestDifficultyFromSessions(
  sessions: SessionSummary[],
  options?: {
    maxSessions?: number;
    defaultDifficulty?: DifficultyCode;
  },
): DifficultyCode {
  const maxSessions = options?.maxSessions ?? 10;
  const fallback: DifficultyCode = options?.defaultDifficulty ?? "medium";

  const recent = sessions
    .slice(-maxSessions)
    .map((s) => s.userLevel)
    .filter((v): v is DifficultyCode => v === "easy" || v === "medium" || v === "hard");

  if (recent.length === 0) return fallback;

  const score = (level: DifficultyCode) => {
    if (level === "easy") return 0;
    if (level === "hard") return 2;
    return 1;
  };

  const avg = recent.reduce((acc, lvl) => acc + score(lvl), 0) / recent.length;

  if (avg <= 0.75) return "easy";
  if (avg >= 1.25) return "hard";
  return "medium";
}
