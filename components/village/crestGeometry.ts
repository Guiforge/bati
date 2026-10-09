import { getTokenValue } from "tamagui";
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

const r1 = (n: number) => Math.round(n * 10) / 10;

const SIDE_Y = 56;
/** The shield's right flank, from (96, 56) to the point, as a cubic Bezier. */
const FLANK = [
  [96, SIDE_Y],
  [96, 88],
  [72, 104],
  [48, VIEW_H],
] as const;

function flankAt(t: number): { x: number; y: number; nx: number; ny: number } {
  const m = 1 - t;
  const [p0, p1, p2, p3] = FLANK;
  const at = (i: 0 | 1) =>
    m ** 3 * p0[i] + 3 * m * m * t * p1[i] + 3 * m * t * t * p2[i] + t ** 3 * p3[i];
  const dt = (i: 0 | 1) =>
    3 * m * m * (p1[i] - p0[i]) + 6 * m * t * (p2[i] - p1[i]) + 3 * t * t * (p3[i] - p2[i]);
  const len = Math.hypot(dt(0), dt(1));
  // Going down the right flank, the inward side is the tangent turned a quarter turn.
  return { x: at(0), y: at(1), nx: -dt(1) / len, ny: dt(0) / len };
}

/**
 * The shield's outline moved inward by `m` everywhere, the line the filet is stroked along: the
 * flank is offset along its normal, sampled, and cut where the two flanks meet on the axis.
 */
export function insetShield(m: number): string {
  const STEPS = 24;
  const flank: [number, number][] = [];
  let prev: [number, number] | null = null;
  for (let i = 0; i <= STEPS; i++) {
    const f = flankAt(i / STEPS);
    const p: [number, number] = [f.x + m * f.nx, f.y + m * f.ny];
    if (prev !== null && p[0] <= 48) {
      // Crossed the axis: stop on it.
      const k = (prev[0] - 48) / (prev[0] - p[0]);
      flank.push([48, prev[1] + k * (p[1] - prev[1])]);
      break;
    }
    flank.push(p);
    prev = p;
  }
  const right = flank.map(([x, y]) => `L${r1(x)} ${r1(y)}`).join("");
  const left = flank
    .slice(0, -1)
    .reverse()
    .map(([x, y]) => `L${r1(VIEW_W - x)} ${r1(y)}`)
    .join("");
  return `M${m} ${m}H${VIEW_W - m}${right}${left}Z`;
}

/** The boar's second pair of quarters (top right, bottom left), over a shield of the first. */
export const QUARTERS_B = `M48 0H${VIEW_W}V56H48ZM0 56H48V${VIEW_H}C24 104 0 88 0 56Z`;

/**
 * The ink cross between the boar's quarters, as two filled rectangles on whole pixels: a stroke
 * centred on 48 u and 56 u is 11.5 to 12.5 px at 24, a grey smear. 1 px at 24, 2 px above.
 */
export function crossRects(size: CrestSize): { x: number; y: number; w: number; h: number }[] {
  const s = size / VIEW_W;
  const w = filetWidth(size);
  const snap = (centre: number) => Math.round(centre * s - (w * s) / 2) / s;
  return [
    { x: snap(48), y: 0, w, h: VIEW_H },
    { x: 0, y: snap(SIDE_Y), w: VIEW_W, h: w },
  ];
}
export const crossPath = (size: CrestSize): string =>
  crossRects(size)
    .map(({ x, y, w, h }) => `M${r1(x)} ${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}Z`)
    .join("");
export const BAND = `M0 0H${VIEW_W}V${BAND_H}H0Z`;

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

const PITCH = 6;
const PER_ROW = 5;
const PAD = 2;
/** The pastille's bottom edge: the lowest the point of the shield leaves it room, for two rows. */
const PASTILLE_BOTTOM = 90;

const circle = (cx: number, cy: number, r: number) =>
  `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0Z`;

export type RingsLayout = {
  pastille: string;
  rings: string;
  /** The pastille's bounding box, its corners rounded inside it. */
  box: { x: number; y: number; w: number; h: number };
  centres: [number, number][];
  r: number;
};

/**
 * One ring per year. Up to 10 they sit `PER_ROW` to a row, in at most two rows, on a pastille
 * that ends at `PASTILLE_BOTTOM` and stays clear of the filet and of the animal's box. Past 10
 * the rows stay two and the rings shrink to fit the same width: legible to about 14, and one ring
 * per year always, which is the rule that matters.
 */
export function ringsLayout(n: number): RingsLayout {
  const rows = n > PER_ROW ? 2 : 1;
  const perRow = n > PER_ROW ? Math.max(PER_ROW, Math.ceil(n / 2)) : n;
  const pitch = Math.min(PITCH, (PER_ROW * PITCH) / perRow);
  const r = (pitch * 13) / 30;
  const w = perRow * pitch + 2 * PAD;
  const h = rows * pitch + 2 * PAD - 1;
  const box = { x: 48 - w / 2, y: PASTILLE_BOTTOM - h, w, h };
  const rad = 5;
  const pastille = `M${r1(box.x + rad)} ${r1(box.y)}h${r1(w - 2 * rad)}a${rad} ${rad} 0 0 1 ${rad} ${rad}v${r1(h - 2 * rad)}a${rad} ${rad} 0 0 1 ${-rad} ${rad}h${r1(2 * rad - w)}a${rad} ${rad} 0 0 1 ${-rad} ${-rad}v${r1(2 * rad - h)}a${rad} ${rad} 0 0 1 ${rad} ${-rad}Z`;
  const centres: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, n - row * perRow);
    const cx = 48 + ((i % perRow) - (inRow - 1) / 2) * pitch;
    centres.push([cx, box.y + h / 2 + ((rows - 1) / 2 - row) * pitch]);
  }
  return { pastille, rings: centres.map(([x, y]) => circle(x, y, r)).join(""), box, centres, r };
}

/**
 * The choice's diamond, right of the animal. Only from 48 up: the mockup shows it "en 48 et 96",
 * 24 px has no room for a mark that small. Its point keeps 2 u clear of the filet's inner edge.
 */
export const DIAMOND = "M77 44L81 48L77 52L73 48Z";
/** The animal's box inside the viewBox. */
export const ANIMAL_BOX = { x: 25, y: 28, size: 46 } as const;

/** The plate a crest sits on over a painting (`Crest`): its padding token, plus a 1 border. */
export const CREST_PLATE_PAD = "$1.5";

/** The room a crest takes, plate included, so a skeleton can hold exactly its place. */
export function crestFootprint(size: CrestSize, onPainting = false) {
  const pad = onPainting ? Number(getTokenValue(CREST_PLATE_PAD, "space")) + 1 : 0;
  return { width: size + 2 * pad, height: (VIEW_H * size) / VIEW_W + 2 * pad };
}
