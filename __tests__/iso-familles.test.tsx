// T16: how many animation families move at once on the whole map (spec: 8 at most, PLAN-SPEC-VI
// §4 point 1), and the test mode that freezes them all for Maestro (iso/fige.ts).
// RNGH mocks its native module and host detector; it must load before the component does.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  createGestureController,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import * as Reanimated from "react-native-reanimated";
import {
  CROISSANCE_CAMERA_MS,
  HAUTEUR,
  LARGEUR,
  stadeReel,
} from "@/components/village/iso/carteDemo";
import { perchoirDe } from "@/components/village/iso/corbeaux";
import {
  basculer,
  croitA,
  FAMILLES,
  type Famille,
  familleDe,
  horlogeTour,
  PLAFOND_FAMILLES,
} from "@/components/village/iso/familles";
import { FigeContext } from "@/components/village/iso/fige";
import { CYCLE_MS } from "@/components/village/iso/horloge";
import { type Croissance, IsoVillage } from "@/components/village/iso/IsoVillage";
import { STADE_MS, TENUE_MS } from "@/components/village/iso/moment";
import { buildingStage } from "@/constants/buildingLevels";
import { buildingCodes } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
let mockReduit = false;
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduit }));

configure({ defaultIncludeHiddenElements: true });

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { transform?: Record<string, number>[] };

type Noeud = { props?: Record<string, unknown>; children?: unknown[] | null };
/** The testID of an animated node: its own, or its first descendant's (the sails carry theirs on the image). */
const idDe = (n: unknown): string | undefined => {
  if (typeof n !== "object" || n === null) return undefined;
  const { props, children } = n as Noeud;
  if (typeof props?.testID === "string") return props.testID;
  for (const c of children ?? []) {
    const id = idDe(c);
    if (id) return id;
  }
  return undefined;
};
/** Every animated host node, as [testID, its animated values now]. */
const animes = (n: unknown, out: [string, string][] = []): [string, string][] => {
  if (typeof n !== "object" || n === null) return out;
  const { props, children } = n as Noeud;
  if (props?.jestAnimatedStyle !== undefined || props?.animatedProps !== undefined) {
    const style = (props.jestAnimatedStyle as { value?: unknown } | undefined)?.value;
    out.push([idDe(n) ?? "?", JSON.stringify(style ?? props.animatedProps)]);
  }
  for (const c of children ?? []) animes(c, out);
  return out;
};
/** Keyed by testID and rank among its namesakes: a node mounting elsewhere shifts no other key. */
const instantane = () => {
  const vus = new Map<string, number>();
  return new Map(
    animes(screen.toJSON()).map(([id, v]) => {
      const n = vus.get(id) ?? 0;
      vus.set(id, n + 1);
      return [`${id}#${n}`, v] as const;
    }),
  );
};

/** The testIDs whose animated values changed between two snapshots; a node just mounted has only its first pose. */
const bougesEntre = (avant: Map<string, string>, apres: Map<string, string>) =>
  new Set(
    [...apres]
      .filter(([k, v]) => avant.has(k) && avant.get(k) !== v)
      .map(([k]) => k.split("#")[0] ?? k),
  );

/** Steps the clock by 100 ms for `ms`: the most families moving in one step, every family and node that moved. */
async function balayer(ms: number) {
  let avant = instantane();
  let pire = new Set<Famille>();
  const bouges = new Set<string>();
  const vus = new Set<Famille>();
  const montes = new Set<string>();
  for (let t = 0; t < ms; t += 100) {
    await act(() => jest.advanceTimersByTime(100));
    const apres = instantane();
    for (const k of apres.keys()) montes.add(k.split("#")[0] ?? k);
    const ici = bougesEntre(avant, apres);
    for (const id of ici) bouges.add(id);
    const familles = new Set(
      [...ici].map(familleDe).filter((f): f is Famille => f !== null && f !== undefined),
    );
    for (const f of familles) vus.add(f);
    if (familles.size > pire.size) pire = familles;
    avant = apres;
  }
  return { pire, vus, bouges, montes };
}

