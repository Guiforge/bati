import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, cleanup, configure, render, screen } from "@testing-library/react-native";
import { processColor } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Reanimated from "react-native-reanimated";
import Svg from "react-native-svg";
import { AlentoursContext, alentoursDe } from "@/components/village/iso/alentours";
import { etatCarte, stadeDemo } from "@/components/village/iso/carteDemo";
import { champsDe } from "@/components/village/iso/champs";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import { TAILLE } from "@/components/village/iso/isoLayout";
import { flaquesDe, horsCentre, RAIS } from "@/components/village/iso/lueurs";
import { VOILE_MOTIF_NUIT } from "@/components/village/iso/motifs";
import {
  ATTENTE_SOL_MS,
  FONDU_OUVERTURE_MS,
  solCharge,
  TUILES_SOL,
} from "@/components/village/iso/ouverture";
import { Rues } from "@/components/village/iso/RuesDessinees";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";

// RNGH asks react-native-worklets for its UI runtime in a microtask, which the mock refuses.
jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduit }));
let mockReduit = false;
// The village hides its tree from the screen reader (its list is the door), so queries see hidden nodes.
configure({ defaultIncludeHiddenElements: true });

type Noeud = { type: string; props: Record<string, unknown>; children: Noeud[] | null };
const noeuds = (n: Noeud | Noeud[] | null): Noeud[] =>
  n === null ? [] : Array.isArray(n) ? n.flatMap(noeuds) : [n, ...noeuds(n.children)];

// Reanimated types `getAnimatedStyle` from its web stub; jest runs the native one.
const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { opacity?: number };

const toutes = new Set(Array.from({ length: TAILLE * TAILLE }, (_, i) => i));
const stade = (code: BuildingCode) => stadeDemo(code, 12);

describe("H4-01: the night has its own streets and fields", () => {
  test("the street textures take the cold night veil, not the warm one", async () => {
    const voile = async (biome: "defaut" | "defautNuit") => {
      const r = await render(
        <Svg>
          <Rues dedans={toutes} visibles={toutes} biome={biome} ombre={false} />
        </Svg>,
      );
      // The rect inside each pattern is the veil: its opacity is the motif's.
      return noeuds(r.toJSON() as Noeud)
        .filter((n) => n.type === "RNSVGRect")
        .map((n) => [JSON.stringify(n.props.fill), n.props.fillOpacity]);
    };
    const nuit = await voile("defautNuit");
    const jour = await voile("defaut");
    expect(nuit).toHaveLength(2);
    expect(nuit.map(([, o]) => o).toSorted()).toEqual(Object.values(VOILE_MOTIF_NUIT).toSorted());
    expect(nuit.every(([f]) => f !== undefined)).toBe(true);
    expect(nuit).not.toEqual(jour);
  });

  test("the night veil is cold and the fields' nights are dark and not violet", () => {
    expect(rawColors.isoRueVoileNuit).toBe("#2E3552");
    for (const k of [
      "isoChampANuit",
      "isoChampBNuit",
      "isoChampOcreNuit",
      "isoHaieNuit",
    ] as const) {
      const h = rawColors[k];
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
      expect(g).toBeGreaterThanOrEqual(Math.min(r ?? 0, b ?? 0));
      expect(Math.max(r ?? 0, g ?? 0, b ?? 0)).toBeLessThan(0x40);
    }
  });

  test("at night no field is drawn in its day green", async () => {
    const { visible, montres } = etatCarte(1, false);
    const vu = (gx: number, gy: number) => visible[gy]?.[gx] === true;
    expect(champsDe(vu).teintes.join("").length).toBeGreaterThan(0);
    const fills = async (lumiere: "jour" | "nuit") => {
      await render(
        <IsoCarte visible={visible} montres={montres} stade={stade} lumiere={lumiere} />,
      );
      const out = JSON.stringify(screen.toJSON());
      await cleanup();
      return out;
    };
    const nuit = await fills("nuit");
    const jour = await fills("jour");
    // A colour is a number once processed: the day's tints and hedge are in the day tree only.
    const a = (hex: string) => String(processColor(hex));
    for (const [j, n] of [
      ["isoChampA", "isoChampANuit"],
      ["isoChampB", "isoChampBNuit"],
      ["isoChampOcre", "isoChampOcreNuit"],
      ["isoHaie", "isoHaieNuit"],
    ] as const) {
      expect([j, nuit.includes(a(rawColors[j]))]).toEqual([j, false]);
      expect([n, nuit.includes(a(rawColors[n]))]).toEqual([n, true]);
      expect([n, jour.includes(a(rawColors[n]))]).toEqual([n, false]);
    }
  });
});

