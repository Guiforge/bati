import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import "@/i18n";
import ChronicleScreen from "@/app/chronicle";
import { getVillageTierAsset } from "@/constants/assetMap";
import type { Chronicle } from "@/db/chronicle";
import config from "@/tamagui.config";

/**
 * The chronicle screen draws the year's card and sends exactly that picture. The figures
 * themselves are `getChronicle`'s (`__tests__/chronicle.test.ts`) and their list `chronicleStats`'s
 * (`__tests__/share-stats.test.ts`); here they are a fixed year.
 */
const mockGet = jest.fn();
const mockCapture = jest.fn();
const mockShare = jest.fn();
const mockShowError = jest.fn();
const mockSettings = { language: "en", distanceUnit: "metric" };

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (pick: (s: typeof mockSettings) => unknown) => pick(mockSettings),
}));
jest.mock("@/db/chronicle", () => ({
  ...jest.requireActual("@/db/chronicle"),
  getChronicle: (...args: unknown[]) => mockGet(...args),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: () => Promise.resolve(true),
  shareAsync: (...args: unknown[]) => mockShare(...args),
}));
jest.mock("react-native-view-shot", () => ({
  captureRef: (...args: unknown[]) => mockCapture(...args),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: jest.fn() }),
}));

const year: Chronicle = {
  year: 2026,
  since: new Date(2026, 9, 8),
  to: new Date(2026, 11, 15),
  figures: {
    quests: 9,
    outings: 0,
    reps: 0,
    questSeconds: 5400,
    timedQuests: 9,
    outingSeconds: 0,
    leaguesM: 0,
    xp: 400,
    records: 2,
    latestRecord: null,
  },
  bosses: 0,
  longestFlame: 12,
  villageTier: 2,
};

async function mount() {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <ChronicleScreen />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: new Date(2026, 11, 15, 10), doNotFake: ["nextTick", "setImmediate"] });
  mockCapture.mockResolvedValue("file:///card.png");
  mockShare.mockResolvedValue(undefined);
});

afterEach(() => jest.useRealTimers());

test("draws the year, from the hero's first session, with its figures", async () => {
  mockGet.mockResolvedValue(year);
  await mount();
  await screen.findByTestId("chronicle-card");
  expect(screen.getByText("Your 2026")).toBeTruthy();
  expect(screen.getByTestId("chronicle-span").props.children).toContain("October 8");
  expect(screen.getByText("9")).toBeTruthy();
  expect(screen.getByText("12")).toBeTruthy();
  // The village painted is the one the year ended on.
  expect([screen.getByTestId("chronicle-painting").props.source].flat()).toEqual([
    getVillageTierAsset(year.villageTier),
  ]);
  // December asks for the year so far.
  expect(mockGet).toHaveBeenCalledWith(
    expect.objectContaining({ year: 2026, from: new Date(2026, 0, 1) }),
  );
});

test("holds the send until the village is painted, so the picture never has a hole", async () => {
  mockGet.mockResolvedValue(year);
  await mount();
  await screen.findByTestId("chronicle-card");
  await act(async () => {
    await fireEvent.press(screen.getByTestId("chronicle-send"));
  });
  expect(mockCapture).not.toHaveBeenCalled();
});

test("sends the card as drawn, as a picture", async () => {
  mockGet.mockResolvedValue(year);
  await mount();
  await screen.findByTestId("chronicle-card");
  await act(async () => {
    await fireEvent(screen.getByTestId("chronicle-painting"), "load", {
      nativeEvent: {
        cacheType: "none",
        source: { url: "", width: 1024, height: 1024, mediaType: null },
      },
    });
  });
  await act(async () => {
    await fireEvent.press(screen.getByTestId("chronicle-send"));
  });
  expect(mockCapture).toHaveBeenCalledTimes(1);
  expect(mockShare).toHaveBeenCalledWith("file:///card.png", expect.anything());
});

test("a painting that fails to load is reported and does not lock the send", async () => {
  const { reportError } = require("@/src/reportError") as { reportError: jest.Mock };
  mockGet.mockResolvedValue(year);
  await mount();
  await screen.findByTestId("chronicle-card");
  await act(async () => {
    await fireEvent(screen.getByTestId("chronicle-painting"), "error", {
      nativeEvent: { error: "decode failed" },
    });
  });
  expect(reportError).toHaveBeenCalledWith("chronicle.painting", expect.anything());
  await act(async () => {
    await fireEvent.press(screen.getByTestId("chronicle-send"));
  });
  expect(mockCapture).toHaveBeenCalledTimes(1);
});

test("a year that is a single day so far names that day once", async () => {
  mockGet.mockResolvedValue({
    ...year,
    since: new Date(2026, 11, 15, 8),
    to: new Date(2026, 11, 15, 10),
  });
  await mount();
  await screen.findByTestId("chronicle-card");
  expect(screen.getByTestId("chronicle-span").props.children).toBe("December 15");
});

test("a year without a session names the year, promises nothing, and offers nothing to send", async () => {
  mockGet.mockResolvedValue(null);
  await mount();
  const empty = await screen.findByTestId("chronicle-empty");
  expect(empty.props.children).toBe("No session in 2026.");
  expect(screen.queryByTestId("chronicle-card")).toBeNull();
  expect(screen.queryByTestId("chronicle-send")).toBeNull();
});

test("a failed read says it failed, never that the year was empty", async () => {
  mockGet.mockRejectedValue(new Error("locked"));
  await mount();
  await screen.findByTestId("chronicle-failed");
  expect(screen.queryByTestId("chronicle-empty")).toBeNull();
  expect(screen.queryByTestId("chronicle-send")).toBeNull();
});

test("outside December and January the screen says when the chronicle opens", async () => {
  jest.setSystemTime(new Date(2026, 10, 3));
  await mount();
  await screen.findByTestId("chronicle-closed");
  expect(mockGet).not.toHaveBeenCalled();
});

test("French writes the first of the month as an ordinal", async () => {
  mockSettings.language = "fr";
  mockGet.mockResolvedValue({ ...year, since: new Date(2026, 0, 1) });
  await mount();
  await screen.findByTestId("chronicle-card");
  expect(screen.getByTestId("chronicle-span").props.children).toContain("1er janvier");
  expect(screen.getByTestId("chronicle-span").props.children).toContain("15 décembre");
  mockSettings.language = "en";
});
