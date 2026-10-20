import { addSeconds, subDays } from "date-fns";
import { and, desc, eq, gte, isNotNull, ne, or, sql } from "drizzle-orm";
import { reportError } from "@/src/reportError";
import { checkForNewAchievements } from "./achievements";
import { db, schema } from "./client";
import { addBonusXpToSession, createCompletedSession, nextEditStamp } from "./completed";
import { dayKey } from "./dates";
import {
  checkHandDistance,
  checkHandEntry,
  HAND_MAX_DAYS_BACK,
  type HandContext,
  type HandEntryDraft,
  type HandKind,
  type HandRefusal,
  type MeasuredSpan,
  takesHandDistance,
} from "./handEntryRules";
import { checkOathFulfilled, OATH_XP_BONUS } from "./oaths";
import type { Locomotion } from "./schema";
import { calculateAndCacheStreak, invalidateStreakInfo } from "./streaks";
import { HAND_ENTRY_XP } from "./xp";

const { completedQuest } = schema;

/**
 * Writing a session down, correcting it, typing the distance of an outing that had no GPS.
 *
 * One writer for the rows `byHand` marks (`createCompletedSession` stays the only function that
 * inserts a session), and one `afterHandWrite` for what must follow every one of them, so the
 * flame, the oath, the widgets and the reminder cannot disagree about which writes happened.
 */

export const HAND_LABEL_MAX = 40;

export type HandInput = {
  kind: HandKind;
  endedAt: Date;
  durationSeconds: number;
  /** Metres, an outing's only. A workout keeps none. */
  distanceM?: number | null;
  /** The name of a workout ("gym"). An outing keeps none. */
  label?: string | null;
};

export type HandResult =
  | { ok: true; id: number; xp: number; flameActive: boolean; oathKept: boolean }
  | { ok: false; refusal: HandRefusal };

/** The rule, over the journal as it stands: `ignoreId` is the entry being corrected. */
export async function loadHandContext(ignoreId: number | null, now: Date): Promise<HandContext> {
  const since = subDays(now, HAND_MAX_DAYS_BACK + 2);
  const [hands, rows] = await Promise.all([
    db
      .select({ performedAt: completedQuest.performedAt })
      .from(completedQuest)
      .where(
        and(
          eq(completedQuest.byHand, "session"),
          ignoreId === null ? undefined : ne(completedQuest.id, ignoreId),
        ),
      ),
    db
      .select({
        id: completedQuest.id,
        performedAt: completedQuest.performedAt,
        durationSeconds: completedQuest.durationSeconds,
        questId: completedQuest.questId,
        outing: completedQuest.outing,
      })
      .from(completedQuest)
      .where(
        and(
          gte(completedQuest.performedAt, since),
          or(sql`${completedQuest.byHand} IS NULL`, eq(completedQuest.byHand, "distance")),
          isNotNull(completedQuest.durationSeconds),
        ),
      ),
  ]);
  const measured: MeasuredSpan[] = rows.map((r) => ({
    id: r.id,
    startedAt: r.performedAt,
    endedAt: addSeconds(r.performedAt, r.durationSeconds ?? 0),
    questId: r.questId,
    outing: r.outing,
  }));
  return { handDays: new Set(hands.map((h) => dayKey(h.performedAt))), measured };
}

/** The name as stored: a workout's, trimmed and capped, or null. An outing keeps none. */
function labelOf(input: HandInput): string | null {
  const label =
    input.kind === "workout" ? (input.label?.trim().slice(0, HAND_LABEL_MAX) ?? "") : "";
  return label === "" ? null : label;
}

function draftOf(input: HandInput): HandEntryDraft {
  return {
    kind: input.kind,
    endedAt: input.endedAt,
    durationSeconds: Math.round(input.durationSeconds),
    distanceM:
      input.kind === "workout" || !input.distanceM || input.distanceM <= 0
        ? null
        : Math.round(input.distanceM),
  };
}

/** The refusal the sheet shows before anything is written; null when the entry would be taken. */
export async function refusalFor(
  input: HandInput,
  ignoreId: number | null = null,
  now: Date = new Date(),
): Promise<HandRefusal | null> {
  return checkHandEntry(draftOf(input), await loadHandContext(ignoreId, now), now);
}

/**
 * What follows every write: the flame recounted, the oath looked at, the widgets and the reminder
 * told. The oath's XP is paid onto the row that tipped it, whichever write that was.
 */
async function afterHandWrite(sessionId: number) {
  invalidateStreakInfo();
  const streak = await calculateAndCacheStreak();
  let oathKept = false;
  let bonusXp = 0;
  const fulfilled = await checkOathFulfilled((tx) => {
    bonusXp = OATH_XP_BONUS;
    return addBonusXpToSession(sessionId, OATH_XP_BONUS, tx);
  });
  oathKept = fulfilled !== null;

  // The badges of XP and flame follow on their own; the ones of count, hour and length read the
  // session handed in, so it is handed in as a lunchtime nothing (a hand entry unlocks none).
  const noon = new Date();
  noon.setHours(12, 0, 0, 0);
  await checkForNewAchievements({
    durationSeconds: 0,
    xpEarned: 0,
    performedAt: noon,
    questId: null,
    outing: null,
  }).catch((e: unknown) => reportError("handEntry.achievements", e));

  // Required on use: both reach the router and the native modules, and neither is wanted by a
  // caller that only writes (the tests, the headless widget).
  try {
    const { requestWidgetsUpdate } = require("@/src/widget") as typeof import("@/src/widget");
    const { replanRemindersNow } = require("@/src/reminders") as typeof import("@/src/reminders");
    await Promise.all([requestWidgetsUpdate(), replanRemindersNow()]);
  } catch (e) {
    reportError("handEntry.afterWrite", e);
  }
  return { flameActive: streak.isActive, oathKept, bonusXp };
}

