# Expeditions After the Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the six gaps the 2026-09-02 product audit found in expeditions: a goal that buzzes when reached, a distance goal, outings visible in the Journal, an oath you can swear on leagues, a road whose floors come from a measured walk, and product docs that mention any of it.

**Architecture:** Everything stays inside the shapes that already exist. The goal is a value the expedition store watches on every GPS fix (the only clock that runs with the screen off). A distance goal lives in the hero's saved quest config, never in `quest_exercises`, whose `CHECK (targetType IN ('reps','time'))` from `0000_schema.sql` would need a table rebuild. Leagues already sit on `completed_sessions.leaguesM`; the Journal, the records and the oath read that column and nothing else.

**Tech Stack:** Expo + React Native + Tamagui, Zustand stores, SQLite + Drizzle, jest + @testing-library/react-native, i18next (`locales/en.json`, `locales/fr.json`), native module `modules/bati-location`.

**Spec:** the audit in this session (2026-09-02) and `docs/designs/expeditions.md`. The doc's premise 3 ("a duration, a distance, or nothing") and open question 6 (an oath metric of leagues' own) are what tasks 3, 4 and 7 implement.

## Global Constraints

- Dark-mode only. Tamagui tokens, no raw hex (lint plugin rejects it).
- React Compiler is on: **no manual `useMemo`/`useCallback` added** beyond what a file already does.
- Icons only through `@/components/icons` (Lucide) or `useGameIcon`.
- Copy rules: no em dash anywhere a reader sees; the app says `tu`; `__tests__/locale-style.test.ts` measures it.
- `noUncheckedIndexedAccess` is on; in a test, narrow `rows[0]` with `assert(row)` from `node:assert/strict`, never `!`.
- `db/expeditions.ts` and `src/gps/track.ts` must stay free of any database import (two screen tests mock `db/*` module by module).
- Commits in English. End every commit message with:
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Brutxc7NaqQC3BexTdhaWp
  ```
- The user edits this repo in parallel: stage only the files each task names, never `biome check --write` on the whole tree.
- Before finishing: `npm run check` and `npm test` green. CI runs Node 24 (`nvm exec 24 npm test` if jest setup is touched; it is not here).

## File map

| File | Responsibility in this plan |
|---|---|
| `src/gps/track.ts` | `OutingGoal` type and `goalReached()` (pure) |
| `stores/expedition.ts` | watches the goal on every fix, buzzes once, updates the notification |
| `components/session/ExpeditionPanel.tsx` | "Goal reached" status line |
| `db/expeditions.ts` | `outingGoal()`, `isMountedOuting()`, `estimateDistanceSeconds()` (pure) |
| `stores/session.ts` | hands the goal and the haptics preference to the expedition store |
| `db/targets.ts` | distance goal range, step and default |
| `db/questConfig.ts` | `QuestConfig.distanceM` parse and override detection |
| `components/quests/QuestConfigCard.tsx` | Duration / Distance toggle on an outing |
| `app/(tabs)/quests/[id].tsx` | passes the distance goal to `startSession`, estimates from it |
| `db/completed.ts` | `leaguesM` on the session list |
| `components/journal/SessionCard.tsx`, `app/(tabs)/journal/index.tsx` | distance on an outing's row |
| `db/personalRecords.ts`, `components/journal/PersonalRecordsCard.tsx`, `components/session/NewRecordsBadge.tsx` | longest outing record, ground covered total |
| `db/gps.ts`, `db/village.ts` | `METRES_PER_LEAGUE` moves to `gps.ts` so `oaths.ts` can read it without a cycle |
| `db/oaths.ts`, `app/oath.tsx` | `leagues` metric and preset |
| `components/home/useSmartAction.ts` | a leagues oath is served with an outing |
| `db/village.ts` | `ROAD_FLOORS` re-tuned from the measured walk |
| `docs/product/*.md`, `docs/gameplay/expeditions.md`, `docs/content/missing-image.md`, `docs/designs/expeditions.md` | product docs |

---

### Task 1: The goal, watched on every fix

**Files:**
- Modify: `src/gps/track.ts` (after `credited`, end of file)
- Modify: `stores/expedition.ts:40-70` (state and `Notification`), `:98-175` (`begin`)
- Test: `__tests__/store-expedition.test.ts`

**Interfaces:**
- Produces: `export type OutingGoal = { type: "time"; seconds: number } | { type: "distance"; metres: number }` and `export function goalReached(goal: OutingGoal | null, track: TrackState): boolean` in `src/gps/track.ts`.
- Produces: store state `goal: OutingGoal | null`, `goalReached: boolean`; `begin(sessionUuid, notification, mounted, unit, goal: OutingGoal | null = null, haptics = true)`; `Notification` gains `reached: string`.

- [ ] **Step 1: Write the failing tests**

In `__tests__/store-expedition.test.ts`, next to the other module mocks at the top:

```ts
const mockHaptic = jest.fn().mockResolvedValue(undefined);
jest.mock("expo-haptics", () => ({
  notificationAsync: (...a: never[]) => mockHaptic(...a),
  NotificationFeedbackType: { Success: "success" },
}));
```

Add `reached: "r"` to the `NOTIFICATION` constant. Add `mockHaptic.mockClear();` in `beforeEach`. Then, after the test "fixes fold into the reading the screen shows":

```ts
  test("a distance goal buzzes once when the ground is covered, and says so in the notification", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric", {
      type: "distance",
      metres: 10,
    });
    // 1.4 m per fix; the start gate eats the first three, so ten metres land around fix 11.
    for (let i = 0; i < 20; i++) emit(walking(i));

    expect(store.getState().goalReached).toBe(true);
    expect(mockHaptic).toHaveBeenCalledTimes(1);
    expect(mockSetProgress).toHaveBeenCalledWith(expect.stringContaining("r"));
  });

  test("a time goal is measured in moving seconds", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric", {
      type: "time",
      seconds: 10,
    });
    for (let i = 0; i < 8; i++) emit(walking(i));
    expect(store.getState().goalReached).toBe(false);
    for (let i = 8; i < 20; i++) emit(walking(i));
    expect(store.getState().goalReached).toBe(true);
    expect(mockHaptic).toHaveBeenCalledTimes(1);
  });

  test("haptics off means no buzz, the notification still says it", async () => {
    await store.getState().begin(
      "s1",
      NOTIFICATION,
      false,
      "metric",
      { type: "distance", metres: 10 },
      false,
    );
    for (let i = 0; i < 20; i++) emit(walking(i));
    expect(store.getState().goalReached).toBe(true);
    expect(mockHaptic).not.toHaveBeenCalled();
    expect(mockSetProgress).toHaveBeenCalledWith(expect.stringContaining("r"));
  });

  test("no goal never reaches anything", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric");
    for (let i = 0; i < 40; i++) emit(walking(i));
    expect(store.getState().goalReached).toBe(false);
    expect(mockHaptic).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest __tests__/store-expedition.test.ts`
Expected: FAIL, `goalReached` is `undefined` and `mockHaptic` never called.

- [ ] **Step 3: The pure half, in `src/gps/track.ts`**

Append at the end of the file:

```ts
/**
 * What the hero set out to do, in the unit they chose. Seconds are *moving* seconds, the same
 * witness XP is paid in: a goal of "25 minutes" is not met by standing at a crossing.
 */
export type OutingGoal = { type: "time"; seconds: number } | { type: "distance"; metres: number };

