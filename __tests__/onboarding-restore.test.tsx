import { fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import Presentation from "@/app/onboarding/presentation";
import config from "@/tamagui.config";

/**
 * The 2026-10-03 audit: first launch offered two restore links, "I already have a backup" and
 * "Find my hero on my cloud". One link now, and it asks which source. The two ways back are the
 * ones that already existed, so what is checked is that each is still reachable from it.
 */

const mockRunImport = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/hooks/useBackup", () => ({
  useBackup: () => ({
    busy: false,
    runImport: mockRunImport,
    secretRequest: { open: false, wrong: false },
    submitSecret: jest.fn(),
    cancelSecret: jest.fn(),
  }),
}));
jest.mock("@/components/settings/BackupSecretSheet", () => ({ BackupSecretSheet: () => null }));
// The cloud flow has its own wiring (useDeviceSync, the setup sheet); here it only has to be told
// to open.
jest.mock("@/components/settings/CloudRestoreLink", () => ({
  CloudRestoreLink: ({ open }: { open: boolean }) => {
    const { Text: T } = require("tamagui");
    return open ? <T testID="cloud-flow-open" /> : null;
  },
}));

function mount() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <Presentation />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

describe("onboarding restore", () => {
  beforeEach(() => mockRunImport.mockClear());

  it("offers one link, not two", async () => {
    const view = await mount();
    expect(view.getByTestId("onboarding-restore")).toHaveTextContent("onboarding.restore_cta");
    expect(view.queryByTestId("onboarding-restore-backup")).toBeNull();
    expect(view.queryByTestId("onboarding-restore-cloud")).toBeNull();
  });

  it("reaches the backup file from it", async () => {
    const view = await mount();
    await fireEvent.press(view.getByTestId("onboarding-restore"));
    await fireEvent.press(view.getByTestId("confirm-dialog-confirm"));
    expect(mockRunImport).toHaveBeenCalledTimes(1);
    expect(view.queryByTestId("cloud-flow-open")).toBeNull();
  });

  it("reaches the cloud from it", async () => {
    const view = await mount();
    await fireEvent.press(view.getByTestId("onboarding-restore"));
    await fireEvent.press(view.getByTestId("confirm-dialog-extra"));
    expect(view.getByTestId("cloud-flow-open")).toBeTruthy();
    expect(mockRunImport).not.toHaveBeenCalled();
  });
});
