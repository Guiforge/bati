import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import HealthDataScreen from "@/app/health-data";
import { SettingRow } from "@/components/settings/SettingRow";
import "@/i18n";
import type { HealthPort } from "@/src/healthExport/port";
import type { HealthExportState } from "@/src/healthExport/sync";
import config from "@/tamagui.config";

/**
 * Settings > Devices and health data, in each state it can be in. The switch follows what Android
 * says and TalkBack reads it as a switch with its state.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: (effect: () => void) => {
    const React = require("react");
    React.useEffect(effect, [effect]);
  },
}));
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

const mockState: { current: HealthExportState } = { current: { kind: "off" } };
const mockTurnOn = jest.fn((_port: HealthPort) => Promise.resolve(false));
const mockRouteOn = jest.fn((_port: HealthPort) => Promise.resolve(false));
const mockQuestion = jest.fn(() => Promise.resolve(false));
const mockStart = jest.fn(() => Promise.resolve());
const mockStop = jest.fn(() => Promise.resolve());
jest.mock("@/src/healthExport/sync", () => ({
  readHealthExportState: () => Promise.resolve(mockState.current),
  turnHealthExportOn: (port: HealthPort) => mockTurnOn(port),
  turnHealthExportOff: () => Promise.resolve(),
  turnHealthRouteOn: (port: HealthPort) => mockRouteOn(port),
  turnHealthRouteOff: () => Promise.resolve(),
  takeHistoryQuestion: () => mockQuestion(),
  startHealthHistory: () => mockStart(),
  stopHealthHistory: () => mockStop(),
}));
jest.mock("@/src/healthExport/inStep", () => ({ syncHealthConnectQuietly: jest.fn() }));

const openSettings = jest.fn();
const port: HealthPort = {
  available: () => true,
  hasPermission: () => Promise.resolve(true),
  requestPermission: () => Promise.resolve(true),
  hasRoutePermission: () => Promise.resolve(false),
  requestRoutePermission: () => Promise.resolve(false),
  upsert: () => Promise.resolve(),
  remove: () => Promise.resolve(),
  openSettings,
};

async function mount(state: HealthExportState) {
  mockState.current = state;
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <HealthDataScreen port={port} />
    </TamaguiProvider>,
  );
}

type Details = Omit<Extract<HealthExportState, { kind: "on" }>, "kind">;

function details(overrides: Partial<Details> = {}): Details {
  return {
    pending: 0,
    failed: 0,
    route: false,
    history: { running: false, done: 0, total: 0, left: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  for (const mock of [mockTurnOn, mockRouteOn, mockQuestion, mockStart, mockStop]) mock.mockClear();
});

const theSwitch = () => screen.findByRole("switch", { name: /Send my sessions to Health Connect/ });

test("off: the switch says so, and the line under it says where the data goes", async () => {
  await mount({ kind: "off" });
  expect((await theSwitch()).props["aria-checked"]).toBe(false);
  expect(screen.getByText(/stay on the phone/)).toBeTruthy();
  expect(screen.queryByTestId("health-export-pending")).toBeNull();
});

test("on, with sessions waiting: the count is said here and nowhere else", async () => {
  await mount({ kind: "on", ...details({ pending: 2 }) });
  expect((await theSwitch()).props["aria-checked"]).toBe(true);
  expect(screen.getByText("2 sessions waiting")).toBeTruthy();
});

test("permission taken back in Android: off, with a line, and what waits is still counted", async () => {
  await mount({ kind: "withdrawn", ...details({ pending: 1 }) });
  expect((await theSwitch()).props["aria-checked"]).toBe(false);
  expect(screen.getByTestId("health-export-withdrawn")).toBeTruthy();
  expect(screen.getByText("1 session waiting")).toBeTruthy();
});

test("permission refused: the switch goes back to off with one calm line", async () => {
  await mount({ kind: "off" });
  await fireEvent.press(await theSwitch());
  expect(await screen.findByTestId("health-export-refused")).toBeTruthy();
  expect((await theSwitch()).props["aria-checked"]).toBe(false);
});

test("the link opens Health Connect", async () => {
  await mount({ kind: "on", ...details() });
  await fireEvent.press(await screen.findByTestId("health-export-open"));
  expect(openSettings).toHaveBeenCalledTimes(1);
});

test("Health Connect absent: no switch at all", async () => {
  await mount({ kind: "unavailable" });
  await screen.findByText("Devices and health data");
  expect(screen.queryByRole("switch")).toBeNull();
});

const routeSwitch = () => screen.findByRole("switch", { name: /With the GPS route/ });

test("the route option and past sessions exist only while the switch is on", async () => {
  await mount({ kind: "off" });
  await theSwitch();
  expect(screen.queryByTestId("health-export-route")).toBeNull();
  expect(screen.queryByTestId("health-export-history")).toBeNull();
});

test("withdrawn in Android: the switch reads off, so nothing is offered under it", async () => {
  await mount({
    kind: "withdrawn",
    ...details({ pending: 1, history: { running: false, done: 0, total: 5, left: 5 } }),
  });
  expect((await theSwitch()).props["aria-checked"]).toBe(false);
  expect(screen.queryByTestId("health-export-route")).toBeNull();
  expect(screen.queryByTestId("health-export-history")).toBeNull();
  expect(screen.getByText("1 session waiting")).toBeTruthy();
});

test("on: the route option is a switch, off by default, with its one line", async () => {
  await mount({ kind: "on", ...details() });
  expect((await routeSwitch()).props["aria-checked"]).toBe(false);
  expect(screen.getByText(/the apps you allow can read it/)).toBeTruthy();
});

test("route refused: the option goes back to off with a calm line", async () => {
  await mount({ kind: "on", ...details() });
  await fireEvent.press(await routeSwitch());
  expect(mockRouteOn).toHaveBeenCalledTimes(1);
  expect(await screen.findByText(/Your outings go without it/)).toBeTruthy();
  expect((await routeSwitch()).props["aria-checked"]).toBe(false);
});

test("the route permission is not asked by anything but the route option", async () => {
  await mount({ kind: "on", ...details() });
  await fireEvent.press(await theSwitch());
  expect(mockRouteOn).not.toHaveBeenCalled();
});

test("past sessions left: a quiet row starts sending them", async () => {
  await mount({
    kind: "on",
    ...details({ history: { running: false, done: 3, total: 10, left: 7 } }),
  });
  await fireEvent.press(await screen.findByTestId("health-export-history"));
  expect(mockStart).toHaveBeenCalledTimes(1);
});

test("past sessions running: progress in words, and a way to stop", async () => {
  await mount({
    kind: "on",
    ...details({ history: { running: true, done: 142, total: 310, left: 168 } }),
  });
  expect(await screen.findByText("Past sessions: 142 of 310")).toBeTruthy();
  expect(screen.queryByTestId("health-export-history")).toBeNull();
  await fireEvent.press(screen.getByTestId("health-export-history-stop"));
  expect(mockStop).toHaveBeenCalledTimes(1);
});

test("while past sessions go out, the count is read again every second", async () => {
  jest.useFakeTimers();
  try {
    await mount({
      kind: "on",
      ...details({ history: { running: true, done: 10, total: 300, left: 290 } }),
    });
    expect(await screen.findByText("Past sessions: 10 of 300")).toBeTruthy();
    mockState.current = {
      kind: "on",
      ...details({ history: { running: true, done: 30, total: 300, left: 270 } }),
    };
    await act(() => jest.advanceTimersByTimeAsync(1000));
    expect(screen.getByText("Past sessions: 30 of 300")).toBeTruthy();
  } finally {
    jest.useRealTimers();
  }
});

test("nothing left to send: no row", async () => {
  await mount({
    kind: "on",
    ...details({ history: { running: false, done: 4, total: 4, left: 0 } }),
  });
  await theSwitch();
  expect(screen.queryByTestId("health-export-history")).toBeNull();
});

test("refused entries are counted, without blame", async () => {
  await mount({ kind: "on", ...details({ failed: 2 }) });
  expect(await screen.findByText("2 sessions refused by Health Connect")).toBeTruthy();
});

test("switched on: the past sessions question, when the pipeline says to ask", async () => {
  mockTurnOn.mockResolvedValueOnce(true);
  mockQuestion.mockResolvedValueOnce(true);
  await mount({ kind: "off" });
  await fireEvent.press(await theSwitch());
  expect(await screen.findByText("Send your past sessions too?")).toBeTruthy();
  await fireEvent.press(screen.getByText("Yes, send them"));
  expect(mockStart).toHaveBeenCalledTimes(1);
});

test("switched on: no question when the pipeline says it was asked", async () => {
  mockTurnOn.mockResolvedValueOnce(true);
  mockQuestion.mockResolvedValueOnce(false);
  await mount({ kind: "off" });
  await fireEvent.press(await theSwitch());
  expect(mockQuestion).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Send your past sessions too?")).toBeNull();
});

test("every other settings row is still read as a button", async () => {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <SettingRow icon={null} label="Language" onPress={() => {}} />
    </TamaguiProvider>,
  );
  expect(screen.getByRole("button", { name: "Language" })).toBeTruthy();
});
