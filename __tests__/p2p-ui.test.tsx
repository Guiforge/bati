import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
// biome-ignore lint/correctness/useReactNativePlatformComponents: the camera permission is Android only, and so is the sheet that asks it.
import { PermissionsAndroid } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import en from "@/locales/en.json";

/**
 * Device-to-device sync as the hero meets it (PLAN.md section 3, U1 to U15, Phase 1): the sheet, the
 * status, the third door. The device is mocked (the native module's edge: the session opener, the
 * network, the camera, the clipboard), never the rules under test: the code format, the group
 * check, the words and the actions are the real ones, and the strings are the real English ones.
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
jest.mock("expo-router", () => ({ usePathname: () => "/settings" }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/src/reportError", () => ({ reportError: () => {} }));

let mockFlag = true;
let mockInternetFlag = false;
jest.mock("@/src/p2p/flag", () => ({
  get P2P_SYNC_ENABLED() {
    return mockFlag;
  },
  get P2P_INTERNET_ENABLED() {
    return mockInternetFlag;
  },
}));

// The edge of the device: network, screen, clipboard, camera.
const mockNetwork = { isConnected: true, type: "WIFI" };
jest.mock("expo-network", () => ({
  getNetworkStateAsync: () => Promise.resolve({ ...mockNetwork }),
  NetworkStateType: { WIFI: "WIFI", ETHERNET: "ETHERNET" },
}));
const mockAwake = {
  activate: jest.fn((_tag: string) => Promise.resolve()),
  deactivate: jest.fn((_tag: string) => Promise.resolve()),
};
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: (tag: string) => mockAwake.activate(tag),
  deactivateKeepAwake: (tag: string) => mockAwake.deactivate(tag),
}));
const mockCopied = jest.fn((_text: string) => Promise.resolve(true));
jest.mock("expo-clipboard", () => ({ setStringAsync: (text: string) => mockCopied(text) }));
let mockScan: ((event: { nativeEvent: { text: string } }) => void) | null = null;
jest.mock("@/modules/bati-scanner", () => ({
  ScannerView: (props: { testID: string; onScan: typeof mockScan }) => {
    const { View } = require("react-native");
    mockScan = props.onScan;
    return <View testID={props.testID} />;
  },
}));

// The session opener is the engine's door; the engine has its own tests (p2p-session).
type Hooks = {
  onChange: (view: unknown) => void;
  onLinked: (link: unknown) => Promise<void>;
  onPeerFile: (passes: number) => void;
};
const mockOpened: { role: { kind: string; code?: unknown }; hooks: Hooks }[] = [];
const mockConfirm = jest.fn();
const mockCancel = jest.fn();
jest.mock("@/src/p2p/session", () => ({
  openSession: (role: { kind: string }, hooks: Hooks) => {
    mockOpened.push({ role, hooks });
    return { confirm: mockConfirm, cancel: mockCancel };
  },
}));
const mockConnect = jest.fn((_link: unknown) => Promise.resolve());
jest.mock("@/src/deviceSync", () => ({
  connectP2p: (link: unknown) => mockConnect(link),
  // What the server status sheet reads of an account.
  accountLabel: () => "files",
  syncFolderOf: () => ({ folder: "files", user: "" }),
  forgetPeer: () => Promise.resolve(),
  lastMerge: () => Promise.resolve(null),
  syncWifiOnly: () => Promise.resolve(mockWifiOnly),
  setSyncWifiOnly: () => Promise.resolve(),
}));
let mockLink: { name: string; peerId: string } | null = null;
let mockWifiOnly = false;
let mockInternet = false;
const mockSetInternet = jest.fn((on: boolean) => {
  mockInternet = on;
  return Promise.resolve();
});
jest.mock("@/src/p2p/link", () => ({
  ...jest.requireActual("@/src/p2p/link"),
  readLink: () => Promise.resolve(mockLink),
  internetOn: () => Promise.resolve(mockInternet),
  setInternet: (on: boolean) => mockSetInternet(on),
}));
let mockKept: { name: string; delete: jest.Mock }[] = [];
jest.mock("@/src/p2pSync", () => ({ keptCopies: () => mockKept }));

jest.mock("@/stores/sync", () => {
  const { create } = jest.requireActual("zustand");
  return { useSyncStore: create(() => ({ running: false, lastSyncAt: null, failure: null })) };
});
jest.mock("@/stores/session", () => {
  const { create } = jest.requireActual("zustand");
  return {
    isSessionLive: (status: string) => status !== "idle" && status !== "finished",
    useSessionStore: create(() => ({ status: "idle" })),
  };
});

// The app's dialog stands in as a probe: what it asks, and a way to answer it.
type Dialog = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
};
let mockDialog: Dialog | null = null;
jest.mock("@/components/common/ConfirmDialog", () => ({
  ConfirmDialog: (props: Dialog) => {
    mockDialog = props.open ? props : null;
    return null;
  },
}));

import { P2pSheet } from "@/components/settings/P2pSheet";
import { SyncSetupSheet } from "@/components/settings/SyncSetupSheet";
import { SyncStatusSheet } from "@/components/settings/SyncStatusSheet";
import { encodeCode, groupCode } from "@/src/p2p/code";
import { useSessionStore } from "@/stores/session";
import { useSyncStore } from "@/stores/sync";
import config from "@/tamagui.config";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const wrap = (node: React.ReactNode) => (
  <SafeAreaProvider initialMetrics={METRICS}>
    <TamaguiProvider config={config} defaultTheme="dark">
      {node}
    </TamaguiProvider>
  </SafeAreaProvider>
);

const onClose = jest.fn();
const onLinked = jest.fn();
const sheet = (mode: "pair" | "sync" = "pair") =>
  render(wrap(<P2pSheet open mode={mode} onClose={onClose} onLinked={onLinked} />));

const now = () => Math.floor(Date.now() / 1000);
const codeText = (expiresAt = now() + 600) =>
  encodeCode({
    expiresAt,
    token: new Uint8Array(32).fill(7),
    installId: "0123456789abcdef0123456789abcdef",
    deviceId: new Uint8Array(32).fill(9),
    name: "Pixel 7",
    lan: { port: 40_123, addresses: ["192.168.1.20"] },
  });

const last = () => {
  const opened = mockOpened[mockOpened.length - 1];
  if (!opened) throw new Error("no session was opened");
  return opened;
};
const emit = (view: unknown) => act(async () => last().hooks.onChange(view));
const press = (testID: string) => act(async () => fireEvent.press(screen.getByTestId(testID)));
const see = (text: string) => expect(screen.getByText(text)).toBeTruthy();

beforeEach(() => {
  mockFlag = true;
  mockInternetFlag = false;
  mockInternet = false;
  mockWifiOnly = false;
  mockNetwork.type = "WIFI";
  mockSetInternet.mockClear();
  mockOpened.length = 0;
  mockNetwork.isConnected = true;
  mockLink = null;
  mockKept = [];
  mockDialog = null;
  mockScan = null;
  for (const m of [mockConfirm, mockCancel, mockConnect, mockCopied, onClose, onLinked])
    m.mockClear();
  mockAwake.activate.mockClear();
  mockAwake.deactivate.mockClear();
  jest.spyOn(PermissionsAndroid, "request").mockResolvedValue("granted");
  useSessionStore.setState({ status: "idle" });
  useSyncStore.setState({
    running: false,
    lastSyncAt: null,
    failure: null,
    run: jest.fn(() => Promise.resolve()),
  } as never);
});
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

describe("U1: the third door", () => {
  const setup = () =>
    render(
      wrap(
        <SyncSetupSheet
          open
          context="settings"
          onClose={() => {}}
          onConnectNextcloud={() => Promise.resolve(true)}
          onCancelNextcloud={() => {}}
          onConnectDav={() => Promise.resolve(true)}
          onConnectFolder={() => Promise.resolve(true)}
          onTest={() => Promise.resolve([])}
          onDevice={onDevice}
        />,
      ),
    );
  const onDevice = jest.fn();

  test("with the flag off nothing new renders", async () => {
    mockFlag = false;
    await setup();
    expect(screen.queryByTestId("sync-door-device")).toBeNull();
  });

  test("with it on, 'My other device' says what it is and what its limit is, and opens pairing", async () => {
    await setup();
    see("My other device");
    see(
      "Sync with your other phone or tablet, on the same Wi-Fi. One device at a time: linking a new one replaces the old link.",
    );
    await press("sync-door-device");
    expect(onDevice).toHaveBeenCalledTimes(1);
  });

  test("a server account's status offers the way over, only with the flag on", async () => {
    const account = { kind: "folder" as const, uri: "content://x" };
    const status = () =>
      render(
        wrap(
          <SyncStatusSheet
            open
            account={account}
            onClose={() => {}}
            onSyncNow={() => {}}
            onStop={() => {}}
            onTest={() => Promise.resolve([])}
            local={{ folder: null, onPress: () => {} }}
            onDevice={() => {}}
          />,
        ),
      );
    mockFlag = false;
    await status();
    expect(screen.queryByTestId("sync-use-device")).toBeNull();
    await cleanup();
    mockFlag = true;
    await status();
    expect(screen.getByTestId("sync-use-device")).toBeTruthy();
  });
});

describe("U3: showing a code (A)", () => {
  test("the code, its accessible name, its single use, then 'Link {name} ({suffix})?' and 'Linked with'", async () => {
    await sheet();
    await press("p2p-show");
    expect(last().role).toEqual({ kind: "show" });

    await emit({ step: "code", text: "QRTEXT", expiresAt: now() + 600 });
    expect(screen.getByLabelText("Pairing code, works once for 10 minutes")).toBeTruthy();
    see("Open Bati on your other device, on the same Wi-Fi, and scan this code.");
    see("This code works once, for 10 minutes.");

    // Two phones named alike are told apart by the end of their ID (A5b).
    await emit({ step: "confirm", name: "Pixel 7", suffix: "AB12", again: false });
    see("Link Pixel 7 (AB12)?");
    await press("p2p-link");
    expect(mockConfirm).toHaveBeenCalledWith(true);

    const link = { name: "Pixel 7", peerId: "ab".repeat(32) };
    await act(async () => last().hooks.onLinked(link));
    expect(mockConnect).toHaveBeenCalledWith(link);
    expect(onLinked).toHaveBeenCalledTimes(1);
    await emit({ step: "connected", name: "Pixel 7" });
    see("Linked with Pixel 7.");
    see("Syncing with Pixel 7. Keep both screens open.");
  });

  test("'Not this one' answers no", async () => {
    await sheet();
    await press("p2p-show");
    await emit({ step: "confirm", name: "Pixel 7", suffix: "AB12", again: false });
    await press("p2p-not-this");
    expect(mockConfirm).toHaveBeenCalledWith(false);
  });

  test("U2b: the same device after a reinstall only asks 'Link {name} again?'", async () => {
    await sheet("pair");
    await press("p2p-show");
    await emit({ step: "confirm", name: "Pixel 7", suffix: "CD34", again: true });
    expect(screen.getByText("Link Pixel 7 again?")).toBeTruthy();
  });
});

describe("U4: the code as text, and the camera (B)", () => {
  test("the text form is the grouped code, with Copy", async () => {
    await sheet();
    await press("p2p-show");
    const text = codeText();
    await emit({ step: "code", text, expiresAt: now() + 600 });
    await press("p2p-as-text");
    expect(screen.getByTestId("p2p-code-text").props.children).toBe(groupCode(text));
    await press("p2p-copy");
    expect(mockCopied).toHaveBeenCalledWith(groupCode(text));
  });

  test("a scanned code opens a session as B, with that code", async () => {
    await sheet();
    await press("p2p-scan");
    await waitFor(() => expect(screen.getByTestId("p2p-scanner")).toBeTruthy());
    see("Scan the code on your other device");
    await act(async () => mockScan?.({ nativeEvent: { text: codeText() } }));
    await waitFor(() => expect(mockOpened).toHaveLength(1));
    expect(last().role.kind).toBe("scan");
    await emit({ step: "waiting" });
    see("Waiting for Pixel 7 to confirm.");
  });

  test("camera refused: the reason, 'Allow the camera' and the typed way", async () => {
    jest.spyOn(PermissionsAndroid, "request").mockResolvedValue("denied");
    await sheet();
    await press("p2p-scan");
    await waitFor(() => see("Bati needs the camera to read the code. Nothing is recorded."));
    expect(screen.queryByTestId("p2p-scanner")).toBeNull();
    see("Allow the camera");
    see("Can't scan? Type the code");
  });

  test("a typed code with spaces opens the session; a typo names its group and keeps the field", async () => {
    jest.spyOn(PermissionsAndroid, "request").mockResolvedValue("denied");
    await sheet();
    await press("p2p-scan");
    await press("p2p-type-link");
    see("Type or paste the code shown on your other device.");
    const field = screen.getByTestId("p2p-type-field");

    const groups = groupCode(codeText()).split(" ");
    const swapped = (groups[1]?.[0] === "A" ? "B" : "A") + (groups[1] ?? "").slice(1);
    const wrong = [groups[0], swapped, ...groups.slice(2)].join(" ");
    await act(async () => fireEvent.changeText(field, wrong));
    await press("p2p-type-use");
    expect(screen.getByTestId("p2p-type-problem").props.children).toBe(
      "There's a typo in group 2. Check it and try again.",
    );
    expect(screen.getByTestId("p2p-type-field").props.value).toBe(wrong);
    expect(mockOpened).toHaveLength(0);

    await act(async () => fireEvent.changeText(field, groups.join("\n")));
    await press("p2p-type-use");
    await waitFor(() => expect(mockOpened).toHaveLength(1));
    expect(last().role.kind).toBe("scan");
  });
});

describe("U7: 'Sync now' (rule U2: the screen stays on)", () => {
  beforeEach(() => {
    mockLink = { name: "Pixel 7", peerId: "cd".repeat(32) };
  });

  test("waits for the other device, shows progress, then the result", async () => {
    await sheet("sync");
    await waitFor(() => expect(mockOpened).toHaveLength(1));
    expect(last().role.kind).toBe("sync");
    expect(mockAwake.activate).toHaveBeenCalled();
    await emit({ step: "waiting" });
    see("Open Bati on Pixel 7 too. Sync starts by itself.");

    await emit({ step: "connected", name: "Pixel 7" });
    see("Syncing with Pixel 7. Keep both screens open.");
    await emit({ step: "receiving", name: "Pixel 7", done: 5 * 1_048_576, total: 20 * 1_048_576 });
    see("5.0 of 20.0 MB");

    const run = jest.fn(() => Promise.resolve());
    useSyncStore.setState({ run } as never);
    await act(async () => last().hooks.onPeerFile(1));
    expect(run).toHaveBeenCalledWith({ snapshotFirst: true, force: true });
    await waitFor(() => see("Synced with Pixel 7."));
  });

  test("U8: Cancel closes the link and the sheet", async () => {
    await sheet("sync");
    await waitFor(() => expect(mockOpened).toHaveLength(1));
    await emit({ step: "waiting" });
    await press("p2p-cancel");
    expect(mockCancel).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test("closing the sheet lets the screen sleep and cancels the session", async () => {
    const view = await sheet("sync");
    await waitFor(() => expect(mockOpened).toHaveLength(1));
    await view.rerender(
      wrap(<P2pSheet open={false} mode="sync" onClose={onClose} onLinked={onLinked} />),
    );
    expect(mockAwake.deactivate).toHaveBeenCalled();
    expect(mockCancel).toHaveBeenCalled();
  });

  test("U14: without a network nothing opens, and 'Try again' tries again", async () => {
    mockNetwork.isConnected = false;
    await sheet("sync");
    await waitFor(() => see("This device isn't on a network. Turn on Wi-Fi and try again."));
    expect(mockOpened).toHaveLength(0);
    mockNetwork.isConnected = true;
    await press("p2p-retry");
    await waitFor(() => expect(mockOpened).toHaveLength(1));
  });

  test("S7b: with a workout running nothing opens", async () => {
    useSessionStore.setState({ status: "active" } as never);
    await sheet("sync");
    await waitFor(() => see("Finish your session first."));
    expect(mockOpened).toHaveLength(0);
  });
});

describe("every way a session ends: its message and its action", () => {
  const cases: [string, "pair" | "sync", string, string, string | null][] = [
    [
      "notInSight",
      "sync",
      "Pixel 7 isn't in sight. Open Bati on it, on the same Wi-Fi.",
      "Try again",
      "If Pixel 7 was reinstalled or forgot this device, link them again.",
    ],
    [
      "blocked",
      "sync",
      "This Wi-Fi keeps devices from reaching each other (a guest network, a VPN). Try another network, or your phone's hotspot.",
      "Try again",
      null,
    ],
    [
      "interrupted",
      "sync",
      "The sync stopped halfway. Nothing was lost. Try again.",
      "Try again",
      null,
    ],
    [
      "noSpace",
      "sync",
      "Not enough space on this device to receive your history. Free some space and try again.",
      "Try again",
      null,
    ],
  ];

  beforeEach(() => {
    mockLink = { name: "Pixel 7", peerId: "cd".repeat(32) };
  });

  test.each(cases)("%s", async (cause, mode, message, action, hint) => {
    await sheet(mode);
    await waitFor(() => expect(mockOpened).toHaveLength(1));
    await emit({ step: "ended", cause });
    see(message);
    see(action);
    expect(screen.queryByTestId("p2p-hint")?.props.children ?? null).toBe(hint);
    await press("p2p-action");
    await waitFor(() => expect(mockOpened).toHaveLength(2));
    expect(last().role.kind).toBe("sync");
  });

  test("codeExpired on the device that shows the code: 'This code expired.' and a new code", async () => {
    await sheet();
    await press("p2p-show");
    await emit({ step: "ended", cause: "codeExpired" });
    see("This code expired.");
    see("Show a new code");
    await press("p2p-action");
    await waitFor(() => expect(mockOpened).toHaveLength(2));
    expect(last().role).toEqual({ kind: "show" });
  });

  test("codeExpired on the device that scanned: it says so, and offers to scan again", async () => {
    await sheet();
    await press("p2p-scan");
    await waitFor(() => expect(screen.getByTestId("p2p-scanner")).toBeTruthy());
    await act(async () => mockScan?.({ nativeEvent: { text: codeText() } }));
    await waitFor(() => expect(mockOpened).toHaveLength(1));
    await emit({ step: "ended", cause: "codeExpired" });
    see("This code doesn't work anymore. Show a new one on the other device.");
    see("Scan again");
  });

  test("a code the clock refuses also says to check the date and time", async () => {
    await sheet();
    await press("p2p-scan");
    await waitFor(() => expect(screen.getByTestId("p2p-scanner")).toBeTruthy());
    await act(async () => mockScan?.({ nativeEvent: { text: codeText(now() - 3600) } }));
    see("This code doesn't work anymore. Show a new one on the other device.");
    see("Check the date and time on both devices.");
    expect(mockOpened).toHaveLength(0);
  });

  test("versionMismatch: the update message, and no action", async () => {
    await sheet("sync");
    await waitFor(() => expect(mockOpened).toHaveLength(1));
    await emit({ step: "ended", cause: "versionMismatch" });
    see("Update Bati on the other device, then try again.");
    expect(screen.queryByTestId("p2p-action")).toBeNull();
  });
});

describe("the linked device in Settings", () => {
  const status = (onForget = jest.fn(), onSyncNow = jest.fn(), onDevice = jest.fn()) =>
    render(
      wrap(
        <SyncStatusSheet
          open
          account={{ kind: "p2p", peerId: `${"0".repeat(60)}ab12`, name: "Pixel 7" }}
          onClose={() => {}}
          onSyncNow={onSyncNow}
          onStop={onForget}
          onTest={() => Promise.reject(new Error("no connection test for a device"))}
          local={{ folder: null, onPress: () => {} }}
          onDevice={onDevice}
        />,
      ),
    );

  test("the row names the device, with the end of its ID and when it last synced", async () => {
    await status();
    expect(screen.getByTestId("p2p-row").props.children).toBe("Pixel 7 (AB12), not synced yet");
    await cleanup();
    useSyncStore.setState({ lastSyncAt: Date.now() } as never);
    await status();
    expect(screen.getByTestId("p2p-row").props.children).toBe(
      "Pixel 7 (AB12), last synced just now on Wi-Fi",
    );
    // No connection test: there is no server to test.
    expect(screen.queryByTestId("sync-test")).toBeNull();
  });

  test("U7: 'Sync now' and 'Link a different device' hand over to the caller", async () => {
    const onSyncNow = jest.fn();
    const onDevice = jest.fn();
    await status(jest.fn(), onSyncNow, onDevice);
    await press("p2p-sync-now");
    await press("p2p-link-other");
    expect(onSyncNow).toHaveBeenCalledTimes(1);
    expect(onDevice).toHaveBeenCalledTimes(1);
  });

  test("U13: forgetting asks first, with the line about a lost device, and only then forgets", async () => {
    const onForget = jest.fn();
    await status(onForget);
    await press("p2p-forget");
    expect(mockDialog?.body).toBe(
      "Pixel 7 won't sync with this one anymore. If you lost it, change your password too.",
    );
    expect(onForget).not.toHaveBeenCalled();
    await act(async () => mockDialog?.onConfirm());
    expect(onForget).toHaveBeenCalledTimes(1);
  });

  test("U15: kept copies each have Delete, and an empty list says so", async () => {
    await status();
    see("Copies kept before a swap");
    see("No copy kept.");
    await cleanup();

    const file = { name: "bati-1-kept-20261108T140312-ab12.batb", delete: jest.fn() };
    mockKept = [file];
    await status();
    see("Copy from 2026-11-08 14:03");
    mockKept = [];
    await press("p2p-copy-delete");
    expect(file.delete).toHaveBeenCalledTimes(1);
    await waitFor(() => see("No copy kept."));
  });
});

describe("Phase 2: the internet meeting on screen (U6, U9, U11, C2)", () => {
  const linkedPeer = { name: "Pixel 7", peerId: "ab".repeat(32) };

  test("U6: asked once after linking, off until the hero says yes, and what relays see is said first", async () => {
    mockInternetFlag = true;
    await sheet("pair");
    await press("p2p-show");
    await act(async () => last().hooks.onLinked({ name: "Pixel 7" }));
    await emit({ step: "connected", name: "Pixel 7" });
    see(en.p2p.internetQuestion);
    see(en.p2p.internetBody);
    expect(mockSetInternet).not.toHaveBeenCalled();
    await press("p2p-internet-yes");
    expect(mockSetInternet).toHaveBeenCalledWith(true);
    see(en.p2p.internetOn);
  });

  test("with the Phase 2 flag off, no question and no switch", async () => {
    await sheet("pair");
    await press("p2p-show");
    await act(async () => last().hooks.onLinked({ name: "Pixel 7" }));
    await emit({ step: "connected", name: "Pixel 7" });
    expect(screen.queryByTestId("p2p-internet-question")).toBeNull();
  });

  test("the switch on goes into the sync, and a silent meeting says 'unreachable' (C1, C2)", async () => {
    mockInternetFlag = true;
    mockInternet = true;
    mockLink = linkedPeer;
    await sheet("sync");
    await waitFor(() => expect(mockOpened.length).toBe(1));
    expect(last().role).toEqual(expect.objectContaining({ kind: "sync", internet: true }));
    await emit({ step: "ended", cause: "unreachable" });
    see(mockWords("p2p.unreachable", { name: "Pixel 7" }));
    see(en.p2p.tryAgain);
  });

  test("U11: nobody met with the switch on: the hint says it must be on, on both", async () => {
    mockInternetFlag = true;
    mockInternet = true;
    mockLink = linkedPeer;
    await sheet("sync");
    await waitFor(() => expect(mockOpened.length).toBe(1));
    await emit({ step: "ended", cause: "notInSight" });
    see(en.p2p.bothSwitches);
  });

  test("U9: on mobile data with sync waiting for Wi-Fi, the internet route is not tried, and that is said", async () => {
    mockInternetFlag = true;
    mockInternet = true;
    mockWifiOnly = true;
    mockNetwork.type = "CELLULAR";
    mockLink = linkedPeer;
    await sheet("sync");
    await waitFor(() => expect(mockOpened.length).toBe(1));
    expect(last().role).toEqual(expect.objectContaining({ internet: false }));
    await emit({ step: "ended", cause: "notInSight" });
    see(en.p2p.wifiOnlyHint);
  });
});
