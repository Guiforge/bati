import { and, count, eq, gte, isNotNull, lt, sql, sum } from "drizzle-orm";
import { MAX_BUILDING_LEVEL } from "@/constants/buildingLevels";
import type { Localized } from "@/src/i18n/deviceLanguage";
import { type FinishedAdventureSummary, listFinishedRunSummaries } from "./adventures";
import { db, schema } from "./client";
import { METRES_PER_LEAGUE, totalLeaguesM } from "./gps";
import { getMuscleBalance } from "./muscleBalance";
import { getPreference } from "./preferences";
import {
  type BuildingCode,
  type BuildingTier,
  buildingCodes,
  buildingDefinitions,
  buildingLevelThresholds,
  type ExerciseStyle,
  type MuscleCode,
} from "./schema";
import { type FlameLevel, getFlameLevel, getStreakInfo } from "./streaks";
import { getLevelTitle, getUserLevelInfo, getXpForLevel } from "./userLevel";
import { repEquivalentSql } from "./workUnits";

const { bossFights, adventures, adventureRuns, exercises, completedExercises, completedQuest } =
  schema;

// Same fallback used by every getXAsset() helper in constants/assetMap.ts — never expose
// `| null` for imagePath, resolve to the placeholder here so callers have one code path.
const PLACEHOLDER_IMAGE_PATH = "assets/placeholder.jpg";

export type VillageTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// Level buckets for the 12 illustrated tiers. Derived from the curve in db/userLevel.ts; no
// separate threshold table.
//
// Tiers 10-12 exist because the level curve does not end at 20: past it every rung costs a flat
// 2000 XP and the title stays "Divine", so the hero kept climbing while the largest thing on
// this screen stopped forever. At roughly 360 XP a session that ceiling arrived in two or three
// months. Their gaps widen (5, 7, 8 levels) because the XP per level is flat up there — equal
// level gaps would make each tier arrive *sooner* in felt effort than the last, undoing what the
// early curve does by itself.
//
// The even tiers below 9 were added afterwards, at 3/8/13/18. That is where a real player spends
// their first two months, and four levels between scenes is a long time to watch nothing change.
// The top half deliberately did not get the same treatment: the art there is already at the edge
// of what can escalate convincingly, and an intermediate step would read as a duplicate.
const TIER_LEVEL_FLOORS: Record<VillageTier, number> = {
  1: 1,
  2: 3,
  3: 5,
  4: 8,
  5: 10,
  6: 13,
  7: 15,
  8: 18,
  9: 20,
  10: 25,
  11: 32,
  12: 40,
};

// Shared by the village scene and the home teaser, so the two can never disagree.
export const TIER_NAMES: Record<VillageTier, Localized> = {
  1: { en: "Hamlet", fr: "Hameau", de: "Weiler", es: "Caserío" },
  2: { en: "Clearing", fr: "Clairière", de: "Lichtung", es: "Claro" },
  3: { en: "Village", fr: "Village", de: "Dorf", es: "Aldea" },
  4: { en: "Crossroads", fr: "Carrefour", de: "Wegkreuz", es: "Encrucijada" },
  5: { en: "Town", fr: "Bourg", de: "Marktflecken", es: "Villa" },
  6: { en: "Free Town", fr: "Ville franche", de: "Freistadt", es: "Villa libre" },
  7: { en: "City", fr: "Cité", de: "Stadt", es: "Ciudad" },
  8: { en: "Merchant City", fr: "Cité marchande", de: "Handelsstadt", es: "Ciudad mercante" },
  9: {
    en: "Flourishing City",
    fr: "Cité florissante",
    de: "Blühende Stadt",
    es: "Ciudad próspera",
  },
  10: { en: "Citadel", fr: "Citadelle", de: "Zitadelle", es: "Ciudadela" },
  11: { en: "Metropolis", fr: "Métropole", de: "Metropole", es: "Metrópolis" },
  12: {
    en: "Eternal Capital",
    fr: "Capitale éternelle",
    de: "Ewige Hauptstadt",
    es: "Capital eterna",
  },
};

export function getVillageTier(level: number): VillageTier {
  let tier: VillageTier = 1;
  for (const [tierStr, floor] of Object.entries(TIER_LEVEL_FLOORS)) {
    if (level >= floor) tier = Number(tierStr) as VillageTier;
  }
  return tier;
}

