// The magic layer's pure parts (MagieBld.tsx draws them): the marks round the rings, the periods and
// the clock's breath. Worklets, so the animated styles read them on the UI thread.

/**
 * The marks cut round the rings, each in a 10 x 10 box: a bar, a cross, a notch and a lozenge. Four
 * more than effets.ts's one rune, none of them a letter.
 */
export const MARQUES_GLYPHE = [
  "M4.2 0H5.8V10H4.2Z",
  "M4.2 0H5.8V4.2H10V5.8H5.8V10H4.2V5.8H0V4.2H4.2Z",
  "M0 10L5 0L10 10L5 7.4Z",
  "M5 0L10 5L5 10L0 5Z",
] as const;

/** Whole turns of the outer and the inner ring, ms. */
export const PERIODE_EXTERIEUR_MS = 8000;
export const PERIODE_INTERIEUR_MS = 12000;
export const NB_MARQUES = 8;
export const MARQUE_DP = 5;

/** The ring's angle in degrees at clock `c`: `sens` one way or the other, one turn in `periode`. */
export function angleAnneau(c: number, periode: number, sens: 1 | -1): number {
  "worklet";
  return sens * 360 * ((c % periode) / periode);
}

/** The breath of the hidden disc: 1 to 1.15 over a 5 s cycle, at rest on 1 at every boundary. */
export function souffleZone(c: number): number {
  "worklet";
  return 1 + 0.15 * (0.5 - 0.5 * Math.cos((2 * Math.PI * (c % 5000)) / 5000));
}

/** A firefly's drift at clock `c`, dp, on its own phase `i`: a small loop that closes every 5 s. */
export function deriveLuciole(c: number, i: number): { x: number; y: number; o: number } {
  "worklet";
  const u = (2 * Math.PI * (c % 5000)) / 5000;
  return {
    x: 5 * Math.sin(u + i * 1.3),
    y: 4 * Math.cos(2 * u + i * 0.9),
    o: 0.55 + 0.45 * Math.sin(u + i * 2.1),
  };
}
