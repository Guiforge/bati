import { BOSS_ASSETS, type BossAssetKey, getBossKey } from "@/constants/assetMap";
import { localized } from "@/src/i18n/copy";
import type { AppLanguage, Localized } from "@/src/i18n/deviceLanguage";
import { localizedName } from "@/src/i18n/localized";

/**
 * Who each monster is, and what it says.
 *
 * There is no name column: `BossFight.enName` is the *campaign's* title, so the arena used to
 * announce a fire dragon as "The Iron Lord's Conquest". The painting is the only place a boss's
 * identity is actually written down, so `getBossKey()` reads it out of `bossImagePath` and every
 * boss-specific string is keyed by that.
 *
 * The words are the `bosses` block of `locales/*.json`, read here into a typed record: `Record<
 * BossAssetKey, …>` makes shipping a painting without its copy a compile error, which is stronger
 * than the locale-parity test, and it needs no `returnObjects` plumbing to hand back a pool.
 *
 * Taunts are grouped by what they answer, not by a timer. `BossTauntOverlay` picks the pool from
 * the hit that just landed — a crit gets `crit`, a resisted blow gets `resist`, phase 4 gets
 * `enrage` — so the boss talks about your set instead of over it.
 */
export type BossVoice = {
  name: Localized;
  /** What the monster is called at tier ≥ 1 — the rematch form. Same beast, a bigger title. */
  legendaryName: Localized;
  /** Nothing notable happened; the boss fills the silence. */
  idle: LocalizedPool;
  /** The hero exceeded the target and rolled a crit. */
  crit: LocalizedPool;
  /** The hit landed on the boss's resistance and dealt half. */
  resist: LocalizedPool;
  /** Below 25 % HP. */
  enrage: LocalizedPool;
};

/**
 * Non-empty: a boss with nothing to say would return `undefined` from every pick. A JSON array
 * cannot carry that in its type, so `poolOf` asserts it and `__tests__/i18n-keys.test.ts` is what
 * holds every pool in the locale files to it.
 */
type LocalizedPool = Localized<[string, ...string[]]>;

/**
 * What to call the thing on screen.
 *
 * Tier ≥ 1 gets the legendary title — the rematch is the same monster with a bigger name — and a
 * shiny encounter gleams in front of whatever the name is. Falls back to the campaign title —
 * which is what `BossFight.enName`/`frName` hold — for content that ships without a painting.
 * That is the only reason those fields still exist.
 */
export function bossDisplayName(
  fight: {
    imagePath: string;
    enName: string;
    frName: string;
    deName: string;
    esName: string;
    ruName: string;
    zhName: string;
    tier?: number;
    shiny?: boolean;
    bossName?: string | null;
  },
  language: AppLanguage,
): string {
  const key = getBossKey(fight.imagePath);
  const prefix = fight.shiny ? "✨ " : "";
  // The hero named it once: the same at every tier (0077).
  if (fight.bossName) return prefix + fight.bossName;
  if (key) {
    const entry = (fight.tier ?? 0) >= 1 ? BOSSES[key].legendaryName : BOSSES[key].name;
    return prefix + entry[language];
  }
  return prefix + localizedName(fight, language);
}

/**
 * The boss's name in every language, at a tier, falling back to the campaign title for unpainted
 * content. For callers that hold a `Localized` rather than a language (kill reports): the name is
 * the boss's, never the adventure's.
 */
export function bossLocalizedName(
  imagePath: string | null | undefined,
  tier: number,
  campaign: Localized,
): Localized {
  const key = getBossKey(imagePath);
  if (!key) return campaign;
  return tier >= 1 ? BOSSES[key].legendaryName : BOSSES[key].name;
}

/** The boss's own voice, or the golem's as a stand-in for unpainted content. */
export function bossVoice(imagePath: string): BossVoice {
  return BOSSES[getBossKey(imagePath) ?? "stone_golem"];
}

const poolOf = (read: Parameters<typeof localized<string[]>>[0]) =>
  localized(read) as LocalizedPool;

/** Indexed by `BossAssetKey`: a painting with no block in `en.json` does not compile. */
const voiceOf = (key: BossAssetKey): BossVoice => ({
  name: localized((l) => l.bosses[key].name),
  legendaryName: localized((l) => l.bosses[key].legendaryName),
  idle: poolOf((l) => l.bosses[key].idle),
  crit: poolOf((l) => l.bosses[key].crit),
  resist: poolOf((l) => l.bosses[key].resist),
  enrage: poolOf((l) => l.bosses[key].enrage),
});

export const BOSSES = Object.fromEntries(
  (Object.keys(BOSS_ASSETS) as BossAssetKey[]).map((key) => [key, voiceOf(key)]),
) as Record<BossAssetKey, BossVoice>;
