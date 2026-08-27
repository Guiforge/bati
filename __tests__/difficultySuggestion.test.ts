import type { SessionSummary } from "../db/completed";
import { suggestDifficultyFromSessions } from "../db/difficultySuggestion";
import type { FeedbackCode } from "../db/schema";

function session(
  level: "easy" | "medium" | "hard",
  id: number,
  feedback: FeedbackCode | null = null,
): SessionSummary {
  return {
    id,
    questId: 1,
    userLevel: level,
    durationSeconds: 60,
    performedAt: new Date(2024, 0, id),
    feedback,
  };
}

/** Five sessions at one level, the last `reported` of them carrying a feeling. */
function fiveAt(level: "easy" | "medium" | "hard", feedback: FeedbackCode | null, reported = 0) {
  return Array.from({ length: 5 }, (_, i) =>
    session(level, i + 1, i >= 5 - reported ? feedback : null),
  );
}

describe("db/difficultySuggestion", () => {
  test("defaults to medium with no history", () => {
    expect(suggestDifficultyFromSessions([]).level).toBe("medium");
  });

  test("suggests hard when recent average is high", () => {
    const sessions: SessionSummary[] = [
      session("hard", 1),
      session("hard", 2),
      session("hard", 3),
      session("medium", 4),
    ];
    expect(suggestDifficultyFromSessions(sessions).level).toBe("hard");
  });

  test("suggests easy when recent average is low", () => {
    const sessions: SessionSummary[] = [
      session("easy", 1),
      session("easy", 2),
      session("medium", 3),
      session("easy", 4),
    ];
    expect(suggestDifficultyFromSessions(sessions).level).toBe("easy");
  });

  test("suggests medium when mixed", () => {
    const sessions: SessionSummary[] = [
      session("easy", 1),
      session("medium", 2),
      session("hard", 3),
      session("medium", 4),
    ];
    expect(suggestDifficultyFromSessions(sessions).level).toBe("medium");
  });

  describe("the feeling moves the suggestion", () => {
    // The whole point of roadmap 4.5: answering "too easy" has to reach the level the app picks,
    // not just render a card in the Journal.
    test("three 'too easy' out of five raise it one rung", () => {
      expect(suggestDifficultyFromSessions(fiveAt("medium", "easy", 3))).toEqual({
        level: "hard",
        adjusted: true,
      });
    });

    test("three 'too hard' out of five lower it one rung", () => {
      expect(suggestDifficultyFromSessions(fiveAt("medium", "hard", 3))).toEqual({
        level: "easy",
        adjusted: true,
      });
    });

    // A hero who never answers the question must see exactly what they saw before this feature.
    test("silence changes nothing", () => {
      expect(suggestDifficultyFromSessions(fiveAt("medium", null))).toEqual({
        level: "medium",
        adjusted: false,
      });
    });

    // The flag is not "was there a verdict" but "did the level actually move" — the screen shows
    // a caption from it, and a caption over an unchanged level is a lie.
    test("'too easy' at the top rung reports nothing to say", () => {
      expect(suggestDifficultyFromSessions(fiveAt("hard", "easy", 3))).toEqual({
        level: "hard",
        adjusted: false,
      });
    });

    test("'too hard' at the bottom rung reports nothing to say", () => {
      expect(suggestDifficultyFromSessions(fiveAt("easy", "hard", 3))).toEqual({
        level: "easy",
        adjusted: false,
      });
    });

    // Under three sessions analyzeDifficultyProgression abstains, so a first week is never moved.
    test("two sessions are not enough to move anything", () => {
      expect(
        suggestDifficultyFromSessions([session("medium", 1, "easy"), session("medium", 2, "easy")]),
      ).toEqual({ level: "medium", adjusted: false });
    });
  });
});
