import { eq, isNotNull, sql } from "drizzle-orm";
import { achievementDefinitions, getUnlockedAchievements } from "./achievements";
import { listFinishedRunSummaries } from "./adventures";
import { db, schema } from "./client";
import { getMuscleBalance } from "./muscleBalance";
import {
  type BuildingCode,
  type BuildingTier,
  buildingCodes,
  buildingDefinitions,
  buildingLevelThresholds,
  type ExerciseStyle,
  type MuscleCode,
} from "./schema";
import { getStreakInfo } from "./streaks";
import { getUserLevelInfo } from "./userLevel";

const { bossFights, adventures, exercises, completedExercises } = schema;

// Same fallback used by every getXAsset() helper in constants/assetMap.ts — never expose
// `| null` for imagePath, resolve to the placeholder here so callers have one code path.
const PLACEHOLDER_IMAGE_PATH = "assets/placeholder.jpg";

export type VillageTier = 1 | 2 | 3 | 4 | 5;

// Level buckets for the 5 illustrated tiers (hameau -> village -> bourg -> cité -> cité florissante).
// Derived from the existing 20-level curve in db/userLevel.ts; no separate threshold table.
const TIER_LEVEL_FLOORS: Record<VillageTier, number> = {
  1: 1,
  2: 5,
  3: 10,
  4: 15,
  5: 20,
};

// Shared by the village scene and the home teaser, so the two can never disagree.
export const TIER_NAMES: Record<VillageTier, { en: string; fr: string }> = {
  1: { en: "Hamlet", fr: "Hameau" },
  2: { en: "Village", fr: "Village" },
  3: { en: "Town", fr: "Bourg" },
  4: { en: "City", fr: "Cité" },
  5: { en: "Flourishing City", fr: "Cité florissante" },
};

export function getVillageTier(level: number): VillageTier {
  let tier: VillageTier = 1;
  for (const [tierStr, floor] of Object.entries(TIER_LEVEL_FLOORS)) {
    if (level >= floor) tier = Number(tierStr) as VillageTier;
  }
  return tier;
}

export type FlameLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Matches the flame table in docs/gameplay/progression.md. The unit is days the flame stayed
// lit (see db/streaks.ts), not days trained in a row — rest days count.
export function getFlameLevel(streakDays: number): FlameLevel {
  if (streakDays >= 100) return 5;
  if (streakDays >= 30) return 4;
  if (streakDays >= 14) return 3;
  if (streakDays >= 7) return 2;
  if (streakDays >= 3) return 1;
  return 0;
}

export type BossBanner = {
  adventureId: number;
  enTitle: string;
  frTitle: string;
  imagePath: string;
  defeatedAt: Date;
};

/**
 * Bosses the hero has beaten, from both records that prove it.
 *
 * `boss_fights.defeatedAt` is the live fight and resetBossFight() nulls it the moment a
 * replay starts, so it alone would blink a trophy out of the shelf — and drop the legendary
 * buildings that count it — for as long as the rematch lasts. A finished boss campaign in
 * `adventure_runs` is never deleted, so it carries the victory across the replay.
 */
export async function getBossBanners(): Promise<BossBanner[]> {
  const [rows, summaries] = await Promise.all([
    db
      .select({
        adventureId: bossFights.adventureId,
        enTitle: adventures.enTitle,
        frTitle: adventures.frTitle,
        imagePath: adventures.imagePath,
        defeatedAt: bossFights.defeatedAt,
      })
      .from(bossFights)
      .innerJoin(adventures, eq(bossFights.adventureId, adventures.id))
      .where(isNotNull(bossFights.defeatedAt)),
    listFinishedRunSummaries(),
  ]);

  const banners = new Map<number, BossBanner>();

  for (const s of summaries) {
    if (s.kind !== "boss" || !s.lastFinishedAt) continue;
    banners.set(s.adventureId, {
      adventureId: s.adventureId,
      enTitle: s.enTitle,
      frTitle: s.frTitle,
      imagePath: s.imagePath ?? PLACEHOLDER_IMAGE_PATH,
      defeatedAt: s.lastFinishedAt,
    });
  }

  // A standing defeat wins on the date: it is the fight itself, not the campaign around it.
  for (const row of rows) {
    if (!row.defeatedAt) continue;
    banners.set(row.adventureId, {
      adventureId: row.adventureId,
      enTitle: row.enTitle,
      frTitle: row.frTitle,
      imagePath: row.imagePath ?? PLACEHOLDER_IMAGE_PATH,
      defeatedAt: row.defeatedAt,
    });
  }

  return [...banners.values()];
}