export function goalReached(goal: OutingGoal | null, track: TrackState): boolean {
  if (goal === null) return false;
  return goal.type === "time"
    ? track.movingMs >= goal.seconds * 1000
    : track.distanceM >= goal.metres;
}
```

- [ ] **Step 4: The store watches it**

In `stores/expedition.ts`:

Add the imports:

```ts
import * as Haptics from "expo-haptics";
import { type OutingGoal, goalReached } from "@/src/gps/track";
```

(`accept`, `EMPTY`, `TrackState` are already imported from the same module; merge into that line.)

Extend the state type (the block at lines 40-55):

```ts
  /** What the hero set out to do, or null when they just went out. */
  goal: OutingGoal | null;
  /** Flipped once, the moment the goal was met. Read by the panel's status line. */
  goalReached: boolean;
  begin: (
    sessionUuid: string,
    notification: Notification,
    mounted: boolean,
    unit: DistanceUnit,
    goal?: OutingGoal | null,
    haptics?: boolean,
  ) => Promise<boolean>;
```

Add `reached: string;` to the `Notification` type.

Add a helper above the store:

```ts
/**
 * The notification's second line. Once the goal is met it leads with that, because a phone
 * pulled out of a pocket at the buzz should answer "why did you buzz" before "how far".
 */
function progressLine(track: TrackState, unit: DistanceUnit, reached: string | null): string {
  const distance = formatDistance(track.distanceM, unit);
  return reached === null ? distance : `${reached} · ${distance}`;
}
```

In the initial state add `goal: null, goalReached: false,`. Change `begin`'s signature to `begin: async (sessionUuid, notification, mounted, unit, goal = null, haptics = true) => {`. In the `set({ sessionUuid, track: EMPTY, lastFix: null, error: null })` line add `goal, goalReached: false`. Replace the `onLocation` listener body with:

```ts
      addListener("onLocation", (fix) => {
        buffer.push(fix);
        const track = accept(get().track, fix);
        const wasReached = get().goalReached;
        const reached = wasReached || goalReached(goal, track);
        set({ track, lastFix: fix, goalReached: reached });

        // Once. The phone is in a pocket at this moment, so the buzz is the whole message and the
        // notification is what explains it when the hero looks. Haptics off is respected: a hero
        // who turned them off for buttons did not ask for a walk to be silent, but the setting
        // has one meaning in this app and this is not the place to give it a second.
        if (reached && !wasReached) {
          if (haptics) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((e) =>
              reportError("expedition.goalHaptic", e),
            );
          }
          setProgress(progressLine(track, unit, notification.reached));
        }

        // Same cadence as the write, so a pocket that is never looked at costs one notification
        // update every thirty seconds rather than one a second.
        if (buffer.length >= FLUSH_EVERY) {
          setProgress(progressLine(track, unit, reached ? notification.reached : null));
          flush(sessionUuid).catch((e) => reportError("expedition.flush", e));
        }
      }),
```

- [ ] **Step 5: Run the tests**

Run: `npx jest __tests__/store-expedition.test.ts __tests__/gps-track.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/gps/track.ts stores/expedition.ts __tests__/store-expedition.test.ts
git commit -m "The outing's goal is watched on every fix, and buzzes once when it is met"
```

---

### Task 2: The session hands over the goal; the panel says it was reached

**Files:**
- Modify: `db/expeditions.ts` (append)
- Modify: `stores/session.ts:560-612` (`mountedExpedition`, `beginTrackingIfOuting`), `:194-201` (`startSession` options), the call at `stores/session.ts` inside `startSession` (`beginTrackingIfOuting(quest, get().sessionUuid)`)
- Modify: `components/session/ExpeditionPanel.tsx:17-26` (`statusKey`)
- Modify: `locales/en.json` (`session` block, next to `expedition_status_error`), `locales/fr.json` (same)
- Test: `__tests__/db-expeditions.test.ts`, `__tests__/expedition-panel.test.tsx`

**Interfaces:**
- Consumes: `OutingGoal` from Task 1.
- Produces: `outingGoal(quest, distanceGoalM)`, `isMountedOuting(quest)` in `db/expeditions.ts`; `startSession(quest, level, { distanceGoalM?: number | null })`; locale key `session.expedition_reached`.

- [ ] **Step 1: Failing tests**

In `__tests__/db-expeditions.test.ts` add:

```ts
import { isMountedOuting, outingGoal } from "@/db/expeditions";

describe("outingGoal", () => {
  const slot = (type: "time" | "reps", value: number) => ({
    exercises: [{ target: { type, value } }],
  });

  test("a distance goal outranks the slot's duration", () => {
    expect(outingGoal(slot("time", 900), 5000)).toEqual({ type: "distance", metres: 5000 });
  });

  test("without a distance the slot's duration is the goal", () => {
    expect(outingGoal(slot("time", 900), null)).toEqual({ type: "time", seconds: 900 });
    expect(outingGoal(slot("time", 900), undefined)).toEqual({ type: "time", seconds: 900 });
  });

  test("a rep slot is no goal for a walk", () => {
    expect(outingGoal(slot("reps", 10), null)).toBeNull();
  });
});

