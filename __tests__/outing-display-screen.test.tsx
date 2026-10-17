import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import OutingDisplayScreen from "@/app/outing-display";
import { OutingDisplayRow } from "@/components/settings/OutingDisplayRow";
import type { OutingDisplay } from "@/constants/outingDisplay";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

/**
 * "Affichage des sorties": every choice writes on tap, the handlebar preset is three values and
 * nothing else, and going back to the original writes `{}` rather than deleting anything. The
 * real settings store sits in the middle, so what the screen says is what a later outing reads.
 */

let mockTab: string | undefined;
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ tab: mockTab }),
  usePathname: () => "/outing-display",
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
}));
const mockPush = jest.fn();

const mockLastOuting = jest.fn();
jest.mock("@/db/gps", () => ({ lastOutingOf: (l: string) => mockLastOuting(l) }));

const mockWrites: OutingDisplay[] = [];
jest.mock("@/db", () => ({
  preferences: {
    setOutingDisplay: jest.fn((d: OutingDisplay) => {
      mockWrites.push(d);
      return Promise.resolve();
    }),
  },
}));
let mockKeepAwake: string[] = [];
jest.mock("@/src/outingKeepAwake", () => ({
  keepAwakeSet: () => Promise.resolve(mockKeepAwake),
  setKeepAwake: (l: string, on: boolean) => {
    mockKeepAwake = on ? [...new Set([...mockKeepAwake, l])] : mockKeepAwake.filter((x) => x !== l);
    return Promise.resolve(mockKeepAwake);
  },
}));
jest.mock("@/src/widget", () => ({ requestWidgetsUpdate: jest.fn() }));
jest.mock("@/src/customAvatar", () => ({ portLegacyAvatar: jest.fn() }));
jest.mock("@/src/i18n/deviceLanguage", () => ({
  getDevicePreferredAppLanguage: () => "en",
  resolveAppLanguage: () => "en",
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

import "@/i18n";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function mount(tab?: string) {
  mockTab = tab;
  await act(async () => {
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <TamaguiProvider config={config} defaultTheme="dark">
          <OutingDisplayScreen />
          <OutingDisplayRow />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
}

const press = async (testID: string) => {
  await act(async () => {
    await fireEvent.press(screen.getByTestId(testID));
  });
};

beforeEach(() => {
  mockWrites.length = 0;
  mockLastOuting.mockReset();
  mockLastOuting.mockResolvedValue(null);
  mockKeepAwake = [];
  mockPush.mockClear();
  useSettingsStore.setState({
    outingDisplay: {},
    outingKeepAwake: [],
    language: "en",
    hapticsEnabled: true,
  });
});

test("opens on the tab it is sent to, Walk by default", async () => {
  await mount();
  expect(screen.getByText("Walks and hikes share this tab.")).toBeTruthy();
  expect(screen.queryByTestId("outing-display-handlebar")).toBeNull();
});

test("the handlebar preset is a ride thing, three values, checked while they hold", async () => {
  await mount("ride");
  expect(screen.queryByText("Walks and hikes share this tab.")).toBeNull();

  await press("outing-display-handlebar");
  expect(useSettingsStore.getState().outingDisplay).toEqual({
    ride: { big: "rate", layout: "bigFigures" },
  });
  expect(useSettingsStore.getState().outingKeepAwake).toEqual(["ride"]);
  expect(mockWrites).toHaveLength(1);

  // Tapping it checked does nothing: no state of its own, the hero undoes values one by one.
  await press("outing-display-handlebar");
  expect(mockWrites).toHaveLength(1);

  // Undo one value and it is no longer checked: the screen kept nothing but the values.
  await press("outing-display-layout-map");
  expect(useSettingsStore.getState().outingDisplay).toEqual({ ride: { big: "rate" } });
});

test("picking a place writes the blob on tap, and the original choice leaves no trace", async () => {
  await mount("run");
  await press("outing-display-place-big");
  await press("outing-place-option-distance");
  expect(useSettingsStore.getState().outingDisplay).toEqual({ run: { big: "distance" } });

  await press("outing-display-place-1");
  await press("outing-place-option-none");
  expect(useSettingsStore.getState().outingDisplay).toEqual({
    run: { big: "distance", small: ["auto", null, "rate"] },
  });

  // Back to what ships, by hand: the row must read "As shipped" again.
  await press("outing-display-place-big");
  await press("outing-place-option-auto");
  await press("outing-display-place-1");
  await press("outing-place-option-climb");
  expect(useSettingsStore.getState().outingDisplay).toEqual({});
  expect(screen.getByText("As shipped")).toBeTruthy();
});

test("the small places can be left empty, the big one cannot", async () => {
  await mount("walk");
  await press("outing-display-place-big");
  expect(screen.queryByTestId("outing-place-option-none")).toBeNull();
  await press("outing-place-option-time");
  await press("outing-display-place-0");
  expect(screen.getByTestId("outing-place-option-none")).toBeTruthy();
});

test("the Settings row says Customised after a change, either kind", async () => {
  await mount("walk");
  expect(screen.getByText("As shipped")).toBeTruthy();

  // Only the phone's screen choice, no blob: still customised.
  await press("outing-display-screen-on");
  expect(useSettingsStore.getState().outingKeepAwake).toEqual(["walk"]);
  expect(useSettingsStore.getState().outingDisplay).toEqual({});
  expect(screen.getByText("Customised")).toBeTruthy();
});

test("three layouts, the big map with its note, written on tap and gone when the original returns", async () => {
  await mount("walk");
  expect(screen.getByText("Map and figures")).toBeTruthy();
  expect(screen.getByText("Big figures")).toBeTruthy();
  expect(screen.getByText("Big map")).toBeTruthy();
  expect(screen.queryByText("The map fills the screen, your big figure sits on top.")).toBeNull();

  await press("outing-display-layout-bigMap");
  expect(useSettingsStore.getState().outingDisplay).toEqual({ walk: { layout: "bigMap" } });
  expect(mockWrites.at(-1)).toEqual({ walk: { layout: "bigMap" } });
  expect(screen.getByText("The map fills the screen, your big figure sits on top.")).toBeTruthy();

  await press("outing-display-layout-map");
  expect(useSettingsStore.getState().outingDisplay).toEqual({});
});

test("the walk-run note sits on the rate rows of a walk, not of a ride", async () => {
  await mount("walk");
  await press("outing-display-place-big");
  expect(screen.getAllByText("Never shown on a walk-run.")).toHaveLength(2);
});

test("reset writes {} and takes the tab out of the screen set, and is only offered when there is something to undo", async () => {
  await mount("ride");
  expect(screen.queryByTestId("outing-display-reset")).toBeNull();

  await press("outing-display-handlebar");
  await press("outing-display-reset");
  expect(mockWrites.at(-1)).toEqual({});
  expect(useSettingsStore.getState().outingDisplay).toEqual({});
  expect(useSettingsStore.getState().outingKeepAwake).toEqual([]);
  expect(screen.queryByTestId("outing-display-reset")).toBeNull();
  expect(screen.getByText("As shipped")).toBeTruthy();
});

test("pace or speed is a choice per tab, written on tap, and the original leaves no trace", async () => {
  await mount("walk");
  await press("outing-display-rate-speed");
  expect(useSettingsStore.getState().outingDisplay).toEqual({ walk: { rate: "speed" } });
  // The Ride tab keeps its own: a speed by default, so choosing a speed there stores nothing.
  await press("outing-display-tab-ride");
  await press("outing-display-rate-speed");
  expect(useSettingsStore.getState().outingDisplay).toEqual({ walk: { rate: "speed" } });
  await press("outing-display-rate-pace");
  expect(useSettingsStore.getState().outingDisplay).toEqual({
    walk: { rate: "speed" },
    ride: { rate: "pace" },
  });
});

test("the vibration cadence is a choice per tab, with the league and the no-goal notes", async () => {
  await mount("run");
  expect(screen.getByText("A league is 1 km, even in miles.")).toBeTruthy();
  await press("outing-display-buzz-5");
  expect(useSettingsStore.getState().outingDisplay).toEqual({ run: { buzzEvery: 5 } });
  await press("outing-display-buzz-0");
  expect(useSettingsStore.getState().outingDisplay).toEqual({ run: { buzzEvery: 0 } });
  expect(screen.getByText(/With no goal, the outing does not buzz\./)).toBeTruthy();
  await press("outing-display-buzz-1");
  expect(useSettingsStore.getState().outingDisplay).toEqual({});
});

test("a ride starts on every fifth league, and the hero's own choice is what is checked", async () => {
  await mount("ride");
  expect(screen.getByTestId("outing-display-buzz-5").props.accessibilityState).toMatchObject({
    selected: true,
  });
  await press("outing-display-buzz-1");
  expect(useSettingsStore.getState().outingDisplay).toEqual({ ride: { buzzEvery: 1 } });
});

test("with vibrations off in Settings the cadence cannot be changed, and the screen says why", async () => {
  useSettingsStore.setState({ hapticsEnabled: false });
  await mount("walk");
  expect(screen.getByText("Vibrations are off in Settings.")).toBeTruthy();
  await press("outing-display-buzz-5");
  expect(useSettingsStore.getState().outingDisplay).toEqual({});
});

describe("the preview", () => {
  test("draws the panel from the last outing of the tab, in the hero's own places", async () => {
    mockLastOuting.mockResolvedValue({
      id: 1,
      questId: null,
      performedAt: new Date("2026-10-12T10:00:00Z"),
      leaguesM: 5000,
      movingSeconds: 3000,
      ascentM: 40,
      outing: "walk",
    });
    useSettingsStore.setState({ outingDisplay: { walk: { rate: "speed", big: "rate" } } });
    await mount("walk");

    expect(mockLastOuting).toHaveBeenCalledWith("walk");
    expect(screen.getByTestId("expedition-big").props.children).toBe("6.0 km/h");
    expect(screen.getByText("5.00 km")).toBeTruthy();
    expect(screen.getByText("40 m")).toBeTruthy();
    expect(screen.getByText(/^Your last walk, on /)).toBeTruthy();
    // A preview measures nothing: no status line, no accuracy, no hint about the pocket.
    expect(screen.queryByText("On the road")).toBeNull();
  });

  // A control wired to nothing at the moment it is chosen: the lap has no live value here, so the
  // place keeps its label and prints the dash its empty mode prints.
  test("choosing the current league puts its label and a dash in the preview", async () => {
    mockLastOuting.mockResolvedValue({
      id: 1,
      questId: null,
      performedAt: new Date("2026-10-12T10:00:00Z"),
      leaguesM: 5000,
      movingSeconds: 3000,
      ascentM: 40,
      outing: "walk",
    });
    await mount("walk");
    await press("outing-display-place-big");
    expect(screen.getByTestId("outing-place-option-lap")).toBeTruthy();
    await press("outing-place-option-lap");

    expect(useSettingsStore.getState().outingDisplay).toEqual({ walk: { big: "lap" } });
    expect(screen.getByTestId("expedition-big").props.children).toBe("-");
    expect(screen.getAllByText("Current league").length).toBeGreaterThan(0);
  });

  test("with no outing of the kind, dashes and a sentence, nothing invented", async () => {
    await mount("run");

    expect(screen.getByText("No run yet: the figures will appear here.")).toBeTruthy();
    expect(screen.getByTestId("expedition-big").props.children).toBe("-");
    expect(screen.queryByText("0 m")).toBeNull();
  });

  test("follows the tab it is on", async () => {
    mockLastOuting.mockImplementation((l: string) =>
      Promise.resolve(
        l === "ride"
          ? {
              id: 2,
              questId: null,
              performedAt: new Date("2026-10-13T10:00:00Z"),
              leaguesM: 20_000,
              movingSeconds: 3600,
              ascentM: null,
              outing: "ride",
            }
          : null,
      ),
    );
    await mount("walk");
    expect(screen.getByText("No walk yet: the figures will appear here.")).toBeTruthy();
    await press("outing-display-tab-ride");
    expect(await screen.findByText(/^Your last ride, on /)).toBeTruthy();
    expect(screen.getByText("20.0 km/h")).toBeTruthy();
  });
});

test("the route ghost is off by default, written for the current tab only, and offers the reset", async () => {
  await mount("run");
  expect(
    screen.getByText(
      "A pale line on the map shows your last outing on the same route. Your phone works it out from your own traces, and it stays hidden during a walk-run.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByTestId("outing-display-route-ghost-off").props.accessibilityState,
  ).toMatchObject({ selected: true });
  expect(screen.queryByTestId("outing-display-reset")).toBeNull();

  await press("outing-display-route-ghost-on");
  expect(useSettingsStore.getState().outingDisplay).toEqual({ run: { routeGhost: true } });
  expect(screen.getByTestId("outing-display-reset")).toBeTruthy();

  await press("outing-display-route-ghost-off");
  expect(useSettingsStore.getState().outingDisplay).toEqual({});
});
