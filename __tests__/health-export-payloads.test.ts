import fs from "node:fs";
import path from "node:path";
import {
  type ExportSession,
  type ExportSet,
  type HealthRoutePoint,
  toHealthRecord,
} from "../src/healthExport/record";

/**
 * What Bati sends, entry by entry, frozen. Each fixture is a shape the journal really holds; the
 * payloads are the mapper's output, word for word. A change to what Bati sends shows up as a diff
 * of `golden/health-export-payloads.json`.
 *
 * If the change is intended: `UPDATE_GOLDEN=1 npx jest health-export-payloads`, and say in the PR
 * what moved and why.
 */
const GOLDEN_FILE = path.join(__dirname, "golden", "health-export-payloads.json");

const format = {
  figure: (type: "reps" | "time", value: number) => (type === "time" ? `${value} s` : `${value}`),
  line: (name: string, figures: string[]) => `${name}: ${figures.join(", ")}`,
};

const set = (
  enName: string,
  name: string,
  at: Date,
  value: number,
  type: "reps" | "time" = "reps",
): ExportSet => ({ enName, seed: true, name, type, value, sides: 1, at });

const plus = (date: Date, seconds: number) => new Date(date.getTime() + seconds * 1000);

function workout(uuid: string, performedAt: Date, tzOffsetMin: number, overrides = {}) {
  return {
    uuid,
    version: 0,
    title: "Le Réveil de l'Écuyer",
    performedAt,
    durationSeconds: 600,
    tzOffsetMin,
    outing: null,
    distanceM: null,
    route: null,
    sets: [
      set("Squat", "Squat", plus(performedAt, 90), 15),
      set("Plank", "Planche", plus(performedAt, 200), 45, "time"),
      set("Squat", "Squat", plus(performedAt, 320), 12),
    ],
    ...overrides,
  } satisfies ExportSession;
}

/** A fix every `every` seconds over `seconds`, skipping the paused stretches. */
function fixes(start: Date, seconds: number, every = 10, paused: [number, number][] = []) {
  const points: HealthRoutePoint[] = [];
  for (let s = 0; s <= seconds; s += every) {
    if (paused.some(([from, to]) => s > from && s < to)) continue;
    points.push({ t: start.getTime() + s * 1000, lat: 45.75 + s * 1e-5, lon: 4.85 + s * 1e-5 });
  }
  return points;
}

function outing(
  uuid: string,
  kind: "walk" | "run" | "ride",
  performedAt: Date,
  overrides: Partial<ExportSession> = {},
): ExportSession {
  return {
    uuid,
    version: 0,
    title: "La Course du Messager",
    performedAt,
    durationSeconds: 1800,
    tzOffsetMin: 60,
    sets: [],
    outing: kind,
    distanceM: 5120,
    route: null,
    ...overrides,
  };
}

const morning = new Date("2026-11-12T07:00:00Z");
const fixtures: Record<string, ExportSession> = {
  "a plain quest": workout("0193-quest", morning, 60),
  "a quest with a movement Health Connect has no type for": workout("0193-pushups", morning, 60, {
    sets: [
      set("Push-ups", "Pompes", plus(morning, 60), 12),
      set("Squat", "Squat", plus(morning, 150), 20),
      set("Push-ups", "Pompes", plus(morning, 240), 10),
      { ...set("Squat", "My squat", plus(morning, 330), 8), seed: false },
    ],
  }),
  "a run": outing("0193-run", "run", morning),
  "a bike ride": outing("0193-ride", "ride", morning, { distanceM: 18_400, durationSeconds: 3600 }),
  "a walk": outing("0193-walk", "walk", morning, { distanceM: 2300 }),
  "a run with its route": outing("0193-route", "run", morning, {
    durationSeconds: 120,
    // Two fixes outside the session: before the start and at the very end. Neither may go.
    route: [
      { t: morning.getTime() - 5000, lat: 45.7, lon: 4.8 },
      ...fixes(morning, 110, 20),
      { t: morning.getTime() + 120_000, lat: 45.8, lon: 4.9 },
    ],
  }),
  "an outing with pauses": outing("0193-pauses", "walk", morning, {
    durationSeconds: 300,
    distanceM: 260,
    route: fixes(morning, 290, 30, [
      [60, 150],
      [200, 240],
    ]),
  }),
  "an outing with no GPS points": outing("0193-nogps", "walk", morning, {
    distanceM: null,
    route: [],
  }),
  "a session crossing midnight": workout("0193-midnight", new Date("2026-11-12T22:55:00Z"), 60),
  // Paris, 25 October 2026: 03:00 summer time is 02:00 winter time. The session started at 02:30
  // summer time (+120) and ended after the change; the journal keeps the offset it started with.
  "a session across a daylight saving change": workout(
    "0193-dst",
    new Date("2026-10-25T00:30:00Z"),
    120,
    { durationSeconds: 3600 },
  ),
  "a corrected session": workout("0193-corrected", morning, 60, { version: 1_794_812_400_000 }),
};