type RunTally = {
  /** Finished campaigns of every kind — the Hall of Heroes counts these. */
  finishedRuns: number;
  /** Finished boss campaigns, replays included — the arena counts these. */
  bossVictories: number;
};

async function tallyFinishedRuns(): Promise<RunTally> {
  const summaries = await listFinishedRunSummaries();

  let finishedRuns = 0;
  let bossVictories = 0;
  for (const s of summaries) {
    finishedRuns += s.timesFinished;
    if (s.kind === "boss") bossVictories += s.timesFinished;
  }

  return { finishedRuns, bossVictories };
}

export type DominantSportOverlay = {
  muscle: MuscleCode;
  percentage: number;
} | null;

export async function getDominantSportOverlay(): Promise<DominantSportOverlay> {
  const balance = await getMuscleBalance("7d");
  if (balance.totalVolume === 0) return null;

  const top = [...balance.muscles].sort((a, b) => b.percentage - a.percentage)[0];
  if (!top || top.percentage === 0) return null;

  return { muscle: top.muscle, percentage: top.percentage };
}

// ------------------------------------------------------------
// Buildings (derived, never stored)
// ------------------------------------------------------------

// Same convention as MUSCLE_LABELS in db/muscles.ts: labels live next to the data,
// not in locales/*.json, so a new building code is one edit instead of three.
export const BUILDING_LABELS: Record<BuildingCode, { en: string; fr: string }> = {
  campfire: { en: "Campfire", fr: "Feu de camp" },
  tent: { en: "Tent", fr: "Tente" },
  training_dummy: { en: "Training Dummy", fr: "Mannequin d'entraînement" },
  archery_range: { en: "Archery Range", fr: "Champ de tir" },
  quarry: { en: "Quarry", fr: "Carrière" },
  forge: { en: "Forge", fr: "Forge" },
  well: { en: "Well", fr: "Puits" },
  windmill: { en: "Windmill", fr: "Moulin" },
  farm: { en: "Farm", fr: "Ferme" },
  wizard_tower: { en: "Wizard Tower", fr: "Tour du mage" },
  druid_grove: { en: "Druid Grove", fr: "Bosquet druidique" },
  watchtower: { en: "Watchtower", fr: "Tour de guet" },
  castle_wall: { en: "Castle Wall", fr: "Remparts" },
  armory: { en: "Armory", fr: "Armurerie" },
  fountain: { en: "Fountain", fr: "Fontaine" },
  observatory: { en: "Observatory", fr: "Observatoire" },
  barn: { en: "Barn", fr: "Grange" },
  dragon_lair: { en: "Dragon Lair", fr: "Antre du dragon" },
  heroes_hall: { en: "Hall of Heroes", fr: "Hall des héros" },
  champion_arena: { en: "Champion Arena", fr: "Arène des champions" },
};

/** What raises a building, so the detail sheet can answer "why is it at this level". */
export type BuildingDriver =
  | "tier"
  | "muscle"
  | "style"
  | "prereq"
  | "bosses"
  | "adventures"
  | "boss_victories";

