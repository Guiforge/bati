import { recordCue } from "@/components/chorus/recordCue";
import type { NewRecordResult } from "@/db/personalRecords";

/**
 * Which line a finished session has earned.
 *
 * The split exists because the evidence says a specific line keeps working where a generic one
 * stops — so when there is a real comparison the villager should make it, and when there is not,
 * reaching for one would produce "0 more than last time" on a hero's very first record.
 */
function record(over: Partial<NewRecordResult> = {}): NewRecordResult {
  return {
    isNewRecord: true,
    recordType: "exercise_max_reps",
    newValue: 20,
    previousValue: 10,
    exerciseName: { en: "Squat", fr: "Squat" },
    ...over,
  };
}

describe("recordCue", () => {
  test("says nothing when the session set no record", () => {
    expect(recordCue([], "en")).toBeNull();
  });

  test("quotes the difference when there is a previous mark to beat", () => {
    expect(recordCue([record()], "en")).toEqual({
      moment: "personal_record_beat",
      delta: 10,
      unit: "reps",
      exercise: "Squat",
    });
  });

  test("counts a held position in seconds, not reps", () => {
    const cue = recordCue([record({ recordType: "exercise_max_time", newValue: 65 })], "en");
    expect(cue).toMatchObject({ unit: "seconds", delta: 55 });
  });

  test("falls back to the plain pool on a first-ever record", () => {
    // No previous value means no comparison — and a villager comparing to nothing is worse than
    // one who simply says well done.
    expect(recordCue([record({ previousValue: null })], "en")).toEqual({
      moment: "personal_record",
    });
  });

  test("falls back to the plain pool when the difference rounds to nothing", () => {
    expect(recordCue([record({ newValue: 10 })], "en")).toEqual({ moment: "personal_record" });
  });

  test("falls back to the plain pool for a record that is not about an exercise", () => {
    // "Longest session" beats a previous value too, but a villager saying "four minutes longer"
    // measures the wrong thing: nobody set out to make the workout long.
    const cue = recordCue(
      [record({ recordType: "longest_session", exerciseName: undefined })],
      "en",
    );
    expect(cue).toEqual({ moment: "personal_record" });
  });

  test("names the exercise in the hero's own language", () => {
    const fr = record({ exerciseName: { en: "Push-up", fr: "Pompe" } });
    expect(recordCue([fr], "fr")).toMatchObject({ exercise: "Pompe" });
    expect(recordCue([fr], "en")).toMatchObject({ exercise: "Push-up" });
  });

  test("skips past a non-comparable record to find one it can quote", () => {
    const mixed = [record({ recordType: "most_xp", exerciseName: undefined }), record()];
    expect(recordCue(mixed, "en")).toMatchObject({ moment: "personal_record_beat", delta: 10 });
  });
});
