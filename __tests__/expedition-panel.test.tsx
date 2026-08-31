import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { ExpeditionPanel } from "@/components/session/ExpeditionPanel";
import "@/i18n";
import config from "@/tamagui.config";

// The panel needs the store's state, not its database half: importing @/db/gps would pull the
// SQLite client into a renderer that has none.
jest.mock("@/db/gps", () => ({ appendPoints: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/modules/bati-location", () => ({
  isAvailable: () => false,
  start: () => false,
  stop: () => undefined,
  addListener: () => ({ remove: () => undefined }),
}));

let mockUnit: "metric" | "imperial" = "metric";
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (state: { distanceUnit: string }) => unknown) =>
    selector({ distanceUnit: mockUnit }),
}));

import { EMPTY, type TrackState } from "@/src/gps/track";
import { useExpeditionStore } from "@/stores/expedition";

function setTrack(track: Partial<TrackState>, extra: { error?: string | null } = {}) {
  useExpeditionStore.setState({
    track: { ...EMPTY, ...track },
    error: extra.error ?? null,
    lastFix: null,
  });
}

describe("ExpeditionPanel", () => {
  beforeEach(() => {
    mockUnit = "metric";
    setTrack({});
  });

  /**
   * A blank readout while the receiver is warming up looks exactly like a broken one, and on a
   * de-Googled ROM the first fix takes minutes rather than seconds. The screen has to say which
   * of the two it is.
   */
  test("says it is looking for the sky rather than showing nothing", async () => {
    await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <ExpeditionPanel />
      </TamaguiProvider>,
    );
    expect(screen.getByText("Finding the sky")).toBeTruthy();
  });

  test("shows the ground covered, through the format helper", async () => {
    setTrack({ startedAt: 1, distanceM: 2500, movingMs: 900_000 });
    await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <ExpeditionPanel />
      </TamaguiProvider>,
    );

    expect(screen.getByText("2.50 km")).toBeTruthy();
    expect(screen.getByText("15:00")).toBeTruthy();
  });

  // The unit is a display choice and nothing else: the same stored metres, read differently.
  test("the same run reads in miles when the hero asked for miles", async () => {
    mockUnit = "imperial";
    setTrack({ startedAt: 1, distanceM: 1609.344, movingMs: 600_000 });
    await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <ExpeditionPanel />
      </TamaguiProvider>,
    );

    expect(screen.getByText("1.00 mi")).toBeTruthy();
  });

  test("a stopped hero is told they are stopped, not left to guess", async () => {
    setTrack({ startedAt: 1, paused: true, distanceM: 100 });
    await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <ExpeditionPanel />
      </TamaguiProvider>,
    );
    expect(screen.getByText("Standing still")).toBeTruthy();
  });

  test("a refused service says so instead of reading zero forever", async () => {
    setTrack({ startedAt: 1 }, { error: "permission" });
    await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <ExpeditionPanel />
      </TamaguiProvider>,
    );
    expect(screen.getByText("No signal")).toBeTruthy();
  });
});
