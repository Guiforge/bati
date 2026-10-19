import { render, screen, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import JournalScreen from "@/app/(tabs)/journal/index";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * Home keeps the oath strip back until the third session (db/disclosure.ts). The Journal's Stats
 * tab carries the same strip from day one, so the door to swear one is a tab away, not gone.
 */
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
// The sheet that writes a session down is mounted (closed) under the Journal and asks for a Toast.
jest.mock("@/components/common/Toast", () => ({ useToast: () => ({ showSuccess: jest.fn() }) }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), setParams: jest.fn() }),
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
  useJournalStats: () => ({ stats: { chronicle: null }, reload: jest.fn() }),
}));
jest.mock("@/db/completed", () => ({ listCompletedSessions: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/exercises", () => ({ listExercises: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/gps", () => ({ previewPathsFor: jest.fn().mockResolvedValue(new Map()) }));
jest.mock("@/db/journal", () => ({ getJournalVersion: jest.fn().mockReturnValue("v0") }));
jest.mock("@/db/quests", () => ({ listQuestTemplates: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/oaths", () => ({
  getOathProgress: jest.fn().mockResolvedValue(null),
  oathNeedsExercise: () => false,
}));
jest.mock("@/hooks/useReloadOnChange", () => ({
  useReloadOnChange: (_key: string, load: (c: () => boolean) => unknown) => {
    require("react").useEffect(() => {
      load(() => false);
    }, [load]);
  },
}));

test("with no session at all, the Stats tab still offers the oath", async () => {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <JournalScreen />
    </TamaguiProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("home-oath-card")).toBeTruthy());
});
