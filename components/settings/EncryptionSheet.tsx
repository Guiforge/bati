import { useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { type ReactNode, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable } from "react-native";
import { Input, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { FormSheet } from "@/components/common/FormSheet";
import { useToast } from "@/components/common/Toast";
import { Eye, EyeOff } from "@/components/icons";
import { type UnlockSources, VaultUnlockFlow } from "@/components/settings/VaultUnlockFlow";
import { MIN_PASSWORD_LENGTH } from "@/src/backupCipher";
import { wordMatches } from "@/src/backupWords";
import { reportError } from "@/src/reportError";
import { copySensitive } from "@/src/sensitiveClipboard";
import type { UnlockResult, UnlockSource } from "@/src/vaultUnlock";

/**
 * What the sheet was opened for. All of them end in the same few screens, which is the point: a
 * hero who makes a key always sees the words that recover it, and is always asked to type two of
 * them back before the sheet says it is done.
 *
 * - `enable`: a password, the twelve words, the check, and the one warning that matters.
 * - `change`: a new password is a new key (`changePassword`), so new words, exactly as on enabling.
 * - `update`: the same, for a vault from an older build, with a screen that says why first.
 * - `forgot`: "I don't remember it". A new password on the same key; the words are untouched.
 * - `newWords`: new words on the same key, for a hero who lost the paper.
 * - `recovery`: the words, shown again after the fingerprint.
 * - `verify`: an abandoned setup, picked up where it stopped; `words` is `null` when this phone
 *   cannot show them (no fingerprint), and the only ways forward are new words or a new password.
 * - `manage`: encryption is on; what can be done with it.
 * - `unlock`: encryption is on but this phone holds no key: get it back from the password or words
 *   the hero has, and only after a warning offer a new password (`enable`).
 */
export type EncryptionSheetMode =
  | { kind: "enable" }
  | { kind: "change" }
  | { kind: "update" }
  | { kind: "forgot" }
  | { kind: "newWords" }
  | { kind: "recovery"; words: string }
  | { kind: "verify"; words: string | null }
  | { kind: "manage" }
  | { kind: "unlock" };

export type EncryptionActions = {
  /** Resolve to the twelve words to show, or `null` when it failed (and said so). */
  enable: (password: string) => Promise<string | null>;
  change: (password: string) => Promise<string | null>;
  newWords: () => Promise<string | null>;
  forgot: (password: string) => Promise<boolean>;
  /** True when a device of the hero's is still waiting for a password: the update waits. */
  updateBlocked: () => Promise<boolean>;
  wordsChecked: () => Promise<void>;
  showWords: () => void;
  /** The hero's answer to "ask me again from time to time". */
  remind: (on: boolean) => Promise<void>;
  checkPassword: () => void;
  update: () => void;
  forgotOpen: () => void;
  newWordsOpen: () => void;
  changeOpen: () => void;
  disable: () => void;
  unlock: (source: UnlockSource, secret: string) => Promise<UnlockResult>;
  unlockSources: () => Promise<UnlockSources>;
};

type Props = {
  mode: EncryptionSheetMode | null;
  /** The app's language: a German hero is told the words are English. */
  language: string;
  format: 2 | 3 | null;
  /** A format 2 vault is only offered the update once the first 14 days have passed. */
  updateOffered: boolean;
  canShowWordsAgain: boolean;
  actions: EncryptionActions;
  onClose: () => void;
};

type Step = "manage" | "intro" | "password" | "words" | "verify" | "done" | "noWords" | "unlock";
type Pending = "enable" | "change" | "forgot";

const firstStep = (mode: EncryptionSheetMode | null): Step => {
  switch (mode?.kind) {
    case "manage":
      return "manage";
    case "unlock":
      return "unlock";
    case "update":
    case "forgot":
    case "newWords":
      return "intro";
    case "recovery":
      return "words";
    case "verify":
      return mode.words === null ? "noWords" : "verify";
    default:
      return "password";
  }
};

/** What the password step is for, from how the sheet was opened. `forgot` keeps the key. */
const firstPending = (mode: EncryptionSheetMode | null): Pending => {
  if (mode?.kind === "forgot") return "forgot";
  return mode?.kind === "enable" || mode?.kind === "unlock" ? "enable" : "change";
};

/** The sheet's title for where the hero is in it. */
function titleFor(
  t: TFunction,
  step: Step,
  pending: Pending,
  mode: EncryptionSheetMode | null,
): string {
  const fixed: Partial<Record<Step, string>> = {
    manage: t("backup.encryption"),
    words: t("vault.wordsTitle"),
    verify: t("vault.verifyTitle"),
    done: t("vault.doneTitle"),
    noWords: t("vault.pendingTitle"),
    unlock: t("vault.unlock.title"),
  };
  const known = fixed[step];
  if (known !== undefined) return known;
  if (step === "password")
    return pending === "enable" ? t("vault.pwTitle") : t("vault.pwTitleChange");
  const intros: Record<string, string> = { update: "updateTitle", forgot: "forgotTitle" };
  const intro = intros[mode?.kind ?? ""];
  return t(`vault.${intro ?? "newWordsTitle"}`);
}

/**
 * Setting up encrypted backups, in the one place that has to be blunt: without the password or the
 * twelve words, nobody can open them. The words are shown in this same sheet, straight after the
 * password, and typed back before it ends, so there is no path that makes a key without the hero
 * having seen, and written down, what recovers it.
 *
 * The caller mounts it with a `key` per opening, so each one starts clean.
 */
export function EncryptionSheet({
  mode,
  language,
  format,
  updateOffered,
  canShowWordsAgain,
  actions,
  onClose,
}: Props) {
  const { t } = useTranslation();
  // Read here and handed down: a Sheet's content is portalled outside the toast provider, and a
  // `useToast` inside it crashed the app the moment the words appeared. Jest mocks the hook, so
  // only a device can see this; do not move these into the views.
  const { showSuccess } = useToast();
  const router = useRouter();
  const openHow = () => router.push("/encryption" as never);
  const [step, setStep] = useState<Step>(firstStep(mode));
  const [words, setWords] = useState<string | null>(
    mode?.kind === "recovery" || mode?.kind === "verify" ? mode.words : null,
  );
  const [pending, setPending] = useState<Pending>(firstPending(mode));
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  /** The words a call made, or the sheet closing when it failed (the call already said so). */
  const show = (made: string | null) => {
    if (made === null) {
      onClose();
      return;
    }
    setWords(made);
    setStep("words");
  };

  const continueUpdate = () => {
    setBusy(true);
    actions
      .updateBlocked()
      .then((stuck) => {
        setBlocked(stuck);
        if (!stuck) setStep("password");
      })
      .catch((error: unknown) => reportError("backup.update.blockers", error))
      .finally(() => setBusy(false));
  };

  // A ref, not `busy`: two taps in one frame both read the state as it was, and two re-wraps
  // computed the same generation, so the words shown could be the ones the other overwrote.
  const makingWords = useRef(false);
  const makeNewWords = () => {
    if (makingWords.current) return;
    makingWords.current = true;
    setBusy(true);
    actions
      .newWords()
      .then(show)
      .catch((error: unknown) => reportError("backup.newWords", error))
      .finally(() => {
        makingWords.current = false;
        setBusy(false);
      });
  };

  const choosePassword = (password: string) => {
    if (pending === "forgot") {
      return actions.forgot(password).then((saved) => (saved ? setStep("done") : onClose()));
    }
    return (pending === "enable" ? actions.enable(password) : actions.change(password)).then(show);
  };

  const introKind = mode?.kind === "forgot" || mode?.kind === "update" ? mode.kind : "newWords";
  const viewOnly = mode?.kind === "recovery";

  const views: Record<Step, ReactNode> = {
    manage: (
      <ManageView
        format={format}
        updateOffered={updateOffered}
        canShowWordsAgain={canShowWordsAgain}
        actions={actions}
        onHow={openHow}
      />
    ),
    intro: (
      <IntroView
        kind={introKind}
        blocked={blocked}
        busy={busy}
        onContinue={() => {
          if (introKind === "update") continueUpdate();
          else if (introKind === "forgot") setStep("password");
          else makeNewWords();
        }}
        onLater={onClose}
      />
    ),
    unlock: (
      <VaultUnlockFlow
        unlock={actions.unlock}
        sources={actions.unlockSources}
        onUnlocked={() => {
          showSuccess(t("vault.unlock.done"));
          onClose();
        }}
        onCreate={() => setStep("password")}
      />
    ),
    password: <PasswordForm pending={pending} onChoose={choosePassword} />,
    words: (
      <WordsView
        onCopied={() => showSuccess(t("vault.wordsCopied"))}
        words={words ?? ""}
        language={language}
        viewOnly={viewOnly}
        onNext={() => (viewOnly ? onClose() : setStep("verify"))}
      />
    ),
    verify: (
      <VerifyView
        words={words ?? ""}
        onBack={() => setStep("words")}
        onChecked={() => actions.wordsChecked().then(() => setStep("done"))}
      />
    ),
    noWords: (
      <NoWordsView
        busy={busy}
        onNewWords={makeNewWords}
        onChange={() => {
          setPending("change");
          setStep("password");
        }}
      />
    ),
    done: (
      <DoneView
        kept={pending === "forgot"}
        onChoose={(on) => actions.remind(on).then(onClose)}
        onHow={openHow}
      />
    ),
  };

  return (
    <FormSheet open={mode !== null} title={titleFor(t, step, pending, mode)} onClose={onClose}>
      {views[step]}
    </FormSheet>
  );
}

function ManageView({
  format,
  updateOffered,
  canShowWordsAgain,
  actions,
  onHow,
}: {
  format: 2 | 3 | null;
  updateOffered: boolean;
  canShowWordsAgain: boolean;
  actions: EncryptionActions;
  onHow: () => void;
}) {
  const { t } = useTranslation();
  // A vault from an older build has no words and no re-wraps: what it can do is be updated.
  if (format === 2) {
    return (
      <>
        <Text color="$textSecondary">
          {updateOffered ? t("vault.updateBody") : t("vault.manageHold")}
        </Text>
        {updateOffered ? (
          <AppButton testID="vault-update" onPress={actions.update}>
            {t("vault.manageUpdate")}
          </AppButton>
        ) : null}
        <AppButton variant="secondary" testID="backup-disable-encryption" onPress={actions.disable}>
          {t("backup.encryptionOffCta")}
        </AppButton>
      </>
    );
  }
  return (
    <>
      <Text color="$textSecondary">{t("vault.manageBody")}</Text>
      {canShowWordsAgain ? (
        <AppButton variant="outline" testID="backup-show-recovery" onPress={actions.showWords}>
          {t("vault.manageShowWords")}
        </AppButton>
      ) : (
        // A missing button reads as a lost key: say where it is instead.
        <Text testID="backup-recovery-not-here" color="$textSecondary" fontSize="$3">
          {t("vault.manageNoWords")}
        </Text>
      )}
      <AppButton variant="outline" testID="vault-check" onPress={actions.checkPassword}>
        {t("vault.manageCheck")}
      </AppButton>
      <AppButton variant="outline" testID="vault-forgot" onPress={actions.forgotOpen}>
        {t("vault.manageForgot")}
      </AppButton>
      <AppButton variant="outline" testID="vault-new-words" onPress={actions.newWordsOpen}>
        {t("vault.manageNewWords")}
      </AppButton>
      <AppButton variant="outline" testID="backup-change-password" onPress={actions.changeOpen}>
        {t("backup.changePassword")}
      </AppButton>
      <AppButton variant="secondary" testID="backup-disable-encryption" onPress={actions.disable}>
        {t("backup.encryptionOffCta")}
      </AppButton>
      <AppButton variant="outline" testID="vault-how" onPress={onHow}>
        {t("vault.manageHow")}
      </AppButton>
    </>
  );
}

function IntroView({
  kind,
  blocked,
  busy,
  onContinue,
  onLater,
}: {
  kind: "update" | "forgot" | "newWords";
  blocked: boolean;
  busy: boolean;
  onContinue: () => void;
  onLater: () => void;
}) {
  const { t } = useTranslation();
  const body = {
    update: t("vault.updateBody"),
    forgot: t("vault.forgotBody"),
    newWords: t("vault.newWordsBody"),
  }[kind];
  const cta = {
    update: t("vault.updateCta"),
    forgot: t("vault.forgotCta"),
    newWords: t("vault.newWordsCta"),
  }[kind];
  const label = busy && kind === "update" ? t("vault.updateChecking") : cta;
  return (
    <>
      <Text color="$textSecondary">{body}</Text>
      {kind === "forgot" ? (
        <Text color="$textSecondary" fontSize="$3">
          {t("vault.forgotHonest")}
        </Text>
      ) : null}
      {blocked ? (
        <Text testID="vault-update-blocked" color="$error">
          {t("vault.updateBlocked")}
        </Text>
      ) : null}
      <AppButton testID="vault-intro-continue" disabled={busy} onPress={onContinue}>
        {label}
      </AppButton>
      {kind === "forgot" ? (
        <AppButton variant="outline" testID="vault-intro-later" onPress={onLater}>
          {t("vault.forgotLater")}
        </AppButton>
      ) : null}
    </>
  );
}

const length = (value: string) => [...value.normalize("NFC")].length;

function PasswordForm({
  pending,
  onChoose,
}: {
  pending: Pending;
  onChoose: (password: string) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(true);
  const [busy, setBusy] = useState(false);
  // The state alone lets Enter and a tap in the same frame both through: two vaults.
  const submitting = useRef(false);
  const missing = MIN_PASSWORD_LENGTH - length(password);
  const ready = missing <= 0 && !busy;

  const submit = () => {
    if (!ready || submitting.current) return;
    submitting.current = true;
    Keyboard.dismiss();
    setBusy(true);
    const done = () => {
      submitting.current = false;
      setBusy(false);
    };
    // Up to a second of Argon2 on a slow phone; the button stays down until it is done.
    onChoose(password).then(done, done);
  };

  return (
    <>
      <Text color="$textSecondary">
        {pending === "enable" ? t("backup.encryptionIntro") : t("backup.changeIntro")}
      </Text>
      <XStack items="center" gap="$2">
        <Input
          testID="backup-password"
          flex={1}
          minH={44}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
          placeholder={t("backup.password")}
          bg="$background"
          borderColor="$borderStrong"
          color="$text"
        />
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={shown ? t("vault.pwHide") : t("vault.pwShow")}
          onPress={() => setShown((value) => !value)}
        >
          {shown ? (
            <EyeOff size={22} color="$textSecondary" />
          ) : (
            <Eye size={22} color="$textSecondary" />
          )}
        </Pressable>
      </XStack>
      {/* A counter that encourages, not an error: the hero is still typing. */}
      <Text testID="vault-password-counter" color="$textSecondary" fontSize="$3">
        {password === ""
          ? t("vault.pwHint", { count: MIN_PASSWORD_LENGTH })
          : missing > 0
            ? t("vault.pwMore", { count: missing })
            : t("vault.pwReread")}
      </Text>
      <Text color="$textSecondary" fontSize="$3">
        {t("vault.pwNotCloud")}
      </Text>
      <AppButton testID="backup-password-submit" disabled={!ready} onPress={submit}>
        {t("vault.pwCta")}
      </AppButton>
    </>
  );
}

function WordsView({
  words,
  language,
  viewOnly,
  onNext,
  onCopied,
}: {
  words: string;
  language: string;
  viewOnly: boolean;
  onNext: () => void;
  onCopied: () => void;
}) {
  const { t } = useTranslation();
  const numbered = words.split(" ").map((word, i) => ({ n: i + 1, word }));
  return (
    <>
      <Text color="$textSecondary">{t("vault.wordsBody")}</Text>
      {/* Two numbered columns, large enough at 130 %; TalkBack reads "word 3, bee". */}
      <XStack testID="vault-words" flexWrap="wrap" bg="$background" p="$3" rounded="$3" gap="$2">
        {numbered.map(({ n, word }) => (
          <Text
            key={n}
            testID={`vault-word-${n}`}
            width="47%"
            fontSize="$5"
            color="$text"
            selectable
            accessibilityLabel={t("vault.wordA11y", { n, word })}
          >
            {`${n}. ${word}`}
          </Text>
        ))}
      </XStack>
      {language === "de" ? (
        <Text testID="vault-words-english" color="$textSecondary" fontSize="$3">
          {t("vault.wordsEnglishOnly")}
        </Text>
      ) : null}
      <AppButton
        testID="vault-words-copy"
        variant="outline"
        onPress={() => {
          copySensitive(words).then(onCopied, (error: unknown) =>
            reportError("backup.recoveryCopy", error),
          );
        }}
      >
        {t("vault.wordsCopy")}
      </AppButton>
      <Text color="$textSecondary" fontSize="$3">
        {t("vault.wordsPaper")}
      </Text>
      <AppButton testID="vault-words-next" onPress={onNext}>
        {viewOnly ? t("vault.doneClose") : t("vault.wordsNext")}
      </AppButton>
    </>
  );
}

/** Two different places in the twelve, chosen once per opening. */
function twoPlaces(): [number, number] {
  const first = Math.floor(Math.random() * 12);
  let second = Math.floor(Math.random() * 11);
  if (second >= first) second += 1;
  return [Math.min(first, second), Math.max(first, second)];
}

function VerifyView({
  words,
  onBack,
  onChecked,
}: {
  words: string;
  onBack: () => void;
  onChecked: () => void;
}) {
  const { t } = useTranslation();
  const list = words.split(" ");
  const [places] = useState(twoPlaces);
  const [typed, setTyped] = useState(["", ""]);
  const [wrong, setWrong] = useState(false);

  const check = () => {
    const right = places.every((place, i) => wordMatches(typed[i] ?? "", list[place] ?? ""));
    if (right) onChecked();
    else setWrong(true);
  };

  return (
    <>
      <Text color="$textSecondary">
        {t("vault.verifyBody", { a: places[0] + 1, b: places[1] + 1 })}
      </Text>
      {places.map((place, i) => (
        <Input
          key={place}
          testID={`vault-verify-${i}`}
          minH={44}
          value={typed[i]}
          onChangeText={(value) => {
            setWrong(false);
            setTyped((current) => current.map((v, j) => (j === i ? value : v)));
          }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t("vault.verifyLabel", { n: place + 1 })}
          bg="$background"
          borderColor={wrong ? "$error" : "$borderStrong"}
          color="$text"
        />
      ))}
      {wrong ? (
        <Text testID="vault-verify-wrong" color="$error">
          {t("vault.verifyWrong")}
        </Text>
      ) : null}
      <AppButton testID="vault-verify-submit" onPress={check}>
        {t("vault.verifyCta")}
      </AppButton>
      <AppButton variant="outline" testID="vault-verify-back" onPress={onBack}>
        {t("vault.verifyBack")}
      </AppButton>
    </>
  );
}

function NoWordsView({
  busy,
  onNewWords,
  onChange,
}: {
  busy: boolean;
  onNewWords: () => void;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Text color="$textSecondary">{t("vault.pendingNoWords")}</Text>
      <AppButton testID="vault-pending-new" disabled={busy} onPress={onNewWords}>
        {t("vault.pendingNew")}
      </AppButton>
      <AppButton variant="outline" testID="vault-pending-change" disabled={busy} onPress={onChange}>
        {t("vault.pendingChange")}
      </AppButton>
    </>
  );
}

function DoneView({
  kept,
  onChoose,
  onHow,
}: {
  kept: boolean;
  onChoose: (on: boolean) => Promise<unknown>;
  onHow: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const choose = (on: boolean) => {
    setBusy(true);
    onChoose(on).then(
      () => setBusy(false),
      () => setBusy(false),
    );
  };
  return (
    <>
      {kept ? (
        <Text testID="vault-forgot-done" color="$textSecondary">
          {t("vault.forgotDone")}
        </Text>
      ) : null}
      <YStack testID="vault-warning" gap="$1" bg="$background" p="$3" rounded="$3">
        <Text fontWeight="bold" color="$text">
          {t("vault.doneWarnTitle")}
        </Text>
        <Text color="$textSecondary">{t("vault.doneWarnBody")}</Text>
      </YStack>
      <AppButton testID="vault-remind-yes" disabled={busy} onPress={() => choose(true)}>
        {t("vault.doneRemind")}
      </AppButton>
      <AppButton
        variant="outline"
        testID="vault-remind-no"
        disabled={busy}
        onPress={() => choose(false)}
      >
        {t("vault.doneNoRemind")}
      </AppButton>
      <Pressable accessibilityRole="link" onPress={onHow} testID="vault-how-link">
        <Text color="$primaryText" fontSize="$3">
          {t("vault.doneHow")}
        </Text>
      </Pressable>
    </>
  );
}
