import type { SessionSummary } from "../db/completed";
import { suggestDifficultyFromSessions } from "../db/difficultySuggestion";

function session(level: "easy" | "medium" | "hard", id: number): SessionSummary {
  return {
    id,
    questId: 1,
    userLevel: level,
    durationSeconds: 60,
    performedAt: new Date(2024, 0, id),
  };
}

describe("db/difficultySuggestion", () => {
  test("defaults to medium with no history", () => {
    expect(suggestDifficultyFromSessions([])).toBe("medium");
  });

  test("suggests hard when recent average is high", () => {
    const sessions: SessionSummary[] = [
      session("hard", 1),
      session("hard", 2),
      session("hard", 3),
      session("medium", 4),
    ];
    expect(suggestDifficultyFromSessions(sessions)).toBe("hard");
  });

  test("suggests easy when recent average is low", () => {
    const sessions: SessionSummary[] = [
      session("easy", 1),
      session("easy", 2),
      session("medium", 3),
      session("easy", 4),
    ];
    expect(suggestDifficultyFromSessions(sessions)).toBe("easy");
  });

  test("suggests medium when mixed", () => {
    const sessions: SessionSummary[] = [
      session("easy", 1),
      session("medium", 2),
      session("hard", 3),
      session("medium", 4),
    ];
    expect(suggestDifficultyFromSessions(sessions)).toBe("medium");
  });
});