async function toucherToit(code: "farm" | "forge") {
  const t = getAnimatedStyle(screen.getByTestId("iso-camera") as never).transform ?? [];
  const v = Object.assign({}, ...t) as Record<string, number>;
  const p = perchoirDe(code, stadeReel(code, buildingStage(5)));
  if (!p) throw new Error(`no perch on ${code}`);
  await act(() => {
    createGestureController(getByGestureTestId("iso-geste-pan")).begin({
      x: (p.x - LARGEUR / 2) * (v.scale ?? 1) + 195 + (v.translateX ?? 0) + 4,
      y: (p.y - HAUTEUR / 2) * (v.scale ?? 1) + 195 + (v.translateY ?? 0),
    });
    jest.advanceTimersByTime(50);
  });
}

const buildings = buildingCodes.map((code) => ({ code, level: 5 }));
const croissance: Croissance = {
  cle: "f",
  items: (["tent", "well", "quarry", "watchtower"] as const).map((code) => ({
    code,
    oldLevel: 1,
  })),
};
const village = (fige: boolean, c?: Croissance, prets = false, lumiere?: "jour" | "nuit") => (
  <FigeContext.Provider value={fige}>
    <GestureHandlerRootView>
      <IsoVillage
        reclamables={prets ? buildingCodes : undefined}
        tier={12}
        buildings={buildings}
        width={390}
        height={390}
        croissance={c}
        lumiere={lumiere}
      />
    </GestureHandlerRootView>
  </FigeContext.Provider>
);

/**
 * The worst case end to end: a growth with every building ready (its camera, its site, its fade),
 * dropped by the owner once played as the tab does, a whole wave with both roof crows startled,
 * then the next wave, whose first cycle is the ready glows' (the growth held the first one).
 */
async function pireCas(fige = false, lumiere?: "jour" | "nuit") {
  await render(village(fige, croissance, true, lumiere));
  const etapes = [await balayer(CROISSANCE_CAMERA_MS + STADE_MS + TENUE_MS)];
  await screen.rerender(village(fige, undefined, true, lumiere));
  await toucherToit("farm");
  await toucherToit("forge");
  etapes.push(await balayer(25_000));
  const pan = createGestureController(getByGestureTestId("iso-geste-pan"));
  await act(() => {
    pan.begin();
    pan.end();
  });
  etapes.push(await balayer(6000));
  const union = <T,>(f: (e: (typeof etapes)[number]) => Set<T>) =>
    new Set(etapes.flatMap((e) => [...f(e)]));
  return {
    pire: etapes.map((e) => e.pire).reduce((x, y) => (y.size > x.size ? y : x)),
    vus: union((e) => e.vus),
    bouges: union((e) => e.bouges),
    montes: union((e) => e.montes),
  };
}

// A whole growth and a wave in 100 ms steps: past the 5 s default.
// 60 s of fake time on the whole map costs gigabytes: the stop rule is tested at its real length in iso-horloge.
jest.mock("@/constants/isoPoc", () => ({
  ...jest.requireActual("@/constants/isoPoc"),
  DUREE_VIE_MS: 30000,
}));

jest.setTimeout(60_000);

