import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { buildWarmup, type WarmupStep } from "@/constants/warmup";
import { completeAdventureRunStep, getAdventureIdForRunStep } from "@/db";
import { checkForNewAchievements, type NewAchievementResult } from "@/db/achievements";
import {
  type BossFight,
  computeDamage,
  type DamageResult,
  finishBossFight,
  getOrCreateBossFight,
  type PendingHit,
  persistSessionDamage,
  TRIUMPH_XP_BONUS,
} from "@/db/bossFights";
import {
  addBonusXpToSession,
  type CompletedExerciseInput,
  createCompletedSession,
  getSessionAggregates,
  markSessionWithNewRecords,
} from "@/db/completed";
import { estimateQuestSeconds } from "@/db/estimate";
import { checkForNewRungs, type Exercise, type VariationStep } from "@/db/exercises";
import { isMountedOuting, isOutingSession } from "@/db/expeditions";
import { deletePoints } from "@/db/gps";
import { checkOathFulfilled, OATH_XP_BONUS, type OathProgress } from "@/db/oaths";
import { checkForNewRecords, type NewRecordResult } from "@/db/personalRecords";
import type { DistanceUnit } from "@/db/preferences";
import { preferences } from "@/db/preferences";
import { clearShortLivedQueries } from "@/db/queryCache";
import { invalidateQuestTemplates, isDailyQuest, type Quest } from "@/db/quests";
import type {
  DifficultyCode,
  ExerciseStyle,
  FeedbackCode,
  MuscleCode,
  QuestTargetType,
} from "@/db/schema";
import { updateStreakAfterSession } from "@/db/streaks";
import type { Target } from "@/db/targets";
import { REST_RANGE, retargetForMovement, targetRangeFor } from "@/db/targets";
import { calculateLevelFromXp, getTotalXp } from "@/db/userLevel";
import { uuidv7 } from "@/db/uuid";
import {
  diffVillageGrowth,
  diffVillageTier,
  getVillageBuildings,
  type VillageGrowth,
  type VillageTierUp,
} from "@/db/village";
import { NON_REP_STYLE } from "@/db/workUnits";
import { computeSessionXp, MAX_SESSION_XP, type XpSet } from "@/db/xp";
import { i18n } from "@/i18n";
import type { StartOptions } from "@/modules/bati-location";
import type { OutingGoal } from "@/src/gps/track";
import { credited } from "@/src/gps/track";
import { resolveAppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { requestWidgetsUpdate } from "@/src/widget";
import { isExpedition, useExpeditionStore } from "@/stores/expedition";

export type SessionStatus =
  | "idle"
  | "warmup"
  | "countdown"
  | "running"
  | "resting"
  | "paused"
  | "finished";

const PRE_START_COUNTDOWN_SECONDS = 3;

/**
 * How much standing still an outing may still count as being out for.
 *
 * A walk has red lights, a gate, a conversation. Twenty minutes of them is generous and still
 * finite, so a session left open on the sofa stops accruing a journal duration long before it
 * takes the "longest session" record. XP is bounded separately and more tightly, by moving
 * seconds alone.
 */
const OUTING_STOPPAGE_ALLOWANCE_SECONDS = 20 * 60;

/**
 * How long a walk with no witness at all may claim to have lasted.
 *
 * No fix ever locked, so nothing but the hero's word says this happened: a refused permission, a
 * phone under trees, a receiver that never saw the sky. The word is taken. This is a solo app and
 * nobody cheats themselves, so the bound is not there to catch a liar, it is there so a phone left
 * on a table overnight does not journal nine hours, take the "longest session" record and unlock
 * two achievements on the way past. A quest bounds the same case against its own estimate; an
 * outing has no estimate worth bounding against, which is the whole reason this constant exists.
 */
const UNWITNESSED_OUTING_MAX_SECONDS = 4 * 3600;

/**
 * The ceiling on one outing's recorded seconds, which is a walk's rather than a hold's.
 *
 * `TIME_TARGET_MAX` is an hour, and it is right for the thing it was written for: nobody planks
 * for an hour, and a set that claims to would be a typo or a phone left face-up. Applied to an
 * expedition it silently halved a two-hour ride, and XP is paid on what is recorded, so the
 * longest outings were the worst paid. Nothing else is at risk from a large number here: an
 * expedition converts to zero work units (`db/workUnits.ts`), so muscle volume, boss damage and
 * the village cannot be inflated by it, and the "longest outing" record counts metres. Twelve
 * hours is past any outing a person walks back from, and still short of a forgotten phone.
 */
const OUTING_RESULT_MAX_SECONDS = 12 * 3600;

/**
 * What one set may claim.
 *
 * The database only demands `> 0`, so an absurd value used to flow straight into muscle volume,
 * the village's building levels, the journal's balance card and the personal records — none of
 * which `MAX_SESSION_XP` covers, because that caps XP and nothing else. Clamped here, where the
 * `max(1, ...)` guard the DB constraints already required lives, so every consumer of a result is
 * bounded by construction rather than by each caller remembering.
 */
function clampResultValue(
  resultValue: number,
  type: QuestTargetType,
  style?: ExerciseStyle,
): number {
  if (!Number.isFinite(resultValue)) return 1;

  // Bounded by what the movement is, not only by what it counts: an hour is the ceiling of a
  // hold, and a walk is not a hold. See `OUTING_RESULT_MAX_SECONDS`.
  const ceiling =
    style === NON_REP_STYLE && type === "time"
      ? OUTING_RESULT_MAX_SECONDS
      : targetRangeFor(type).max;
  return Math.min(ceiling, Math.max(1, Math.floor(resultValue)));
}

interface SessionState {
  // Static Data
  quest: Quest | null;
  userLevel: DifficultyCode;
  adventureRunStepId: number | null;

  // Boss Fight Data
  bossFight: BossFight | null;
  lastDamageResult: DamageResult | null;
  /**
   * Hits landed this session, not yet in the database.
   *
   * Damage used to be written the instant an exercise was completed, which made the boss's HP
   * a fact before the session that caused it existed. Two things fell out of that: replaying a
   * round re-applied damage the hero had already dealt, and quitting before the victory screen
   * kept the damage with no session to account for it — a boss could be worn down by starting
   * and abandoning sessions. Hits are accumulated here and persisted once, in `saveSession`,
   * where they can also be tagged with the session that earned them.
   */
  pendingDamage: PendingHit[];
  /**
   * The boss's HP when this session began. A boss is a campaign-length pool — seeded so it falls
   * on the campaign's last step — so a single session takes off ~1/steps of it, and a bar drawn
   * against `totalHp` alone looks untouched for the whole workout. This is what the arena
   * measures today's damage against.
   */
  bossStartHp: number | null;
  /**
   * Whether *this* save felled the boss with the final blow — the campaign ended and whatever HP
   * survived the last step fell with it — rather than the pacing draining it to zero. The victory
   * screen narrates the difference: "defeated at 300 HP" is the design, and it should read as the
   * killing stroke it is, not as a bug.
   */
  felledByFinalBlow: boolean;

  // Dynamic State
  status: SessionStatus;
  prePauseStatus: SessionStatus | null;
  /**
   * The warm-up this quest gets, built once at `startSession` from what it is about to load
   * (`buildWarmup`). Held in state rather than recomputed per render so the sequence cannot
   * change under the hero mid-warm-up.
   */
  warmupSequence: WarmupStep[];
  /** Index into `warmupSequence` while `status === "warmup"`. */
  warmupIndex: number;
  currentRoundIndex: number; // 0-based
  currentExerciseIndex: number; // 0-based

  // Timing
  startTime: number | null; // Date.now() when session started
  totalPausedTime: number; // Accumulator for pause duration
  lastPauseTimestamp: number | null; // Date.now() when pause started
  /**
   * Rest actually taken between sets, in seconds — banked when the rest screen is left.
   *
   * XP is paid for effort, and the ceiling that bounds a session's claimed effort is the window
   * in which effort could have happened. Rest is not that window: leaving it in would let a hero
   * camp the rest screen to inflate the very ceiling fabricated results then fill, which is the
   * original bug wearing a different hat.
   *
   * Measured, never prescribed. Subtracting the configured rest instead would push a hero who
   * skips their rests below their own effort and floor them for training harder.
   */
  restTakenSeconds: number;

  // Active Timer (for Time-based exercises or Rest)
  timerStartTimestamp: number | null; // Date.now() when current timer started
  timerDuration: number; // Target duration in seconds

  // Results Accumulator
  results: CompletedExerciseInput[];
  /**
   * Whether the set just left behind was skipped rather than logged.
   *
   * A skipped set writes no row, so `results[results.length - 1]` is a set from an earlier round —
   * and the rest screen's "adjust the last one" stepper edits exactly that. Without this flag it
   * would silently correct a set the hero is not looking at.
   */
  lastSetSkipped: boolean;

  /**
   * The row `saveSession` created, once it has. Held so a retry after a partial failure
   * resumes that session instead of banking a second one.
   */
  /**
   * The name this session has from its first second, before anything is written.
   *
   * `createCompletedSession` used to mint it at save time, which is fine until something has to
   * refer to a session that has not ended: an expedition writes a GPS point every second, and
   * `gps_points.sessionId` is this. In `SavedSessionState` too, so a resumed session keeps the
   * name its points were filed under — the Pick makes forgetting that a compile error.
   */
  sessionUuid: string | null;
  /**
   * The distance the hero set out to cover, when they chose one on the quest screen.
   *
   * In state, and in `SavedSessionState`, for one reason: a session resumed after the OS killed
   * the app restarts its tracking, and a goal held only in `startSession`'s arguments would have
   * come back as "whatever the slots add up to" — a walk that buzzes at the wrong distance, or
   * never.
   *
   * It holds the goal itself rather than the metres it might be built from, and that is the whole
   * of "free outing": `null` here *is* a hero who set out without a number, an answer the type
   * carries everywhere it goes. Written first as a metre count beside a `free` boolean, which was
   * two notions and a function to reconcile them for one idea, in the one store whose state has
   * to survive being rebuilt from disk.
   */
  goal: OutingGoal | null;
  savedSessionId: number | null;
  /**
   * Whether this session already paid the Triumph bonus.
   *
   * Not derivable from the boss: by the time the bonus is paid the pool is already empty in the
   * database, so a retry re-reading the fight sees exactly what the first pass saw and pays again.
   * The only fact that distinguishes them is this one, and it lives beside `savedSessionId`
   * because it answers the same question about a different write.
   */
  triumphBonusPaid: boolean;

  // Actions
  startSession: (
    quest: Quest,
    userLevel: DifficultyCode,
    options?: {
      adventureRunStepId?: number | null;
      adventureId?: number | null;
      /**
       * What the hero set out to do, or `null` for a walk with no number on it.
       *
       * Derived by the caller, not here: the prepared door reads the config it has just let the
       * hero edit (`outingGoal(quest, config.distanceM)`), and the quick door passes `null`
       * because that is the whole of what it means. Absent means `null` too, which is right for
       * every workout indoors and is the one thing to remember when a third door is written.
       */
      goal?: OutingGoal | null;
    },
  ) => Promise<void>;
  nextWarmupStep: () => void;
  previousWarmupStep: () => void;
  skipWarmup: () => void;
  finishCountdown: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  restartRound: () => void;
  quitSession: () => void;

  // Progression
  completeExercise: (resultValue: number) => void;
  /** Ends an outing from outside any view. See the implementation for why it exists. */
  completeOuting: () => void;
  skipExercise: () => void;
  swapCurrentExercise: (exercise: Exercise) => void;
  updateLastResult: (resultValue: number) => void;
  skipRest: () => void;
  addRestTime: (seconds: number) => void;

  // DB
  saveSession: (feedback?: FeedbackCode | null) => Promise<{
    sessionId: number;
    xpEarned: number;
    dailyBonusApplied: boolean;
    newRecords: NewRecordResult[];
    newRungs: VariationStep[];
    newAchievements: NewAchievementResult[];
    fulfilledOath: OathProgress | null;
    oathBonusXp: number;
    /** Of `xpEarned`, how much came from beating targets rather than meeting them. */
    overshootXp: number;
    campaign: {
      adventureId: number;
      runId: number;
      isFinished: boolean;
      nextRunStepId: number | null;
      nextQuestId: number | null;
    } | null;
    levelUp: { oldLevel: number; newLevel: number } | null;
    /** Total XP around the save, so the victory screen can animate the hero's level bar. */
    heroXp: { before: number; after: number };
    tierUp: VillageTierUp | null;
    villageGrowth: VillageGrowth[];
  }>;
}

/**
 * The crash-recovery snapshot: every piece of session state that has to survive the app dying,
 * and nothing else.
 *
 * Derived from `SessionState` rather than written out a second time, because it was written out
 * a second time and the two copies drifted — the writer forgot `warmupIndex`, the reader's type
 * demanded it, and neither ever carried `warmupSequence`, which left a recovered warm-up
 * rendering an empty screen. Adding a field to `SessionState` and persisting it is now one list:
 * name it here and both sides fail to compile until they agree.
 */
export type SavedSessionState = Pick<
  SessionState,
  | "quest"
  | "userLevel"
  | "adventureRunStepId"
  | "bossFight"
  | "bossStartHp"
  | "pendingDamage"
  | "lastDamageResult"
  | "status"
  | "prePauseStatus"
  | "warmupSequence"
  | "warmupIndex"
  | "currentRoundIndex"
  | "currentExerciseIndex"
  | "startTime"
  | "totalPausedTime"
  | "restTakenSeconds"
  | "timerStartTimestamp"
  | "timerDuration"
  | "results"
  | "lastSetSkipped"
  | "sessionUuid"
  | "goal"
> & { savedAt: number };

/**
 * Where a session goes once a set is behind it: finished, resting, or straight into the next
 * movement.
 *
 * Shared by `completeExercise` and `skipExercise`, which differ only in whether the set left a
 * result behind. The advance itself is identical, and two copies of it would drift — the rest
 * choice alone carries the `??` that separates "no rest screen between rounds" from "fall back to
 * restSeconds".
 */
function advanceAfterSet(
  quest: Quest,
  currentRoundIndex: number,
  currentExerciseIndex: number,
  results: CompletedExerciseInput[],
): Partial<SessionState> {
  const isLastExerciseInRound = currentExerciseIndex === quest.exercises.length - 1;
  const isLastRound = currentRoundIndex === quest.rounds - 1;

  if (isLastExerciseInRound && isLastRound) {
    return { status: "finished", results, timerStartTimestamp: null, timerDuration: 0 };
  }

  const nextRound = isLastExerciseInRound ? currentRoundIndex + 1 : currentRoundIndex;
  const nextExercise = isLastExerciseInRound ? 0 : currentExerciseIndex + 1;

  // The last exercise of a round means the round is over — the last-round case already returned
  // as "finished" above — so the longer round rest applies. `??`, not `||`: a round rest of 0
  // means "no rest screen between rounds", not "fall back to restSeconds".
  const restSeconds = isLastExerciseInRound
    ? (quest.roundRestSeconds ?? quest.restSeconds)
    : quest.restSeconds;

  // The indices point at the *next* movement either way, so the rest screen can say what is
  // coming up.
  if (restSeconds > 0) {
    return {
      status: "resting",
      results,
      currentRoundIndex: nextRound,
      currentExerciseIndex: nextExercise,
      timerStartTimestamp: Date.now(),
      timerDuration: restSeconds,
    };
  }

  const nextExDef = quest.exercises[nextExercise];
  const isNextTimeBased = nextExDef?.target.type === "time";

  return {
    status: "running",
    results,
    currentRoundIndex: nextRound,
    currentExerciseIndex: nextExercise,
    timerStartTimestamp: isNextTimeBased ? Date.now() : null,
    timerDuration: isNextTimeBased ? nextExDef.target.value : 0,
  };
}

/**
 * The session's results paired back with the movements that produced them.
 *
 * `sortOrder` is the slot index `completeExercise` recorded, so the join is exact even when a
 * quest repeats an exercise or a config swapped one out. A result whose slot has vanished is
 * dropped rather than guessed at — it cannot be priced without knowing what was asked.
 */
/**
 * What the reducer credited for this run, or null when the quest never left the walls.
 *
 * Read before `end()`, and read here rather than inline so `saveSession` keeps one shape for
 * both kinds of session. Two numbers come out of it and neither is a sum over `gps_points`:
 *
 * - `leaguesM` is what the road is paid in. The raw sum counts drift while the hero stood still
 *   and counts the length of a teleport the reducer broke the line at, so the village would grow
 *   by a number the recap never drew. See `db/gps.ts`.
 * - `movingSeconds` is what XP is paid in, and it is a witness a windowsill cannot fake: the
 *   auto-pause stops crediting the moment displacement does, so an outing can be paid for the
 *   time it actually took where a hold has to be clamped to its prescription.
 * - `elapsedSeconds` is how long the outing lasted, first fix to last. The session's own clock
 *   cannot answer that for a walk the OS killed: recovery banks the downtime as pause, so the
 *   clock reads the ten minutes since the hero pressed resume while the trace reads the whole
 *   hour. Both halves of `sessionClock` read the trace now. See `src/gps/track.ts`.
 */
function measureGround(quest: Quest | null): Ground {
  if (!isExpedition(quest)) return NO_GROUND;

  // Null from `credited` means the run had no witness at all - no fix ever locked - so the app
  // has no opinion and the clock decides, exactly as it does for a workout. See `src/gps/track`.
  return credited(useExpeditionStore.getState().track) ?? NO_GROUND;
}

const NO_GROUND: Ground = { leaguesM: null, movingSeconds: null, elapsedSeconds: null };

/** Null in every field when the quest never left the walls, or when no fix ever locked. */
type Ground = {
  leaguesM: number | null;
  movingSeconds: number | null;
  elapsedSeconds: number | null;
};

/**
 * How long this session may claim to have lasted, and how much of that could have been effort.
 *
 * Nothing pauses when the app goes to the background — there is no `AppState` listener in this
 * project — so a session left open overnight measures nine hours, takes the "longest session"
 * record and unlocks both long-session achievements. XP no longer reads the clock as a source,
 * but `checkForNewRecords` and `checkForNewAchievements` still do. Both numbers are therefore
 * bounded, and by different things:
 *
 * A workout is bounded by its own prescription — twice its estimate — and pays for the window
 * left once the rest it actually took comes out. Rest *taken*, not rest prescribed: subtracting
 * the prescription would floor an honest hero who skips their rests. Camping the rest screen
 * would otherwise raise the very ceiling that fabricated results then fill.
 *
 * An outing is bounded by its own witness instead. Twice the estimate is thirty minutes for a
 * default expedition, so a real hour on the road was filed as half of one and the hero's longest
 * walk could never reach their own journal. Its effort ceiling is moving seconds alone, so a run
 * left open on a bus keeps accruing neither.
 *
 * And an outing is *measured* by its witness too, both halves from the same reading: **a walk
 * lasted what its trace says it lasted**, first fix to last, capped by the moving time plus the
 * stops that moving time is allowed to hide. The session's clock is not consulted, because it
 * cannot answer for a walk the OS killed: `useSessionRecovery` banks the whole downtime as pause,
 * so a walk killed at 45 minutes and resumed for 10 measured ten minutes on the clock and 55 on
 * the trace — "Total 10:00" printed above "Moving 45:xx" on the victory screen, ten minutes
 * written to the journal for 5 km, and the effort ceiling reading the other half. One definition,
 * read twice.
 *
 * The two questions take two predicates, and that is the whole point of `isOutingSession` being
 * imported here. *Measuring* asks the generous one (`isExpedition`): a home-made "Walk 5 min +
 * push-ups" has outdoors in it, so its ground is measured. *Bounding the effort* asks the strict
 * one: five minutes of moving time is a ceiling the push-ups never agreed to, and it took ~70 %
 * of that quest's XP away with nothing on screen to explain it. A mixed quest keeps the clock
 * the walk gives it and the workout's own ceiling.
 *
 * ponytail: a real workout that genuinely runs past twice its estimate loses the surplus from its
 *           journal entry only; if anyone ever reports that, the fix is an AppState listener that
 *           banks background time as pause, not a bigger multiplier.
 */
function sessionClock({
  quest,
  ground,
  measuredSeconds,
  restTakenSeconds,
}: {
  quest: Quest;
  ground: Ground;
  measuredSeconds: number;
  restTakenSeconds: number;
}): { durationSeconds: number; effortCeilingSeconds: number } {
  const moving = ground.movingSeconds;
  const onTheRoad = ground.elapsedSeconds;
  const durationSeconds =
    moving !== null && onTheRoad !== null
      ? Math.min(onTheRoad, moving + OUTING_STOPPAGE_ALLOWANCE_SECONDS)
      : isOutingSession(quest)
        ? // No fix ever locked. A quest is bounded by twice its own estimate, which for an outing
          // is a suggestion nobody chose: it turned a 45-minute walk against a 15-minute slot into
          // half an hour. A walk with no witness keeps its clock, bounded by the forgotten phone.
          Math.min(measuredSeconds, UNWITNESSED_OUTING_MAX_SECONDS)
        : Math.min(measuredSeconds, estimateQuestSeconds(quest) * 2);

  if (moving !== null && isOutingSession(quest)) {
    return { durationSeconds, effortCeilingSeconds: moving };
  }

  return {
    durationSeconds,
    effortCeilingSeconds: Math.max(0, durationSeconds - restTakenSeconds),
  };
}

/**
 * What the journal is about to record for the session in progress.
 *
 * Exported so the victory screen shows the duration that gets written rather than the raw clock:
 * a walk of 12 moving minutes with 40 minutes of stops said 52 min on the victory screen and
 * 32 min in the journal, for the same session, on two consecutive screens. One rule, two readers.
 */
export function recordedDurationSeconds(): number {
  const { quest, startTime, totalPausedTime, restTakenSeconds } = useSessionStore.getState();
  if (!quest || !startTime) return 0;

  return sessionClock({
    quest,
    ground: measureGround(quest),
    measuredSeconds: Math.floor((Date.now() - startTime - totalPausedTime) / 1000),
    restTakenSeconds,
  }).durationSeconds;
}

function toXpSets(quest: Quest, results: CompletedExerciseInput[]): XpSet[] {
  return results.flatMap((r) => {
    const slot = quest.exercises[r.sortOrder];
    if (!slot) return [];

    // `r.pricing` before `slot.exercise`, for the same reason `r.target` comes before
    // `slot.target`: a slot can change mid-session now, and a set is priced by what it was, not
    // by what the slot became. Without this, swapping to a `hard` movement on the last round
    // re-prices every set already logged and inflates the whole workout.
    return [
      {
        exercise: r.pricing ?? slot.exercise,
        target: r.target ?? slot.target,
        result: r.result,
      },
    ];
  });
}

/**
 * The row for this save, created once however many times `saveSession` runs.
 *
 * `saveSession` is a dozen awaits long and is not one transaction, so a failure halfway through
 * leaves the session row written and the rest undone — and the victory screen offers a retry
 * button for exactly that case. Reusing the row the first attempt created is what stops the retry
 * banking the workout twice. Everything after it either recomputes from database state (streak,
 * records, achievements) or is a documented no-op once done (the oath bonus), so a second pass
 * settles rather than double-counting.
 *
 * ponytail: idempotent, not atomic. A partial save still leaves progression half-applied until
 *           the retry lands. Threading one transaction through ten db modules is the real fix,
 *           and a much larger one — do it if a half-saved session is ever seen in the wild.
 */
async function ensureSessionRow(
  input: Parameters<typeof createCompletedSession>[0],
): Promise<number> {
  const existing = useSessionStore.getState().savedSessionId;
  if (existing !== null) return existing;

  const sessionId = await createCompletedSession(input);
  useSessionStore.setState({ savedSessionId: sessionId });
  return sessionId;
}

/**
 * Write the hits a session banked, then drop them.
 *
 * Clearing is the point: the victory screen retries `saveSession` on failure, and hits that
 * survived a retry would land on the boss twice. But clear only what was actually written — a
 * throw already keeps them for the retry, and `persistSessionDamage` also drops hits *without*
 * throwing when the fight row is gone or the boss is already dead. Clearing on that is how a
 * session's work disappears with no log row and nothing to find weeks later.
 */
async function commitPendingDamage(
  bossFight: BossFight | null,
  pendingDamage: PendingHit[],
  sessionId: number,
): Promise<void> {
  if (!bossFight || pendingDamage.length === 0) return;

  const written = await persistSessionDamage(bossFight.id, pendingDamage, sessionId);
  if (!written) {
    reportError(
      "session.commitPendingDamage",
      new Error(
        `Boss fight ${bossFight.id} refused ${pendingDamage.length} hit(s) from session ${sessionId}: missing or already defeated.`,
      ),
    );
    return;
  }

  useSessionStore.setState({ pendingDamage: [] });
}

/**
 * The fight this session is actually in, or null.
 *
 * A boss killed on an earlier step stays killed — the remaining sessions of the campaign are
 * ordinary training, not a fight against a corpse. Carrying the dead fight in put a 0-HP arena on
 * every one of those screens, taunts included; with no fight in state, the arena, the crit hint,
 * the screen colour and the victory variant all revert on their own.
 */
async function loadLiveBossFight(
  adventureId: number | null,
  userLevel: DifficultyCode,
): Promise<BossFight | null> {
  if (!adventureId) return null;
  const fight = await getOrCreateBossFight(adventureId, userLevel);
  if (!fight || fight.defeatedAt || fight.currentHp <= 0) return null;
  return fight;
}

/**
 * The Triumph: the hero's own damage emptied the pool — the final blow had nothing left to do.
 * This is what HP are *for*: meet targets, push past them for crits, land the weakness, and the
 * killing session pays TRIUMPH_XP_BONUS. `bossFight` non-null already means the boss was alive
 * when the session began (a corpse is dropped at load), so a zero here is a kill this session
 * earned. Returns the bonus paid, so the caller can fold it into the session's XP.
 */
async function payTriumphBonus(
  bossFight: BossFight | null,
  finalBlow: boolean,
  sessionId: number,
): Promise<number> {
  if (!bossFight || bossFight.currentHp > 0 || finalBlow) return 0;
  // `saveSession` is a dozen awaits long and the victory screen retries it on failure. Every
  // condition above is unchanged between attempts — the pool is empty in the database by then —
  // so without this flag a retry pays the Triumph a second time.
  if (useSessionStore.getState().triumphBonusPaid) return 0;

  await addBonusXpToSession(sessionId, TRIUMPH_XP_BONUS);
  useSessionStore.setState({ triumphBonusPaid: true });
  return TRIUMPH_XP_BONUS;
}

/**
 * The campaign is over, so the boss is: the final blow.
 *
 * The pacing is tuned to fell it ~90 % through the last step for a hero who meets every target,
 * but a hero who trains under target must not finish the whole campaign to a victory screen and a
 * monster that no remaining step can ever kill. finishBossFight decides against the stored row
 * (false when the pacing already did the job); the in-memory fight follows so the victory screen
 * shows the kill it just guaranteed.
 */
async function dealFinalBlow(
  campaign: { isFinished: boolean } | null,
  bossFight: BossFight | null,
  sessionId: number,
): Promise<boolean> {
  if (!campaign?.isFinished || !bossFight) return false;

  const felled = await finishBossFight(bossFight.id, sessionId);
  if (felled) {
    useSessionStore.setState({
      bossFight: { ...bossFight, currentHp: 0, defeatedAt: new Date() },
      felledByFinalBlow: true,
    });
  }
  return felled;
}

/**
 * Start measuring the ground, if there is ground to measure.
 *
 * Its own function because setting up a session and starting a foreground service are two
 * different jobs, and because the notification's six strings are localized here: the native
 * half owns no words at all, which is what lets it follow the app's language without knowing
 * one exists.
 *
 * Exported for the one other place a session begins: `useSessionRecovery` resuming a walk the OS
 * killed. It was the only path that never started the tracking, so a resumed outing measured
 * nothing for the rest of the way. The store folds the points already on disk back into the
 * reading, so the same uuid picks up the same total.
 */
/**
 * The state a session is in the moment it starts running, timer and all.
 *
 * Two doors reach it now, and they must not drift: the 3..2..1 that a workout counts down, and an
 * outing, which has none. Three seconds to get into position before a set of squats is the whole
 * point of that countdown; three seconds before walking is ceremony at the door, so a walk goes
 * straight to running. Written as a flag on `startSession` first, which repeated something the
 * quest already knows, and a flag that repeats a fact is a flag that can contradict it.
 *
 * The timer matters as much as the status: without it `useSessionTimer` returns its idle state,
 * and the view then hands `completeExercise` a single second.
 */
function runningFrom(quest: Quest, currentExerciseIndex: number) {
  const firstEx = quest.exercises[currentExerciseIndex];
  const isTimeBased = firstEx?.target.type === "time";

  return {
    status: "running" as const,
    timerStartTimestamp: isTimeBased ? Date.now() : null,
    timerDuration: isTimeBased ? firstEx.target.value : 0,
  };
}

/**
 * How a session opens: what it is doing, and what its timer is counting.
 *
 * A walk starts by walking. `buildWarmup` already returns nothing for an outing, so the only
 * ceremony left to remove was the full-screen 3..2..1, and it goes for both doors: the hero who
 * set a distance on the quest screen is no more in need of getting into position than the one
 * who tapped a tile. Written first as a flag on `startSession`, which repeated something the
 * quest already knows, and a flag that repeats a fact is a flag that can contradict it.
 */
function openingState(quest: Quest, warmupFirst: boolean, warmupSequence: WarmupStep[]) {
  if (isOutingSession(quest)) return runningFrom(quest, 0);

  return {
    status: warmupFirst ? ("warmup" as const) : ("countdown" as const),
    // Warm-up step, or the full-screen 3..2..1. Exercise timers start after the countdown.
    timerStartTimestamp: Date.now(),
    timerDuration: warmupFirst
      ? (warmupSequence[0]?.seconds ?? PRE_START_COUNTDOWN_SECONDS)
      : PRE_START_COUNTDOWN_SECONDS,
  };
}

/**
 * One movement, one round, all of it outdoors: the shape every seeded outing ships with.
 *
 * The three walks, runs and rides in the catalogue are this, and it is the only shape whose
 * duration the trace can answer for on its own. The editor lets a hero write a two-leg outing or
 * a walk over three rounds; both are outings by style, and neither can have its legs told apart
 * by a single line drawn on a map.
 */
function isTheWholeWalk(quest: Quest): boolean {
  return isOutingSession(quest) && quest.exercises.length === 1 && Math.round(quest.rounds) === 1;
}

/**
 * What a finished set writes down: the number, and the number it was measured against.
 *
 * **The result of an outing is not the stopwatch on screen.** The view hands over
 * `useSessionTimer`'s elapsed seconds, and recovery pushes `timerStartTimestamp` forward by the
 * whole downtime — an outing writes its snapshot once, at the start, so the downtime *is* the
 * walk. A walk killed at 45 minutes and resumed came back reading one, and one is what got
 * written down and paid. The journal already knows better: it times a walk by its trace
 * (`sessionClock`). One rule, and now three readers.
 *
 * **A walk with no number on it writes no target.** The slot still carries one, the seed draws
 * fifteen minutes at medium, but it is a suggestion the hero never saw, let alone chose, and the
 * journal renders a target as a thing that was met or missed: it would tick green on a walk that
 * had nothing to meet. The column is nullable and the journal already reads it as optional, so
 * the honest row is the one that says only what was done.
 */
function recordOf(
  quest: Quest,
  goal: OutingGoal | null,
  slot: { target: Target; exercise: Exercise },
  resultValue: number,
): Pick<CompletedExerciseInput, "result" | "target"> {
  // Not "is this an outing" but "is this walk the whole session".
  //
  // `recordedDurationSeconds()` times the session, which is the walk itself only when the walk is
  // all there is. A mixed quest would hand the walk slot the push-ups' minutes; a two-leg outing,
  // or one walked over three rounds, would hand *every* leg the whole duration and bill the hero
  // three times for one hour. The editor allows both shapes, so the question has to be asked of
  // the shape rather than of the style.
  //
  // ponytail: those shapes therefore keep the view's stopwatch, which reads near zero after the
  // OS kills and the hero resumes. The real fix is a per-slot span read off the trace, and
  // nothing measures one today. Worth building when a hero actually writes such a quest.
  const outing = isTheWholeWalk(quest);
  const measured =
    slot.target.type === "time" && outing ? Math.max(1, recordedDurationSeconds()) : resultValue;

  return {
    result: {
      type: slot.target.type,
      // DB constraints (see migrations) require resultValue > 0. Guards accidental 0/NaN when
      // users tap "DONE" immediately on time-based exercises, and the ceiling above.
      value: clampResultValue(measured, slot.target.type, slot.exercise.style),
    },
    target:
      goal === null && outing ? undefined : { type: slot.target.type, value: slot.target.value },
  };
}

export function beginTrackingIfOuting(
  quest: Quest,
  sessionUuid: string | null,
  goal: OutingGoal | null,
): void {
  if (!isExpedition(quest) || sessionUuid === null) return;

  // Fire and forget: the permission dialog and the service start are the expedition store's
  // business, and a session must not wait on a system prompt before its own screen appears.
  // A refusal lands in that store's `error`, which the panel reads.
  //
  // The unit and the haptics preference are resolved here rather than inside that store, and
  // only once the quest is known to be an outing: the store has no business importing settings,
  // which would pull the whole `db` barrel into a module the session screen mounts.
  // Typed as what the service reads rather than as what the expedition store declares: that
  // store retypes these strings as its own `Notification`, which does not name the button, and
  // an object literal carrying a field its target has never heard of is an error. Named here,
  // the label is simply carried through - one hop, no second copy of six keys to keep in step.
  const notification: StartOptions["notification"] = {
    // The quest, not the app: this notification is the only screen an hour of walking has,
    // and it spent that hour saying the name of the app the hero is already using.
    title: localizedTitle(quest, resolveAppLanguage(i18n.language)),
    // The same three keys the panel's status pill reads. They were a second set with the
    // same values, one for the notification and one for the screen, which is one reword
    // away from the notification and the panel describing the walk differently.
    acquiring: i18n.t("session.expedition_status_acquiring"),
    tracking: i18n.t("session.expedition_status_moving"),
    paused: i18n.t("session.expedition_status_paused"),
    gpsOff: i18n.t("session.expedition_gps_off"),
    reached: i18n.t("session.expedition_reached"),
    // The one way out of a walk that survives a locked screen.
    finish: i18n.t("session.expedition_notification_finish"),
  };

  Promise.all([
    preferences.getDistanceUnit().catch((): DistanceUnit => "metric"),
    preferences.getHapticsEnabled().catch(() => true),
  ])
    .then(([unit, haptics]) =>
      useExpeditionStore
        .getState()
        .begin(sessionUuid, notification, isMountedOuting(quest), unit, goal, haptics),
    )
    .catch((error: unknown) => reportError("session.beginTracking", error));
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    quest: null,
    userLevel: "medium",
    sessionUuid: null,
    adventureRunStepId: null,
    bossFight: null,
    bossStartHp: null,
    felledByFinalBlow: false,
    pendingDamage: [],
    lastDamageResult: null,
    status: "idle",
    prePauseStatus: null,
    warmupSequence: [],
    warmupIndex: 0,
    currentRoundIndex: 0,
    currentExerciseIndex: 0,
    startTime: null,
    totalPausedTime: 0,
    restTakenSeconds: 0,
    lastPauseTimestamp: null,
    timerStartTimestamp: null,
    timerDuration: 0,
    results: [],
    lastSetSkipped: false,
    goal: null,
    savedSessionId: null,
    triumphBonusPaid: false,

    startSession: async (quest, userLevel, options) => {
      // Load boss fight if this is a boss adventure. Callers only ever hold the run step id —
      // it is what the adventure screen puts in the URL and what the victory screen chains to —
      // so resolve the adventure here rather than threading a second param through three
      // screens that can drift apart. getOrCreateBossFight returns null unless kind === "boss".
      const adventureId =
        options?.adventureId ??
        (options?.adventureRunStepId != null
          ? await getAdventureIdForRunStep(options.adventureRunStepId).catch(() => null)
          : null);

      const bossFight = await loadLiveBossFight(adventureId, userLevel);

      // The warm-up runs first unless the hero switched it off; skipping it is always one tap
      // away, so the preference only exists to save that tap for people who never want it.
      const warmupEnabled = await preferences.getWarmupEnabled().catch(() => true);
      // Rotates which movement fills each phase, so the warm-up is not the same four every
      // session. A failed read costs variety, never the warm-up itself.
      const { totalSessions } = await getSessionAggregates().catch(() => ({ totalSessions: 0 }));
      const warmupSequence = buildWarmup(quest, totalSessions);
      const warmupFirst = warmupEnabled && warmupSequence.length > 0;

      const opening = openingState(quest, warmupFirst, warmupSequence);

      set({
        quest,
        userLevel,
        adventureRunStepId: options?.adventureRunStepId ?? null,
        bossFight,
        bossStartHp: bossFight?.currentHp ?? null,
        felledByFinalBlow: false,
        pendingDamage: [],
        lastDamageResult: null,
        ...opening,
        prePauseStatus: null,
        warmupSequence,
        warmupIndex: 0,
        currentRoundIndex: 0,
        currentExerciseIndex: 0,
        startTime: Date.now(),
        // Minted here, not at save time: an expedition files a GPS point every second and needs
        // a name for them long before there is a row to point at.
        sessionUuid: uuidv7(),
        totalPausedTime: 0,
        restTakenSeconds: 0,
        lastPauseTimestamp: null,
        results: [],
        lastSetSkipped: false,
        goal: options?.goal ?? null,
        savedSessionId: null,
        triumphBonusPaid: false,
      });

      // An outing measures ground; a workout in a room does not. Called after the state is set
      // so the uuid the points are filed under is already the one the session will keep.
      beginTrackingIfOuting(quest, get().sessionUuid, options?.goal ?? null);
    },

    nextWarmupStep: () => {
      const { status, warmupIndex, warmupSequence } = get();
      if (status !== "warmup") return;

      const next = warmupIndex + 1;
      if (next >= warmupSequence.length) {
        get().skipWarmup();
        return;
      }

      set({
        warmupIndex: next,
        timerStartTimestamp: Date.now(),
        timerDuration: warmupSequence[next]?.seconds ?? 0,
      });
    },

    /** Step back one movement, timer full again. Stops at the first: there is nothing before it. */
    previousWarmupStep: () => {
      const { status, warmupIndex, warmupSequence } = get();
      if (status !== "warmup" || warmupIndex === 0) return;

      const prev = warmupIndex - 1;
      set({
        warmupIndex: prev,
        timerStartTimestamp: Date.now(),
        timerDuration: warmupSequence[prev]?.seconds ?? 0,
      });
    },

    /** Leave the warm-up for the countdown. Nothing is journaled: a warm-up is not work. */
    skipWarmup: () => {
      if (get().status !== "warmup") return;

      set({
        status: "countdown",
        timerStartTimestamp: Date.now(),
        timerDuration: PRE_START_COUNTDOWN_SECONDS,
      });
    },

    finishCountdown: () => {
      const { quest, currentExerciseIndex } = get();
      if (!quest) return;

      set(runningFrom(quest, currentExerciseIndex));
    },

    pauseSession: () => {
      const { status } = get();
      if (status === "paused" || status === "idle" || status === "finished") return;

      set({
        status: "paused",
        prePauseStatus: status,
        lastPauseTimestamp: Date.now(),
      });
    },

    resumeSession: () => {
      const { status, lastPauseTimestamp, totalPausedTime, timerStartTimestamp, prePauseStatus } =
        get();
      if (status !== "paused") return;

      const now = Date.now();
      const pauseDuration = lastPauseTimestamp ? now - lastPauseTimestamp : 0;
      const newTimerStart = timerStartTimestamp ? timerStartTimestamp + pauseDuration : null;

      set({
        status: prePauseStatus || "running",
        prePauseStatus: null,
        totalPausedTime: totalPausedTime + pauseDuration,
        lastPauseTimestamp: null,
        timerStartTimestamp: newTimerStart,
      });
    },

    restartRound: () => {
      const { quest, currentRoundIndex, results, pendingDamage, bossFight } = get();
      if (!quest) return;

      // Remove results from the current round (keep only prior rounds)
      const resultsForPriorRounds = results.filter(
        (r) => r.roundIndex !== undefined && r.roundIndex < currentRoundIndex,
      );

      // Give the boss back what this round took off. The hits were never written, so undoing
      // them is just dropping them — but the fight held in memory has to be walked back too,
      // or the arena keeps showing damage the hero is about to deal a second time.
      const keptDamage = pendingDamage.filter((hit) => hit.roundIndex < currentRoundIndex);
      const refunded = pendingDamage
        .filter((hit) => hit.roundIndex >= currentRoundIndex)
        .reduce((sum, hit) => sum + hit.damage, 0);

      // `refunded > 0` also keeps a boss that was already dead when the session opened dead:
      // no hit was ever computed against it, so there is nothing to undo.
      const restoredFight =
        bossFight && refunded > 0
          ? {
              ...bossFight,
              currentHp: Math.min(bossFight.totalHp, bossFight.currentHp + refunded),
              defeatedAt: null,
            }
          : bossFight;

      // Get target duration for first exercise in round (if time-based)
      const firstExercise = quest.exercises[0];
      const isTimeBased = firstExercise?.target.type === "time";
      const targetDuration = isTimeBased ? firstExercise.target.value : 0;

      set({
        status: "running",
        prePauseStatus: null,
        currentExerciseIndex: 0,
        timerStartTimestamp: isTimeBased ? Date.now() : null,
        timerDuration: targetDuration,
        results: resultsForPriorRounds,
        pendingDamage: keptDamage,
        bossFight: restoredFight,
        lastDamageResult: null,
      });
    },

    quitSession: () => {
      // A discarded run leaves no ground behind. `savedSessionId` is the whole test: it is set the
      // moment the session row exists, so null means nothing reached the journal and these points
      // name a session that never happened. They would sit in `gps_points` until some later home
      // mount happened to sweep them, and until then they were leagues in the village for a walk
      // the hero threw away. The recovery banner's own discard already did this; the victory
      // screen's did not.
      const { sessionUuid, savedSessionId } = get();
      if (sessionUuid !== null && savedSessionId === null) {
        deletePoints(sessionUuid).catch((e) => reportError("session.discardPoints", e));
      }

      set({
        quest: null,
        status: "idle",
        adventureRunStepId: null,
        bossFight: null,
        bossStartHp: null,
        felledByFinalBlow: false,
        // Abandoning a session takes its damage with it — none of it was ever written.
        pendingDamage: [],
        lastDamageResult: null,
        prePauseStatus: null,
        warmupSequence: [],
        warmupIndex: 0,
        currentRoundIndex: 0,
        currentExerciseIndex: 0,
        startTime: null,
        totalPausedTime: 0,
        restTakenSeconds: 0,
        lastPauseTimestamp: null,
        timerStartTimestamp: null,
        timerDuration: 0,
        results: [],
        lastSetSkipped: false,
        sessionUuid: null,
        goal: null,
        savedSessionId: null,
        triumphBonusPaid: false,
      });
      // Whether the hero quit or the session ended, the service must let go: it holds a wake
      // lock and a permanent notification, and nothing else will stop it.
      useExpeditionStore
        .getState()
        .end()
        .catch((e) => reportError("session.stopExpedition", e));
    },

    completeExercise: (resultValue) => {
      const { quest, currentRoundIndex, currentExerciseIndex, results, bossFight, goal } = get();
      if (!quest) return;

      const currentEx = quest.exercises[currentExerciseIndex];
      if (!currentEx) return;

      const { result, target } = recordOf(quest, goal, currentEx, resultValue);
      const safeResultValue = result.value;

      // Land the hit on the fight we hold, and bank it. Nothing reaches the database until
      // saveSession: see `pendingDamage`. This is pure maths now, so there is no failure to
      // swallow and no await between the read and the write of `bossFight`.
      if (bossFight && !bossFight.defeatedAt) {
        const primaryMuscle = currentEx.exercise.muscles[0] as MuscleCode | undefined;

        const damageResult = computeDamage(bossFight, {
          resultValue: safeResultValue,
          targetValue: currentEx.target.value,
          muscle: primaryMuscle,
          targetType: currentEx.target.type,
          style: currentEx.exercise.style,
        });

        set({
          bossFight: {
            ...bossFight,
            currentHp: damageResult.newHp,
            defeatedAt: damageResult.defeated ? new Date() : null,
          },
          lastDamageResult: damageResult,
          pendingDamage: [
            ...get().pendingDamage,
            {
              roundIndex: currentRoundIndex,
              exerciseId: currentEx.exercise.id,
              damage: damageResult.damage,
              isCritical: damageResult.isCritical,
              muscle: primaryMuscle ?? null,
              style: currentEx.exercise.style,
            },
          ],
        });
      }

      // Record result
      const newResult: CompletedExerciseInput = {
        exerciseId: currentEx.exercise.id,
        roundIndex: currentRoundIndex,
        sortOrder: currentExerciseIndex,
        result,
        target,
        pricing: {
          secondsPerRep: currentEx.exercise.secondsPerRep,
          difficulty: currentEx.exercise.difficulty,
          style: currentEx.exercise.style,
        },
        performedAt: new Date(),
      };

      set({
        ...advanceAfterSet(quest, currentRoundIndex, currentExerciseIndex, [...results, newResult]),
        lastSetSkipped: false,
      });
    },

    /**
     * End the walk from somewhere that has no view: the notification's "Finish" action.
     *
     * It is the same ending, not a second one. `recordOf` already times an outing by its trace
     * and ignores whatever number the screen hands over, so this is `completeExercise` with the
     * duration the journal was going to write anyway - one writer of a walk's length, which is
     * the rule that survived the OS killing a session at 45 minutes.
     *
     * Deaf to anything that is not a walk under way. The service is a broadcast receiver that
     * can outlive the session it was started for, and a stale tap must not end a workout indoors
     * or wake an idle store into writing a row.
     *
     * Paused counts as under way, and that is not a technicality: standing still and then ending
     * from the notification is what a hero does at their front door, and the recovery card
     * concludes a killed walk from exactly that state. Only `idle`, `finished` and the two
     * pre-start statuses are refused, which is the whole of what the guard was written for.
     */
    completeOuting: () => {
      const { quest, status } = get();
      const underWay = status === "running" || status === "paused";
      // The same shape `recordOf` reads a trace for. On a two-leg outing this would advance to
      // the next leg rather than end anything, which is not what a button called Finish on a
      // lock screen can mean.
      if (!quest || !underWay || !isTheWholeWalk(quest)) return;

      get().completeExercise(Math.max(1, recordedDurationSeconds()));
    },

    /**
     * Change the movement in front of the hero, mid-set.
     *
     * The swap sheet existed already, but only on the quest screen — before starting, which is
     * not when a hero discovers a movement is out of reach (issue #33). Reaching it from here is
     * what lets them log what they actually did instead of typing the lowest number the field
     * accepts.
     */
    swapCurrentExercise: (exercise) => {
      const { quest, currentExerciseIndex, status } = get();
      if (!quest || (status !== "running" && status !== "resting")) return;

      const slot = quest.exercises[currentExerciseIndex];
      if (!slot || slot.exercise.id === exercise.id) return;

      // The slot's target, unless the movement is measured the other way — same call
      // `applyQuestConfig` makes. Results already logged keep their own `exerciseId` and
      // `pricing`: they are true.
      const target = retargetForMovement(slot.target, exercise, get().userLevel);
      const exercises = quest.exercises.map((qex, i) =>
        i === currentExerciseIndex
          ? {
              ...qex,
              exercise,
              target,
              // The quest's art is of the movement that used to be here, and the caption named a
              // rung the hero has just overruled.
              images: [],
              ghost: undefined,
              substitutedFor: undefined,
            }
          : qex,
      );

      // Every other entry into a movement sets this pair, and the two units are not
      // interchangeable: a hold timer left running on a rep movement counts nothing down, and reps
      // arrived at with no timer would show seconds that never started.
      const isTimeBased = target.type === "time";

      set({
        quest: { ...quest, exercises },
        ...(status === "running"
          ? {
              timerStartTimestamp: isTimeBased ? Date.now() : null,
              timerDuration: isTimeBased ? target.value : 0,
            }
          : {}),
      });

      // Deliberately not written to the quest's saved config, unlike the same sheet on the quest
      // screen. That one is configuration — posted cold, before starting, because the hero has no
      // parallel bars at home. This one is a correction for tonight, made mid-set on the movement
      // that just turned out to be out of reach, and reading a standing preference out of it pins
      // the slot: `applyQuestConfig` swaps before `currentRungFor` ever runs, so the progression
      // substitution issue #33 exists for stops applying to the one slot the hero struggled on.
      // Costing them a tap next session is the cheaper mistake; the quest screen still pins.
    },

    /**
     * The hero could not do this movement, and says so instead of typing a number.
     *
     * Writes nothing. `CHECK (resultValue > 0)` made "1" the only way past a movement out of
     * reach, and that 1 then fed muscle volume, the weak-area read and the targets it generates —
     * issue #33's second half, where the app taught its own journal a lie. A set that left no row
     * is counted by nothing, with no reader having to remember to filter it out.
     */
    skipExercise: () => {
      const { quest, currentRoundIndex, currentExerciseIndex, results } = get();
      if (!quest) return;

      // A session with nothing in it cannot be written — `createCompletedSession` refuses, and
      // the victory screen would sit on a retry button that can never succeed. So the last
      // remaining set is not skippable: the way out of a workout the hero cannot do is Quit,
      // which the pause overlay already offers with a confirmation.
      const isLastSet =
        currentExerciseIndex === quest.exercises.length - 1 &&
        currentRoundIndex === quest.rounds - 1;
      if (isLastSet && results.length === 0) return;

      set({
        ...advanceAfterSet(quest, currentRoundIndex, currentExerciseIndex, results),
        lastSetSkipped: true,
      });
    },

    skipRest: () => {
      const { status, quest, currentExerciseIndex, timerStartTimestamp, restTakenSeconds } = get();
      if (status !== "resting" || !quest) return;

      const nextExDef = quest.exercises[currentExerciseIndex];
      const isNextTimeBased = nextExDef?.target.type === "time";

      // The single exit from `resting` — the skip button and RestView's auto-advance at 0:00 both
      // land here — so it is the one place rest gets measured. `timerStartTimestamp` is pushed
      // forward by `resumeSession`, so a pause taken mid-rest is already excluded and cannot be
      // subtracted twice.
      const restTaken = timerStartTimestamp
        ? Math.max(0, (Date.now() - timerStartTimestamp) / 1000)
        : 0;

      set({
        status: "running",
        restTakenSeconds: restTakenSeconds + restTaken,
        timerStartTimestamp: isNextTimeBased ? Date.now() : null,
        timerDuration: isNextTimeBased ? nextExDef.target.value : 0,
      });
    },

    addRestTime: (seconds) => {
      const { status, timerDuration } = get();
      if (status !== "resting") return;
      // Same ceiling the quest editor and the config card enforce. Without it "+30s" stacked
      // forever and the rest screen had no way out but the skip button.
      set({ timerDuration: Math.min(REST_RANGE.max, timerDuration + seconds) });
    },

    updateLastResult: (resultValue) => {
      const { results, bossFight, pendingDamage } = get();
      const last = results[results.length - 1];
      if (!last) return;

      // DB constraints require resultValue > 0.
      const safeResultValue = clampResultValue(resultValue, last.result.type, last.pricing?.style);
      const updated = {
        ...last,
        result: { ...last.result, value: safeResultValue },
      };

      set({
        results: [...results.slice(0, -1), updated],
      });

      // The hit banked for this set was computed from the pre-correction value; without this,
      // the journal recorded the corrected reps while the boss took damage for the original
      // ones. Rewind the HP the old hit removed, re-land it at the new value — same crit, so
      // the outcome the screen already celebrated only changes magnitude.
      const lastHit = pendingDamage[pendingDamage.length - 1];
      if (
        bossFight &&
        lastHit &&
        last.target &&
        lastHit.exerciseId === last.exerciseId &&
        lastHit.roundIndex === last.roundIndex
      ) {
        const rewound = {
          ...bossFight,
          currentHp: Math.min(bossFight.totalHp, bossFight.currentHp + lastHit.damage),
          defeatedAt: null,
        };
        const damageResult = computeDamage(rewound, {
          resultValue: safeResultValue,
          targetValue: last.target.value,
          muscle: lastHit.muscle ?? undefined,
          targetType: last.target.type,
          style: lastHit.style,
          forcedCritical: lastHit.isCritical,
        });
        set({
          bossFight: {
            ...rewound,
            currentHp: damageResult.newHp,
            defeatedAt: damageResult.defeated ? new Date() : null,
          },
          lastDamageResult: damageResult,
          pendingDamage: [
            ...pendingDamage.slice(0, -1),
            { ...lastHit, damage: damageResult.damage, isCritical: damageResult.isCritical },
          ],
        });
      }
    },

    saveSession: async (feedback) => {
      // What the reducer credited, read before `end()` and before anything else can touch it.
      // This, not a sum over `gps_points`, is what the road is paid in: the raw sum counts drift
      // while the hero stood still and counts the length of a teleport the reducer broke the line
      // at, so the village would grow by a number the recap never showed. See `db/gps.ts`.
      const ground = measureGround(get().quest);

      // The ground stopped being covered when the session ended, which is earlier than this: the
      // subscriber at the bottom of this file ends the tracking the moment `status` becomes
      // "finished", because a save that sits behind the "too short to be a session?" question
      // may never be reached at all. This is the belt: `end()` is idempotent, the victory screen
      // retries `saveSession` on failure, and the flush it performs must have happened before
      // the row below claims the run.
      //
      // What it is guarding against, historically: `end()` used to live only in `quitSession`,
      // and finishing a session does not go through it, so between DONE and Continue the service
      // kept its wake lock and its 1 Hz GPS and every fix in that window was written under the
      // finished session's uuid — the recap drew the walk home as part of the outing, and
      // `durationSeconds` and the map disagreed about the same run.
      await useExpeditionStore
        .getState()
        .end()
        .catch((error: unknown) => reportError("session.endTracking", error));

      const {
        quest,
        userLevel,
        sessionUuid,
        startTime,
        totalPausedTime,
        restTakenSeconds,
        results,
        adventureRunStepId,
        bossFight,
        pendingDamage,
      } = get();
      if (!quest || !startTime) throw new Error("No active session");

      const measuredSeconds = Math.floor((Date.now() - startTime - totalPausedTime) / 1000);
      const { durationSeconds, effortCeilingSeconds } = sessionClock({
        quest,
        ground,
        measuredSeconds,
        restTakenSeconds,
      });

      const sets = toXpSets(quest, results);
      let xpEarned = computeSessionXp({ sets, effortCeilingSeconds, userLevel });

      // What the same session would have paid for hitting every target exactly. The difference is
      // the reward for going past them — surfaced on the victory screen, because an allowance the
      // hero cannot see reads as a ceiling that ate their last few reps.
      const xpAtTarget = computeSessionXp({
        sets: sets.map((set) => ({ ...set, result: set.target })),
        effortCeilingSeconds,
        userLevel,
      });
      let overshootXp = Math.max(0, xpEarned - xpAtTarget);

      // Snapshot before this session's exercises land, so the village-growth diff at the
      // end reflects exactly what this save changed.
      const beforeBuildings = await getVillageBuildings();

      const dailyBonusApplied = await isDailyQuest(quest.id);
      if (dailyBonusApplied) {
        xpEarned = Math.round(xpEarned * 1.5);
        overshootXp = Math.round(overshootXp * 1.5);
      }

      // Calculate level before saving (current state)
      const oldTotalXp = await getTotalXp();
      const oldLevel = calculateLevelFromXp(oldTotalXp);

      const sessionId = await ensureSessionRow({
        questId: quest.id,
        userLevel,
        // The name the session has carried since its first second. Without it the row would be
        // minted a second one at save time, and the GPS points filed under the first would
        // belong to a session that, as far as any query is concerned, never happened.
        uuid: sessionUuid ?? undefined,
        leaguesM: ground.leaguesM,
        // Beside the ground, and for the same reason: the recap replayed the fixes to time the
        // walk, and a flush that failed leaves up to thirty of them out of the table — the
        // distance still holds them, the replayed clock does not, and the pace between the two
        // is wrong with nothing on screen saying so. One writer, at save, like `leaguesM`.
        movingSeconds: ground.movingSeconds,
        durationSeconds,
        xpEarned,
        feedback,
        exercises: results,
        performedAt: new Date(startTime),
      });

      // The session exists now, so the hits it earned can be written and attributed to it. This
      // runs before the campaign step below, which reads the fight to decide whether the run is
      // over — the boss has to be at its true HP by then.
      await commitPendingDamage(bossFight, pendingDamage, sessionId);

      const campaign =
        adventureRunStepId != null
          ? await completeAdventureRunStep({
              runStepId: adventureRunStepId,
              completedSessionId: sessionId,
            })
          : null;

      const finalBlow = await dealFinalBlow(campaign, bossFight, sessionId);

      // Check for personal records
      const newRecords = await checkForNewRecords(sessionId);

      // Mark session as having new records if any were set
      if (newRecords.length > 0) {
        await markSessionWithNewRecords(sessionId);
      }

      // The variations tonight's sets just unlocked. Same question as the records above — what
      // did *this* session change — so it is answered in the same place, from the journal.
      const newRungs = await checkForNewRungs(sessionId);

      // Update streak cache
      await updateStreakAfterSession();

      // The widgets read straight from the DB, but only on an OS-driven tick or a poke —
      // a finished session is one of the moments their numbers can move.
      // Non-blocking: never fail a logged session over a widget redraw.
      requestWidgetsUpdate().catch((e) => reportError("widget.update", e));
      // Check for new achievements (on the base session XP, before the oath bonus).
      // `startTime`, not `new Date()`: the session row is written with the start too, and the
      // time-of-day achievements read the hour off this. A workout begun at 06:40 and finished
      // at 07:05 is an early bird; reading the clock at save time said otherwise.
      const newAchievements = await checkForNewAchievements({
        durationSeconds,
        xpEarned,
        performedAt: new Date(startTime),
        questId: quest?.id ?? null,
      });

      // Oath progress is derived; this only catches the moment it tips over. The bonus
      // credit runs inside checkOathFulfilled's own transaction, atomically with marking
      // the oath fulfilled — a crash between the two would otherwise lose the bonus for
      // good, since a fulfilled oath is a no-op on every later call.
      let oathBonusXp = 0;
      const fulfilledOath = await checkOathFulfilled(async (tx) => {
        oathBonusXp = OATH_XP_BONUS;
        await addBonusXpToSession(sessionId, OATH_XP_BONUS, tx);
      });

      // A fulfilled oath pays a mini-boss-sized bonus. Added to the tip-over session row so
      // total XP (a SUM over sessions) and the level below pick it up with no extra state.
      if (oathBonusXp > 0) {
        xpEarned += oathBonusXp;
      }

      // The Triumph pays the same way the oath does: onto the killing session's row, so total XP
      // and the level pick it up with no extra state.
      xpEarned += await payTriumphBonus(bossFight, finalBlow, sessionId);

      // The ceiling belongs here, not inside `computeSessionXp`: the daily ×1.5 and the two flat
      // bonuses land after it, and a cap applied before them capped nothing — the old `min(5000)`
      // let a session reach 7850. Everything that can add XP has now been added.
      xpEarned = Math.min(MAX_SESSION_XP, xpEarned);
      overshootXp = Math.min(overshootXp, xpEarned);

      // Level after all XP (base + any oath bonus) is settled.
      const newTotalXp = oldTotalXp + xpEarned;
      const newLevel = calculateLevelFromXp(newTotalXp);
      const levelUp = newLevel > oldLevel ? { oldLevel, newLevel } : null;

      // The village's own "grand moment": crossing a tier is bigger than any one
      // building leveling up, but the per-building diff below can't see it.
      const tierUp = diffVillageTier(oldLevel, newLevel);

      // Everything that could move a building's level (volume, boss count, village tier)
      // is settled now, so this is the one honest "after" snapshot for the diff.
      //
      // The short-lived memos have to go first. They hold aggregates like the lifetime muscle
      // balance for 5 s on the assumption that nothing changes them faster than that — true
      // everywhere except right here, where a whole session lands between two reads seconds
      // apart. Without this, "after" replayed the pre-session volumes and no muscle-driven
      // building ever appeared to grow on the victory screen.
      clearShortLivedQueries();

      // A different cache, and a different reason. `getQuestById` memoizes a resolved quest per
      // (id, level) with no TTL, and what it resolves now depends on the journal: the third
      // on-target session earns a rung, which is exactly when a slot should stop being substituted
      // down (issue #33). Without this the hero climbs and keeps being handed the easier movement
      // until the app restarts.
      invalidateQuestTemplates();

      const afterBuildings = await getVillageBuildings();
      const villageGrowth = diffVillageGrowth(beforeBuildings, afterBuildings);

      return {
        sessionId,
        xpEarned,
        dailyBonusApplied,
        newRecords,
        newRungs,
        newAchievements,
        fulfilledOath,
        oathBonusXp,
        overshootXp,
        campaign,
        levelUp,
        heroXp: { before: oldTotalXp, after: newTotalXp },
        tierUp,
        villageGrowth,
      };
    },
  })),
);

