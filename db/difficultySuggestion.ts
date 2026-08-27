import type { SessionSummary } from "./completed";
import type { DifficultyCode } from "./schema";

export type DifficultySuggestion = {
  level: DifficultyCode;
  /**
   * Whether the feeling moved the level off what the hero's own choices asked for. The screen
   * captions the level from this, so it has to mean "it actually moved", not "there was a
   * verdict": `increase` at `hard` has nowhere to go, and a caption over an unchanged level lies.
   */
  adjusted: boolean;
};

const LADDER: DifficultyCode[] = ["easy", "medium", "hard"];

/** One rung up or down, clamped at both ends. */
function shift(level: DifficultyCode, by: -1 | 0 | 1): DifficultyCode {
  const next = LADDER[Math.min(LADDER.length - 1, Math.max(0, LADDER.indexOf(level) + by))];
  return next ?? level;
}

/**
 * What level to propose next, from what the hero *did* — their last `maxSessions` choices — then
 * moved one rung by what they *felt*, over the shorter window `analyzeDifficultyProgression`
 * reads. Two windows on purpose: the choices are the baseline, the feeling is the correction.
 *
 * ponytail: the feeling window straddles a shift — three "too easy" reported at `medium` are
 *           still in it after the move to `hard`, so they push once more. Ceiling: converges in
 *           three reports either way and is symmetric, so it self-corrects. Count only the
 *           feedback from sessions performed at the current level if that surprises anyone.
 */
export function suggestDifficultyFromSessions(
  sessions: SessionSummary[],
  options?: {
    maxSessions?: number;
    defaultDifficulty?: DifficultyCode;
  },
): DifficultySuggestion {
  const maxSessions = options?.maxSessions ?? 10;
  const fallback: DifficultyCode = options?.defaultDifficulty ?? "medium";

  const recent = sessions
    .slice(-maxSessions)
    .map((s) => s.userLevel)
    .filter((v): v is DifficultyCode => v === "easy" || v === "medium" || v === "hard");

  if (recent.length === 0) return { level: fallback, adjusted: false };

  const score = (level: DifficultyCode) => {
    if (level === "easy") return 0;
    if (level === "hard") return 2;
    return 1;
  };

  const avg = recent.reduce((acc, lvl) => acc + score(lvl), 0) / recent.length;

  const chosen: DifficultyCode = avg <= 0.75 ? "easy" : avg >= 1.25 ? "hard" : "medium";

  const { action } = analyzeDifficultyProgression(sessions);
  const level = shift(chosen, action === "increase" ? 1 : action === "decrease" ? -1 : 0);

  return { level, adjusted: level !== chosen };
}

export type ProgressionRecommendation = {
  action: "increase" | "maintain" | "decrease";
  reason: "too_easy" | "too_hard" | "just_right" | "inconsistent" | "not_enough_data";
  confidence: number; // 0-1
};

export function analyzeDifficultyProgression(
  sessions: SessionSummary[],
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