describe("animation families (T16)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    mockReduit = false;
  });

  test("every animated node mounted, moving or not, belongs to a family or to the camera", async () => {
    const { montes } = await pireCas();
    expect([...montes].filter((id) => familleDe(id) === undefined)).toEqual([]);
  });

  test("the worst case: 8 families at most move together, and none is cut", async () => {
    const { pire, vus } = await pireCas();
    expect(pire.size).toBeLessThanOrEqual(PLAFOND_FAMILLES);
    // qa-audit3: no bird in flight at night, so the startled crows no longer bring the birds' family.
    expect([...vus].sort()).toEqual(FAMILLES.filter((f) => f !== "oiseaux").sort());
  });

  test("the worst case by day: the crows bring the birds' family, 8 families at most", async () => {
    const { pire, vus } = await pireCas(false, "jour");
    expect(pire.size).toBeLessThanOrEqual(PLAFOND_FAMILLES);
    expect(vus.has("oiseaux")).toBe(true);
  });

  test("a plain wave: 8 at most, every family but the growth takes its turn", async () => {
    await render(village(false));
    const { pire, vus } = await balayer(25_000);
    expect(pire.size).toBeLessThanOrEqual(PLAFOND_FAMILLES);
    // The gulls fly by day only (T43 round 1): the night wave has no flock (the crows of the roofs are another family only when startled).
    expect([...vus].sort()).toEqual(
      FAMILLES.filter((f) => f !== "croissance" && f !== "oiseaux").sort(),
    );
  });

  test("nothing animated at rest", async () => {
    await render(village(false));
    await act(() => jest.advanceTimersByTime(35_000));
    await balayer(1000); // one big step leaves the mocked styles a frame stale
    const { bouges } = await balayer(3000);
    expect([...bouges]).toEqual([]);
  });

  test.each([
    ["the test mode", true, false],
    ["reduced motion", false, true],
  ])("%s freezes everything, growth and wave included", async (_, fige, reduit) => {
    mockReduit = reduit;
    const { bouges } = await pireCas(fige);
    // The camera snaps to the growth frame at once: a gesture of the hero's, not a family.
    expect([...bouges].filter((id) => familleDe(id) !== null)).toEqual([]);
    expect(screen.queryAllByTestId(/^iso-(poussiere|corbeau-envol|fenetres|porte)-/)).toHaveLength(
      0,
    );
  });
});

describe("horlogeTour", () => {
  const d = { n: 1, c0: 2 * CYCLE_MS };
  const libre = { avant: false, apres: false, des: 0 };
  const au = (k: number, dt = 1234) => d.c0 + k * CYCLE_MS + dt;
  test("each turning family plays its own cycle, in turn, and rests in the others", () => {
    expect(horlogeTour("signal", au(0), d, libre)).toBe(au(0));
    expect(horlogeTour("lucioles", au(0), d, libre)).toBe(d.c0);
    expect(horlogeTour("lucioles", au(1), d, libre)).toBe(au(1));
    expect(horlogeTour("moulin", au(2), d, libre)).toBe(au(2));
    expect(horlogeTour("signal", au(3), d, null)).toBe(au(3));
    expect(horlogeTour("moulin", au(0), d, libre)).toBe(d.c0);
  });
  test("a growth holds them all; no wave leaves the clock alone", () => {
    const croit = { avant: true, apres: true, des: 0 };
    expect(horlogeTour("signal", au(0, 100), d, croit)).toBe(d.c0);
    expect(horlogeTour("moulin", 7777, null, croit)).toBe(7777);
    expect(horlogeTour("moulin", 7777, { n: 0, c0: 0 }, libre)).toBe(7777);
  });
  test("a growth that starts or ends mid-cycle switches at the next boundary, never mid-gesture", () => {
    // Ends 1.2 s into the fireflies' cycle: they stay at rest until it is over, the sails get theirs.
    const fin = basculer({ avant: true, apres: true, des: 0 }, false, au(1));
    expect(fin.des).toBe(au(2, 0));
    expect(horlogeTour("lucioles", au(1, 3000), d, fin)).toBe(au(1, 0));
    expect(horlogeTour("moulin", au(2, 500), d, fin)).toBe(au(2, 500));
    // Starts 1.2 s into the sails' gust: the gust plays out, the hold begins at the next cycle.
    const debut = basculer(libre, true, au(2));
    expect(horlogeTour("moulin", au(2, 4000), d, debut)).toBe(au(2, 4000));
    expect(horlogeTour("signal", au(3, 100), d, debut)).toBe(au(3, 0));
    // On a rest pose (the tab's focus starts the wave and the growth together) it holds at once.
    const repos = basculer(libre, true, d.c0);
    expect(croitA(repos, d.c0)).toBe(true);
    expect(horlogeTour("signal", au(0, 100), d, repos)).toBe(d.c0);
  });
});
