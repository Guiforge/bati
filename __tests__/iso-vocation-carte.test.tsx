import "react-native-gesture-handler/jestSetup";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { makeMutable } from "react-native-reanimated";
import { etatCarte, stadeDemo } from "@/components/village/iso/carteDemo";
import { HorlogeContext } from "@/components/village/iso/horloge";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import * as marcheurs from "@/components/village/iso/marcheurs";
import { animalDeVocation, CASES_VOCATION } from "@/components/village/iso/vocation";
import type { BuildingCode } from "@/db/schema";

jest.mock("@/components/village/iso/marcheurs", () => {
  const vrai = jest.requireActual("@/components/village/iso/marcheurs");
  return { ...vrai, reposInitial: jest.fn(vrai.reposInitial) };
});
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock("@/hooks/useGameIcon", () => ({ useGameIcon: () => 1 }));

const crestDe = (nom: string) => ({
  animal: animalDeVocation(nom) ?? "boar",
  manual: false,
  quarters: null,
  longestFlame: 0 as const,
  rings: 0,
  second: null,
  stage: "adult" as const,
});

async function carte(nom: string | null, tier = 12, c = 0) {
  const { visible, montres } = etatCarte(tier as 12, true);
  const stade = (code: BuildingCode) => stadeDemo(code, tier as 12);
  await render(
    <HorlogeContext.Provider value={makeMutable(c)}>
      <IsoCarte
        visible={visible}
        montres={montres}
        stade={stade}
        blason={nom === null ? undefined : { crest: crestDe(nom), onPress: jest.fn() }}
      />
    </HorlogeContext.Provider>,
  );
}
const ids = () =>
  screen
    .queryAllByTestId(/^iso-vocation-/)
    .map((n) => String(n.props.testID))
    .sort();

describe("the vocation's set on the map (G3)", () => {
  test("a runner and a calisthenics hero see two different sets", async () => {
    await carte("course");
    const course = ids();
    await carte("callisthenie");
    const calli = ids();
    expect(course).toContain("iso-vocation-sol-run");
    expect(course).toContain("iso-vocation-chose-run-0");
    expect(course).toContain("iso-vocation-chose-run-1");
    expect(course.filter((i) => i.startsWith("iso-vocation-banniere-run"))).toHaveLength(2);
    expect(calli).toContain("iso-vocation-sol-calisthenics");
    expect(calli.filter((i) => i.startsWith("iso-vocation-banniere-calisthenics"))).toHaveLength(2);
    expect(course.filter((i) => calli.includes(i))).toEqual([]);
    // Same size: a vocation that changes swaps the set, it never takes one away.
    expect(course).toHaveLength(calli.length);
  });

  test("no crest, or the boar, has no set", async () => {
    await carte(null);
    expect(ids()).toEqual([]);
    await carte("sanglier");
    expect(ids()).toEqual([]);
  });

  test("its things close their cells to the villagers", async () => {
    jest.mocked(marcheurs.reposInitial).mockClear();
    await carte("course");
    const c = jest.mocked(marcheurs.reposInitial).mock.calls[0]?.[1];
    for (const cell of CASES_VOCATION) expect(c?.obstacles).toContainEqual(cell);
  });

  test("the banners rest at a cycle boundary (and under reduced motion, where the clock rests)", async () => {
    const angle = () =>
      screen.getAllByTestId(/^iso-vocation-banniere-/).map((n) => {
        const s = StyleSheet.flatten(n.props.style) as { transform?: { rotate?: string }[] };
        return s.transform?.[0]?.rotate;
      });
    await carte("course", 12, 0);
    expect(angle()).toEqual(["0rad", "0rad"]);
    await carte("course", 12, 1300);
    expect(angle().every((a) => a !== "0rad")).toBe(true);
  });
});
