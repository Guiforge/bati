import { fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import JournalScreen from "@/app/(tabs)/journal/index";
import "@/i18n";
import type { ChronicleWindow } from "@/db/chronicle";
import config from "@/tamagui.config";

/**
 * The Journal's door to the year's chronicle. Whether there is one is `chronicleToOpen`'s call
 * (`__tests__/chronicle.test.ts`), read with the rest of the stats; here, that the door draws it.
 */
const mockPush = jest.fn();
const mockStats: { chronicle: ChronicleWindow | null } = { chronicle: null };

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
// The sheet that writes a session down is mounted (closed) under the Journal and asks for a Toast.
jest.mock("@/components/common/Toast", () => ({ useToast: () => ({ showSuccess: jest.fn() }) }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), setParams: jest.fn() }),
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
  usePathname: () => "/journal",
}));
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: "en" }),
}));
jest.mock("@/components/chorus/screenCues", () => ({
  useScreenGuide: jest.fn(),
  useAmbientVisit: jest.fn(),
}));
jest.mock("@/components/chorus/VillagerLine", () => ({ VillagerLine: () => null }));
jest.mock("@/components/journal/stats/StatsView", () => ({ StatsView: () => null }));
jest.mock("@/components/journal/stats/useJournalStats", () => ({
  useJournalStats: () => ({ stats: mockStats, reload: jest.fn() }),
}));
jest.mock("@/db/completed", () => ({ listCompletedSessions: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/exercises", () => ({ listExercises: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/gps", () => ({ previewPathsFor: jest.fn().mockResolvedValue(new Map()) }));
jest.mock("@/db/journal", () => ({ getJournalVersion: jest.fn().mockReturnValue("v0") }));
jest.mock("@/db/quests", () => ({ listQuestTemplates: jest.fn().mockResolvedValue([]) }));

async function mountWith(chronicle: ChronicleWindow | null) {
  mockStats.chronicle = chronicle;
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <JournalScreen />
    </TamaguiProvider>,
  );
}

afterEach(() => jest.clearAllMocks());

test("a year to open names itself and opens the chronicle", async () => {
  await mountWith({ year: 2026, from: new Date(2026, 0, 1), to: new Date(2026, 11, 3) });
  await fireEvent.press(screen.getByText("Your 2026 in one picture"));
  expect(mockPush).toHaveBeenCalledWith("/chronicle");
});

test("a label that wraps stays centred in its button", async () => {
  // Russian at 130 % text: "Твой 2026 год в одной картинке" wrapped to two lines, flush left
  // and touching the border, where every other language sat centred on one.
  await mountWith({ year: 2026, from: new Date(2026, 0, 1), to: new Date(2026, 11, 3) });
  const label = screen.getByText("Your 2026 in one picture");
  expect(Object.assign({}, ...[label.props.style].flat()).textAlign).toBe("center");
});

test("no year to open, no door", async () => {
  await mountWith(null);
  expect(screen.queryByTestId("journal-chronicle")).toBeNull();
});
