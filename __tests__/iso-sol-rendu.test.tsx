import "react-native-gesture-handler/jestSetup";
import { render } from "@testing-library/react-native";
import { PixelRatio } from "react-native";
import { etatCarte, stadeDemo, tuiles } from "@/components/village/iso/carteDemo";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import type { VillageTier } from "@/db/village";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

type Noeud = { type?: string; children?: Noeud[] | null };
const tous = (n: Noeud | null | undefined): Noeud[] =>
  n ? [n, ...(n.children ?? []).flatMap(tous)] : [];

const carte = (palier: VillageTier) => {
  const { visible, montres } = etatCarte(palier, true);
  return <IsoCarte visible={visible} montres={montres} stade={(code) => stadeDemo(code, palier)} />;
};

describe("the ground of the map in the tiles' SVG", () => {
  // L0-T14: the ground keeps one tree shape whatever the tier; a tier rewrites `d`, mounts nothing.
  test("the tiles hold the same number of SVG nodes at tier 1 and tier 12", async () => {
    const compte = async (palier: VillageTier) => {
      const r = await render(carte(palier));
      const racine = r.toJSON() as unknown as Noeud;
      const enfants = racine.children ?? [];
      const dalles = enfants.slice(0, tuiles(PixelRatio.get()).length);
      const noeuds = dalles.flatMap(tous).filter((n) => n.type?.startsWith("RNSVG"));
      const par = (t: string) => noeuds.filter((n) => n.type === t).length;
      await r.unmount();
      return [par("RNSVGPath"), par("RNSVGGroup"), par("RNSVGPolygon"), noeuds.length];
    };
    const [un, douze] = [await compte(1), await compte(12)];
    expect(un[0]).toBeGreaterThan(10);
    expect(un).toEqual(douze);
  });

  test("a render of the whole map at tier 12 stays cheap (cost logged for the report)", async () => {
    const temps: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      const r = await render(carte(12));
      temps.push(performance.now() - t0);
      await r.unmount();
    }
    const tri = temps.toSorted((a, b) => a - b);
    process.stdout.write(
      `iso-sol-rendu tier 12, median ${tri[2]?.toFixed(0)} ms, runs ${temps.map((t) => t.toFixed(0)).join(" ")}\n`,
    );
    expect(tri[2]).toBeLessThan(5000);
  });
});
