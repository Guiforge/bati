/**
 * The numbers a hero reads on screen, measured from a database by the app's own read paths.
 *
 * `measureHero` must be called after `jest.doMock("../db/client", …)` pointing at the database to
 * read, and `jest.resetModules()`: the streak memo and the short-lived query cache are module
 * state, and a second hero measured through them would read the first one's numbers.
 *
 * Plain values only, and no localized text: this is what gets frozen in a snapshot, and a copy
 * edit is not a data regression.
 */

/** 2026-03-15 12:00 UTC. Noon, so the local day is the same in every timezone within ±11 h. */
export const GOLDEN_NOW = Date.UTC(2026, 2, 15, 12, 0, 0);

/**
 * Fakes `Date` and nothing else. A faked `setImmediate` or `nextTick` stalls the database's
 * promise chain, which is why the list is of what is left alone.
 */
export function pinClock() {
  jest.useFakeTimers({
    now: GOLDEN_NOW,
    doNotFake: [
      "hrtime",
      "nextTick",
      "performance",
      "queueMicrotask",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "requestIdleCallback",
      "cancelIdleCallback",
      "setImmediate",
      "clearImmediate",
      "setInterval",
      "clearInterval",
      "setTimeout",
      "clearTimeout",
    ],
  });
}

/** `a.b[2].c` -> value, for every leaf. The diff below is over these. */
function flatten(value: unknown, prefix = "", out: Record<string, unknown> = {}) {
  if (Array.isArray(value)) {
    if (value.length === 0) out[prefix] = "[]";
    value.forEach((item, i) => {
      flatten(item, `${prefix}[${i}]`, out);
    });
  } else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      flatten(item, prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out[prefix] = value;
  }
  return out;
}

/** Each figure that differs, as a line a human can read in a failing CI log. */
export function figuresThatMoved(before: unknown, after: unknown): string[] {
  const a = flatten(before);
  const b = flatten(after);
  const moved: string[] = [];
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      moved.push(`${key}: ${JSON.stringify(a[key])} -> ${JSON.stringify(b[key])}`);
    }
  }
  return moved;
}

export type HeroNumbers = Awaited<ReturnType<typeof measureHero>>;

/**
 * The pure rules, on a grid. A three-year hero stands at level 34 and never touches the first
 * twenty thresholds, the tier floors below them, or what one session is *worth*: the seed writes
 * `xpEarned` itself. So the rules are frozen directly, at the values a hero meets on the way.
 */
export function measureRules() {
  const { calculateLevelFromXp, getXpForLevel } =
    require("../../db/userLevel") as typeof import("../../db/userLevel");
  const { getVillageTier } = require("../../db/village") as typeof import("../../db/village");
  const { getFlameLevel } = require("../../db/streaks") as typeof import("../../db/streaks");
  const { computeSessionXp } = require("../../db/xp") as typeof import("../../db/xp");
  const { scaleBossHp } = require("../../db/bossFights") as typeof import("../../db/bossFights");

  const xps = [0, 99, 100, 299, 300, 1000, 2500, 5000, 10000, 20000, 25000, 60000];
  const levels = Array.from({ length: 45 }, (_, i) => i + 1);
  const streaks = [0, 1, 2, 3, 6, 7, 13, 14, 29, 30, 59, 60, 99, 100, 365, 1000];
  const difficulties = ["easy", "medium", "hard"] as const;

  const set = (
    difficulty: (typeof difficulties)[number],
    type: "reps" | "time",
    value: number,
  ) => ({
    exercise: { secondsPerRep: 3, difficulty, style: "strength" as const },
    target: { type, value },
    result: { type, value },
  });

  return {
    levelOfXp: Object.fromEntries(xps.map((xp) => [xp, calculateLevelFromXp(xp)])),
    xpOfLevel: Object.fromEntries(levels.map((l) => [l, getXpForLevel(l)])),
    tierOfLevel: Object.fromEntries(levels.map((l) => [l, getVillageTier(l)])),
    flameOfStreak: Object.fromEntries(streaks.map((d) => [d, getFlameLevel(d)])),
    bossPool: Object.fromEntries(difficulties.map((d) => [d, scaleBossHp(1000, d)])),
    sessionXp: Object.fromEntries(
      difficulties.flatMap((userLevel) =>
        (["easy", "medium", "hard"] as const).flatMap((exercise) => [
          [
            `${userLevel}/${exercise}/3x12reps`,
            computeSessionXp({
              sets: [1, 2, 3].map(() => set(exercise, "reps", 12)),
              effortCeilingSeconds: 1800,
              userLevel,
            }),
          ],
          [
            `${userLevel}/${exercise}/2x45s`,
            computeSessionXp({
              sets: [1, 2].map(() => set(exercise, "time", 45)),
              effortCeilingSeconds: 600,
              userLevel,
            }),
          ],
        ]),
      ),
    ),
    // A stretch is priced below a hold of the same length (`STYLE_WEIGHT`), one case per difficulty.
    yogaSessionXp: Object.fromEntries(
      difficulties.map((exercise) => [
        `medium/${exercise}/2x45s`,
        computeSessionXp({
          sets: [1, 2].map(() => ({
            ...set(exercise, "time", 45),
            exercise: { secondsPerRep: 3, difficulty: exercise, style: "yoga" as const },
          })),
          effortCeilingSeconds: 600,
          userLevel: "medium",
        }),
      ]),
    ),
    // The bounds, one case each: the clock capping the claim, a result past its target, the
    // floor, and the ceiling of what one session can pay.
    sessionXpBounds: {
      clockCapsTheClaim: computeSessionXp({
        sets: [1, 2, 3].map(() => set("hard", "reps", 12)),
        effortCeilingSeconds: 60,
        userLevel: "hard",
      }),
      overshootingTheTarget: computeSessionXp({
        sets: [1, 2, 3].map(() => ({
          ...set("medium", "reps", 10),
          result: { type: "reps" as const, value: 30 },
        })),
        effortCeilingSeconds: 1800,
        userLevel: "medium",
      }),
      floor: computeSessionXp({
        sets: [set("easy", "reps", 1)],
        effortCeilingSeconds: 600,
        userLevel: "easy",
      }),
      ceiling: computeSessionXp({
        sets: Array.from({ length: 200 }, () => set("hard", "reps", 30)),
        effortCeilingSeconds: 100000,
        userLevel: "hard",
      }),
    },
    outingXp: {
      walk1h: computeSessionXp({
        sets: [],
        effortCeilingSeconds: 3600,
        outing: { seconds: 3600, locomotion: "walk" },
        userLevel: "medium",
      }),
      run1h: computeSessionXp({
        sets: [],
        effortCeilingSeconds: 3600,
        outing: { seconds: 3600, locomotion: "run" },
        userLevel: "medium",
      }),
      walk1hAfter2h: computeSessionXp({
        sets: [],
        effortCeilingSeconds: 3600,
        outing: { seconds: 3600, locomotion: "walk" },
        priorOutingSecondsToday: 7200,
        userLevel: "medium",
      }),
    },
  };
}

