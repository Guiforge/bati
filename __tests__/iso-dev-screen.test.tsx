// RNGH mocks its native module and host detector; it must load before the screen does.
import "react-native-gesture-handler/jestSetup";
import assert from "node:assert/strict";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Image, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  createGestureController,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import * as Reanimated from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import DevIsoRoute from "@/app/dev-iso";
import {
  COTE,
  CRAN,
  cadrage,
  cadrageComplet,
  cheminSvg,
  ecranXY,
  etatCarte,
  FIGURINES,
  HAUTEUR,
  LARGEUR,
  MARGE_CADRAGE,
  ombresDe,
  ombresPiece,
  PIECES,
  PLACE,
  pieceMontree,
  pose,
  poseCentre,
  posePiece,
  spriteDe,
  stadeDemo,
  tuiles,
  type Vue,
  voileDe,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomer,
} from "@/components/village/iso/carteDemo";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import { planifierVague } from "@/components/village/iso/marcheurs";
import { casesSousOmbre, eauTracee } from "@/components/village/iso/pieces";
import { REFLET_LONG, traitReflet } from "@/components/village/iso/reflets";
import { centreEau } from "@/components/village/iso/riviere";
import { INTEGRATION } from "@/constants/isoPoc";
import spec from "@/constants/isoSpec.json";
import "@/i18n";
import { buildingCodes, buildingDefinitions } from "@/db/schema";
import config from "@/tamagui.config";

// Under jest, RNGH asks react-native-worklets for its UI runtime in a microtask, which the worklets
// mock refuses ("not supported on web") and the suite dies after its tests. Nothing here runs a
// gesture on the UI thread, so an empty holder is enough.
jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));

jest.mock("@/components/village/iso/marcheurs", () => {
  const actual = jest.requireActual("@/components/village/iso/marcheurs");
  return { ...actual, planifierVague: jest.fn(actual.planifierVague) };
});

// Reanimated 4.7 types `getAnimatedStyle` from its web stub (`(): void`); jest runs the native one.
const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { transform?: Record<string, number>[] };

// T37 (device qa-3110c): the Prêt reveal read the settings store with a lazy require, whose first
// load took a second and delayed the buzz. The screen loads it at its mount, before any tap.
const mockChargesReglages = { n: 0 };
jest.mock("@/stores/settings", () => {
  mockChargesReglages.n += 1;
  return { useSettingsStore: { getState: () => ({ hapticsEnabled: true, soundEnabled: false }) } };
});

/** The area under the header, as onLayout reports it in the tests. */
const AIRE = { w: 390, h: 600 };

let mockParams: { fige?: string } = {};
const mockRedirect = jest.fn((_: { href: string }) => null);
beforeEach(() => mockRedirect.mockClear());
// The camera reads the reduced-motion setting, which would open the settings store and its database.
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));
jest.mock("expo-router", () => ({
  useIsFocused: () => true,
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/dev-iso",
  useLocalSearchParams: () => mockParams,
  Redirect: (props: { href: string }) => mockRedirect(props),
}));

async function ouvrir() {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <GestureHandlerRootView>
        <TamaguiProvider config={config} defaultTheme="dark">
          <DevIsoRoute />
        </TamaguiProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>,
  );
}

type Noeud =
  | { type?: string; props?: Record<string, unknown>; children?: (Noeud | string)[] | null }
  | string;
/** Host views in the rendered tree: what becomes a native view on the phone. */
const vues = (n: Noeud | Noeud[] | null): number =>
  n === null || typeof n === "string"
    ? 0
    : Array.isArray(n)
      ? n.reduce((s, c) => s + vues(c), 0)
      : 1 + vues(n.children ?? null);

/** Every host node of the tree, depth first. */
const noeuds = (n: Noeud | Noeud[] | null): Exclude<Noeud, string>[] =>
  n === null || typeof n === "string"
    ? []
    : Array.isArray(n)
      ? n.flatMap(noeuds)
      : [n, ...noeuds(n.children ?? null)];

/** The camera's scale and shift, as the UI thread last wrote them. */
function camera(): Vue {
  const t = getAnimatedStyle(screen.getByTestId("iso-camera")).transform ?? [];
  const v: Record<string, number> = Object.assign({}, ...t);
  return {
    zoom: v.scale ?? Number.NaN,
    x: v.translateX ?? Number.NaN,
    y: v.translateY ?? Number.NaN,
  };
}

/** Shown buildings, as a plot (`iso-batiment-`) or as an image (`iso-maquette-`), by code. */
const affiches = () =>
  screen
    .queryAllByTestId(/^iso-(batiment|maquette)-/)
    .map((n) => String(n.props.testID).replace(/^iso-(batiment|maquette)-/, "iso-batiment-"));
const images = () =>
  screen.queryAllByTestId(/^iso-maquette-/).map((n) => String(n.props.testID).slice(13));