export type BossBanner = {
  adventureId: number;
  enTitle: string;
  frTitle: string;
  deTitle: string;
  esTitle: string;
  /**
   * The *monster's* painting when the campaign has one, else the campaign cover. A trophy shows
   * the thing you beat, not the poster for the journey — resolve with getBossAsset(), whose
   * fallback chain also catches the cover path.
   */
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
        deTitle: adventures.deTitle,
        esTitle: adventures.esTitle,
        imagePath: adventures.imagePath,
        bossImagePath: adventures.bossImagePath,
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
      deTitle: s.deTitle,
      esTitle: s.esTitle,
      imagePath: s.bossImagePath ?? s.imagePath ?? PLACEHOLDER_IMAGE_PATH,
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
      deTitle: row.deTitle,
      esTitle: row.esTitle,
      imagePath: row.bossImagePath ?? row.imagePath ?? PLACEHOLDER_IMAGE_PATH,
      defeatedAt: row.defeatedAt,
    });
  }

  return [...banners.values()];
}

type RunTally = {
  /** Boss campaigns finished again after the first victory: the arena counts these. */
  rematches: number;
  /** Finished campaigns that are not a boss, replays included: the Hall of Heroes counts these. */
  routes: number;
};

/**
 * One finished campaign feeds one building. The first victory over a boss is the lair's (read from
 * the banners), every later one is the arena's, and everything that is not a boss is the hall's.
 * Until 2026-09 a single boss run raised all three, and no sentence could tell them apart.
 */
