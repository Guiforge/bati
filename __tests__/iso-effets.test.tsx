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
  pose,
  spriteDe,
  stadeReel,
} from "@/components/village/iso/carteDemo";
import { CHANTIER_MS } from "@/components/village/iso/chantier";
import { perchoirDe } from "@/components/village/iso/corbeaux";
import { Effets } from "@/components/village/iso/Effets";
import {
  boiteEffet,
  centreBassin,
  DECOR_GRAND,
  EFFET_MONTEE,
  EFFET_TAILLE,
  EFFETS,
  EFFETS_MAX,
  EffetForceContext,
  effetsDeVague,
  effetsJoues,
  effetsPermis,
  montee,
  PARTICULES_BASE,
  PARTICULES_ETOILE,
  PARTICULES_RICHE,
} from "@/components/village/iso/effets";
import { familleDe, PLAFOND_FAMILLES, ROTATION } from "@/components/village/iso/familles";
import { accrochesDe } from "@/components/village/iso/feux";
import { ECLATS_ANIMES, sommetDp } from "@/components/village/iso/fierte";
import { FigeContext } from "@/components/village/iso/fige";
import { HorlogeContext, useHorloge } from "@/components/village/iso/horloge";
import { IsoCarteDemo } from "@/components/village/iso/IsoCarteDemo";
import { type Croissance, IsoVillage } from "@/components/village/iso/IsoVillage";
import { batiments } from "@/components/village/iso/isoSpec";
import { NOEUDS_RECLAMABLES } from "@/components/village/iso/reclame";
import { VeilleContext } from "@/components/village/iso/veilleuses";
import { buildingStage } from "@/constants/buildingLevels";
import { rawColors } from "@/constants/rawColors";
import { type BuildingCode, buildingCodes } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
let mockReduit = false;
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduit }));

configure({ defaultIncludeHiddenElements: true });
// 60 s of fake time on the whole map costs gigabytes: the stop rule is tested at its real length in iso-horloge.
jest.mock("@/constants/isoPoc", () => ({
  ...jest.requireActual("@/constants/isoPoc"),
  DUREE_VIE_MS: 30000,
}));

jest.setTimeout(15_000);

