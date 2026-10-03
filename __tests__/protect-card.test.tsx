import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { format, subDays } from "date-fns";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

/**
 * "Protect your hero" (db/backup nudge): it speaks from the fifth session, only while nothing
 * protects the hero, and shuts up for thirty days when closed. The assertions that matter are the
 * ones about when it must NOT appear: a card that nags a protected hero is worse than none.
 */
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: jest.requireActual("@/db/schema") }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require("react");
    useEffect(() => cb(), []);
  },
}));
jest.mock("@/hooks/useHaptics", () => ({ useHaptics: () => ({ selection: jest.fn() }) }));

let mockNotes = false;
let mockUpdate: string | null = null;
jest.mock("@/src/whatsNew", () => ({ hasUnseenNotes: async () => mockNotes }));
jest.mock("@/src/updateCheck", () => ({ checkForUpdate: async () => mockUpdate }));

let mockSessions = 0;
jest.mock("@/db/completed", () => ({
  ...jest.requireActual("@/db/completed"),
  getSessionAggregates: async () => ({ totalSessions: mockSessions }),
}));

const mockPrefs = new Map<string, string>();
jest.mock("@/db/preferences", () => ({
  preferences: {
    getBackupFolderUri: async () => mockPrefs.get("backupFolderUri") ?? null,
    getLastAutoBackupDay: async () => mockPrefs.get("lastAutoBackupDay") ?? null,
    getProtectDismissedDay: async () => mockPrefs.get("protectDismissedDay") ?? null,
    setProtectDismissedDay: (day: string) => {
      mockPrefs.set("protectDismissedDay", day);
      return Promise.resolve();
    },
  },
}));

let mockAccount: object | null = null;
let mockLastSyncAt: number | null = null;
jest.mock("@/src/deviceSync", () => ({
  syncAccount: async () => mockAccount,
  syncHealth: async () => ({ lastSuccessAt: mockLastSyncAt, failure: null, failingSince: null }),
}));

import { ProtectCard } from "@/components/home/ProtectCard";
import { protectCardVisible } from "@/src/protectHero";
import config from "@/tamagui.config";

const ago = (days: number) => format(subDays(new Date(), days), "yyyy-MM-dd");

beforeEach(() => {
  jest.clearAllMocks();
  mockPrefs.clear();
  mockNotes = false;
  mockUpdate = null;
  mockSessions = 5;
  mockAccount = null;
  mockLastSyncAt = null;
});

describe("protectCardVisible", () => {
  test("comes on the fifth session with no backup, and not before", async () => {
    mockSessions = 4;
    expect(await protectCardVisible()).toBe(false);
    mockSessions = 5;
    expect(await protectCardVisible()).toBe(true);
  });

  test("never for a hero whose automatic backup works", async () => {
    mockPrefs.set("backupFolderUri", "content://tree");
    mockPrefs.set("lastAutoBackupDay", ago(0));
    expect(await protectCardVisible()).toBe(false);
    mockPrefs.set("lastAutoBackupDay", ago(6));
    expect(await protectCardVisible()).toBe(false);
  });

  test("a folder just picked, with no day yet, already protects", async () => {
    mockPrefs.set("backupFolderUri", "content://tree");
    expect(await protectCardVisible()).toBe(false);
  });

  test("a backup that stopped running seven days ago no longer protects", async () => {
    mockPrefs.set("backupFolderUri", "content://tree");
    mockPrefs.set("lastAutoBackupDay", ago(7));
    expect(await protectCardVisible()).toBe(true);
  });

  test("a stale day with the folder switched off protects nothing", async () => {
    mockPrefs.set("lastAutoBackupDay", ago(0));
    expect(await protectCardVisible()).toBe(true);
  });

  test("a device sync that worked this week protects, one that stopped does not", async () => {
    mockAccount = { kind: "nextcloud" };
    mockLastSyncAt = Date.now() - 2 * 86_400_000;
    expect(await protectCardVisible()).toBe(false);
    mockLastSyncAt = Date.now() - 9 * 86_400_000;
    expect(await protectCardVisible()).toBe(true);
    mockLastSyncAt = null;
    expect(await protectCardVisible()).toBe(true);
  });

  test("a sync that worked once, then was disconnected, protects nothing", async () => {
    mockAccount = null;
    mockLastSyncAt = Date.now();
    expect(await protectCardVisible()).toBe(true);
  });

  test("closed for thirty days, back on the thirtieth", async () => {
    mockPrefs.set("protectDismissedDay", ago(29));
    expect(await protectCardVisible()).toBe(false);
    mockPrefs.set("protectDismissedDay", ago(30));
    expect(await protectCardVisible()).toBe(true);
  });

  test("silent while an update or the release notes are up", async () => {
    mockNotes = true;
    expect(await protectCardVisible()).toBe(false);
    mockNotes = false;
    mockUpdate = "3.0.0";
    expect(await protectCardVisible()).toBe(false);
  });
});

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function mount() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <ProtectCard />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

describe("ProtectCard", () => {
  test("one tap opens Settings", async () => {
    await mount();
    await waitFor(() => expect(screen.getByTestId("home-protect")).toBeTruthy());
    await act(async () => {
      await fireEvent.press(screen.getByTestId("home-protect"));
    });
    expect(mockPush).toHaveBeenCalledWith("/settings");
  });

  test("the cross closes it and remembers today", async () => {
    await mount();
    await waitFor(() => expect(screen.getByTestId("home-protect")).toBeTruthy());
    await act(async () => {
      await fireEvent.press(screen.getByTestId("home-protect-dismiss"));
    });
    expect(screen.queryByTestId("home-protect")).toBeNull();
    expect(mockPrefs.get("protectDismissedDay")).toBe(ago(0));
  });

  test("renders nothing for a hero who is protected", async () => {
    mockPrefs.set("backupFolderUri", "content://tree");
    await mount();
    await waitFor(() => expect(mockSessions).toBe(5));
    expect(screen.queryByTestId("home-protect")).toBeNull();
  });
});
