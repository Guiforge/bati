import { eq, isNotNull, sql } from "drizzle-orm";
import { achievementDefinitions, getUnlockedAchievements } from "./achievements";
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

export async function getBossBanners(): Promise<BossBanner[]> {
  const rows = await db
    .select({
      adventureId: bossFights.adventureId,
      enTitle: adventures.enTitle,
      frTitle: adventures.frTitle,
      imagePath: adventures.imagePath,
      defeatedAt: bossFights.defeatedAt,
    })
    .from(bossFights)
    .innerJoin(adventures, eq(bossFights.adventureId, adventures.id))
    .where(isNotNull(bossFights.defeatedAt));

  return rows
    .filter((row): row is typeof row & { defeatedAt: Date } => row.defeatedAt !== null)
    .map((row) => ({
      adventureId: row.adventureId,
      enTitle: row.enTitle,
      frTitle: row.frTitle,
      imagePath: row.imagePath ?? PLACEHOLDER_IMAGE_PATH,
      defeatedAt: row.defeatedAt,
    }));
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

// Boss counts that unlock the three legendary buildings, in buildingCodes order.
const TIER_4_BOSS_FLOORS: Record<string, number> = {
  dragon_lair: 1,
  heroes_hall: 3,
  champion_arena: 10,
};

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
};

/** Level 1..5 from the shared XP ladder in schema.ts. Caller decides what "xp" means. */
function levelFromXp(xp: number): number {
  let level = 1;
  for (const [lvl, floor] of Object.entries(buildingLevelThresholds)) {
    if (xp >= floor) level = Number(lvl);
  }
  return level;
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
  bossesDefeated: number;
  volumeByMuscle: Map<MuscleCode, number>;
  styleVolumes: Partial<Record<ExerciseStyle, number>>;
};

/** Level for everything except tier 3, which needs its prerequisite resolved first. */
function baseLevel(code: BuildingCode, inputs: LevelInputs): number {
  const def = buildingDefinitions[code];

  // Starter buildings always stand; they grow with the village itself.
  if (def.tier === 1) return inputs.villageTier;

  if (def.tier === 4) {
    const floor = TIER_4_BOSS_FLOORS[code] ?? 1;
    return inputs.bossesDefeated >= floor ? Math.min(5, inputs.bossesDefeated) : 0;
  }

  if (def.tier !== 2) return 0;

  const xp = def.relatedMuscle
    ? (inputs.volumeByMuscle.get(def.relatedMuscle) ?? 0)
    : (inputs.styleVolumes[def.relatedStyle ?? "strength"] ?? 0);
  return xp > 0 ? levelFromXp(xp) : 0;
}

/**
 * Buildings are a pure function of training history — no unlock button, no resource
 * spending, nothing to migrate. The `village_buildings` / `village_stats` tables stay
 * unused; this keeps the "nothing is managed" rule from docs/screens/village.md while
 * still showing a village that grows building by building.
 */
export async function getVillageBuildings(): Promise<VillageBuilding[]> {
  const [balance, styleVolumes, banners, levelInfo] = await Promise.all([
    getMuscleBalance("all"),
    getStyleVolumes(),
    getBossBanners(),
    getUserLevelInfo(),
  ]);

  const volumeByMuscle = new Map(balance.muscles.map((m) => [m.muscle, m.volume]));
  const villageTier = getVillageTier(levelInfo.level);

  const levelOf = new Map<BuildingCode, number>();

  for (const code of buildingCodes) {
    levelOf.set(
      code,
      baseLevel(code, {
        villageTier,
        bossesDefeated: banners.length,
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
    const prereq = def.prerequisiteBuilding ? (levelOf.get(def.prerequisiteBuilding) ?? 0) : 0;
    levelOf.set(code, prereq >= (def.prerequisiteLevel ?? 3) ? prereq - 2 : 0);
  }

  return buildingCodes.map((code) => ({
    code,
    emoji: buildingDefinitions[code].emoji,
    tier: buildingDefinitions[code].tier,
    level: levelOf.get(code) ?? 0,
    enName: BUILDING_LABELS[code].en,
    frName: BUILDING_LABELS[code].fr,
    unlockCondition: buildingDefinitions[code].unlockCondition,
    relatedMuscle: buildingDefinitions[code].relatedMuscle,
  }));
}

// ------------------------------------------------------------
// Trophies
// ------------------------------------------------------------

export type Trophy = {
  key: string;
  kind: "achievement" | "boss";
  emoji: string | null;
  imagePath: string | null;
  enTitle: string;
  frTitle: string;
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
        emoji: def.icon,
        imagePath: null,
        enTitle: def.enTitle,
        frTitle: def.frTitle,
        earnedAt: new Date(a.unlockedAt),
      },
    ];
  });

  const bossTrophies: Trophy[] = banners.map((b) => ({
    key: `boss:${b.adventureId}`,
    kind: "boss" as const,
    emoji: null,
    imagePath: b.imagePath,
    enTitle: b.enTitle,
    frTitle: b.frTitle,
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
