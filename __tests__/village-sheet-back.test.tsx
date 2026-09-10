import { render, waitFor } from "@testing-library/react-native";
import { BackHandler } from "react-native";
import { TamaguiProvider } from "tamagui";

import { VillageDetailSheet, type VillageSelection } from "@/components/village/VillageDetailSheet";
import type { VillageBuilding } from "@/db/village";
import config from "@/tamagui.config";

/**
 * Android back on the village detail sheet was doing two things at once: the sheet closed and
 * the router popped, so the hero landed on Home while the village unmounted mid-animation, and
 * what it left behind swallowed every tap after that. Only a full restart got the app back.
 *
 * The press has to be *consumed* while the sheet is open, since returning `true` is what keeps
 * the router from ever seeing it, and released again once it is shut, or hardware back would stop
 * working on the village screen underneath.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/adventures", () => ({ listFinishedRunSummaries: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/completed", () => ({
  getRecentContributingSessions: jest.fn().mockResolvedValue([]),
}));

const FORGE = {
  code: "forge",
  emoji: "🏠",
  tier: 1,
  level: 3,
  enName: "forge-en",
  frName: "forge-fr",
  unlockCondition: "default",
  relatedMuscle: "chest",
  driver: "muscle",
  metricValue: 350,
  nextTarget: 600,
} as unknown as VillageBuilding;

const selection: VillageSelection = { kind: "building", building: FORGE };

function renderSheet(selected: VillageSelection | null, onClose: () => void) {
  return render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <VillageDetailSheet selected={selected} onClose={onClose} language="en" bottomInset={0} />
    </TamaguiProvider>,
  );
}

describe("VillageDetailSheet and hardware back", () => {
  let addEventListener: jest.SpyInstance;

  beforeEach(() => {
    addEventListener = jest.spyOn(BackHandler, "addEventListener");
  });

  afterEach(() => jest.restoreAllMocks());

  /** The handler registered last is the one Android calls first. */
  const lastHandler = () => addEventListener.mock.calls.at(-1)?.[1] as (() => boolean) | undefined;

  it("closes the sheet and stops there", async () => {
    const onClose = jest.fn();
    await renderSheet(selection, onClose);

    await waitFor(() => expect(lastHandler()).toBeDefined());

    expect(lastHandler()?.()).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("leaves hardware back alone while it is shut", async () => {
    await renderSheet(null, jest.fn());

    expect(addEventListener).not.toHaveBeenCalled();
  });

  it("releases the press once it closes", async () => {
    const onClose = jest.fn();
    const { rerender } = await renderSheet(selection, onClose);

    await waitFor(() => expect(lastHandler()).toBeDefined());
    const remove = addEventListener.mock.results.at(-1)?.value as { remove: () => void };
    const removed = jest.spyOn(remove, "remove");

    await rerender(
      <TamaguiProvider config={config} defaultTheme="dark">
        <VillageDetailSheet selected={null} onClose={onClose} language="en" bottomInset={0} />
      </TamaguiProvider>,
    );

    expect(removed).toHaveBeenCalled();
  });
});
