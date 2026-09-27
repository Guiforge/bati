import { AppState, type AppStateStatus } from "react-native";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

/**
 * `keepRemindersInStep`, which the root layout mounts once: a plan whenever whether a session holds
 * today changes, and one on the way out after any write (docs/designs/rappels.md, "Quand on
 * recalcule"). Each plan starts by reading the native state, so that read is what is counted here.
 */
type Hold = { status: string; savedSessionId: number | null };
const initial: Hold = { status: "idle", savedSessionId: null };
const mockStore = create<Hold>()(subscribeWithSelector(() => initial));
jest.mock("@/stores/session", () => ({ useSessionStore: mockStore }));

const mockGetState = jest.fn(() => ({ enabled: false, resumeDate: null, log: [] }));
jest.mock("@/modules/bati-reminders", () => ({
  isAvailable: () => true,
  getState: () => mockGetState(),
}));

let mockVersion = "1|2026-01-15";
jest.mock("@/db/changeVersion", () => ({ getChangeVersion: async () => mockVersion }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/db/client", () => ({ db: {}, schema: jest.requireActual("@/db/schema") }));

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("keepRemindersInStep", () => {
  let fire: (status: AppStateStatus) => void = () => undefined;
  const removeAppState = jest.fn();
  let subscription: { remove(): void };

  beforeEach(() => {
    jest.spyOn(AppState, "addEventListener").mockImplementation((_, listener) => {
      fire = listener as (status: AppStateStatus) => void;
      return { remove: removeAppState };
    });
    mockStore.setState({ status: "idle", savedSessionId: null });
    const { keepRemindersInStep } = require("@/src/reminders") as typeof import("@/src/reminders");
    subscription = keepRemindersInStep();
    mockGetState.mockClear();
  });

  afterEach(() => subscription.remove());

  test("a session starting, and its victory being saved, each plan again", async () => {
    mockStore.setState({ status: "countdown" });
    await flush();
    expect(mockGetState).toHaveBeenCalledTimes(1);

    mockStore.setState({ status: "running" });
    mockStore.setState({ status: "finished" });
    await flush();
    expect(mockGetState).toHaveBeenCalledTimes(1);

    mockStore.setState({ savedSessionId: 42 });
    await flush();
    expect(mockGetState).toHaveBeenCalledTimes(2);
  });

  test("an unsaved victory quit gives today back", async () => {
    mockStore.setState({ status: "finished" });
    await flush();
    mockGetState.mockClear();
    mockStore.setState({ status: "idle" });
    await flush();
    expect(mockGetState).toHaveBeenCalledTimes(1);
  });

  test("plans on the way out, not on the way in, and once per change", async () => {
    fire("active");
    await flush();
    expect(mockGetState).not.toHaveBeenCalled();

    fire("background");
    await flush();
    fire("background");
    await flush();
    expect(mockGetState).toHaveBeenCalledTimes(1);

    mockVersion = "2|2026-01-15";
    fire("background");
    await flush();
    expect(mockGetState).toHaveBeenCalledTimes(2);
  });

  test("a plan that failed is a breadcrumb, and is tried again on the next way out", async () => {
    mockVersion = "9|2026-01-16";
    mockGetState.mockImplementationOnce(() => {
      throw new Error("busy");
    });
    fire("background");
    await flush();
    fire("background");
    await flush();
    expect(mockGetState).toHaveBeenCalledTimes(2);
    const { reportError } = jest.requireMock("@/src/reportError") as { reportError: jest.Mock };
    expect(reportError).toHaveBeenCalledWith("reminders.replan", expect.any(Error));
  });

  test("a failed plan after a session change is a breadcrumb too", async () => {
    const { reportError } = jest.requireMock("@/src/reportError") as { reportError: jest.Mock };
    reportError.mockClear();
    mockGetState.mockImplementationOnce(() => {
      throw new Error("busy");
    });
    mockStore.setState({ status: "running" });
    await flush();
    expect(reportError).toHaveBeenCalledWith("reminders.replan", expect.any(Error));
  });

  test("removing it stops both", async () => {
    subscription.remove();
    expect(removeAppState).toHaveBeenCalled();
    mockStore.setState({ status: "running" });
    await flush();
    expect(mockGetState).not.toHaveBeenCalled();
  });
});
