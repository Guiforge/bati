import type { Locomotion, QuestTargetType } from "@/db/schema";

/** One logged set, as the journal holds it, with what the record needs to name it. */
export type ExportSet = {
  /** The movement's `enName`, which is what the segment table is keyed on for a seed movement. */
  enName: string;
  /** A seed movement (`creator = 'Admin'`). A hero's own never borrows a seed name's segment. */
  seed: boolean;
  /** The movement's name in the hero's language, for the notes. */
  name: string;
  type: QuestTargetType;
  /** What was done, one side's figure: `completed_exercises.resultValue`, never the objective. */
  value: number;
  sides: number;
  /** When the set ended. */
  at: Date;
};

export type ExportSession = {
  uuid: string;
  /**
   * Health Connect's client record version: an equal or higher one replaces, a lower one is ignored
   * (measured by `scripts/health-connect-contract.sh`; the docs say "higher").
   */
  version: number;
  title: string;
  performedAt: Date;
  durationSeconds: number | null;
  /** Minutes east of Greenwich, as `completed_sessions.tzOffsetMin` stores it. */
  tzOffsetMin: number | null;
  sets: ExportSet[];
  /** Null for a workout. An outing is written as its own kind of session, without its sets. */
  outing: Locomotion | null;
  /** `leaguesM`: what the journal credited, measured or typed by the hero for this outing. */
  distanceM: number | null;
  /** The outing's fixes, only when this record carries its route; null otherwise. */
  route: readonly HealthRoutePoint[] | null;
};

/** Where and when, nothing else: no altitude, no speed, no accuracy. */
export type HealthRoutePoint = { t: number; lat: number; lon: number };

export type HealthSegment = { start: number; end: number; type: number; reps: number };

/** What `modules/bati-health` builds an `ExerciseSessionRecord` from. Times are epoch ms. */
export type HealthRecord = {
  id: string;
  version: number;
  /** `ExerciseSessionRecord.EXERCISE_TYPE_*`. */
  exerciseType: number;
  title: string;
  notes: string | null;
  start: number;
  end: number;
  offsetMinutes: number;
  segments: HealthSegment[];
  /** A `DistanceRecord` over the same times, with its own client id, written and deleted with it. */
  distance: { id: string; meters: number } | null;
  route: HealthRoutePoint[] | null;
};

export type NotesFormat = {
  figure(type: QuestTargetType, value: number): string;
  line(name: string, figures: string[]): string;
};

// `ExerciseSegment.EXERCISE_SEGMENT_TYPE_*`, connect-client 1.1.0. Each one below is accepted inside
// an `EXERCISE_TYPE_CALISTHENICS` session (`EXERCISE_SEGMENTS`, or universal for STRETCHING).
const BACK_EXTENSION = 2;
const BURPEE = 9;
const CRUNCH = 10;
const JUMPING_JACK = 27;
const LEG_RAISE = 35;
const LUNGE = 36;
const MOUNTAIN_CLIMBER = 37;
const PLANK = 41;
const PULL_UP = 42;
const SQUAT = 51;
const STRETCHING = 54;

// `ExerciseSessionRecord.EXERCISE_TYPE_*`, connect-client 1.1.0 (read from the jar).
export const EXERCISE_TYPE = { workout: 13, walk: 79, run: 56, ride: 8 } as const satisfies Record<
  Locomotion | "workout",
  number
>;

/**
 * Seed movement → Health Connect segment type, only where the type names the same movement.
 * Everything else (push-ups, dips, the squat and lunge variants, the holds Health Connect has no
 * word for) goes to the notes with its reps: a wrong type would put wrong numbers in another app.
 * The table in the W-04 PR lists both halves.
 */
export const SEGMENT_FOR: Readonly<Record<string, number>> = {
  Squat: SQUAT,
  Lunge: LUNGE,
  "Pull-ups": PULL_UP,
  "Chin-Up": PULL_UP,
  Plank: PLANK,
  "Side Plank": PLANK,
  Crunch: CRUNCH,
  "Bicycle Crunch": CRUNCH,
  "Reverse Crunch": CRUNCH,
  Burpee: BURPEE,
  "Mountain Climber": MOUNTAIN_CLIMBER,
  "Jumping Jack": JUMPING_JACK,
  "Hanging Leg Raise": LEG_RAISE,
  Superman: BACK_EXTENSION,
  "Superman W": BACK_EXTENSION,
  "Cobra Stretch": STRETCHING,
  "Cat-Cow": STRETCHING,
  "Thread the Needle": STRETCHING,
  "Standing Forward Fold": STRETCHING,
  "Downward Dog": STRETCHING,
  "Pigeon Pose": STRETCHING,
  "World's Greatest Stretch": STRETCHING,
};

