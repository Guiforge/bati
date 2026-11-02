import assert from "node:assert/strict";
// RNGH mocks its native module and host detector; it must load before the component does.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, fireEvent, render, screen } from "@testing-library/react-native";
import { Image, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  createGestureController,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import * as Reanimated from "react-native-reanimated";
import { TamaguiProvider } from "tamagui";
import { PretDemo } from "@/app/dev-iso";
import type { Ouverture } from "@/components/village/iso/bulle";
import {
  CROISSANCE_CAMERA_MS,
  CROISSANCE_MS,
  cadrage,
  cadrageComplet,
  centreBatiment,
  ecranXY,
  emprise,
  etatAvec,
  etatCarte,
  HAUTEUR,
  LARGEUR,
  MARGE_CADRAGE,
  ombreSocleDe,
  pose,
  spriteDe,
  stadeReel,
  type Vue,
  ZOOM_MAX,
} from "@/components/village/iso/carteDemo";
import { CHANTIER_MS } from "@/components/village/iso/chantier";
import { croissanceDemo } from "@/components/village/iso/croissanceDemo";
import { PalierContext } from "@/components/village/iso/detail";
import { IsoCroissance } from "@/components/village/iso/IsoCroissance";
import { type Croissance, IsoVillage } from "@/components/village/iso/IsoVillage";
import { batiments, vieDe } from "@/components/village/iso/isoSpec";
import { bornesPan, ileCentree, type Limites, ramener } from "@/components/village/iso/navigation";
import { dureeFondu, FONDU_OUVERTURE_MS } from "@/components/village/iso/ouverture";
import { Planche } from "@/components/village/iso/PlancheCarte";
import { NOEUDS_RECLAMABLES, repartirReclamables } from "@/components/village/iso/reclame";
import { NOUVEAU_MS } from "@/components/village/iso/revelation";
import {
  type BlasonCrest,
  boiteStatue,
  etatStatue,
  piedStatue,
  statueAuPoint,
} from "@/components/village/iso/statue";
import { ancreBatiment, cibles } from "@/components/village/iso/tapBatiment";
import { buildingStage } from "@/constants/buildingLevels";
import { INTEGRATION } from "@/constants/isoPoc";
import { type BuildingCode, buildingCodes } from "@/db/schema";
import type { VillageTier } from "@/db/village";
import { parseGrown } from "@/db/village";
import config from "@/tamagui.config";

// Under jest, RNGH asks react-native-worklets for its UI runtime in a microtask, which the worklets
// mock refuses; nothing here runs a gesture on the UI thread, so an empty holder is enough.
jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
let mockReduit = false;
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduit }));
// The camera's detail is set by a timer after a real zoom; a test that needs a high level imposes it.
let mockDetail: { palier: number; zone: unknown } | null = null;
jest.mock("@/components/village/iso/useCameraIso", () => {
  const actual = jest.requireActual("@/components/village/iso/useCameraIso");
  return {
    ...actual,
    useCameraIso: (...args: unknown[]) => {
      const c = actual.useCameraIso(...args);
      return mockDetail ? { ...c, detail: mockDetail } : c;
    },
  };
});

// Reanimated 4.7 types `getAnimatedStyle` from its web stub (`(): void`); jest runs the native one.
const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { transform?: Record<string, number>[] };

const lire = (code: BuildingCode) => screen.queryByTestId(`iso-maquette-${code}`);
const stadeAu = (code: BuildingCode, niveau: number) => stadeReel(code, buildingStage(niveau));

function arbre(
  tier: VillageTier,
  niveaux: Partial<Record<BuildingCode, number>>,
  croissance?: Croissance,
  onCroissanceFinie?: () => void,
  reclame?: { reclamables: BuildingCode[]; niveaux: Partial<Record<BuildingCode, number>> },
) {
  const buildings = Object.entries(niveaux).map(([code, level]) => ({
    code: code as BuildingCode,
    level,
  }));
  return (
    <GestureHandlerRootView>
      <IsoVillage
        tier={tier}
        buildings={buildings}
        width={390}
        height={390}
        croissance={croissance}
        onCroissanceFinie={onCroissanceFinie}
        reclamables={reclame?.reclamables}
        niveauxReclames={reclame?.niveaux}
      />
    </GestureHandlerRootView>
  );
}

async function afficher(tier: VillageTier, niveaux: Partial<Record<BuildingCode, number>>) {
  await render(arbre(tier, niveaux));
}

function camera(): Vue {
  const t = getAnimatedStyle(screen.getByTestId("iso-camera")).transform ?? [];
  const v: Record<string, number> = Object.assign({}, ...t);
  return {
    zoom: v.scale ?? Number.NaN,
    x: v.translateX ?? Number.NaN,
    y: v.translateY ?? Number.NaN,
  };
}

// The map is hidden from the screen reader on purpose; the tests still read its tree.
configure({ defaultIncludeHiddenElements: true });

