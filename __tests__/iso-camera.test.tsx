// L3-T03/T04: the iso map's gestures (useCameraIso), the tap on a building and its accessibility.
// RNGH mocks its native module and host detector; it must load before the component does.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { act, configure, render, screen } from "@testing-library/react-native";
import { View } from "react-native";
import { GestureHandlerRootView, type NativeGesture } from "react-native-gesture-handler";
import {
  createGestureController,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import * as Reanimated from "react-native-reanimated";
import {
  cadrage,
  cadrageComplet,
  emprise,
  etatAvec,
  etatCarte,
  HAUTEUR,
  LARGEUR,
  ORDRE_SPRITES,
  type Vue,
  ZOOM_MAX,
} from "@/components/village/iso/carteDemo";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import { carteDepuisEcran, type Limites, zoomerAutour } from "@/components/village/iso/navigation";
import {
  batimentAuPoint,
  type Cible,
  cibles,
  type Masque,
  opaque,
} from "@/components/village/iso/tapBatiment";
import type { MemoireCamera } from "@/components/village/iso/useCameraIso";
import { type BuildingCode, buildingCodes } from "@/db/schema";
import type { VillageTier } from "@/db/village";

// Under jest, RNGH asks react-native-worklets for its UI runtime in a microtask, which the worklets
// mock refuses; the worklets run on the JS thread here, so an empty holder is enough.
jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
let mockReduit = false;
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduit }));
const mockOuvrir = jest.fn();

// Reanimated 4.7 types `getAnimatedStyle` from its web stub (`(): void`); jest runs the native one.
const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { transform?: Record<string, number>[] };

type B = { code: BuildingCode; level: number };

