// LIFE C3 to C7: the painted creatures (mice, the wall's cat, roof birds; the lair's dragon is the painted one, motion/dragon_lair.json).
// The pure rules (where they may live, what a timeline does on a cycle boundary), then the map.
import "@/i18n";
import assert from "node:assert/strict";
import { configure, render, screen } from "@testing-library/react-native";
import * as Reanimated from "react-native-reanimated";
import { COTE, etatCarte, LARGEUR, stadeDemo } from "@/components/village/iso/carteDemo";
import {
  CODES_A_PERCHOIR,
  CYCLES_VISITE,
  HAUTEUR_VILLAGEOIS,
  marche,
  PART_CHAT,
  PART_SOURIS,
  perchoirDe,
  stations,
  TAILLES,
  tronconDuChat,
  visite,
} from "@/components/village/iso/creatures";
import { RangsBldContext } from "@/components/village/iso/etatBld";
import { CYCLE_MS, HorlogeContext } from "@/components/village/iso/horloge";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import { emplacements, ileVisible, toits } from "@/components/village/iso/isoLayout";
import { farm } from "@/components/village/iso/peints/farm";
import { forge } from "@/components/village/iso/peints/forge";
import { RevelationContext } from "@/components/village/iso/revelation";
import { opaque } from "@/components/village/iso/tapBatiment";
import { type BuildingCode, buildingCodes } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/constants/isoPoc", () => ({
  ...jest.requireActual("@/constants/isoPoc"),
  BATIMENT_MOTEUR: true,
}));
let mockReduit = false;
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduit }));

configure({ defaultIncludeHiddenElements: true });

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { opacity?: number; transform?: Record<string, number>[] };

const tout = ileVisible(12, buildingCodes);
const sans = (...codes: BuildingCode[]) => buildingCodes.filter((c) => !codes.includes(c));
const JOURS = Array.from({ length: 12 }, (_, i) => 20_000 + i);

describe("the roof points", () => {
  test("only the farm and the forge have a bird, at the stages with a point", () => {
    expect([...CODES_A_PERCHOIR].sort()).toEqual(["farm", "forge"]);
    expect(perchoirDe("farm", "rough")).toBeNull();
    expect(perchoirDe("tent", "solid")).toBeNull();
    for (const cle of toits.keys()) {
      const [code, stade] = cle.split(/_(?=[^_]+$)/);
      expect([cle, perchoirDe(code as BuildingCode, stade as "solid" | "grand")]).toEqual([
        cle,
        [expect.any(Number), expect.any(Number)],
      ]);
    }
  });

  // The painted sprites themselves (BLD_PEINTS is off under jest, so `spriteDe` would give the
  // mock-up's mask): the points were read on them, and a repaint moves the roof.
  test("each point sits on its painted sprite's mask, on the roof's top edge (nothing opaque just above)", () => {
    const peints = { farm: farm.stades, forge: forge.stades } as const;
    for (const [cle, p] of toits) {
      const [code, stade] = cle.split(/_(?=[^_]+$)/) as ["farm" | "forge", "solid" | "grand"];
      const s = peints[code][stade]?.jour;
      assert(s?.masque, cle);
      expect([cle, opaque(s.masque, p[0], p[1])]).toEqual([cle, true]);
      const dessus = [1, 2, 3].map((k) => opaque(s.masque as never, p[0], p[1] - 8 * k));
      expect([cle, dessus.includes(false)]).toEqual([cle, true]);
    }
  });
});

describe("their size, by ratio to a villager", () => {
  // The share of a frame's height the animal fills, read off the strips (alpha above 40).
  test("a mouse stands about 37 % of a villager, the cat 60 %", () => {
    expect((TAILLES.souris.h * (88 / 109)) / HAUTEUR_VILLAGEOIS).toBeCloseTo(PART_SOURIS, 1);
    expect((TAILLES.chat.h * (117 / 128)) / HAUTEUR_VILLAGEOIS).toBeCloseTo(PART_CHAT, 1);
    expect(PART_SOURIS).toBeGreaterThanOrEqual(0.35);
    expect(PART_SOURIS).toBeLessThanOrEqual(0.4);
  });
});

