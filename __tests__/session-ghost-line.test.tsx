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

type Case = {
  type: QuestTargetType;
  last: number;
  best: number;
  live: number;
  perSide?: boolean;
  /** What the screen's big number says. Defaults to `last`, the run of play before M-03. */
  objective?: number;
  recordAt?: number;
  seasonBest?: number | null;
};

const NOW = new Date("2026-10-16T12:00:00Z");

function line({ type, last, best, live, perSide, objective, recordAt, seasonBest }: Case) {
  return (
    <TamaguiProvider config={config} defaultTheme="dark">
      <GhostLine
        ghost={{
          last,
          best,
          at: 0,
          bestAt: recordAt ?? NOW.getTime(),
          seasonBest: seasonBest === undefined ? best : seasonBest,
          recent: [],
        }}
        type={type}
        live={live}
        objective={objective ?? last}
        now={NOW}
        perSide={perSide}
        reducedMotion
      />
    </TamaguiProvider>
  );
}

beforeEach(() => {
  mockSuccess.mockClear();
});

describe("the ghost line, while the set is still happening", () => {
  test("shows what there is to beat while the hold is short of it", async () => {
    await render(line({ type: "time", last: 39, best: 45, live: 40, objective: 60 }));

    expect(screen.getByText("Last time")).toBeTruthy();
    expect(screen.getByText("39s")).toBeTruthy();
    expect(screen.getByText("to beat")).toBeTruthy();
    expect(screen.getByText("46s")).toBeTruthy();
    expect(screen.queryByText("Past your best")).toBeNull();
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  // One side then the other (`0068`): the figures are one side's, said once at the end of the line.
  test("a per-side hold says per side once, after the last figure", async () => {
    await render(
      line({ type: "time", last: 39, best: 45, live: 40, perSide: true, objective: 60 }),
    );
    expect(screen.getByText("39s")).toBeTruthy();
    expect(screen.getByText("46s per side")).toBeTruthy();

    // Nothing to beat beyond the objective: "last time" is the last figure and carries it.
    await render(
      line({ type: "reps", last: 12, best: 12, live: 10, objective: 13, perSide: true }),
    );
    expect(screen.getByText("12 reps per side")).toBeTruthy();
  });

  test("equalling the best is not beating it", async () => {
    // `toBeat` is the best plus one, so a tie is short of it, as `checkForNewRecords` decides at
    // save time. A stamp on a tie would promise a record the victory screen then refuses to list.
    await render(line({ type: "time", last: 39, best: 45, live: 45, objective: 60 }));

    expect(screen.getByText("to beat")).toBeTruthy();
    expect(screen.queryByText("Past your best")).toBeNull();
  });

  test("one second past the best, the line it beat becomes the stamp, and it buzzes once", async () => {
    const { rerender } = await render(line({ type: "time", last: 39, best: 45, live: 44 }));
    expect(mockSuccess).not.toHaveBeenCalled();

    await rerender(line({ type: "time", last: 39, best: 45, live: 46 }));

    expect(screen.getByText("Past your best")).toBeTruthy();
    expect(screen.getByText("46s")).toBeTruthy();
    expect(mockSuccess).toHaveBeenCalledTimes(1);

    // Replaced, not stacked over: nothing on screen still offers 46s as the thing to beat, and
    // last time stays where it was.
    expect(screen.getByText("Last time")).toBeTruthy();
    expect(screen.getByText("39s")).toBeTruthy();
    expect(screen.queryByText("to beat")).toBeNull();

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

describe("the ghost line under a progressive objective", () => {
  test("objective 13, last time 12, record 12: last time is on screen when the set opens", async () => {
    // The normal case since M-03: the objective is the to-beat, the stamp shows from the open,
    // and "last time 12" must not go with it.
    await render(line({ type: "reps", last: 12, best: 12, live: 13, objective: 13 }));

    expect(screen.getByText("Last time")).toBeTruthy();
    expect(screen.getByText("12 reps")).toBeTruthy();
    expect(screen.getByText("Past your best")).toBeTruthy();
    expect(screen.getByText("13 reps")).toBeTruthy();
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  test("tapped back under, the to-beat half is not repeated when it is the objective", async () => {
    await render(line({ type: "reps", last: 12, best: 12, live: 11, objective: 13 }));

    expect(screen.getByText("Last time")).toBeTruthy();
    expect(screen.queryByText("to beat")).toBeNull();
    expect(screen.queryByText("Past your best")).toBeNull();
  });

  test("a record above the objective is never offered: the rule sets the evening, the record stays a fact", async () => {
    await render(line({ type: "reps", last: 12, best: 15, live: 13, objective: 13 }));

    expect(screen.queryByText("to beat")).toBeNull();
    expect(screen.queryByText("16 reps")).toBeNull();
    expect(screen.queryByText("Past your best")).toBeNull();

    // Past the record the stamp still shows: that is a fact, not an invitation.
    await render(line({ type: "reps", last: 12, best: 15, live: 16, objective: 13 }));
    expect(screen.getByText("Past your best")).toBeTruthy();
  });

  test("past an aged record the stamp names the season, and the number to beat is the season's", async () => {
    const old = NOW.getTime() - 300 * 24 * 60 * 60 * 1000;
    const aged = {
      type: "reps",
      last: 12,
      best: 30,
      objective: 20,
      recordAt: old,
      seasonBest: 14,
    } as const;

    await render(line({ ...aged, live: 14 }));
    expect(screen.getByText("to beat")).toBeTruthy();
    expect(screen.getByText("15 reps")).toBeTruthy();

    await render(line({ ...aged, live: 15 }));
    expect(screen.getByText("Past your season best")).toBeTruthy();
    expect(screen.queryByText("Past your best")).toBeNull();
  });
});