export async function createHandEntry(
  input: HandInput,
  now: Date = new Date(),
): Promise<HandResult> {
  const draft = draftOf(input);
  const refusal = checkHandEntry(draft, await loadHandContext(null, now), now);
  if (refusal) return { ok: false, refusal };

  const endedAt = draft.endedAt > now ? now : draft.endedAt;
  const id = await createCompletedSession({
    byHand: "session",
    outing: input.kind === "workout" ? null : input.kind,
    leaguesM: draft.distanceM,
    label: labelOf(input),
    durationSeconds: draft.durationSeconds,
    xpEarned: HAND_ENTRY_XP,
    performedAt: addSeconds(endedAt, -draft.durationSeconds),
    exercises: [],
  });
  const after = await afterHandWrite(id);
  return {
    ok: true,
    id,
    xp: HAND_ENTRY_XP + after.bonusXp,
    flameActive: after.flameActive,
    oathKept: after.oathKept,
  };
}

/** Everything but the XP can change: the day, the duration, the name, the type, the distance. */
export async function correctHandEntry(
  id: number,
  input: HandInput,
  now: Date = new Date(),
): Promise<HandResult> {
  const [current] = await db
    .select({ byHand: completedQuest.byHand, xpEarned: completedQuest.xpEarned })
    .from(completedQuest)
    .where(eq(completedQuest.id, id))
    .limit(1);
  if (current?.byHand !== "session")
    throw new Error("Only a session written down can be corrected");

  const draft = draftOf(input);
  const refusal = checkHandEntry(draft, await loadHandContext(id, now), now);
  if (refusal) return { ok: false, refusal };

  const endedAt = draft.endedAt > now ? now : draft.endedAt;
  const performedAt = addSeconds(endedAt, -draft.durationSeconds);
  // `xpEarned` is not here, on purpose: the oath bonus sits on the same row, and sync keeps the
  // larger XP of a row, so a lower one could not travel.
  await db
    .update(completedQuest)
    .set({
      outing: input.kind === "workout" ? null : input.kind,
      leaguesM: draft.distanceM,
      label: labelOf(input),
      durationSeconds: draft.durationSeconds,
      performedAt,
      tzOffsetMin: 0 - performedAt.getTimezoneOffset(),
      byHandEditedAt: nextEditStamp(completedQuest.byHandEditedAt),
    })
    .where(eq(completedQuest.id, id));
  const after = await afterHandWrite(id);
  return {
    ok: true,
    id,
    xp: current.xpEarned + after.bonusXp,
    flameActive: after.flameActive,
    oathKept: after.oathKept,
  };
}

/**
 * Type the distance of an outing Bati did not measure (`'distance'`), or take it back (null). The
 * XP stays: it is paid on the time, and the sentence on screen says so.
 */
export async function setHandDistance(id: number, distanceM: number | null): Promise<HandResult> {
  const [row] = await db
    .select({
      outing: completedQuest.outing,
      byHand: completedQuest.byHand,
      durationSeconds: completedQuest.durationSeconds,
      movingSeconds: completedQuest.movingSeconds,
      leaguesM: completedQuest.leaguesM,
      xpEarned: completedQuest.xpEarned,
    })
    .from(completedQuest)
    .where(eq(completedQuest.id, id))
    .limit(1);
  if (!row?.outing || !takesHandDistance(row)) {
    throw new Error("Only an outing with no trace can be given a distance");
  }
  const metres = distanceM === null || distanceM <= 0 ? null : Math.round(distanceM);
  const refusal =
    metres === null ? null : checkHandDistance(row.outing, row.durationSeconds ?? 0, metres);
  if (refusal) return { ok: false, refusal };
  await db
    .update(completedQuest)
    .set({
      leaguesM: metres,
      byHand: metres === null ? null : "distance",
      byHandEditedAt: nextEditStamp(completedQuest.byHandEditedAt),
    })
    .where(eq(completedQuest.id, id));
  const after = await afterHandWrite(id);
  return {
    ok: true,
    id,
    xp: row.xpEarned + after.bonusXp,
    flameActive: after.flameActive,
    oathKept: after.oathKept,
  };
}

/** What the sheet opens on: the last entry's type, duration and name. */
export type HandDefaults = {
  kind: HandKind;
  durationSeconds: number | null;
  label: string | null;
};

export async function getHandDefaults(): Promise<HandDefaults> {
  const [last] = await db
    .select({
      outing: completedQuest.outing,
      durationSeconds: completedQuest.durationSeconds,
      label: completedQuest.label,
    })
    .from(completedQuest)
    .where(eq(completedQuest.byHand, "session"))
    .orderBy(desc(completedQuest.performedAt), desc(completedQuest.id))
    .limit(1);
  return {
    kind: (last?.outing as Locomotion | null | undefined) ?? "workout",
    durationSeconds: last?.durationSeconds ?? null,
    label: last?.label ?? null,
  };
}

/** How many entries written down fall in the flame's trailing week, for the Stats' bracket. */
export async function countHandEntriesSince(since: Date): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(completedQuest)
    .where(and(eq(completedQuest.byHand, "session"), gte(completedQuest.performedAt, since)));
  return Number(row?.n ?? 0);
}
