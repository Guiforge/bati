import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input, Sheet, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { X } from "@/components/icons";
import { MIN_PASSWORD_LENGTH } from "@/hooks/useBackupEncryption";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * - `enable`: choose a password, then read the recovery key once.
 * - `change`: choose a new password; the recovery key does not change.
 * - `recovery`: show a recovery key the fingerprint just unlocked.
 */
export type EncryptionSheetMode =
  | { kind: "enable" }
  | { kind: "change" }
  | { kind: "recovery"; recovery: string };

type Props = {
  mode: EncryptionSheetMode | null;
  canShowRecoveryAgain: boolean;
  onClose: () => void;
  /** Resolves to the recovery key to show, or `null` when setting up failed. */
  onEnable: (password: string) => Promise<string | null>;
  onChange: (password: string) => Promise<void>;
};

/**
 * Setting up encrypted backups, in the one place that has to be blunt: without the password or
 * the recovery key, nobody can open them. The recovery key is shown in the same sheet, straight
 * after, so there is no path that turns encryption on without the hero having seen it.
 *
 * The caller mounts it with a `key` per opening, so each one starts with empty fields.
 */
export function EncryptionSheet({
  mode,
  canShowRecoveryAgain,
  onClose,
  onEnable,
  onChange,
}: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [recovery, setRecovery] = useState<string | null>(
    mode?.kind === "recovery" ? mode.recovery : null,
  );
  const changing = mode?.kind === "change";

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  const choose = (password: string) =>
    changing
      ? onChange(password).then(close)
      : onEnable(password).then((shown) => (shown === null ? close() : setRecovery(shown)));

  const title =
    recovery !== null
      ? t("backup.recoveryTitle")
      : changing
        ? t("backup.changePassword")
        : t("backup.encryptionTitle");

  return (
    <Sheet
      modal
      open={mode !== null}
      onOpenChange={(next: boolean) => (next ? undefined : close())}
      snapPointsMode="fit"
      disableDrag
      transition={reducedMotion ? undefined : "quick"}
      zIndex={100_000}
    >
      <Sheet.Overlay
        bg="rgba(0,0,0,0.5)"
        transition={reducedMotion ? undefined : "quick"}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame bg="$surface">
        <YStack px="$4" pt="$4" pb={insets.bottom + 16} gap="$3">
          <XStack items="center" justify="space-between" gap="$3">
            <Text flex={1} fontWeight="700" fontSize={18} color="$text">
              {title}
            </Text>
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("common.close", "Close")}
              onPress={close}
            >
              <X size={20} color="$textSecondary" />
            </Pressable>
          </XStack>

          {recovery !== null ? (
            <RecoveryKeyView
              recovery={recovery}
              canShowAgain={canShowRecoveryAgain}
              onDone={close}
            />
          ) : (
            <PasswordForm changing={changing} onChoose={choose} />
          )}
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

function PasswordForm({
  changing,
  onChoose,
}: {
  changing: boolean;
  onChoose: (password: string) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = password.length >= MIN_PASSWORD_LENGTH && confirm === password && !busy;

  const submit = () => {
    if (!ready) return;
    Keyboard.dismiss();
    setBusy(true);
    // Up to a second of PBKDF2 on a slow phone; the button stays down until it is done.
    onChoose(password).then(
      () => setBusy(false),
      () => setBusy(false),
    );
  };

  return (
    <>
      <Text color="$textSecondary">
        {changing ? t("backup.changeIntro") : t("backup.encryptionIntro")}
      </Text>
      <Input
        testID="backup-password"
        minH={44}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        placeholder={t("backup.password")}
        bg="$background"
        borderColor="$borderStrong"
        color="$text"
      />
      <Input
        testID="backup-password-confirm"
        minH={44}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={submit}
        placeholder={t("backup.passwordConfirm")}
        bg="$background"
        borderColor="$borderStrong"
        color="$text"
      />
      {tooShort ? (
        <Text color="$error">{t("backup.passwordTooShort", { count: MIN_PASSWORD_LENGTH })}</Text>
      ) : null}
      {mismatch && !tooShort ? <Text color="$error">{t("backup.passwordMismatch")}</Text> : null}
      <AppButton testID="backup-password-submit" disabled={!ready} onPress={submit}>
        {changing ? t("backup.changePassword") : t("backup.encryptionCta")}
      </AppButton>
    </>
  );
}

function RecoveryKeyView({
  recovery,
  canShowAgain,
  onDone,
}: {
  recovery: string;
  canShowAgain: boolean;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Text color="$textSecondary">{t("backup.recoveryBody")}</Text>
      {/* Selectable, so it can go into a password manager without a clipboard dependency;
          groups of four, so it can be copied by hand without losing the place. */}
      <Text
        testID="backup-recovery-key"
        selectable
        fontSize={17}
        color="$text"
        bg="$background"
        p="$3"
        rounded="$3"
      >
        {recovery}
      </Text>
      <Text color="$textSecondary">
        {canShowAgain ? t("backup.recoveryAgainHint") : t("backup.recoveryOnceHint")}
      </Text>
      <AppButton testID="backup-recovery-done" onPress={onDone}>
        {t("backup.recoveryDone")}
      </AppButton>
    </>
  );
}