describe("where they live", () => {
  test("no mouse without the barn or the farm; the farm's west side needs the farm itself", () => {
    for (const jour of JOURS) {
      expect(stations(tout, sans("barn", "farm"), jour)).toEqual([]);
      const grange = stations(tout, sans("farm"), jour);
      expect(grange.map((s) => s.id)).toEqual(["ferme-nord"]);
      expect(stations(tout, sans("barn"), jour).map((s) => s.id)).toEqual([
        "ferme-nord",
        "ferme-ouest",
      ]);
    }
  });

  test("a mouse is mounted whatever the day (the node count never moves), and the day only says whether it is out", () => {
    const vus = JOURS.flatMap((j) => stations(tout, buildingCodes, j).map((s) => s.present));
    expect(vus.every((p) => p === true || p === false)).toBe(true);
    expect(vus).toContain(true);
    expect(vus).toContain(false);
    for (const j of JOURS) expect(stations(tout, buildingCodes, j)).toHaveLength(2);
  });

  test("nothing stands on a building's footprint, and every waypoint is inside its own footprint", () => {
    const sous = new Set(
      buildingCodes.flatMap((c) => emplacements[c].cases.map(([x, y]) => `${x},${y}`)),
    );
    for (const s of stations(tout, buildingCodes, 20_000)) {
      for (let i = 0; i < s.e.emprise[0]; i++)
        for (let j = 0; j < s.e.emprise[1]; j++)
          expect([s.id, sous.has(`${s.e.coin[0] + i},${s.e.coin[1] + j}`)]).toEqual([s.id, false]);
      for (const [x, y] of s.pts) {
        const gx = (x - LARGEUR / 2) / COTE + (y * 2) / COTE;
        const gy = (y * 2) / COTE - (x - LARGEUR / 2) / COTE;
        expect(gx).toBeGreaterThanOrEqual(s.e.coin[0]);
        expect(gx).toBeLessThan(s.e.coin[0] + s.e.emprise[0]);
        expect(gy).toBeGreaterThanOrEqual(s.e.coin[1]);
        expect(gy).toBeLessThan(s.e.coin[1] + s.e.emprise[1]);
      }
    }
  });

  test("a station off the island is not mounted", () => {
    const vide = tout.map((r) => r.map(() => false));
    expect(stations(vide, buildingCodes, 20_000)).toEqual([]);
  });

  test("the cat's stretch is one of the wall's, drawn by the day", () => {
    for (const j of JOURS) expect([0, 1, 2]).toContain(tronconDuChat(j, 3));
    expect(tronconDuChat(20_000, 0)).toBe(-1);
  });
});

describe("the timelines", () => {
  const pts = [
    [10, 10],
    [40, 22],
    [70, 34],
  ] as const;

  test("on every cycle boundary a walker stands still on a waypoint in its rest image, so is the clock's rest", () => {
    for (let k = 0; k < 40; k++) {
      const m = marche(k * CYCLE_MS, 20_000, 1, pts);
      expect([k, m.image]).toEqual([k, 2]);
      expect(pts.some(([x, y]) => x === m.x && y === m.y)).toBe(true);
      expect([-1, 1]).toContain(m.sens);
    }
  });

  test("it walks between waypoints in odd cycles only, frames alternating 0 and 1, and mostly rests", () => {
    let marches = 0;
    let pauses = 0;
    let pairesAuRepos = 0;
    for (let k = 0; k < 60; k++)
      for (const u of [0.3, 0.45]) {
        const m = marche((k + u) * CYCLE_MS, 20_000, 1, pts);
        if (m.image === 2) pauses++;
        else marches++;
        pairesAuRepos += k % 2 === 0 && m.image !== 2 ? 1 : 0;
      }
    expect(pairesAuRepos).toBe(0);
    expect(marches).toBeGreaterThan(0);
    expect(pauses).toBeGreaterThan(marches);
  });

  test("a bird is out of sight or sitting on its roof on every boundary, and flies at half the old flock's pace at most (under 135 dp/s, it was 270)", () => {
    const perche = [300, 200] as const;
    for (let k = 0; k < 4 * CYCLES_VISITE * 5; k++) {
      const v = visite(k * CYCLE_MS, 20_000, 1, perche);
      expect([k, v.opacite === 0 || (v.x === 300 && v.y === 200 && v.image === 2)]).toEqual([
        k,
        true,
      ]);
    }
    let vole = 0;
    const vitesses: number[] = [];
    for (let k = 0; k < 4 * CYCLES_VISITE * 8; k++) {
      let avant = visite(k * CYCLE_MS, 20_000, 1, perche);
      for (let t = 100; t <= CYCLE_MS; t += 100) {
        const apres = visite(k * CYCLE_MS + t, 20_000, 1, perche);
        const vitesse = (Math.hypot(apres.x - avant.x, apres.y - avant.y) / 100) * 1000;
        // Off screen between two visits the bird jumps (opacity 0): only what can be seen counts.
        if (avant.opacite > 0 && apres.opacite > 0) vitesses.push(vitesse);
        if (apres.opacite > 0 && (apres.x !== 300 || apres.y !== 200)) vole++;
        avant = apres;
      }
    }
    expect(vole).toBeGreaterThan(0);
    expect(Math.max(...vitesses)).toBeLessThan(135);
  });
});