export type VillageBuilding = {
  code: BuildingCode;
  emoji: string;
  tier: BuildingTier;
  level: number; // 0 = locked, otherwise 1..5
  enName: string;
  frName: string;
  unlockCondition: string;
  /** The 6 muscle buildings have no icon of their own; they borrow that muscle's sport sprite. */
  relatedMuscle: MuscleCode | null;
  driver: BuildingDriver;
  /** The driver's value today: work units, hero level, prerequisite level, or a deed count. */
  metricValue: number;
  /** What the driver must reach for the next level; null once the building is maxed. */
  nextTarget: number | null;
};

// The shared ladder from schema.ts, with level 1 at "any work at all" — a building appears
// the first time its muscle is trained, which is what the old `xp > 0` guard meant.
const VOLUME_FLOORS: readonly number[] = [1, 2, 3, 4, 5].map((lvl) =>
  lvl === 1 ? 1 : (buildingLevelThresholds[lvl] ?? 0),
);

// The legendary three answer to deeds, not to volume, and each names a different deed so its
// detail sheet has one sentence to say. Five bosses exist in the content, so the lair maxes on
// the full set instead of the old unreachable ten; the arena counts victories with replays
// included; the hall counts finished campaigns, which is what its unlock text always claimed.
const BOSS_FLOORS: readonly number[] = [1, 2, 3, 4, 5];
const ADVENTURE_FLOORS: readonly number[] = [1, 3, 6, 10, 15];
const VICTORY_FLOORS: readonly number[] = [3, 5, 8, 12, 20];

const TIER_4_DRIVERS: Partial<
  Record<BuildingCode, { driver: BuildingDriver; floors: readonly number[] }>
> = {
  dragon_lair: { driver: "bosses", floors: BOSS_FLOORS },
  heroes_hall: { driver: "adventures", floors: ADVENTURE_FLOORS },
  champion_arena: { driver: "boss_victories", floors: VICTORY_FLOORS },
};

// A tier-3 upgrade trails two rungs behind the building it extends, which tops out at 5.
const T3_MAX_LEVEL = 3;

/** Level 1..5 from a floor table indexed by level - 1; below the first floor, 0 = not earned. */
function levelFromFloors(value: number, floors: readonly number[]): number {
  let level = 0;
  for (const [index, floor] of floors.entries()) {
    if (value >= floor) level = index + 1;
  }
  return level;
}

/** What the driver must reach for the next rung, or null once every floor is cleared. */
function nextFloor(level: number, floors: readonly number[]): number | null {
  return floors[level] ?? null;
}

/** Lifetime work units per exercise style, for the two style-gated buildings. */
async function getStyleVolumes(): Promise<Partial<Record<ExerciseStyle, number>>> {
  const rows = await db
    .select({
      style: exercises.style,
      volume: sql<number>`coalesce(sum(${completedExercises.resultValue}), 0)`,
    })
    .from(completedExercises)
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .groupBy(exercises.style);

  return Object.fromEntries(rows.map((r) => [r.style, r.volume]));
}

type LevelInputs = {
  villageTier: VillageTier;
  heroLevel: number;
  bossesDefeated: number;
  finishedRuns: number;
  bossVictories: number;
  volumeByMuscle: Map<MuscleCode, number>;
  styleVolumes: Partial<Record<ExerciseStyle, number>>;
};

type DerivedLevel = Pick<VillageBuilding, "level" | "driver" | "metricValue" | "nextTarget">;