function tallyFinishedRuns(summaries: readonly FinishedAdventureSummary[]): RunTally {
  let rematches = 0;
  let routes = 0;
  for (const s of summaries) {
    if (s.kind === "boss") rematches += Math.max(0, s.timesFinished - 1);
    else routes += s.timesFinished;
  }
  return { rematches, routes };
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
export const BUILDING_LABELS: Record<BuildingCode, Localized> = {
  campfire: { en: "Campfire", fr: "Feu de camp", de: "Lagerfeuer", es: "Fogata" },
  tent: { en: "Tent", fr: "Tente", de: "Zelt", es: "Tienda" },
  // fr deliberately not "Mannequin d'entraînement": « d'entraînement » is wider than a
  // building card, and an unbreakable word that long wraps mid-word at large font scales.
  training_dummy: {
    en: "Training Dummy",
    fr: "Mannequin de bois",
    de: "Übungspuppe",
    es: "Muñeco de madera",
  },
  archery_range: {
    en: "Archery Range",
    fr: "Champ de tir",
    de: "Schießstand",
    es: "Campo de tiro",
  },
  quarry: { en: "Quarry", fr: "Carrière", de: "Steinbruch", es: "Cantera" },
  forge: { en: "Forge", fr: "Forge", de: "Schmiede", es: "Forja" },
  well: { en: "Well", fr: "Puits", de: "Ziehbrunnen", es: "Pozo" },
  windmill: { en: "Windmill", fr: "Moulin", de: "Windmühle", es: "Molino" },
  farm: { en: "Farm", fr: "Ferme", de: "Bauernhof", es: "Granja" },
  wizard_tower: { en: "Wizard Tower", fr: "Tour du mage", de: "Magierturm", es: "Torre del mago" },
  druid_grove: {
    en: "Druid Grove",
    fr: "Bosquet druidique",
    de: "Druidenhain",
    es: "Arboleda druídica",
  },
  watchtower: { en: "Watchtower", fr: "Tour de guet", de: "Wachturm", es: "Atalaya" },
  castle_wall: { en: "Castle Wall", fr: "Remparts", de: "Burgmauer", es: "Murallas" },
  armory: { en: "Armory", fr: "Armurerie", de: "Waffenkammer", es: "Armería" },
  fountain: { en: "Fountain", fr: "Fontaine", de: "Springbrunnen", es: "Fuente" },
  observatory: { en: "Observatory", fr: "Observatoire", de: "Sternwarte", es: "Observatorio" },
  barn: { en: "Barn", fr: "Grange", de: "Scheune", es: "Granero" },
  dragon_lair: {
    en: "Dragon Lair",
    fr: "Antre du dragon",
    de: "Drachenhort",
    es: "Guarida del dragón",
  },
  heroes_hall: {
    en: "Hall of Heroes",
    fr: "Salle des héros",
    de: "Heldenhalle",
    es: "Salón de los héroes",
  },
  champion_arena: {
    en: "Champion Arena",
    fr: "Arène des champions",
    de: "Arena der Champions",
    es: "Arena de campeones",
  },
  high_road: { en: "High Road", fr: "Grand Chemin", de: "Hohe Straße", es: "Camino Real" },
};

/** What raises a building, so the detail sheet can answer "why is it at this level". */
export type BuildingDriver =
  | "tier"
  | "muscle"
  | "style"
  | "prereq"
  | "bosses"
  | "rematches"
  | "routes"
  | "leagues";

export type VillageBuilding = {
  code: BuildingCode;
  emoji: string;
  tier: BuildingTier;
  level: number; // 0 = locked, otherwise 1..5
  enName: string;
  frName: string;
  deName: string;
  esName: string;
  unlockCondition: string;
  /** The 6 muscle buildings have no icon of their own; they borrow that muscle's sport sprite. */
  relatedMuscle: MuscleCode | null;
  driver: BuildingDriver;
  /** The driver's value today: work units, hero level, prerequisite level, or a deed count. */
  metricValue: number;
  /** What the driver must reach for the next level; null once the building is maxed. */
  nextTarget: number | null;
  /**
   * The same tally before it was rounded down to a whole unit, when those differ.
   *
   * Only the road has one. Leagues are stored in metres and shown as whole leagues, so a first
   * outing of 900 m reads "0/1" and its bar sat at zero for the entire walk — under a comment in
   * `getBuildingProgress` promising the road counts from the first metre. The tally stays whole,
   * because "0.9 leagues covered beyond the walls" is not a sentence; the bar reads this.
   *
   * Optional rather than nullable everywhere: only one driver has ever needed it, and every
   * other branch of `deriveLevel` would otherwise carry a `null` that says nothing.
   */
  exactValue?: number;
  /**
   * The level comes from the old deed count, which gave more than the new one does. The tally and
   * the next rung are the new count's, so "level 2" can sit on "0 rematches"; the detail sheet
   * says why instead of leaving it to read as a bug.
   */
  kept?: boolean;
};

// The shared ladder from schema.ts, with level 1 at "any work at all" — a building appears
// the first time its muscle is trained, which is what the old `xp > 0` guard meant.
const VOLUME_FLOORS: readonly number[] = [1, 2, 3, 4, 5].map((lvl) =>
  lvl === 1 ? 1 : (buildingLevelThresholds[lvl] ?? 0),
);

// The legendary three answer to deeds, and no finished campaign feeds two of them
// (tallyFinishedRuns). Six bosses exist in the content since the Golem (drizzle/0027), so the
// lair tops out on the full set; the floors used to stop at five, and the sixth boss raised
// nothing. The hall's floors are low because two routes exist, and reaching its top already
// means replaying them.
const BOSS_FLOORS: readonly number[] = [1, 2, 3, 4, 6];
const REMATCH_FLOORS: readonly number[] = [1, 3, 6, 10, 15];
const ROUTE_FLOORS: readonly number[] = [1, 2, 4, 7, 10];

/**
 * When this install started counting deeds the new way: unix seconds, written once by
 * drizzle/0060 at the first launch of the version that ships the recut. Runs finished before it
 * are also counted the old way, and a deed building shows whichever level is higher, so a level
 * the hero already saw is never taken back. A run finished after it only ever feeds the new count.
 *
 * ponytail: the old floors and tally stay in the code for as long as anyone's history predates
 * the recut, which may be forever. Drop them when that stops mattering.
 */
const DEEDS_RECUT_AT_KEY = "deedsRecutAt";
const LEGACY_BOSS_FLOORS: readonly number[] = [1, 2, 3, 4, 5];
const LEGACY_ADVENTURE_FLOORS: readonly number[] = [1, 3, 6, 10, 15];
const LEGACY_VICTORY_FLOORS: readonly number[] = [3, 5, 8, 12, 20];

type LegacyDeedLevels = Partial<Record<BuildingCode, number>>;

/** The three deed levels as the old rules gave them, over what was finished before the recut. */
async function getLegacyDeedLevels(banners: readonly BossBanner[]): Promise<LegacyDeedLevels> {
  const marker = await getPreference(DEEDS_RECUT_AT_KEY);
  // Only a database that never ran 0060 has none, and it has no history from before the recut.
  if (marker === null) return {};
  const recutAt = new Date(Number(marker) * 1000);

  const rows = await db
    .select({
      adventureId: adventureRuns.adventureId,
      kind: adventures.kind,
      times: count(),
    })
    .from(adventureRuns)
    .innerJoin(adventures, eq(adventures.id, adventureRuns.adventureId))
    .where(and(eq(adventureRuns.status, "finished"), lt(adventureRuns.finishedAt, recutAt)))
    .groupBy(adventureRuns.adventureId);

  // A standing defeat without a finished campaign counted for the lair too.
  const bosses = new Set(banners.filter((b) => b.defeatedAt < recutAt).map((b) => b.adventureId));
  let finishedRuns = 0;
  let bossVictories = 0;
  for (const row of rows) {
    finishedRuns += row.times;
    if (row.kind !== "boss") continue;
    bossVictories += row.times;
    bosses.add(row.adventureId);
  }

  return {
    dragon_lair: levelFromFloors(bosses.size, LEGACY_BOSS_FLOORS),
    heroes_hall: levelFromFloors(finishedRuns, LEGACY_ADVENTURE_FLOORS),
    champion_arena: levelFromFloors(bossVictories, LEGACY_VICTORY_FLOORS),
  };
}

/**
 * Bati's league is a kilometre.
 *
 * Leagues are stored in metres (`totalLeaguesM`), but a floor table in metres reads as a phone
 * number and the detail sheet's "3421/10000" says nothing. A historical league is about 4.8 km,
 * which is an hour of walking per tick — a unit that only moves once a session cannot show
 * progress on the way there. A fantasy unit also sidesteps the metric/imperial preference the
 * village screen has no access to: nobody's settings turn a league into anything else.
 */

/**
 * The road's floors, in leagues. Corrected 2026-09-02 against the first real total: one hour on
 * foot, 4.58 km, recorded 2026-09-01. An outing on foot is four to five leagues, not one. A ride covers two to four times that distance in the same window
 * (inferred from the old speed ratios, not from a recorded trace). The first floor stays at one
 * league so the very first walk levels the road; the rest read as roughly 3, 9, 20 and 44 walks
 * on foot, or a quarter of that on a mount.
 *
 * Once this floor table ships, raising a floor means any hero whose total sits between the old
 * and new threshold loses a level — levelFromFloors is a pure function, no history is kept. This
 * correction is cheap today (the High Road is not in any release tag), so a future re-tune is a
 * different decision from this one.
 *
 * Re-tune here and nowhere else; nothing but this table and METRES_PER_LEAGUE knows the scale.
 */
const ROAD_FLOORS: readonly number[] = [1, 15, 40, 90, 200];

/**
 * Where each tier-4 driver reads its tally. A map rather than the ternary chain this replaces:
 * the chain had to be edited in a second place every time a driver was added, and the road was
 * the edit that made that cost visible. Adding a member here is the whole change.
 */
const TIER_4_VALUES = {
  bosses: (i: LevelInputs) => i.bossesDefeated,
  rematches: (i: LevelInputs) => i.rematches,
  routes: (i: LevelInputs) => i.routes,
  leagues: (i: LevelInputs) => i.leagues,
} satisfies Partial<Record<BuildingDriver, (inputs: LevelInputs) => number>>;

/** A tier-4 building answers to a deed tally, never to volume. */
type DeedDriver = keyof typeof TIER_4_VALUES;

const TIER_4_DRIVERS: Partial<
  Record<BuildingCode, { driver: DeedDriver; floors: readonly number[] }>
> = {
  dragon_lair: { driver: "bosses", floors: BOSS_FLOORS },
  heroes_hall: { driver: "routes", floors: ROUTE_FLOORS },
  champion_arena: { driver: "rematches", floors: REMATCH_FLOORS },
  high_road: { driver: "leagues", floors: ROAD_FLOORS },
};

// A tier-3 upgrade trails two rungs behind the building it extends, which tops out at 5.
const T3_MAX_LEVEL = 3;

/**
 * The level a building can actually reach. The six upgrades stop at 3, and the village used to
 * draw five pips under them anyway: "3 of 5" for life, a road the screen promised and never had.
 */
export function buildingCeiling(building: Pick<VillageBuilding, "tier">): number {
  return building.tier === 3 ? T3_MAX_LEVEL : MAX_BUILDING_LEVEL;
}

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
      volume: sql<number>`coalesce(sum(${repEquivalentSql(completedExercises.resultValue, completedExercises.resultType, exercises.style)}), 0)`,
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
  rematches: number;
  routes: number;
  /** Deed levels the old rules had already given, which a deed building never drops below. */
  legacy: LegacyDeedLevels;
  /** Ground covered outside the walls, in leagues. Never a work unit, never a rep. */
  leagues: number;
  /** Leagues before the floor, so the road's bar can move inside its first one. */
  leaguesExact: number;
  volumeByMuscle: Map<MuscleCode, number>;
  styleVolumes: Partial<Record<ExerciseStyle, number>>;
};