describe("IsoVillage", () => {
  it("is off by default, so the village tab keeps its painting", () => {
    expect(INTEGRATION).toBe(false);
  });

  it("mounts under the gesture detector, framed like cadrage", async () => {
    await afficher(12, { campfire: 1 });
    const { visible } = etatAvec(12, ["campfire"]);
    expect(camera()).toEqual(cadrage(visible, 390, 390));
  });

  // Audit T43 round 1: white gulls flew at night (isoSpec.json vieParAmbiance `oiseaux`).
  it("flies no flock at night, and one by day", async () => {
    expect([vieDe("nuit").oiseaux, vieDe("jour").oiseaux]).toEqual([false, true]);
    await afficher(12, { campfire: 1 });
    expect(screen.queryByTestId("iso-oiseaux")).toBeNull();
    await screen.unmount();
    await render(
      <GestureHandlerRootView>
        <IsoVillage tier={12} buildings={[]} width={390} height={390} lumiere="jour" />
      </GestureHandlerRootView>,
    );
    expect(screen.queryByTestId("iso-oiseaux")).not.toBeNull();
  });

  it("shows a built building at the stage of its level, and not an unbuilt one", async () => {
    await afficher(12, { campfire: 1, forge: 3, windmill: 5, watchtower: 0 });
    const source = (code: BuildingCode, stade: "rough" | "solid" | "grand") =>
      spriteDe(code, stadeReel(code, stade))?.image;
    expect(lire("campfire")?.props.source).toEqual([source("campfire", "rough")]);
    expect(lire("forge")?.props.source).toEqual([source("forge", "solid")]);
    expect(lire("windmill")?.props.source).toEqual([source("windmill", "grand")]);
    expect(source("forge", "solid")).not.toEqual(source("forge", "rough"));
    expect(lire("watchtower")).toBeNull();
    expect(lire("armory")).toBeNull();
  });

  it("turns a level into a stage through buildingStage, within the stages a building has", async () => {
    // Three stages: level 4 is solid, level 10 is grand.
    await afficher(12, { forge: 4 });
    expect(lire("forge")?.props.source).toEqual([spriteDe("forge", "solid")?.image]);
    await screen.unmount();
    await afficher(12, { forge: 10 });
    expect(lire("forge")?.props.source).toEqual([spriteDe("forge", "grand")?.image]);
    await screen.unmount();
    // A tier 3 building stops at solid: levels 1, 3 and 5 give rough, solid, solid.
    expect(batiments.watchtower.stades).toEqual(["rough", "solid"]);
    for (const [niveau, stade] of [
      [1, "rough"],
      [3, "solid"],
      [5, "solid"],
    ] as const) {
      expect(stadeReel("watchtower", buildingStage(niveau))).toBe(stade);
      await afficher(12, { watchtower: niveau });
      expect(lire("watchtower")?.props.source).toEqual([spriteDe("watchtower", stade)?.image]);
      await screen.unmount();
    }
  });

  it("clamps a stage to the ones a building has", () => {
    for (const code of Object.keys(batiments) as BuildingCode[])
      expect(batiments[code].stades).toContain(stadeReel(code, "grand"));
  });

  it("widens the island for a built building whose plot is off the tier, not for a level 0 one", async () => {
    const hors = buildingCodes.find(
      (code) =>
        !etatAvec(1, []).montres.includes(code) && etatAvec(1, [code]).montres.includes(code),
    );
    expect(hors).toBeDefined();
    if (!hors) return;
    await afficher(1, { campfire: 1, [hors]: 1 });
    expect(lire(hors)).not.toBeNull();
    await screen.unmount();
    await afficher(1, { campfire: 1, [hors]: 0 });
    expect(lire(hors)).toBeNull();
  });

  it("frames a wider island at a higher tier", async () => {
    const echelle = async (tier: VillageTier) => {
      await afficher(tier, { campfire: 1 });
      const { zoom } = camera();
      await screen.unmount();
      return zoom;
    };
    const petit = await echelle(1);
    const grand = await echelle(12);
    expect(grand).toBeLessThan(petit);
  });
});

