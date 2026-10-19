import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import config from "@/tamagui.config";

/**
 * What the hero set up for the weeks must show on Home (P1, P2): the pause with its end date, the
 * accepted light week with its way out. The reads are mocked, the rule of who wins is the line's.
 */

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: { date?: string }) => `${k}${o?.date ? `:${o.date}` : ""}`,
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require("react");
    useEffect(() => cb(), [cb]);
  },
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/hooks/useHaptics", () => ({ useHaptics: () => ({ selection: jest.fn() }) }));

let mockPause: { from: string; until: string } | null = null;
jest.mock("@/db/pause", () => ({ getActivePause: async () => mockPause }));
let mockUntil: Date | null = null;
const mockEnd = jest.fn(() => {
  mockUntil = null;
  return Promise.resolve();
});
jest.mock("@/db/lightWeek", () => ({
  lightWeekUntil: async () => mockUntil,
  endLightWeek: () => mockEnd(),
}));

import { RhythmLine } from "@/components/home/RhythmLine";

const mount = () =>
  render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <RhythmLine />
    </TamaguiProvider>,
  );

beforeEach(() => {
  mockPause = null;
  mockUntil = null;
  mockPush.mockClear();
  mockEnd.mockClear();
});

test("says nothing when neither a pause nor a light week runs", async () => {
  await mount();
  await act(async () => {});
  expect(screen.queryByTestId("home-pause-line")).toBeNull();
  expect(screen.queryByTestId("light-week-note")).toBeNull();
});

test("a pause shows its end date and opens the screen that ends it", async () => {
  mockPause = { from: "2026-10-10", until: "2026-10-25" };
  await mount();
  await waitFor(() => expect(screen.getByTestId("home-pause-line")).toBeTruthy());
  expect(screen.getByText(/^home\.pause_on:/)).toBeTruthy();
  await fireEvent.press(screen.getByTestId("home-pause-line"));
  expect(mockPush).toHaveBeenCalledWith("/pause");
});

test("a light week is on show with a way back to the normal rhythm", async () => {
  mockUntil = new Date("2026-10-24T12:00:00");
  await mount();
  await waitFor(() => expect(screen.getByTestId("light-week-note")).toBeTruthy());
  await fireEvent.press(screen.getByTestId("light-week-end"));
  expect(mockEnd).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("light-week-note")).toBeNull();
});

test("during a pause only the pause is said", async () => {
  mockPause = { from: "2026-10-10", until: "2026-10-25" };
  mockUntil = new Date("2026-10-24T12:00:00");
  await mount();
  await waitFor(() => expect(screen.getByTestId("home-pause-line")).toBeTruthy());
  expect(screen.queryByTestId("light-week-note")).toBeNull();
});

test("ending the week tells Home once the write landed, so the tiles read it again", async () => {
  mockUntil = new Date("2026-10-24T12:00:00");
  const onEnded = jest.fn();
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <RhythmLine onLightWeekEnded={onEnded} />
    </TamaguiProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("light-week-note")).toBeTruthy());
  await fireEvent.press(screen.getByTestId("light-week-end"));
  await waitFor(() => expect(onEnded).toHaveBeenCalledTimes(1));
});
