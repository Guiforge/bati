import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import JournalScreen from "@/app/(tabs)/journal/index";
import "@/i18n";
import { consumePastSessionLink } from "@/src/pastSessionLink";
import config from "@/tamagui.config";

/**
 * The way into the form from the Journal: a first row in History, and the reminder's link
 * (`bati:///journal?add=past&day=...`). The link is untrusted and opens a sheet, nothing more.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const mockSetParams = jest.fn();
let mockParams: { add?: string; day?: string } = {};
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = require("react");
    useEffect(effect, [effect]);
  },
  useLocalSearchParams: () => mockParams,
  usePathname: () => "/journal",
}));
const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  setParams: (p: unknown) => mockSetParams(p),
};

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: "en" }),
}));
let mockStatus = "idle";
jest.mock("@/stores/session", () => ({
  useSessionStore: { getState: () => ({ status: mockStatus }) },
}));
jest.mock("@/components/chorus/screenCues", () => ({
  useScreenGuide: jest.fn(),
  useAmbientVisit: jest.fn(),
}));
jest.mock("@/components/chorus/VillagerLine", () => ({ VillagerLine: () => null }));
jest.mock("@/components/journal/stats/StatsView", () => ({ StatsView: () => null }));
jest.mock("@/components/journal/stats/useJournalStats", () => ({
  useJournalStats: () => ({ stats: null, reload: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock("@/db/completed", () => ({ listCompletedSessions: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/exercises", () => ({ listExercises: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/gps", () => ({ previewPathsFor: jest.fn().mockResolvedValue(new Map()) }));
jest.mock("@/db/journal", () => ({ getJournalVersion: jest.fn().mockReturnValue("v0") }));
jest.mock("@/db/quests", () => ({ listQuestTemplates: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/sessionPhotos", () => ({ photoSummaries: jest.fn().mockResolvedValue(new Map()) }));

// The sheet has its own suite; here it is the props the Journal hands it.
const mockSheet = jest.fn();
jest.mock("@/components/journal/PastSessionSheet", () => ({
  PastSessionSheet: (props: { open: boolean; day?: string }) => {
    mockSheet(props);
    return null;
  },
}));

const lastSheet = () => mockSheet.mock.calls.at(-1)?.[0] as { open: boolean; day?: string };

async function mount() {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <JournalScreen />
    </TamaguiProvider>,
  );
}

beforeEach(() => {
  mockSheet.mockClear();
  mockSetParams.mockClear();
  mockParams = {};
  mockStatus = "idle";
  // A link consumed by an earlier test must not hold this one back: no link resets the memory.
  consumePastSessionLink({});
});

test("History opens with a first row that writes a session down", async () => {
  await mount();
  expect(screen.queryByTestId("journal-add-past")).toBeNull(); // Stats is the default tab
  await fireEvent.press(screen.getByTestId("journal-tab-history"));
  const row = await screen.findByTestId("journal-add-past");
  expect(screen.getByText("Add a past session")).toBeTruthy();
  expect(lastSheet().open).toBe(false);
  await fireEvent.press(row);
  expect(lastSheet().open).toBe(true);
});

test("the reminder's link opens History and the sheet on the day it names, then clears itself", async () => {
  mockParams = { add: "past", day: "2026-10-16" };
  await mount();
  await waitFor(() => expect(lastSheet()).toMatchObject({ open: true, day: "2026-10-16" }));
  expect(mockSetParams).toHaveBeenCalledWith({ add: undefined, day: undefined });
  expect(await screen.findByTestId("journal-add-past")).toBeTruthy();
});

test("while a session is running the link does nothing but clear itself", async () => {
  mockStatus = "running";
  mockParams = { add: "past", day: "2026-10-16" };
  await mount();
  await waitFor(() => expect(mockSetParams).toHaveBeenCalled());
  expect(lastSheet().open).toBe(false);
});

test("any other value of add is not a link of ours", async () => {
  mockParams = { add: "yes" };
  await mount();
  expect(lastSheet().open).toBe(false);
  expect(mockSetParams).not.toHaveBeenCalled();
});
