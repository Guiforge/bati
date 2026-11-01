// T44: what the dev colour blocks of the small buildings add to the full map (palier 12), by day and
// by night. They are Paths in the ground tiles' own Svg: no new Svg, view, image or opacity.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import { QuartiersContext } from "@/components/village/iso/quartiers";
import { buildingCodes } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

type Noeud = { type: string; props: { style?: unknown }; children: (Noeud | string)[] | null };
type Compte = { noeuds: number; svg: number; formes: number; images: number; opacite: number };

function parcourir(n: Noeud | string | null, c: Compte) {
  if (n === null || typeof n === "string") return;
  c.noeuds++;
  const style = StyleSheet.flatten(n.props.style as never) as Record<string, unknown> | undefined;
  if (/svg/i.test(n.type) && /view$/i.test(n.type)) c.svg++;
  if (/^RNSVG(Path|Ellipse|Polygon|Rect|Circle)$/.test(n.type)) c.formes++;
  if (/image/i.test(n.type)) c.images++;
  if (typeof style?.opacity === "number" && style.opacity < 1) c.opacite++;
  for (const e of n.children ?? []) parcourir(e, c);
}

async function compter(blocs: boolean, lumiere: "jour" | "nuit"): Promise<Compte> {
  const buildings = buildingCodes.map((code) => ({ code, level: 30 }));
  const { unmount } = await render(
    <GestureHandlerRootView>
      <QuartiersContext.Provider value={blocs}>
        <IsoVillage tier={12} buildings={buildings} width={411} height={520} lumiere={lumiere} />
      </QuartiersContext.Provider>
    </GestureHandlerRootView>,
  );
  const c: Compte = { noeuds: 0, svg: 0, formes: 0, images: 0, opacite: 0 };
  const json = screen.toJSON() as Noeud | Noeud[] | null;
  for (const n of Array.isArray(json) ? json : [json]) parcourir(n, c);
  await unmount();
  return c;
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date("2026-10-31T12:00:00") });
});

describe.each(["jour", "nuit"] as const)("quartiers en blocs, %s", (lumiere) => {
  test("only paths are added", async () => {
    const off = await compter(false, lumiere);
    const on = await compter(true, lumiere);
    console.info(`quartiers ${lumiere}`, JSON.stringify({ off, on }));
    expect(on.images).toBe(off.images);
    // the life (birds, villagers) varies a render by tens; the blocks add about 25 nodes, no Svg
    expect(on.noeuds - off.noeuds).toBeLessThanOrEqual(30);
    expect(on.svg - off.svg).toBeLessThanOrEqual(0);
    expect(on.formes - off.formes).toBeLessThanOrEqual(30);
  });
});
