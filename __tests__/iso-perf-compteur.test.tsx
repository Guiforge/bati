// PLAN-PERF P0 and P4: what the full map mounts, counted without a device. Rasterising, decoding and
// uploading cost scale with these numbers: every distinct decoded size is its own bitmap and
// texture, every view under 1 opacity its own offscreen layer, every <Svg> its own software bitmap.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { configure, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { type Alentours, AlentoursContext, alentoursDe } from "@/components/village/iso/alentours";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import { buildingCodes } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

configure({ defaultIncludeHiddenElements: true });

// Weight, not a hang: each test mounts the whole map (every building, tier 12); alone it takes seconds, under a parallel full run tens of seconds.
jest.setTimeout(120_000);

type Compte = {
  noeuds: number;
  svg: number;
  formes: number;
  images: number;
  tailles: Set<string>;
  opacite: number;
  parType: Map<string, number>;
};

/** The host tree screen.toJSON() returns, the part of it this count reads. */
type Noeud = { type: string; props: { style?: unknown }; children: (Noeud | string)[] | null };

function parcourir(n: Noeud | string | null, c: Compte) {
  if (n === null || typeof n === "string") return;
  c.noeuds++;
  c.parType.set(n.type, (c.parType.get(n.type) ?? 0) + 1);
  const style = StyleSheet.flatten(n.props.style as never) as Record<string, unknown> | undefined;
  if (/svg/i.test(n.type) && /view$/i.test(n.type)) c.svg++;
  if (/^RNSVG(Path|Ellipse|Polygon|Rect|Circle)$/.test(n.type)) c.formes++;
  if (/image/i.test(n.type)) {
    c.images++;
    c.tailles.add(`${String(style?.width)}x${String(style?.height)}`);
  }
  if (typeof style?.opacity === "number" && style.opacity < 1) c.opacite++;
  for (const e of n.children ?? []) parcourir(e, c);
}

it.each(["nuit", "jour"] as const)(
  "counts what the full map mounts (palier 12, every building, %s)",
  async (lumiere) => {
    // The day seeds the villagers' poses and so the distinct image sizes: pin the worst of 45 measured
    // days (2 Nov 2026, 20 sizes) so the ratchet does not move with the calendar.
    jest.spyOn(Date, "now").mockReturnValue(new Date(2026, 10, 2, 12).getTime());
    const buildings = buildingCodes.map((code) => ({ code, level: 30 }));
    await render(
      <GestureHandlerRootView>
        <IsoVillage tier={12} buildings={buildings} width={411} height={520} lumiere={lumiere} />
      </GestureHandlerRootView>,
    );
    const c: Compte = {
      noeuds: 0,
      svg: 0,
      formes: 0,
      images: 0,
      tailles: new Set(),
      opacite: 0,
      parType: new Map(),
    };
    const json = screen.toJSON() as Noeud | Noeud[] | null;
    for (const n of Array.isArray(json) ? json : [json]) parcourir(n, c);
    const foret = screen.queryAllByTestId("iso-monde-foret");
    const taillesForet = new Set(
      foret.map((f) => {
        const s = StyleSheet.flatten(f.props.style) as { width?: number; height?: number };
        return `${s.width}x${s.height}`;
      }),
    );
    const opaciteForet = foret.filter((f) => {
      const s = StyleSheet.flatten(f.props.style) as { opacity?: number };
      return typeof s.opacity === "number" && s.opacity < 1;
    }).length;
    expect(foret.length).toBeGreaterThan(0);
    // reports/P0-perf-qa.md: these two at 63 were the 61 ms frame; nothing else measured moved it.
    expect(opaciteForet).toBe(0);
    expect(taillesForet.size).toBe(1);
    // Ceilings at the 31/10 count, a ratchet like the coverage thresholds: lower them when the
    // count falls, never raise one to make a build pass without a gfxinfo pass that says it is free.
    expect(c.opacite).toBeLessThanOrEqual(55);
    // 26 since stage 5 of the painted surroundings (Guillaume, 01/11, perf-debt.md): one size per new
    // painted family (ground, forest masses, props, animals, wall sections), each a canvas of its own;
    // a family that needs two sizes is a new decision, not a raise.
    expect(c.tailles.size).toBeLessThanOrEqual(26);
    // Svg ceiling: 100 measured at night (the worst), 89 by day, with the clock pinned above (the count
    // does not read the real hour: IsoVillage takes `lumiere` as a prop, "nuit" by default, and the
    // test passes it). Was 95; raised in iter-02 (perf is not a gate in this loop, see perf-debt.md):
    // A3 added the night's ONE full-map Svg of pools (AmbianceCarte), and the other 99 are the tile,
    // sprite, shadow, window, smoke and animal Svgs of the rest of the map. Not the image-size ratchet.
    // 105 since FIN-DIS (iter-03, perf-debt.md): castle_wall's 22 wall sections, drawn by the app
    // until their sprites are painted, as one static Svg per straight stretch (5), not one per cell.
    // 100 since F4: those 5 Svgs are the painted pieces now, one image a cell.
    expect(c.svg).toBeLessThanOrEqual(100);
    // Nodes: 1042 measured at night (the worst). Was 1024; raised in iter-02 (perf is not a gate in this
    // loop, see perf-debt.md): A3's night pools Svg (~27 nodes) and G1's vocation props (3 Paths on the
    // tiles touching the hall of heroes, none without a crest; not in this count, no crest is passed).
    // 1072 since FIN-DIS (iter-03, perf-debt.md): the 5 wall stretches (an Svg and 4 Paths a layer,
    // a pillar a layer of its own), less what the plan's fewer decor cells took away.
    // 1052 since F4 (the wall's 5 Svgs and their Paths became 22 images).
    expect(c.noeuds).toBeLessThanOrEqual(1052);
  },
);

