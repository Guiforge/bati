import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";

import JournalScreen from "@/app/(tabs)/journal/index";
import "@/i18n";
import config from "@/tamagui.config";

// The second audit: the Journal's title was 18 px on an 11 dp gutter with no glyph, while Quests
// and Adventures wear 20 px on a 20 dp gutter with a Lucide glyph.

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
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
  useJournalStats: () => ({ stats: null, reload: jest.fn() }),
}));
jest.mock("@/db/completed", () => ({ listCompletedSessions: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/exercises", () => ({ listExercises: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/gps", () => ({ previewPathsFor: jest.fn().mockResolvedValue(new Map()) }));
jest.mock("@/db/journal", () => ({ getJournalVersion: jest.fn().mockReturnValue("v0") }));
jest.mock("@/db/quests", () => ({ listQuestTemplates: jest.fn().mockResolvedValue([]) }));

test("the Journal title is the size of the Quests header, with a glyph before it", async () => {
  const view = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <JournalScreen />
    </TamaguiProvider>,
  );
  const title = view.getByText("Journal");
  expect(StyleSheet.flatten(title.props.style).fontSize).toBe(20);
  expect(view.getByTestId("journal-title-glyph")).toBeTruthy();
});
