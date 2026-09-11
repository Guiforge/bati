import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { GhostLine } from "@/components/session/GhostLine";
import type { QuestTargetType } from "@/db/schema";
import config from "@/tamagui.config";

/**
 * The record is stamped on the set, not on the summary.
 *
 * Everything needed to say "this beats your best" was already on the session screen: the counter
 * says 50s, the line under it says best 45s, and nothing was said until the victory screen four
 * movements later, where the reward is attributed to the victory screen rather than to the set
 * that earned it.
 *
 * Three things are asserted in both directions. The stamp appears only when the value about to be
 * logged is strictly past the best. The line it replaces is gone when it does, because a stamp
 * stacked over "best 45s" would be the screen contradicting itself mid-set. And the crossing
 * buzzes once, on the edge, because this component re-renders on every tick of the session clock
 * and a hold stays past its record for as long as the hero holds it.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

// `mock`-prefixed: jest lifts this factory above every other declaration, so any other name
// reaches it as `undefined`.
const mockSuccess = jest.fn();
jest.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => ({ success: mockSuccess }),
}));

import "@/i18n";

type Case = { type: QuestTargetType; last: number; best: number; live: number };

function line({ type, last, best, live }: Case) {
  return (
    <TamaguiProvider config={config} defaultTheme="dark">
      <GhostLine ghost={{ last, best, at: 0 }} type={type} live={live} reducedMotion />
    </TamaguiProvider>
  );
}

beforeEach(() => {
  mockSuccess.mockClear();
});

describe("the ghost line, while the set is still happening", () => {
  test("shows what there is to beat while the hold is short of it", async () => {
    await render(line({ type: "time", last: 39, best: 45, live: 40 }));

    expect(screen.getByText("Last time")).toBeTruthy();
    expect(screen.getByText("39s")).toBeTruthy();
    expect(screen.getByText("best")).toBeTruthy();
    expect(screen.getByText("45s")).toBeTruthy();
    expect(screen.queryByText("Past your best")).toBeNull();
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  test("equalling the best is not beating it", async () => {
    // The same strict comparison `checkForNewRecords` uses at save time. A stamp on a tie would
    // promise a record the victory screen then refuses to list.
    await render(line({ type: "time", last: 39, best: 45, live: 45 }));

    expect(screen.getByText("best")).toBeTruthy();
    expect(screen.queryByText("Past your best")).toBeNull();
  });

  test("one second past the best, the line it beat becomes the stamp, and it buzzes once", async () => {
    const { rerender } = await render(line({ type: "time", last: 39, best: 45, live: 44 }));
    expect(mockSuccess).not.toHaveBeenCalled();

    await rerender(line({ type: "time", last: 39, best: 45, live: 46 }));

    expect(screen.getByText("Past your best")).toBeTruthy();
    expect(screen.getByText("46s")).toBeTruthy();
    expect(mockSuccess).toHaveBeenCalledTimes(1);

    // Replaced, not stacked over: nothing on screen still offers 45s as the thing to beat.
    expect(screen.queryByText("Last time")).toBeNull();
    expect(screen.queryByText("best")).toBeNull();
    expect(screen.queryByText("45s")).toBeNull();

    // A hold stays past its record for as long as it is held, and the clock keeps ticking.
    await rerender(line({ type: "time", last: 39, best: 45, live: 52 }));
    expect(screen.getByText("52s")).toBeTruthy();
    expect(mockSuccess).toHaveBeenCalledTimes(1);
  });

  test("reps are stamped in reps, and tapping back under takes the stamp away", async () => {
    // The stamp reads the value about to be logged, so it has to be able to leave: a hero who
    // decides 13 was optimistic has set nothing, and the screen must stop saying otherwise.
    const { rerender } = await render(line({ type: "reps", last: 12, best: 12, live: 12 }));
    expect(screen.getByText("Last time")).toBeTruthy();

    await rerender(line({ type: "reps", last: 12, best: 12, live: 13 }));
    expect(screen.getByText("Past your best")).toBeTruthy();
    expect(screen.getByText("13 reps")).toBeTruthy();

    await rerender(line({ type: "reps", last: 12, best: 12, live: 11 }));
    expect(screen.queryByText("Past your best")).toBeNull();
    expect(screen.getByText("Last time")).toBeTruthy();
  });

  test("a slot that opens already past the best stamps it without buzzing", async () => {
    // A quest prescribing 15 reps to a hero whose best is 12 starts ahead. Nothing was crossed,
    // so nothing sounds: the buzz is for the moment the hero passes the number, not for the
    // moment the movement appears on screen.
    await render(line({ type: "reps", last: 10, best: 12, live: 15 }));

    expect(screen.getByText("Past your best")).toBeTruthy();
    expect(mockSuccess).not.toHaveBeenCalled();
  });
});
