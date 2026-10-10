import {
  ANIMAL_BOX,
  BAND,
  BORDER,
  type CrestSize,
  crossRects,
  DIAMOND,
  filetInset,
  filetWidth,
  flamesPath,
  insetShield,
  RING_GAP,
  ringsLayout,
  SHIELD,
  VIEW_W,
} from "@/components/village/crestGeometry";

// "Calé au pixel en 24": the ink line is one whole pixel wide and starts on a whole pixel, or the
// phone anti-aliases it into a grey smear that reads as a different colour.
describe("crest filet geometry", () => {
  const px = (units: number, size: CrestSize) => units * (size / VIEW_W);

  it("is exactly 1 px wide and starts on pixel 2 at size 24", () => {
    expect(px(filetWidth(24), 24)).toBeCloseTo(1, 10);
    expect(px(BORDER, 24)).toBe(2);
    // Stroked along its centre line: the outer edge is the border's inner edge.
    expect(px(filetInset(24) - filetWidth(24) / 2, 24)).toBe(2);
  });

  it("is 2 px wide from 48 up", () => {
    for (const size of [48, 56, 96] as const) expect(px(filetWidth(size), size)).toBeCloseTo(2, 10);
  });
});

type Pt = [number, number];

const cubic = (cur: Pt, n: number[]): Pt[] => {
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0, x3 = 0, y3 = 0] = n;
  const at = (t: number, a: number, b: number, c: number, d: number) =>
    (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
  return Array.from({ length: 200 }, (_, i): Pt => {
    const t = (i + 1) / 200;
    return [at(t, cur[0], x1, x2, x3), at(t, cur[1], y1, y2, y3)];
  });
};

/** Samples an absolute M/H/V/L/C/Z path (the shapes the crest uses) into points. */
function sample(d: string): Pt[] {
  const out: Pt[] = [];
  let cur: Pt = [0, 0];
  for (const [, cmd, args] of d.matchAll(/([MHVLCZ])([^MHVLCZ]*)/g)) {
    const n = (args ?? "")
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    const next: Pt[] = {
      M: [[n[0] ?? 0, n[1] ?? 0]] as Pt[],
      L: [[n[0] ?? 0, n[1] ?? 0]] as Pt[],
      H: [[n[0] ?? 0, cur[1]]] as Pt[],
      V: [[cur[0], n[0] ?? 0]] as Pt[],
      C: cubic(cur, n),
      Z: [] as Pt[],
    }[cmd as "M"];
    out.push(...next);
    cur = next.at(-1) ?? cur;
  }
  return out;
}

/** The path as a dense polyline: every segment cut into steps of at most 0.1 u. */
function dense(d: string): Pt[] {
  const pts = sample(d);
  const out: Pt[] = [];
  pts.forEach((p, i) => {
    const q = pts[i + 1] ?? pts[0];
    if (q === undefined) return;
    const steps = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.1));
    for (let k = 0; k < steps; k++)
      out.push([p[0] + ((q[0] - p[0]) * k) / steps, p[1] + ((q[1] - p[1]) * k) / steps]);
  });
  return out;
}

const OUTLINE = dense(SHIELD);
const distToOutline = ([x, y]: Pt) =>
  Math.min(...OUTLINE.map(([a, b]) => Math.hypot(a - x, b - y)));

describe("crest border", () => {
  it("is the same width everywhere: the inset line stays at one distance from the outline", () => {
    for (const m of [9, 10]) {
      const ds = dense(insetShield(m)).map(distToOutline);
      expect(Math.min(...ds)).toBeGreaterThan(m - 1);
      expect(Math.max(...ds)).toBeLessThan(m + 1);
    }
  });
});

describe("crest cross", () => {
  const px = (units: number, size: CrestSize) => units * (size / VIEW_W);
  const whole = (n: number) => Math.abs(n - Math.round(n)) < 1e-9;

  it("covers whole pixels at 24, 1 px wide, and 2 px wide at 48 and 96", () => {
    const [v, h] = crossRects(24);
    for (const edge of [v?.x, (v?.x ?? 0) + (v?.w ?? 0), h?.y, (h?.y ?? 0) + (h?.h ?? 0)])
      expect(whole(px(edge ?? 0.5, 24))).toBe(true);
    expect(px(v?.w ?? 0, 24)).toBeCloseTo(1, 10);
    expect(px(h?.h ?? 0, 24)).toBeCloseTo(1, 10);
    for (const size of [48, 96] as const) {
      const [bar, side] = crossRects(size);
      expect(px(bar?.w ?? 0, size)).toBeCloseTo(2, 10);
      expect(px(side?.h ?? 0, size)).toBeCloseTo(2, 10);
      expect(whole(px(bar?.x ?? 0.5, size))).toBe(true);
    }
  });
});

describe("crest diamond", () => {
  it("keeps 2 u of air from the filet's inner edge at 48, 56 and 96", () => {
    const tip = Math.max(...[...DIAMOND.matchAll(/[ML](\d+) /g)].map((m) => Number(m[1])));
    for (const size of [48, 56, 96] as const)
      expect(VIEW_W - BORDER - filetWidth(size) - tip).toBeGreaterThanOrEqual(2);
  });
});