/** Shown decor and water pieces, by cell `gx-gy`. */
const piecesVues = () =>
  screen
    .queryAllByTestId(/^iso-piece-/)
    .map((n) => String(n.props.testID).slice(10))
    .toSorted();
/** The map's host children in drawing order: the tiles, then the images and veils back to front. */
function carte(): Exclude<Noeud, string>[] {
  const c = noeuds(screen.toJSON() as Noeud).find((n) => n.props?.testID === "iso-carte");
  return (c?.children ?? []).filter((n): n is Exclude<Noeud, string> => typeof n !== "string");
}
/** The `d` of the first clip path under a node: the shadows' union. */
const clipDe = (n: Noeud | undefined): string =>
  String(
    noeuds(n ?? null)
      .find((x) => x.type === "RNSVGClipPath")
      ?.children?.flatMap((x) => (typeof x === "string" ? [] : [x.props?.d]))[0],
  );

// Measured 2026-10-31, calm machine, with coverage: slowest test 6.7 s, a dozen above 1.5 s; the 5 s default tripped under load.
// Weight, not a hang: each test mounts the whole map (every building, tier 12); alone it takes seconds, under a parallel full run tens of seconds.
jest.setTimeout(120_000);

describe("the iso demo screen (L0-T06)", () => {
  test("the settings the reveal reads are loaded when the screen opens, not at the tap", async () => {
    await ouvrir();
    expect(mockChargesReglages.n).toBe(1);
  });

  test("tier 12 shows all 21 plots; tier 1 the hamlet, its starters and what their ground uncovers", async () => {
    await ouvrir();
    expect(affiches().toSorted()).toEqual(buildingCodes.map((c) => `iso-batiment-${c}`).toSorted());

    await fireEvent.press(screen.getByTestId("iso-palier-1"));
    // The starters always stand. On the FIN-DIS plan the hall's socle is on the tier-1 island, and
    // the ground the tent brings (two cells round it) holds the fountain's and the well's plots.
    const depart = buildingCodes.filter((c) => buildingDefinitions[c].tier === 1);
    const plots = [...depart, "heroes_hall", "fountain", "well"];
    expect(affiches().toSorted()).toEqual(plots.map((c) => `iso-batiment-${c}`).toSorted());
    expect(screen.getByTestId("iso-compte").props.children).toBe(
      `Palier 1, ${plots.length} terrains sur l'île`,
    );
    await fireEvent.press(screen.getByTestId("iso-palier-2"));
    expect(affiches()).toContain("iso-batiment-farm");
  });

  // L4-T02 (replaces L0-T14's "same shape at every tier"): a hidden view still costs a native
  // view and a bitmap, so the tree follows what shows. A larger tier mounts more, never fewer.
  test("the tree holds only what shows: it grows with the tier", async () => {
    await ouvrir();
    const compte: number[] = [];
    for (const id of ["iso-palier-1", "iso-palier-6", "iso-palier-12"]) {
      await fireEvent.press(screen.getByTestId(id));
      compte.push(vues(screen.toJSON() as Noeud));
    }
    expect(compte[0]).toBeLessThan(compte[1] ?? 0);
    expect(compte[1]).toBeLessThan(compte[2] ?? 0);
  });

  // On Android a group whose opacity is not 1 draws through a layer bitmap the size of its tile and
  // keeps it (react-native-svg 15.16 GroupView.drawGroup); `display="none"` is skipped, no layer.
  test("a hidden plot is display none, and no SVG node has an opacity other than 1", async () => {
    await ouvrir();
    await fireEvent.press(screen.getByTestId("iso-palier-1"));
    const svg = noeuds(screen.toJSON() as Noeud).filter((n) => n.type?.startsWith("RNSVG"));
    expect(svg.filter((n) => n.props?.opacity != null && n.props.opacity !== 1)).toEqual([]);
    // A plot is a group holding a text; tier 1 shows 4 of the 21 (each named in one tile), as a
    // plot only while it has no image at its stage.
    const boites = etatCarte(1, false).montres.filter((c) => !spriteDe(c, stadeDemo(c, 1)));
    const terrains = svg.filter(
      (n) =>
        n.type === "RNSVGGroup" && noeuds(n.children ?? null).some((c) => c.type === "RNSVGText"),
    );
    const caches = terrains.filter((n) => n.props?.display === "none");
    const nommes = terrains.filter((n) => typeof n.props?.testID === "string");
    expect(caches.length).toBeGreaterThan(0);
    expect(nommes).toHaveLength(boites.length);
    expect(nommes.filter((n) => n.props?.display !== undefined)).toEqual([]);
  });

  // L1-T17 (item 29): Android reads the clip rule on the node wearing the clip (VirtualView
  // .getClipPath, `mClipRule`), never on the paths inside the ClipPath, and defaults to evenodd
  // (0). Set on the inner path, the shadows' parts cancelled where they overlap and showed as rings.
  test("every clipped group is nonzero, so the shadows' parts unite into their shape", async () => {
    await ouvrir();
    const svg = noeuds(screen.toJSON() as Noeud).filter((n) => n.type?.startsWith("RNSVG"));
    const clippes = svg.filter((n) => n.props?.clipPath != null);
    // The tiles and the 2 veils (the bridge and the cascade; T22: the stream is in the tiles).
    expect(clippes.length).toBeGreaterThanOrEqual(4);
    expect(clippes.map((n) => [n.type, n.props?.clipRule])).toEqual(
      clippes.map(() => ["RNSVGGroup", 1]),
    );
  });

  test("+ and - zoom about the centre, Cadrer frames the island again", async () => {
    await ouvrir();
    await fireEvent(screen.getByTestId("iso-aire"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: AIRE.w, height: AIRE.h } },
    });
    const ile = cadrage(etatCarte(12, false).visible, AIRE.w, AIRE.h);
    await waitFor(() => expect(camera().zoom).toBeCloseTo(ile.zoom));

    await fireEvent.press(screen.getByTestId("iso-zoom-plus"));
    await waitFor(() => expect(camera().zoom).toBeCloseTo(ile.zoom * CRAN));
    await fireEvent.press(screen.getByTestId("iso-zoom-moins"));
    await fireEvent.press(screen.getByTestId("iso-zoom-moins"));
    await waitFor(() => expect(camera().zoom).toBeCloseTo(ile.zoom / CRAN));

    await fireEvent.press(screen.getByTestId("iso-palier-1"));
    const hameau = cadrage(etatCarte(1, false).visible, AIRE.w, AIRE.h);
    await waitFor(() => expect(camera()).toEqual(hameau));
    await fireEvent.press(screen.getByTestId("iso-zoom-plus"));
    await waitFor(() => expect(camera()).toEqual(zoomer(hameau, CRAN)));
    await fireEvent.press(screen.getByTestId("iso-zoom-cadrer"));
    await waitFor(() => expect(camera()).toEqual(hameau));
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  // L3-T06 (tour 3): the buttons drive the same camera and context as the village tab, so qa can
  // reach the levels of detail without a pinch. Tier 12 on this area: 5 presses of + pass zoom 1.0,
  // 9 pass 1.75 plus its hysteresis (level 3).
  test("+ reaches the levels of detail: a sprite gets a decode size past zoom 1.75", async () => {
    const actif = { uri: "res:/1", width: 1344, height: 1344, scale: 1 };
    const resoudre = jest.spyOn(Image, "resolveAssetSource").mockReturnValue(actif);
    try {
      await ouvrir();
      await fireEvent(screen.getByTestId("iso-aire"), "layout", {
        nativeEvent: { layout: { x: 0, y: 0, width: AIRE.w, height: AIRE.h } },
      });
      const tailles = () =>
        screen
          .queryAllByTestId(/^iso-maquette-/)
          .map((v) => (v.props.source as { width?: number }[] | undefined)?.[0]?.width);
      const niveaux = () =>
        screen
          .queryAllByTestId(/^iso-maquette-/)
          .map((v) => (v.props.svgVariables as Record<string, string> | undefined)?.["--detail"]);
      expect(tailles().every((w) => typeof w === "number")).toBe(true);
      for (let i = 0; i < 9; i++) await fireEvent.press(screen.getByTestId("iso-zoom-plus"));
      // Every source carries a decode size and the level that makes expo-image load again.
      await waitFor(() => expect([...new Set(niveaux())].sort()).toEqual(["1", "3"]));
      expect(niveaux().every((n) => n !== undefined)).toBe(true);
    } finally {
      resoudre.mockRestore();
    }
  });

  test("offers the village tab in iso mode without touching the production flag", async () => {
    await ouvrir();
    expect(screen.getByTestId("iso-mode-village")).toBeTruthy();
    expect(INTEGRATION).toBe(false);
  });

  // L1-T19 (item 14): qa frames the village square at the game's zoom 0.6 without a pinch.
  test("the 0,6 button puts the camera at game zoom 0.6, centred on the village square", async () => {
    await ouvrir();
    await fireEvent.press(screen.getByTestId("iso-zoom-06"));
    const [px, py] = ecranXY(PLACE);
    await waitFor(() =>
      expect(camera()).toEqual({
        zoom: (0.6 * spec.cellDp) / COTE,
        x: ((0.6 * spec.cellDp) / COTE) * (LARGEUR / 2 - px),
        y: ((0.6 * spec.cellDp) / COTE) * (HAUTEUR / 2 - py),
      }),
    );
    expect(camera().zoom).toBeCloseTo(1.6);
  });

  // qa L5-T04: the map alone has a camera, and a touch of it starts a wave as in the village tab.
  // Renders the whole demo map through two waves: past jest's 5 s default when the full suite loads the machine.
  test("a touch of the map alone starts a wave once the clock rests, none while it runs", async () => {
    jest.useFakeTimers();
    try {
      jest.mocked(planifierVague).mockClear();
      await ouvrir();
      const plans = () => jest.mocked(planifierVague).mock.calls.length;
      await waitFor(() => expect(plans()).toBe(1));
      const pan = createGestureController(getByGestureTestId("iso-geste-pan"));
      await act(() => {
        pan.begin();
        pan.end();
        jest.advanceTimersByTime(100);
      });
      expect(plans()).toBe(1);
      await act(() => jest.advanceTimersByTime(25000));
      await act(() => {
        pan.begin();
        pan.end();
        jest.advanceTimersByTime(100);
      });
      await waitFor(() => expect(plans()).toBe(2));
    } finally {
      jest.useRealTimers();
    }
  }, 15_000);

  // T16: bati://dev-iso?fige=1 is how Maestro opens the map: no wave, at focus or on a touch.
  test("?fige=1 freezes the map: the clock never starts a wave", async () => {
    jest.useFakeTimers();
    mockParams = { fige: "1" };
    try {
      jest.mocked(planifierVague).mockClear();
      await ouvrir();
      await act(() => jest.advanceTimersByTime(1000));
      const pan = createGestureController(getByGestureTestId("iso-geste-pan"));
      await act(() => {
        pan.begin();
        pan.end();
        jest.advanceTimersByTime(5000);
      });
      expect(jest.mocked(planifierVague)).not.toHaveBeenCalled();
    } finally {
      mockParams = {};
      jest.useRealTimers();
    }
  }, 15_000);

  // T22: the stream is drawn in the ground tiles, so a water cell costs no Image node and no veil
  // Svg any more (18 of each at tier 12 before: 122 images, now 104). The counts are a ratchet: a new image per cell shows here.
  test("the map's image and pattern nodes at tiers 1 and 12 (T22: none per stream cell)", async () => {
    // The villagers' day is drawn from the calendar day (useMarcheurs), so the counts below move
    // with it: pin the clock to the day they were measured on.
    const now = jest.spyOn(Date, "now").mockReturnValue(new Date(2026, 10, 3, 12, 0).getTime());
    await ouvrir();
    // Svg roots also count the world's, which follow the layout: the veils are checked by testID below.
    const compte = () =>
      noeuds(screen.toJSON() as Noeud).filter((n) => n.props?.contentFit !== undefined).length;
    const vus: Record<number, number> = {};
    const motifs: Record<number, unknown> = {};
    for (const p of [1, 12] as const) {
      await fireEvent.press(screen.getByTestId(`iso-palier-${p}`));
      vus[p] = compte();
      const tout = noeuds(screen.toJSON() as Noeud);
      motifs[p] = {
        patterns: tout.filter((n) => n.type === "RNSVGPattern").length,
        images: tout.filter((n) => n.type === "RNSVGImage").length,
      };
      // A tile declares each texture it draws once, and only those (one svg Image per Pattern).
      for (const svg of tout.filter((n) => n.type === "RNSVGSvgView")) {
        const ids = noeuds(svg.children ?? null)
          .filter((n) => n.type === "RNSVGPattern")
          .map((n) => String(n.props?.name));
        expect([p, ids.length]).toEqual([p, new Set(ids).size]);
      }
    }
    // T22 textures: one Pattern and one svg Image per motif a ground tile draws (AUDIT-DA 7: palier 1 lost the tent's footpath, two patterns fewer; T38: none for the paving, its joints are vectors).
    expect(motifs).toEqual({
      1: { patterns: 2, images: 2 },
      12: { patterns: 4, images: 4 },
    });
    // Before T22 each shown stream cell added one Image and one veil Svg.
    const tracees = (p: 1 | 12) =>
      PIECES.filter((pc) => eauTracee(pc.cle) && pieceMontree(pc, etatCarte(p, false).visible))
        .length;
    expect([tracees(1), tracees(12)]).toEqual([0, 18]);
    // AUDIT-DA 20: one extra darkening image per big rock (1 at palier 1, 6 at palier 12).
    // T26: one image per inhabitant (31/10: the flat wash under the sprite is gone, the sprite is whole).
    // FIN-DIS: the tier-1 island holds the hall's socle and the square, so more of its edge and more
    // inhabitants show (18 to 29); the full map has fewer decor cells in the plan (108 to 94).
    // F4: castle_wall's 22 painted wall pieces, one image a cell, in place of 5 Svgs (94 to 116).
    expect(vus).toEqual({ 1: 26, 12: 109 }); // the old cat (3 pose images) left: 29 and 112 before. // loupe BC r6: the two grid rocks are gone (116 to 112, each was a piece image and its ink-darkened twin); T43 round 1: thickets, 156 lisiere pieces became about 70; C1: the forge dispute is one image for two inhabitants
    expect(screen.queryAllByTestId(/^iso-voile-/)).toHaveLength(2);
    now.mockRestore();
  });

  // L1-T19 (item 14): three villagers stand on the square, at every tier, drawn over the path at
  // their pxScale. L5-T04: a role whose building stands is a walker (marcheurs.ts), not a figurine.
  test("three villagers are on the map at every tier, each posed by its anchor", async () => {
    await ouvrir();
    for (const p of [1, 6, 12] as const) {
      await fireEvent.press(screen.getByTestId(`iso-palier-${p}`));
      const figurines = screen.queryAllByTestId(/^iso-figurine-/);
      const marcheurs = screen.queryAllByTestId(/^iso-marcheur-(smith|farmer|herbalist)$/);
      expect([p, figurines.length + marcheurs.length]).toEqual([p, 4]); // T39: + the lantern
      expect(figurines.map((v) => v.props.contentFit)).toEqual(figurines.map(() => "contain"));
    }
    await fireEvent.press(screen.getByTestId("iso-palier-1"));
    const f = FIGURINES[0];
    assert(f);
    const s = MAQUETTES[f.cle];
    assert(s);
    const r = poseCentre(f.case, s);
    expect(
      StyleSheet.flatten(screen.getByTestId(`iso-figurine-${f.case.join("-")}`).props.style),
    ).toMatchObject({ left: r.x, top: r.y, width: r.w, height: r.h });
  });

  // L1-T07: blender's mock-ups on the map, each at its demo stage, posed by its anchor.
  test("at every tier, each shown building with an image at its stage is posed, the rest are plots", async () => {
    await ouvrir();
    for (const p of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const) {
      await fireEvent.press(screen.getByTestId(`iso-palier-${p}`));
      const { montres } = etatCarte(p, false);
      const attendues = montres.filter((c) => spriteDe(c, stadeDemo(c, p)));
      expect([p, images().toSorted()]).toEqual([p, attendues.toSorted()]);
      expect([p, affiches().toSorted()]).toEqual([
        p,
        montres.map((c) => `iso-batiment-${c}`).toSorted(),
      ]);
      const ailes = screen.queryAllByTestId("iso-ailes-windmill");
      expect([p, ailes.length]).toEqual([p, attendues.includes("windmill") ? 1 : 0]);
      // The decor rule (DECISIONS 28/10) as the screen applies it, and the tree at (1,5): its cell
      // joins at tier 10, the ground under its shadow only at 11 (L1-T07 tour 4, important 2).
      const { visible } = etatCarte(p, false);
      expect([p, piecesVues()]).toEqual([
        p,
        PIECES.filter((pc) => pieceMontree(pc, visible) && !eauTracee(pc.cle))
          .map((pc) => pc.case.join("-"))
          .toSorted(),
      ]);
      expect([p, piecesVues().includes("1-5")]).toEqual([p, p >= 11]);
      // Every shown piece's shadow is in the ground's clip: that of the tiles it reaches.
      const decoupe = carte().map(clipDe).join("");
      const manquantes = PIECES.filter((pc) => pieceMontree(pc, visible))
        .flatMap(ombresPiece)
        .filter((o) => !decoupe.includes(cheminSvg(o)));
      expect([p, manquantes]).toEqual([p, []]);
    }
    // Tier 12: all 21 buildings are images, no vector box is left.
    expect(images().toSorted()).toEqual([...buildingCodes].toSorted());
    expect(screen.queryAllByTestId(/^iso-batiment-/)).toEqual([]);
    // `contain` makes expo-image decode at the view's size; `fill` decodes the whole file (L1-T07).
    // And every decor and water piece of the grid, with the cascade's falling sheet (L1-T07 tour 4).
    const pieces = screen.queryAllByTestId(/^iso-piece-/);
    expect(pieces.map((v) => v.props.testID).toSorted()).toEqual(
      PIECES.filter((p) => !eauTracee(p.cle))
        .map((p) => `iso-piece-${p.case.join("-")}`)
        .toSorted(),
    );
    const chutes = screen.queryAllByTestId(/^iso-chute-/);
    expect(chutes).toHaveLength(1);
    const vues = [
      ...screen.queryAllByTestId(/^iso-maquette-/),
      screen.getByTestId("iso-ailes-windmill"),
      ...pieces,
      ...chutes,
    ];
    expect(vues.map((v) => v.props.contentFit)).toEqual(vues.map(() => "contain"));
    expect(vues.map((v) => v.props.cachePolicy)).toEqual(vues.map(() => "disk"));
    const s = spriteDe("forge", stadeDemo("forge", 12));
    assert(s);
    const r = pose("forge", s);
    expect(StyleSheet.flatten(screen.getByTestId("iso-maquette-forge").props.style)).toMatchObject({
      position: "absolute",
      left: r.x,
      top: r.y,
      width: r.w,
      height: r.h,
    });
  });

  // L1-T16: given a require, expo-image sends the asset's width and height along, and Glide takes
  // them as `override` over the view's size (SourceMap.kt): `contain` then decoded every file
  // whole, 124 MB of Native Heap at tier 12 (qa, L1-T09). The uri alone lets Glide measure the view.
  // This checks the contract SourceMap.kt:147 reads (an override only when width and height are
  // both non-zero), not the whole chain: expo-image captures `Image.resolveAssetSource` when it
  // loads, so the spy below does not reach it, and without the fix the test fails only because the
  // jest stub of a require is an object, not `[{ uri }]`.
  test("every image is given its uri and a decode size from the camera level (L4-T03, was uri alone)", async () => {
    const actif = { uri: "res:/1", width: 1344, height: 1344, scale: 1 };
    const resoudre = jest.spyOn(Image, "resolveAssetSource").mockReturnValue(actif);
    try {
      await ouvrir();
      const vues = screen.queryAllByTestId(/^iso-(maquette|ailes|piece|chute|figurine)-/);
      expect(vues.length).toBeGreaterThan(38); // 39 since loupe BC r6 removed the two grid rocks (41 before)
      expect(vues.map((v) => v.props.source[0].uri)).toEqual(vues.map(() => actif.uri));
    } finally {
      resoudre.mockRestore();
    }
  });

  // L1-T07 tour 4, important 1: a canal image is opaque, so the ground's shadow tones under it
  // never show; the wizard's tower (4,13) cast its shadow up to the canal's edge and stopped dead.
  // L1-T17: the veil took the ground's whole clip, which holds each canal piece's own shadow (its
  // water surface, covering the cell), so it darkened every water cell, and evenodd cleared the
  // overlap with the tower's (qa, L1-T09). A veil holds the building and decor shadows reaching
  // its cell, nothing else.
  test("the map alone has the world around the island, the forest in map space, no sky (L6-T17, T23)", async () => {
    await ouvrir();
    await fireEvent(screen.getByTestId("iso-aire"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: AIRE.w, height: AIRE.h } },
    });
    expect(screen.queryAllByTestId(/^iso-ciel-|^iso-monde-montagnes/)).toHaveLength(0);
    expect(screen.getAllByTestId("iso-monde-nuit")).toHaveLength(1);
    expect(screen.getAllByTestId("iso-monde-fond")).toHaveLength(1);
    // L6-T17: the forest is tiles of art in map space, no sea (FIN-CAR).
    expect(screen.getAllByTestId("iso-monde-foret").length).toBeGreaterThan(40);
    // FIN-CAR: the sea is gone, at the whole island and at a hamlet alike.
    expect(screen.queryAllByTestId(/^iso-monde-(rive|mer)/)).toHaveLength(0);
    await fireEvent.press(screen.getByTestId("iso-palier-1"));
    expect(screen.queryAllByTestId(/^iso-monde-(rive|mer)/)).toHaveLength(0);
  });

  // T22: the stream cells show no image, so the layers' order against them is iso-reflets-couverts'.
  test("the glints (5 layers, one per band of the canal) ride the stream; none on the bridge or the cell before it", async () => {
    await ouvrir();
    const ids = carte().map((n) => String(n.props?.testID));
    const couches = ids.filter((id) => id.startsWith("iso-reflets-"));
    expect(couches).toHaveLength(5);
    expect(ids.filter((id) => /^iso-piece-2-([0-9]|1[0-8])$/.test(id))).toEqual(["iso-piece-2-10"]);
    // A glint sits near the stream's centre line (off it by its own hash, round 3), not on its cell's.
    const { dx, dy, long } = traitReflet([2, 11]);
    const [gx, gy] = centreEau([2, 11]);
    const [x, y] = ecranXY([gx + dx, gy + dy]);
    expect(StyleSheet.flatten(screen.getByTestId("iso-reflet-2-11").props.style)).toMatchObject({
      left: x - REFLET_LONG * long,
      top: y - 1,
    });
    // The canal runs along gy and a bridge crosses it at gy 10: no glint on it, nor right before it.
    expect(ids).toContain("iso-piece-2-10");
    expect(screen.queryByTestId("iso-reflet-2-10")).toBeNull();
    expect(screen.queryByTestId("iso-reflet-2-9")).toBeNull();
    expect(screen.queryByTestId("iso-reflet-2-11")).not.toBeNull();
  });

  // T22: the stream is drawn by the ground tiles, so the tree's shadow on it is in the tiles' clip
  // (drawn over the stream there); only the bridge and the cascade, still images, keep a veil.
  test("the stream takes the decor shadows in the ground's clip; the bridge and the cascade keep their veils", async () => {
    await ouvrir();
    // On the L1-T24 plan the canal is on gx 2, west of every building, and the moon throws shadows
    // toward +gx: no building shadow reaches it. The tree at (1,5) does, onto (2,4) and (2,5).
    const arbre = PIECES.find((pc) => pc.case.join(",") === "1,5");
    assert(arbre?.decor);
    const ombreArbre = ombresPiece(arbre);
    expect(casesSousOmbre(ombreArbre).map((c) => c.join("-"))).toContain("2-5");
    const enfants = carte();
    const ids = enfants.map((n) => n.props?.testID);
    const decoupe = clipDe(enfants[0]);
    for (const o of ombreArbre) expect(decoupe).toContain(cheminSvg(o));
    // A stream cell casts no shadow of its own: it would darken the stream in the clip.
    const eaux = PIECES.filter((pc) => !pc.decor);
    expect(eaux.filter((pc) => eauTracee(pc.cle)).flatMap(ombresPiece)).toEqual([]);
    const peintes = eaux.filter((pc) => !eauTracee(pc.cle)).map((pc) => pc.case.join("-"));
    expect(peintes.toSorted()).toEqual(["2-10", "2-19"]);
    for (const id of peintes) {
      const i = ids.indexOf(`iso-voile-${id}`);
      expect([id, i > 0 && i === ids.indexOf(`iso-piece-${id}`) + 1]).toEqual([id, true]);
    }
    expect(
      ids
        .filter((t): t is string => typeof t === "string" && t.startsWith("iso-voile-"))
        .toSorted(),
    ).toEqual(peintes.map((id) => `iso-voile-${id}`).toSorted());
  });

  // The building path of the veil, which the plan no longer reaches (see above): a building's
  // shadow over any cell is that cell's veil, whatever the map holds there.
  test("a building's shadow over a cell is that cell's veil", () => {
    const ombre = ombresDe("wizard_tower", stadeDemo("wizard_tower", 12))[0];
    assert(ombre);
    const c = casesSousOmbre([ombre])[0];
    assert(c);
    expect(voileDe(c, [ombre])).toBe(cheminSvg(ombre));
    expect(voileDe([c[0] + 40, c[1]], [ombre])).toBe("");
  });

  test("every building standing brings its plot even at tier 1", async () => {
    await ouvrir();
    await fireEvent.press(screen.getByTestId("iso-palier-1"));
    await fireEvent.press(screen.getByTestId("iso-tous-debout"));
    expect(affiches()).toHaveLength(21);
  });
});