type DerivedLevel = Pick<
  VillageBuilding,
  "level" | "driver" | "metricValue" | "nextTarget" | "exactValue" | "kept"
>;

/** A tier-4 building: its deed tally on its floors, never below the level the old count gave. */
function deriveDeedLevel(code: BuildingCode, inputs: LevelInputs): DerivedLevel {
  const spec = TIER_4_DRIVERS[code];
  // Loud rather than a default: a fallback here once dressed any unlisted deed up as the lair.
  if (!spec) throw new Error(`Tier-4 building ${code} has no deed driver`);
  const value = TIER_4_VALUES[spec.driver](inputs);
  const counted = levelFromFloors(value, spec.floors);
  const level = Math.max(counted, inputs.legacy[code] ?? 0);
  return {
    level,
    driver: spec.driver,
    metricValue: value,
    nextTarget: nextFloor(level, spec.floors),
    // Deeds are counted, not measured: only the road arrives already rounded down.
    ...(spec.driver === "leagues" ? { exactValue: inputs.leaguesExact } : {}),
    ...(level > counted ? { kept: true } : {}),
  };
}

/** Level for everything except tier 3, which needs its prerequisite resolved first. */
function deriveLevel(code: BuildingCode, inputs: LevelInputs): DerivedLevel {
  const def = buildingDefinitions[code];

  // Starter buildings always stand; they grow with the village itself.
  //
  // Clamped at 5 since the scene gained tiers 6-8: a building level is 1..5 by contract and
  // LevelPips draws exactly five dots, so an unclamped tier 8 handed the tile a level it had no
  // way to show — five filled pips *and* a bar, reading as "maxed, still climbing". Past tier 5
  // the campfire is simply finished; the hero's tier name in the scene above is what keeps
  // moving, and the tile does not need to say it twice.
  if (def.tier === 1) {
    const level = Math.min(inputs.villageTier, MAX_BUILDING_LEVEL);
    return {
      level,
      driver: "tier",
      metricValue: inputs.heroLevel,
      nextTarget:
        level < MAX_BUILDING_LEVEL
          ? (TIER_LEVEL_FLOORS[(inputs.villageTier + 1) as VillageTier] ?? null)
          : null,
    };
  }

  if (def.tier === 4) return deriveDeedLevel(code, inputs);

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
  const [balance, styleVolumes, banners, levelInfo, summaries, leaguesM] = await Promise.all([
    getMuscleBalance("all"),
    getStyleVolumes(),
    getBossBanners(),
    getUserLevelInfo(),
    listFinishedRunSummaries(),
    totalLeaguesM(),
  ]);
  const legacy = await getLegacyDeedLevels(banners);
  const tally = tallyFinishedRuns(summaries);

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
        rematches: tally.rematches,
        routes: tally.routes,
        legacy,
        leagues: Math.floor(leaguesM / METRES_PER_LEAGUE),
        leaguesExact: leaguesM / METRES_PER_LEAGUE,
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
      deName: BUILDING_LABELS[code].de,
      esName: BUILDING_LABELS[code].es,
      unlockCondition: buildingDefinitions[code].unlockCondition,
      relatedMuscle: buildingDefinitions[code].relatedMuscle,
      driver: derived?.driver ?? "tier",
      metricValue: derived?.metricValue ?? 0,
      nextTarget: derived?.nextTarget ?? null,
      ...(derived?.exactValue === undefined ? {} : { exactValue: derived.exactValue }),
      ...(derived?.kept ? { kept: true } : {}),
    };
  });
}