describe("isMountedOuting", () => {
  test("only the ride is mounted", () => {
    const named = (enName: string) => ({ exercises: [{ exercise: { enName } }] });
    expect(isMountedOuting(named("Outrider's Ride"))).toBe(true);
    expect(isMountedOuting(named("Warden's Walk"))).toBe(false);
  });
});
```

In `__tests__/expedition-panel.test.tsx`, extend `setTrack` so it can set the flag and add a test:

```ts
function setTrack(
  track: Partial<TrackState>,
  extra: { error?: string | null; goalReached?: boolean } = {},
) {
  useExpeditionStore.setState({
    track: { ...EMPTY, ...track },
    error: extra.error ?? null,
    lastFix: null,
    goalReached: extra.goalReached ?? false,
  });
}
```

```ts
  test("the status says the goal was reached, ahead of moving or standing still", () => {
    setTrack({ startedAt: 1, distanceM: 3000, movingMs: 600_000 }, { goalReached: true });
    mount();
    expect(screen.getByText("Goal reached")).toBeTruthy();
    expect(screen.queryByText("On the road")).toBeNull();
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest __tests__/db-expeditions.test.ts __tests__/expedition-panel.test.tsx`
Expected: FAIL, `outingGoal is not a function`, "Goal reached" not found.

- [ ] **Step 3: `db/expeditions.ts`**

Append:

```ts
import type { OutingGoal } from "@/src/gps/track";
import type { Target } from "./targets";

/**
 * What the hero set out to do. A distance, when they chose one on the quest screen; otherwise the
 * slot's duration, which is the number the stepper on that screen edits. A rep slot cannot be a
 * walk's goal, and a quest with no slot has none.
 */
export function outingGoal(
  quest: { exercises: { target: Target }[] },
  distanceGoalM: number | null | undefined,
): OutingGoal | null {
  if (distanceGoalM != null && distanceGoalM > 0) return { type: "distance", metres: distanceGoalM };
  const target = quest.exercises[0]?.target;
  return target?.type === "time" ? { type: "time", seconds: target.value } : null;
}

/**
 * Whether this outing is on a mount. Read off the movement rather than asked, because the hero
 * already chose it by choosing the quest. Moved here from the session store so the quest screen
 * can estimate a ride from a distance with the same answer the speed cap uses.
 */
export function isMountedOuting(quest: { exercises: { exercise: { enName: string } }[] }): boolean {
  return quest.exercises.some((slot) => slot.exercise.enName === "Outrider's Ride");
}
```

(Move the two `import type` lines to the top of the file with the existing imports.)

- [ ] **Step 4: `stores/session.ts`**

Delete `mountedExpedition` (lines 563-572) and import `isMountedOuting, outingGoal` from `@/db/expeditions`. Add `distanceGoalM?: number | null;` to the `startSession` options type (line 197-200). Replace `beginTrackingIfOuting`:

```ts
function beginTrackingIfOuting(
  quest: Quest,
  sessionUuid: string | null,
  distanceGoalM: number | null,
): void {
  if (!isExpedition(quest) || sessionUuid === null) return;

  // Fire and forget: the permission dialog and the service start are the expedition store's
  // business, and a session must not wait on a system prompt before its own screen appears.
  // A refusal lands in that store's `error`, which the panel reads.
  //
  // The unit and the haptics preference are resolved here rather than inside that store, and
  // only once the quest is known to be an outing: the store has no business importing settings,
  // which would pull the whole `db` barrel into a module the session screen mounts.
  Promise.all([
    preferences.getDistanceUnit().catch((): DistanceUnit => "metric"),
    preferences.getHapticsEnabled().catch(() => true),
  ])
    .then(([unit, haptics]) =>
      useExpeditionStore.getState().begin(
        sessionUuid,
        {
          title: i18n.t("session.expedition_notification_title"),
          acquiring: i18n.t("session.expedition_acquiring"),
          tracking: i18n.t("session.expedition_tracking"),
          paused: i18n.t("session.expedition_paused"),
          gpsOff: i18n.t("session.expedition_gps_off"),
          reached: i18n.t("session.expedition_reached"),
        },
        isMountedOuting(quest),
        unit,
        outingGoal(quest, distanceGoalM),
        haptics,
      ),
    )
    .catch((error: unknown) => reportError("session.beginTracking", error));
}
```

Change the call inside `startSession` to `beginTrackingIfOuting(quest, get().sessionUuid, options?.distanceGoalM ?? null);`.

- [ ] **Step 5: The panel**

In `components/session/ExpeditionPanel.tsx` replace `statusKey`:

```ts
function statusKey(error: string | null, track: TrackState, goalReached: boolean): string {
  if (error !== null) {
    return error === "permission" || error === "foreground-denied"
      ? "session.expedition_status_denied"
      : "session.expedition_status_error";
  }
  if (track.startedAt === null) return "session.expedition_status_acquiring";
  // Ahead of paused: a hero who met the goal and stopped wants the first fact, not the second.
  if (goalReached) return "session.expedition_reached";
  return track.paused ? "session.expedition_status_paused" : "session.expedition_status_moving";
}
```

In the component add `const goalReached = useExpeditionStore((state) => state.goalReached);` and call `statusKey(error, track, goalReached)`.

- [ ] **Step 6: Locales**

`locales/en.json`, in the `session` block right after `"expedition_status_error"`:

```json
    "expedition_reached": "Goal reached",
```

`locales/fr.json`, same place:

```json
    "expedition_reached": "Objectif atteint",
```

- [ ] **Step 7: Run**

Run: `npx jest __tests__/db-expeditions.test.ts __tests__/expedition-panel.test.tsx __tests__/store-session.test.ts __tests__/locale-style.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add db/expeditions.ts stores/session.ts components/session/ExpeditionPanel.tsx locales/en.json locales/fr.json __tests__/db-expeditions.test.ts __tests__/expedition-panel.test.tsx
git commit -m "A session hands its goal to the outing, and the panel says when it was met"
```

---

### Task 3: A distance goal in the saved quest config

**Files:**
- Modify: `db/targets.ts` (after `TIME_TARGET_MAX`)
- Modify: `db/index.ts:70` (the `./targets` re-export line)
- Modify: `db/questConfig.ts:24-36` (type), `:88-121` (`parseQuestConfig`), `:148-157` (`hasQuestOverrides`)
- Modify: `db/expeditions.ts` (append `estimateDistanceSeconds`)
- Test: `__tests__/db-quest-config.test.ts`, `__tests__/db-expeditions.test.ts`

**Interfaces:**
- Produces: `DISTANCE_GOAL_RANGE = { min: 500, max: 200_000 }`, `DISTANCE_GOAL_STEP = 500`, `DEFAULT_DISTANCE_GOAL_M = 3000` in `db/targets.ts`; `QuestConfig.distanceM?: number`; `estimateDistanceSeconds(metres: number, mounted: boolean): number`.

- [ ] **Step 1: Failing tests**

In `__tests__/db-quest-config.test.ts`, inside the existing `describe` for `parseQuestConfig` (or as new tests at the same level as the others):

```ts
  test("a distance goal is read, clamped to its own range, and counts as an override", () => {
    expect(parseQuestConfig('{"level":"medium","distanceM":5000}')?.distanceM).toBe(5000);
    expect(parseQuestConfig('{"level":"medium","distanceM":100}')?.distanceM).toBe(500);
    expect(parseQuestConfig('{"level":"medium","distanceM":"far"}')?.distanceM).toBeUndefined();
    expect(hasQuestOverrides({ level: Difficulty.Medium, distanceM: 5000 })).toBe(true);
  });

  test("a distance goal survives a save and a read", async () => {
    await saveQuestConfig(1, { level: Difficulty.Medium, distanceM: 4500 });
    const { getQuestConfig } = require("../db/questConfig") as typeof import("../db/questConfig");
    expect((await getQuestConfig(1))?.distanceM).toBe(4500);
    await clearQuestConfig(1);
  });
```

In `__tests__/db-expeditions.test.ts`:

```ts
import { estimateDistanceSeconds } from "@/db/expeditions";

describe("estimateDistanceSeconds", () => {
  test("a walker covers a kilometre in about twelve minutes, a mount in three", () => {
    expect(estimateDistanceSeconds(1000, false)).toBe(714);
    expect(estimateDistanceSeconds(1000, true)).toBe(179);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest __tests__/db-quest-config.test.ts __tests__/db-expeditions.test.ts`
Expected: FAIL (`distanceM` undefined, `estimateDistanceSeconds is not a function`).

- [ ] **Step 3: Implement**

`db/targets.ts`, after `TIME_TARGET_MAX`:

```ts
/**
 * A distance goal, in metres. Not a `QuestTargetType`: `0000_schema.sql` holds `targetType` and
 * `resultType` to `('reps','time')` with a CHECK, and a walk's distance is already written once,
 * on `completed_sessions.leaguesM`. So the goal lives in the hero's quest config and the session
 * still records seconds. See docs/designs/expeditions.md, "After the audit".
 *
 * ponytail: a seeded quest cannot ship a distance goal; if content ever needs one, that is the
 * table rebuild, not a fourth target type bolted on here.
 */
export const DISTANCE_GOAL_RANGE = { min: 500, max: 200_000 };
export const DISTANCE_GOAL_STEP = 500;
export const DEFAULT_DISTANCE_GOAL_M = 3000;
```

`db/index.ts` line 70 re-exports from `./targets` **by name**, so the three constants have to be
added there or Task 4's `@/db` import cannot see them:

```ts
export {
  DEFAULT_DISTANCE_GOAL_M,
  DISTANCE_GOAL_RANGE,
  DISTANCE_GOAL_STEP,
  REST_RANGE,
  ROUNDS_RANGE,
  TARGET_RANGE,
  targetRangeFor,
} from "./targets";
```

`db/questConfig.ts`: import `DISTANCE_GOAL_RANGE` from `./targets` (the file already imports from it). In the `QuestConfig` type, after `roundRestSeconds?: number;`:

```ts
  /**
   * A distance goal for an outing, in metres. Only read when every slot is an expedition; a
   * workout ignores it. Outranks the slot's duration as the goal, never replaces the target: the
   * session still records seconds, and the ground goes on `completed_sessions.leaguesM`.
   */
  distanceM?: number;
```

In `parseQuestConfig`, after the `roundRestSeconds` block:

```ts
  const distanceM = readNumber(record.distanceM, DISTANCE_GOAL_RANGE);
  if (distanceM !== undefined) config.distanceM = distanceM;
```

In `hasQuestOverrides` add `config.distanceM !== undefined ||` to the `||` chain.

`db/expeditions.ts`, append:

```ts
/** Nominal speeds for an estimate, in m/s. A brisk walk and a steady ride; a run sits between. */
const NOMINAL_SPEED_MS = { onFoot: 1.4, mounted: 5.6 } as const;

/**
 * How long a distance goal is likely to take, for the "≈ 40 min" tag on the quest screen. An
 * estimate and labelled as one; XP is paid on moving seconds, never on this.
 */
export function estimateDistanceSeconds(metres: number, mounted: boolean): number {
  const speed = mounted ? NOMINAL_SPEED_MS.mounted : NOMINAL_SPEED_MS.onFoot;
  return Math.max(1, Math.round(metres / speed));
}
```

- [ ] **Step 4: Run**

Run: `npx jest __tests__/db-quest-config.test.ts __tests__/db-expeditions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add db/targets.ts db/index.ts db/questConfig.ts db/expeditions.ts __tests__/db-quest-config.test.ts __tests__/db-expeditions.test.ts
git commit -m "A distance goal lives in the quest config, where a CHECK cannot refuse it"
```

---

### Task 4: Duration or distance, chosen on the quest screen

**Files:**
- Modify: `components/quests/QuestConfigCard.tsx:36-60` (hooks and helpers), `:130-160` (the slot stepper)
- Modify: `app/(tabs)/quests/[id].tsx:362-385` (`derived`), `:437-447` (`proceedToSession`)
- Modify: `locales/en.json` (`quests` block, next to `config_duration`), `locales/fr.json` (same)
- Test: `__tests__/quest-details-expedition.test.tsx`

**Interfaces:**
- Consumes: `DISTANCE_GOAL_RANGE`, `DISTANCE_GOAL_STEP`, `DEFAULT_DISTANCE_GOAL_M` (Task 3, via the `@/db` barrel, which `QuestConfigCard` already imports `targetRangeFor` from), `isOutingSession` and `isMountedOuting`, `estimateDistanceSeconds` (`@/db/expeditions`), `formatDistance` (`@/constants/distanceFormat`).
- Produces: locale key `quests.config_distance`.

- [ ] **Step 1: Failing test**

In `__tests__/quest-details-expedition.test.tsx`:

The `@/stores/settings` mock's state becomes `{ language: "en", distanceUnit: "metric" }` (the card now reads the unit). The `@/db` mock gains three members:

```ts
  DISTANCE_GOAL_RANGE: { min: 500, max: 200000 },
  DISTANCE_GOAL_STEP: 500,
  DEFAULT_DISTANCE_GOAL_M: 3000,
```

Add, in the expedition half of the file:

```ts
  test("an outing can be set by distance instead of by duration", async () => {
    const view = await mountQuest(expeditionQuest());
    fireEvent.press(view.getByText("Distance"));
    expect(view.getByText("3.00 km")).toBeTruthy();
    fireEvent.press(view.getByText("Duration"));
    expect(view.queryByText("3.00 km")).toBeNull();
  });
```

And in the ordinary-workout half:

```ts
  test("a workout offers no distance", async () => {
    const view = await mountQuest(workoutQuest());
    expect(view.queryByText("Distance")).toBeNull();
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/quest-details-expedition.test.tsx`
Expected: FAIL, "Distance" not found.

- [ ] **Step 3: The card**

In `components/quests/QuestConfigCard.tsx`:

Imports to add: `DISTANCE_GOAL_RANGE, DISTANCE_GOAL_STEP, DEFAULT_DISTANCE_GOAL_M` from `@/db` (same line as `targetRangeFor`), `isOutingSession` from `@/db/expeditions`, `formatDistance` from `@/constants/distanceFormat`, `Chip` from `@/components/common/Chip`, `useSettingsStore` from `@/stores/settings`.

Inside the component, after `const modified = hasQuestOverrides(config);`:

```tsx
  // On an outing the one control is the goal, and the goal has two units. "Duration" keeps the
  // slot's target; "Distance" writes `config.distanceM` and the target becomes the fallback the
  // session never reads. Nothing about the quest row changes either way.
  const outing = isOutingSession(quest);
  const byDistance = outing && config.distanceM !== undefined;
  const unit = useSettingsStore((s) => s.distanceUnit);

  const chooseDuration = () => {
    const next = { ...config };
    delete next.distanceM;
    onChange(next);
  };
  const chooseDistance = () => onChange({ ...config, distanceM: DEFAULT_DISTANCE_GOAL_M });
```

Inside the open panel, before the `quest.exercises.map(...)` row, render the toggle:

```tsx
            {outing ? (
              <XStack gap="$2">
                <Chip
                  label={t("quests.config_duration", "Duration")}
                  tone={byDistance ? "default" : "primary"}
                  onPress={chooseDuration}
                />
                <Chip
                  label={t("quests.config_distance", "Distance")}
                  tone={byDistance ? "primary" : "default"}
                  onPress={chooseDistance}
                />
              </XStack>
            ) : null}
```

A distance goal is **one value for the whole quest** (`config.distanceM`), so it gets exactly one
control, rendered next to the toggle and outside the slot list. A duration target is genuinely per
slot, so the existing per-slot steppers stay, and the whole `quest.exercises.map(...)` block is
skipped while the goal is a distance:

```tsx
            {byDistance ? (
              <Stepper
                label={t("quests.config_distance", "Distance")}
                value={config.distanceM ?? DEFAULT_DISTANCE_GOAL_M}
                min={DISTANCE_GOAL_RANGE.min}
                max={DISTANCE_GOAL_RANGE.max}
                step={DISTANCE_GOAL_STEP}
                display={(value) => formatDistance(value, unit)}
                onChange={(value) => onChange({ ...config, distanceM: value })}
              />
            ) : (
              quest.exercises.map((qex) => (
                /* the existing per-slot row, unchanged, comments and swap button included */
              ))
            )}
```

Putting it inside the map instead would render one identical distance stepper per slot on a quest
with two outdoor movements, which the editor's `pickableExercises()` allows and
`docs/designs/expeditions.md` calls reachable content. Cover that shape: a test mounting a
two-slot outing and asserting exactly one distance stepper.

- [ ] **Step 4: The quest screen**

In `app/(tabs)/quests/[id].tsx`, import `estimateDistanceSeconds, isMountedOuting` next to the existing `isOutingSession` import from `@/db/expeditions`. In `derived`:

```ts
    const quest = applyQuestConfig(state.quest, config, indexExercises(catalogue));
    // A distance goal is estimated from a nominal pace; a duration is its own estimate.
    const estimatedSeconds =
      config.distanceM !== undefined && isOutingSession(quest)
        ? estimateDistanceSeconds(config.distanceM, isMountedOuting(quest))
        : estimateQuestSeconds(quest);
```

In `proceedToSession`:

```ts
      await startSession(quest, level, {
        adventureRunStepId: runStepId,
        distanceGoalM: config.distanceM ?? null,
      });
```

- [ ] **Step 5: Locales**

`locales/en.json`, `quests` block, after `"config_duration": "Duration",`:

```json
    "config_distance": "Distance",
```

`locales/fr.json`, after `"config_duration": "Durée",`:

```json
    "config_distance": "Distance",
```

- [ ] **Step 6: Run**

Run: `npx jest __tests__/quest-details-expedition.test.tsx __tests__/quest-details-navigation.test.tsx __tests__/locale-style.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add components/quests/QuestConfigCard.tsx "app/(tabs)/quests/[id].tsx" locales/en.json locales/fr.json __tests__/quest-details-expedition.test.tsx
git commit -m "An outing is set by duration or by distance, and the session buzzes at either"
```

---

### Task 5: The Journal's rows say how far

**Files:**
- Modify: `db/completed.ts:249-285` (`CompletedSessionListItem`, `listCompletedSessions`)
- Modify: `components/journal/SessionCard.tsx:14-30` (`JournalEntry`), `:59` (labels)
- Modify: `app/(tabs)/journal/index.tsx:126-142` (entry mapping)
- Test: `__tests__/db-completed.test.ts` (its `t = createTestDb()` fixture has no `beforeEach` wipe, so the test below clears the two tables itself)

**Interfaces:**
- Produces: `CompletedSessionListItem.leaguesM: number | null`; `JournalEntry.leaguesM: number | null`.

- [ ] **Step 1: Failing test**

In `__tests__/db-completed.test.ts`, inside the existing `describe("db/completed", ...)`:

```ts
  test("the list carries the ground an outing covered, and null for a workout", async () => {
    const { listCompletedSessions } =
      require("../db/completed") as typeof import("../db/completed");
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
    const now = Math.floor(Date.now() / 1000);
    t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, leaguesM) VALUES ('medium', 10, ?, ?)",
      )
      .run(now, 4580);
    t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, ?)",
      )
      .run(now - 60);

    const rows = await listCompletedSessions();
    expect(new Set(rows.map((r) => r.leaguesM))).toEqual(new Set([4580, null]));
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/db-completed.test.ts`
Expected: FAIL, the set holds only `undefined`.

- [ ] **Step 3: Implement**

`db/completed.ts`:

```ts
export type CompletedSessionListItem = Omit<CompletedSession, "exercises" | "uuid"> & {
  hasNewRecords: boolean;
  /** Ground covered, in metres, on an outing; null on a workout. */
  leaguesM: number | null;
};
```

Add `leaguesM: completedQuest.leaguesM,` to the `.select({...})` in `listCompletedSessions` and `leaguesM: r.leaguesM ?? null,` to the mapped object.

`components/journal/SessionCard.tsx`: add `leaguesM: number | null;` to `JournalEntry` after `durationSeconds`. Import `formatDistance` from `@/constants/distanceFormat` and `useSettingsStore` from `@/stores/settings`. In the component:

```ts
  const unit = useSettingsStore((s) => s.distanceUnit);
  const durationLabel = entry.durationSeconds ? formatDuration(entry.durationSeconds) : "--";
  // An outing's row leads with the ground, which is the one number a walk is remembered by.
  const metaLabel =
    entry.leaguesM !== null && entry.leaguesM > 0
      ? `${formatDistance(entry.leaguesM, unit)} · ${durationLabel}`
      : durationLabel;
```

Render `metaLabel` where `durationLabel` was rendered.

`app/(tabs)/journal/index.tsx`, in the entry mapping add `leaguesM: s.leaguesM,`.

- [ ] **Step 4: Run**

Run: `npx jest __tests__/db-completed.test.ts __tests__/journal-cards.test.tsx __tests__/journal-grids.test.ts && npx tsc --noEmit`
Expected: PASS. If a test constructs a `JournalEntry` literal, add `leaguesM: null` to it (tsc names the file).

- [ ] **Step 5: Commit**

```bash
git add db/completed.ts components/journal/SessionCard.tsx "app/(tabs)/journal/index.tsx" __tests__/db-completed.test.ts
git commit -m "A walk's row in the Journal says how far"
```

---

### Task 6: Longest outing and ground covered, as records

**Files:**
- Modify: `db/personalRecords.ts:10-16` (`RecordType`), after `getLongestSession` (new query), `:186-207` (summary), `:209-270` (`checkForNewRecords`)
- Modify: `components/journal/PersonalRecordsCard.tsx:97-140`
- Modify: `components/session/NewRecordsBadge.tsx:21-50`
- Modify: `locales/en.json` (`journal` block after `pr_best_streak`; `session` block after `pr_longest_session`), `locales/fr.json` (same)
- Test: `__tests__/db-personalRecords.test.ts`, `__tests__/journal-cards.test.tsx`

**Interfaces:**
- Produces: `RecordType` gains `"longest_outing"`; `getLongestOuting(): Promise<PersonalRecord | null>`; summary gains `longestOuting: PersonalRecord | null` and `totalLeaguesM: number`; locale keys `journal.pr_ground`, `journal.pr_longest_outing`, `session.pr_longest_outing`.

- [ ] **Step 1: Failing tests**

`__tests__/db-personalRecords.test.ts`:

```ts
  function logOuting(leaguesM: number, secondsAgo: number): number {
    const at = Math.floor(Date.now() / 1000) - secondsAgo;
    const info = t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, leaguesM) VALUES ('medium', 10, ?, ?)",
      )
      .run(at, leaguesM);
    return Number(info.lastInsertRowid);
  }

  test("the longest outing is the most ground in one session, and a workout is not one", async () => {
    const { getLongestOuting, getPersonalRecordsSummary } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    expect(await getLongestOuting()).toBeNull();
    logOuting(2500, 120);
    logOuting(4580, 60);
    expect((await getLongestOuting())?.value).toBe(4580);
    const summary = await getPersonalRecordsSummary();
    expect(summary.longestOuting?.value).toBe(4580);
    expect(summary.totalLeaguesM).toBe(7080);
  });

  test("a longer outing is a new record, with the previous one to beat", async () => {
    const { checkForNewRecords } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    logOuting(2500, 120);
    const id = logOuting(4580, 60);
    const records = await checkForNewRecords(id);
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ recordType: "longest_outing", newValue: 4580, previousValue: 2500 }),
      ]),
    );
  });