describe("growth on return from a session", () => {
  const forge = { cle: "forge:2:4", items: [{ code: "forge" as const, oldLevel: 2 }] };
  const ancien = () => screen.queryByTestId("iso-croissance-ancien-forge");
  const nouveau = () => screen.queryByTestId("iso-croissance-nouveau-forge");

  // The camera moves first, then the building site stands (L6-T02) when the stage changes; the
  // fade and spring layers start when the site is over (at once when there is no site).
  const apresCamera = () => act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS));
  const apresChantier = () =>
    act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS + CHANTIER_MS));

  beforeEach(() => {
    mockReduit = false;
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("cross-fades the old stage into the new one, is done within 1.5 s and plays once", async () => {
    const fini = jest.fn();
    await render(arbre(12, { campfire: 1, forge: 4 }, forge, fini));
    // During the camera's move and the site the OLD stage stands, shown by the map itself, and no
    // layer plays: a fade and a spring started with the zoom are drowned in it (qa, L3-T05 tour 2).
    expect(StyleSheet.flatten(lire("forge")?.props.style).opacity).toBeUndefined();
    expect(lire("forge")?.props.source).toEqual([spriteDe("forge", "rough")?.image]);
    expect(ancien()).toBeNull();
    expect(nouveau()).toBeNull();
    // T03: the scaffold stands from the scene's start; its villagers and dust come after the camera.
    expect(screen.getByTestId("iso-echafaudage-forge")).toBeTruthy();
    expect(screen.queryByTestId("iso-poussiere-forge")).toBeNull();
    await apresCamera();
    expect(screen.getByTestId("iso-echafaudage-forge")).toBeTruthy();
    expect(screen.getByTestId("iso-poussiere-forge")).toBeTruthy();
    // The old stage stands under the scaffold (T02b), shown, and no heap of stones on it.
    expect(StyleSheet.flatten(lire("forge")?.props.style).opacity).toBeUndefined();
    expect(lire("forge")?.props.source).toEqual([spriteDe("forge", "rough")?.image]);
    expect(screen.queryByTestId("iso-tas-forge")).toBeNull();
    expect(fini).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTime(CHANTIER_MS - CROISSANCE_CAMERA_MS - 1));
    expect(screen.getByTestId("iso-echafaudage-forge")).toBeTruthy();
    expect(nouveau()).toBeNull();
    await act(() => jest.advanceTimersByTime(1));
    // The site is over and the layers are up; the scaffold stays a beat over them while they decode
    // (T02b-qa: one bare frame), then goes.
    expect(screen.queryByTestId("iso-poussiere-forge")).toBeNull();
    expect(screen.getByTestId("iso-echafaudage-forge")).toBeTruthy();
    await act(() => jest.advanceTimersByTime(NOUVEAU_MS));
    expect(screen.queryByTestId("iso-echafaudage-forge")).toBeNull();
    // Level 2 was rough, level 4 is solid: both layers are up, over the sprite the map draws.
    expect(ancien()).not.toBeNull();
    expect(nouveau()).not.toBeNull();
    expect(screen.getByTestId("iso-croissance-ancien-image-forge").props.source).toEqual([
      spriteDe("forge", "rough")?.image,
    ]);
    expect(screen.getByTestId("iso-croissance-nouveau-image-forge").props.source).toEqual([
      spriteDe("forge", "solid")?.image,
    ]);
    // The real sprite is hidden while the layer plays, so the fade and the spring show.
    expect(StyleSheet.flatten(lire("forge")?.props.style).opacity).toBe(0);
    expect(fini).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTime(CROISSANCE_MS - CROISSANCE_CAMERA_MS - NOUVEAU_MS));
    // Called once, after the new stage has settled (L6-T13 writes the claimed stage here).
    expect(fini).toHaveBeenCalledTimes(1);
    // The owner drops the growth: nothing is left mounted, hence nothing animating.
    await screen.rerender(arbre(12, { campfire: 1, forge: 4 }));
    expect(ancien()).toBeNull();
    expect(nouveau()).toBeNull();
    expect(StyleSheet.flatten(lire("forge")?.props.style).opacity).toBeUndefined();
    await act(() => jest.advanceTimersByTime(5000));
    expect(fini).toHaveBeenCalledTimes(1);
  }, 20_000);

  it("T03: the villagers who struck stay where they struck once the site is over", async () => {
    await render(arbre(12, { campfire: 1, forge: 4 }, forge));
    const debout = () =>
      Object.fromEntries(
        screen.queryAllByTestId(/^iso-marcheur-.*-fixe$/).map((n) => {
          const st = StyleSheet.flatten(n.props.style);
          return [String(n.props.testID), `${st.left},${st.top}`];
        }),
      );
    const avant = debout();
    await apresCamera();
    const pendant = debout();
    const ouvriers = Object.keys(pendant).filter((id) => avant[id] && avant[id] !== pendant[id]);
    expect(ouvriers.length).toBeGreaterThan(0);
    await act(() => jest.advanceTimersByTime(CHANTIER_MS));
    await act(() => jest.advanceTimersByTime(NOUVEAU_MS));
    await screen.rerender(arbre(12, { campfire: 1, forge: 4 }));
    const apres = debout();
    expect(ouvriers.filter((i) => apres[i]).length).toBeGreaterThan(0);
    for (const id of ouvriers.filter((i) => apres[i]))
      expect([id, apres[id]]).toEqual([id, pendant[id]]);
  });

  it("lays the layer on the very rectangle the map gives the sprite, shadow included", async () => {
    await render(
      arbre(12, { campfire: 1 }, { cle: "c", items: [{ code: "campfire", oldLevel: 0 }] }),
    );
    await apresChantier();
    const sprite = spriteDe("campfire", "rough");
    assert(sprite);
    const r = pose("campfire", sprite);
    const couche = StyleSheet.flatten(
      screen.getByTestId("iso-croissance-nouveau-campfire").props.style,
    );
    expect([couche.left, couche.top, couche.width, couche.height]).toEqual([r.x, r.y, r.w, r.h]);
    const image = StyleSheet.flatten(
      screen.getByTestId("iso-croissance-nouveau-image-campfire").props.style,
    );
    expect([image.left, image.top, image.width, image.height]).toEqual([0, 0, r.w, r.h]);
    // The map wears the building's socle shadow over its sprite; the layer must too, or the
    // swap at the end changes what is drawn.
    expect(ombreSocleDe("campfire", "rough")).not.toBeNull();
    expect(screen.getByTestId("iso-croissance-socle-campfire")).toBeTruthy();
  });

  it("does not play again for the same value on a re-render", async () => {
    const fini = jest.fn();
    await render(arbre(12, { campfire: 1, forge: 4 }, forge, fini));
    await act(() => jest.advanceTimersByTime(CROISSANCE_MS + CHANTIER_MS));
    await screen.rerender(arbre(12, { campfire: 1, forge: 4 }, forge, fini));
    await act(() => jest.advanceTimersByTime(5000));
    expect(fini).toHaveBeenCalledTimes(1);
  });

  it("fades in from nothing when the old stage is not known, and skips a building not on the map", async () => {
    await render(
      arbre(
        12,
        { campfire: 1, forge: 4 },
        {
          cle: "x",
          items: [
            { code: "forge", oldLevel: 0 },
            { code: "windmill", oldLevel: 1 },
          ],
        },
      ),
    );
    // T03-qa: the scaffold first, the heap a beat later, so no frame shows the heap alone.
    expect(screen.getByTestId("iso-echafaudage-forge")).toBeTruthy();
    expect(screen.queryByTestId("iso-tas-forge")).toBeNull();
    await act(() => jest.advanceTimersByTime(NOUVEAU_MS));
    expect(screen.getByTestId("iso-tas-forge")).toBeTruthy();
    // No old stage: a heap of stones stands on the plot under the scaffold, gone with the site.
    await apresCamera();
    expect(screen.getByTestId("iso-tas-forge")).toBeTruthy();
    expect(screen.getByTestId("iso-echafaudage-forge")).toBeTruthy();
    await act(() => jest.advanceTimersByTime(CHANTIER_MS));
    await act(() => jest.advanceTimersByTime(NOUVEAU_MS));
    expect(screen.queryByTestId("iso-tas-forge")).toBeNull();
    expect(ancien()).toBeNull();
    expect(nouveau()).not.toBeNull();
    expect(screen.queryByTestId("iso-croissance-nouveau-windmill")).toBeNull();
  });

  it("shows no old layer when the stage did not change", async () => {
    const memeStade = { cle: "y", items: [{ code: "forge" as const, oldLevel: 3 }] };
    await render(arbre(12, { campfire: 1, forge: 4 }, memeStade));
    await apresCamera();
    // Same stage: no site, the spring alone.
    expect(screen.queryByTestId("iso-echafaudage-forge")).toBeNull();
    expect(ancien()).toBeNull();
    expect(nouveau()).not.toBeNull();
  });

  it("with reduced motion mounts no layer and ends at once", async () => {
    mockReduit = true;
    const fini = jest.fn();
    await render(arbre(12, { campfire: 1, forge: 4 }, forge, fini));
    expect(ancien()).toBeNull();
    expect(nouveau()).toBeNull();
    expect(lire("forge")?.props.source).toEqual([spriteDe("forge", "solid")?.image]);
    await act(() => jest.advanceTimersByTime(0));
    // Reduced motion: no site either, just the fade.
    expect(screen.queryByTestId("iso-echafaudage-forge")).toBeNull();
    expect(fini).toHaveBeenCalledTimes(1);
  });
});

describe("camera bounds", () => {
  const ile = { x0: -100, x1: 100, y0: -50, y1: 50 };
  const l: Limites = { ile, w: 400, h: 300, zmin: 0.5, zmax: 2 };

  it("holds the zoom between its bounds", () => {
    expect(ramener({ zoom: 9, x: 0, y: 0 }, l).zoom).toBe(2);
    expect(ramener({ zoom: 0.1, x: 0, y: 0 }, l).zoom).toBe(0.5);
    expect(ramener({ zoom: 1, x: 0, y: 0 }, l)).toEqual({ zoom: 1, x: 0, y: 0 });
  });

  it("lets the island's rim go to half of the area, keeping half of it in view (L6-T17, PART_ILE 0.5 since the audit of 31/10)", () => {
    // 200 dp wide at zoom 1 in 400: its edge may go from the area's side to the middle (0).
    expect(bornesPan(1, l)).toMatchObject({ xMin: -100, xMax: 100 });
    // At zoom 4 it is 800 wide: the same half, the other edge.
    expect(bornesPan(4, l)).toMatchObject({ xMin: -400, xMax: 400 });
    // An island narrower than half of the area keeps all of itself in view.
    expect(bornesPan(0.25, l)).toMatchObject({ xMin: -175, xMax: 175 });
  });

  it("brings a far pan back so the island stays in view", () => {
    expect(ramener({ zoom: 1, x: 5000, y: -5000 }, l)).toEqual({ zoom: 1, x: 100, y: -100 });
  });

  it("brings the pan back in again when a zoom out shrinks its range", () => {
    const zoome = ramener({ zoom: 4, x: 400, y: 0 }, { ...l, zmax: 4 });
    expect(zoome.x).toBe(400);
    const sorti = ramener({ zoom: 1, x: zoome.x, y: 0 }, l);
    expect(sorti.x).toBe(100);
  });

  it("never lets the framing fall outside its own bounds", () => {
    for (const tier of [1, 6, 12] as const) {
      const { visible } = etatAvec(tier, ["campfire"]);
      const v = cadrage(visible, 390, 390);
      expect(v.zoom).toBeLessThanOrEqual(ZOOM_MAX);
    }
  });
});

