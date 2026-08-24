import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";

import { BuiltBuildingCard } from "@/components/village/BuiltBuildingCard";
import type { VillageBuilding } from "@/db/village";
import config from "@/tamagui.config";

/**
 * Issue #29: a built tile is 31.5% *of its row*, so that width has to sit on the outermost node
 * this component renders, in every state. It used to move — the "just grew" pulse mounted an
 * unsized wrapper between the row and the card, the card then measured 31.5% of the wrapper,
 * and the tile collapsed to a sliver with its name wrapped to one letter per line. Only a
 * restart cleared it, because that dropped the `grown` param the pulse reads.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: { language: string; reducedMotion: boolean }) => unknown) => {
    const state = { language: "en", reducedMotion: false };
    return selector ? selector(state) : state;
  },
}));

const BUILDING = {
  code: "forge",
  emoji: "🏠",
  tier: 1,
  level: 2,
  enName: "Forge",
  frName: "Forge",
  unlockCondition: "default",
  relatedMuscle: null,
  driver: "tier",
  metricValue: 3,
  nextTarget: 5,
} as unknown as VillageBuilding;

/** The width of the topmost node the tile renders — the one the row actually measures. */
async function outerWidth(justGrew: boolean) {
  const { getByLabelText } = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <BuiltBuildingCard
        building={BUILDING}
        language="en"
        justGrew={justGrew}
        onPress={jest.fn()}
      />
    </TamaguiProvider>,
  );

  let node = getByLabelText("Forge");
  while (node.parent?.type) node = node.parent;
  return StyleSheet.flatten(node.props.style)?.width;
}

describe("BuiltBuildingCard", () => {
  it("hangs its row-relative width on the same node whether or not it just grew", async () => {
    expect(await outerWidth(false)).toBe("31.5%");
    expect(await outerWidth(true)).toBe("31.5%");
  });
});
