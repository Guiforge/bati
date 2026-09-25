import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";
import { Input, Text } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { FormSheet } from "@/components/common/FormSheet";
import { MIN_PASSWORD_LENGTH } from "@/hooks/useBackupEncryption";

/**
 * - `enable`: choose a password, then read the recovery key once.
 * - `change`: a new password is a new key (src/backupCipher.ts `changePassword`), so a new
 *   recovery key is shown after it, exactly as on enabling.
 * - `manage`: encryption is on; what can be done with it.
 * - `recovery`: show a recovery key the fingerprint just unlocked.
 */
export type EncryptionSheetMode =
  | { kind: "enable" }
  | { kind: "change" }
  | { kind: "manage" }
  | { kind: "recovery"; recovery: string };

type Props = {
  mode: EncryptionSheetMode | null;
  canShowRecoveryAgain: boolean;
  onClose: () => void;
  /** Both resolve to the recovery key to show, or `null` when it failed. */
  onEnable: (password: string) => Promise<string | null>;
  onChange: (password: string) => Promise<string | null>;
  onShowRecovery: () => void;
  onDisable: () => void;
};

/**
 * Setting up encrypted backups, in the one place that has to be blunt: without the password or
 * the recovery key, nobody can open them. The recovery key is shown in the same sheet, straight
 * after, so there is no path that makes a key without the hero having seen what recovers it.
 *
 * The caller mounts it with a `key` per opening, so each one starts with empty fields.
 */
export function EncryptionSheet({
  mode,
  canShowRecoveryAgain,
  onClose,
  onEnable,
  onChange,
  onShowRecovery,
  onDisable,
}: Props) {
  const { t } = useTranslation();
  const [recovery, setRecovery] = useState<string | null>(
    mode?.kind === "recovery" ? mode.recovery : null,
  );
  const [changing, setChanging] = useState(mode?.kind === "change");

  const choose = (password: string) =>
    (changing ? onChange(password) : onEnable(password)).then((shown) =>
      shown === null ? onClose() : setRecovery(shown),
    );

  const title =
    recovery !== null
      ? t("backup.recoveryTitle")
      : changing
        ? t("backup.changePassword")
        : mode?.kind === "manage"
          ? t("backup.encryption")
          : t("backup.encryptionTitle");

  return (
    <FormSheet open={mode !== null} title={title} onClose={onClose}>
      {recovery !== null ? (
        <RecoveryKeyView recovery={recovery} canShowAgain={canShowRecoveryAgain} onDone={onClose} />
      ) : mode?.kind === "manage" && !changing ? (
        <ManageView
          canShowRecoveryAgain={canShowRecoveryAgain}
          onShowRecovery={onShowRecovery}
          onChange={() => setChanging(true)}
          onDisable={onDisable}
        />
      ) : (
        <PasswordForm changing={changing} onChoose={choose} />
      )}
    </FormSheet>
  );
}

function ManageView({
  canShowRecoveryAgain,
  onShowRecovery,
  onChange,
  onDisable,
}: {
  canShowRecoveryAgain: boolean;
  onShowRecovery: () => void;
  onChange: () => void;
  onDisable: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Text color="$textSecondary">{t("backup.encryptionOnMessage")}</Text>
      {canShowRecoveryAgain ? (
        <AppButton variant="outline" testID="backup-show-recovery" onPress={onShowRecovery}>
          {t("backup.showRecovery")}
        </AppButton>
      ) : null}
      <AppButton variant="outline" testID="backup-change-password" onPress={onChange}>
        {t("backup.changePassword")}
      </AppButton>
      <AppButton variant="secondary" testID="backup-disable-encryption" onPress={onDisable}>
        {t("backup.encryptionOffCta")}
      </AppButton>
    </>
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