```

`__tests__/journal-cards.test.tsx`: the `beforeEach` sets `mockGetPersonalRecordsSummary.mockResolvedValue({ records: [], totalSessions: 0, totalWorkUnits: 0, longestSession: null })`; add `mostXp: null, longestOuting: null, totalLeaguesM: 0` to that object. Then, inside `describe("PersonalRecordsCard", ...)`:

```ts
  it("shows the ground covered once there is any", async () => {
    mockGetPersonalRecordsSummary.mockResolvedValue({
      records: [],
      totalSessions: 3,
      totalWorkUnits: 0,
      longestSession: null,
      mostXp: null,
      longestOuting: { type: "longest_outing", value: 4580, achievedAt: new Date() },
      totalLeaguesM: 7080,
    });
    // `best`, not just `current`/`longest`: the card reads `streakInfo.best` and calls
    // `.toString()` on it. The other tests in this file dodge that by rendering the
    // `totalSessions === 0` early return, which this one does not.
    mockGetStreakInfo.mockResolvedValue({ current: 1, longest: 2, best: 5, isLit: true });

    await mount(<PersonalRecordsCard />);

    expect(await screen.findByText("Ground covered")).toBeTruthy();
    expect(screen.getByText("7.08 km")).toBeTruthy();
    expect(screen.getByText("4.58 km")).toBeTruthy();
  });