type Noeud = { props?: Record<string, unknown>; children?: unknown[] | null };
const animes = (n: unknown): number => {
  if (typeof n !== "object" || n === null) return 0;
  const { props, children } = n as Noeud;
  const propre =
    props?.jestAnimatedStyle === undefined && props?.animatedProps === undefined ? 0 : 1;
  return (children ?? []).reduce<number>((a, c) => a + animes(c), propre);
};

// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Hote({
  c = 0,
  lumiere = "nuit",
  mythique = false,
  silence = false,
}: {
  c?: number;
  lumiere?: "jour" | "nuit";
  mythique?: boolean;
  silence?: boolean;
}) {
  const horloge = Reanimated.useSharedValue(c);
  const t = Reanimated.useSharedValue(0);
  const { visible, montres } = etatCarte(12, true);
  return (
    <HorlogeContext.Provider value={horloge}>
      <RevelationContext.Provider
        value={silence ? { t, source: "farm", retards: new Map() } : null}
      >
        <RangsBldContext.Provider
          value={{ rangs: new Map(mythique ? [["dragon_lair", 10]] : []), bases: {} }}
        >
          <IsoCarte
            visible={visible}
            montres={montres}
            stade={(code) => stadeDemo(code, 12)}
            lumiere={lumiere}
          />
        </RangsBldContext.Provider>
      </RevelationContext.Provider>
    </HorlogeContext.Provider>
  );
}

const creatures = () => screen.queryAllByTestId(/^iso-creature-/);
const parIds = (re: RegExp) =>
  screen.queryAllByTestId(re).filter((n) => !String(n.props.testID).endsWith("-bande"));

describe("on the map", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReduit = false;
  });
  afterEach(() => jest.useRealTimers());

  test("night: the two mice stations and the wall's cat, no bird; every one a node and its sheet, never a target", async () => {
    await render(<Hote />);
    expect(parIds(/^iso-creature-souris-/)).toHaveLength(2);
    expect(parIds(/^iso-creature-chat-/)).toHaveLength(1);
    expect(parIds(/^iso-creature-oiseau-/)).toHaveLength(0);
    expect(creatures()).toHaveLength(6);
    expect(animes(screen.toJSON())).toBeGreaterThanOrEqual(6);
    for (const v of creatures()) expect(v.props.pointerEvents ?? "none").toBe("none");
  });

  test("day: the farm's and the forge's birds join (2 nodes each, hidden at rest)", async () => {
    await render(<Hote lumiere="jour" />);
    expect(parIds(/^iso-creature-oiseau-/)).toHaveLength(2);
    for (const v of parIds(/^iso-creature-oiseau-/))
      expect(getAnimatedStyle(v as never).opacity).toBe(0);
  });

  test("the village goes quiet while an upgrade is revealed: no creature at all", async () => {
    await render(<Hote lumiere="jour" mythique silence />);
    expect(creatures()).toHaveLength(0);
  });

  test("reduced motion: still images in their rest pose, no animated node, a bird sits on the roof by day", async () => {
    mockReduit = true;
    await render(<Hote lumiere="jour" mythique />);
    const vus = creatures();
    expect(vus.length).toBeGreaterThan(0);
    for (const v of vus) {
      expect(v.props.jestAnimatedStyle).toBeUndefined();
      expect(v.props.pointerEvents ?? "none").toBe("none");
    }
    expect(screen.queryAllByTestId(/^iso-creature-.*-bande$/)).toHaveLength(0);
  });
});