/**
 * Progress toward the next level, 0-100, or null when there is nothing honest to count: a maxed
 * building, or one not built yet. A building has three states, not two. Unbuilt is a condition in
 * words; treating it as "in progress at 0 %" drew "0 bosses, level 1 at 1" over an empty bar,
 * three ways of writing the same zero.
 *
 * One exception, the road inside its first league: its tally is whole leagues, so a first walk of
 * 900 m is real ground the words cannot show, and the bar is the only thing that can.
 *
 * Shared by the scene card and the detail sheet so the two can never disagree about what
 * "almost there" means.
 */
export function getBuildingProgress(building: VillageBuilding): number | null {
  if (building.nextTarget === null) return null;
  const value = building.exactValue ?? building.metricValue;
  if (building.level === 0 && !(building.driver === "leagues" && value > 0)) return null;
  if (building.nextTarget <= 0) return 0;
  return Math.max(0, Math.min(100, (value / building.nextTarget) * 100));
}

export type VillageGrowth = {
  code: BuildingCode;
  enName: string;
  frName: string;
  deName: string;
  esName: string;
  relatedMuscle: MuscleCode | null;
  oldLevel: number;
  newLevel: number;
};

/**
 * Nothing earned yet: the three starters stand on their own, and they are all there is. A walk
 * counts as much as a set here, which is why this is not "no reps logged".
 */
