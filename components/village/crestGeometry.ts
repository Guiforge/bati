/** The crest's drawing, in a 96 x 112 box. Pure, so the pixel arithmetic can be tested. */
export const VIEW_W = 96;
export const VIEW_H = 112;
/** The border, 8 u of 96: 2 px at 24. */
export const BORDER = 8;
export const BAND_H = 22;

export type CrestSize = 24 | 48 | 56 | 96;

/**
 * The ink line between two animal colours: 1 px at 24, 2 px above, in viewBox units. At 24 it is
 * 4 u, so with the border's 8 u it spans pixels 2 to 3, whole ones.
 */
export const filetWidth = (size: CrestSize): number => (size === 24 ? 1 : 2) / (size / VIEW_W);

/** Where the filet's centre line runs: its outer edge sits on the border's inner edge. */
export const filetInset = (size: CrestSize): number => BORDER + filetWidth(size) / 2;

export const SHIELD = `M0 0H${VIEW_W}V56C96 88 72 104 48 ${VIEW_H}C24 104 0 88 0 56Z`;

/** The shield shrunk by `m` on every side, the line the filet is stroked along. */
export function insetShield(m: number): string {
  const k = (48 - m) / 48;
  const tip = VIEW_H - 1.7 * m;
  const ky = (tip - 56) / 56;
  const x = (dx: number) => 48 + dx * k;
  const y = (dy: number) => 56 + dy * ky;
  return `M${m} ${m}H${VIEW_W - m}V56C${x(48)} ${y(32)} ${x(24)} ${y(48)} 48 ${tip}C${x(-24)} ${y(48)} ${x(-48)} ${y(32)} ${m} 56Z`;
}

/** The boar's second pair of quarters (top right, bottom left), over a shield of the first. */
export const QUARTERS_B = `M48 0H${VIEW_W}V56H48ZM0 56H48V${VIEW_H}C24 104 0 88 0 56Z`;
export const CROSS = `M48 0V${VIEW_H}M0 56H${VIEW_W}`;
export const BAND = `M0 0H${VIEW_W}V${BAND_H}H0Z`;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** `n` flames side by side, centred, in one path. */
export function flamesPath(n: number): string {
  const pitch = 13;
  const x0 = 48 - ((n - 1) * pitch) / 2;
  let d = "";
  for (let i = 0; i < n; i++) {
    const cx = r1(x0 + i * pitch);
    d += `M${cx} 4C${r1(cx + 6)} 9 ${r1(cx + 5)} 15 ${cx} 18C${r1(cx - 5)} 15 ${r1(cx - 6)} 9 ${cx} 4Z`;
  }
  return d;
}

const RING_R = 2.6;
const RING_PITCH = 7;
const PER_ROW = 5;
const RING_BASE_Y = 88;

const circle = (cx: number, cy: number, r: number) =>
  `M${r1(cx - r)} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

/** One ring per year, `PER_ROW` to a row, rows growing upward from the shield's point. */
export function ringsLayout(n: number): { pastille: string; rings: string } {
  const rows = Math.ceil(n / PER_ROW);
  const perRow = Math.min(n, PER_ROW);
  const w = perRow * RING_PITCH + 6;
  const top = RING_BASE_Y - (rows - 1) * RING_PITCH - RING_PITCH / 2 - 2;
  const h = RING_BASE_Y + RING_PITCH / 2 + 2 - top;
  const x = 48 - w / 2;
  const rad = 5;
  const pastille = `M${r1(x + rad)} ${r1(top)}h${r1(w - 2 * rad)}a${rad} ${rad} 0 0 1 ${rad} ${rad}v${r1(h - 2 * rad)}a${rad} ${rad} 0 0 1 ${-rad} ${rad}h${r1(2 * rad - w)}a${rad} ${rad} 0 0 1 ${-rad} ${-rad}v${r1(2 * rad - h)}a${rad} ${rad} 0 0 1 ${rad} ${-rad}Z`;
  let rings = "";
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / PER_ROW);
    const inRow = Math.min(PER_ROW, n - row * PER_ROW);
    const col = i % PER_ROW;
    const cx = 48 + (col - (inRow - 1) / 2) * RING_PITCH;
    rings += circle(cx, RING_BASE_Y - row * RING_PITCH, RING_R);
  }
  return { pastille, rings };
}

export const DIAMOND = "M79 46L84 51L79 56L74 51Z";
/** The animal's box inside the viewBox. */
export const ANIMAL_BOX = { x: 25, y: 28, size: 46 } as const;
