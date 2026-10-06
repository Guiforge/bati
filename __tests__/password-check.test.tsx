import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import config from "@/tamagui.config";

/**
 * "Is the password still in your head?", the sheet and the Home line that opens it. What matters
 * is the manners: nothing is stored by typing, a wrong answer is gentle, the way out of a lost
 * password is one tap, the answer that moves the schedule is the last word and not the first, and
 * the line itself never stands where a more important one stands.
 */
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k} ${JSON.stringify(o)}` : k),
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/i18n", () => ({ i18n: { language: "en" } }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require("react");
    useEffect(() => cb(), []);
  },
}));
jest.mock("@/hooks/useHaptics", () => ({ useHaptics: () => ({ selection: jest.fn() }) }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/src/backupCipher", () => ({ MIN_PASSWORD_LENGTH: 15 }));
jest.mock("expo-clipboard", () => ({}));
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }),
}));

const mockEncryption = {
  checkPassword: jest.fn(),
  forgot: jest.fn(),
  remind: jest.fn(() => Promise.resolve()),
};
jest.mock("@/hooks/useBackupEncryption", () => ({ useBackupEncryption: () => mockEncryption }));

let mockDue = true;
let mockProtect = false;
let mockReminderKind: string | null = null;
const mockAnswers: string[] = [];
jest.mock("@/src/passwordReminders", () => ({
  passwordCheckDue: () => Promise.resolve(mockDue),
  answerPasswordCheck: (answer: string) => {
    mockAnswers.push(answer);
    return Promise.resolve();
  },
}));
jest.mock("@/src/protectHero", () => ({ protectCardVisible: () => Promise.resolve(mockProtect) }));
jest.mock("@/src/reminders", () => ({ reminderCardKind: () => Promise.resolve(mockReminderKind) }));

import { PasswordCheckCard } from "@/components/home/PasswordCheckCard";
import { PasswordCheckFlow } from "@/components/settings/PasswordCheckFlow";

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

beforeEach(() => {
  mockDue = true;
  mockProtect = false;
  mockReminderKind = null;
  mockAnswers.length = 0;
  mockEncryption.checkPassword.mockReset().mockResolvedValue(true);
  mockEncryption.forgot.mockReset().mockResolvedValue(true);
  mockEncryption.remind.mockClear();
});

describe("PasswordCheckFlow", () => {
  async function flow(onClose = jest.fn()) {
    await render(
      wrap(<PasswordCheckFlow open onClose={onClose} onAnswer={(a) => mockAnswers.push(a)} />),
    );
    return onClose;
  }
  const type = async (value: string) =>
    fireEvent.changeText(screen.getByTestId("vault-check-input"), value);

  test("what is typed is not shown on screen", async () => {
    await flow();
    expect(screen.getByTestId("vault-check-input").props.secureTextEntry).toBe(true);
  });

  test("a right password gets a kind word and is recorded as right", async () => {
    const onClose = await flow();
    await type("the right one, long enough");
    await fireEvent.press(screen.getByTestId("vault-check-submit"));

    await waitFor(() => expect(screen.getByTestId("vault-check-right")).toBeTruthy());
    expect(mockEncryption.checkPassword).toHaveBeenCalledWith("the right one, long enough");
    await fireEvent.press(screen.getByTestId("vault-check-close"));

    expect(mockAnswers).toEqual(["right"]);
    expect(onClose).toHaveBeenCalled();
  });

  test("a wrong one is told gently, can be retried, and is recorded as wrong if it stays wrong", async () => {
    mockEncryption.checkPassword.mockResolvedValue(false);
    const onClose = await flow();
    await type("not it at all");
    await fireEvent.press(screen.getByTestId("vault-check-submit"));

    await waitFor(() => expect(screen.getByTestId("vault-check-wrong")).toBeTruthy());
    expect(screen.getByTestId("vault-check-wrong").props.children).toBe("vault.checkWrong");
    // The field is empty again: retyping into the rejected attempt is how one typo is sent twice.
    expect(screen.getByTestId("vault-check-input").props.value).toBe("");

    await fireEvent.press(screen.getByTestId("vault-check-later"));
    expect(mockAnswers).toEqual(["wrong"]);
    expect(onClose).toHaveBeenCalled();
  });

  test("wrong and then right is right: the last word is the best one", async () => {
    mockEncryption.checkPassword.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await flow();
    await type("first try, wrong");
    await fireEvent.press(screen.getByTestId("vault-check-submit"));
    await waitFor(() => expect(screen.getByTestId("vault-check-wrong")).toBeTruthy());
    await type("second try, right");
    await fireEvent.press(screen.getByTestId("vault-check-submit"));
    await waitFor(() => expect(screen.getByTestId("vault-check-right")).toBeTruthy());
    await fireEvent.press(screen.getByTestId("vault-check-close"));

    expect(mockAnswers).toEqual(["right"]);
  });

  test("'later' without trying is ignored, which the schedule counts differently from wrong", async () => {
    const onClose = await flow();
    await fireEvent.press(screen.getByTestId("vault-check-later"));

    expect(mockAnswers).toEqual(["ignored"]);
    expect(onClose).toHaveBeenCalled();
    expect(mockEncryption.checkPassword).not.toHaveBeenCalled();
  });

  test("nothing is sent for an empty field", async () => {
    await flow();
    await fireEvent.press(screen.getByTestId("vault-check-submit"));
    expect(mockEncryption.checkPassword).not.toHaveBeenCalled();
  });

  test("a password that is gone is one tap from a new one, on the same key", async () => {
    await flow();
    await fireEvent.press(screen.getByTestId("vault-check-forgot"));

    await waitFor(() => expect(screen.getByText("vault.forgotBody")).toBeTruthy());
    await fireEvent.press(screen.getByTestId("vault-intro-continue"));
    await fireEvent.changeText(screen.getByTestId("backup-password"), "a brand new password, long");
    await fireEvent.press(screen.getByTestId("backup-password-submit"));

    await waitFor(() =>
      expect(mockEncryption.forgot).toHaveBeenCalledWith("a brand new password, long"),
    );
  });
});

describe("PasswordCheckCard", () => {
  test("is a quiet line when the check is due and nothing else asks for the spot", async () => {
    await render(wrap(<PasswordCheckCard />));
    await waitFor(() => expect(screen.getByTestId("home-password-check")).toBeTruthy());
  });

  test.each([
    [
      "not due",
      () => {
        mockDue = false;
      },
    ],
    [
      "the protect card is showing",
      () => {
        mockProtect = true;
      },
    ],
    [
      "the reminders line is showing",
      () => {
        mockReminderKind = "offer";
      },
    ],
  ])("is silent when %s", async (_why, setUp) => {
    setUp();
    await render(wrap(<PasswordCheckCard />));
    // Give the focus effect its turn.
    await waitFor(() => expect(mockDue !== undefined).toBe(true));
    expect(screen.queryByTestId("home-password-check")).toBeNull();
  });

  test("opens the check, and goes away once it is answered, recording what was said", async () => {
    await render(wrap(<PasswordCheckCard />));
    await waitFor(() => expect(screen.getByTestId("home-password-check")).toBeTruthy());

    await fireEvent.press(screen.getByTestId("home-password-check"));
    await waitFor(() => expect(screen.getByTestId("vault-check-input")).toBeTruthy());
    await fireEvent.press(screen.getByTestId("vault-check-later"));

    await waitFor(() => expect(mockAnswers).toEqual(["ignored"]));
    expect(screen.queryByTestId("home-password-check")).toBeNull();
  });
});