export function isDayOne(buildings: VillageBuilding[]): boolean {
  return !buildings.some((b) => b.tier !== 1 && b.level > 0);
}

/**
 * The last painting, and every building that can top out has. Deeds are left out: they are the
 * part of the village that keeps answering once the rest is finished.
 */
export function isVillageComplete(tier: VillageTier, buildings: VillageBuilding[]): boolean {
  return tier === 12 && buildings.every((b) => b.tier === 4 || b.nextTarget === null);
}

/** Reps left to the next rung, for the buildings that count reps. */
function repsLeft(building: VillageBuilding): number {
  return (building.nextTarget ?? Number.POSITIVE_INFINITY) - building.metricValue;
}

/**
 * The one building the screen puts first: the thing a single session is most likely to raise.
 *
 * Reps first, and the fewest of them wins: "40 reps of chest" is closer than "350 reps of legs"
 * whatever the percentages say, because the hero trains in reps, not in fractions. Level 0 waits
 * while any rep building is still rising, since one rep builds any of those and they would win
 * every time; once every started one is at its ceiling, a style never trained is the closest thing
 * left. Past the rep buildings the deed with the most of its bar filled takes over, because a
 * league and a boss cannot be compared to each other, and between deeds that are equally far
 * along, the fewest units left. Null when nothing has a rung left, and on day one: the screen says
 * the rule instead.
 */
export function pickNextToRise(buildings: VillageBuilding[]): VillageBuilding | null {
  if (isDayOne(buildings)) return null;
  const reps = buildings.filter(
    (b) => (b.driver === "muscle" || b.driver === "style") && b.nextTarget !== null,
  );
  const rising = reps.filter((b) => b.level > 0);
  if (rising.length > 0) {
    return rising.reduce((best, b) => (repsLeft(b) < repsLeft(best) ? b : best));
  }
  const unbuilt = reps.find((b) => b.level === 0);
  if (unbuilt) return unbuilt;

  // A kept hall at 0 of 7 routes and an unbuilt road one walk away are both at 0 %: the walk wins.
  const progress = (b: VillageBuilding) => getBuildingProgress(b) ?? 0;
  const left = (b: VillageBuilding) =>
    (b.nextTarget ?? Number.POSITIVE_INFINITY) - (b.exactValue ?? b.metricValue);
  const deeds = buildings
    .filter((b) => b.tier === 4 && b.nextTarget !== null)
    .sort((a, b) => progress(b) - progress(a) || left(a) - left(b));
  return deeds[0] ?? null;
}

/** What the victory screen hands the village: each building that rose, from which level to which. */
export type GrownBuilding = Pick<VillageGrowth, "code" | "oldLevel" | "newLevel">;

/**
 * The `grown` route param, written by the victory screen and read by the village. Both sides live
 * here so the format has one owner: `farm:3:4,barn:1:2`.
 */
export function formatGrown(growth: readonly GrownBuilding[]): string {
  return growth.map((g) => `${g.code}:${g.oldLevel}:${g.newLevel}`).join(",");
}

/** Anything malformed is dropped rather than trusted: a route param is user-reachable text. */
export function parseGrown(param: string | undefined): GrownBuilding[] {
  return (param ?? "").split(",").flatMap((part) => {
    const [code, oldLevel, newLevel] = part.split(":");
    const from = Number(oldLevel);
    const to = Number(newLevel);
    if (!(buildingCodes as readonly string[]).includes(code ?? "")) return [];
    if (!(Number.isInteger(from) && Number.isInteger(to) && to > from)) return [];
    return [{ code: code as BuildingCode, oldLevel: from, newLevel: to }];
  });
}

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
      deName: b.deName,
      esName: b.esName,
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

