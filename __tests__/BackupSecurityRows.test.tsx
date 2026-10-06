import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { BackupSecurityRows } from "@/components/settings/BackupSecurityRows";
import config from "@/tamagui.config";

/**
 * "My hero, safe": one row for both ways of keeping the hero somewhere. The daily copy and the
 * synced server were two rows before; a hero who set up either must see it named right after the
 * update, and the row must open the sheet that fits what is already on.
 */
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("expo-router", () => ({ usePathname: () => "/settings", useRouter: () => ({}) }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/i18n", () => ({ i18n: { language: "en" } }));
jest.mock("@/src/reportError", () => ({ reportError: () => {} }));
const mockAnswerCheck = jest.fn((_answer: string) => Promise.resolve());
jest.mock("@/src/passwordReminders", () => ({
  answerPasswordCheck: (answer: string) => mockAnswerCheck(answer),
}));

const mockSync: {
  account: { kind: "folder" } | null;
  lost: string | null;
  running: boolean;
  rowValue: string;
  backupFolder: null;
} = { account: null, lost: null, running: false, rowValue: "sync.off", backupFolder: null };
jest.mock("@/hooks/useDeviceSync", () => ({
  useDeviceSync: () => ({ ...mockSync }),
}));
const mockTrace = { value: false };
jest.mock("@/db/gps", () => ({ hasGpsHistory: () => Promise.resolve(mockTrace.value) }));
const mockEncryption = {
  status: "off" as "off" | "on" | "locked",
  format: 3 as 2 | 3,
  updateOffered: false,
};
jest.mock("@/hooks/useBackupEncryption", () => ({
  useBackupEncryption: () => ({
    status: mockEncryption.status,
    format: mockEncryption.format,
    updateOffered: mockEncryption.updateOffered,
    wordsToCheck: false,
    canShowRecoveryAgain: false,
  }),
}));

// The sheets are other tests' business: here they only say whether they are open, and with what.
const mockSetup: { open: boolean; local: unknown }[] = [];
jest.mock("@/components/settings/SyncSetupSheet", () => ({
  SyncSetupSheet: (props: { open: boolean; local: unknown }) => {
    const { Text } = require("react-native");
    mockSetup.push({ open: props.open, local: props.local });
    return props.open ? <Text testID="setup-sheet">setup</Text> : null;
  },
}));
jest.mock("@/components/settings/SyncStatusSheet", () => ({
  SyncStatusSheet: (props: { open: boolean; local: { folder: string | null } }) => {
    const { Text } = require("react-native");
    return props.open ? <Text testID="status-sheet">{`status ${props.local.folder}`}</Text> : null;
  },
}));
let mockEncryptionMode: unknown = null;
jest.mock("@/components/settings/EncryptionSheet", () => ({
  EncryptionSheet: (props: { mode: unknown }) => {
    mockEncryptionMode = props.mode;
    return null;
  },
}));
let mockCheckAnswer: ((answer: string) => void) | undefined;
jest.mock("@/components/settings/PasswordCheckFlow", () => ({
  PasswordCheckFlow: (props: { onAnswer: (answer: string) => void }) => {
    mockCheckAnswer = props.onAnswer;
    return null;
  },
}));
jest.mock("@/components/settings/BackupSecretSheet", () => ({ BackupSecretSheet: () => null }));
jest.mock("@/components/settings/LastBackupLine", () => ({
  LastBackupLine: ({ folderOn }: { folderOn: boolean }) => {
    const { Text } = require("react-native");
    return <Text testID="last-line">{String(folderOn)}</Text>;
  },
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const onLocalCopy = jest.fn();

const rows = (autoFolder: string | null) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <BackupSecurityRows disabled={false} autoFolder={autoFolder} onLocalCopy={onLocalCopy}>
          <Text testID="child-row">save a file</Text>
        </BackupSecurityRows>
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

beforeEach(() => {
  mockSync.account = null;
  mockSync.lost = null;
  mockSync.running = false;
  mockSync.rowValue = "sync.off";
  mockSetup.length = 0;
  mockTrace.value = false;
  mockEncryption.status = "off";
  mockEncryption.format = 3;
  mockEncryption.updateOffered = false;
  mockEncryptionMode = null;
  onLocalCopy.mockClear();
});

describe("what the row says right after an update, for each setup a hero already has", () => {
  test("nothing set up: a nudge, not 'Off'", async () => {
    await rows(null);

    expect(screen.getByText("shelter.row")).toBeTruthy();
    expect(screen.getByText("shelter.choose")).toBeTruthy();
  });

  test("only the daily copy: its folder, exactly as the old row said it", async () => {
    await rows("Documents/Bati");

    expect(screen.getByText("Documents/Bati")).toBeTruthy();
    expect(screen.getByTestId("last-line").props.children).toBe("true");
  });

  test("only sync: the server, as the old sync row said it", async () => {
    mockSync.account = { kind: "folder" };
    mockSync.rowValue = "cloud.example";
    await rows(null);

    expect(screen.getByText("cloud.example")).toBeTruthy();
  });

  test("both: the place of the sync, and the daily copy lives in its sheet", async () => {
    mockSync.account = { kind: "folder" };
    mockSync.rowValue = "cloud.example";
    await rows("Documents/Bati");

    expect(screen.getByText("cloud.example")).toBeTruthy();
    expect(screen.queryByText("Documents/Bati")).toBeNull();
    await fireEvent.press(screen.getByTestId("settings-sync"));
    expect(screen.getByText("status Documents/Bati")).toBeTruthy();
  });

  test("a sync that stopped without being asked still says so, over the folder", async () => {
    mockSync.lost = "https://cloud.example";
    mockSync.rowValue = "sync.rowStopped";
    await rows("Documents/Bati");

    expect(screen.getByText("sync.rowStopped")).toBeTruthy();
  });
});

describe("what the row opens", () => {
  test("without sync, the sheet of places, which carries the daily copy as a door", async () => {
    await rows("Documents/Bati");

    await fireEvent.press(screen.getByTestId("settings-sync"));

    expect(screen.getByTestId("setup-sheet")).toBeTruthy();
    expect(mockSetup.at(-1)?.local).toEqual({
      folder: "Documents/Bati",
      onPress: onLocalCopy,
      gpsNotice: false,
    });
  });

  test("with sync, its status, not the list of places", async () => {
    mockSync.account = { kind: "folder" };
    await rows(null);

    await fireEvent.press(screen.getByTestId("settings-sync"));

    expect(screen.getByTestId("status-sheet")).toBeTruthy();
    expect(screen.queryByTestId("setup-sheet")).toBeNull();
  });

  test("the rows between the place and the password are the caller's", async () => {
    await rows(null);

    expect(screen.getByTestId("child-row")).toBeTruthy();
  });

  test("while a sync runs the row is not pressable", async () => {
    mockSync.running = true;
    await rows(null);

    await fireEvent.press(screen.getByTestId("settings-sync"));

    expect(screen.queryByTestId("setup-sheet")).toBeNull();
  });
});

describe("a password check the hero started from Settings", () => {
  test("keeps what they answered, and does not count 'Later' as an ignored reminder", async () => {
    await rows(null);

    mockCheckAnswer?.("ignored");
    mockCheckAnswer?.("right");

    expect(mockAnswerCheck.mock.calls).toEqual([["right"]]);
  });
});

describe("the GPS line: only when a file written now would carry a trace and nobody could not read it", () => {
  test("no password and a stored trace: said, in the rows that write a file", async () => {
    mockTrace.value = true;
    await rows(null);

    await waitFor(() => expect(screen.getByTestId("settings-gps-notice")).toBeTruthy());
    expect(screen.getByText("backup.gpsNotice")).toBeTruthy();
  });

  test("tapping it goes to making the password, nowhere else", async () => {
    mockTrace.value = true;
    await rows(null);
    await waitFor(() => expect(screen.getByTestId("settings-gps-notice")).toBeTruthy());

    await fireEvent.press(screen.getByTestId("settings-gps-notice"));

    expect(mockEncryptionMode).toEqual({ kind: "enable" });
  });

  test("with a password the files are sealed and the line stays away", async () => {
    mockTrace.value = true;
    mockEncryption.status = "on";
    await rows(null);

    await waitFor(() => expect(screen.getByTestId("child-row")).toBeTruthy());
    expect(screen.queryByTestId("settings-gps-notice")).toBeNull();
  });

  test("without any trace there is nothing to warn about", async () => {
    await rows(null);

    await waitFor(() => expect(screen.getByTestId("child-row")).toBeTruthy());
    expect(screen.queryByTestId("settings-gps-notice")).toBeNull();
  });

  test("the places sheet gets it too, for its 'on this phone' door", async () => {
    mockTrace.value = true;
    await rows(null);

    await waitFor(() =>
      expect((mockSetup.at(-1)?.local as { gpsNotice?: boolean })?.gpsNotice).toBe(true),
    );
  });
});

describe("a format 2 vault and the 14 days", () => {
  test("hidden: the row says yes and a tap opens the manage sheet, never the update", async () => {
    mockEncryption.status = "on";
    mockEncryption.format = 2;
    mockEncryption.updateOffered = false;
    await rows(null);

    expect(screen.getByText("vault.rowYes")).toBeTruthy();
    expect(screen.queryByText("vault.rowUpdate")).toBeNull();
    await fireEvent.press(screen.getByTestId("settings-encrypt-backup"));
    expect(mockEncryptionMode).toEqual({ kind: "manage" });
  });

  test("offered: the row says to update and a tap opens the update", async () => {
    mockEncryption.status = "on";
    mockEncryption.format = 2;
    mockEncryption.updateOffered = true;
    await rows(null);

    expect(screen.getByText("vault.rowUpdate")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("settings-encrypt-backup"));
    expect(mockEncryptionMode).toEqual({ kind: "update" });
  });

  test("a format 3 vault never shows the update, whatever the day", async () => {
    mockEncryption.status = "on";
    mockEncryption.format = 3;
    mockEncryption.updateOffered = true;
    await rows(null);

    expect(screen.queryByText("vault.rowUpdate")).toBeNull();
    expect(screen.getByText("vault.rowYes")).toBeTruthy();
  });
});

describe("a phone that holds no key", () => {
  test("a locked row opens the unlock, never a second vault", async () => {
    mockEncryption.status = "locked";
    await rows(null);

    await fireEvent.press(screen.getByTestId("settings-encrypt-backup"));

    expect(mockEncryptionMode).toEqual({ kind: "unlock" });
  });

  test("an off row still opens the enable flow", async () => {
    await rows(null);

    await fireEvent.press(screen.getByTestId("settings-encrypt-backup"));

    expect(mockEncryptionMode).toEqual({ kind: "enable" });
  });
});