/**
 * The first second of a session, which counts as progress.
 *
 * Everything else the subscriber watches is a *change* to a session already written down, so a
 * run that never reached its second exercise was never written down at all: an expedition is one
 * round of one movement with no rest, nothing else ever moves, and a walk the app was killed
 * during could not be resumed — its trace, having no snapshot to name it, swept as an orphan by
 * the very hook that exists to save it. Strength quests had the same hole for their opening set.
 *
 * Every door into running counts, not only the countdown. An outing goes straight from `idle`,
 * having no countdown to leave, and a session started from Home while the victory screen is
 * still up goes from `finished`.
 */
function justStarted(curr: SessionStatus, prev: SessionStatus): boolean {
  return curr === "running" && (prev === "idle" || prev === "finished" || prev === "countdown");
}

// Subscribe to session state changes and auto-save for crash recovery
useSessionStore.subscribe(
  (state) => ({
    status: state.status,
    currentRoundIndex: state.currentRoundIndex,
    currentExerciseIndex: state.currentExerciseIndex,
    resultsCount: state.results.length,
    // A mid-session swap moves none of the above, and a recovery that missed it hands the hero
    // back the movement they just refused.
    exerciseIds: state.quest?.exercises.map((qex) => qex.exercise.id),
  }),
  async (curr, prev) => {
    const state = useSessionStore.getState();

    // Clear saved session when session ends or is idle
    if (curr.status === "idle" || curr.status === "finished") {
      if (prev.status !== "idle" && prev.status !== "finished") {
        // The service, the wake lock and the 1 Hz GPS stop when the session is over, not when
        // the victory screen's question is answered. `saveSession` used to be the only end of
        // that road, and it sits behind the "too short to be a session?" prompt: a hero who
        // abandoned after 30 s, tapped DONE and backgrounded the app without answering kept a
        // permanent notification and a live trace until the process died, and "Keep" twenty
        // minutes later credited the walk home.
        await useExpeditionStore
          .getState()
          .end()
          .catch((error: unknown) => reportError("session.endTracking", error));
        try {
          await preferences.clearSavedSession();
        } catch (error) {
          // A slot that will not clear offers the hero a session they already finished.
          reportError("session.clearSavedSession", error);
        }
      }
      return;
    }

    // Save session state on meaningful changes
    if (
      !state.quest ||
      !state.startTime ||
      curr.status === "countdown" // Don't save during countdown
    ) {
      return;
    }

    // Debounce saves - only save when exercise/round changes or on pause
    const hasProgressed =
      justStarted(curr.status, prev.status) ||
      curr.currentRoundIndex !== prev.currentRoundIndex ||
      curr.currentExerciseIndex !== prev.currentExerciseIndex ||
      curr.resultsCount !== prev.resultsCount ||
      // A movement swapped mid-session — a quest *arriving* is not progress, its start is.
      (prev.exerciseIds !== undefined && String(curr.exerciseIds) !== String(prev.exerciseIds)) ||
      curr.status === "paused";

    if (hasProgressed) {
      try {
        // Typed, so a field added to SavedSessionState fails to compile until it is written here.
        const savedState: SavedSessionState = {
          quest: state.quest,
          userLevel: state.userLevel,
          sessionUuid: state.sessionUuid,
          adventureRunStepId: state.adventureRunStepId,
          bossFight: state.bossFight,
          bossStartHp: state.bossStartHp,
          pendingDamage: state.pendingDamage,
          lastDamageResult: state.lastDamageResult,
          status: state.status,
          prePauseStatus: state.prePauseStatus,
          warmupSequence: state.warmupSequence,
          warmupIndex: state.warmupIndex,
          currentRoundIndex: state.currentRoundIndex,
          currentExerciseIndex: state.currentExerciseIndex,
          startTime: state.startTime,
          totalPausedTime: state.totalPausedTime,
          restTakenSeconds: state.restTakenSeconds,
          timerStartTimestamp: state.timerStartTimestamp,
          timerDuration: state.timerDuration,
          results: state.results,
          lastSetSkipped: state.lastSetSkipped,
          goal: state.goal,
          savedAt: Date.now(),
        };
        await preferences.setSavedSession(JSON.stringify(savedState));
      } catch (error) {
        // This is the whole crash-recovery safety net. If it stops writing, nothing looks
        // wrong until the app dies mid-session and the workout is gone.
        reportError("session.saveSnapshot", error);
      }
    }
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
);
