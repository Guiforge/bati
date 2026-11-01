// The map's layers: the growth layer's place in the depth order, what each ground tile's shadows
// clip to, the day over them, and the shadows that must go with (or wait for) what casts them.
import "react-native-gesture-handler/jestSetup";
import { render } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { useSharedValue } from "react-native-reanimated";
import {
  cheminSvg,
  etatCarte,
  ORDRE_SPRITES,
  ombreContactDe,
  ombresDans,
  stadeDemo,
  tuiles,
} from "@/components/village/iso/carteDemo";
import { HorlogeContext } from "@/components/village/iso/horloge";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import type { Ambiance } from "@/components/village/iso/isoSpec";
import type { BuildingCode } from "@/db/schema";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock("@/hooks/useGameIcon", () => ({ useGameIcon: () => 1 }));

const { visible, montres } = etatCarte(12, true);
const stade = (code: BuildingCode) => stadeDemo(code, 12);

type Noeud = { props: { testID?: unknown }; children: (Noeud | string)[] | null };
/** Every rendered node whose testID matches, each with its subtree as text. */
function noeuds(arbre: Noeud | Noeud[] | null, motif: RegExp): string[] {
  if (!arbre) return [];
  if (Array.isArray(arbre)) return arbre.flatMap((n) => noeuds(n, motif));
  const ici = motif.test(String(arbre.props.testID ?? "")) ? [JSON.stringify(arbre)] : [];
  const enfants = (arbre.children ?? []).filter((c): c is Noeud => typeof c !== "string");
  return [...ici, ...enfants.flatMap((c) => noeuds(c, motif))];
}

async function carte(p: {
  croissances?: ReadonlyMap<BuildingCode, { cle: string; ancien: null }>;
  lumiere?: Ambiance;
  masques?: ReadonlySet<BuildingCode>;
  chantiers?: ReadonlySet<BuildingCode>;
}) {
  const r = await render(
    <Horloge>
      <IsoCarte visible={visible} montres={montres} stade={stade} {...p} />
    </Horloge>,
  );
  return r.toJSON() as Noeud | Noeud[] | null;
}

/** The clock the village tab provides: without it the animals stand as still images. */
// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Horloge({ children }: { children: ReactNode }) {
  const c = useSharedValue(0);
  return <HorlogeContext.Provider value={c}>{children}</HorlogeContext.Provider>;
}

describe("the growth layer", () => {
  // Laid over the whole map, it hid whatever stood in front of the building while it played.
  test("plays in the building's place in the depth order, before what stands in front", async () => {
    const [code, ...devant] = ORDRE_SPRITES.filter((c) => montres.includes(c));
    expect(code).toBeDefined();
    if (!code) return;
    const t = JSON.stringify(
      await carte({ croissances: new Map([[code, { cle: "g1", ancien: null }]]) }),
    );
    const ici = t.indexOf(`iso-croissance-nouveau-${code}`);
    expect(ici).toBeGreaterThan(t.indexOf(`iso-maquette-${code}`));
    expect(devant.length).toBeGreaterThan(0);
    for (const c of devant) expect(t.indexOf(`iso-maquette-${c}"`)).toBeGreaterThan(ici);
  });
});

describe("a ground tile's shadow clip", () => {
  test("holds only the shadows that reach the tile", () => {
    // One cell's diamond at the grid's top corner, on screen at the map's top centre.
    const ombre = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ] as const;
    const toutes = tuiles(2.625);
    const dans = toutes.filter((r) => ombresDans([ombre], r) !== "");
    expect(dans.length).toBeGreaterThan(0);
    expect(dans.length).toBeLessThan(toutes.length);
    expect(dans.every((r) => r.y === 0)).toBe(true);
  });
});

describe("the shadows on the map", () => {
  // By day the lit ground takes the wash before the shadows, which then take a weaker one of their own:
  // a shadow keeps its contrast and does not read as a hole in a pale ground.
  test("the day washes the lit ground first, then the shadows with a weaker wash", async () => {
    const t = JSON.stringify(await carte({ lumiere: "jour" }));
    expect(t.indexOf("iso-lavis-jour-0")).toBeLessThan(t.indexOf("iso-lavis-ombre-0"));
    expect(t.indexOf("iso-lavis-ombre-0")).toBeGreaterThan(t.lastIndexOf("ombres-0"));
  });

  test("a building behind its heap of stones casts no shadow and has no socle yet", async () => {
    const sans = await carte({});
    const code = montres.find((c) => noeuds(sans, new RegExp(`^iso-socle-${c}$`)).length > 0);
    expect(code).toBeDefined();
    if (!code) return;
    const ombres = (a: Noeud | Noeud[] | null) => JSON.stringify(a).match(/"d":"M[^"]*"/g) ?? [];
    const tas = await carte({ masques: new Set([code]), chantiers: new Set([code]) });
    expect(noeuds(tas, new RegExp(`^iso-socle-${code}$`))).toHaveLength(0);
    expect(ombres(tas).join("").length).toBeLessThan(ombres(sans).join("").length);
    // AUDIT-DA 26: its contact shadow goes with it.
    const [contact] = ombreContactDe(code, stade(code), "nuit");
    expect(contact).toBeDefined();
    if (!contact) return;
    const d = cheminSvg(contact);
    expect(JSON.stringify(sans)).toContain(d);
    expect(JSON.stringify(tas)).not.toContain(d);
  });

  // The cast shadow stayed on the animal's home cell while it paused on the next one.
  test("an animal's shadow is in each node that walks it", async () => {
    const marche = noeuds(await carte({}), /^iso-animal-.*-marche$/);
    expect(marche.length).toBeGreaterThan(0);
    for (const n of marche) expect(n).toContain("RNSVGEllipse");
  });
});
