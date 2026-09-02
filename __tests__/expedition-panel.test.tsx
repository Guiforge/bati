import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { ExpeditionPanel } from "@/components/session/ExpeditionPanel";
import "@/i18n";
import config from "@/tamagui.config";

// The panel needs the store's state, not its database half: importing @/db/gps would pull the
// SQLite client into a renderer that has none.
jest.mock("@/db/gps", () => ({
  appendPoints: jest.fn().mockResolvedValue(undefined),
  pointsOf: jest.fn().mockResolvedValue([]),
}));
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

import { rawColors } from "@/constants/rawColors";
import { EMPTY, type TrackState } from "@/src/gps/track";
import { useExpeditionStore } from "@/stores/expedition";

function setTrack(
  track: Partial<TrackState>,
  extra: { error?: string | null; goalReached?: boolean } = {},
) {
  useExpeditionStore.setState({
    track: { ...EMPTY, ...track },
    error: extra.error ?? null,
    lastFix: null,
    goalReached: extra.goalReached ?? false,
  });
}

function mount() {
  return render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <ExpeditionPanel />
    </TamaguiProvider>,
  );
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
    await mount();
    expect(screen.getByText("Finding the sky")).toBeTruthy();
  });

  test("shows the ground covered, through the format helper", async () => {
    setTrack({ startedAt: 1, distanceM: 2500, movingMs: 900_000 });
    await mount();

    expect(screen.getByText("2.50 km")).toBeTruthy();
    expect(screen.getByText("15:00")).toBeTruthy();
  });

  // The unit is a display choice and nothing else: the same stored metres, read differently.
  test("the same run reads in miles when the hero asked for miles", async () => {
    mockUnit = "imperial";
    setTrack({ startedAt: 1, distanceM: 1609.344, movingMs: 600_000 });
    await mount();

    expect(screen.getByText("1.00 mi")).toBeTruthy();
  });

  /**
   * A blank readout looks broken, and so does a confident one. Before the first fix there is no
   * distance to report, so `0 m` at 56px was a verdict in display type that a de-Googled phone
   * held for minutes. The status takes the slot and says what the wait is.
   */
  test("does not report a distance it has not measured yet", async () => {
    await mount();

    expect(screen.queryByText("0 m")).toBeNull();
    expect(screen.getByText("Finding the sky")).toBeTruthy();
    expect(
      screen.getByText(
        "The first fix can take a few minutes outdoors. Set off anyway, the trace will catch up.",
      ),
    ).toBeTruthy();
  });

  // The hint is a promise about a wait. A refused permission is not a wait, so it is not made.
  test("does not promise the trace will catch up when nothing is coming", async () => {
    setTrack({}, { error: "permission" });
    await mount();

    expect(
      screen.queryByText(
        "The first fix can take a few minutes outdoors. Set off anyway, the trace will catch up.",
      ),
    ).toBeNull();
  });

  test("a stopped hero is told they are stopped, not left to guess", async () => {
    setTrack({ startedAt: 1, paused: true, distanceM: 100 });
    await mount();
    expect(screen.getByText("Standing still")).toBeTruthy();
  });

  /**
   * Auto-pause is right and was unexplained: at a red light the three figures freeze and a hero
   * glancing down sees a dead app. They dim with the line that explains them, and go back to full
   * colour the moment the hero moves, which is the un-pause said without a word.
   */
  test("dims the frozen figures while the pause holds", async () => {
    setTrack({ startedAt: 1, paused: true, distanceM: 100, movingMs: 60_000 });
    await mount();

    expect(screen.getByText("100 m").props.style?.color).toBe(rawColors.textSecondary);
    expect(screen.getByText("1:00").props.style?.color).toBe(rawColors.textSecondary);
  });

  // The other half of the pair, and the half that makes the first one mean something: the same
  // figures at the same values, undimmed, because the hero is moving.
  test("gives the figures back their full colour the moment the hero moves", async () => {
    setTrack({ startedAt: 1, paused: false, distanceM: 100, movingMs: 60_000 });
    await mount();

    expect(screen.getByText("100 m").props.style?.color).toBe(rawColors.text);
    expect(screen.getByText("1:00").props.style?.color).toBe(rawColors.text);
  });

  /**
   * "No signal" was told for four different problems, and a hero who refused the prompt walked
   * forty minutes being blamed on their reception. The two the hero can fix say what to fix.
   */
  test("a refused permission names the permission, not the reception", async () => {
    setTrack({ startedAt: 1 }, { error: "permission" });
    await mount();
    expect(screen.getByText("Location is off for Bati")).toBeTruthy();
    expect(screen.queryByText("No signal")).toBeNull();
  });

  test("a denied foreground service reads the same way", async () => {
    setTrack({ startedAt: 1 }, { error: "foreground-denied" });
    await mount();
    expect(screen.getByText("Location is off for Bati")).toBeTruthy();
  });

  /**
   * Location switched off mid-walk. The figures freeze, the notification two swipes away says
   * "GPS off", and the panel used to keep saying "On the road" over numbers that had stopped.
   */
  test("says the GPS is off when the provider goes down mid-walk", async () => {
    setTrack({ startedAt: 1, distanceM: 100 }, { error: "gps-off" });
    await mount();

    expect(screen.getByText("GPS off")).toBeTruthy();
    expect(screen.queryByText("On the road")).toBeNull();
  });

  /**
   * A refusal the app cannot ask about again is a dead end without this: the grant lives in
   * Android's own settings, and docs/designs/gps-without-google.md promised the way there.
   */
  test("a refused permission offers the way to the setting that fixes it", async () => {
    setTrack({ startedAt: 1 }, { error: "permission" });
    await mount();

    expect(screen.getByText("Open settings")).toBeTruthy();
  });

  test("and does not offer it when there is nothing to fix", async () => {
    setTrack({ startedAt: 1, distanceM: 100 });
    await mount();

    expect(screen.queryByText("Open settings")).toBeNull();
  });

  // The codes the hero can do nothing about keep the honest name: from where they stand, the
  // phone is not receiving.
  test.each(["unavailable", "provider-missing", "no-context"])(
    "%s is still no signal",
    async (code) => {
      setTrack({ startedAt: 1 }, { error: code });
      await mount();
      expect(screen.getByText("No signal")).toBeTruthy();
    },
  );

  test("the status says the goal was reached, ahead of moving or standing still", async () => {
    setTrack({ startedAt: 1, distanceM: 3000, movingMs: 600_000 }, { goalReached: true });
    await mount();
    expect(screen.getByText("Goal met")).toBeTruthy();
    expect(screen.queryByText("On the road")).toBeNull();
  });
});
