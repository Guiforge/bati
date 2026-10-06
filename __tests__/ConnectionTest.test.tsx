import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

/**
 * "Test the connection": one line per question the server answered, the reason it gave when it
 * refused, and a copy of it that carries no address, no account and no password.
 */

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k} ${JSON.stringify(o)}` : k),
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
const mockCopied: string[] = [];
jest.mock("expo-clipboard", () => ({
  setStringAsync: (value: string) =>
    Promise.resolve().then(() => {
      mockCopied.push(value);
      return true;
    }),
}));
jest.mock("@/src/reportError", () => ({ reportError: () => {} }));
jest.mock("@/src/updateCheck", () => ({ appVersion: "9.9.9" }));

import { ConnectionTest } from "@/components/settings/ConnectionTest";
import type { DiagnosticStep } from "@/src/cloudSync";
import config from "@/tamagui.config";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const view = (run: () => Promise<DiagnosticStep[]>) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <ConnectionTest run={run} />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

const REFUSED: DiagnosticStep[] = [
  { id: "reach", ok: true, status: 200 },
  { id: "folder", ok: true, status: 405 },
  { id: "list", ok: false, status: 400, kind: "server", reason: "Invalid path" },
];

beforeEach(() => {
  mockCopied.length = 0;
});

test("shows nothing until it is asked", async () => {
  await view(() => Promise.resolve(REFUSED));

  expect(screen.getByTestId("sync-test")).toBeTruthy();
  expect(screen.queryAllByTestId("sync-test-step")).toHaveLength(0);
});

test("lists each step with its status, and the reason the server gave for the one it refused", async () => {
  await view(() => Promise.resolve(REFUSED));

  await fireEvent.press(screen.getByTestId("sync-test"));

  await waitFor(() => expect(screen.getAllByTestId("sync-test-step")).toHaveLength(3));
  const labels = screen.getAllByTestId("sync-test-step").map((n) => n.props.accessibilityLabel);
  expect(labels).toEqual([
    "sync.test.passed sync.test.reach.ok (HTTP 200)",
    "sync.test.passed sync.test.folder.ok (HTTP 405)",
    "sync.test.failed sync.test.list.fail (HTTP 400)",
  ]);
  expect(screen.getByText(/Invalid path/)).toBeTruthy();
});

test("copies the result with the app's version and nothing about the hero", async () => {
  await view(() => Promise.resolve(REFUSED));
  await fireEvent.press(screen.getByTestId("sync-test"));
  await waitFor(() => expect(screen.getByTestId("sync-test-copy")).toBeTruthy());

  await fireEvent.press(screen.getByTestId("sync-test-copy"));

  await waitFor(() => expect(mockCopied).toHaveLength(1));
  expect(mockCopied[0]).toContain("Bati 9.9.9");
  expect(mockCopied[0]).toContain("X sync.test.list.fail (HTTP 400)");
  expect(mockCopied[0]).toContain("Invalid path");
  expect(mockCopied[0]).not.toMatch(/https?:|password|@/i);
  await waitFor(() => expect(screen.getByText("sync.test.copied")).toBeTruthy());
});

test("says there is nothing to test when the answer is empty", async () => {
  await view(() => Promise.resolve([]));

  await fireEvent.press(screen.getByTestId("sync-test"));

  await waitFor(() => expect(screen.getByTestId("sync-test-nothing")).toBeTruthy());
  expect(screen.queryByTestId("sync-test-copy")).toBeNull();
});

test("a second press runs it again, and does not run while it is running", async () => {
  let release: (steps: DiagnosticStep[]) => void = () => {};
  const run = jest.fn(
    () =>
      new Promise<DiagnosticStep[]>((resolve) => {
        release = resolve;
      }),
  );
  await view(run);

  await fireEvent.press(screen.getByTestId("sync-test"));
  await fireEvent.press(screen.getByTestId("sync-test"));
  expect(run).toHaveBeenCalledTimes(1);
  expect(screen.getByText("sync.test.running")).toBeTruthy();

  release(REFUSED);
  await waitFor(() => expect(screen.getAllByTestId("sync-test-step")).toHaveLength(3));
  await fireEvent.press(screen.getByTestId("sync-test"));
  expect(run).toHaveBeenCalledTimes(2);
});
