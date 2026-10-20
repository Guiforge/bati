import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { FlameBlock, Lead } from "@/components/journal/stats/StatsView";
import type { JournalStats } from "@/components/journal/stats/useJournalStats";
import type { FlameDetail } from "@/db/streaks";
import "@/i18n";
import config from "@/tamagui.config";

// A flame asleep says its count and "dormant", on every page the Journal has, and never says it
// ended: the count is not gone, and the hero back once a week is the one who must see it.

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));

const NOW = new Date(2026, 10, 20, 12);

const asleep: FlameDetail = {
  current: 0,
  dormant: 45,
  best: 45,
  bestEndedOn: new Date(2026, 9, 1, 12),
  bestIsCurrent: true,
  inWindow: 0,
  quota: 2,
  litUntil: null,
  litDays: 45,
  litDaysLast30: 0,
};

const statsOf = (flame: Partial<FlameDetail>) =>
  ({ now: NOW, flame: { ...asleep, ...flame }, week: Array(7).fill(null) }) as JournalStats;

const wrap = async (ui: React.ReactElement) =>
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      {ui}
    </TamaguiProvider>,
  );

test("the big figure is the sleeping count, labelled dormant, and the note says what keeps it", async () => {
  await wrap(<FlameBlock stats={statsOf({})} />);

  const block = screen.getByTestId("journal-flame");
  expect(block).toHaveTextContent("45 dormant", { exact: false });
  expect(block).toHaveTextContent("Every session or outing keeps it dormant.", { exact: false });
  expect(block).toHaveTextContent("2 more light it.", { exact: false });
  expect(block).toHaveTextContent("This is your best flame.", { exact: false });
  expect(block).not.toHaveTextContent("ended", { exact: false });
});

test("a session in the window does not hide the count: the guard on 'lit 0' comes after", async () => {
  await wrap(<FlameBlock stats={statsOf({ inWindow: 1 })} />);

  const block = screen.getByTestId("journal-flame");
  expect(block).toHaveTextContent("45 dormant", { exact: false });
  expect(block).toHaveTextContent("1 more lights it.", { exact: false });
});

test("a flame that is not asleep keeps the old reading", async () => {
  await wrap(
    <FlameBlock
      stats={statsOf({ dormant: 0, current: 7, litUntil: NOW, inWindow: 2, bestIsCurrent: false })}
    />,
  );

  const block = screen.getByTestId("journal-flame");
  expect(block).toHaveTextContent("7 days lit", { exact: false });
  expect(block).not.toHaveTextContent("dormant", { exact: false });
});

test("a rest day opens on the sleeping flame, and not on the quota", async () => {
  await wrap(<Lead stats={statsOf({})} mode="rest" />);

  expect(screen.getByTestId("journal-lead")).toHaveTextContent(
    "Nothing today. Your 45-day flame is dormant.",
    { exact: false },
  );
});

test("a rest day with the flame out and nothing asleep still says how to light it", async () => {
  await wrap(<Lead stats={statsOf({ dormant: 0 })} mode="rest" />);

  expect(screen.getByTestId("journal-lead")).toHaveTextContent(
    "in seven days light the flame again",
    { exact: false },
  );
});

test("a flame asleep says the two days its count can be checked against", async () => {
  const stats = {
    ...statsOf({}),
    flameSpan: { from: new Date(2023, 9, 12, 12), to: new Date(2026, 9, 1, 12) },
  } as JournalStats;
  await wrap(<FlameBlock stats={stats} />);

  expect(screen.getByTestId("journal-flame")).toHaveTextContent(
    "Lit from Oct 12, 2023 to Oct 1, 2026.",
    { exact: false },
  );
});

test("a lit flame says the day it was lit", async () => {
  const stats = {
    ...statsOf({ dormant: 0, current: 7, litUntil: NOW, inWindow: 2, bestIsCurrent: false }),
    flameSpan: { from: new Date(2023, 9, 12, 12), to: NOW },
  } as JournalStats;
  await wrap(<FlameBlock stats={stats} />);

  expect(screen.getByTestId("journal-flame")).toHaveTextContent("Lit since Oct 12, 2023.", {
    exact: false,
  });
});
