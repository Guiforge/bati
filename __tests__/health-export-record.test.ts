import { type ExportSession, SEGMENT_FOR, toHealthRecord } from "../src/healthExport/record";
import { createTestDb } from "./helpers/testDb";

const format = {
  figure: (type: "reps" | "time", value: number) => (type === "time" ? `${value} s` : `${value}`),
  line: (name: string, figures: string[]) => `${name}: ${figures.join(", ")}`,
};

const start = new Date("2026-11-12T18:00:00Z");
const at = (seconds: number) => new Date(start.getTime() + seconds * 1000);

function session(overrides: Partial<ExportSession> = {}): ExportSession {
  return {
    uuid: "0193-abc",
    version: 0,
    title: "Le Réveil de l'Écuyer",
    performedAt: start,
    durationSeconds: 600,
    tzOffsetMin: 60,
    outing: null,
    distanceM: null,
    route: null,
    sets: [
      { enName: "Squat", seed: true, name: "Squat", type: "reps", value: 15, sides: 1, at: at(60) },
      {
        enName: "Push-ups",
        seed: true,
        name: "Pompes",
        type: "reps",
        value: 12,
        sides: 1,
        at: at(150),
      },
      {
        enName: "Plank",
        seed: true,
        name: "Planche",
        type: "time",
        value: 45,
        sides: 1,
        at: at(240),
      },
      {
        enName: "Push-ups",
        seed: true,
        name: "Pompes",
        type: "reps",
        value: 10,
        sides: 1,
        at: at(330),
      },
    ],
    ...overrides,
  };
}

describe("toHealthRecord", () => {
  test("one calisthenics record, named after the quest, at the session's real times and zone", () => {
    const record = toHealthRecord(session(), format);
    expect(record.id).toBe("bati-0193-abc");
    expect(record.title).toBe("Le Réveil de l'Écuyer");
    expect(record.start).toBe(start.getTime());
    expect(record.end).toBe(at(600).getTime());
    expect(record.offsetMinutes).toBe(60);
    expect(record.version).toBe(0);
  });

  test("a matched exercise is a segment with the reps done; the rest goes to the notes", () => {
    const record = toHealthRecord(session(), format);
    expect(record.segments).toEqual([
      { start: start.getTime(), end: at(60).getTime(), type: SEGMENT_FOR.Squat, reps: 15 },
      // A hold is timed, not counted: its segment is its own seconds, with no reps.
      { start: at(195).getTime(), end: at(240).getTime(), type: SEGMENT_FOR.Plank, reps: 0 },
    ]);
    expect(record.notes).toBe("Pompes: 12, 10");
  });

  test("a set done on both sides counts both", () => {
    const record = toHealthRecord(
      session({
        sets: [
          {
            enName: "Lunge",
            seed: true,
            name: "Fente",
            type: "reps",
            value: 10,
            sides: 2,
            at: at(90),
          },
        ],
      }),
      format,
    );
    expect(record.segments[0]?.reps).toBe(20);
  });

  test("a hero's own movement never borrows a seed name's type", () => {
    const record = toHealthRecord(
      session({
        sets: [
          {
            enName: "Squat",
            seed: false,
            name: "Mon squat",
            type: "reps",
            value: 8,
            sides: 1,
            at: at(60),
          },
        ],
      }),
      format,
    );
    expect(record.segments).toEqual([]);
    expect(record.notes).toBe("Mon squat: 8");
  });

  test("segments never overlap and never leave the session, whatever the stamps say", () => {
    const record = toHealthRecord(
      session({
        durationSeconds: 100,
        sets: [
          // Two sets stamped the same second: the second has no room and goes to the notes.
          {
            enName: "Squat",
            seed: true,
            name: "Squat",
            type: "reps",
            value: 10,
            sides: 1,
            at: at(50),
          },
          {
            enName: "Squat",
            seed: true,
            name: "Squat",
            type: "reps",
            value: 9,
            sides: 1,
            at: at(50),
          },
          // Stamped before the session started (a clock that moved): no room either.
          {
            enName: "Burpee",
            seed: true,
            name: "Burpee",
            type: "reps",
            value: 5,
            sides: 1,
            at: at(-5),
          },
        ],
      }),
      format,
    );
    for (const s of record.segments) {
      expect(s.start).toBeGreaterThanOrEqual(record.start);
      expect(s.end).toBeLessThanOrEqual(record.end);
      expect(s.start).toBeLessThan(s.end);
    }
    const sorted = [...record.segments].sort((a, b) => a.start - b.start);
    sorted.slice(1).forEach((s, i) => {
      expect(s.start).toBeGreaterThanOrEqual(sorted[i]?.end ?? 0);
    });
    expect(record.segments).toHaveLength(1);
    expect(record.notes).toBe("Burpee: 5\nSquat: 9");
  });

  test("ends at the last set when the clock without pauses reads shorter", () => {
    const record = toHealthRecord(session({ durationSeconds: 120 }), format);
    expect(record.end).toBe(at(330).getTime());
  });

  test("a session with no time at all still has an end after its start", () => {
    const record = toHealthRecord(session({ durationSeconds: null, sets: [] }), format);
    expect(record.end).toBeGreaterThan(record.start);
    expect(record.notes).toBeNull();
  });

  test("carries nothing but a workout: no calories, heart rate, route or distance", () => {
    const record = toHealthRecord(session(), format);
    expect(Object.keys(record).sort()).toEqual(
      [
        "distance",
        "end",
        "exerciseType",
        "id",
        "notes",
        "offsetMinutes",
        "route",
        "segments",
        "start",
        "title",
        "version",
      ].sort(),
    );
    expect(record).toMatchObject({ exerciseType: 13, distance: null, route: null });
    for (const s of record.segments)
      expect(Object.keys(s).sort()).toEqual(["end", "reps", "start", "type"]);
  });
});

describe("SEGMENT_FOR", () => {
  const t = createTestDb();
  afterAll(() => t.close());

  test("names only movements the game ships, so a renamed one cannot silently fall to the notes", () => {
    const names = new Set(
      (
        t.sqlite.prepare("SELECT enName FROM exercises WHERE creator = 'Admin'").all() as {
          enName: string;
        }[]
      ).map((r) => r.enName),
    );
    for (const name of Object.keys(SEGMENT_FOR))
      expect([name, names.has(name)]).toEqual([name, true]);
  });

  test("uses only types Health Connect accepts inside a calisthenics session", () => {
    // connect-client 1.1.0, ExerciseSegment.kt: EXERCISE_SEGMENTS plus the universal ones.
    const allowed = new Set([
      1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 25, 26, 27, 28, 29,
      30, 31, 32, 33, 34, 35, 36, 37, 41, 42, 43, 48, 49, 50, 51, 63, 65, 0, 38, 39, 44, 54,
    ]);
    for (const [name, type] of Object.entries(SEGMENT_FOR))
      expect([name, allowed.has(type)]).toEqual([name, true]);
  });
});
