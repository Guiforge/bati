import { render, screen } from "@testing-library/react-native";
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
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
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
  ...over,
});

// Awaited, always: RNTL's `render` is async here and `screen` throws "render function has not
// been called" on every query if it is not.
async function mount(offer: RecoverableSession) {
  return await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <SessionRecoveryCard
        session={offer}
        onRecover={async () => true}
        onDiscard={async () => undefined}
      />
    </TamaguiProvider>,
  );
}

describe("SessionRecoveryCard", () => {
  beforeEach(() => {
    mockUnit = "metric";
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