describe("croissanceDemo", () => {
  it("names a building whose stage really changes, with a replay suffix parseGrown ignores", () => {
    const grown = croissanceDemo(
      [
        { code: "campfire", level: 1 },
        { code: "forge", level: 4 },
      ],
      7,
    );
    expect(grown).toBe("forge:2:4:7");
    expect(parseGrown(grown ?? "")).toEqual([{ code: "forge", oldLevel: 2, newLevel: 4 }]);
    expect(croissanceDemo([{ code: "forge", level: 4 }], 8)).toBe("forge:2:4:8");
  });

  it("falls back to a fade from nothing when every building is at its first stage", () => {
    expect(croissanceDemo([{ code: "forge", level: 1 }], 0)).toBe("forge:0:1:0");
    expect(croissanceDemo([{ code: "forge", level: 0 }], 0)).toBeNull();
  });

  // L4-T02: a hidden image or Svg is still a native view (and a bitmap), so absent things mount nothing.
  describe("mounts only what shows", () => {
    const vues = (n: unknown): number => {
      const x = n as { children?: unknown[] } | string | null;
      if (x === null || typeof x === "string") return 0;
      if (Array.isArray(x)) return x.reduce<number>((s, c) => s + vues(c), 0);
      return 1 + vues(x.children ?? null);
    };
    const dix = buildingCodes.slice(0, 10);
    const niveaux = Object.fromEntries(dix.map((c) => [c, 1]));

    it("counts the views of 10 rough buildings at tier 12, and renders nothing for the others", async () => {
      await afficher(12, niveaux);
      const total = vues(screen.toJSON());
      for (const c of buildingCodes.slice(10)) {
        expect(lire(c)).toBeNull();
        expect(screen.queryByTestId(`iso-socle-${c}`)).toBeNull();
      }
      const peints = dix.filter((c) => spriteDe(c, stadeReel(c, "rough"))).length;
      expect(peints).toBeGreaterThan(0);
      expect(screen.queryAllByTestId(/^iso-maquette-/).length).toBe(peints);
      expect(screen.queryAllByTestId(/^iso-socle-/).length).toBeLessThanOrEqual(dix.length);
      await screen.unmount();
      await afficher(12, { campfire: 1 });
      expect(vues(screen.toJSON())).toBeLessThan(total);
    });

    it("keeps a neighbour's instance when a building appears (0 to 1)", async () => {
      const { rerender } = await render(arbre(12, { campfire: 1, forge: 0 }));
      const avant = lire("campfire");
      expect(avant).not.toBeNull();
      expect(lire("forge")).toBeNull();
      await rerender(arbre(12, { campfire: 1, forge: 1 }));
      expect(lire("forge")).not.toBeNull();
      expect(lire("campfire")).toBe(avant);
    });
  });

  // L4-T03 inquiry: the pan range comes from the island (tier and built codes) and the area,
  // never from what is mounted. Pinned at the values of commit 3fd9b586 (same pure inputs).
  it("keeps the pan bounds of a 10-building rough village at 3fd9b586's values", async () => {
    const dix = buildingCodes.slice(0, 10);
    await afficher(12, Object.fromEntries(dix.map((c) => [c, 1])));
    const { visible } = etatAvec(12, dix);
    const ile = emprise(visible);
    assert(ile);
    const l: Limites = {
      ile: ileCentree(ile, LARGEUR, HAUTEUR),
      w: 390,
      h: 390,
      zmin: 0,
      zmax: ZOOM_MAX,
    };
    expect(ile).toEqual({ x0: 0, x1: 960, y0: 0, y1: 480 });
    expect(bornesPan(1, l)).toEqual({ xMin: -480, xMax: 480, yMin: -240, yMax: 240 });
    expect(cadrageComplet(visible, 390, 390).zoom).toBeCloseTo(0.40625 * MARGE_CADRAGE, 10);
  });
});

describe("growth layer detail (L4-T03)", () => {
  // The layer's rect is local to its parent; the map's decode level must still follow the sprite's
  // place on the map, so the layer and the sprite it covers load at the same size.
  it.each([
    [2, null],
    [3, "autour"],
  ])("decodes like the map's sprite at level %i", async (palier, zoneDe) => {
    const s = spriteDe("campfire", "rough");
    assert(s);
    const r = pose("campfire", s);
    // Level 3 only where the zone reaches: a zone that holds the sprite's place on the map but not
    // the origin, where the layer's local rect sits. Without `ancre` the layer would drop to level 1.
    expect(r.x).toBeGreaterThan(r.w);
    expect(r.y).toBeGreaterThan(r.h);
    const zone = zoneDe === "autour" ? { x: r.x, y: r.y, w: r.w, h: r.h } : null;
    // A bundled image is its uri under the app; under jest it is the stub object.
    const resoudre = jest
      .spyOn(Image, "resolveAssetSource")
      .mockReturnValue({ uri: "res:/1", width: 1344, height: 1344, scale: 1 });
    await render(
      <PalierContext.Provider value={{ palier, zone }}>
        <Planche s={s} rect={r} testID="carte" />
        <IsoCroissance code="campfire" ancien={null} nouveau="rough" />
      </PalierContext.Provider>,
    );
    const taille = (id: string) => {
      const src = screen.getByTestId(id).props.source as { width?: number; height?: number }[];
      return [src[0]?.width, src[0]?.height];
    };
    expect(taille("carte")[0]).toEqual(expect.any(Number));
    expect(taille("iso-croissance-nouveau-image-campfire")).toEqual(taille("carte"));
    resoudre.mockRestore();
  });

  it("keeps the layer inside IsoVillage's provider: same size as the map's sprite at a high zoom", async () => {
    const s = spriteDe("campfire", "rough");
    assert(s);
    const r = pose("campfire", s);
    mockReduit = false;
    jest.useFakeTimers();
    mockDetail = { palier: 2, zone: { x: r.x, y: r.y, w: r.w, h: r.h } };
    const resoudre = jest
      .spyOn(Image, "resolveAssetSource")
      .mockReturnValue({ uri: "res:/1", width: 1344, height: 1344, scale: 1 });
    try {
      await render(
        arbre(12, { campfire: 1 }, { cle: "c", items: [{ code: "campfire", oldLevel: 0 }] }),
      );
      await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS + CHANTIER_MS));
      const taille = (id: string) => {
        const src = screen.getByTestId(id).props.source as { width?: number; height?: number }[];
        return [src[0]?.width, src[0]?.height];
      };
      expect(taille("iso-maquette-campfire")[0]).toEqual(expect.any(Number));
      expect(taille("iso-croissance-nouveau-image-campfire")).toEqual(
        taille("iso-maquette-campfire"),
      );
    } finally {
      resoudre.mockRestore();
      mockDetail = null;
      jest.useRealTimers();
    }
  });
});

