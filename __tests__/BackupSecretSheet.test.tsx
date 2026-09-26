import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

/**
 * Opening a vault stretches the password for seconds on a slow phone. The sheet used to sit
 * unchanged, with the last error still on it, and a hero tapped again or gave up.
 */

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ usePathname: () => "/settings" }));
jest.mock("@/src/reportError", () => ({ reportError: () => {} }));

import { BackupSecretSheet } from "@/components/settings/BackupSecretSheet";
import config from "@/tamagui.config";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

test("while the password is being checked, the button says so and the old error is gone", async () => {
  let finish = () => {};
  const onSubmit = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <BackupSecretSheet
          request={{ open: true, wrong: true }}
          onSubmit={onSubmit}
          onCancel={() => {}}
          submitLabel="sync.useThisPassword"
          forgotHint="sync.secretForgot"
        />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
  expect(screen.getByText("backup.secretWrong")).toBeTruthy();
  expect(screen.getByText("sync.secretForgot")).toBeTruthy();

  await fireEvent.changeText(screen.getByTestId("backup-secret-input"), "tablette2026");
  await fireEvent.press(screen.getByTestId("backup-secret-submit"));

  expect(onSubmit).toHaveBeenCalledWith("tablette2026");
  expect(screen.getByText("backup.opening")).toBeTruthy();
  expect(screen.queryByText("backup.secretWrong")).toBeNull();

  await act(async () => finish());
  expect(screen.getByText("sync.useThisPassword")).toBeTruthy();
});
