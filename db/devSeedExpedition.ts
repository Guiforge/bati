import { eq } from "drizzle-orm";
import type { LocationFix } from "@/modules/bati-location";
import { accept, EMPTY, RULES } from "@/src/gps/track";
import { db, schema } from "./client";
import { createCompletedSession } from "./completed";
import { appendPoints } from "./gps";
import { computeSessionXp } from "./xp";

/**
 * One finished expedition, with a trace, seeded from app/dev.tsx.
 *
 * It exists because **the app cannot produce an expedition indoors.** `devSeedHistory.ts` fills
 * `completed_sessions` in SQL and knows nothing about leagues or GPS; the test-provider replay
 * harness the GPS review asked for (finding 7A) was never built. So the recap map — the one
 * screen that is a map — could only ever be seen by walking outside with a phone, which makes it
 * the one screen nobody can iterate on, and the one feature no screenshot has ever shown.
 *
 * What this is not: a substitute for the field test. The fixes below never touched a receiver.
 * They prove that the recap renders a trace, and nothing whatsoever about whether the service
 * records one.
 *
 * **Written through the real writers.** `createCompletedSession` and `appendPoints`, not raw SQL,
 * and the leagues come from `accept()` — the same reducer a live outing runs, over the same
 * `LocationFix` shape. A demo that hand-wrote its own distance would be showing a number the app
 * cannot produce, which is the failure mode this file exists to avoid, one storey up.
 */

/** Same convention as DEV_HISTORY_NOTE: the marker is what makes the row removable. */
export const DEV_EXPEDITION_NOTE = "__dev_expedition";

/**
 * Where the demo outing happens.
 *
 * Inside the Bois de Vincennes, which is 10 km² of park: the loop below lands on ground that
 * renders as paths and woodland at every zoom, rather than through the middle of a building.
 * Move it to somewhere you know if you prefer — nothing reads these numbers but the map.
 */
const CENTRE = { lat: 48.83, lon: 2.43 };
const RADIUS_M = 1150;

/** ~5:45 per kilometre, which is a run rather than a walk and shows a pace worth reading. */
const PACE_MS = 2.9;
const SAMPLE_MS = 1000;

/**
 * A real stop, partway round.
 *
 * Without one the demo never shows the auto-pause rule working, and `movingMs` would equal the
 * elapsed time exactly — which is the one thing a real outing never does.
 */
const STOP_AFTER_M = 3400;
/** Long enough to outlast the reducer's pause window, whatever that window becomes. */
const STOP_SECONDS = Math.round((RULES.pauseAfterMs / 1000) * 3);

const METRES_PER_DEGREE = 111_320;

/** Deterministic noise: the same seed every time, so a screenshot does not move between runs. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Point = { lat: number; lon: number };

function metresBetween(a: Point, b: Point): number {
  const toRad = Math.PI / 180;
  const x = (b.lon - a.lon) * toRad * Math.cos(((a.lat + b.lat) / 2) * toRad) * METRES_PER_DEGREE;
  const y = (b.lat - a.lat) * METRES_PER_DEGREE;
  return Math.hypot(x, y);
}

/**
 * The loop, as a dense closed polyline.
 *
 * Two harmonics on the radius rather than a circle: a perfect ring reads as generated at a
 * glance, and the point of the screenshot is a route that looks like somebody ran it.
 */
function loopPolyline(steps: number): Point[] {
  const lonScale = Math.cos(CENTRE.lat * (Math.PI / 180));
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const r = RADIUS_M * (1 + 0.19 * Math.sin(3 * theta) + 0.08 * Math.cos(5 * theta + 1.1));
    out.push({
      lat: CENTRE.lat + (r * Math.sin(theta)) / METRES_PER_DEGREE,
      lon: CENTRE.lon + (r * Math.cos(theta)) / (METRES_PER_DEGREE * lonScale),
    });
  }
  return out;
}

