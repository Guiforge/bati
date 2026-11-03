// The village tab with a painted building's flag ON: the engine draws it at the rank the hero has
// claimed (never the live one: nothing evolves without a tap), the base rank (rule B) from the
// claimed bases. Its twin, iso-village-rang-off.test.tsx, proves the flag off leaves the map as it was.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { render } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import type { BuildingCode } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));
jest.mock("@/constants/isoPoc", () => ({
  ...jest.requireActual("@/constants/isoPoc"),
  BATIMENT_MOTEUR: true,
  BLD_PEINTS: { campfire: true },
}));
const mockRendus: { code: string; rank: number; baseRank: number | undefined }[] = [];
jest.mock("@/components/village/iso/BatimentMoteur", () => ({
  BatimentMoteur: (p: { data: { code: string }; rank: number; baseRank?: number }) => {
    mockRendus.push({ code: p.data.code, rank: p.rank, baseRank: p.baseRank });
    return null;
  },
}));

const monter = (level: number, reclame?: number, bases?: Partial<Record<BuildingCode, number>>) =>
  render(
    <GestureHandlerRootView>
      <IsoVillage
        tier={12}
        buildings={[{ code: "campfire", level }]}
        width={390}
        height={390}
        niveauxReclames={reclame === undefined ? undefined : { campfire: reclame }}
        basesReclamees={bases}
      />
    </GestureHandlerRootView>,
  );

beforeEach(() => {
  mockRendus.length = 0;
});

test("flag on: the painted building goes through the engine at its claimed rank", async () => {
  await monter(5, 2);
  expect(mockRendus.length).toBeGreaterThan(0);
  // Level 5 earned, rank 2 claimed: nothing rises until the tap.
  expect(new Set(mockRendus.map((r) => r.rank))).toEqual(new Set([2]));
});

test("flag on, nothing claimed yet: the live rank, base 0 for a building with no base", async () => {
  await monter(3);
  expect(mockRendus.at(-1)).toEqual({ code: "campfire", rank: 3, baseRank: 0 });
});