```

That file does not mock `@/stores/settings`, so the real store's default unit (`metric`) formats the numbers.

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest __tests__/db-personalRecords.test.ts __tests__/journal-cards.test.tsx`
Expected: FAIL.

- [ ] **Step 3: `db/personalRecords.ts`**

Add `| "longest_outing" // Most ground covered in one outing, metres` to `RecordType`. Import `totalLeaguesM` from `./gps`. After `getLongestSession`:

```ts
/**
 * The most ground in one outing. `leaguesM` is what the reducer credited at save (never a sum
 * over `gps_points`), so this record and the road agree on every metre.
 */
export async function getLongestOuting(): Promise<PersonalRecord | null> {
  const rows = await db
    .select({
      id: completedQuest.id,
      leaguesM: completedQuest.leaguesM,
      performedAt: completedQuest.performedAt,
    })
    .from(completedQuest)
    .where(sql`${completedQuest.leaguesM} IS NOT NULL`)
    .orderBy(desc(completedQuest.leaguesM))
    .limit(1);

  const best = rows[0];
  if (best?.leaguesM == null || best.leaguesM <= 0) return null;

  return {
    type: "longest_outing",
    value: best.leaguesM,
    achievedAt: best.performedAt,
    sessionId: best.id,
  };
}
```

`getPersonalRecordsSummary`:

