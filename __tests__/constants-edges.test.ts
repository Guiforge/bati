import { getAvatarSource } from "@/constants/avatars";
import { buildingStage } from "@/constants/buildingLevels";
import { getWeekStart } from "@/constants/dateFormatters";
import { getExerciseColorKey } from "@/constants/exerciseColors";

// Four small pure functions that decide something visible — a colour, a calendar's first column,
// which avatar the hero sees — and whose fallback arms were never exercised. They are the cheapest
// branches in the repo to cover and the easiest to break silently, because every one of them
// *returns* something plausible when it takes the wrong path. No crash, just a wrong Monday.

describe("getExerciseColorKey", () => {
  it("prefers the first muscle when there is one", () => {
    expect(getExerciseColorKey({ muscles: ["chest", "arms"] })).toBe("chest");
  });

  it("falls back to the target type when no muscle is declared", () => {
    expect(getExerciseColorKey({ muscles: [], targetType: "time" })).toBe("time");
    expect(getExerciseColorKey({ targetType: "reps" })).toBe("reps");
  });

  it("falls back to default when it knows nothing at all", () => {
    expect(getExerciseColorKey({})).toBe("default");
    expect(getExerciseColorKey({ muscles: [] })).toBe("default");
  });
});

describe("getWeekStart", () => {
  it("starts the week on Monday in French and Sunday everywhere else", () => {
    // A wrong answer here shifts every cell of the journal's calendar by one day, which reads
    // as "my sessions moved" rather than as a bug.
    expect(getWeekStart("fr")).toBe(1);
    expect(getWeekStart("en")).toBe(0);
    expect(getWeekStart("de")).toBe(0);
  });
});

describe("getAvatarSource", () => {
  it("prefers the hero's own photo over the built-in avatar", () => {
    expect(getAvatarSource("guardian", "file:///photo.jpg")).toEqual({ uri: "file:///photo.jpg" });
  });

  it("uses the built-in avatar when no photo was picked", () => {
    expect(getAvatarSource("guardian", null)).not.toEqual({ uri: expect.anything() });
  });
});

describe("buildingStage", () => {
  it("reads the three stages off the level, boundaries included", () => {
    expect(buildingStage(0)).toBe("rough");
    expect(buildingStage(2)).toBe("rough");
    expect(buildingStage(3)).toBe("solid");
    expect(buildingStage(4)).toBe("solid");
    expect(buildingStage(5)).toBe("grand");
    expect(buildingStage(99)).toBe("grand");
  });
});
