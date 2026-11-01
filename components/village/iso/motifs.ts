// The fill of the streets by rank (T22 round 2; the stream is flat water since round 3, the grey texture read as tarmac).
// Each takes a seamless night texture (iso-artist, reports/T22-art.md: 256 px WebP), tiled by one
// `<Pattern patternUnits="userSpaceOnUse">` in the ground tile that uses it (MotifsSol.tsx). A tile's
// viewBox is in map coordinates, so a pattern at x = 0, y = 0 lines up from one tile to the next.
// A motif without a texture falls back on its flat night colour.

export type Motif = "terre" | "pierres" | "paves";

/**
 * The accepted textures (assets/images/village/iso/motifs/<motif>.nuit.webp), by motif. `paves` has
 * none (T38, constat 11): its image is a running bond in screen axes whose vertical joints showed as
 * dark vertical lines on the isometric square; pave.ts draws the stones in the ground's axes.
 */
export const TEXTURES: Partial<Record<Motif, number>> = {
  terre: require("@/assets/images/village/iso/motifs/terre.nuit.webp"),
  pierres: require("@/assets/images/village/iso/motifs/pierres.nuit.webp"),
};

/** One repeat of a texture, in map units: 2.67 cells wide, squashed 2:1 like the iso ground (T22-art; 4 cells read as a carpet next to the sprites, 31/10). */
export const REPETITION = { w: 128, h: 64 } as const;

/** The warm veil inside each texture (isoRueVoile, MotifsSol): the earth was pale beige, the stones' ink too contrasted. */
export const VOILE_MOTIF: Partial<Record<Motif, number>> = { terre: 0.6, pierres: 0.45 };

/** The same veil by night (isoRueVoileNuit, a cold #2E3552): a warm brown over a dark texture read as ochre. */
export const VOILE_MOTIF_NUIT: Partial<Record<Motif, number>> = { terre: 0.5, pierres: 0.5 };

/**
 * How dark the shadowed copy's veil is: the same textured shape, then its shadow colour at this
 * opacity over it (no second image).
 */
export const VOILE_OMBRE = 0.38;

export const idMotif = (m: Motif) => `motif-${m}`;

/** What fills a shape of motif `m`: its texture's pattern, none without one (the caller's flat colour then). */
export const remplissage = (m: Motif): string | undefined =>
  TEXTURES[m] === undefined ? undefined : `url(#${idMotif(m)})`;