describe("ambiance and biome (L4-AUD I7)", () => {
  afterEach(() => {
    mockReduit = false;
  });
  const avec = (extra: { ambiance?: "nuit" | "jour"; biome?: "defaut" }) => (
    <GestureHandlerRootView>
      <IsoVillage
        tier={12}
        buildings={[{ code: "campfire", level: 1 }]}
        width={390}
        height={390}
        {...extra}
      />
    </GestureHandlerRootView>
  );

  it("draws the same tree by default and with the defaults passed", async () => {
    // A wave starts on its own clock a moment after mount, so the walkers' plan depends on when
    // the snapshot is taken: this test is about ambiance and biome, so still life only.
    mockReduit = true;
    const a = await render(avec({}));
    // Gesture tags and the clock's phase vary between renders: the drawing is every named view,
    // its source and its style.
    const dessin = () =>
      JSON.stringify(
        screen
          .queryAllByTestId(/./)
          .map((n) => [n.props.testID, n.props.source, n.props.style, n.props.fill, n.props.d]),
      );
    const parDefaut = dessin();
    expect(screen.queryAllByTestId(/^iso-lisiere-/).length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId(/^iso-animal-/).length).toBeGreaterThan(0);
    await a.unmount();
    const b = await render(avec({ ambiance: "nuit", biome: "defaut" }));
    expect(dessin()).toBe(parDefaut);
  });

  it("jour: no fireflies, no flame glow; nuit has them all", async () => {
    await render(avec({ ambiance: "nuit" }));
    expect(screen.queryAllByTestId("iso-lucioles")).toHaveLength(1);
    expect(screen.queryAllByTestId(/^iso-flamme-/).length).toBeGreaterThan(0);
    await screen.unmount();
    await render(avec({ ambiance: "jour" }));
    expect(screen.queryAllByTestId("iso-lucioles")).toHaveLength(0);
    expect(screen.queryAllByTestId(/^iso-flamme-/)).toHaveLength(0);
  });

  it("takes the ambiance down to the lisiere and the animals: jour has no image yet", async () => {
    await render(avec({ ambiance: "jour" }));
    expect(screen.queryAllByTestId(/^iso-lisiere-/)).toHaveLength(0);
    expect(screen.queryAllByTestId(/^iso-animal-/)).toHaveLength(0);
  });
});

describe("each view shows its own image (L4-AUD)", () => {
  it.each([1, 3, 12] as const)(
    "tier %i: every building's source is its own, the forge's included, and the animals stand",
    async (tier) => {
      const buildings = buildingCodes.map((code) => ({ code, level: 4 }));
      await render(
        <GestureHandlerRootView>
          <IsoVillage tier={tier} buildings={buildings} width={390} height={390} />
        </GestureHandlerRootView>,
      );
      const maquettes = screen.queryAllByTestId(/^iso-maquette-[a-z_]+$/);
      expect(maquettes.length).toBeGreaterThan(10);
      for (const m of maquettes) {
        const code = String(m.props.testID).slice("iso-maquette-".length);
        expect([code, JSON.stringify(m.props.source)]).toEqual([
          code,
          expect.stringContaining(`/${code}/`),
        ]);
      }
      const forge = screen.getByTestId("iso-maquette-forge").props.source;
      expect(JSON.stringify(forge)).toContain("/forge/");
      // The cat stands by the well and the hen by the farm, both on the island from tier 1.
      for (const nom of ["chat", "poule"])
        expect(screen.queryAllByTestId(new RegExp(`^iso-animal-${nom}`)).length).toBeGreaterThan(0);
    },
  );
});

/** dev-iso's real Prêt mode, laid out at 390 x 390: the path qa plays on the device. */
// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Pret({ onRevelation, jouer }: { onRevelation?: () => void; jouer?: boolean }) {
  return (
    <GestureHandlerRootView>
      <TamaguiProvider config={config} defaultTheme="dark">
        <PretDemo palier={1} jouer={jouer} onRevelation={onRevelation} />
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}

/** A tap on the ready building (the only one of the Prêt map), through the real tap gesture. */
async function toucherLePret() {
  await fireEvent(screen.getByTestId("iso-pret-aire"), "layout", {
    nativeEvent: { layout: { width: 390, height: 390 } },
  });
  const buildings = etatCarte(1, false).montres.map((code) => ({ code, level: 9 }));
  const [code, ancien] = (croissanceDemo(buildings, 0) ?? "").split(":") as [BuildingCode, string];
  const v = camera();
  const [mx, my] = ecranXY(centreBatiment(code));
  const x = (mx - LARGEUR / 2) * v.zoom + 195 + v.x;
  const y = (my - HAUTEUR / 2) * v.zoom + 195 + v.y;
  await act(() => {
    const tap = createGestureController(getByGestureTestId("iso-geste-tap"));
    tap.begin({ x, y });
    tap.activate({ x, y });
    tap.end({ x, y });
  });
  return { code, oldLevel: Number(ancien) };
}