export async function measureHero(now: Date = new Date(GOLDEN_NOW)) {
  const { getTotalXp, getUserLevelInfo } =
    require("../../db/userLevel") as typeof import("../../db/userLevel");
  const { getFlameDetail } = require("../../db/streaks") as typeof import("../../db/streaks");
  const { getRecordWall } = require("../../db/journal") as typeof import("../../db/journal");
  const { getMovementRecords } =
    require("../../db/personalRecords") as typeof import("../../db/personalRecords");
  const { getVillageScene } = require("../../db/village") as typeof import("../../db/village");
  const { getAllAchievementsWithProgress } =
    require("../../db/achievements") as typeof import("../../db/achievements");
  const { getSessionAggregates } =
    require("../../db/completed") as typeof import("../../db/completed");

  const { getOrCreateBossFight } =
    require("../../db/bossFights") as typeof import("../../db/bossFights");
  const { db } = require("../../db/client") as typeof import("../../db/client");
  const { adventures } = require("../../db/schema") as typeof import("../../db/schema");

  const level = await getUserLevelInfo();
  // Every boss campaign's pool at the hero's difficulty. Creating the fight is the only way to
  // read it, and it is the number a hero meets on the boss panel.
  const bosses: { adventureId: number; totalHp: number }[] = [];
  const campaigns = await db
    .select({ id: adventures.id, hp: adventures.bossTotalHp })
    .from(adventures);
  for (const campaign of campaigns) {
    if (campaign.hp === null) continue;
    const fight = await getOrCreateBossFight(campaign.id, "hard");
    if (!fight) throw new Error(`no boss fight for adventure ${campaign.id}`);
    bosses.push({ adventureId: campaign.id, totalHp: fight.totalHp });
  }
  const flame = await getFlameDetail(now);
  const scene = await getVillageScene();
  const aggregates = await getSessionAggregates();
  const achievements = await getAllAchievementsWithProgress();

  return {
    sessions: aggregates,
    totalXp: await getTotalXp(),
    level: {
      level: level.level,
      currentLevelXp: level.currentLevelXp,
      xpToNextLevel: level.xpToNextLevel,
    },
    flame,
    records: {
      // Ids and numbers, never names or art paths: renaming a movement is not a data regression.
      wall: (await getRecordWall(8)).map((e) => ({
        exerciseId: e.exerciseId,
        type: e.type,
        best: e.best,
        last: e.last,
        recordSessionId: e.recordSessionId,
        seasonBest: e.seasonBest,
      })),
      movements: (await getMovementRecords(12)).map((e) => ({
        exerciseId: e.exerciseId,
        type: e.type,
        best: e.best,
        last: e.last,
      })),
    },
    village: {
      tier: scene.tier,
      level: scene.level,
      totalXp: scene.totalXp,
      streakDays: scene.streakDays,
      dominantSport: scene.dominantSport && {
        muscle: scene.dominantSport.muscle,
        percentage: Math.round(scene.dominantSport.percentage * 100) / 100,
      },
      buildings: scene.buildings.length,
    },
    bosses,
    achievements: achievements.map((a) => ({
      code: a.definition.code,
      isUnlocked: a.isUnlocked,
      currentValue: a.currentValue,
      targetValue: a.targetValue,
    })),
  };
}
