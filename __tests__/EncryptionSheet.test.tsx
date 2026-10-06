import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import type { EncryptionSheetMode } from "@/components/settings/EncryptionSheet";
import { type EncryptionActions, EncryptionSheet } from "@/components/settings/EncryptionSheet";
import config from "@/tamagui.config";

/**
 * The screens a hero goes through to make a key, and what each one refuses to skip: the words are
 * shown right after the password, typed back before it ends, and the one warning that matters
 * ("this is the only key") is on the last screen whichever way they came.
 */
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k} ${JSON.stringify(o)}` : k),
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  usePathname: () => "/settings",
  useRouter: () => ({ push: mockPush }),
}));
const mockToasts: string[] = [];
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showSuccess: (m: string) => mockToasts.push(m), showError: () => {} }),
}));
const mockCopied: string[] = [];
jest.mock("expo-clipboard", () => ({
  setStringAsync: (value: string) => {
    mockCopied.push(value);
    return Promise.resolve(true);
  },
  getStringAsync: () => Promise.resolve(mockCopied.at(-1) ?? ""),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/src/reportError", () => ({ reportError: () => {} }));
// The sheet only needs the length; the cipher behind it opens the database.
jest.mock("@/src/backupCipher", () => ({ MIN_PASSWORD_LENGTH: 15 }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const WORDS = "one two three four five six seven eight nine ten eleven twelve";
const PASSWORD = "a password of fifteen+";

function actions(patch: Partial<EncryptionActions> = {}): EncryptionActions {
  return {
    enable: jest.fn(() => Promise.resolve(WORDS)),
    change: jest.fn(() => Promise.resolve(WORDS)),
    newWords: jest.fn(() => Promise.resolve(WORDS)),
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

async function sheet(
  mode: EncryptionSheetMode,
  options: {
    actions?: EncryptionActions;
    language?: string;
    format?: 2 | 3 | null;
    canShowWordsAgain?: boolean;
    updateOffered?: boolean;
    onClose?: () => void;
  } = {},
) {
  const a = options.actions ?? actions();
  const onClose = options.onClose ?? jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <EncryptionSheet
          mode={mode}
          language={options.language ?? "en"}
          format={options.format ?? 3}
          updateOffered={options.updateOffered ?? true}
          canShowWordsAgain={options.canShowWordsAgain ?? false}
          actions={a}
          onClose={onClose}
        />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
  return { actions: a, onClose };
}

const type = async (testID: string, value: string) => {
  await fireEvent.changeText(screen.getByTestId(testID), value);
};
const press = async (testID: string) => {
  await fireEvent.press(screen.getByTestId(testID));
};

beforeEach(() => {
  mockPush.mockClear();
  mockToasts.length = 0;
  mockCopied.length = 0;
  // Two places in the twelve that do not move: word 1 and word 2.
  jest.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => jest.restoreAllMocks());

describe("making a key", () => {
  test("the password step encourages instead of scolding, and waits for fifteen characters", async () => {
    const { actions: a } = await sheet({ kind: "enable" });

    expect(screen.getByTestId("vault-password-counter").props.children).toContain("vault.pwHint");
    await type("backup-password", "short one");
    expect(screen.getByTestId("vault-password-counter").props.children).toContain("vault.pwMore");
    expect(screen.getByTestId("vault-password-counter").props.children).toContain('"count":6');
    // Too short: pressing does nothing, however many times.
    await press("backup-password-submit");
    expect(a.enable).not.toHaveBeenCalled();

    await type("backup-password", PASSWORD);
    expect(screen.getByTestId("vault-password-counter").props.children).toBe("vault.pwReread");
    await press("backup-password-submit");
    await waitFor(() => expect(a.enable).toHaveBeenCalledTimes(1));
  });

  test("the password is visible by default, with an eye to hide it", async () => {
    await sheet({ kind: "enable" });

    expect(screen.getByTestId("backup-password").props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByLabelText("vault.pwHide"));
    expect(screen.getByTestId("backup-password").props.secureTextEntry).toBe(true);
  });

  test("shows the twelve words right after the password, numbered, and says nothing is done yet", async () => {
    const { actions: a } = await sheet({ kind: "enable" });
    await type("backup-password", PASSWORD);
    await press("backup-password-submit");

    await waitFor(() => expect(screen.getByTestId("vault-words")).toBeTruthy());
    expect(a.enable).toHaveBeenCalledWith(PASSWORD);
    expect(screen.getByTestId("vault-word-1").props.children).toBe("1. one");
    expect(screen.getByTestId("vault-word-12").props.children).toBe("12. twelve");
    expect(screen.getByTestId("vault-word-3").props.accessibilityLabel).toContain("vault.wordA11y");
    expect(screen.queryByTestId("vault-warning")).toBeNull();
  });

  test("copies the words on one line, without numbers", async () => {
    await sheet({ kind: "enable" });
    await type("backup-password", PASSWORD);
    await press("backup-password-submit");
    await waitFor(() => expect(screen.getByTestId("vault-words-copy")).toBeTruthy());

    await press("vault-words-copy");

    await waitFor(() => expect(mockCopied).toEqual([WORDS]));
    expect(mockToasts).toEqual(["vault.wordsCopied"]);
  });

  test("a German hero is told the words are English; nobody else is", async () => {
    await sheet({ kind: "recovery", words: WORDS }, { language: "de" });
    expect(screen.getByTestId("vault-words-english")).toBeTruthy();
  });

  test("nobody else is told that", async () => {
    await sheet({ kind: "recovery", words: WORDS }, { language: "fr" });
    expect(screen.queryByTestId("vault-words-english")).toBeNull();
  });

  test("the check asks for two words, refuses a wrong one, and takes them with accents and capitals ignored", async () => {
    const { actions: a } = await sheet({ kind: "enable" });
    await type("backup-password", PASSWORD);
    await press("backup-password-submit");
    await waitFor(() => expect(screen.getByTestId("vault-words-next")).toBeTruthy());
    await press("vault-words-next");

    expect(screen.getByTestId("vault-verify-0").props.placeholder).toContain('"n":1');
    expect(screen.getByTestId("vault-verify-1").props.placeholder).toContain('"n":2');
    await type("vault-verify-0", "one");
    await type("vault-verify-1", "nope");
    await press("vault-verify-submit");
    expect(screen.getByTestId("vault-verify-wrong")).toBeTruthy();
    expect(a.wordsChecked).not.toHaveBeenCalled();

    await type("vault-verify-1", "  TWO ");
    await press("vault-verify-submit");
    await waitFor(() => expect(a.wordsChecked).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("vault-warning")).toBeTruthy());
  });

  test("the words can be looked at again from the check", async () => {
    await sheet({ kind: "enable" });
    await type("backup-password", PASSWORD);
    await press("backup-password-submit");
    await waitFor(() => expect(screen.getByTestId("vault-words-next")).toBeTruthy());
    await press("vault-words-next");

    await press("vault-verify-back");

    expect(screen.getByTestId("vault-words")).toBeTruthy();
  });

  test("the last screen carries the one warning, and the answer to 'ask me again' goes to the app", async () => {
    const { actions: a, onClose } = await sheet({ kind: "enable" });
    await type("backup-password", PASSWORD);
    await press("backup-password-submit");
    await waitFor(() => expect(screen.getByTestId("vault-words-next")).toBeTruthy());
    await press("vault-words-next");
    await type("vault-verify-0", "one");
    await type("vault-verify-1", "two");
    await press("vault-verify-submit");
    await waitFor(() => expect(screen.getByTestId("vault-warning")).toBeTruthy());

    await press("vault-remind-yes");

    expect(a.remind).toHaveBeenCalledWith(true);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("'no thanks' is a real answer, and the link to how it works goes to its page", async () => {
    const { actions: a } = await sheet({ kind: "enable" });
    await type("backup-password", PASSWORD);
    await press("backup-password-submit");
    await waitFor(() => expect(screen.getByTestId("vault-words-next")).toBeTruthy());
    await press("vault-words-next");
    await type("vault-verify-0", "one");
    await type("vault-verify-1", "two");
    await press("vault-verify-submit");
    await waitFor(() => expect(screen.getByTestId("vault-warning")).toBeTruthy());

    await press("vault-how-link");
    expect(mockPush).toHaveBeenCalledWith("/encryption");

    await press("vault-remind-no");
    expect(a.remind).toHaveBeenCalledWith(false);
  });

  test("a setup that failed (and said so) closes the sheet instead of showing no words", async () => {
    const a = actions({ enable: jest.fn(() => Promise.resolve(null)) });
    const { onClose } = await sheet({ kind: "enable" }, { actions: a });
    await type("backup-password", PASSWORD);
    await press("backup-password-submit");

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByTestId("vault-words")).toBeNull();
  });

  test("a new password on a key already made uses the change action and its own title", async () => {
    const { actions: a } = await sheet({ kind: "change" });
    expect(screen.getByText("vault.pwTitleChange")).toBeTruthy();
    await type("backup-password", PASSWORD);
    await press("backup-password-submit");

    await waitFor(() => expect(a.change).toHaveBeenCalledWith(PASSWORD));
    expect(a.enable).not.toHaveBeenCalled();
  });
});

describe("showing the words again", () => {
  test("is a view, with nothing to check and a way out", async () => {
    const { onClose } = await sheet({ kind: "recovery", words: WORDS });

    expect(screen.getByTestId("vault-word-12")).toBeTruthy();
    await press("vault-words-next");

    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByTestId("vault-verify-0")).toBeNull();
  });
});

describe("updating a vault from an older build", () => {
  test("says why first, and goes on to a password when nothing is waiting", async () => {
    const { actions: a } = await sheet({ kind: "update" });
    expect(screen.getByText("vault.updateBody")).toBeTruthy();

    await press("vault-intro-continue");

    await waitFor(() => expect(screen.getByTestId("backup-password")).toBeTruthy());
    expect(a.updateBlocked).toHaveBeenCalled();
    expect(screen.queryByTestId("vault-update-blocked")).toBeNull();
  });

  test("stops, with a message, while another device is still waiting for a password", async () => {
    const a = actions({ updateBlocked: jest.fn(() => Promise.resolve(true)) });
    await sheet({ kind: "update" }, { actions: a });

    await press("vault-intro-continue");

    await waitFor(() => expect(screen.getByTestId("vault-update-blocked")).toBeTruthy());
    expect(screen.queryByTestId("backup-password")).toBeNull();
  });

  test("makes a new key: the change action, then the words", async () => {
    const { actions: a } = await sheet({ kind: "update" });
    await press("vault-intro-continue");
    await waitFor(() => expect(screen.getByTestId("backup-password")).toBeTruthy());
    await type("backup-password", PASSWORD);
    await press("backup-password-submit");

    await waitFor(() => expect(a.change).toHaveBeenCalledWith(PASSWORD));
    await waitFor(() => expect(screen.getByTestId("vault-words")).toBeTruthy());
  });
});

describe("'I don't remember it'", () => {
  test("is gentle and honest, and can wait", async () => {
    const { onClose } = await sheet({ kind: "forgot" });

    expect(screen.getByText("vault.forgotBody")).toBeTruthy();
    expect(screen.getByText("vault.forgotHonest")).toBeTruthy();
    await press("vault-intro-later");
    expect(onClose).toHaveBeenCalled();
  });

  test("saves a new password on the same key, shows no words, and asks whether to be reminded", async () => {
    const { actions: a } = await sheet({ kind: "forgot" });
    await press("vault-intro-continue");
    await type("backup-password", PASSWORD);
    await press("backup-password-submit");

    await waitFor(() => expect(a.forgot).toHaveBeenCalledWith(PASSWORD));
    await waitFor(() => expect(screen.getByTestId("vault-forgot-done")).toBeTruthy());
    expect(screen.queryByTestId("vault-words")).toBeNull();
    expect(a.enable).not.toHaveBeenCalled();
    expect(a.change).not.toHaveBeenCalled();
  });

  test("a password that could not be saved closes the sheet and does not claim it was", async () => {
    const a = actions({ forgot: jest.fn(() => Promise.resolve(false)) });
    const { onClose } = await sheet({ kind: "forgot" }, { actions: a });
    await press("vault-intro-continue");
    await type("backup-password", PASSWORD);
    await press("backup-password-submit");

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByTestId("vault-forgot-done")).toBeNull();
  });
});

describe("new words", () => {
  test("make new ones, show them and check them", async () => {
    const { actions: a } = await sheet({ kind: "newWords" });
    expect(screen.getByText("vault.newWordsBody")).toBeTruthy();

    await press("vault-intro-continue");

    await waitFor(() => expect(a.newWords).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("vault-words")).toBeTruthy());
    expect(a.change).not.toHaveBeenCalled();
  });
});

describe("a setup left half-way", () => {
  test("with the words kept behind a fingerprint, goes straight to the check", async () => {
    await sheet({ kind: "verify", words: WORDS });

    expect(screen.getByTestId("vault-verify-0")).toBeTruthy();
  });

  test("without them, offers new words or a new password, and says the old ones still work", async () => {
    const { actions: a } = await sheet({ kind: "verify", words: null });
    expect(screen.getByText("vault.pendingNoWords")).toBeTruthy();

    await press("vault-pending-new");
    await waitFor(() => expect(a.newWords).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("vault-words")).toBeTruthy());
  });

  test("two quick taps on 'new words' make one set: the second would overwrite the first's slot", async () => {
    let finish: (words: string) => void = () => {};
    const a = actions({
      newWords: jest.fn(() => new Promise<string>((resolve) => (finish = resolve))),
    });
    await sheet({ kind: "verify", words: null }, { actions: a });

    await press("vault-pending-new");
    await press("vault-pending-new");
    finish(WORDS);

    await waitFor(() => expect(screen.getByTestId("vault-words")).toBeTruthy());
    expect(a.newWords).toHaveBeenCalledTimes(1);
  });

  test("two quick taps on the password button make one key", async () => {
    let finish: (words: string) => void = () => {};
    const a = actions({
      enable: jest.fn(() => new Promise<string>((resolve) => (finish = resolve))),
    });
    await sheet({ kind: "enable" }, { actions: a });

    await type("backup-password", PASSWORD);
    await press("backup-password-submit");
    await press("backup-password-submit");
    finish(WORDS);

    await waitFor(() => expect(screen.getByTestId("vault-words")).toBeTruthy());
    expect(a.enable).toHaveBeenCalledTimes(1);
  });

  test("or a new password, which is a new key", async () => {
    const { actions: a } = await sheet({ kind: "verify", words: null });

    await press("vault-pending-change");
    await type("backup-password", PASSWORD);
    await press("backup-password-submit");

    await waitFor(() => expect(a.change).toHaveBeenCalledWith(PASSWORD));
  });
});

describe("managing an encrypted vault", () => {
  test("offers what can be done, and says where the words are when they are not here", async () => {
    await sheet({ kind: "manage" }, { canShowWordsAgain: false });

    expect(screen.getByTestId("backup-recovery-not-here")).toBeTruthy();
    expect(screen.queryByTestId("backup-show-recovery")).toBeNull();
    for (const id of [
      "vault-check",
      "vault-forgot",
      "vault-new-words",
      "backup-change-password",
      "backup-disable-encryption",
      "vault-how",
    ]) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
  });

  test("shows the words again only where a fingerprint keeps them", async () => {
    const { actions: a } = await sheet({ kind: "manage" }, { canShowWordsAgain: true });

    await press("backup-show-recovery");

    expect(a.showWords).toHaveBeenCalled();
  });

  test("each button opens the thing it says", async () => {
    const { actions: a } = await sheet({ kind: "manage" });

    await press("vault-check");
    await press("vault-forgot");
    await press("vault-new-words");
    await press("backup-change-password");
    await press("backup-disable-encryption");
    await press("vault-how");

    expect(a.checkPassword).toHaveBeenCalled();
    expect(a.forgotOpen).toHaveBeenCalled();
    expect(a.newWordsOpen).toHaveBeenCalled();
    expect(a.changeOpen).toHaveBeenCalled();
    expect(a.disable).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/encryption");
  });

  test("during the first 14 days a format 2 vault is not offered the update, only turned off", async () => {
    const { actions: a } = await sheet({ kind: "manage" }, { format: 2, updateOffered: false });

    expect(screen.getByText("vault.manageHold")).toBeTruthy();
    expect(screen.queryByTestId("vault-update")).toBeNull();
    expect(screen.queryByText("vault.updateBody")).toBeNull();
    await press("backup-disable-encryption");
    expect(a.disable).toHaveBeenCalled();
  });

  test("a vault from an older build can only be updated or turned off", async () => {
    const { actions: a } = await sheet({ kind: "manage" }, { format: 2 });

    expect(screen.getByTestId("vault-update")).toBeTruthy();
    expect(screen.queryByTestId("vault-forgot")).toBeNull();
    expect(screen.queryByTestId("vault-new-words")).toBeNull();
    await press("vault-update");
    expect(a.update).toHaveBeenCalled();
    await press("backup-disable-encryption");
    expect(a.disable).toHaveBeenCalled();
  });
});