/** Level for everything except tier 3, which needs its prerequisite resolved first. */
function deriveLevel(code: BuildingCode, inputs: LevelInputs): DerivedLevel {
  const def = buildingDefinitions[code];

  // Starter buildings always stand; they grow with the village itself.
  if (def.tier === 1) {
    return {
      level: inputs.villageTier,
      driver: "tier",
      metricValue: inputs.heroLevel,
      nextTarget: TIER_LEVEL_FLOORS[(inputs.villageTier + 1) as VillageTier] ?? null,
    };
  }

  if (def.tier === 4) {
    const spec = TIER_4_DRIVERS[code] ?? { driver: "bosses" as const, floors: BOSS_FLOORS };
    const value =
      spec.driver === "adventures"
        ? inputs.finishedRuns
        : spec.driver === "boss_victories"
          ? inputs.bossVictories
          : inputs.bossesDefeated;
    const level = levelFromFloors(value, spec.floors);
    return {
      level,
      driver: spec.driver,
      metricValue: value,
      nextTarget: nextFloor(level, spec.floors),
    };
  }

  // Tier 3 is resolved in a second pass; this placeholder is overwritten there.
  if (def.tier !== 2) {
    return { level: 0, driver: "prereq", metricValue: 0, nextTarget: null };
  }

  const volume = def.relatedMuscle
    ? (inputs.volumeByMuscle.get(def.relatedMuscle) ?? 0)
    : (inputs.styleVolumes[def.relatedStyle ?? "strength"] ?? 0);
  const level = levelFromFloors(volume, VOLUME_FLOORS);

  return {
    level,
    driver: def.relatedMuscle ? "muscle" : "style",
    metricValue: volume,
    nextTarget: nextFloor(level, VOLUME_FLOORS),
  };
}

/**
 * Buildings are a pure function of training history — no unlock button, no resource
 * spending, nothing to migrate. The `village_buildings` / `village_stats` tables stay
 * unused; this keeps the "nothing is managed" rule from docs/screens/village.md while
 * still showing a village that grows building by building.
 */
export async function getVillageBuildings(): Promise<VillageBuilding[]> {
  const [balance, styleVolumes, banners, levelInfo, tally] = await Promise.all([
    getMuscleBalance("all"),
    getStyleVolumes(),
    getBossBanners(),
    getUserLevelInfo(),
    tallyFinishedRuns(),
  ]);

  const volumeByMuscle = new Map(balance.muscles.map((m) => [m.muscle, m.volume]));
  const villageTier = getVillageTier(levelInfo.level);

  const derivedOf = new Map<BuildingCode, DerivedLevel>();

  for (const code of buildingCodes) {
    derivedOf.set(
      code,
      deriveLevel(code, {
        villageTier,
        heroLevel: levelInfo.level,
        bossesDefeated: banners.length,
        finishedRuns: tally.finishedRuns,
        bossVictories: tally.bossVictories,
        volumeByMuscle,
        styleVolumes,
      }),
    );
  }

  // Tier 3 is the upgrade of its tier-2 prerequisite: it appears once that building hits
  // the declared level, then trails two rungs behind it. Runs after the loop above so the
  // prerequisite level is already known.
  for (const code of buildingCodes) {
    const def = buildingDefinitions[code];
    if (def.tier !== 3) continue;
    const required = def.prerequisiteLevel ?? 3;
    const prereq = def.prerequisiteBuilding
      ? (derivedOf.get(def.prerequisiteBuilding)?.level ?? 0)
      : 0;
    const level = prereq >= required ? prereq - 2 : 0;
    derivedOf.set(code, {
      level,
      driver: "prereq",
      metricValue: prereq,
      // Every rung of the upgrade waits on one more level of the building it extends.
      nextTarget: level === 0 ? required : level < T3_MAX_LEVEL ? level + 3 : null,
    });
  }

  return buildingCodes.map((code) => {
    const derived = derivedOf.get(code);
    return {
      code,
      emoji: buildingDefinitions[code].emoji,
      tier: buildingDefinitions[code].tier,
      level: derived?.level ?? 0,
      enName: BUILDING_LABELS[code].en,
      frName: BUILDING_LABELS[code].fr,
      unlockCondition: buildingDefinitions[code].unlockCondition,
      relatedMuscle: buildingDefinitions[code].relatedMuscle,
      driver: derived?.driver ?? "tier",
      metricValue: derived?.metricValue ?? 0,
      nextTarget: derived?.nextTarget ?? null,
    };
  });
}

export type VillageGrowth = {
  code: BuildingCode;
  enName: string;
  frName: string;
  relatedMuscle: MuscleCode | null;
  oldLevel: number;
  newLevel: number;
};

