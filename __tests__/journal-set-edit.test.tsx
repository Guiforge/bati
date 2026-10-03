import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { QuestLog, type QuestLogData } from "@/components/journal/QuestLog";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * A forgotten hold, corrected from the session page: tap the set, step it, save. The page has to
 * call the one writer with the set's own row id and show what the journal now holds.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

const mockSettingsStore = { language: "en", distanceUnit: "metric" };
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: typeof mockSettingsStore) => unknown) =>
    selector(mockSettingsStore),
}));

const mockCorrect = jest.fn();
jest.mock("@/db/personalRecords", () => ({
  correctLoggedSet: (...args: unknown[]) => mockCorrect(...args),
}));

const exercise = {
  id: 7,
  enName: "Cobra Stretch",
  frName: "Cobra Stretch",
  deName: "Cobra Stretch",
  esName: "Cobra Stretch",
  imagePath: "exercises/push-ups.webp",
  style: "mobility",
};

function dataWith(value: number): QuestLogData {
  return {
    session: {
      id: 1,
      uuid: null,
      questId: null,
      userLevel: "novice",
      durationSeconds: 600,
      xpEarned: 100,
      notes: "",
      feedback: null,
      performedAt: new Date("2026-09-15T18:00:00Z"),
      leaguesM: null,
      movingSeconds: null,
      ascentM: null,
      outing: null,
      exercises: [
        {
          id: 55,
          roundIndex: 0,
          sortOrder: 0,
          result: { type: "time", value },
          notes: "",
          performedAt: new Date("2026-09-15T18:00:00Z"),
          exercise,
        },
      ],
    },
    questTitle: "The Squire's Awakening",
    questImage: null,
    trace: [],
    standing: null,
    records: [],
    shift: null,
    rung: null,
    latest: true,
    level: {
      level: 3,
      totalXp: 300,
      currentLevelXp: 50,
      xpToNextLevel: 100,
      xpProgress: 33,
      title: { en: "Squire", fr: "Écuyer", de: "Knappe", es: "Escudero" },
    },
  } as unknown as QuestLogData;
}

/** The page's job in miniature: reload the log when the editor says the row changed. */
// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, no fast refresh here
function Page() {
  const [value, setValue] = useState(362);
  return <QuestLog data={dataWith(value)} onChanged={() => setValue(35)} />;
}

test("tapping a logged set, correcting it and saving writes that row and shows the new value", async () => {
  mockCorrect.mockResolvedValue("updated");
  await act(async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <Page />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  expect(screen.getByText("6:02")).toBeTruthy();
  // A quest runs up to ten rounds: ten 44 dp tap targets on one row ran off the screen.
  const sets = StyleSheet.flatten(screen.getByTestId("journal-sets-7").props.style);
  expect(sets.flexWrap).toBe("wrap");
  expect(sets.flexShrink).toBe(1);

  await fireEvent.press(screen.getByTestId("journal-set-55"));
  await fireEvent.changeText(screen.getByTestId("journal-set-input"), "35");
  await fireEvent.press(screen.getByTestId("journal-set-save"));

  expect(mockCorrect).toHaveBeenCalledWith(55, 35);
  expect(await screen.findByText("35s")).toBeTruthy();
  expect(screen.queryByTestId("journal-set-editor")).toBeNull();
});
