import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { type EncryptionActions, EncryptionSheet } from "@/components/settings/EncryptionSheet";
import config from "@/tamagui.config";

/**
 * A phone that holds no key. Its hero already has a vault, so the first door is the password they
 * know; a new password is the second, behind one warning, because it leaves every older copy shut.
 */
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("expo-router", () => ({
  usePathname: () => "/settings",
  useRouter: () => ({ push: jest.fn() }),
}));
const mockToasts: string[] = [];
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showSuccess: (m: string) => mockToasts.push(m), showError: () => {} }),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/src/reportError", () => ({ reportError: () => {} }));
jest.mock("@/src/backupCipher", () => ({ MIN_PASSWORD_LENGTH: 15 }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const PASSWORD = "a password of fifteen+";

function actions(patch: Partial<EncryptionActions> = {}): EncryptionActions {
  return {
    enable: jest.fn(() => Promise.resolve("one two")),
    change: jest.fn(() => Promise.resolve("one two")),
    newWords: jest.fn(() => Promise.resolve("one two")),
    forgot: jest.fn(() => Promise.resolve(true)),
    updateBlocked: jest.fn(() => Promise.resolve(false)),
    wordsChecked: jest.fn(() => Promise.resolve()),
    showWords: jest.fn(),
    remind: jest.fn(() => Promise.resolve()),
    checkPassword: jest.fn(),
    update: jest.fn(),
    forgotOpen: jest.fn(),
    newWordsOpen: jest.fn(),
    changeOpen: jest.fn(),
    disable: jest.fn(),
    unlock: jest.fn(() => Promise.resolve("unlocked" as const)),
    unlockSources: jest.fn(() => Promise.resolve({ server: false, folder: true })),
    ...patch,
  };
}

async function sheet(a: EncryptionActions) {
  const onClose = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <EncryptionSheet
          mode={{ kind: "unlock" }}
          language="en"
          format={3}
          updateOffered={false}
          canShowWordsAgain={false}
          actions={a}
          onClose={onClose}
        />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
  return onClose;
}

const type = async (testID: string, value: string) => {
  await fireEvent.changeText(screen.getByTestId(testID), value);
};
const press = async (testID: string) => {
  await fireEvent.press(screen.getByTestId(testID));
};
const chooseSource = async (a: EncryptionActions, source: string) => {
  await press("vault-unlock-have");
  await waitFor(() => expect(a.unlockSources).toHaveBeenCalled());
  await press(`vault-unlock-source-${source}`);
};
const trySecret = async (secret: string) => {
  await type("vault-unlock-secret", secret);
  await press("vault-unlock-submit");
};

beforeEach(() => {
  mockToasts.length = 0;
});

test("offers the password first and a new one second, and starts no enable flow", async () => {
  const a = actions();
  await sheet(a);

  expect(screen.getByTestId("vault-unlock-have")).toBeTruthy();
  expect(screen.getByTestId("vault-unlock-new")).toBeTruthy();
  expect(screen.queryByTestId("backup-password")).toBeNull();
  expect(a.enable).not.toHaveBeenCalled();
});

test("shows only the sources that lead somewhere, and the file always", async () => {
  await sheet(actions());
  await press("vault-unlock-have");

  await waitFor(() => expect(screen.getByTestId("vault-unlock-source-file")).toBeTruthy());
  expect(screen.getByTestId("vault-unlock-source-folder")).toBeTruthy();
  expect(screen.queryByTestId("vault-unlock-source-server")).toBeNull();
});

test("a server that exists is offered", async () => {
  await sheet(actions({ unlockSources: () => Promise.resolve({ server: true, folder: false }) }));
  await press("vault-unlock-have");

  await waitFor(() => expect(screen.getByTestId("vault-unlock-source-server")).toBeTruthy());
  expect(screen.queryByTestId("vault-unlock-source-folder")).toBeNull();
});

test("passes the text as typed, then closes with a toast when it opens", async () => {
  const a = actions();
  const onClose = await sheet(a);
  await chooseSource(a, "folder");
  await trySecret("  Mixed Case words ");

  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(a.unlock).toHaveBeenCalledWith("folder", "  Mixed Case words ");
  expect(mockToasts).toEqual(["vault.unlock.done"]);
});

test("a wrong password keeps the sheet and the field", async () => {
  const a = actions({ unlock: jest.fn(() => Promise.resolve("wrong" as const)) });
  const onClose = await sheet(a);
  await chooseSource(a, "folder");
  await trySecret("nope");

  await waitFor(() => expect(screen.getByText("vault.unlock.wrong")).toBeTruthy());
  expect(screen.getByTestId("vault-unlock-secret").props.value).toBe("nope");
  expect(onClose).not.toHaveBeenCalled();
  expect(mockToasts).toEqual([]);
});

test.each([
  ["nothingToTry", "vault.unlock.nothing"],
  ["newerVersion", "backup.rejected.newerVersion"],
] as const)("%s says so inline", async (result, key) => {
  const a = actions({ unlock: jest.fn(() => Promise.resolve(result)) });
  await sheet(a);
  await chooseSource(a, "file");
  await trySecret("x");

  await waitFor(() => expect(screen.getByText(key)).toBeTruthy());
});

test("a closed picker returns to the source choice without a word", async () => {
  const a = actions({ unlock: jest.fn(() => Promise.resolve("cancelled" as const)) });
  await sheet(a);
  await chooseSource(a, "file");
  await trySecret("x");

  await waitFor(() => expect(screen.getByTestId("vault-unlock-source-file")).toBeTruthy());
  expect(screen.queryByTestId("vault-unlock-error")).toBeNull();
});

test("a new password is warned about first, and only then starts the enable flow", async () => {
  const a = actions();
  await sheet(a);

  await press("vault-unlock-new");
  expect(screen.getByText("vault.unlock.newWarning")).toBeTruthy();
  expect(screen.queryByTestId("backup-password")).toBeNull();

  await press("vault-unlock-new-continue");
  await type("backup-password", PASSWORD);
  await press("backup-password-submit");
  await waitFor(() => expect(a.enable).toHaveBeenCalledWith(PASSWORD));
  expect(a.change).not.toHaveBeenCalled();
});

test("the warning goes back to the password", async () => {
  await sheet(actions());
  await press("vault-unlock-new");
  await press("vault-unlock-back");

  await waitFor(() => expect(screen.getByTestId("vault-unlock-source-file")).toBeTruthy());
});

test("the older-copies warning exists in all four locales, without an em dash", () => {
  for (const locale of ["en", "fr", "de", "es"]) {
    const { vault } = require(`@/locales/${locale}.json`);
    expect(vault.unlock.newWarning).toEqual(expect.any(String));
    expect(vault.unlock.newWarning).not.toContain("—");
  }
});