function carte(
  tier: VillageTier,
  niveaux: Partial<Record<BuildingCode, number>>,
  bloque?: NativeGesture,
  aire: { w?: number; h?: number; memoire?: { current: MemoireCamera | undefined } } = {},
) {
  const buildings: B[] = Object.entries(niveaux).map(([code, level]) => ({
    code: code as BuildingCode,
    level,
  }));
  return (
    <GestureHandlerRootView>
      <IsoVillage
        tier={tier}
        buildings={buildings}
        width={aire.w ?? 390}
        height={aire.h ?? 390}
        onOpen={mockOuvrir}
        bloque={bloque}
        memoire={aire.memoire}
      />
    </GestureHandlerRootView>
  );
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

const geste = (id: string) => createGestureController(getByGestureTestId(id));
// Shared values reach the animated style on the next frame.
const ecoule = (ms: number) => act(async () => jest.advanceTimersByTime(ms));

beforeEach(() => {
  jest.useFakeTimers();
  mockReduit = false;
  mockOuvrir.mockClear();
});
afterEach(() => jest.useRealTimers());

async function glisser(dx: number, dy = 0) {
  const pan = geste("iso-geste-pan");
  await act(() => {
    pan.begin();
    pan.activate();
    pan.update({ translationX: dx, translationY: dy });
  });
  await ecoule(50);
  return pan;
}

async function pincer(k: number, focalX = 195, focalY = 195) {
  const pinch = geste("iso-geste-pinch");
  await act(() => {
    pinch.begin();
    pinch.activate();
    pinch.update({ scale: k, focalX, focalY });
  });
  await ecoule(50);
}

async function doubleTap() {
  const double = geste("iso-geste-double");
  await act(() => {
    double.begin();
    double.activate();
    double.end();
  });
}

// The map is hidden from the screen reader on purpose; the tests still read its tree.
configure({ defaultIncludeHiddenElements: true });

describe("page scroll relation", () => {
  it("makes the map's pan block the page's scroll gesture, with no prop to write", async () => {
    const page = { handlerTag: 4242 } as unknown as NativeGesture;
    await render(carte(12, { campfire: 1 }, page));
    const pan = getByGestureTestId("iso-geste-pan") as unknown as {
      gestureRelations: { blocksHandlers: number[] };
    };
    expect(pan.gestureRelations.blocksHandlers).toContain(4242);
  });

  it("blocks nothing when there is no page scroll to block", async () => {
    await render(carte(12, { campfire: 1 }));
    const pan = getByGestureTestId("iso-geste-pan") as unknown as {
      gestureRelations: { blocksHandlers: number[] };
    };
    expect(pan.gestureRelations.blocksHandlers).toEqual([]);
  });
});

describe("taps", () => {
  // A quick drag (under the taps' duration limit) must end as a drag, never as a tap on a building.
  it.each(["iso-geste-tap", "iso-geste-double"])("%s fails past the pan threshold", async (id) => {
    await render(carte(12, { campfire: 1 }));
    const g = getByGestureTestId(id) as unknown as { config: { maxDist?: number } };
    expect(g.config.maxDist).toBe(8);
  });
});

describe("camera gestures", () => {
  it("lets a drag move the camera, and never off the island", async () => {
    await render(carte(12, { campfire: 1 }));
    const avant = camera();
    await glisser(5000, -5000);
    const apres = camera();
    expect(apres.x).not.toBe(avant.x);
    expect(Math.abs(apres.x)).toBeLessThan(390);
    expect(Math.abs(apres.y)).toBeLessThan(390);
  });

  it("stops the zoom at the bounds: the framing for the floor, the game's closest for the top", async () => {
    await render(carte(12, { campfire: 1 }));
    const fit = cadrageComplet(etatAvec(12, ["campfire"]).visible, 390, 390).zoom;
    await pincer(0.01);
    expect(camera().zoom).toBe(fit);
    await pincer(1000);
    expect(camera().zoom).toBe(ZOOM_MAX);
  });

  it("frames again on a double tap", async () => {
    await render(carte(12, { campfire: 1 }));
    const cadre = cadrage(etatAvec(12, ["campfire"]).visible, 390, 390);
    await pincer(2);
    await glisser(40, 40);
    expect(camera().zoom).not.toBe(cadre.zoom);
    await doubleTap();
    await ecoule(400);
    expect(camera()).toEqual(cadre);
  });

  // A touch stops the whole re-framing: stopping the shift alone let the zoom run on about a point
  // the camera no longer moved towards, and the view slid off what the finger held.
  it("stops the zoom with the shift when a touch lands mid re-framing", async () => {
    await render(carte(12, { campfire: 1 }));
    const cadre = cadrage(etatAvec(12, ["campfire"]).visible, 390, 390);
    await pincer(2);
    await doubleTap();
    await ecoule(50);
    await act(() => geste("iso-geste-pan").begin());
    await ecoule(400);
    const tenu = camera();
    expect(tenu.zoom).not.toBe(cadre.zoom);
    await ecoule(400);
    expect(camera()).toEqual(tenu);
  });

  it("frames again when the island changes, and not otherwise", async () => {
    await render(carte(2, { campfire: 1 }));
    await pincer(2);
    const zoome = camera();
    await screen.rerender(carte(2, { campfire: 1 }));
    await ecoule(50);
    expect(camera()).toEqual(zoome);
    await screen.rerender(carte(12, { campfire: 1 }));
    await ecoule(50);
    expect(camera()).toEqual(cadrage(etatAvec(12, ["campfire"]).visible, 390, 390));
  });

  // L6-T21: a rotation changes the area; the hero's view must not jump.
  it("keeps a zoomed view when the area turns, and frames an untouched one again", async () => {
    await render(carte(12, { campfire: 1 }));
    await screen.rerender(carte(12, { campfire: 1 }, undefined, { w: 600, h: 300 }));
    await ecoule(50);
    expect(camera()).toEqual(cadrage(etatAvec(12, ["campfire"]).visible, 600, 300));
    await pincer(2, 300, 150);
    const zoome = camera();
    await screen.rerender(carte(12, { campfire: 1 }, undefined, { w: 390, h: 700 }));
    await ecoule(50);
    expect(camera()).toEqual(zoome);
  });

  // T38 (L6-T20, island seen once above the world): the land and the island are two nodes with one
  // transform; they may never part, whatever the area does before and after the first layout.
  it("the world and the island keep one transform and one origin through resizes and gestures", async () => {
    const fond = () => {
      const t = getAnimatedStyle(screen.getByTestId("iso-monde-fond")).transform ?? [];
      const v: Record<string, number> = Object.assign({}, ...t);
      return { zoom: v.scale, x: v.translateX, y: v.translateY };
    };
    const origine = () => {
      const s = screen.getByTestId("iso-monde-fond").props.style as Record<string, number>[];
      const o = Object.assign({}, ...[s].flat(3).filter(Boolean));
      return [o.left, o.top];
    };
    await render(carte(12, { campfire: 1 }, undefined, { w: 0, h: 0 }));
    for (const aire of [
      { w: 390, h: 390 },
      { w: 600, h: 300 },
      { w: 390, h: 700 },
    ]) {
      await screen.rerender(carte(12, { campfire: 1 }, undefined, aire));
      await ecoule(50);
      expect(fond()).toEqual(camera());
      expect(origine()).toEqual([(aire.w - LARGEUR) / 2, (aire.h - HAUTEUR) / 2]);
      await pincer(1.5, aire.w / 2, aire.h / 2);
      await glisser(40, -30);
      expect(fond()).toEqual(camera());
    }
  });

  it("starts a remounted map where the last one stood", async () => {
    const memoire: { current: MemoireCamera | undefined } = { current: undefined };
    await render(carte(12, { campfire: 1 }, undefined, { memoire }));
    await pincer(2);
    const zoome = camera();
    await screen.unmount();
    expect(memoire.current?.vue).toEqual(zoome);
    await render(carte(12, { campfire: 1 }, undefined, { w: 600, h: 300, memoire }));
    await ecoule(50);
    expect(camera()).toEqual(zoome);
  });

  // The tab's rotation: the old map unmounts and the new one mounts in the same commit, so a
  // memory read at render would still be empty and the camera would jump back to the framing.
  it("keeps the view when the map changes parent in one commit", async () => {
    const memoire: { current: MemoireCamera | undefined } = { current: undefined };
    const ici = (cote: boolean) => {
      const map = carte(12, { campfire: 1 }, undefined, {
        w: cote ? 600 : 390,
        h: cote ? 300 : 700,
        memoire,
      });
      return cote ? (
        <View testID="cote">{map}</View>
      ) : (
        <View>{[<View key="haut">{map}</View>]}</View>
      );
    };
    await render(ici(false));
    await pincer(2);
    const zoome = camera();
    await screen.rerender(ici(true));
    await ecoule(50);
    expect(screen.getByTestId("cote")).toBeTruthy();
    // Kept (not re-framed), then held inside the new area's bounds: since the bounds keep the island's
    // middle half in view (qa-audit1) the 600 x 300 area's range is tighter, so y comes in from the zoomed view's to 108.727 (155 before the framing fitted the village width, iter-02; 112.125 before the FIN-DIS plan moved the island).
    expect(camera()).toEqual({ ...zoome, y: expect.closeTo(108.72727, 4) });
  });

  it("coasts after a drag", async () => {
    await render(carte(12, { campfire: 1 }));
    await pincer(2);
    const pan = await glisser(0);
    const avant = camera().x;
    await act(() => {
      pan.end({ velocityX: 3000, velocityY: 0 });
    });
    await ecoule(1500);
    expect(camera().x).not.toBe(avant);
  });

  it("with reduced motion neither coasts nor animates the re-frame", async () => {
    mockReduit = true;
    await render(carte(12, { campfire: 1 }));
    await pincer(2);
    const pan = await glisser(0);
    const avant = camera().x;
    await act(() => {
      pan.end({ velocityX: 3000, velocityY: 0 });
    });
    await ecoule(1500);
    expect(camera().x).toBe(avant);
    await doubleTap();
    await ecoule(40);
    expect(camera().zoom).toBe(cadrage(etatAvec(12, ["campfire"]).visible, 390, 390).zoom);
  });
});

/** A map point on an opaque pixel of the mask, and one on a transparent pixel. */
function pixels(c: Cible) {
  const { masque, rect, taille } = c;
  let plein: [number, number] | undefined;
  let vide: [number, number] | undefined;
  for (let r = 0; r < masque.h; r++)
    for (let col = 0; col < masque.w; col++) {
      const u = (col + 0.5) * masque.pas;
      const v = (r + 0.5) * masque.pas;
      const p: [number, number] = [
        rect.x + (u / taille[0]) * rect.w,
        rect.y + (v / taille[1]) * rect.h,
      ];
      if (opaque(masque, u, v)) plein ??= p;
      else vide ??= p;
    }
  return { plein, vide };
}

/** Throws on the first cell where the compact mask and the sidecar's rows disagree. */
function comparer(cle: string, masque: Masque, rows: string[]) {
  rows.forEach((ligne, r) => {
    [...ligne].forEach((bit, c) => {
      const u = (c + 0.5) * masque.pas;
      const v = (r + 0.5) * masque.pas;
      if (opaque(masque, u, v) !== (bit === "1")) throw new Error(`${cle} ${r},${c}`);
    });
  });
}

describe("tap on a building", () => {
  async function toucher(point: [number, number]) {
    const v = camera();
    const x = (point[0] - LARGEUR / 2) * v.zoom + v.x + 195;
    const y = (point[1] - HAUTEUR / 2) * v.zoom + v.y + 195;
    const tap = geste("iso-geste-tap");
    await act(() => {
      tap.begin({ x, y });
      tap.activate({ x, y });
      tap.end({ x, y });
    });
  }

  it("opens the building under an opaque pixel, and nothing under a transparent one", async () => {
    await render(carte(12, { campfire: 1, forge: 3 }));
    const forge = cibles(["forge"], () => "solid")[0];
    assert(forge);
    const { plein, vide } = pixels(forge);
    assert(plein && vide);
    await toucher(vide);
    expect(mockOuvrir).not.toHaveBeenCalled();
    await toucher(plein);
    expect(mockOuvrir).toHaveBeenCalledWith({ code: "forge", level: 3 });
  });

  it("reads every real mask like its sidecar", () => {
    const iso = path.join(__dirname, "..", "assets/images/village/iso");
    let verifies = 0;
    for (const [cle, s] of Object.entries(MAQUETTES)) {
      if (!s.masque) continue;
      const fichier = existsSync(path.join(iso, cle.replace(/\.webp$/, ".json")))
        ? cle
        : `blockout/${cle}`;
      const { mask } = JSON.parse(
        readFileSync(path.join(iso, fichier.replace(/\.webp$/, ".json")), "utf8"),
      ) as { mask: { rows: string[] } };
      comparer(cle, s.masque, mask.rows);
      verifies++;
    }
    expect(verifies).toBeGreaterThanOrEqual(50);
  });

  it("hits each building, alone on the island, where its mask is set", () => {
    for (const code of buildingCodes) {
      for (const stade of ["rough", "solid", "grand"] as const) {
        const cible = cibles([code], () => stade)[0];
        if (!cible) continue;
        const { plein, vide } = pixels(cible);
        assert(plein && vide);
        expect(batimentAuPoint(plein, [cible])).toBe(code);
        expect(batimentAuPoint(vide, [cible])).toBeNull();
      }
    }
  });

  it("round-trips a screen point through the camera", () => {
    const p = carteDepuisEcran(
      [195 + 12, 195 - 7],
      { zoom: 0.5, x: 12, y: -7 },
      { w: 390, h: 390 },
      { largeur: LARGEUR, hauteur: HAUTEUR },
    );
    expect(p[0]).toBeCloseTo(LARGEUR / 2);
    expect(p[1]).toBeCloseTo(HAUTEUR / 2);
  });

  it("gives the building in front the tap where two masks overlap", () => {
    const plein: Masque = { pas: 1, w: 4, h: 4, bits: "ffff" };
    const haut: Masque = { pas: 1, w: 4, h: 4, bits: "ff00" };
    const rect = { x: 0, y: 0, w: 4, h: 4 };
    const dos: Cible = { code: "campfire", rect, taille: [4, 4], masque: plein };
    const devant: Cible = { code: "forge", rect, taille: [4, 4], masque: haut };
    // Back to front: the forge is drawn last.
    expect(batimentAuPoint([1.5, 1.5], [dos, devant])).toBe("forge");
    expect(batimentAuPoint([1.5, 3.5], [dos, devant])).toBe("campfire");
    expect(batimentAuPoint([9, 9], [dos, devant])).toBeNull();
  });

  it("opens a ready building from a tap on its hammer, and only when it is ready (H3-02)", () => {
    const sans = cibles(["campfire", "forge"], () => "solid");
    const prets = cibles(["campfire", "forge"], () => "solid", undefined, ["forge"]);
    const marteau = prets.find((c) => c.marteau);
    assert(marteau);
    expect(sans.some((c) => c.marteau)).toBe(false);
    const centre = [
      marteau.rect.x + marteau.rect.w / 2,
      marteau.rect.y + marteau.rect.h / 2,
    ] as const;
    expect(batimentAuPoint(centre, prets)).toBe("forge");
  });

  it("lists the shown buildings in the map's draw order, with masks that cover their sprites", () => {
    const liste = cibles(["campfire", "forge", "windmill"], () => "solid");
    expect(liste.map((c) => c.code)).toEqual(
      ORDRE_SPRITES.filter((c) => liste.some((l) => l.code === c)),
    );
    for (const c of liste) {
      expect(c.masque.w * c.masque.pas).toBeGreaterThanOrEqual(c.taille[0]);
      expect(c.masque.bits).toHaveLength(Math.ceil(c.masque.w / 4) * c.masque.h);
    }
  });

  it("hides the map from the screen reader: the village list is each building's one door", async () => {
    await render(carte(12, { forge: 3, windmill: 5 }));
    const racine = screen.getByTestId("iso-village");
    expect(racine.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(racine.props.accessibilityElementsHidden).toBe(true);
    expect(screen.queryByTestId("iso-batiment-forge")).toBeNull();
    expect(screen.queryByTestId("iso-acces")).toBeNull();
  });
});

describe("zoom about the fingers", () => {
  const l: Limites = {
    ile: { x0: -100, x1: 100, y0: -50, y1: 50 },
    w: 400,
    h: 300,
    zmin: 0.5,
    zmax: 2,
  };

  it("keeps the map point under the fingers where it was", () => {
    const v = { zoom: 1, x: 20, y: 0 };
    const f = { x: 60, y: 10 };
    const sous = (u: Vue) => [(f.x - u.x) / u.zoom, (f.y - u.y) / u.zoom];
    const z = zoomerAutour(v, f, 1.5, l);
    expect(z.zoom).toBe(1.5);
    expect(sous(z)[0]).toBeCloseTo(sous(v)[0] ?? 0);
    expect(sous(z)[1]).toBeCloseTo(sous(v)[1] ?? 0);
  });

  it("applies the factor that survives the bound, so a pinch at the top does not drag the map", () => {
    const v = { zoom: 4, x: 30, y: 5 };
    expect(zoomerAutour(v, { x: 80, y: 40 }, 3, { ...l, zmax: 4 })).toEqual(v);
  });

  it("brings the pan back in after the zoom", () => {
    const z = zoomerAutour({ zoom: 2, x: 0, y: 0 }, { x: 190, y: 0 }, 0.5, l);
    expect(z.zoom).toBe(1);
    expect(Math.abs(z.x)).toBeLessThanOrEqual(100);
  });
});

// T38: the opening frame fits the island in the tab's real map area, tips included, with room left.
describe("opening frame in the village tab (T38)", () => {
  it.each([1, 6, 12] as const)("tier %s: the island clears every edge of 390 x (644 - 53)", (p) => {
    const visible = etatCarte(p, false).visible;
    const [w, h] = [390, 644 - 53];
    const v = cadrageComplet(visible, w, h);
    const ile = emprise(visible);
    assert(ile);
    const gauche = (ile.x0 - LARGEUR / 2) * v.zoom + w / 2 + v.x;
    const droite = (ile.x1 - LARGEUR / 2) * v.zoom + w / 2 + v.x;
    expect(gauche).toBeGreaterThanOrEqual(0);
    expect(droite).toBeLessThanOrEqual(w);
    expect(gauche).toBeGreaterThanOrEqual(8);
    expect(w - droite).toBeGreaterThanOrEqual(8);
  });
});
