import "@/i18n";
import assert from "node:assert/strict";
import { render, screen } from "@testing-library/react-native";
import * as Reanimated from "react-native-reanimated";
import { EMPRISES_ORDRE } from "@/components/village/iso/carteDemo";
import { CYCLE_MS, DepartContext, HorlogeContext } from "@/components/village/iso/horloge";
import { emplacements, ileVisible, lieux, TAILLE } from "@/components/village/iso/isoLayout";
import { borneRang } from "@/components/village/iso/marcheurs";
import { Lucioles, Oiseaux, Rongeur } from "@/components/village/iso/petitsDetails";
import { AnimauxContext } from "@/components/village/iso/useMarcheurs";
import { VIES } from "@/components/village/iso/vieAnimaux";
import {
  battementCorbeau,
  CASES_RAT,
  courseRat,
  DERIVE_LUCIOLES,
  EMPRISE_RAT,
  hasard,
  lucioles,
  lueurLucioles,
  NOMBRE_LUCIOLES,
  planifierRat,
  RAT,
  ratMontre,
  remousCorbeau,
  VOL_H,
  VOL_L,
  volCorbeaux,
  ZONE_LUCIOLES,
} from "@/components/village/iso/vivant";
import { rawColors } from "@/constants/rawColors";
import { buildingCodes } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { opacity?: number; transform?: Record<string, number>[] };

const vague = (n: number, c0 = 0) => ({ n, c0 });
const vagues = Array.from({ length: 40 }, (_, i) => i + 1);
/** Clock values across a 4-cycle wave, every 100 ms. */
const horloges = (c0: number) => Array.from({ length: 200 }, (_, i) => c0 + i * 100);

describe("the seed", () => {
  test("same wave, same number; other waves, other numbers", () => {
    expect(hasard(3, 2)).toBe(hasard(3, 2));
    expect(new Set(vagues.map((n) => hasard(n, 2))).size).toBeGreaterThan(30);
    for (const n of vagues) {
      expect(hasard(n, 1)).toBeGreaterThanOrEqual(0);
      expect(hasard(n, 1)).toBeLessThan(1);
    }
  });
});

describe("crows", () => {
  test("hidden on every cycle boundary of a wave, and before any wave", () => {
    for (const n of vagues)
      for (let k = 0; k < 6; k++) {
        const v = volCorbeaux(5 * CYCLE_MS + k * CYCLE_MS, vague(n, 5 * CYCLE_MS), 390, 390);
        expect(v.opacite).toBe(0);
      }
    for (const c of horloges(0)) expect(volCorbeaux(c, vague(0), 390, 390).opacite).toBe(0);
  });

  test("each crow bobs on its own, and none at rest (anim-24)", () => {
    for (const i of [0, 1, 2, 3]) expect(remousCorbeau(0, i)).toBe(0);
    const ps = [0.1, 0.2, 0.35, 0.5, 0.7, 0.9];
    const traces = [0, 1, 2, 3].map((i) => ps.map((p) => remousCorbeau(p, i)));
    expect(traces.every((t) => Math.max(...t.map(Math.abs)) > 0.3)).toBe(true);
    for (let i = 1; i < 4; i++) expect(traces[i]).not.toEqual(traces[0]);
  });

  test("one crossing a wave, in one cycle, across the whole frame in an arc", () => {
    for (const n of vagues) {
      const visibles = horloges(0)
        .map((c) => ({ c, v: volCorbeaux(c, vague(n), 390, 390) }))
        .filter((x) => x.v.opacite === 1);
      expect(visibles.length).toBeGreaterThan(40);
      expect(new Set(visibles.map((x) => Math.floor(x.c / CYCLE_MS))).size).toBe(1);
      const sens = visibles[0]?.v.sens ?? 1;
      const xs = visibles.map((x) => x.v.x);
      expect(sens === 1 ? xs[0] : xs.at(-1)).toBeLessThan(-VOL_L / 2 + 10);
      expect(sens === 1 ? xs.at(-1) : xs[0]).toBeGreaterThan(390 - 15);
      // anim-36: over the village framed in the middle, on an arc and a slant drawn per crossing
      const ys = visibles.map((x) => x.v.y + VOL_H / 2);
      expect(Math.max(...ys)).toBeLessThan(390 * 0.7);
      expect(Math.min(...ys)).toBeGreaterThan(390 * 0.15);
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(5);
    }
  });

  test("the seed picks the way and the height from one wave to the next", () => {
    const milieu = (n: number) =>
      volCorbeaux((Math.floor(hasard(n, 1) * 3) + 0.5) * CYCLE_MS, vague(n), 390, 390);
    expect(new Set(vagues.map((n) => milieu(n).sens)).size).toBe(2);
    expect(new Set(vagues.map((n) => Math.round(milieu(n).y))).size).toBeGreaterThan(5);
    expect(volCorbeaux(1234, vague(7), 390, 390)).toEqual(volCorbeaux(1234, vague(7), 390, 390));
  });
});