describe("constants/isoPoc.ts, who may open the demo", () => {
  // __DEV__ is declared as a const for the app; the test flips the global it reads.
  const g = globalThis as typeof globalThis & { __DEV__: boolean };
  const ouvert = (uri: string, dev: boolean): boolean => {
    let valeur = false;
    jest.isolateModules(() => {
      jest.doMock("expo-file-system", () => ({ Paths: { document: { uri } } }));
      const avant = g.__DEV__;
      g.__DEV__ = dev;
      valeur = require("@/constants/isoPoc").ISO_POC;
      g.__DEV__ = avant;
    });
    return valeur;
  };

  test("the .perf release build opens it, a published build does not", () => {
    expect(ouvert("file:///data/user/0/com.guiforge.bati.perf/files/", false)).toBe(true);
    expect(ouvert("file:///data/user/0/com.guiforge.bati/files/", false)).toBe(false);
    expect(ouvert("file:///data/user/10/com.guiforge.bati.perf/files/", false)).toBe(true);
    expect(ouvert("file:///data/user/0/com.guiforge.bati/files/", true)).toBe(true);
  });
});

describe("the demo camera (L0-T14)", () => {
  const ile12 = etatCarte(12, false).visible;

  /** Where each visible cell's corners land in the area: the map is centred in it, scaled about its own centre, then shifted. */
  function dansAire(visible: boolean[][], v: Vue) {
    const pts = visible.flatMap((ligne, gy) =>
      ligne.flatMap((vu, gx) =>
        vu
          ? (
              [
                [gx, gy],
                [gx + 1, gy],
                [gx + 1, gy + 1],
                [gx, gy + 1],
              ] as const
            ).map((c) => {
              const [x, y] = ecranXY(c);
              return [
                AIRE.w / 2 + v.x + v.zoom * (x - LARGEUR / 2),
                AIRE.h / 2 + v.y + v.zoom * (y - HAUTEUR / 2),
              ] as const;
            })
          : [],
      ),
    );
    const xs = pts.map(([x]) => x);
    const ys = pts.map(([, y]) => y);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }

  test("framing the whole island centres it and fits its width on a phone", () => {
    const v = cadrageComplet(ile12, AIRE.w, AIRE.h);
    const b = dansAire(ile12, v);
    expect(b.x0).toBeCloseTo(AIRE.w - b.x1);
    expect(b.y0).toBeCloseTo(AIRE.h - b.y1);
    expect(b.x1 - b.x0).toBeCloseTo(AIRE.w * MARGE_CADRAGE);
    expect(b.y1 - b.y0).toBeLessThan(AIRE.h);
  });

  test.each([
    ["dev-iso", 390, 600],
    ["village tab, portrait", 390, 644],
    ["village tab, wide phone", 412, 760],
  ])("the whole island fits the visible area (%s, audit DA exit 22)", (_, w, h) => {
    const v = cadrageComplet(ile12, w, h);
    const xs = ile12.flatMap((l, gy) =>
      l.flatMap((vu, gx) => (vu ? [ecranXY([gx, gy])[0], ecranXY([gx + 1, gy + 1])[0]] : [])),
    );
    const ax = (x: number) => w / 2 + v.x + v.zoom * (x - LARGEUR / 2);
    expect(ax(Math.min(...xs))).toBeGreaterThanOrEqual(-0.01);
    expect(ax(Math.max(...xs))).toBeLessThanOrEqual(w + 0.01);
  });

  test("framing the tier-1 hamlet zooms in and puts it in the middle of the area", () => {
    const visible = etatCarte(1, false).visible;
    const v = cadrageComplet(visible, AIRE.w, AIRE.h);
    expect(v.zoom).toBeGreaterThan(cadrageComplet(ile12, AIRE.w, AIRE.h).zoom);
    const b = dansAire(visible, v);
    expect(b.x0).toBeCloseTo(AIRE.w - b.x1);
    expect(b.y0).toBeCloseTo(AIRE.h - b.y1);
    // The box may pass the area by a little: only the diamond's tips do (audit DA lot 3, tighter start; measured -0.04)
    expect(Math.min(b.x0, b.y0)).toBeGreaterThan(-0.041 * AIRE.w);
  });

  test("the buttons zoom about the area's centre, within the bounds", () => {
    const v = zoomer({ zoom: 1, x: 40, y: -20 }, CRAN);
    expect(v).toEqual({ zoom: CRAN, x: 40 * CRAN, y: -20 * CRAN });
    expect(zoomer({ zoom: ZOOM_MAX * 0.9, x: 10, y: 0 }, 2).zoom).toBe(ZOOM_MAX);
    expect(zoomer({ zoom: ZOOM_MIN * 1.1, x: 10, y: 0 }, 0.5).zoom).toBe(ZOOM_MIN);
    expect(zoomer(zoomer({ zoom: 1, x: 10, y: 10 }, 2), 0.5)).toEqual({ zoom: 1, x: 10, y: 10 });
  });

  // qa saw a 1 px seam between two tiles once zoomed (L0-T15): edges that only touch each fade
  // against nothing. Each tile reaches 1 dp into the next, and stays a bitmap of 1024 px at most.
  test.each([1, 2, 2.625, 3, 3.5])(
    "at %s px per dp, tiles cover the map, overlap by 1 dp, and stay under 1024 px",
    (ratio) => {
      const rects = tuiles(ratio);
      for (const r of rects) {
        expect([r, r.w * ratio <= 1024, r.h * ratio <= 1024]).toEqual([r, true, true]);
        expect([r, r.w > 1, r.h > 1]).toEqual([r, true, true]);
      }
      for (const [debut, taille, fin] of [
        ["x", "w", LARGEUR],
        ["y", "h", HAUTEUR],
      ] as const) {
        const starts = [...new Set(rects.map((r) => r[debut]))].toSorted((a, b) => a - b);
        expect(starts[0]).toBe(0);
        starts.forEach((s, i) => {
          const bout = Math.max(...rects.filter((r) => r[debut] === s).map((r) => s + r[taille]));
          // The bottom row reaches up to 12 dp past the map (AUDIT-DA 17: the island's bank hangs there).
          const attendu = Math.min(fin, (starts[i + 1] ?? fin - 1) + 1);
          const dernierBas = debut === "y" && i === starts.length - 1;
          expect([debut, s, bout >= attendu && bout <= attendu + (dernierBas ? 36 : 0)]).toEqual([
            debut,
            s,
            true,
          ]);
        });
      }
    },
  );

  test("the game's closest zoom is isoSpec.json's, a cell of cellDp", () => {
    expect(ZOOM_MAX * COTE).toBe(spec.zoom.max * spec.cellDp);
  });

  // L1-T16 review, minor 2: a villager's canvas is drawn at pxScale 2, so its 768 px sheet covers
  // one cell on the map, not two.
  test("a canvas drawn at pxScale 2 is posed at half size", () => {
    const s = MAQUETTES["villageois/champion_face.nuit.webp"];
    assert(s);
    expect([s.pxScale, s.size[0]]).toEqual([2, 768]);
    expect(posePiece([3, 3], s).w).toBe(COTE);
    const bati = spriteDe("forge", "solid");
    assert(bati);
    expect(posePiece([3, 3], bati).w).toBe((bati.size[0] * COTE) / spec.S);
  });
});

describe("app/dev-iso.tsx when the guard is off", () => {
  test("renders a redirect home, nothing else", async () => {
    jest.resetModules();
    jest.doMock("@/constants/isoPoc", () => ({ ISO_POC: false, BLD_PEINTS: {} }));
    const { default: Route } = require("@/app/dev-iso") as typeof import("@/app/dev-iso");
    await render(<Route />);
    expect(mockRedirect).toHaveBeenCalledWith({ href: "/" });
    expect(screen.toJSON()).toBeNull();
  });
});
