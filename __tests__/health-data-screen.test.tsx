import { fireEvent, render, screen } from "@testing-library/react-native";
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
jest.mock("@/src/healthExport/sync", () => ({
  readHealthExportState: () => Promise.resolve(mockState.current),
  turnHealthExportOn: (port: HealthPort) => mockTurnOn(port),
  turnHealthExportOff: () => Promise.resolve(),
}));
jest.mock("@/src/healthExport/inStep", () => ({ syncHealthConnectQuietly: jest.fn() }));

const openSettings = jest.fn();
const port: HealthPort = {
  available: () => true,
  hasPermission: () => Promise.resolve(true),
  requestPermission: () => Promise.resolve(true),
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

const theSwitch = () => screen.findByRole("switch", { name: /Send my sessions to Health Connect/ });

test("off: the switch says so, and the line under it says where the data goes", async () => {
  await mount({ kind: "off" });
  expect((await theSwitch()).props["aria-checked"]).toBe(false);
  expect(screen.getByText(/stay on the phone/)).toBeTruthy();
  expect(screen.queryByTestId("health-export-pending")).toBeNull();
});

test("on, with sessions waiting: the count is said here and nowhere else", async () => {
  await mount({ kind: "on", pending: 2 });
  expect((await theSwitch()).props["aria-checked"]).toBe(true);
  expect(screen.getByText("2 sessions waiting")).toBeTruthy();
});

test("permission taken back in Android: off, with a line, and what waits is still counted", async () => {
  await mount({ kind: "withdrawn", pending: 1 });
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
  await mount({ kind: "on", pending: 0 });
  await fireEvent.press(await screen.findByTestId("health-export-open"));
  expect(openSettings).toHaveBeenCalledTimes(1);
});

test("Health Connect absent: no switch at all", async () => {
  await mount({ kind: "unavailable" });
  await screen.findByText("Devices and health data");
  expect(screen.queryByRole("switch")).toBeNull();
});

test("every other settings row is still read as a button", async () => {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <SettingRow icon={null} label="Language" onPress={() => {}} />
    </TamaguiProvider>,
  );
  expect(screen.getByRole("button", { name: "Language" })).toBeTruthy();
});