describe("ready to evolve (L6-T13)", () => {
  beforeEach(() => {
    mockReduit = false;
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  // H3-01: `?jouer=1` on the dev route claims the ready building by itself, once; without it, never.
  it("Prêt: nothing plays by itself without jouer, the climb starts once with it", async () => {
    await render(<Pret />);
    await fireEvent(screen.getByTestId("iso-pret-aire"), "layout", {
      nativeEvent: { layout: { width: 390, height: 390 } },
    });
    await act(() => jest.advanceTimersByTime(4000));
    expect(screen.queryAllByTestId(/^iso-echafaudage-/)).toHaveLength(0);
  });

  it("Prêt with jouer: the climb starts 1.5 s in, and does not restart", async () => {
    const revele = jest.fn();
    await render(<Pret jouer onRevelation={revele} />);
    await fireEvent(screen.getByTestId("iso-pret-aire"), "layout", {
      nativeEvent: { layout: { width: 390, height: 390 } },
    });
    await act(() => jest.advanceTimersByTime(1400));
    expect(screen.queryAllByTestId(/^iso-echafaudage-/)).toHaveLength(0);
    await act(() => jest.advanceTimersByTime(100 + CROISSANCE_CAMERA_MS));
    expect(screen.queryAllByTestId(/^iso-echafaudage-/).length).toBeGreaterThan(0);
    for (let ms = 0; ms < 8000; ms += 10) await act(() => jest.advanceTimersByTime(10));
    expect(revele).toHaveBeenCalledTimes(1);
  });

  it("draws the lower of the derived and the claimed level", async () => {
    await render(
      arbre(12, { campfire: 1, forge: 4 }, undefined, undefined, {
        reclamables: ["forge"],
        niveaux: { forge: 2 },
      }),
    );
    expect(lire("forge")?.props.source).toEqual([spriteDe("forge", "rough")?.image]);
    expect(lire("campfire")).not.toBeNull();
  });

  it("a ready building wears a fixed hammer, at rest, with no glow node outside a wave", async () => {
    await render(
      arbre(12, { campfire: 1, forge: 4 }, undefined, undefined, {
        reclamables: ["forge"],
        niveaux: { forge: 2 },
      }),
    );
    expect(screen.getAllByTestId("iso-marteau-forge")).toHaveLength(1);
    expect(screen.queryAllByTestId(/^iso-lueur-/)).toHaveLength(0);
  });

  it("with reduced motion the hammer stays and nothing glows or shakes", async () => {
    mockReduit = true;
    await render(
      arbre(12, { campfire: 1, forge: 4 }, undefined, undefined, {
        reclamables: ["forge"],
        niveaux: { forge: 2 },
      }),
    );
    expect(screen.getAllByTestId("iso-marteau-forge")).toHaveLength(1);
    expect(screen.queryAllByTestId(/^iso-lueur-/)).toHaveLength(0);
  });

  it("every ready building has a hammer, four at most glow", () => {
    const codes = buildingCodes.slice(0, 7);
    const { animes, tous } = repartirReclamables(codes, false);
    expect(animes.size).toBe(NOEUDS_RECLAMABLES);
    expect(tous.size).toBe(7);
    expect(repartirReclamables(codes, true).animes.size).toBe(0);
  });

  // T02b-qa: dev-iso's PretDemo (tier 1, every building at 9, the ready one drawn at its claimed
  // level until the end callback) stayed on the scaffold until a second tap.
  it("the scene of a claimed building, played by a tap on it, ends without another touch", async () => {
    await render(<Pret />);
    const { code, oldLevel } = await toucherLePret();
    await act(() => jest.advanceTimersByTime(10));
    // The site stands (the claimed level is the old one, the building's own is the new one)...
    await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS));
    expect(screen.getByTestId(`iso-echafaudage-${code}`)).toBeTruthy();
    expect(lire(code)?.props.source).toEqual([spriteDe(code, stadeAu(code, oldLevel))?.image]);
    // ...and goes by itself; the new stage fades in, then the owner writes the claim.
    await act(() => jest.advanceTimersByTime(CHANTIER_MS));
    expect(screen.getByTestId(`iso-croissance-nouveau-image-${code}`).props.source).toEqual([
      spriteDe(code, stadeAu(code, 9))?.image,
    ]);
    // E2: the scaffold leaves with the new stage's landing, no later than NOUVEAU_MS into the reveal.
    for (let ms = 0; ms <= NOUVEAU_MS && screen.queryByTestId(`iso-echafaudage-${code}`); ms += 10)
      await act(() => jest.advanceTimersByTime(10));
    expect(screen.queryByTestId(`iso-echafaudage-${code}`)).toBeNull();
    await act(() => jest.advanceTimersByTime(CROISSANCE_MS));
    expect(lire(code)?.props.source).toEqual([spriteDe(code, stadeAu(code, 9))?.image]);
  });

  // T37 (device qa-3110b): the new stage 2.9 s after the tap, 0.7 s with reduced motion. Same path
  // as the device: dev-iso's Prêt mode, a real tap, the tab's props (claim in play = new level).
  it("Prêt: the new stage shows within 1.1 s of timers after the tap, announced once", async () => {
    const revele = jest.fn();
    await render(<Pret onRevelation={revele} />);
    const { code } = await toucherLePret();
    let ms = 0;
    while (ms < 3000 && screen.queryAllByTestId(`iso-croissance-nouveau-${code}`).length === 0) {
      await act(() => jest.advanceTimersByTime(10));
      ms += 10;
    }
    expect(ms).toBeLessThanOrEqual(1100);
    expect(revele).toHaveBeenCalledTimes(1);
  });

  it("Prêt with reduced motion: the new stage is drawn in the tap's own frame, announced at once", async () => {
    mockReduit = true;
    const revele = jest.fn();
    await render(<Pret onRevelation={revele} />);
    const { code } = await toucherLePret();
    expect(screen.queryByTestId(`iso-echafaudage-${code}`)).toBeNull();
    expect(lire(code)?.props.source).toEqual([spriteDe(code, stadeAu(code, 9))?.image]);
    expect(revele).toHaveBeenCalledTimes(1);
  });

  // Android fires two timers of the same delay in either order: step 2 then step 1 left the
  // scaffold up for good (T02b-qa). No two steps of a scene may share a delay.
  it.each([
    ["with a site", 2],
    ["without one", 3],
  ])("the steps of a scene never fire at the same time (%s)", async (_, oldLevel) => {
    const espion = jest.spyOn(global, "setTimeout");
    await render(arbre(12, { campfire: 1, forge: 4 }));
    espion.mockClear();
    await screen.rerender(
      arbre(12, { campfire: 1, forge: 4 }, { cle: "t", items: [{ code: "forge", oldLevel }] }),
    );
    const delais = espion.mock.calls
      .map((c) => c[1])
      .filter((d) => (d ?? 0) >= CROISSANCE_CAMERA_MS);
    espion.mockRestore();
    expect(delais.length).toBeGreaterThanOrEqual(2);
    expect(new Set(delais).size).toBe(delais.length);
  });

  it("the evolution scene lasts 3 s at most, and a touch on the map ends it at once", async () => {
    expect(CROISSANCE_MS + CHANTIER_MS).toBeLessThanOrEqual(3000);
    const fini = jest.fn();
    const scene = { cle: "s", items: [{ code: "forge" as const, oldLevel: 2 }] };
    await render(arbre(12, { campfire: 1, forge: 4 }, scene, fini));
    await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS + 100));
    expect(fini).not.toHaveBeenCalled();
    await act(() => {
      const tap = createGestureController(getByGestureTestId("iso-geste-tap"));
      tap.begin({ x: 5, y: 5 });
      tap.activate({ x: 5, y: 5 });
      tap.end({ x: 5, y: 5 });
      jest.advanceTimersByTime(50);
    });
    await act(() => jest.advanceTimersByTime(CROISSANCE_MS + CHANTIER_MS));
    expect(fini).toHaveBeenCalledTimes(1);
  });
});