describe("fireflies", () => {
  test("8 to 12, fixed, over the canal and the trees beside it", () => {
    const visible = ileVisible(12, buildingCodes);
    const l = lucioles(visible);
    expect(l).toEqual(lucioles(visible));
    expect(l).toHaveLength(NOMBRE_LUCIOLES);
    expect(NOMBRE_LUCIOLES).toBeGreaterThanOrEqual(8);
    expect(NOMBRE_LUCIOLES).toBeLessThanOrEqual(12);
    for (const p of l) {
      expect(p.gx).toBeGreaterThanOrEqual(ZONE_LUCIOLES.gx[0]);
      expect(p.gx).toBeLessThan(ZONE_LUCIOLES.gx[1]);
      expect(p.gy).toBeGreaterThanOrEqual(ZONE_LUCIOLES.gy[0]);
      expect(p.gy).toBeLessThan(ZONE_LUCIOLES.gy[1]);
      expect(Math.abs(p.gx - (ZONE_LUCIOLES.gx[0] + ZONE_LUCIOLES.gx[1]) / 2)).toBeLessThanOrEqual(
        2,
      );
    }
  });

  test("each one hovers over a cell the island shows, at every tier", () => {
    for (const tier of [1, 3, 6, 12] as const) {
      const visible = ileVisible(tier, tier === 12 ? buildingCodes : []);
      for (const p of lucioles(visible))
        expect(visible[Math.floor(p.gy)]?.[Math.floor(p.gx)]).toBe(true);
    }
    expect(lucioles(ileVisible(12, buildingCodes))).toHaveLength(NOMBRE_LUCIOLES);
  });

  test("the drift stays within DERIVE_LUCIOLES", () => {
    for (let c = 0; c < CYCLE_MS; c += 50) {
      const r = lueurLucioles(c);
      expect(Math.abs(r.dx)).toBeLessThanOrEqual(DERIVE_LUCIOLES);
      expect(Math.abs(r.dy)).toBeLessThanOrEqual(DERIVE_LUCIOLES);
    }
  });

  test("out (opacity 0, no drift) on every boundary, lit between, always a cold colour", () => {
    for (const k of [0, 1, 7]) {
      const r = lueurLucioles(k * CYCLE_MS);
      expect([r.opacite, r.dx, r.dy].map(Math.abs)).toEqual([0, 0, 0]);
    }
    expect(lueurLucioles(CYCLE_MS / 4).opacite).toBeGreaterThan(0.8);
    expect(lueurLucioles(CYCLE_MS / 2).opacite).toBeCloseTo(0, 9);
    const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) =>
      Number.parseInt(rawColors.isoLuciole.slice(i, i + 2), 16),
    );
    expect(b).toBeGreaterThanOrEqual(r);
    expect(g).toBeGreaterThan(r);
  });
});

