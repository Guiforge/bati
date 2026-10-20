import { act, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { QuestLog, type QuestLogData } from "@/components/journal/QuestLog";
import { fade, rawColors } from "@/constants/rawColors";
import "@/i18n";
import config from "@/tamagui.config";

/** A history row opens onto the plate the hero earned: art, a gold date kicker, the Recitatif. */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

const mockSettingsStore: { language: string; distanceUnit: string; outingDisplay: object } = {
  language: "en",
  distanceUnit: "metric",
  outingDisplay: {},
};
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: typeof mockSettingsStore) => unknown) =>
    selector(mockSettingsStore),
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

function dataWith(value: number, questImage: string | null = null): QuestLogData {
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
    questImage,
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

test("opens on the quest's plate: gold date kicker in the body face, one Recitatif title", async () => {
  await act(async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <QuestLog data={dataWith(362, "assets/placeholder.jpg")} onChanged={() => {}} />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  expect(screen.getByTestId("session-details-screen")).toBeTruthy();
  const kicker = screen.getByTestId("session-details-kicker");
  const style = StyleSheet.flatten(kicker.props.style);
  expect(style.color).toBe(rawColors.resourceGold);
  expect(style.fontFamily).toBe(config.fonts.body.face[700].normal);
  expect(style.letterSpacing).toBe(2);
  const title = screen.getByText("The Squire's Awakening");
  expect(StyleSheet.flatten(title.props.style).fontFamily).toBe(
    config.fonts.heading.face[700].normal,
  );
  expect(title.props.accessibilityRole).toBe("header");
  expect(screen.getAllByText("The Squire's Awakening")).toHaveLength(1);
  expect(screen.queryByTestId("session-details-plate")).toBeNull();
});

test("a quest with no art gets a framed surface plate, and its XP line is the gold gauge", async () => {
  await act(async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <QuestLog data={dataWith(362)} onChanged={() => {}} />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  const plate = StyleSheet.flatten(screen.getByTestId("session-details-plate").props.style);
  expect(plate.backgroundColor).toBe(rawColors.surface); // `$surface` in the dark theme
  expect(plate.borderTopWidth).toBe(1);
  expect(plate.borderTopColor).toBe(rawColors.borderStrong);
  const fill = screen.getByTestId("session-details-xp-fill");
  expect(StyleSheet.flatten(fill.props.style).width).toBe("33%");
  expect(fill).toHaveStyle({ backgroundColor: fade(rawColors.resourceGold, 1) });
});

// "Pace or speed" is read in the journal's ground panel too: a walk set to km/h reads km/h there.
test.each([
  [{}, "10:00 /km"],
  [{ walk: { rate: "speed" } }, "6.0 km/h"],
])("the ground panel of a walk reads the hero's choice: %j", async (outingDisplay, value) => {
  mockSettingsStore.outingDisplay = outingDisplay;
  const data = dataWith(362);
  Object.assign(data.session, { outing: "walk", leaguesM: 2500, movingSeconds: 1500 });
  await act(async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <QuestLog data={data} onChanged={() => {}} />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  expect(screen.getByText(value)).toBeTruthy();
  mockSettingsStore.outingDisplay = {};
});

// A mixed quest stores no activity and gets the rounds, not the ground panel: no rate to disagree
// with the panel and the recap, which read the quest's own tab.
test("a mixed quest's journal page prints no pace or speed", async () => {
  const data = dataWith(362);
  Object.assign(data.session, { outing: null, leaguesM: 2500, movingSeconds: 1500 });
  await act(async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <QuestLog data={data} onChanged={() => {}} />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  expect(screen.queryByTestId("journal-ground")).toBeNull();
});

// No GPS, no measured moving time: the whole duration must not be passed off as "en mouvement".
test("an outing with no measured moving time shows no ground panel", async () => {
  const data = dataWith(362);
  Object.assign(data.session, {
    outing: "walk",
    leaguesM: 2500,
    movingSeconds: null,
    durationSeconds: 128,
  });
  await act(async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <QuestLog data={data} onChanged={() => {}} />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  expect(screen.queryByTestId("journal-ground")).toBeNull();
});
