import { render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import "@/i18n";
import config from "@/tamagui.config";
import { createTestDb, clientMock as mockClient } from "./helpers/testDb";

/**
 * Home reads what it may show from the journal (db/disclosure.ts): 0, 1 and 3 sessions give three
 * different Homes, and on day one there are at most ten touch targets (14 before P-05).
 *
 * The real HomeHeader, HomeStage, OathStrip, QuickActions, VillagerLine and NoticeSlot are
 * rendered over a real database. `home-drag-cancels-press.test.tsx` mocks them to `null`, which
 * would count zero targets.
 */

// The first require pulls the whole Home tree: slow on a cold cache.
jest.setTimeout(60_000);

const mockDb = createTestDb();

jest.mock("@/db/client", () => mockClient(mockDb));
// One router object: a new one per render would re-run every loader keyed on it.
const mockRouter = { push: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/",
  useIsFocused: () => true,
  useFocusEffect: (effect: () => undefined | (() => void)) => {
    const { useEffect } = require("react");
    useEffect(effect, [effect]);
  },
}));
// The sync account lives in the secure store, which a test has none of: no account, no notice.
jest.mock("@/src/deviceSync", () => ({
  lostSync: async () => null,
  syncHealth: async () => ({ lastSuccessAt: null, failure: null, failingSince: null }),
  lastMerge: async () => null,
  syncAccount: async () => null,
}));
jest.mock("@/modules/bati-reminders", () => ({
  isAvailable: () => false,
  getState: () => ({ enabled: false, log: [] }),
}));
jest.mock("@/modules/bati-location", () => ({
  getPermissionStatus: async () => ({ granted: true, canAskAgain: false }),
}));

function logSessions(n: number): void {
  mockDb.sqlite.exec("DELETE FROM completed_sessions");
  const insert = mockDb.sqlite.prepare(
    `INSERT INTO completed_sessions (id, userLevel, durationSeconds, xpEarned, performedAt)
     VALUES (?, 'medium', 1500, 100, ?)`,
  );
  for (let i = 1; i <= n; i++) {
    insert.run(i, Math.floor(Date.now() / 1000) - i * 86400 * 2);
  }
}

/** Every host node a thumb or TalkBack can press: role button, link or imagebutton. */
type Json = { props?: Record<string, unknown>; children?: (Json | string)[] | null };

/** Every host node a thumb or TalkBack can press: role button, link or imagebutton. */
function targets(): Json[] {
  const found: Json[] = [];
  const walk = (node: Json | Json[] | null) => {
    if (node === null) return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (["button", "link", "imagebutton"].includes(String(node.props?.accessibilityRole))) {
      found.push(node);
    }
    for (const child of node.children ?? []) if (typeof child !== "string") walk(child);
  };
  walk(screen.toJSON() as Json | Json[] | null);
  return found;
}

async function mountHome() {
  // Required here, not at the top: the screen reads the database module the mock above stands in for.
  const HomeScreen = (require("@/app/(tabs)/index") as typeof import("@/app/(tabs)/index")).default;
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 360, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <HomeScreen />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
  // Everything Home reads has landed once the outing tiles are on screen.
  await waitFor(() => expect(screen.getAllByLabelText(/^Start: /).length).toBeGreaterThan(0));
}

afterAll(() => mockDb.close());
beforeEach(() => {
  mockDb.sqlite.exec("DELETE FROM user_preferences WHERE key = 'oath'");
});

test("day one: no level, no oath strip, no goal chip, no replay, at most ten targets", async () => {
  logSessions(0);
  await mountHome();

  expect(screen.queryByTestId("home-oath-card")).toBeNull();
  expect(screen.queryByLabelText(/^Goal for/)).toBeNull();
  expect(screen.queryByTestId("home-replay")).toBeNull();
  expect(screen.queryByText(/^Level \d+/)).toBeNull();
  // The day-one guide is drawn before counting: a Home nobody sees would count fewer.
  await waitFor(() => expect(screen.getByTestId("villager-line-block")).toBeTruthy());
  expect(targets().length).toBeLessThanOrEqual(10);
  // Settings, village, stage door, Start, Details, three outing tiles. A guide on Home is a plain
  // `VillagerLine`, not the tappable cameo the Village draws, so it is not a target. Exact, so a
  // regression is loud.
  expect(targets().map((n) => n.props?.testID ?? n.props?.accessibilityLabel)).toHaveLength(7);
});

test("after one session: the level and the goal chips are there, the oath strip is not", async () => {
  logSessions(1);
  await mountHome();

  await waitFor(() => expect(screen.getByText(/^Level \d+/)).toBeTruthy());
  expect(screen.getAllByLabelText(/^Goal for/).length).toBeGreaterThan(0);
  expect(screen.queryByTestId("home-oath-card")).toBeNull();
});

test("after three sessions: the oath strip invites", async () => {
  logSessions(3);
  await mountHome();

  await waitFor(() => expect(screen.getByTestId("home-oath-card")).toBeTruthy());
});

test("an oath sworn before the third session keeps its strip", async () => {
  logSessions(1);
  mockDb.sqlite
    .prepare("INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('oath', ?)")
    .run(
      JSON.stringify({
        metric: "sessions",
        exerciseId: null,
        target: 10,
        swornAt: "2026-01-01T00:00:00.000Z",
        fulfilledAt: null,
      }),
    );
  await mountHome();

  await waitFor(() => expect(screen.getByTestId("home-oath-card")).toBeTruthy());
});

test("Home's sections never share a key", async () => {
  // The three sections are keyed on the light-week revision to remount together; one bare number
  // on all three put React's duplicate-key toast on every dev launch.
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  logSessions(0);
  await mountHome();
  const duplicates = error.mock.calls.filter((c) => String(c[0]).includes("same key"));
  error.mockRestore();
  expect(duplicates).toEqual([]);
});