describe("named places (isoLayout.json lieux)", () => {
  test("the fireflies' zone and the rat's run are read from the layout, and make the same cells", () => {
    expect(ZONE_LUCIOLES).toEqual({ gx: [3, 7], gy: [0, 3] });
    expect(RAT).toEqual({ gy: 10, gx0: 3.5, gx1: 6.5, decalage: 0.3 });
    expect(lieux.rat).toBe(RAT);
    expect(CASES_RAT).toEqual([3, 4, 5, 6].map((gx) => [gx, 10]));
    expect(EMPRISE_RAT).toEqual({ coin: [3, 10], emprise: [4, 1] });
  });
});

describe("rat", () => {
  test("its run never stands on a building's footprint", () => {
    const cases = new Set(
      buildingCodes.flatMap((code) => emplacements[code].cases.map(([x, y]) => `${x},${y}`)),
    );
    for (const [gx, gy] of CASES_RAT) expect(cases.has(`${gx},${gy}`)).toBe(false);
    for (const code of buildingCodes) {
      const { coin, emprise } = emplacements[code];
      const chevauche =
        coin[0] < EMPRISE_RAT.coin[0] + EMPRISE_RAT.emprise[0] &&
        EMPRISE_RAT.coin[0] < coin[0] + emprise[0] &&
        coin[1] < EMPRISE_RAT.coin[1] + EMPRISE_RAT.emprise[1] &&
        EMPRISE_RAT.coin[1] < coin[1] + emprise[1];
      expect(chevauche).toBe(false);
    }
    expect(RAT.gx0).toBeGreaterThan(EMPRISE_RAT.coin[0]);
    expect(RAT.gx1).toBeLessThan(EMPRISE_RAT.coin[0] + EMPRISE_RAT.emprise[0]);
  });

  test("a depth rank exists among everything the map can hold", () => {
    const [lo, hi] = borneRang(EMPRISES_ORDRE, EMPRISE_RAT);
    expect(lo).toBeLessThanOrEqual(hi);
    expect(lo).toBeGreaterThan(0);
  });

  test("the plan drives the run: seen in every step but its hide, still before and after the walk", () => {
    const betes = vagues.flatMap((n) => planifierRat(20_000, n, 0) ?? []);
    expect(betes.length).toBeGreaterThan(8);
    expect(betes.length).toBeLessThan(32);
    expect(vagues.every((n) => planifierRat(20_000, n, 0, 0, true))).toBe(true);
    for (const r of betes) {
      expect(r.vie.map((e) => e.id).every((id) => VIES.rat.some((c) => c.id === id))).toBe(true);
      const marche = r.vie.find((e) => e.marche);
      assert(marche);
      const de = courseRat(marche.t0 - 1, r.vie, r.segments).g;
      const fin = courseRat(marche.t0 + marche.duree + 1, r.vie, r.segments).g;
      expect(Math.abs(de - fin)).toBeCloseTo(RAT.gx1 - RAT.gx0, 5);
      for (let t = 0; t < 15000; t += 100) {
        const c = courseRat(t, r.vie, r.segments);
        const e = r.vie.find((x) => t >= x.t0 && t < x.t0 + x.duree);
        expect(c.opacite).toBe(e && e.id !== "cache" ? 1 : 0);
        expect(c.g).toBeGreaterThanOrEqual(RAT.gx0 - 1e-6);
        expect(c.g).toBeLessThanOrEqual(RAT.gx1 + 1e-6);
      }
      const mid = courseRat(marche.t0 + marche.duree / 2, r.vie, r.segments);
      expect(mid.opacite).toBe(1);
      expect(mid.sens).toBe(de < fin ? 1 : -1);
    }
  });

  test("shown only when the island shows its whole run", () => {
    expect(ratMontre(ileVisible(12, buildingCodes))).toBe(true);
    const vide = Array.from({ length: TAILLE }, () => Array.from({ length: TAILLE }, () => false));
    expect(ratMontre(vide)).toBe(false);
  });
});

// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Hote({ c, n, rat }: { c: number; n: number; rat: ReturnType<typeof planifierRat> }) {
  const horloge = Reanimated.useSharedValue(c);
  const depart = Reanimated.useSharedValue({ n, c0: 0 });
  const visible = ileVisible(12, buildingCodes);
  return (
    <HorlogeContext.Provider value={horloge}>
      <DepartContext.Provider value={depart}>
        <AnimauxContext.Provider value={rat ? { c0: 0, betes: [rat] } : null}>
          <Oiseaux ambiance="jour" width={390} height={390} horloge={horloge} depart={depart} />
          <Lucioles visible={visible} />
          <Rongeur />
        </AnimauxContext.Provider>
      </DepartContext.Provider>
    </HorlogeContext.Provider>
  );
}

describe("no bird at night", () => {
  test("the flock draws nothing by default (night) and the fireflies are inked blobs, not bare circles", async () => {
    await render(<Oiseaux width={390} height={390} horloge={null} depart={null} />);
    expect(screen.queryByTestId("iso-oiseaux")).toBeNull();
    await render(<Lucioles visible={ileVisible(12, buildingCodes)} />);
    const svg = JSON.stringify(screen.toJSON());
    expect(svg.match(/"stroke":/g)?.length).toBe(lucioles(ileVisible(12, buildingCodes)).length);
    expect(svg).not.toContain("RNSVGCircle");
  });
});

describe("the nodes", () => {
  const lit = (id: string) => getAnimatedStyle(screen.getByTestId(id) as never);
  const ID = ["iso-oiseaux", "iso-lucioles", "iso-rongeur"];
  // a wave whose rat runs, and an instant of its run and of the flight
  const n = 1;
  const rat = planifierRat(20_000, n, 0, 0, true);
  assert(rat);
  const cRat = horloges(0).find((c) => courseRat(c, rat.vie, rat.segments).opacite === 1) ?? 0;
  const cVol = horloges(0).find((c) => volCorbeaux(c, vague(n), 390, 390).opacite === 1) ?? 0;

  test("at rest on a boundary, all three are hidden", async () => {
    await render(<Hote c={3 * CYCLE_MS} n={n} rat={rat} />);
    for (const id of ID) expect(lit(id).opacity).toBe(0);
  });

  test("without a rat in the wave the node stays hidden", async () => {
    await render(<Hote c={cRat} n={n} rat={null} />);
    expect(lit("iso-rongeur").opacity).toBe(0);
  });

  test("mid-gesture they show, and animate only opacity and transform", async () => {
    const place = new Set(["position", "top", "left", "right", "bottom", "width", "height"]);
    await render(<Hote c={cVol} n={n} rat={rat} />);
    expect(lit("iso-oiseaux").opacity).toBe(1);
    await screen.unmount();
    await render(<Hote c={cRat} n={n} rat={rat} />);
    expect(lit("iso-rongeur").opacity).toBe(1);
    await screen.unmount();
    // T16: the fireflies glow in the wave's second cycle, their turn (familles.ts ROTATION).
    await render(<Hote c={CYCLE_MS + CYCLE_MS / 4} n={n} rat={rat} />);
    expect(lit("iso-lucioles").opacity).toBeGreaterThan(0.8);
    for (const id of ID)
      for (const k of Object.keys(lit(id)).filter((k2) => !place.has(k2)))
        expect(["opacity", "transform"]).toContain(k);
  });
});

describe("E2: the flock wing beats", () => {
  it("the four crows never beat in step", () => {
    const valeurs = [0, 1, 2, 3].map((i) => battementCorbeau(0.3, i).toFixed(3));
    expect(new Set(valeurs).size).toBe(4);
  });
});