```ts
export async function getPersonalRecordsSummary(): Promise<{
  longestSession: PersonalRecord | null;
  mostXp: PersonalRecord | null;
  longestOuting: PersonalRecord | null;
  /** Lifetime ground covered, metres. Zero until the first outing. */
  totalLeaguesM: number;
  totalSessions: number;
}> {
  const [longestSession, mostXp, longestOuting, totalLeagues, countResult] = await Promise.all([
    getLongestSession(),
    getMostXpSession(),
    getLongestOuting(),
    totalLeaguesM(),
    db.select({ count: sql<number>`COUNT(*)` }).from(completedQuest),
  ]);

  return {
    longestSession,
    mostXp,
    longestOuting,
    totalLeaguesM: totalLeagues,
    totalSessions: countResult[0]?.count ?? 0,
  };
}
```

`checkForNewRecords`: add `leaguesM: completedQuest.leaguesM,` to the session select, and after the "most XP" block:

```ts
  // Check longest outing. Metres, from the reducer's credit; a workout has null here and skips.
  if (session.leaguesM != null && session.leaguesM > 0) {
    const previousLongest = await db
      .select({ maxM: max(completedQuest.leaguesM) })
      .from(completedQuest)
      .where(sql`${completedQuest.id} != ${sessionId}`);

    const prevMax = previousLongest[0]?.maxM ?? 0;
    if (session.leaguesM > prevMax) {
      newRecords.push({
        isNewRecord: true,
        recordType: "longest_outing",
        newValue: session.leaguesM,
        previousValue: prevMax > 0 ? prevMax : null,
      });
    }
  }
```

- [ ] **Step 4: The card and the badge**

`components/journal/PersonalRecordsCard.tsx`: import `Footprints, Map as MapIcon` from `@/components/icons` (both exist there), `formatDistance` from `@/constants/distanceFormat`, `useSettingsStore` from `@/stores/settings`. In the component `const unit = useSettingsStore((s) => s.distanceUnit);`. After the second `<XStack gap="$2">` row:

```tsx
        {/* Only once there is ground: two "--" tiles would tell a hero who lifts that they are
            missing something, and the band on Home already offers the door. */}
        {summary.totalLeaguesM > 0 ? (
          <XStack gap="$2">
            <RecordItem
              icon={<Footprints size={20} color="$primaryText" />}
              label={t("journal.pr_ground")}
              value={formatDistance(summary.totalLeaguesM, unit)}
            />
            <RecordItem
              icon={<MapIcon size={20} color="$secondary" />}
              label={t("journal.pr_longest_outing")}
              value={summary.longestOuting ? formatDistance(summary.longestOuting.value, unit) : "--"}
            />
          </XStack>
        ) : null}
```

`components/session/NewRecordsBadge.tsx`: import `Footprints`; add to `RecordIcon`:

```tsx
    case "longest_outing":
      return <Footprints size={20} color="$primaryText" />;
```

and to `RecordLabel`:

```tsx
    case "longest_outing":
      return t("session.pr_longest_outing");
```

- [ ] **Step 5: Locales**

`locales/en.json`, `journal` block after `"pr_best_streak"`:

```json
    "pr_ground": "Ground covered",
    "pr_longest_outing": "Longest outing",
```

`session` block after `"pr_longest_session"`:

```json
    "pr_longest_outing": "Longest outing",
```

`locales/fr.json`, `journal` block:

```json
    "pr_ground": "Terrain parcouru",
    "pr_longest_outing": "Plus longue sortie",
```

`session` block:

```json
    "pr_longest_outing": "Plus longue sortie",
```

- [ ] **Step 6: Run**

Run: `npx jest __tests__/db-personalRecords.test.ts __tests__/journal-cards.test.tsx __tests__/victory-expedition.test.tsx __tests__/store-session.test.ts && npx tsc --noEmit`
Expected: PASS. `recordCue` needs no change: `comparableUnit` returns null for the new type, so the victory cameo uses the plain "personal record" pool, which is right (a villager quoting "two kilometres more than last time" would be talking about something the hero never aimed at, same as longest session).

- [ ] **Step 7: Commit**

```bash
git add db/personalRecords.ts components/journal/PersonalRecordsCard.tsx components/session/NewRecordsBadge.tsx locales/en.json locales/fr.json __tests__/db-personalRecords.test.ts __tests__/journal-cards.test.tsx
git commit -m "The longest outing is a record, and the Journal totals the ground"
```

---

### Task 7: An oath sworn in leagues

**Files:**
- Modify: `db/gps.ts` (export `METRES_PER_LEAGUE`), `db/village.ts:278` (import it instead of declaring it)
- Modify: `db/oaths.ts:15-22` (`oathMetrics`), `:74-85` (presets), `:180-240` (`measure`)
- Modify: `app/oath.tsx:39-46` (`METRICS`), `:200-207` (`DEFAULT_TARGET`)
- Modify: `locales/en.json` (`oath` block next to `metric_label_weekly_sessions` / `metric_weekly_sessions`), `locales/fr.json` (same)
- Test: `__tests__/db-oaths.test.ts`

**Interfaces:**
- Produces: `METRES_PER_LEAGUE` exported from `db/gps.ts`; `OathMetric` gains `"leagues"`; preset `leagues_50`; locale keys `oath.metric_label_leagues`, `oath.metric_leagues`.

- [ ] **Step 1: Failing test**

In `__tests__/db-oaths.test.ts`:

```ts
  test("leagues count the ground written on sessions, in whole leagues", async () => {
    const { swearOath, getOathProgress } = oaths();
    const now = Math.floor(Date.now() / 1000);
    const insert = t.sqlite.prepare(
      "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, leaguesM) VALUES ('medium', 10, ?, ?)",
    );
    insert.run(now - 120, 2500);
    insert.run(now - 60, 3000);
    logSessionAt(1); // a workout, no ground

    await swearOath({ metric: "leagues", target: 50, exerciseId: null });
    const progress = await getOathProgress();
    expect(progress?.current).toBe(5);
    expect(progress?.isFulfilled).toBe(false);
  });
```

