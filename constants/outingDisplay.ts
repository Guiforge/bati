import type { Locomotion } from "@/db/schema";
import { reportError } from "@/src/reportError";

/**
 * What the hero reads on the live outing panel, per activity: which figure is big, which three are
 * small, and whether the map or big numbers take the screen. The model only: the figures
 * themselves are `src/gps/liveFigures.ts`, the screen is `app/outing-display.tsx`.
 *
 * Stored as a sparse JSON blob in `user_preferences.outingDisplay`: only what the hero changed, so
 * a device that never opened the screen has no row and two such devices are level in a sync. The
 * screen-on choice is not here, it is the phone's (`src/outingKeepAwake.ts`).
 */

export const OUTING_METRICS = [
  "time",
  "distance",
  "rate",
  "rateAvg",
  "climb",
  "remaining",
] as const;
export type OutingMetric = (typeof OUTING_METRICS)[number];
/** `auto` in the big place: distance for a distance goal, else time. In a small place: the other one. */
export type Place = OutingMetric | "auto";
export const OUTING_LAYOUTS = ["map", "bigFigures"] as const;
export type OutingLayout = (typeof OUTING_LAYOUTS)[number];
export type SmallPlaces = [Place | null, Place | null, Place | null];
export type OutingView = { big: Place; small: SmallPlaces; layout: OutingLayout };
/** What is stored: only what the hero changed. An absent activity or field is the default. */
export type OutingDisplay = Partial<Record<Locomotion, Partial<OutingView>>>;

export const OUTING_ACTIVITIES = ["walk", "run", "ride"] as const satisfies readonly Locomotion[];

/** Today's panel exactly: big by goal, then the other of time/distance, climb, rate. */
export const DEFAULT_VIEW: OutingView = {
  big: "auto",
  small: ["auto", "climb", "rate"],
  layout: "map",
};

const isMetric = (v: unknown): v is OutingMetric =>
  typeof v === "string" && (OUTING_METRICS as readonly string[]).includes(v);
const isPlace = (v: unknown): v is Place => v === "auto" || isMetric(v);
const isLayout = (v: unknown): v is OutingLayout =>
  typeof v === "string" && (OUTING_LAYOUTS as readonly string[]).includes(v);

const sameSmall = (a: SmallPlaces, b: SmallPlaces) => a.every((p, i) => p === b[i]);

/** The view of one activity with the defaults filled in. */
export function viewOf(display: OutingDisplay, locomotion: Locomotion): OutingView {
  const own = display[locomotion];
  return {
    big: own?.big ?? DEFAULT_VIEW.big,
    small: own?.small ? [...own.small] : [...DEFAULT_VIEW.small],
    layout: own?.layout ?? DEFAULT_VIEW.layout,
  };
}

/** One stored entry, field by field; whatever is unknown reads as the default and is dropped. */
function parseEntry(raw: unknown): Partial<OutingView> {
  if (typeof raw !== "object" || raw === null) return {};
  const entry = raw as { big?: unknown; small?: unknown; layout?: unknown };
  const out: Partial<OutingView> = {};
  const { big, small, layout } = entry;
  if (isPlace(big)) out.big = big;
  if (Array.isArray(small)) {
    out.small = [0, 1, 2].map((i) => {
      const v: unknown = small[i];
      return v === null || isPlace(v) ? v : (DEFAULT_VIEW.small[i] ?? null);
    }) as SmallPlaces;
  }
  if (isLayout(layout)) out.layout = layout;
  return out;
}

/** The validated read of the stored blob. Never throws: a bad blob reads as "nothing changed". */
export function parseOutingDisplay(raw: string | null): OutingDisplay {
  if (raw === null) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    reportError("preferences.outingDisplay.parse", error);
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  const out: OutingDisplay = {};
  for (const key of OUTING_ACTIVITIES) {
    if (key in parsed) out[key] = parseEntry((parsed as Record<string, unknown>)[key]);
  }
  return out;
}

/**
 * The blob with one activity changed. `null` is the reset: the activity goes. Fields equal to the
 * default are dropped too, and an activity left empty with them, so choosing the original again
 * reads as "As shipped". The blob becomes `{}` when no activity is left and the key is never
 * deleted: a missing row reads as the other device being newer (`db/merge.ts`).
 */
export function withActivity(
  display: OutingDisplay,
  locomotion: Locomotion,
  patch: Partial<OutingView> | null,
): OutingDisplay {
  const { [locomotion]: _gone, ...rest } = display;
  if (patch === null) return rest;
  const merged = { ...display[locomotion], ...patch };
  const entry: Partial<OutingView> = {};
  if (merged.big !== undefined && merged.big !== DEFAULT_VIEW.big) entry.big = merged.big;
  if (merged.small !== undefined && !sameSmall(merged.small, DEFAULT_VIEW.small)) {
    entry.small = merged.small;
  }
  if (merged.layout !== undefined && merged.layout !== DEFAULT_VIEW.layout) {
    entry.layout = merged.layout;
  }
  const next: OutingDisplay =
    Object.keys(entry).length === 0 ? rest : { ...rest, [locomotion]: entry };
  // Canonical key order, so the same content always serializes the same (setOutingDisplay compares text).
  const out: OutingDisplay = {};
  for (const l of OUTING_ACTIVITIES) {
    const e = next[l];
    if (e) out[l] = e;
  }
  return out;
}

/** What the Settings row calls "Customised": a stored change for any activity, or a screen kept on. */
export function isOutingDisplayCustomised(
  display: OutingDisplay,
  keepAwake: readonly Locomotion[],
): boolean {
  return Object.keys(display).length > 0 || keepAwake.length > 0;
}
