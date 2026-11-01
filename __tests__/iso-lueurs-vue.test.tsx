import "react-native-gesture-handler/jestSetup";
import { render, screen } from "@testing-library/react-native";
import { etatCarte, stadeDemo } from "@/components/village/iso/carteDemo";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import type { BuildingCode } from "@/db/schema";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

type N = { props: Record<string, unknown>; children: (N | string)[] | null };
const contient = (n: N | string, id: string): boolean =>
  typeof n !== "string" &&
  (n.props.testID === id || (n.children ?? []).some((c) => contient(c, id)));

describe("the light of the map is one layer, under the sprites (iter-01 H1-01)", () => {
  const stade = (code: BuildingCode) => stadeDemo(code, 12);
  const monte = async (lumiere: "jour" | "nuit") => {
    const { visible, montres } = etatCarte(12, false);
    await render(<IsoCarte visible={visible} montres={montres} stade={stade} lumiere={lumiere} />);
    return screen.toJSON() as N;
  };

  test("at night the pools are one Svg, one gradient ellipse per light", async () => {
    await monte("nuit");
    expect(screen.getAllByTestId("iso-flaques-nuit")).toHaveLength(1);
    expect(screen.getAllByTestId("iso-flaque-nuit").length).toBeGreaterThan(3);
  });

  test("the light layer comes after the ground tiles and before the objects", async () => {
    const racine = await monte("nuit");
    const fils = racine.children ?? [];
    const i = fils.findIndex((c) => contient(c, "iso-monde-nuit"));
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(fils.length - 1);
    expect(fils.filter((c) => contient(c, "iso-monde-nuit"))).toHaveLength(1);
  });

  test("by day there is no pool, only the warm veil", async () => {
    await monte("jour");
    expect(screen.queryAllByTestId("iso-flaque-nuit")).toHaveLength(0);
    expect(screen.getAllByTestId("iso-monde-jour")).toHaveLength(1);
  });
});