(Check `swearOath`'s input type at `db/oaths.ts:144` and match it exactly; `weeklyTarget` is optional there.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/db-oaths.test.ts`
Expected: FAIL, `"leagues"` is not an `OathMetric` (tsc) or rejected at runtime.

- [ ] **Step 3: Move the constant**

`db/gps.ts`, above `totalLeaguesM`:

```ts
/**
 * One league is a kilometre here. The one place that knows the scale: the road's floors, the
 * oath's target and every "N leagues" a screen prints divide by this.
 */
export const METRES_PER_LEAGUE = 1000;
```

`db/village.ts`: delete `const METRES_PER_LEAGUE = 1000;` at line 278 and extend the existing `import { totalLeaguesM } from "./gps";` to `import { METRES_PER_LEAGUE, totalLeaguesM } from "./gps";`. Keep the comment above the old line; it still describes the floors.

- [ ] **Step 4: `db/oaths.ts`**

`oathMetrics`:

```ts
export const oathMetrics = [
  "exercise_pr", // best single result on one exercise ("10 pull-ups in a row")
  "exercise_volume", // cumulated reps/seconds on one exercise ("1000 push-ups")
  "sessions", // total sessions logged
  "streak", // best flame ever reached
  "weekly_sessions", // weeks that hit a session quota ("3 a week, for 8 weeks")
  "leagues", // ground covered beyond the walls, lifetime ("50 leagues")
] as const;
```

Import: `import { METRES_PER_LEAGUE, totalLeaguesM } from "./gps";`

Preset, after `sessions_50`:

```ts
  // The one oath a hero who only walks can keep. Lifetime, like `sessions`: the road is paid
  // the same way, and an oath that started counting at zero would disagree with it.
  { id: "leagues_50", metric: "leagues", target: 50 },
```

In `measure`, before `case "weekly_sessions":`:

```ts
    case "leagues":
      // Whole leagues, the unit the target is written in. Same column the road reads.
      return Math.floor((await totalLeaguesM()) / METRES_PER_LEAGUE);
```

- [ ] **Step 5: `app/oath.tsx`**

Add `"leagues"` at the end of the `METRICS` array and `leagues: 50,` to `DEFAULT_TARGET`.

- [ ] **Step 6: Locales**

`locales/en.json`, `oath` block, after `"metric_label_weekly_sessions"`:

```json
    "metric_label_leagues": "Leagues",
```

after `"metric_weekly_sessions"`:

```json
    "metric_leagues": "{{count}} leagues beyond the walls",
```

`locales/fr.json`, same anchors:

```json
    "metric_label_leagues": "Lieues",
```

```json
    "metric_leagues": "{{count}} lieues hors des murs",
```

- [ ] **Step 7: Run**

Run: `npx jest __tests__/db-oaths.test.ts __tests__/db-village.test.ts __tests__/db-village-buildings.test.ts __tests__/oath-current-card.test.tsx __tests__/oath-card-climb.test.tsx __tests__/locale-style.test.ts && npx tsc --noEmit`
Expected: PASS. The preset test "every preset is a unique, valid, swearable oath" covers `leagues_50` for free. `useOathText` reads `oath.metric_${metric}` generically, so the Home card labels the new metric with no change.

- [ ] **Step 8: Commit**

```bash
git add db/gps.ts db/village.ts db/oaths.ts app/oath.tsx locales/en.json locales/fr.json __tests__/db-oaths.test.ts
git commit -m "An oath can be sworn in leagues, on the column the road already reads"
```

---

### Task 8: Home serves a leagues oath with a door out

**Files:**
- Modify: `components/home/useSmartAction.ts:1-15` (imports), `:126-170` (rule 2)
- Test: `__tests__/home-smart-action.test.ts`

**Interfaces:**
- Consumes: `listOutings()` from `@/db/outings`; `OathProgress.oath.metric === "leagues"` (Task 7).

- [ ] **Step 1: Failing test**

In `__tests__/home-smart-action.test.ts`, add a module mock next to the others:

```ts
jest.mock("@/db/outings", () => ({
  listOutings: jest.fn().mockResolvedValue([]),
}));
const { listOutings } = require("@/db/outings");
```

Then, next to "falls back to the weak areas when the oath names no exercise":

```ts
  it("serves a leagues oath with the first way out, not a lifting quest", async () => {
    getOathProgress.mockResolvedValue({
      oath: { metric: "leagues", target: 50, exerciseId: null },
      isFulfilled: false,
      exerciseName: null,
    });
    listOutings.mockResolvedValue([
      { quest: { id: 40 }, exercise: { enName: "Warden's Walk" } },
    ]);
    loadConfiguredQuest.mockResolvedValue(questNamed(40, "The Warden's Round"));

    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    expect(loadConfiguredQuest).toHaveBeenCalledWith(40);
    expect(result.current.config?.scene?.title).toBe("The Warden's Round");
    expect(result.current.config?.subtext).toBe("Toward your oath: 50 leagues beyond the walls");
  });
```

The `t` mock in that file walks `locales/en.json`, so `oath.metric_leagues` resolves once Task 7 has added the key.

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/home-smart-action.test.ts`
Expected: FAIL, `loadConfiguredQuest` called with 12 (the weak-area fallback).

- [ ] **Step 3: Implement**

Import `listOutings` from `@/db/outings`. After the `if (oathExerciseId !== null && !isCancelled()) { ... }` block of rule 2 and before the rule 3 comment:

```ts
        // 2b. An oath in leagues names no exercise, so the chain above cannot serve it, and the
        //     muscle rule below never will: an outing carries no muscles by design (0041). The
        //     first door out is the answer; the hero picks the duration on the quest screen.
        if (oath && !oath.isFulfilled && oath.oath.metric === "leagues" && !isCancelled()) {
          const outing = (await listOutings())[0];
          if (outing) {
            const action = await questAction(
              outing.quest.id,
              t("home.oath_focus_simple", {
                goal: t("oath.metric_leagues", { count: oath.oath.target }),
              }),
            );
            if (action && !isCancelled()) {
              setConfig(action);
              setIsLoading(false);
              return;
            }
          }
        }
```

- [ ] **Step 4: Run**

Run: `npx jest __tests__/home-smart-action.test.ts __tests__/home-outside-band.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/home/useSmartAction.ts __tests__/home-smart-action.test.ts
git commit -m "Home serves a leagues oath with a door out"
```

---

### Task 9: The road's floors, from a measured walk

**Files:**
- Modify: `db/village.ts:281-295` (`ROAD_FLOORS` and its comment)
- Modify: `docs/content/missing-image.md:52-54` and `:654-660` (§9b)
- Test: `__tests__/db-village-buildings.test.ts:185-198` (already pins level 1 at 1 league; unchanged)

No gate is added. The design doc's answer stands: the road upgrades reach, and there is no content to put behind a level. What changes is that the floors stop being a guess, and that the road's art, which exists and is registered, stops being documented as missing.

- [ ] **Step 1: Re-tune**

Replace `ROAD_FLOORS` and the comment above it with:

```ts
/**
 * The road's floors, in leagues. Corrected 2026-09-02 against the first real total: one hour on
 * foot measured 4.58 km (test-gpx/bati-2026-09-01T15-47-17.gpx), so an outing on foot is four to
 * five leagues, not one, and a ride is four times that. The first floor stays at one league so
 * the very first walk levels the road; the rest read as roughly 3, 9, 20 and 45 walks, or a
 * quarter of that on a mount.
 *
 * Re-tune here and nowhere else; nothing but this table and METRES_PER_LEAGUE knows the scale.
 */
const ROAD_FLOORS: readonly number[] = [1, 15, 40, 90, 200];
```

- [ ] **Step 2: Run**

Run: `npx jest __tests__/db-village-buildings.test.ts __tests__/db-village.test.ts`
Expected: PASS (the test walks 1.5 leagues and expects level 1, which floor 1 still gives).

- [ ] **Step 3: §9b**

In `docs/content/missing-image.md`, change the line-52 bullet to:

```md
- **§9b RESOLVED (2026-09-02)**: the `high_road` has its three stages
  (`assets/images/village/buildings/high_road{_rough,,_grand}.webp`) registered in
  `BUILDING_ICON_ASSETS`; its floors were corrected the same day against a measured walk.
```

and retitle the section at line 654 `### 9b. RESOLVED — the High Road has art (2026-09-02)`, keeping its body and adding one line: `Resolved: the three stages exist and are registered; see the bullet at the top.`

- [ ] **Step 4: Commit**

```bash
git add db/village.ts docs/content/missing-image.md
git commit -m "The road's floors come from a measured walk, and its art is no longer missing"
```

---

### Task 10: The product docs know expeditions exist

**Files:**
- Create: `docs/gameplay/expeditions.md`
- Modify: `docs/gameplay/README.md:17-26` (list), `docs/README.md:54-60` (table)
- Modify: `docs/product/feature-overview.md:44-63` (after "Active Session"; Village bullet), `docs/product/user-guide.md:92-98` (after "6) Set an objective"), `:151-162` (Home), `:123-137` (features by page)
- Modify: `docs/designs/expeditions.md` (append a section)

- [ ] **Step 1: `docs/gameplay/expeditions.md`**

```md
# Expeditions

> Walking, running and riding: the only things that take the hero out of the walls.

## What one is

An expedition is a quest with one movement and one round, whose movement carries the `expedition`
style. Three are seeded (The Warden's Round on foot, Word Must Travel at a run, The Long Reach on
a mount) and a hero can write their own in the editor. Home's "Head out" band lists every quest
whose every slot is an expedition; the gallery's "Outside" chip lists any quest with one.

## The goal

On the quest screen the hero sets either a **duration** or a **distance**. The session shows no
countdown: the phone is in a pocket. When the goal is met, the phone buzzes once and the ongoing
notification says "Goal reached". Walking past it costs nothing and earns normally.

A duration is measured in *moving* seconds, the same witness XP is paid in. A distance is the
reducer's credited ground (`src/gps/track.ts`), never a raw sum of fixes.

## What it pays

- **XP**, on moving seconds, with no target ceiling.
- **Leagues** (one per kilometre), written once on `completed_sessions.leaguesM`. They drive the
  High Road in the village, the "Ground covered" total and "Longest outing" record in the
  Journal, and an oath sworn in leagues. They never convert to reps, damage or village volume.
- **A trace**, on the phone only, drawn on the recap map and exportable as GPX.

## Where the rules live

- Predicates: `db/expeditions.ts`. Goal and reducer: `src/gps/track.ts`, `stores/expedition.ts`.
- Economy: `db/workUnits.ts` (`NON_REP_STYLE` converts to zero), `db/xp.ts` (outing branch).
- Road floors: `db/village.ts` (`ROAD_FLOORS`). Scale: `db/gps.ts` (`METRES_PER_LEAGUE`).
- Design: [`../designs/expeditions.md`](../designs/expeditions.md),
  [`../designs/gps-without-google.md`](../designs/gps-without-google.md).
```

- [ ] **Step 2: Indexes**

`docs/gameplay/README.md`, after the `quests.md` line:

```md
- [expeditions.md](expeditions.md) — Walking, running, riding: the goal, the leagues, the road
```

`docs/README.md`, after the `quests.md` row:

```md
| [expeditions.md](gameplay/expeditions.md) | Walking, running, riding: the goal, the leagues, the road |
```

- [ ] **Step 3: `docs/product/feature-overview.md`**

After the "Active Session" block and before the `---`:

```md
### Expeditions (Outings)

Walking, running and riding, measured by GPS, offline.

- **What**: A one-movement quest whose goal is a duration or a distance
- **Contains**: Live distance, moving time and pace; a buzz at the goal; a recap map; GPX export
- **Pays**: XP on moving time, and leagues that raise the High Road
- **Doc**: [EXPEDITIONS.md](../gameplay/expeditions.md)
```

In the "Village" section add a bullet: `- **High Road**: the one building leagues raise, and no amount of lifting can`.

- [ ] **Step 4: `docs/product/user-guide.md`**

After "### 6) Set an objective (Oath)":

```md
### 7) Go outside (Expeditions)

- Tap a tile in the "Head out" band on Home: a walk, a run or a ride.
- Set a duration or a distance, then start. The phone buzzes once when you reach it.
- Come back to the ground covered, your pace, a map of the route, and leagues on the High Road.
```

In the "Home" section add a line: `- The "Head out" band under the stage opens a walk, a run or a ride.`

In "Features by page", after the Quest Details line:

```md
- **Expedition (session)** → live distance, moving time, pace; buzzes at the goal; recap map after.
```

- [ ] **Step 5: `docs/designs/expeditions.md`**

Append at the end, before "What I noticed about how you think":

```md
### After the audit, 2026-09-02
A product audit of the shipped feature found six gaps. All six landed on `v2-gps`:

1. **The goal is real.** The duration the hero set was ignored by the session. Now the expedition
   store checks it on every fix (the only clock that runs in a pocket), buzzes once and rewrites
   the notification. `src/gps/track.ts` `goalReached`.
2. **A distance goal**, as premise 3 promised. It lives in `QuestConfig.distanceM`, not in
   `quest_exercises`: `0000_schema.sql` holds `targetType` to `('reps','time')` with a CHECK, and
   the ground is already written once on `completed_sessions.leaguesM`. Premise 7's trap is
   avoided by never adding the type at all.
3. **The Journal** shows the distance on an outing's row, a "Ground covered" total and a
   "Longest outing" record.
4. **An oath in leagues** (`leagues_50` preset), lifetime like `sessions`. Home serves it with the
   first door out, since the exercise chain and the muscle rule cannot. Open question 6 is closed.
5. **The road's floors** are corrected against the first measured walk (4.58 km in an hour):
   `[1, 15, 40, 90, 200]`. No gate was added; reach is still the reward, on purpose.
6. **The product docs** say the feature exists: `docs/gameplay/expeditions.md`, the feature
   overview and the user guide.

Left where the audit found them, deliberately: the level chips and the "Done" verb on an
outing's quest screen (not among the six), and the stopwatch with no goal at all (v2.1, the
clamp is still owed).
```

- [ ] **Step 6: Full check and commit**

Run: `npm run check && npm test`
Expected: green. Then:

```bash
git add docs/gameplay/expeditions.md docs/gameplay/README.md docs/README.md docs/product/feature-overview.md docs/product/user-guide.md docs/designs/expeditions.md
git commit -m "The product docs know that expeditions exist"
```

---

## Self-review

- **Spec coverage.** Audit point 1 → Tasks 1-2. Point 2 → Tasks 3-4 (and the cue in Task 1 fires on distance). Point 3 → Tasks 5-6. Point 4 → Tasks 7-8. Point 5 → Task 9. Point 6 → Task 10.
- **Types.** `OutingGoal` is defined once (Task 1) and consumed by `outingGoal` (Task 2) and the store. `begin`'s two new positional parameters are used in the same order by Task 2's `beginTrackingIfOuting` and by every new test. `RecordType` `"longest_outing"` is the string used in the badge, the summary and the tests. `METRES_PER_LEAGUE` has exactly one definition after Task 7.
- **Not done, and said so.** No gate behind the road (nothing to gate). No `distance` in `questTargetTypes` (CHECK constraint; documented in `db/targets.ts` with a `ponytail:` comment). Home's stage starts a quest through `loadConfiguredQuest` without reading `distanceM`; it never starts an outing today (the band opens the detail screen), so the goal falls back to the duration there, which is correct.