describe("crest diamond, cross", () => {
  it("keeps 1 px of air above the cross's horizontal bar at 48, 56 and 96", () => {
    const ys = [...DIAMOND.matchAll(/[ML]\d+ (\d+)/g)].map((m) => Number(m[1]));
    for (const size of [48, 56, 96] as const) {
      const bar = crossRects(size)[1];
      expect(((bar?.y ?? 0) - Math.max(...ys)) * (size / VIEW_W)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("crest diamond, size", () => {
  const xs = [...DIAMOND.matchAll(/[ML](\d+) /g)].map((m) => Number(m[1]));

  it("is at least 10 u across (5 px at 48), and stays off the animal's box", () => {
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThanOrEqual(10);
    expect(Math.min(...xs)).toBeGreaterThan(ANIMAL_BOX.x + ANIMAL_BOX.size);
  });
});

describe("crest rings", () => {
  const inner = BORDER + filetWidth(96);
  const corners = (b: { x: number; y: number; w: number; h: number }): Pt[] => [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x, b.y + b.h],
    [b.x + b.w, b.y + b.h],
    [b.x + b.w / 2, b.y + b.h],
  ];

  it("keeps the pastille off the filet and the border, and off the animal's box, for 1 to 10", () => {
    for (let n = 1; n <= 10; n++) {
      const { box } = ringsLayout(n);
      for (const p of corners(box)) expect(distToOutline(p)).toBeGreaterThanOrEqual(inner + 1);
      expect(box.y).toBeGreaterThanOrEqual(ANIMAL_BOX.y + ANIMAL_BOX.size);
    }
  });

  it("keeps every ring inside its pastille, one per year, even past 10", () => {
    for (let n = 1; n <= 14; n++) {
      const { box, centres, r, strokeWidth } = ringsLayout(n);
      const out = r + strokeWidth / 2;
      expect(centres).toHaveLength(n);
      for (const [x, y] of centres) {
        expect(x - out).toBeGreaterThan(box.x);
        expect(x + out).toBeLessThan(box.x + box.w);
        expect(y - out).toBeGreaterThan(box.y);
        expect(y + out).toBeLessThan(box.y + box.h);
      }
    }
  });

  it("has 5 to a row and 2 rows at most", () => {
    for (let n = 1; n <= 14; n++) {
      const { centres } = ringsLayout(n);
      const rows = new Set(centres.map(([, y]) => y));
      expect(rows.size).toBeLessThanOrEqual(2);
      for (const y of rows) {
        const inRow = centres.filter((c) => c[1] === y).length;
        if (n <= 10) expect(inRow).toBeLessThanOrEqual(5);
      }
    }
  });

  it("leaves a visible gap between rings and a hollow in each, up to 14", () => {
    // 0.1 u under the nominal gap: the radii are rounded to a tenth.
    for (let n = 1; n <= 14; n++) {
      const { centres, r, strokeWidth } = ringsLayout(n);
      const out = r + strokeWidth / 2;
      for (const [i, a] of centres.entries())
        for (const b of centres.slice(i + 1))
          expect(Math.hypot(a[0] - b[0], a[1] - b[1]) - 2 * out).toBeGreaterThanOrEqual(
            RING_GAP - 0.1,
          );
      expect(2 * (r - strokeWidth / 2)).toBeGreaterThanOrEqual(1.9);
    }
  });

  it("is a stroked outline, not a disc", () => {
    expect(ringsLayout(3).strokeWidth).toBeGreaterThan(0);
  });
});

describe("crest flame band", () => {
  const xs = (d: string) => sample(d).map((p) => p[0]);
  const ys = (d: string) => sample(d).map((p) => p[1]);

  it("sits inside the border, not on the edge of the shield, so the silhouette stays whole", () => {
    expect(Math.min(...xs(BAND))).toBeGreaterThanOrEqual(BORDER);
    expect(Math.max(...xs(BAND))).toBeLessThanOrEqual(VIEW_W - BORDER);
    expect(Math.min(...ys(BAND))).toBeGreaterThanOrEqual(BORDER);
  });

  it("holds its flames, five at most, and leaves the animal's box clear", () => {
    for (let n = 1; n <= 5; n++) {
      const d = flamesPath(n);
      expect(Math.min(...xs(d))).toBeGreaterThanOrEqual(Math.min(...xs(BAND)));
      expect(Math.max(...xs(d))).toBeLessThanOrEqual(Math.max(...xs(BAND)));
      expect(Math.min(...ys(d))).toBeGreaterThanOrEqual(Math.min(...ys(BAND)));
      expect(Math.max(...ys(d))).toBeLessThanOrEqual(Math.max(...ys(BAND)));
    }
    expect(Math.max(...ys(BAND))).toBeLessThanOrEqual(ANIMAL_BOX.y);
  });
});