describe("the building effects (T27 point 4), pure", () => {
  test("each one rests on its building's repere and on tokens that exist", () => {
    for (const code of buildingCodes) {
      const e = EFFETS[code];
      if (!e) continue;
      expect(e.repere).toBe(batiments[code].repere);
      for (const t of e.tons) expect(rawColors[t]).toBeDefined();
      expect(ROTATION).toContain(e.siege);
    }
    expect(buildingCodes.filter((c) => EFFETS[c])).toHaveLength(6);
  });

  test("a wave picks two buildings at most, seeded by the day and the wave", () => {
    const tous = buildingCodes.slice();
    const a = effetsDeVague(tous, 20000, 7);
    expect(a.size).toBe(EFFETS_MAX);
    expect(effetsDeVague(tous, 20000, 7)).toEqual(a);
    expect(effetsDeVague(["tent", "well"], 20000, 7).size).toBe(0);
    const autres = [8, 9, 10, 11, 12].map((n) => [...effetsDeVague(tous, 20000, n)].join());
    expect(new Set(autres).size).toBeGreaterThan(1);
  });

  test("they take what the signal seat leaves: nothing with four ready glows", () => {
    const deux = new Set<BuildingCode>(["forge", "wizard_tower"]);
    expect(effetsPermis(deux, 0).size).toBe(NOEUDS_RECLAMABLES - ECLATS_ANIMES);
    expect(effetsPermis(deux, 2).size).toBe(2);
    expect(effetsPermis(deux, 3).size).toBe(1);
    expect(effetsPermis(deux, 4).size).toBe(0);
    expect(effetsPermis(undefined, 0).size).toBe(0);
  });

  // Device qa-3110c: the observatory showed cyan specks around the dome, not a glint on its top.
  test("the observatory's glint is one star, 8 dp across at least, inside its box", () => {
    expect(PARTICULES_ETOILE).toHaveLength(1);
    const [x, y, t] = PARTICULES_ETOILE[0] ?? [0, 0, 0];
    const r = t * 1.4;
    expect((r * EFFET_TAILLE) / 100).toBeGreaterThanOrEqual(8);
    expect(x - r).toBeGreaterThanOrEqual(0);
    expect(x + r).toBeLessThanOrEqual(100);
    expect(y - r).toBeGreaterThanOrEqual(0);
    expect(y + r).toBeLessThanOrEqual(100);
  });

  // T41 point 3: the last stage adds shapes inside the one node, never a node, never violet.
  test("the last-stage decor is static shapes in the box, in tokens that exist", () => {
    // The druids' motes keep their plain stage: the five other genres carry a decor.
    const genres = Object.keys(DECOR_GRAND) as (keyof typeof DECOR_GRAND)[];
    expect(genres).toHaveLength(5);
    const formes = genres.flatMap((g) => DECOR_GRAND[g] ?? []);
    for (const m of formes) {
      expect(rawColors[m.ton]).toBeDefined();
      expect(m.ton).not.toBe("isoRune");
    }
    // A circle stays inside the 100 x 100 box.
    const bords = formes.flatMap((m) =>
      m.f === "cercle" ? [m.cx - m.r, m.cy - m.r, 100 - m.cx - m.r, 100 - m.cy - m.r] : [],
    );
    expect(Math.min(...bords)).toBeGreaterThanOrEqual(0);
  });

  // T41-2: the decor is anchored on data, and reads on the rock it is drawn over.
  test("the fountain's jet stands on the basin, the lair's eyes on its door, not on the lamp or a torch", () => {
    const fontaine = spriteDe("fountain", "solid");
    const antre = spriteDe("dragon_lair", "grand");
    if (!fontaine || !antre) throw new Error("no sprite");
    const cf = pose("fountain", fontaine);
    const boite = boiteEffet("fountain", "solid", fontaine, cf);
    const sommet = sommetDp(fontaine, cf);
    if (!boite || !sommet) throw new Error("no anchor");
    // The jet's foot (bottom-centre of the box) is far under the lamp's top, on the footprint.
    const k = cf.w / fontaine.size[0];
    expect(boite.y + EFFET_TAILLE).toBeGreaterThan(sommet[1] + 100 * k);
    const [bx, by] = centreBassin("fountain", fontaine);
    expect(boite.x + EFFET_TAILLE / 2).toBeCloseTo(cf.x + bx * k, 6);
    expect(boite.y + EFFET_TAILLE).toBeCloseTo(cf.y + by * k, 6);
    const ca = pose("dragon_lair", antre);
    const porte = accrochesDe("dragon_lair", "grand")?.porte;
    const ba = boiteEffet("dragon_lair", "grand", antre, ca);
    if (!porte || !ba) throw new Error("no door");
    expect(ba.x + EFFET_TAILLE / 2).toBeCloseTo(ca.x + porte[0] * (ca.w / antre.size[0]), 6);
  });

  test("the lair's eyes are almonds in a tone the embers do not have, and its smoke is not isoFumee", () => {
    const formes = DECOR_GRAND.braise ?? [];
    const yeux = formes.filter((m) => m.f === "aplat" && m.ton === "isoEclat");
    // A slit pupil in ink in each, and each eye wider (20 units) than the biggest ember drawn on it (0.7 x 25).
    expect(formes.filter((m) => m.f === "aplat" && m.ton === "isoInk")).toHaveLength(2);
    expect(yeux).toHaveLength(2);
    for (const y of yeux) expect(y.ton).not.toBe("isoLueur");
    const fumees = formes.filter((m) => m.f === "cercle");
    expect(fumees.length).toBeGreaterThan(0);
    for (const m of fumees) expect(m.ton).not.toBe("isoFumee");
  });

  test("their nodes sit in a family the rotation already has", () => {
    expect(familleDe("iso-effet-signal-forge")).toBe("signal");
    expect(familleDe("iso-effet-lucioles-druid_grove")).toBe("lucioles");
    expect(PLAFOND_FAMILLES).toBe(9);
  });
});

