import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider, Theme } from "tamagui";
import SessionDetailScreen from "@/app/(tabs)/journal/[id]";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * What the detail offers on a row the hero typed: correct it, or take the typed part back, and the
 * removal says the right thing. A measured session keeps exactly the buttons it had.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: "5" }),
}));
jest.mock("@/components/journal/QuestLog", () => ({ QuestLog: () => null }));
jest.mock("@/components/journal/KillReport", () => ({ KillReport: () => null }));

let mockSession: Record<string, unknown> = {};
jest.mock("@/components/journal/sessionLog", () => ({
  readSession: () =>
    Promise.resolve({ status: "ready", log: { session: mockSession }, kill: null }),
}));
const mockConfirmForget = jest.fn();
const mockConfirmDrop = jest.fn();
jest.mock("@/components/journal/useConfirmForget", () => ({
  useConfirmForget: () => ({
    confirmForget: (...a: unknown[]) => mockConfirmForget(...a),
    confirmDropDistance: (...a: unknown[]) => mockConfirmDrop(...a),
    dialog: null,
  }),
}));
const mockSheet = jest.fn();
jest.mock("@/components/journal/PastSessionSheet", () => ({
  PastSessionSheet: (props: unknown) => {
    mockSheet(props);
    return null;
  },
}));

// Yesterday, not a fixed date: a hand-written session is correctable for a few days only, and a
// date written into the test ran out of window on its own.
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(18, 0, 0, 0);

const base = {
  id: 5,
  uuid: "u5",
  questId: null,
  userLevel: "medium",
  durationSeconds: 2700,
  xpEarned: 75,
  notes: "",
  performedAt: yesterday,
  leaguesM: null,
  movingSeconds: null,
  ascentM: null,
  outing: null,
  byHand: null,
  label: null,
  exercises: [],
};

async function mount(session: Record<string, unknown>) {
  mockSession = { ...base, ...session };
  await act(async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <Theme name="journal">
            <SessionDetailScreen />
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
}

const lastSheet = () =>
  mockSheet.mock.calls.at(-1)?.[0] as {
    open: boolean;
    mode?: string;
    target?: Record<string, unknown>;
  };

beforeEach(() => {
  for (const m of [mockConfirmForget, mockConfirmDrop, mockSheet]) m.mockClear();
});

test("a measured workout offers only to remove it", async () => {
  await mount({});
  expect(screen.getByTestId("journal-forget-session")).toBeTruthy();
  expect(screen.queryByTestId("journal-correct")).toBeNull();
  expect(screen.queryByTestId("journal-add-distance")).toBeNull();
});

test("a session written down offers to correct it, above Remove, and removes it with its own words", async () => {
  await mount({ byHand: "session", label: "gym" });
  await fireEvent.press(screen.getByTestId("journal-correct"));
  expect(lastSheet()).toMatchObject({
    open: true,
    mode: "entry",
    target: { id: 5, kind: "workout", label: "gym", durationSeconds: 2700 },
  });
  // Ends at its start plus its duration: 18:45.
  const end = lastSheet().target?.endedAt as Date;
  expect([end.getHours(), end.getMinutes()]).toEqual([18, 45]);

  await fireEvent.press(screen.getByTestId("journal-forget-session"));
  expect(mockConfirmForget).toHaveBeenCalledWith(5, expect.any(Function), { byHand: true });
});

test("an outing with no trace offers to add the distance", async () => {
  await mount({ outing: "walk", movingSeconds: null });
  await fireEvent.press(screen.getByTestId("journal-add-distance"));
  expect(lastSheet()).toMatchObject({ open: true, mode: "distance", target: { kind: "walk" } });
  expect(screen.queryByTestId("journal-correct")).toBeNull();
});

test("an outing with a typed distance offers to correct it and to take it back", async () => {
  await mount({ outing: "walk", movingSeconds: null, byHand: "distance", leaguesM: 3800 });
  expect(screen.queryByTestId("journal-add-distance")).toBeNull();
  await fireEvent.press(screen.getByTestId("journal-correct-distance"));
  expect(lastSheet()).toMatchObject({ mode: "distance", target: { distanceM: 3800 } });
  await fireEvent.press(screen.getByTestId("journal-drop-distance"));
  expect(mockConfirmDrop).toHaveBeenCalledWith(5, expect.any(Function));
});

test("a measured outing, GPS trace and all, offers no distance at all", async () => {
  await mount({ outing: "walk", movingSeconds: 1800, leaguesM: 2500 });
  expect(screen.queryByTestId("journal-add-distance")).toBeNull();
  expect(screen.queryByTestId("journal-correct-distance")).toBeNull();
});
