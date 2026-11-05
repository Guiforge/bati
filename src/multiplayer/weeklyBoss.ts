import { sha256 } from "@noble/hashes/sha2.js";
import { BOSS_ASSETS, type BossAssetKey } from "@/constants/assetMap";
import type { IsoWeek } from "./duoWeek";
import { fromHex } from "./envelope";

/**
 * The boss of a duo's week and its affix, the same on both phones: drawn from SHA-256 of the pair's
 * id and the ISO week, which both hold. Ambiance only (LOT1-SPEC.md § 4): an affix changes a line of
 * flavour, never the rule, and the boss has no health to lose.
 */
export const AFFIXES = ["swift", "armoured", "hungry", "cunning", "ancient", "furious"] as const;

const BOSSES = Object.keys(BOSS_ASSETS) as BossAssetKey[];

export function weeklyBoss(pairId: string, { isoYear, isoWeek }: IsoWeek) {
  const seed = new Uint8Array(19);
  seed.set(fromHex(pairId, 16));
  new DataView(seed.buffer).setUint16(16, isoYear);
  seed[18] = isoWeek;
  const [a = 0, b = 0] = sha256(seed);
  return {
    boss: BOSSES[a % BOSSES.length] ?? "stone_golem",
    affix: AFFIXES[b % AFFIXES.length] ?? "swift",
  };
}
