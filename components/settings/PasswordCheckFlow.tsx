import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";
import { Input, Text } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { FormSheet } from "@/components/common/FormSheet";
import { type EncryptionActions, EncryptionSheet } from "@/components/settings/EncryptionSheet";
import { useBackupEncryption } from "@/hooks/useBackupEncryption";
import { i18n } from "@/i18n";
import { reportError } from "@/src/reportError";

export type CheckAnswer = "right" | "wrong" | "ignored";

type Props = {
  open: boolean;
  onClose: () => void;
  /** What the hero did, said once when the sheet closes: it moves the reminder schedule. */
  onAnswer?: (answer: CheckAnswer) => void;
};

const nothing = () => undefined;

/**
 * "Is the password still in your head?": one field, and nothing is stored or changed by typing it.
 * Right earns a kind word, wrong a gentler one (the hero is practising, not failing), and the way
 * out of a password that is gone is one tap away, since being asked it is exactly when it is found
 * out. That way out opens the "I don't remember it" flow on the same key: nothing was seen, so
 * nothing needs cutting off.
 *
 * Used by the Home card and by Settings, so both ask in the same words.
 */
export function PasswordCheckFlow({ open, onClose, onAnswer }: Props) {
  const { t } = useTranslation();
  const encryption = useBackupEncryption();
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<"right" | "wrong" | null>(null);
  const [everRight, setEverRight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [forgetting, setForgetting] = useState(false);

  const finish = (later: boolean) => {
    // The last word is the best one: wrong and then right is right; nothing tried is ignored.
    const answer: CheckAnswer = everRight ? "right" : result === "wrong" ? "wrong" : "ignored";
    onAnswer?.(later && result === null ? "ignored" : answer);
    setPassword("");
    setResult(null);
    setEverRight(false);
    onClose();
  };

  const submit = () => {
    if (password === "" || busy) return;
    Keyboard.dismiss();
    setBusy(true);
    encryption.checkPassword(password).then(
      (right) => {
        setBusy(false);
        setResult(right ? "right" : "wrong");
        if (right) setEverRight(true);
        setPassword("");
      },
      (error: unknown) => {
        setBusy(false);
        reportError("backup.checkPassword", error);
      },
    );
  };

  const forgotActions: EncryptionActions = {
    enable: () => Promise.resolve(null),
    change: () => Promise.resolve(null),
    newWords: () => Promise.resolve(null),
    forgot: encryption.forgot,
    updateBlocked: () => Promise.resolve(false),
    wordsChecked: () => Promise.resolve(),
    showWords: nothing,
    remind: encryption.remind,
    checkPassword: nothing,
    update: nothing,
    forgotOpen: nothing,
    newWordsOpen: nothing,
    changeOpen: nothing,
    disable: nothing,
    unlock: () => Promise.resolve("cancelled"),
    unlockSources: () => Promise.resolve({ server: false, folder: false }),
  };

  return (
    <>
      <FormSheet
        open={open && !forgetting}
        title={t("vault.checkTitle")}
        onClose={() => finish(true)}
      >
        {result === "right" ? (
          <>
            <Text testID="vault-check-right" color="$text">
              {t("vault.checkRight")}
            </Text>
            <AppButton testID="vault-check-close" onPress={() => finish(false)}>
              {t("vault.checkClose")}
            </AppButton>
          </>
        ) : (
          <>
            <Text color="$textSecondary">{t("vault.checkBody")}</Text>
            <Input
              testID="vault-check-input"
              minH={44}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={submit}
              placeholder={t("vault.checkPlaceholder")}
              bg="$background"
              borderColor={result === "wrong" ? "$error" : "$borderStrong"}
              color="$text"
            />
            {result === "wrong" ? (
              <Text testID="vault-check-wrong" color="$textSecondary">
                {t("vault.checkWrong")}
              </Text>
            ) : null}
            <AppButton
              testID="vault-check-submit"
              disabled={password === "" || busy}
              onPress={submit}
            >
              {t("vault.checkCta")}
            </AppButton>
            <AppButton
              variant="outline"
              testID="vault-check-forgot"
              onPress={() => setForgetting(true)}
            >
              {t("vault.checkForgot")}
            </AppButton>
            <AppButton variant="outline" testID="vault-check-later" onPress={() => finish(true)}>
              {t("vault.checkLater")}
            </AppButton>
          </>
        )}
      </FormSheet>
      <EncryptionSheet
        key={forgetting ? "forgot" : "closed"}
        mode={forgetting ? { kind: "forgot" } : null}
        language={i18n.language}
        format={3}
        updateOffered={false}
        canShowWordsAgain={false}
        actions={forgotActions}
        onClose={() => {
          if (!forgetting) return;
          setForgetting(false);
          // A new password was just chosen, or the hero changed their mind: either way this
          // question has been answered, and a right one is not the thing to record.
          finish(true);
        }}
      />
    </>
  );
}
