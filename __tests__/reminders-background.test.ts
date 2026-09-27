import { AppState, type AppStateStatus } from "react-native";

/**
 * The app going to the background plans the reminders again, once per write: `getChangeVersion`
 * says whether anything moved since the last plan that went through.
 */
let mockVersion = "1|2026-01-15";
jest.mock("@/db/changeVersion", () => ({ getChangeVersion: async () => mockVersion }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
// The listener reads nothing itself; the database behind the rest of the module stays out of it.
jest.mock("@/db/client", () => ({ db: {}, schema: jest.requireActual("@/db/schema") }));

describe("replanWhenBackgrounded", () => {
  let fire: (status: AppStateStatus) => void = () => undefined;
  const remove = jest.fn();
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(() => {
    jest.spyOn(AppState, "addEventListener").mockImplementation((_, listener) => {
      fire = listener as (status: AppStateStatus) => void;
      return { remove };
    });
  });

  const watch = (replan: () => Promise<void>) => {
    const { replanWhenBackgrounded } =
      require("@/src/reminders") as typeof import("@/src/reminders");
    return replanWhenBackgrounded(replan);
  };

  test("plans on the way out, not on the way in, and once per change", async () => {
    const replan = jest.fn().mockResolvedValue(undefined);
    watch(replan);

    fire("active");
    await flush();
    expect(replan).not.toHaveBeenCalled();

    fire("background");
    await flush();
    fire("background");
    await flush();
    expect(replan).toHaveBeenCalledTimes(1);

    mockVersion = "2|2026-01-15";
    fire("background");
    await flush();
    expect(replan).toHaveBeenCalledTimes(2);
  });

  test("a plan that failed is tried again on the next way out", async () => {
    mockVersion = "9|2026-01-16";
    const replan = jest.fn().mockRejectedValueOnce(new Error("busy")).mockResolvedValue(undefined);
    watch(replan);

    fire("background");
    await flush();
    fire("background");
    await flush();
    expect(replan).toHaveBeenCalledTimes(2);
    const { reportError } = jest.requireMock("@/src/reportError") as { reportError: jest.Mock };
    expect(reportError).toHaveBeenCalledWith("reminders.replan", expect.any(Error));
  });

  test("hands back the subscription so the layout can remove it", () => {
    watch(jest.fn()).remove();
    expect(remove).toHaveBeenCalled();
  });
});
