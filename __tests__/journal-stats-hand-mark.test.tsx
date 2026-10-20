import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { FlameBlock, MonthBlock } from "@/components/journal/stats/StatsView";
import type { JournalStats } from "@/components/journal/stats/useJournalStats";
import type { PeriodFigures } from "@/db/journal";
import type { FlameDetail } from "@/db/streaks";
import "@/i18n";
import config from "@/tamagui.config";

// The Stats count a session written down like any other (the flame and the road read it), and say
// so in brackets, in the one words used everywhere: the same count must not hide where it comes from.

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));

const NOW = new Date(2026, 9, 18, 12);

const flame: FlameDetail = {
  current: 4,
  dormant: 0,
  best: 9,
  bestEndedOn: new Date(2026, 8, 1, 12),
  bestIsCurrent: false,
  inWindow: 3,
  quota: 2,
  litUntil: NOW,
  litDays: 20,
  litDaysLast30: 10,
};

const wrap = async (ui: React.ReactElement) =>
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      {ui}
    </TamaguiProvider>,
  );

test("the flame's window says how many of its sessions were typed, before the full stop", async () => {
  await wrap(
    <FlameBlock
      stats={{ now: NOW, flame, handInWindow: 1, week: Array(7).fill(null) } as JournalStats}
    />,
  );
  expect(screen.getByTestId("journal-flame")).toHaveTextContent(
    "3 sessions or outings in the last seven days (1 typed by hand).",
    { exact: false },
  );
});

test("with none typed the window reads as it always did", async () => {
  await wrap(
    <FlameBlock
      stats={{ now: NOW, flame, handInWindow: 0, week: Array(7).fill(null) } as JournalStats}
    />,
  );
  const block = screen.getByTestId("journal-flame");
  expect(block).toHaveTextContent("3 sessions or outings in the last seven days.", {
    exact: false,
  });
  expect(block).not.toHaveTextContent("typed by hand", { exact: false });
});

const figures = (over: Partial<PeriodFigures>): PeriodFigures => ({
  quests: 3,
  outings: 2,
  handOutings: 0,
  reps: 100,
  questSeconds: 1800,
  timedQuests: 3,
  outingSeconds: 3600,
  leaguesM: 5000,
  xp: 800,
  records: 0,
  latestRecord: null,
  ...over,
});

const monthStats = (current: PeriodFigures) =>
  ({
    now: NOW,
    month: {
      current,
      previous: figures({}),
      previousFrom: new Date(2026, 8, 1),
      previousTo: new Date(2026, 8, 18),
      days: 31,
      activity: new Map(),
      questDays: 3,
    },
  }) as unknown as JournalStats;

test("the month's outings say how many were written down", async () => {
  await wrap(<MonthBlock stats={monthStats(figures({ handOutings: 1 }))} />);
  expect(screen.getByText("2 outings (1 typed by hand)")).toBeTruthy();
});

test("an outing count with none typed carries no mark", async () => {
  await wrap(<MonthBlock stats={monthStats(figures({}))} />);
  expect(screen.getByText("2 outings")).toBeTruthy();
});
