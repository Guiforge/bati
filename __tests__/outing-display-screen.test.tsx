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
  mockKeepAwake = [];
  mockPush.mockClear();
  useSettingsStore.setState({ outingDisplay: {}, outingKeepAwake: [], language: "en" });
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
