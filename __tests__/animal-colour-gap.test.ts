import { rawColors } from "@/constants/rawColors";

/**
 * Two animals must stay tellable apart for a colour-blind hero: OKLab distance x 100 of at least
 * 10 in the normal view and under Machado 2009 (severity 1) protanopia, deuteranopia, tritanopia.
 * The closest pair measured is stag and horse in tritanopia, 10.89.
 */
// Derived from the palette, so a sixth `animal*` colour is measured without anyone remembering to
// list it. The cast only names today's five for the type checker; the keys come from `rawColors`.
const ANIMALS = Object.fromEntries(
  Object.entries(rawColors)
    .filter(([key]) => key.startsWith("animal"))
    .map(([key, value]) => [key.slice("animal".length).toLowerCase(), value]),
) as Record<"bear" | "ermine" | "salmon" | "stag" | "horse", string>;

type Matrix = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];
type Triple = readonly [number, number, number];

const VIEWS: Record<string, Matrix | null> = {
  normal: null,
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

const toLinear = (hex: string): Triple => {
  const n = Number.parseInt(hex.slice(1), 16);
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return [f(n >> 16), f((n >> 8) & 255), f(n & 255)];
};

const oklab = ([r, g, b]: Triple): Triple => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const seen = (hex: string, matrix: Matrix | null): Triple => {
  const [r, g, b] = toLinear(hex);
  if (!matrix) return oklab([r, g, b]);
  const [x, y, z] = matrix.map((row) =>
    Math.min(1, Math.max(0, row[0] * r + row[1] * g + row[2] * b)),
  );
  return oklab([x ?? 0, y ?? 0, z ?? 0]);
};

const names = Object.keys(ANIMALS) as (keyof typeof ANIMALS)[];
const pairs = names.flatMap((a, i) => names.slice(i + 1).map((b) => [a, b] as const));

describe("animal colours for colour-blind heroes", () => {
  describe.each(Object.entries(VIEWS))("%s", (_view, matrix) => {
    it.each(pairs)("%s and %s are at least 10 apart", (a, b) => {
      const [l1, a1, b1] = seen(ANIMALS[a], matrix);
      const [l2, a2, b2] = seen(ANIMALS[b], matrix);
      expect(100 * Math.hypot(l1 - l2, a1 - a2, b1 - b2)).toBeGreaterThanOrEqual(10);
    });
  });
});

const MIN_GAP = 10;
const PINNED_MIN = 10.89;
const MOVED =
  "an animal colour moved: measure everything again (contrasts, gaps, mockup) before changing this figure";

const gap = (x: string, y: string, matrix: Matrix | null) => {
  const [l1, a1, b1] = seen(x, matrix);
  const [l2, a2, b2] = seen(y, matrix);
  return 100 * Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

describe("animal colour gaps stay as measured", () => {
  it("the closest pair is stag and horse in tritanopia, 10.89", () => {
    const all = Object.entries(VIEWS).flatMap(([view, matrix]) =>
      pairs.map((p) => ({ view, p, d: gap(ANIMALS[p[0]], ANIMALS[p[1]], matrix) })),
    );
    const min = all.reduce((m, c) => (c.d < m.d ? c : m));
    if (Math.abs(min.d - PINNED_MIN) > 0.05 || min.view !== "tritanopia")
      throw new Error(`${MOVED} (${min.view} ${min.p.join("/")} ${min.d.toFixed(2)})`);
    expect(min.p).toEqual(["stag", "horse"]);
  });
});

/**
 * Normal vision only: the flame's and the rings' gold is always laid on the ink, never on an
 * animal fill, and under colour-blind views gold and salmon do meet (2.94 in tritanopia).
 */
const FORBIDDEN = [
  "primary",
  "primaryText",
  "success",
  "error",
  "resourceGold",
  "gold300",
  "gold600",
  "gold700",
] as const;

describe("animal colours against the colours the crest keeps clear of", () => {
  it.each(FORBIDDEN)("%s exists in the palette", (token) => {
    expect(rawColors).toHaveProperty(token);
  });

  it("every animal is at least 10 from every one of them, worst bear and gold700 at 11.9", () => {
    const all = names.flatMap((a) =>
      FORBIDDEN.map((t) => ({ a, t, d: gap(ANIMALS[a], rawColors[t], null) })),
    );
    for (const c of all) expect(c.d).toBeGreaterThanOrEqual(MIN_GAP);
    const min = all.reduce((m, c) => (c.d < m.d ? c : m));
    expect([min.a, min.t]).toEqual(["bear", "gold700"]);
    expect(min.d).toBeCloseTo(11.9, 1);
  });
});
