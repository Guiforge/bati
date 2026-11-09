import { act, cleanup, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { BackupSecurityRows } from "@/components/settings/BackupSecurityRows";
import en from "@/locales/en.json";
import config from "@/tamagui.config";

/**
 * Settings › Sync choosing "My other device" (PLAN.md U1, U2, U5): what it replaces is said
 * first, and the password step comes before the pairing sheet (rule L9). The sheets are other
 * tests' business (p2p-ui); here they only say whether they are open, and what they were given.
 */

type Vars = Record<string, unknown>;
function mockWords(key: string, vars?: Vars): string {
  const found = key
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);
  if (typeof found !== "string") return key;
  return found.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(vars?.[name] ?? ""));
}
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, o?: Vars) => mockWords(k, o) }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("expo-router", () => ({ usePathname: () => "/settings", useRouter: () => ({}) }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/i18n", () => ({ i18n: { language: "en" } }));
jest.mock("@/src/reportError", () => ({ reportError: () => {} }));
jest.mock("@/src/passwordReminders", () => ({ answerPasswordCheck: () => Promise.resolve() }));
jest.mock("@/src/deviceSync", () => ({ accountLabel: () => "cloud.example" }));
let mockFlag = true;
jest.mock("@/src/p2p/flag", () => ({
  get P2P_SYNC_ENABLED() {
    return mockFlag;
  },
}));

type Account = { kind: "folder" } | { kind: "p2p"; name: string; peerId: string } | null;
const mockSync: { account: Account } = { account: null };
jest.mock("@/hooks/useDeviceSync", () => ({
  useDeviceSync: () => ({
    account: mockSync.account,
    lost: null,
    running: false,
    rowValue: "x",
    backupFolder: null,
    reloadAccount: () => {},
  }),
}));
jest.mock("@/db/gps", () => ({ hasGpsHistory: () => Promise.resolve(false) }));
const mockEncryption = { status: "off" as "off" | "on" | "locked" };
jest.mock("@/hooks/useBackupEncryption", () => ({
  useBackupEncryption: () => ({
    status: mockEncryption.status,
    format: 3,
    updateOffered: false,
    wordsToCheck: false,
    canShowRecoveryAgain: false,
  }),
}));

type Dialog = {
  open: boolean;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
};
let mockDialog: Dialog | null = null;
jest.mock("@/components/common/ConfirmDialog", () => ({
  ConfirmDialog: (props: Dialog) => {
    mockDialog = props.open ? props : null;
    return null;
  },
}));
let mockSetupDevice: (() => void) | undefined;
jest.mock("@/components/settings/SyncSetupSheet", () => ({
  SyncSetupSheet: (props: { onDevice?: () => void }) => {
    mockSetupDevice = props.onDevice;
    return null;
  },
}));
let mockStatusDevice: (() => void) | undefined;
jest.mock("@/components/settings/SyncStatusSheet", () => ({
  SyncStatusSheet: (props: { onDevice?: () => void }) => {
    mockStatusDevice = props.onDevice;
    return null;
  },
}));
let mockEncryptionMode: unknown = null;
let mockEncryptionClose: () => void = () => {};
jest.mock("@/components/settings/EncryptionSheet", () => ({
  EncryptionSheet: (props: { mode: unknown; onClose: () => void }) => {
    mockEncryptionMode = props.mode;
    mockEncryptionClose = props.onClose;
    return null;
  },
}));
const mockP2p: { open: boolean; mode: string }[] = [];
jest.mock("@/components/settings/P2pSheet", () => ({
  P2pSheet: (props: { open: boolean; mode: string }) => {
    mockP2p.push({ open: props.open, mode: props.mode });
    return null;
  },
}));
jest.mock("@/components/settings/PasswordCheckFlow", () => ({ PasswordCheckFlow: () => null }));
jest.mock("@/components/settings/BackupSecretSheet", () => ({ BackupSecretSheet: () => null }));
jest.mock("@/components/settings/LastBackupLine", () => ({ LastBackupLine: () => null }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const tree = () => (
  <SafeAreaProvider initialMetrics={METRICS}>
    <TamaguiProvider config={config} defaultTheme="dark">
      <BackupSecurityRows disabled={false} autoFolder={null} onLocalCopy={() => {}} />
    </TamaguiProvider>
  </SafeAreaProvider>
);
const pairingOpen = () => mockP2p.some((p) => p.open && p.mode === "pair");

beforeEach(() => {
  mockFlag = true;
  mockSync.account = null;
  mockEncryption.status = "on";
  mockDialog = null;
  mockEncryptionMode = null;
  mockP2p.length = 0;
});
afterEach(cleanup);

describe("replacing what sync was on (U2)", () => {
  test("a server or folder account: the replacement is said first, and Replace opens pairing", async () => {
    mockSync.account = { kind: "folder" };
    await render(tree());
    await act(async () => mockStatusDevice?.());
    expect(mockDialog?.body).toBe(
      "This replaces sync with cloud.example. Your history stays on this device. From now on, sync happens when Bati is open on both devices.",
    );
    expect(mockDialog?.confirmLabel).toBe("Replace");
    expect(mockDialog?.cancelLabel).toBe("Keep cloud.example");
    expect(pairingOpen()).toBe(false);
    await act(async () => mockDialog?.onConfirm());
    expect(pairingOpen()).toBe(true);
  });

  test("keeping the server opens nothing", async () => {
    mockSync.account = { kind: "folder" };
    await render(tree());
    await act(async () => mockStatusDevice?.());
    await act(async () => mockDialog?.onCancel?.());
    expect(pairingOpen()).toBe(false);
  });

  test("an earlier link: 'This replaces the link with {old name}.'", async () => {
    mockSync.account = { kind: "p2p", name: "Pixel 7", peerId: "ab".repeat(32) };
    await render(tree());
    await act(async () => mockStatusDevice?.());
    expect(mockDialog?.body).toBe("This replaces the link with Pixel 7.");
    expect(mockDialog?.confirmLabel).toBe("Replace");
  });

  test("with nothing on, the door goes straight to pairing", async () => {
    await render(tree());
    await act(async () => mockSetupDevice?.());
    expect(mockDialog).toBeNull();
    expect(pairingOpen()).toBe(true);
  });
});

describe("U5: the password comes first (rule L9)", () => {
  test("encryption off: the password step opens, pairing only after it is set", async () => {
    mockEncryption.status = "off";
    const view = await render(tree());
    await act(async () => mockSetupDevice?.());
    expect(mockEncryptionMode).toEqual({ kind: "enable" });
    expect(pairingOpen()).toBe(false);

    // Closing the sheet with no password set pairs nothing.
    await act(async () => mockEncryptionClose());
    expect(pairingOpen()).toBe(false);

    await act(async () => mockSetupDevice?.());
    mockEncryption.status = "on";
    await view.rerender(tree());
    await act(async () => mockEncryptionClose());
    expect(pairingOpen()).toBe(true);
  });
});

test("U1: with the flag off no pairing sheet is mounted", async () => {
  mockFlag = false;
  await render(tree());
  expect(mockP2p).toHaveLength(0);
});
