import type { SessionSummary } from "./completed";
import type { DifficultyCode } from "./schema";

export function suggestDifficultyFromSessions(
  sessions: SessionSummary[],
  options?: {
    maxSessions?: number;
    defaultDifficulty?: DifficultyCode;
  }
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

export type ProgressionRecommendation = {
  action: "increase" | "maintain" | "decrease";
  reason: "too_easy" | "too_hard" | "just_right" | "inconsistent" | "not_enough_data";
  confidence: number; // 0-1
};

export function analyzeDifficultyProgression(
  sessions: SessionSummary[]
): ProgressionRecommendation {
  // Take last 5 sessions
  const recent = sessions.slice(-5);

  if (recent.length < 3) {
    return {
      action: "maintain",
      reason: "not_enough_data",
      confidence: 0,
    };
  }

  let easyCount = 0;
  let hardCount = 0;
  let goodCount = 0;

  for (const s of recent) {
    if (s.feedback === "easy") easyCount++;
    else if (s.feedback === "hard") hardCount++;
    else goodCount++; // good or null (assume good if no feedback)
  }

  const total = recent.length;

  if (easyCount / total >= 0.6) {
    return {
      action: "increase",
      reason: "too_easy",
      confidence: easyCount / total,
    };
  }

  if (hardCount / total >= 0.6) {
    return {
      action: "decrease",
      reason: "too_hard",
      confidence: hardCount / total,
    };
  }

  return {
    action: "maintain",
    reason: "just_right",
    confidence: goodCount / total,
  };
}