export const MAX_TIER: VillageTier = 12;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Average XP of a session over the last seven days, or null when there was none to average. */
export async function getWeekXpPerSession(now = new Date()): Promise<number | null> {
  const rows = await db
    .select({ xp: sum(completedQuest.xpEarned), sessions: count() })
    .from(completedQuest)
    .where(gte(completedQuest.performedAt, new Date(now.getTime() - WEEK_MS)));
  const sessions = rows[0]?.sessions ?? 0;
  return sessions > 0 ? Number(rows[0]?.xp ?? 0) / sessions : null;
}

/**
 * When the painting changes next. The village follows the hero's level and nothing else, so the
 * answer is a hero level, how many levels away, and the XP in between.
 */
export type TierProgress =
  | {
      final: false;
      tier: VillageTier;
      /** The hero level that brings the next tier. */
      nextLevel: number;
      levelsAway: number;
      totalXp: number;
      /** The hero level this tier began at, and its XP: the bar's left end. */
      fromLevel: number;
      fromXp: number;
      /** XP at `nextLevel`, the bar's right end. */
      targetXp: number;
      xpShort: number;
      /** 0-100, from where this tier began to where the next one does. */
      progress: number;
      /** Sessions like this week's that would cover the gap, or null with nothing to go by. */
      sessionsAtPace: number | null;
    }
  | { final: true; tier: VillageTier; reachedAt: number };

export function getTierProgress(
  level: number,
  totalXp: number,
  xpPerSession: number | null,
): TierProgress {
  const tier = getVillageTier(level);
  if (tier === MAX_TIER) return { final: true, tier, reachedAt: TIER_LEVEL_FLOORS[MAX_TIER] };

  const nextLevel = TIER_LEVEL_FLOORS[(tier + 1) as VillageTier];
  const fromLevel = TIER_LEVEL_FLOORS[tier];
  const fromXp = getXpForLevel(fromLevel);
  const targetXp = getXpForLevel(nextLevel);
  const xpShort = Math.max(0, targetXp - totalXp);
  return {
    final: false,
    tier,
    nextLevel,
    levelsAway: nextLevel - level,
    totalXp,
    fromLevel,
    fromXp,
    targetXp,
    xpShort,
    progress: Math.max(0, Math.min(100, ((totalXp - fromXp) / (targetXp - fromXp)) * 100)),
    sessionsAtPace: xpPerSession && xpPerSession > 0 ? Math.ceil(xpShort / xpPerSession) : null,
  };
}

/**
 * The village no longer carries a trophy wall. Achievements were already listed in the Journal,
 * and a dated rack is history, not a place: the defeated bosses moved to the Journal as their own
 * card (components/journal/BossesCard.tsx, reading `getBossBanners()`), and the "Least trained"
 * line went with the grid it annotated. "Next to rise" says the same thing with a number in it.
 */
export type VillageScene = {
  tier: VillageTier;
  level: number;
  /** The hero's rank, shown beside the level on the scene, without the level repeated in it. */
  title: Localized;
  totalXp: number;
  /** Average XP of a session over the last seven days, or null when there was none. */
  xpPerSession: number | null;
  flame: FlameLevel;
  /** Days the flame has stayed lit, which the flame's name alone does not say. */
  streakDays: number;
  dominantSport: DominantSportOverlay;
  buildings: VillageBuilding[];
};

/**
 * Everything the village scene needs, in one call. Pure aggregation over
 * existing derived sources (level, streak, muscle balance, boss fights) —
 * no village-specific table.
 */
export async function getVillageScene(): Promise<VillageScene> {
  const [levelInfo, streak, dominantSport, buildings, xpPerSession] = await Promise.all([
    getUserLevelInfo(),
    getStreakInfo(),
    getDominantSportOverlay(),
    getVillageBuildings(),
    getWeekXpPerSession(),
  ]);

  return {
    tier: getVillageTier(levelInfo.level),
    level: levelInfo.level,
    title: getLevelTitle(levelInfo.level),
    totalXp: levelInfo.totalXp,
    xpPerSession,
    flame: getFlameLevel(streak.current),
    streakDays: streak.current,
    dominantSport,
    buildings,
  };
}
