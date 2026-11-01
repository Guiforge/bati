import "react-native-gesture-handler/jestSetup";
import { render } from "@testing-library/react-native";
import { etatCarte, stadeDemo } from "@/components/village/iso/carteDemo";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import * as marcheurs from "@/components/village/iso/marcheurs";
import { CASE_STATUE, EMPRISE_STATUE } from "@/components/village/iso/statue";
import type { BuildingCode } from "@/db/schema";

// The real planner, watched: what the map tells the villagers about the statue's cell.
jest.mock("@/components/village/iso/marcheurs", () => {
  const vrai = jest.requireActual("@/components/village/iso/marcheurs");
  return { ...vrai, reposInitial: jest.fn(vrai.reposInitial) };
});
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock("@/hooks/useGameIcon", () => ({ useGameIcon: () => 1 }));

const crest = {
  animal: "stag" as const,
  manual: false,
  quarters: null,
  longestFlame: 0 as const,
  rings: 0,
  second: null,
  stage: "venerable" as const,
};

async function arbre(blason?: Parameters<typeof IsoCarte>[0]["blason"]) {
  const { visible, montres } = etatCarte(12, true);
  const stade = (code: BuildingCode) => stadeDemo(code, 12);
  const r = await render(
    <IsoCarte visible={visible} montres={montres} stade={stade} blason={blason} />,
  );
  return JSON.stringify(r.toJSON());
}

describe("the totem statue on the map (T25)", () => {
  test("no crest prop, no statue", async () => {
    const t = await arbre();
    expect(t).not.toContain("iso-statue");
  });

  test("crest null: the empty plinth, no animal", async () => {
    const t = await arbre({ crest: null, onPress: jest.fn() });
    expect(t).toContain("iso-statue");
    expect(t).not.toContain("iso-statue-image");
  });

  test("with a crest: the animal and its wash", async () => {
    const t = await arbre({ crest, onPress: jest.fn() });
    expect(t).toContain("iso-statue-image");
    expect(t).toContain("iso-statue-matiere");
  });

  // The plinth was a fire stop and a path cell to the villagers: the minstrel stood in the statue.
  test("its cell is closed to the villagers, and it is among what they are ranked against", async () => {
    jest.mocked(marcheurs.reposInitial).mockClear();
    await arbre({ crest, onPress: jest.fn() });
    const carte = jest.mocked(marcheurs.reposInitial).mock.calls[0]?.[1];
    expect(carte?.obstacles).toContainEqual(CASE_STATUE);
    expect(carte?.occupees).toContainEqual(CASE_STATUE);
    expect(carte?.vues).toContainEqual(EMPRISE_STATUE);
  });

  test("no statue, its cell stays open", async () => {
    jest.mocked(marcheurs.reposInitial).mockClear();
    await arbre();
    const carte = jest.mocked(marcheurs.reposInitial).mock.calls[0]?.[1];
    expect(carte?.obstacles).not.toContainEqual(CASE_STATUE);
  });
});