const payloads = Object.fromEntries(
  Object.entries(fixtures).map(([name, session]) => [name, toHealthRecord(session, format)]),
);

describe("what Bati sends", () => {
  test("every payload is what it was", () => {
    const now = JSON.parse(JSON.stringify(payloads));
    if (process.env.UPDATE_GOLDEN === "1") {
      fs.mkdirSync(path.dirname(GOLDEN_FILE), { recursive: true });
      fs.writeFileSync(GOLDEN_FILE, `${JSON.stringify(now, null, 2)}\n`);
    }
    expect(now).toEqual(JSON.parse(fs.readFileSync(GOLDEN_FILE, "utf8")));
  });

  test("no payload ever holds calories, heart rate, elevation or speed, at any depth", () => {
    const forbidden =
      /calor|energy|heart|bpm|elev|altitude|ascent|\bele\b|speed|pace|cadence|power|accuracy|baro|steps/i;
    const keys = (value: unknown): string[] =>
      value === null || typeof value !== "object"
        ? []
        : Object.entries(value).flatMap(([k, v]) => [k, ...keys(v)]);
    for (const [name, payload] of Object.entries(payloads)) {
      const leaked = keys(payload).filter((k) => forbidden.test(k));
      expect({ name, leaked }).toEqual({ name, leaked: [] });
    }
  });

  test("a route only when the entry was handed one, and only its time and position", () => {
    for (const [name, payload] of Object.entries(payloads)) {
      const handed = (fixtures[name]?.route?.length ?? 0) > 0;
      expect({ name, route: payload.route !== null }).toEqual({ name, route: handed });
      for (const point of payload.route ?? []) {
        expect(Object.keys(point).sort()).toEqual(["lat", "lon", "t"]);
        expect(point.t).toBeGreaterThanOrEqual(payload.start);
        expect(point.t).toBeLessThan(payload.end);
      }
    }
  });

  test("a workout never carries a distance or a route; an outing never carries segments or notes", () => {
    const shape = Object.entries(payloads).map(([name, p]) =>
      fixtures[name]?.outing === null
        ? { name, distance: p.distance, route: p.route }
        : { name, segments: p.segments, notes: p.notes },
    );
    expect(shape).toEqual(
      Object.entries(fixtures).map(([name, f]) =>
        f.outing === null
          ? { name, distance: null, route: null }
          : { name, segments: [], notes: null },
      ),
    );
  });

  test("the distance record's id is the session's, so it updates and deletes with it", () => {
    expect(payloads["a run"]?.distance).toEqual({ id: "bati-0193-run-distance", meters: 5120 });
    expect(payloads["an outing with no GPS points"]?.distance).toBeNull();
  });

  test("a date is never changed: start, end and offset are the journal's", () => {
    for (const [name, payload] of Object.entries(payloads)) {
      const session = fixtures[name];
      expect(payload.start).toBe(session?.performedAt.getTime());
      expect(payload.offsetMinutes).toBe(session?.tzOffsetMin);
    }
  });
});
