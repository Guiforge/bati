import { getTokenValue } from "tamagui";
/** The crest's drawing, in a 96 x 112 box. Pure, so the pixel arithmetic can be tested. */
export const VIEW_W = 96;
export const VIEW_H = 112;
/** The border, 8 u of 96: 2 px at 24. */
export const BORDER = 8;

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
/** The bottom of the flame band, in u: the animal's box starts one unit under it. */
const BAND_BOTTOM = 27;

/**
 * The flame band: ink, inside the border and over the filet's own ink, never up to the edge of
 * the shield. A single animal keeps a rim of its colour (the border's width) above and beside the
 * band, so the shield's silhouette stays whole on `bgDark`, which is also the ink.
 */
export const BAND = `M${BORDER} ${BORDER}H${VIEW_W - BORDER}V${BAND_BOTTOM}H${BORDER}Z`;

/** `n` flames side by side, centred, in one path, inside `BAND`. */
export function flamesPath(n: number): string {
  const pitch = 13;
  const x0 = 48 - ((n - 1) * pitch) / 2;
  let d = "";
  for (let i = 0; i < n; i++) {
    const cx = r1(x0 + i * pitch);
    d += `M${cx} 12C${r1(cx + 5)} 16 ${r1(cx + 4)} 21 ${cx} 24C${r1(cx - 4)} 21 ${r1(cx - 5)} 16 ${cx} 12Z`;
  }
  return d;
}

const PER_ROW = 5;
const PAD = 2;
/** The space left between two rings, row to row and ring to ring, in u: 1 px or more at 96. */
export const RING_GAP = 1.2;
/** The pastille's bottom edge: the lowest the point of the shield leaves it room, for two rows. */
const PASTILLE_BOTTOM = 90;
/** Ring to ring, centre to centre, at 5 or fewer per row. */
const PITCH = 6.4;

/** A circle as one closed sub-path, to be stroked: a ring, not a disc. */
const circle = (cx: number, cy: number, r: number) =>
  `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0Z`;

export type RingsLayout = {
  pastille: string;
  /** The rings' centre lines: stroked in gold, `strokeWidth` wide, never filled. */
  rings: string;
  strokeWidth: number;
  /** The pastille's bounding box, its corners rounded inside it. */
  box: { x: number; y: number; w: number; h: number };
  centres: [number, number][];
  /** The centre line's radius: the outside of a ring is `r + strokeWidth / 2`. */
  r: number;
};

/**
 * One hollow ring per year, gold on an ink pastille. Up to 5 they share a row at the full pitch;
 * from 6 there are two rows of `ceil(n / 2)`, and past 10 the pitch shrinks so the pastille keeps
 * its width. A visible `RING_GAP` stays between neighbours at every count: what gives is the
 * ring's size (5.2 u across at 5 or fewer per row, 3.4 u at 7, the last count the hollow of a
 * ring reads at 96), never the count. That is the whole rule: one per year, two rows at most.
 */
export function ringsLayout(n: number): RingsLayout {
  const rows = n > PER_ROW ? 2 : 1;
  const perRow = n > PER_ROW ? Math.max(PER_ROW, Math.ceil(n / 2)) : n;
  const pitch = Math.min(PITCH, (PER_ROW * PITCH) / perRow);
  const outer = pitch - RING_GAP;
  const strokeWidth = r1(Math.min(1, outer * 0.2));
  const r = r1((outer - strokeWidth) / 2);
  const w = perRow * pitch + 2 * PAD - RING_GAP;
  const h = (rows - 1) * pitch + outer + 2 * PAD;
  const box = { x: 48 - w / 2, y: PASTILLE_BOTTOM - h, w, h };
  const rad = 5;
  const pastille = `M${r1(box.x + rad)} ${r1(box.y)}h${r1(w - 2 * rad)}a${rad} ${rad} 0 0 1 ${rad} ${rad}v${r1(h - 2 * rad)}a${rad} ${rad} 0 0 1 ${-rad} ${rad}h${r1(2 * rad - w)}a${rad} ${rad} 0 0 1 ${-rad} ${-rad}v${r1(2 * rad - h)}a${rad} ${rad} 0 0 1 ${rad} ${-rad}Z`;
  const centres: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, n - row * perRow);
    const cx = 48 + ((i % perRow) - (inRow - 1) / 2) * pitch;
    centres.push([cx, box.y + h / 2 + (row - (rows - 1) / 2) * pitch]);
  }
  return {
    pastille,
    rings: centres.map(([x, y]) => circle(x, y, r)).join(""),
    strokeWidth,
    box,
    centres,
    r,
  };
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