describe("the building effects on the map", () => {
  const village = () => (
    <GestureHandlerRootView>
      <IsoVillage
        tier={12}
        buildings={buildingCodes.map((code) => ({ code, level: 5 }))}
        width={390}
        height={390}
      />
    </GestureHandlerRootView>
  );

  test("none at rest, two in a wave, none once it is over", async () => {
    jest.useFakeTimers();
    try {
      await render(village());
      expect(screen.queryAllByTestId(/^iso-effet-/)).toHaveLength(0);
      await act(() => jest.advanceTimersByTime(200));
      const n = screen.queryAllByTestId(/^iso-effet-/).length;
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(EFFETS_MAX);
      await act(() => jest.advanceTimersByTime(35000));
      expect(screen.queryAllByTestId(/^iso-effet-/)).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
    // 35 s of continuous life on the full B3 map runs past 15 s of real time under load.
  }, 60_000);

  test("none in the frozen mode", async () => {
    jest.useFakeTimers();
    try {
      await render(<FigeContext.Provider value>{village()}</FigeContext.Provider>);
      await act(() => jest.advanceTimersByTime(500));
      expect(screen.queryAllByTestId(/^iso-effet-/)).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });
});

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { transform?: Record<string, number>[] };

type Noeud = { props?: Record<string, unknown>; children?: unknown[] | null };
const compte = (n: unknown): number => {
  if (typeof n !== "object" || n === null) return 0;
  const { props, children } = n as Noeud;
  const propre =
    props?.jestAnimatedStyle === undefined && props?.animatedProps === undefined ? 0 : 1;
  return (children ?? []).reduce<number>((a, c) => a + compte(c), propre);
};

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

describe("the building effects, worst case and gates", () => {
  const items = (["tent", "well", "quarry", "watchtower"] as const).map((code) => ({
    code,
    oldLevel: 1,
  }));
  const tout = buildingCodes.map((code) => ({ code, level: 5 }));
  const carte = (o: { croissance?: Croissance; lumiere?: "jour" | "nuit" } = {}) => (
    <GestureHandlerRootView>
      <IsoVillage tier={12} buildings={tout} width={390} height={390} {...o} />
    </GestureHandlerRootView>
  );

  test("T41: while a stage is revealed no trade effect plays, and the worst no-glow case holds at 63 at most", async () => {
    let pire = 0;
    // The wave number is the quarter-minute of the clock: walk it until the plan is the heaviest.
    for (let k = 0; k < 12; k++) {
      jest.useFakeTimers({ now: 1_800_000_000_000 + k * 15_000 * 7 });
      try {
        await render(carte({ croissance: { cle: `w${k}`, items } }));
        await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS + CHANTIER_MS));
        await toucherToit("farm");
        await toucherToit("forge");
        await act(() => jest.advanceTimersByTime(300));
        const effets = screen.queryAllByTestId(/^iso-effet-/).length;
        const n = compte(screen.toJSON());
        // The village is quiet from the new stage on: the burst and the golden wave take the effects' places.
        expect(effets).toBe(0);
        pire = Math.max(pire, n);
        expect(n).toBeLessThanOrEqual(63);
        await screen.unmount();
      } finally {
        jest.useRealTimers();
      }
    }
    expect(pire).toBeLessThanOrEqual(63);
  }, 150_000);

  test("none by day, none in reduced motion", async () => {
    jest.useFakeTimers();
    try {
      await render(carte({ lumiere: "jour" }));
      await act(() => jest.advanceTimersByTime(300));
      expect(screen.queryAllByTestId(/^iso-effet-/)).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
    mockReduit = true;
    jest.useFakeTimers();
    try {
      await render(carte());
      await act(() => jest.advanceTimersByTime(300));
      expect(screen.queryAllByTestId(/^iso-effet-/)).toHaveLength(0);
    } finally {
      jest.useRealTimers();
      mockReduit = false;
    }
  });
});

// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
const Horloge = ({ code, stade }: { code: BuildingCode; stade: string }) => {
  const c = Reanimated.useSharedValue(0);
  const st = stade as never;
  const s = spriteDe(code, st, "nuit");
  if (!s) throw new Error(`no sprite ${code}/${stade}`);
  return (
    <HorlogeContext.Provider value={c}>
      <VeilleContext.Provider
        value={{ c0: 0, fenetres: new Set(), portes: {}, effets: new Set([code]) }}
      >
        <Effets code={code} stade={st} s={s} corps={pose(code, s)} />
      </VeilleContext.Provider>
    </HorlogeContext.Provider>
  );
};

describe("T41: the last-stage decor, rendered", () => {
  const GENRES = ["dragon_lair", "wizard_tower", "fountain", "observatory", "forge"] as const;
  // Every node of the tree, to tell the decor's shapes from the plain grains.
  const tout = (n: unknown): number => {
    if (typeof n !== "object" || n === null) return 0;
    const { children } = n as Noeud;
    return (children ?? []).reduce<number>((a, c) => a + tout(c), 1);
  };
  const rendre = async (code: BuildingCode, stade: string) => {
    await render(<Horloge code={code} stade={stade} />);
    const r = {
      effets: screen.queryAllByTestId(/^iso-effet-/).length,
      animes: compte(screen.toJSON()),
      noeuds: tout(screen.toJSON()),
    };
    await screen.unmount();
    return r;
  };

  test.each(GENRES)(
    "%s: decor on the last stage, one animated node, none one stage before",
    async (code) => {
      const genre = EFFETS[code]?.genre;
      if (!genre) throw new Error(code);
      const stades = batiments[code].stades;
      const dernier = stades.at(-1);
      const avant = stades.at(-2);
      if (!dernier || !avant) throw new Error(`stages of ${code}`);
      const grand = await rendre(code, dernier);
      const petit = await rendre(code, avant);
      const decor = DECOR_GRAND[genre]?.length ?? 0;
      expect(decor).toBeGreaterThan(0);
      expect(grand.effets).toBe(1);
      expect(petit.effets).toBe(1);
      // One animated node (the group) whatever the stage: the shapes are static.
      expect(grand.animes).toBe(1);
      expect(petit.animes).toBe(1);
      // The decor's shapes plus the extra grains (the observatory keeps its one star).
      const grains = genre === "etoile" ? 0 : PARTICULES_RICHE - PARTICULES_BASE;
      expect(grand.noeuds - petit.noeuds).toBe(decor + grains);
    },
  );

  test("a last-stage group stays near what it hangs on, the others climb 26", () => {
    expect(montee("braise", true)).toBe(3);
    expect(montee("braise", false)).toBe(EFFET_MONTEE);
    expect(montee("runes", true)).toBeLessThan(EFFET_MONTEE);
    expect(montee("gouttes", true)).toBeLessThan(EFFET_MONTEE);
    expect(montee("etoile", true)).toBeLessThan(EFFET_MONTEE);
  });

  test("worst case: last-stage effects active in a wave stay within 64 nodes", async () => {
    jest.useFakeTimers({ now: 1_800_000_000_000 });
    try {
      await render(
        <GestureHandlerRootView>
          <IsoVillage
            tier={12}
            buildings={buildingCodes.map((code) => ({ code, level: 5 }))}
            width={390}
            height={390}
          />
        </GestureHandlerRootView>,
      );
      await act(() => jest.advanceTimersByTime(300));
      const effets = screen.queryAllByTestId(/^iso-effet-/).length;
      expect(effets).toBeGreaterThan(0);
      expect(effets).toBeLessThanOrEqual(EFFETS_MAX);
      expect(compte(screen.toJSON())).toBeLessThanOrEqual(64);
    } finally {
      jest.useRealTimers();
    }
  });
});

// qa-audit2: the effects were not seen on the device, and the pure draw cannot say whether the demo
// plays them. dev-iso's `Effet : <bâtiment>` forces one; this plays each one on the palier 12 map.
// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
const CarteForcee = ({ code }: { code: BuildingCode | null }) => {
  const h = useHorloge();
  return (
    <EffetForceContext.Provider value={code}>
      <IsoCarteDemo palier={12} tousDebout={false} horloge={h} lumiere="nuit" />
    </EffetForceContext.Provider>
  );
};

describe("the forced effect of dev-iso (qa-audit2)", () => {
  test("forcing replaces the draw, and nothing forced leaves it as it is", () => {
    const tires = new Set<BuildingCode>(["forge", "fountain"]);
    expect(effetsJoues(tires, null)).toBe(tires);
    expect([...(effetsJoues(tires, "wizard_tower") ?? [])]).toEqual(["wizard_tower"]);
    expect(effetsJoues(undefined, null)).toBeUndefined();
  });

  test.each(buildingCodes.filter((c) => EFFETS[c]))(
    "%s plays on the palier 12 map at night, on its last stage, within 64 nodes",
    async (code) => {
      jest.useFakeTimers({ now: Date.parse("2026-10-31T20:08:45+01:00") });
      try {
        await render(
          <GestureHandlerRootView>
            <CarteForcee code={code} />
          </GestureHandlerRootView>,
        );
        // The druids' motes play in the second cycle of the wave, the others in the first.
        await act(() => jest.advanceTimersByTime(EFFETS[code]?.siege === "lucioles" ? 7500 : 2500));
        const jouees = screen.queryAllByTestId(/^iso-effet-/);
        expect(jouees.map((n) => n.props.testID)).toEqual([
          `iso-effet-${EFFETS[code]?.siege}-${code}`,
        ]);
        const style = getAnimatedStyle(jouees[0] as never) as { opacity?: number };
        expect(style.opacity).toBeGreaterThan(0.3);
        expect(batiments[code].stades.at(-1)).toBe(stadeReel(code, "grand"));
        expect(compte(screen.toJSON())).toBeLessThanOrEqual(64);
      } finally {
        jest.useRealTimers();
      }
    },
  );
});
