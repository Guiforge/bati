import { act, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { StatusBand } from "@/components/common/StatusBand";
import { SessionCard } from "@/components/journal/SessionCard";
import { LevelBlock } from "@/components/journal/stats/StatsView";
import { fade, rawColors } from "@/constants/rawColors";
import "@/i18n";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
const mockSettings = { language: "en", distanceUnit: "metric" };
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: typeof mockSettings) => unknown) => selector(mockSettings),
}));

const wrap = (ui: React.ReactElement, top = 0) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top, left: 0, right: 0, bottom: 0 },
    }}
  >
    <TamaguiProvider config={config} defaultTheme="dark_journal">
      {ui}
    </TamaguiProvider>
  </SafeAreaProvider>
);

test("the Journal level card is the gold gauge with a gold XP figure", async () => {
  const stats = {
    level: {
      level: 3,
      currentLevelXp: 50,
      xpToNextLevel: 100,
      xpProgress: 33,
      title: { en: "Squire", fr: "", de: "", es: "" },
    },
    shelf: { unlocked: 1, total: 4, next: null },
    xpPerSession: null,
  };
  await act(async () => {
    await render(wrap(<LevelBlock stats={stats as never} />));
  });
  const fill = screen.getByTestId("journal-level-gauge-fill");
  expect(StyleSheet.flatten(fill.props.style).width).toBe("33%");
  expect(fill).toHaveStyle({ backgroundColor: fade(rawColors.resourceGold, 1) });
  const figure = screen.getByTestId("journal-level-xp");
  expect(figure).toHaveTextContent("50 / 150 XP");
  expect(StyleSheet.flatten(figure.props.style).color).toBe(rawColors.resourceGold);
});

test("a history row sets its +N XP segment in gold", async () => {
  const entry = {
    id: 1,
    questTitle: "Quest",
    performedAt: new Date("2026-01-01T10:00:00.000Z"),
    durationSeconds: 300,
    xpEarned: 42,
    userLevel: "medium",
    leaguesM: null,
    movingSeconds: null,
    outing: null,
    tracePoints: [],
  };
  await act(async () => {
    await render(wrap(<SessionCard entry={entry as never} />));
  });
  const xp = screen.getByTestId("journal-row-xp");
  expect(xp).toHaveTextContent("+42 XP");
  expect(StyleSheet.flatten(xp.props.style).color).toBe(rawColors.resourceGold);
});

test("the status band is an ink band that never takes a touch", async () => {
  await act(async () => {
    await render(wrap(<StatusBand />, 24));
  });
  const band = screen.getByTestId("status-band");
  expect(band.props.pointerEvents).toBe("none");
  const style = StyleSheet.flatten(band.props.style);
  expect(style.height).toBe(24);
  expect(style.backgroundColor).toBe(fade(rawColors.bgDark, 0.92));
});