// The map's top left in the window: a jest host never measures, so the seam answers 50 dp down.
const mockMesure = jest.fn((_v: unknown, cb: (x: number, y: number) => void) => cb(0, 50));
jest.mock("@/components/village/iso/bulle", () => ({
  ...jest.requireActual("@/components/village/iso/bulle"),
  mesurerFenetre: (v: unknown, cb: (x: number, y: number) => void) => mockMesure(v, cb),
}));

describe("the bubble's door (T14)", () => {
  beforeEach(() => {
    mockReduit = false;
    jest.useFakeTimers();
    // The inhabitants stand where the day seeds them (T26): taps are aimed on a fixed day.
    jest.setSystemTime(new Date("2026-11-02T12:00:00"));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("a tap on a building opens its bubble, aimed at its mask's top, in window dp", async () => {
    const onBulle = jest.fn();
    const onOpen = jest.fn();
    const viseur: { current: ((x: number, y: number) => Ouverture | null) | undefined } = {
      current: undefined,
    };
    await render(
      <GestureHandlerRootView>
        <IsoVillage
          tier={12}
          buildings={[
            { code: "campfire", level: 1 },
            { code: "forge", level: 4 },
          ]}
          width={390}
          height={390}
          onOpen={onOpen}
          onBulle={onBulle}
          viseur={viseur}
        />
      </GestureHandlerRootView>,
    );
    // The map's top left in the window: the jest host never calls back on its own.
    const hote = screen.getByTestId("iso-village") as unknown as {
      instance: { measureInWindow: (cb: (x: number, y: number) => void) => void };
    };
    const mesure = jest.fn((cb: (x: number, y: number) => void) => cb(0, 50));
    hote.instance.measureInWindow = mesure;
    const v = camera();
    const [mx, my] = ecranXY(centreBatiment("forge"));
    const x = (mx - LARGEUR / 2) * v.zoom + 195 + v.x;
    const y = (my - HAUTEUR / 2) * v.zoom + 195 + v.y;
    await act(() => {
      const tap = createGestureController(getByGestureTestId("iso-geste-tap"));
      tap.begin({ x, y });
      tap.activate({ x, y });
      tap.end({ x, y });
      jest.advanceTimersByTime(10);
    });
    expect(onOpen).not.toHaveBeenCalled();
    expect(mockMesure).toHaveBeenCalledTimes(1);
    expect(onBulle).toHaveBeenCalledTimes(1);
    const o: Ouverture = onBulle.mock.calls[0]?.[0];
    expect(o.cible).toEqual({ type: "batiment", code: "forge" });
    // Above the tapped point (the mask's top), 50 dp lower for the map's place in the window.
    expect(o.ancre[1]).toBeLessThan(y + 50);
    // The outside tap reads the same building at the same window point.
    expect(viseur.current?.(x, y + 50)).toEqual(o);
    expect(viseur.current?.(1, 51)).toBeNull();
  });

  // T38: a tap lands where the finger went down, and a tap on a building during the opening
  // scene still opens it (the scene ends all the same).
  describe("a tap that meets a moving camera (T38)", () => {
    const forgeEcran = (niveau = 4) => {
      const v = camera();
      // The roof, not the door: a villager (T26) may stand at the building's centre.
      const [ax, ay] = ancreBatiment(
        "forge",
        cibles(["forge"], (c) => stadeAu(c, niveau)),
      ) ?? [0, 0];
      const [mx, my] = [ax, ay + 12];
      return {
        x: (mx - LARGEUR / 2) * v.zoom + 195 + v.x,
        y: (my - HAUTEUR / 2) * v.zoom + 195 + v.y,
      };
    };
    const carteBulle = (onBulle: jest.Mock, croissance?: Croissance, fini?: () => void) => (
      <GestureHandlerRootView>
        <IsoVillage
          tier={12}
          buildings={[
            { code: "campfire", level: 1 },
            { code: "forge", level: 4 },
          ]}
          width={390}
          height={390}
          onBulle={onBulle}
          croissance={croissance}
          onCroissanceFinie={fini}
        />
      </GestureHandlerRootView>
    );

    it("reads the view at the touch, not a double-tap window later", async () => {
      const onBulle = jest.fn();
      await render(carteBulle(onBulle));
      const { x, y } = forgeEcran();
      const tap = createGestureController(getByGestureTestId("iso-geste-tap"));
      const pan = createGestureController(getByGestureTestId("iso-geste-pan"));
      // What the point answers with the camera still: the reference.
      await act(() => {
        tap.begin({ x, y });
        tap.activate({ x, y });
        tap.end({ x, y });
        jest.advanceTimersByTime(300);
      });
      const repere = onBulle.mock.calls[0]?.[0];
      expect(repere).toBeDefined();
      await act(() => {
        tap.begin({ x, y });
        tap.activate({ x, y });
        // The camera moves between the touch and the moment the tap is resolved.
        pan.begin();
        pan.activate();
        pan.update({ translationX: 120, translationY: 80 });
      });
      await act(() => jest.advanceTimersByTime(50));
      expect(camera().x).not.toBe(0);
      await act(() => {
        tap.end({ x, y });
        jest.advanceTimersByTime(300);
      });
      expect(onBulle).toHaveBeenCalledTimes(2);
      expect(onBulle.mock.calls[1]?.[0].cible).toEqual(repere.cible);
    });

    it("a tap on a building during the opening scene opens it and ends the scene", async () => {
      const onBulle = jest.fn();
      const fini = jest.fn();
      const scene = { cle: "s", items: [{ code: "forge" as const, oldLevel: 2 }] };
      await render(carteBulle(onBulle, scene, fini));
      await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS / 2));
      // The old stage is what stands during the scene: the mask read is its.
      const { x, y } = forgeEcran(2);
      await act(() => {
        const tap = createGestureController(getByGestureTestId("iso-geste-tap"));
        tap.begin({ x, y });
        tap.activate({ x, y });
        tap.end({ x, y });
        jest.advanceTimersByTime(300);
      });
      expect(onBulle).toHaveBeenCalledTimes(1);
      expect(fini).toHaveBeenCalledTimes(1);
    });
  });

  describe("the totem statue on the square (T25)", () => {
    async function toucher(
      tier: VillageTier,
      cible: "forge" | "statue",
      crest: BlasonCrest | null = null,
    ) {
      const blason = { crest, onPress: jest.fn() };
      const onOpen = jest.fn();
      const onBulle = jest.fn();
      await render(
        <GestureHandlerRootView>
          <IsoVillage
            tier={tier}
            buildings={[
              { code: "campfire", level: 1 },
              { code: "forge", level: 4 },
            ]}
            width={390}
            height={390}
            onOpen={onOpen}
            onBulle={onBulle}
            blason={blason}
          />
        </GestureHandlerRootView>,
      );
      const hote = screen.getByTestId("iso-village") as unknown as {
        instance: { measureInWindow: (cb: (x: number, y: number) => void) => void };
      };
      hote.instance.measureInWindow = (cb) => cb(0, 50);
      const v = camera();
      const s = boiteStatue(piedStatue(), etatStatue(crest));
      let [mx, my] = ecranXY(centreBatiment("forge"));
      if (cible === "statue") [mx, my] = [s.x + s.w / 2, s.y + s.h / 2];
      const x = (mx - LARGEUR / 2) * v.zoom + 195 + v.x;
      const y = (my - HAUTEUR / 2) * v.zoom + 195 + v.y;
      await act(() => {
        const tap = createGestureController(getByGestureTestId("iso-geste-tap"));
        tap.begin({ x, y });
        tap.activate({ x, y });
        tap.end({ x, y });
        jest.advanceTimersByTime(10);
      });
      return { blason, onOpen, onBulle };
    }

    it.each([
      ["the empty plinth", null],
      [
        "the animal",
        {
          animal: "bear",
          manual: false,
          quarters: null,
          longestFlame: 0,
          rings: 0,
          second: null,
          stage: "adult",
        } satisfies BlasonCrest,
      ],
    ])(
      "a tap on the statue (%s) calls the crest handler once, opens no building",
      async (_, crest) => {
        const { blason, onOpen, onBulle } = await toucher(12, "statue", crest);
        expect(blason.onPress).toHaveBeenCalledTimes(1);
        expect(onOpen).not.toHaveBeenCalled();
        expect(onBulle).not.toHaveBeenCalled();
      },
    );

    it("a tap on a building's mask outside the box still opens its bubble", async () => {
      const { blason, onBulle } = await toucher(12, "forge");
      expect(blason.onPress).not.toHaveBeenCalled();
      expect(onBulle).toHaveBeenCalledTimes(1);
    });

    it("nothing when its cell is not on the island (its cell shows from tier 1 on)", () => {
      const b = boiteStatue(piedStatue(), null);
      const centre: [number, number] = [b.x + b.w / 2, b.y + b.h / 2];
      expect(statueAuPoint(centre, etatCarte(1, false).visible, null)).toBe(true);
      expect(statueAuPoint(centre, [], null)).toBe(false);
    });
  });

  describe("a tap in the village tab's area (audit DA exit, 23)", () => {
    it.each(["farm", "barn", "windmill", "forge"] as const)(
      "a tap on the %s opens its bubble, with the tab's size and foot margin",
      async (code) => {
        const onBulle = jest.fn();
        const [w, h, marge] = [390, 644, 53];
        await render(
          <GestureHandlerRootView>
            <IsoVillage
              tier={12}
              buildings={[
                { code: "campfire", level: 1 },
                { code: code, level: 4 },
              ]}
              width={w}
              height={h}
              margeBas={marge}
              onBulle={onBulle}
            />
          </GestureHandlerRootView>,
        );
        const hote = screen.getByTestId("iso-village") as unknown as {
          instance: { measureInWindow: (cb: (x: number, y: number) => void) => void };
        };
        hote.instance.measureInWindow = (cb) => cb(0, 0);
        const v = camera();
        // A little behind the centre: a villager stands in front of the door (T26) and wins the tap there.
        const [gx, gy] = centreBatiment(code);
        const [mx, my] = ecranXY([gx - 0.8, gy - 0.8]);
        const x = (mx - LARGEUR / 2) * v.zoom + w / 2 + v.x;
        const y = (my - HAUTEUR / 2) * v.zoom + h / 2 + v.y;
        await act(() => {
          const tap = createGestureController(getByGestureTestId("iso-geste-tap"));
          tap.begin({ x, y });
          tap.activate({ x, y });
          tap.end({ x, y });
          jest.advanceTimersByTime(10);
        });
        expect(onBulle).toHaveBeenCalledTimes(1);
        expect(onBulle.mock.calls[0]?.[0].cible.code).toBe(code);
      },
    );
  });
});

// Audit DA 19: the map comes in with one soft fade, none with reduced motion.
describe("the opening fade (audit DA 19)", () => {
  const opacite = () =>
    (getAnimatedStyle(screen.getByTestId("iso-camera")) as unknown as { opacity?: number }).opacity;
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    mockReduit = false;
    jest.useRealTimers();
  });

  it("starts clear and is opaque after the one duration", async () => {
    mockReduit = false;
    await render(arbre(12, { campfire: 1 }));
    expect(opacite()).toBe(0);
    await act(() => jest.advanceTimersByTime(FONDU_OUVERTURE_MS / 2));
    expect(opacite()).toBeGreaterThan(0);
    expect(opacite()).toBeLessThan(1);
    await act(() => jest.advanceTimersByTime(FONDU_OUVERTURE_MS));
    expect(opacite()).toBe(1);
  });

  it("has no fade with reduced motion", async () => {
    mockReduit = true;
    await render(arbre(12, { campfire: 1 }));
    expect(opacite()).toBe(1);
    expect(dureeFondu(true)).toBe(0);
    expect(dureeFondu(false)).toBe(FONDU_OUVERTURE_MS);
  });
});
