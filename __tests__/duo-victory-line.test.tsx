import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { DuoVictoryLine } from "@/components/multiplayer/DuoVictoryLine";
import config from "@/tamagui.config";

/**
 * The victory's one duo line (LOT1-SPEC.md § 5.4): after a counted session and with a companion
 * only; one companion sends at once, several unfold one button each, and every button goes
 * through the card's own handler (E1, E4).
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
jest.mock("@/db/duo", () => ({
  sessionCounts: () => mockCounts(),
  myWeekDays: async () => [true, false, true, false, false, false, false],
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