function compter(): Compte {
  const c: Compte = {
    noeuds: 0,
    svg: 0,
    formes: 0,
    images: 0,
    tailles: new Set(),
    opacite: 0,
    parType: new Map(),
  };
  const json = screen.toJSON() as Noeud | Noeud[] | null;
  for (const n of Array.isArray(json) ? json : [json]) parcourir(n, c);
  return c;
}

/** The distinct view sizes of the views `id` names: one per painted family. */
const famille = (id: string | RegExp) =>
  new Set(
    screen.queryAllByTestId(id).map((f) => {
      const s = StyleSheet.flatten(f.props.style) as { width?: number; height?: number };
      return `${s.width}x${s.height}`;
    }),
  );

it.each(["nuit", "jour"] as const)(
  "the painted surroundings add one image size per family, under the ratchet (%s)",
  async (lumiere) => {
    jest.spyOn(Date, "now").mockReturnValue(new Date(2026, 10, 2, 12).getTime());
    const buildings = buildingCodes.map((code) => ({ code, level: 30 }));
    const village = (peint: Alentours) => (
      <AlentoursContext.Provider value={peint}>
        <GestureHandlerRootView>
          <IsoVillage tier={12} buildings={buildings} width={411} height={520} lumiere={lumiere} />
        </GestureHandlerRootView>
      </AlentoursContext.Provider>
    );
    await render(village(alentoursDe("")));
    const avant = compter();
    await render(village(alentoursDe("tout")));
    const apres = compter();
    expect(famille("iso-foret-peinte").size).toBe(1);
    expect(famille(/^iso-accessoire-/).size).toBe(1);
    // F4: the painted wall (on whatever the flags), one size. Round 6: no plan field is painted any more.
    expect(famille(/^iso-pan-/).size).toBe(1);
    expect(famille(/^iso-champ-/).size).toBe(0);
    expect(screen.getAllByTestId("iso-terrain-peint")).toHaveLength(1);
    // The vector forest tiles are gone.
    expect(screen.queryAllByTestId("iso-monde-foret")).toHaveLength(0);
    // Ground, forest (the foreground shares its canvas), props, the animals' strip: 4 at most. The
    // fields (F4) add none here: 20 to 24 measured with them, by day and by night.
    expect(apres.tailles.size - avant.tailles.size).toBeLessThanOrEqual(4);
    expect(apres.tailles.size).toBeLessThanOrEqual(26);
    // No painted image carries an opacity (PLAN-PERF P0: each one an offscreen layer).
    expect(apres.opacite).toBeLessThanOrEqual(avant.opacite);
  },
);