/** Which buildings rose since the last snapshot — the "village grows" moment on save. */
export function diffVillageGrowth(
  before: VillageBuilding[],
  after: VillageBuilding[],
): VillageGrowth[] {
  const beforeLevel = new Map(before.map((b) => [b.code, b.level]));
  return after
    .filter((b) => b.level > (beforeLevel.get(b.code) ?? 0))
    .map((b) => ({
      code: b.code,
      enName: b.enName,
      frName: b.frName,
      relatedMuscle: b.relatedMuscle,
      oldLevel: beforeLevel.get(b.code) ?? 0,
      newLevel: b.level,
    }));
}

export type VillageTierUp = { oldTier: VillageTier; newTier: VillageTier };

/** Did this level jump cross into a new village tier — the "grand moment" of the scene? */
export function diffVillageTier(oldLevel: number, newLevel: number): VillageTierUp | null {
  const oldTier = getVillageTier(oldLevel);
  const newTier = getVillageTier(newLevel);
  return newTier > oldTier ? { oldTier, newTier } : null;
}

// ------------------------------------------------------------
// Trophies
// ------------------------------------------------------------

export type Trophy = {
  key: string;
  kind: "achievement" | "boss";
  /** Set for achievements: the code its definition is filed under. */
  code: string | null;
  /** Set for bosses: the adventure whose campaign the victory belongs to. */
  adventureId: number | null;
  emoji: string | null;
  imagePath: string | null;
  enTitle: string;
  frTitle: string;
  /** What the trophy was earned for; bosses tell that story in the adventure itself. */
  enDescription: string | null;
  frDescription: string | null;
  earnedAt: Date;
};

/** Achievements and defeated bosses on one shelf, newest first. */
export async function getTrophies(banners: BossBanner[]): Promise<Trophy[]> {
  const unlocked = await getUnlockedAchievements();

  const achievementTrophies: Trophy[] = unlocked.flatMap((a) => {
    const def = achievementDefinitions.find((d) => d.code === a.code);
    if (!def) return [];
    return [
      {
        key: `achievement:${a.code}`,
        kind: "achievement" as const,
        code: a.code,
        adventureId: null,
        emoji: def.icon,
        imagePath: null,
        enTitle: def.enTitle,
        frTitle: def.frTitle,
        enDescription: def.enDescription,
        frDescription: def.frDescription,
        earnedAt: new Date(a.unlockedAt),
      },
    ];
  });

  const bossTrophies: Trophy[] = banners.map((b) => ({
    key: `boss:${b.adventureId}`,
    kind: "boss" as const,
    code: null,
    adventureId: b.adventureId,
    emoji: null,
    imagePath: b.imagePath,
    enTitle: b.enTitle,
    frTitle: b.frTitle,
    enDescription: null,
    frDescription: null,
    earnedAt: b.defeatedAt,
  }));

  return [...achievementTrophies, ...bossTrophies].sort(
    (a, b) => b.earnedAt.getTime() - a.earnedAt.getTime(),
  );
}

export type VillageScene = {
  tier: VillageTier;
  level: number;
  flame: FlameLevel;
  dominantSport: DominantSportOverlay;
  bossBanners: BossBanner[];
  buildings: VillageBuilding[];
  trophies: Trophy[];
};

/**
 * Everything the village scene needs, in one call. Pure aggregation over
 * existing derived sources (level, streak, muscle balance, boss fights) —
 * no village-specific table.
 */
export async function getVillageScene(): Promise<VillageScene> {
  const [levelInfo, streak, dominantSport, bossBanners, buildings] = await Promise.all([
    getUserLevelInfo(),
    getStreakInfo(),
    getDominantSportOverlay(),
    getBossBanners(),
    getVillageBuildings(),
  ]);

  return {
    tier: getVillageTier(levelInfo.level),
    level: levelInfo.level,
    flame: getFlameLevel(streak.current),
    dominantSport,
    bossBanners,
    buildings,
    trophies: await getTrophies(bossBanners),
  };
}