/** The client record id: stable for the session's whole life, whichever phone holds it. */
export function healthRecordId(sessionUuid: string): string {
  return `bati-${sessionUuid}`;
}

/** The outing's distance record: derived from the session's id, so it follows it. */
export function distanceRecordId(sessionUuid: string): string {
  return `${healthRecordId(sessionUuid)}-distance`;
}

/** Every client id an entry can own in Health Connect, for taking it back. */
export function healthRecordIds(sessionUuid: string): string[] {
  return [healthRecordId(sessionUuid), distanceRecordId(sessionUuid)];
}

function segmentType(set: ExportSet): number | undefined {
  return set.seed ? SEGMENT_FOR[set.enName] : undefined;
}

/**
 * The session as one Health Connect exercise session.
 *
 * Each set fills the time since the set before it, a hold only its own seconds. Health Connect
 * refuses a whole record whose segments overlap or leave the session, so a set whose stamps give it
 * no room of its own goes to the notes instead of being bent into place.
 */
export function toHealthRecord(session: ExportSession, format: NotesFormat): HealthRecord {
  return session.outing === null
    ? workoutRecord(session, format)
    : outingRecord(session, session.outing);
}

/**
 * An outing: one walking, running or biking session at its real times, its distance as a record of
 * its own, and its route only when the hero asked for it. No segments (its one "set" is the outing
 * itself), no notes.
 */
function outingRecord(session: ExportSession, outing: Locomotion): HealthRecord {
  const start = session.performedAt.getTime();
  const end = Math.max(start + (session.durationSeconds ?? 0) * 1000, start + 1000);
  const meters = session.distanceM ?? 0;
  // Health Connect refuses a route point outside the session.
  const route = session.route
    ?.filter((p) => p.t >= start && p.t < end)
    .map(({ t, lat, lon }) => ({ t, lat, lon }));
  return {
    id: healthRecordId(session.uuid),
    version: session.version,
    exerciseType: EXERCISE_TYPE[outing],
    title: session.title,
    notes: null,
    start,
    end,
    offsetMinutes: session.tzOffsetMin ?? 0,
    segments: [],
    distance: meters > 0 ? { id: distanceRecordId(session.uuid), meters } : null,
    route: route && route.length > 0 ? route : null,
  };
}

function workoutRecord(session: ExportSession, format: NotesFormat): HealthRecord {
  const start = session.performedAt.getTime();
  const sets = [...session.sets].sort((a, b) => a.at.getTime() - b.at.getTime());
  const lastSet = sets.at(-1)?.at.getTime() ?? start;
  const end = Math.max(start + (session.durationSeconds ?? 0) * 1000, lastSet, start + 1000);

  const segments: HealthSegment[] = [];
  const noted: ExportSet[] = [];
  let boundary = start;
  for (const set of sets) {
    const setEnd = Math.min(set.at.getTime(), end);
    const done = set.value * set.sides;
    const segStart = set.type === "time" ? Math.max(boundary, setEnd - done * 1000) : boundary;
    const type = segmentType(set);
    if (type !== undefined && segStart < setEnd) {
      segments.push({ start: segStart, end: setEnd, type, reps: set.type === "reps" ? done : 0 });
    } else {
      noted.push(set);
    }
    boundary = Math.max(boundary, setEnd);
  }

  return {
    id: healthRecordId(session.uuid),
    version: session.version,
    exerciseType: EXERCISE_TYPE.workout,
    title: session.title,
    notes: notesFor(noted, format),
    start,
    end,
    offsetMinutes: session.tzOffsetMin ?? 0,
    segments,
    distance: null,
    route: null,
  };
}

/** One line per movement, in the order the hero met them: "Pompes : 12, 10". */
function notesFor(sets: ExportSet[], format: NotesFormat): string | null {
  const byName = new Map<string, string[]>();
  for (const set of sets) {
    const figures = byName.get(set.name) ?? [];
    figures.push(format.figure(set.type, set.value * set.sides));
    byName.set(set.name, figures);
  }
  if (byName.size === 0) return null;
  return [...byName].map(([name, figures]) => format.line(name, figures)).join("\n");
}
