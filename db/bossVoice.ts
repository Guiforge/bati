import { reportError } from "@/src/reportError";

/**
 * The hero's words for their boss (`hero_bosses.name` / `linesJson`, 0079; the same pair lived on `adventures` in 0077).
 * A leaf: no database import, so the constants, the overlay and the file reader can use it.
 */
export const MAX_BOSS_NAME = 40;
/** The longest painted line is 55 (de); the bubble is maxW 180. */
export const MAX_BOSS_LINE = 60;
/** Per moment. */
export const MAX_BOSS_LINES = 3;
/**
 * `intro` when the fight opens (the panel, then the arena's first bubble) and `defeat` on the felled
 * boss's victory card: the painted bosses have neither. Not `resist`: a resisted hit keeps the
 * painted lines only. Stored in the same JSON, read by name, so a row from before `intro` and `defeat`
 * simply has none.
 */
export const BOSS_LINE_MOMENTS = ["intro", "idle", "crit", "enrage", "defeat"] as const;
export type BossLineMoment = (typeof BOSS_LINE_MOMENTS)[number];
export type HeroBossLines = Record<BossLineMoment, string[]>;

/**
 * The hero's own pictures for their boss, one per form the painted bosses have. Each is a `data:`
 * image the photo path encoded, and each is optional: a form without one shows the normal picture
 * (or, with no normal one, the painted monster's own form).
 */
export const BOSS_ART_STATES = ["fresh", "wounded", "defeated", "legendary"] as const;
export type BossArtState = (typeof BOSS_ART_STATES)[number];
export type BossArt = Partial<Record<BossArtState, string>>;

export const noBossLines = (): HeroBossLines => ({
  intro: [],
  idle: [],
  crit: [],
  enrage: [],
  defeat: [],
});

/**
 * Cut to `max` UTF-16 units, the unit the editors' `maxLength` count in, without leaving half a
 * surrogate pair at the end. One source for the writer, the editor and the file reader.
 */
export function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  const last = value.charCodeAt(max - 1);
  const cut = last >= 0xd800 && last <= 0xdbff ? max - 1 : max;
  return value.slice(0, cut).trim();
}

/** Trimmed, empty lines dropped, 3 per moment, each cut to MAX_BOSS_LINE. Key order fixed. */
export function cleanBossLines(
  lines: Partial<Record<BossLineMoment, readonly string[]>>,
): HeroBossLines {
  const out = noBossLines();
  for (const m of BOSS_LINE_MOMENTS) {
    out[m] = (lines[m] ?? [])
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, MAX_BOSS_LINES)
      .map((s) => clip(s, MAX_BOSS_LINE));
  }
  return out;
}

/** Only `data:` images, only the four known forms, in fixed order. Never throws. */
export function cleanBossArt(art: Partial<Record<BossArtState, unknown>> | undefined): BossArt {
  const out: BossArt = {};
  for (const state of BOSS_ART_STATES) {
    const value = art?.[state];
    if (typeof value === "string" && value.startsWith("data:image/")) out[state] = value;
  }
  return out;
}

/** The column value: null when no moment has a line; JSON in BOSS_LINE_MOMENTS order otherwise. */
export function bossLinesJson(
  lines: Partial<Record<BossLineMoment, readonly string[]>>,
): string | null {
  const clean = cleanBossLines(lines);
  return BOSS_LINE_MOMENTS.some((m) => clean[m].length > 0) ? JSON.stringify(clean) : null;
}

/** The `artJson` value: null when no form has a picture. */
export function bossArtJson(art: BossArt | undefined): string | null {
  const clean = cleanBossArt(art);
  return Object.keys(clean).length > 0 ? JSON.stringify(clean) : null;
}

/** The pictures of `artJson` read back. Null, empty or unparsable: none, reported, never thrown. */
export function parseBossArt(json: string | null | undefined): BossArt {
  if (!json) return {};
  try {
    const value: unknown = JSON.parse(json);
    if (typeof value !== "object" || value === null) return {};
    return cleanBossArt(value as Record<string, unknown>);
  } catch (error) {
    reportError("boss.art", error);
    return {};
  }
}

/** The column read back. Null or empty: no lines. Unparsable: no lines, reported, never thrown. */
export function parseBossLines(json: string | null | undefined): HeroBossLines {
  if (!json) return noBossLines();
  try {
    const value: unknown = JSON.parse(json);
    if (typeof value !== "object" || value === null) return noBossLines();
    const record = value as Record<string, unknown>;
    const picked: Partial<Record<BossLineMoment, string[]>> = {};
    for (const m of BOSS_LINE_MOMENTS) {
      const list = record[m];
      picked[m] = Array.isArray(list) ? list.filter((s): s is string => typeof s === "string") : [];
    }
    return cleanBossLines(picked);
  } catch (error) {
    reportError("boss.lines", error);
    return noBossLines();
  }
}