/** Walk the polyline at a constant pace, emitting one fix per second, with a stop partway. */
function syntheticFixes(startedAt: number): LocationFix[] {
  const line = loopPolyline(4000);
  const cumulative = [0];
  for (let i = 1; i < line.length; i++) {
    const previous = line[i - 1];
    const current = line[i];
    if (!previous || !current) break;
    cumulative.push((cumulative[i - 1] ?? 0) + metresBetween(previous, current));
  }
  const perimeter = cumulative[cumulative.length - 1] ?? 0;

  /** Position at a given distance along the loop, interpolated between the two nearest nodes. */
  const at = (distance: number): Point => {
    const clamped = Math.min(Math.max(distance, 0), perimeter);
    let hi = cumulative.findIndex((d) => d >= clamped);
    if (hi <= 0) hi = 1;
    const lo = hi - 1;
    const a = line[lo];
    const b = line[hi];
    const dLo = cumulative[lo] ?? 0;
    const dHi = cumulative[hi] ?? 0;
    if (!a || !b) return line[0] ?? CENTRE;
    const span = dHi - dLo;
    const f = span > 0 ? (clamped - dLo) / span : 0;
    return { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f };
  };

  const random = mulberry32(0x6a71);
  const jitter = (metres: number) => (random() - 0.5) * 2 * metres;

  const fixes: LocationFix[] = [];
  let previous: Point | null = null;
  let covered = 0;
  let stopped = 0;

  for (let second = 0; covered < perimeter; second++) {
    const resting = covered >= STOP_AFTER_M && stopped < STOP_SECONDS;
    if (resting) stopped += 1;
    else covered = Math.min(perimeter, covered + PACE_MS);

    const truth = at(covered);
    // Standing still still drifts, which is exactly what the reducer's pause rule is built to
    // ignore: displacement from an anchor, never a sum of these wobbles.
    const noise = resting ? 3 : 2.2;
    const lonScale = Math.cos(truth.lat * (Math.PI / 180));
    const point: Point = {
      lat: truth.lat + jitter(noise) / METRES_PER_DEGREE,
      lon: truth.lon + jitter(noise) / (METRES_PER_DEGREE * lonScale),
    };

    fixes.push({
      t: startedAt + second * SAMPLE_MS,
      lat: point.lat,
      lon: point.lon,
      ele: 44 + 6 * Math.sin(covered / 600) + jitter(1.5),
      acc: 4.5 + random() * 4,
      speed: resting ? random() * 0.3 : PACE_MS + jitter(0.5),
      distFromPrev: previous ? metresBetween(previous, point) : 0,
    });
    previous = point;
  }

  return fixes;
}

/** The seeded quest whose single movement carries `style: 'expedition'` (migration 0042). */
async function anExpeditionSlot() {
  const [row] = await db
    .select({
      questId: schema.quests.id,
      exerciseId: schema.exercises.id,
      secondsPerRep: schema.exercises.secondsPerRep,
      difficulty: schema.exercises.difficulty,
      style: schema.exercises.style,
      targetType: schema.questExercises.targetType,
      targetMin: schema.questExercises.targetMin,
    })
    .from(schema.questExercises)
    .innerJoin(schema.exercises, eq(schema.exercises.id, schema.questExercises.exerciseId))
    .innerJoin(schema.quests, eq(schema.quests.id, schema.questExercises.questId))
    .where(eq(schema.exercises.style, "expedition"))
    .limit(1);
  return row ?? null;
}

/** Removes only the seeded outings; `gps_points` has no cascade, so it is swept by hand. */
export async function clearSeededExpeditions(): Promise<void> {
  const rows = await db
    .select({ uuid: schema.completedQuest.uuid })
    .from(schema.completedQuest)
    .where(eq(schema.completedQuest.notes, DEV_EXPEDITION_NOTE));

  await db
    .delete(schema.completedQuest)
    .where(eq(schema.completedQuest.notes, DEV_EXPEDITION_NOTE));

  for (const row of rows) {
    if (row.uuid) await db.delete(schema.gpsPoints).where(eq(schema.gpsPoints.sessionId, row.uuid));
  }
}

export type SeededExpedition = {
  /** What `/recap?session=…` takes. */
  uuid: string;
  leaguesM: number;
  movingSeconds: number;
  points: number;
};

export async function seedExpedition(): Promise<SeededExpedition> {
  const slot = await anExpeditionSlot();
  if (!slot) throw new Error("No expedition quest in the catalogue — is migration 0042 applied?");

  await clearSeededExpeditions();

  // Yesterday morning: recent enough to lead the journal, old enough not to collide with a
  // session the hero may be running while looking at this.
  const performedAt = new Date(Date.now() - 26 * 3600 * 1000);
  const fixes = syntheticFixes(performedAt.getTime());

  // The reducer, not a sum of the fixes. It is what a live outing credits, and the difference
  // between the two is the stop above.
  let track = EMPTY;
  for (const fix of fixes) track = accept(track, fix);

  const elapsedSeconds = Math.round((fixes.length * SAMPLE_MS) / 1000);
  const movingSeconds = Math.round(track.movingMs / 1000);
  const set = {
    exercise: {
      secondsPerRep: slot.secondsPerRep,
      difficulty: slot.difficulty,
      style: slot.style,
    },
    target: { type: slot.targetType, value: slot.targetMin },
    result: { type: slot.targetType, value: movingSeconds },
  };

  const uuid = `dev-expedition-${performedAt.getTime()}`;

  await createCompletedSession({
    uuid,
    questId: slot.questId,
    leaguesM: Math.round(track.distanceM),
    // Both halves of the ground, or the recap goes quiet about the clock and the pace, which is
    // what it is meant to do for a session recorded before the column existed and exactly wrong
    // for a demo. This is the second writer of a completed session, and it drifted from the real
    // one the day `movingSeconds` was added.
    movingSeconds,
    durationSeconds: elapsedSeconds,
    xpEarned: computeSessionXp({
      sets: [set],
      effortCeilingSeconds: elapsedSeconds,
      userLevel: "medium",
    }),
    notes: DEV_EXPEDITION_NOTE,
    performedAt,
    exercises: [{ exerciseId: slot.exerciseId, sortOrder: 0, ...set }],
  });

  await appendPoints(uuid, fixes);

  return {
    uuid,
    leaguesM: Math.round(track.distanceM),
    movingSeconds,
    points: track.points,
  };
}
