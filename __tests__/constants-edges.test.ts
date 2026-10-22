import { getAvatarSource } from "@/constants/avatars";
import { buildingStage } from "@/constants/buildingLevels";
import { formatDay, getWeekStart } from "@/constants/dateFormatters";
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

/** A date a reader sees, the first of a month as French writes it and Intl does not. */
describe("formatDay", () => {
  test("French writes the first of a month as an ordinal, every other day as a number", () => {
    expect(formatDay("fr", new Date(2026, 2, 1), { dateStyle: "long" })).toBe("1er mars 2026");
    expect(formatDay("fr", new Date(2026, 0, 1), { month: "long", day: "numeric" })).toBe(
      "1er janvier",
    );
    expect(formatDay("fr", new Date(2026, 2, 11), { dateStyle: "long" })).toBe("11 mars 2026");
  });

  test("other languages keep what Intl writes", () => {
    expect(formatDay("en", new Date(2026, 2, 1), { month: "long", day: "numeric" })).toBe(
      "March 1",
    );
    expect(formatDay("de", new Date(2026, 2, 1), { month: "long", day: "numeric" })).toBe(
      "1. März",
    );
  });
});

describe("getWeekStart", () => {
  it("starts the week on Monday in French and Sunday in English", () => {
    // A wrong answer here shifts every cell of the journal's calendar by one day, which reads
    // as "my sessions moved" rather than as a bug.
    expect(getWeekStart("fr")).toBe(1);
    expect(getWeekStart("en")).toBe(0);
  });
});

describe("getAvatarSource", () => {
  // A JPEG header: SOI, then a SOF0 segment saying 256 x 256.
  const jpeg256 = `data:image/jpeg;base64,${Buffer.from([
    0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 1, 0, 1, 0, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
  ]).toString("base64")}`;

  it("prefers the hero's own photo over the built-in avatar", () => {
    expect(getAvatarSource("guardian", jpeg256)).toEqual({ uri: jpeg256 });
  });

  it("never loads a URL or a file a restored backup put there", () => {
    const preset = getAvatarSource("guardian", null);
    expect(getAvatarSource("guardian", "https://attacker.example/p.png")).toEqual(preset);
    expect(getAvatarSource("guardian", "file:///photo.jpg")).toEqual(preset);
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
