import type { HealthPort } from "../src/healthExport/port";

/**
 * When the export runs. The victory screen must not wait for it, so a save only schedules it; and
 * where Health Connect is absent nothing listens at all.
 */
const mockSyncHealthConnect = jest.fn((_port: HealthPort) => Promise.resolve());
jest.mock("../src/healthExport/sync", () => ({
  syncHealthConnect: (port: HealthPort) => mockSyncHealthConnect(port),
}));
// The store is only watched here, never saved through: no database behind it.
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const { keepHealthExportInStep } =
  require("../src/healthExport/inStep") as typeof import("../src/healthExport/inStep");
const { useSessionStore } = require("../stores/session") as typeof import("../stores/session");

function port(available: boolean): HealthPort {
  return {
    available: () => available,
    hasPermission: () => Promise.resolve(true),
    requestPermission: () => Promise.resolve(true),
    upsert: () => Promise.resolve(),
    remove: () => Promise.resolve(),
    openSettings: () => {},
  };
}

const saved = { sessionId: 1 } as unknown as NonNullable<
  ReturnType<typeof useSessionStore.getState>["savedResult"]
>;

beforeEach(() => {
  jest.useFakeTimers();
  mockSyncHealthConnect.mockClear();
  useSessionStore.setState({ savedResult: null });
});

afterEach(() => {
  jest.useRealTimers();
});

test("a saved session is exported a few seconds later, never while the victory screen opens", () => {
  const watch = keepHealthExportInStep(port(true));
  useSessionStore.setState({ savedResult: saved });
  expect(mockSyncHealthConnect).not.toHaveBeenCalled();

  jest.advanceTimersByTime(3000);
  expect(mockSyncHealthConnect).toHaveBeenCalledTimes(1);
  watch.remove();
});

test("without Health Connect nothing is scheduled or called", () => {
  const watch = keepHealthExportInStep(port(false));
  useSessionStore.setState({ savedResult: saved });
  jest.advanceTimersByTime(10_000);
  expect(mockSyncHealthConnect).not.toHaveBeenCalled();
  watch.remove();
});