describe("over the painted ground no field stands off the island", () => {
  test("no block, no tint, furrow or hedge, at any tier", () => {
    for (const p of [1, 6, 12] as const) {
      const { visible } = etatCarte(p, false);
      const peint = champsDe((gx, gy) => visible[gy]?.[gx] === true, true);
      expect([peint.nombre, peint.blocs]).toEqual([0, []]);
      expect([peint.teintes.join(""), peint.sillons, peint.sillonsClairs, peint.haies]).toEqual([
        "",
        "",
        "",
        "",
      ]);
    }
  });
});

describe("H4-03: the opening waits for the painted ground", () => {
  const opacite = () => getAnimatedStyle(screen.getByTestId("iso-camera")).opacity;
  const monte = () =>
    render(
      <AlentoursContext.Provider value={alentoursDe("sol")}>
        <GestureHandlerRootView>
          <IsoVillage
            tier={12}
            buildings={[{ code: "campfire", level: 1 }]}
            width={390}
            height={390}
          />
        </GestureHandlerRootView>
      </AlentoursContext.Provider>,
    );
  beforeEach(() => {
    jest.useFakeTimers();
    mockReduit = false;
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test("clear and dark until the twelve tiles have loaded, then one fade", async () => {
    await monte();
    expect(screen.getByTestId("iso-monde-rideau")).toBeTruthy();
    await act(() => jest.advanceTimersByTime(ATTENTE_SOL_MS - 200));
    expect(opacite()).toBe(0);
    await act(() => {
      for (let i = 0; i < TUILES_SOL; i++) solCharge();
    });
    await act(() => jest.advanceTimersByTime(FONDU_OUVERTURE_MS + 50));
    expect(opacite()).toBe(1);
    expect(screen.queryByTestId("iso-monde-rideau")).toBeNull();
  });

  test("never held longer than the ceiling when a tile does not load", async () => {
    await monte();
    await act(() => jest.advanceTimersByTime(ATTENTE_SOL_MS - 100));
    expect(opacite()).toBe(0);
    await act(() => jest.advanceTimersByTime(100 + FONDU_OUVERTURE_MS + 50));
    expect(opacite()).toBe(1);
  });

  test("reduced motion shows it all at once when the ground is there, not before", async () => {
    mockReduit = true;
    await monte();
    expect(opacite()).toBe(0);
    await act(() => jest.advanceTimersByTime(ATTENTE_SOL_MS));
    expect(opacite()).toBe(1);
  });
});

describe("M4-07 and M4-10: the pools sit off the cells, the light comes in slanting bands", () => {
  test("no pool is centred on a cell", () => {
    expect(horsCentre(4, 0)).toBeCloseTo(4.22);
    expect(horsCentre(4, 1)).toBeCloseTo(4.38);
    const { montres } = etatCarte(12, false);
    expect(flaquesDe(montres, stade).length).toBeGreaterThan(3);
  });

  test("by day three soft bands, none by night", async () => {
    const { visible, montres } = etatCarte(12, false);
    await render(<IsoCarte visible={visible} montres={montres} stade={stade} lumiere="jour" />);
    expect(screen.getAllByTestId("iso-rais-jour")).toHaveLength(1);
    expect(RAIS).toHaveLength(3);
    await cleanup();
    await render(<IsoCarte visible={visible} montres={montres} stade={stade} lumiere="nuit" />);
    expect(screen.queryAllByTestId("iso-rais-jour")).toHaveLength(0);
  });
});
