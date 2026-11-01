jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

import { render } from "@testing-library/react-native";
import Svg from "react-native-svg";
import { TAILLE } from "@/components/village/iso/isoLayout";
import { REPETITION, remplissage, TEXTURES, VOILE_OMBRE } from "@/components/village/iso/motifs";
import { Rues } from "@/components/village/iso/RuesDessinees";

type Noeud = { type: string; props: Record<string, unknown>; children: Noeud[] | null };
const noeuds = (n: Noeud | Noeud[] | null): Noeud[] =>
  n === null ? [] : Array.isArray(n) ? n.flatMap(noeuds) : [n, ...noeuds(n.children)];

const toutes = new Set(Array.from({ length: TAILLE * TAILLE }, (_, i) => i));

async function dessin(ombre: boolean, dedans: ReadonlySet<number> = toutes) {
  const r = await render(
    <Svg>
      <Rues dedans={dedans} visibles={toutes} biome="defaut" ombre={ombre} />
    </Svg>,
  );
  return noeuds(r.toJSON() as Noeud);
}

describe("the ground textures (T22)", () => {
  test("the three motifs have their texture, tiled in map units", () => {
    // No paving texture (T38, constat 11): its screen-axis joints drew vertical lines; pave.ts draws the stones.
    expect(Object.keys(TEXTURES).toSorted()).toEqual(["pierres", "terre"]);
    expect(remplissage("terre")).toBe("url(#motif-terre)");
    expect(REPETITION).toEqual({ w: 128, h: 64 });
  });

  test("the lit copy declares each motif it draws once, tiled in map units; the shaded copy declares none", async () => {
    const lit = await dessin(false);
    const patterns = lit.filter((n) => n.type === "RNSVGPattern");
    expect(patterns.map((n) => n.props.name).toSorted()).toEqual(["motif-pierres", "motif-terre"]);
    expect(patterns.map((n) => [n.props.width, n.props.height])).toEqual(
      patterns.map(() => [REPETITION.w, REPETITION.h]),
    );
    expect(lit.filter((n) => n.type === "RNSVGImage")).toHaveLength(2);
    const ombre = await dessin(true);
    expect(ombre.filter((n) => n.type === "RNSVGPattern")).toHaveLength(0);
    // In shade, each textured band takes a veil of its shadow colour: one per layer.
    const voiles = ombre.filter((n) => n.props.fillOpacity === VOILE_OMBRE && n.props.d);
    expect(voiles).toHaveLength(3);
    // A pattern fill only on a band with a shape: the soft edges are flat, an empty path fills nothing.
    for (const copie of [lit, ombre]) {
      const motif = copie.filter((n) => JSON.stringify(n.props.fill ?? null).includes("motif-"));
      expect(motif).toHaveLength(3);
      expect(motif.every((n) => n.props.d)).toBe(true);
    }
  });

  test("a tile with no street declares no texture and fills no empty path", async () => {
    const vide = await dessin(false, new Set());
    expect(vide.filter((n) => n.type === "RNSVGPattern")).toHaveLength(0);
    expect(vide.filter((n) => JSON.stringify(n.props.fill ?? null).includes("motif-"))).toEqual([]);
  });
});
