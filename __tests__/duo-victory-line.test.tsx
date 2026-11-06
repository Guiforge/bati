import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { DuoVictoryLine } from "@/components/multiplayer/DuoVictoryLine";
import config from "@/tamagui.config";

/**
 * The victory's one duo line (LOT1-SPEC.md § 5.4): after a counted session and with a companion
 * only; one companion sends at once, several unfold one button each, and every button goes
 * through the card's own handler (E1, E4). The session that fells a boss says it, once and naming
 * no one; with goals that differ, the line counts against the pair the Journal opens first
 * (decisions 7 and 9 of 06/11). `justFell` itself is proven on a real database in db-duo.test.ts.
 */
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, v?: Record<string, unknown>) => (v ? `${k} ${JSON.stringify(v)}` : k),
  }),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {} }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

const mockCounts = jest.fn();
const mockPairs = jest.fn();
const mockSend = jest.fn();
/** What each pair's week reads, by pair id; an ordinary week in progress when not set. */
let mockWeeks: Record<string, { mine: { hits: number; goal: number }; justFell?: boolean }> = {};
jest.mock("@/db/duo", () => ({
  sessionCounts: () => mockCounts(),
  myWeekDays: async () => [true, false, true, false, false, false, false],
  readDuoWeek: async (pair: { id: string; goal: number }) => ({
    result: "inProgress",
    theirs: null,
    justFell: false,
    mine: { hits: 2, goal: pair.goal },
    ...mockWeeks[pair.id],
  }),
  fallenTogether: async () => 5,
}));
jest.mock("@/db/pairs", () => ({ listPairs: () => mockPairs() }));
jest.mock("@/src/multiplayer/sendCoups", () => ({ sendCoups: (pair: unknown) => mockSend(pair) }));

const pair = (name: string) => ({ id: name, name, goal: 3 });

async function mount() {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <DuoVictoryLine sessionId={7} />
    </TamaguiProvider>,
  );
}

beforeEach(() => {
  mockSend.mockReset().mockResolvedValue(undefined);
  mockCounts.mockResolvedValue(true);
  mockPairs.mockResolvedValue([pair("Léo")]);
  mockWeeks = {};
});

test("the hit that fells the boss says it, with the count after the fall", async () => {
  mockWeeks = { Léo: { mine: { hits: 3, goal: 3 }, justFell: true } };
  await mount();
  expect(await screen.findByTestId("duo-victory-fact")).toHaveTextContent(
    'duo.victory_fell {"count":5}',
  );
});

test("two companions, one boss falls: said once, and no name in it", async () => {
  mockPairs.mockResolvedValue([pair("Léo"), pair("Inès")]);
  mockWeeks = { Inès: { mine: { hits: 3, goal: 3 }, justFell: true } };
  await mount();
  const fact = await screen.findByTestId("duo-victory-fact");
  expect(fact).toHaveTextContent('duo.victory_fell {"count":5}');
  expect(fact).not.toHaveTextContent(/Inès|Léo/);
  expect(screen.getAllByTestId("duo-victory-fact")).toHaveLength(1);
});

test("goals that differ: the goal of the pair the Journal opens first, not of the first pair", async () => {
  mockPairs.mockResolvedValue([pair("Léo"), { id: "Inès", name: "Inès", goal: 2 }]);
  // Inès's week is further along (2 of 2), so the Journal opens her card.
  await mount();
  expect(await screen.findByTestId("duo-victory-fact")).toHaveTextContent(
    'duo.victory_fact {"hits":2,"goal":2}',
  );
});

test("a counted session with one companion: the fact, and one tap sends to them", async () => {
  await mount();
  expect(await screen.findByTestId("duo-victory-fact")).toHaveTextContent(
    'duo.victory_fact {"hits":2,"goal":3}',
  );
  await fireEvent.press(screen.getByTestId("duo-victory-send"));
  expect(mockSend).toHaveBeenCalledWith(pair("Léo"));
});

test("several companions: the tap unfolds one button each, nothing is sent yet", async () => {
  mockPairs.mockResolvedValue([pair("Léo"), pair("Inès")]);
  await mount();
  await fireEvent.press(await screen.findByTestId("duo-victory-send"));
  expect(mockSend).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId("duo-victory-send-Inès"));
  expect(mockSend).toHaveBeenCalledWith(pair("Inès"));
});

test("a session that did not count, or no companion: no line at all", async () => {
  mockCounts.mockResolvedValue(false);
  await mount();
  // Absence proves nothing until the session has been asked about.
  await waitFor(() => expect(mockCounts).toHaveBeenCalled());
  expect(screen.queryByTestId("duo-victory")).toBeNull();

  mockPairs.mockClear().mockResolvedValue([]);
  await mount();
  await waitFor(() => expect(mockPairs).toHaveBeenCalled());
  expect(screen.queryByTestId("duo-victory")).toBeNull();
});
