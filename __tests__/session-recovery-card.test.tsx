import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { SessionRecoveryCard } from "@/components/session/SessionRecoveryCard";
import type { RecoverableSession } from "@/hooks/useSessionRecovery";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * The offer the hero comes back to, and the one figure it is allowed to make.
 *
 * A walk is one round of one movement, so the workout line reads "Round 1/1, exercise 1/1" for
 * every outing there will ever be, over a clock counting from a snapshot an expedition writes
 * once, at the start: seconds, for an hour on the road. Both true, neither about the walk.
 */

// The card's own imports reach the database through the recovery hook; none of it runs here.
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/gps", () => ({
  pointsOf: jest.fn(),
  deletePoints: jest.fn(),
  sweepOrphanedPoints: jest.fn(),
}));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => ({ mediumImpact: jest.fn(), lightImpact: jest.fn() }),
}));

let mockUnit: "metric" | "imperial" = "metric";
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (state: { distanceUnit: string }) => unknown) =>
    selector({ distanceUnit: mockUnit }),
}));

const session = (over: Partial<RecoverableSession> = {}): RecoverableSession => ({
  questTitle: "The Warden's Round",
  questId: 7,
  sessionUuid: "0192-walk",
  round: 1,
  roundTotal: 1,
  exercise: 1,
  exerciseTotal: 1,
  savedAt: new Date(1_800_000_000_000),
  elapsedTime: 4,
  leaguesM: null,
  isOuting: false,
  ...over,
});

// Awaited, always: RNTL's `render` is async here and `screen` throws "render function has not
// been called" on every query if it is not.
async function mount(offer: RecoverableSession, onFinish = async () => true) {
  return await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <SessionRecoveryCard
        session={offer}
        onRecover={async () => true}
        onFinish={onFinish}
        onDiscard={async () => undefined}
      />
    </TamaguiProvider>,
  );
}

describe("SessionRecoveryCard", () => {
  beforeEach(() => {
    mockUnit = "metric";
    mockPush.mockClear();
  });

  test("counts an interrupted walk in ground, not in rounds and seconds", async () => {
    await mount(session({ leaguesM: 1800 }));

    expect(screen.getByText("1.80 km already covered")).toBeTruthy();
    expect(screen.queryByText(/Round 1\/1/)).toBeNull();
    expect(screen.queryByText(/Time:/)).toBeNull();
  });

  // The ground is metres in the row and the hero's unit on the card, like every other distance.
  test("says that ground in the hero's own unit", async () => {
    mockUnit = "imperial";
    await mount(session({ leaguesM: 1609.344 }));

    expect(screen.getByText("1.00 mi already covered")).toBeTruthy();
  });

  test("a workout keeps the rounds and the clock, which are its own numbers", async () => {
    await mount(
      session({ round: 2, roundTotal: 3, exercise: 3, exerciseTotal: 5, elapsedTime: 600 }),
    );

    expect(screen.getByText("Progress: Round 2/3, Exercise 3/5")).toBeTruthy();
    expect(screen.queryByText(/already covered/)).toBeNull();
  });
});

/**
 * The third door, and the one thing that decides whether it is there.
 *
 * The notification's own "Finish" needs a live JS runtime; the case this covers is the one where
 * the OS took the process and left the service, so nothing concluded the walk. The card is the
 * only thing left that can — but only for a walk. A set of squats interrupted by a kill has no
 * witness of the hours in between, and offering to file it would be offering to invent it.
 */
describe("SessionRecoveryCard, finishing an outing", () => {
  beforeEach(() => {
    mockUnit = "metric";
    mockPush.mockClear();
  });

  test("a killed outing can be finished from the card", async () => {
    const finish = jest.fn(async () => true);
    await mount(session({ isOuting: true, leaguesM: 1800 }), finish);

    expect(screen.getByText("Finish the outing")).toBeTruthy();
    expect(
      screen.getByText("Your outing ran to its end without the app. Its trace knows what it did."),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText("Finish the outing"));
    await waitFor(() => {
      expect(finish).toHaveBeenCalled();
    });
    // The victory view is where a session is written, and it is on the session screen.
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/session");
    });
  });

  test("a workout is never offered a finish it has no witness for", async () => {
    await mount(session({ isOuting: false, round: 2, roundTotal: 3 }));

    expect(screen.queryByText("Finish the outing")).toBeNull();
    expect(screen.getByText("You have an unfinished session")).toBeTruthy();
  });

  test("a finish that did not take stays on Home", async () => {
    const finish = jest.fn(async () => false);
    await mount(session({ isOuting: true }), finish);

    await fireEvent.press(screen.getByText("Finish the outing"));
    await waitFor(() => {
      expect(finish).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
