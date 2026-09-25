import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable } from "react-native";
import { Input, Text, XStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { FormSheet } from "@/components/common/FormSheet";
import { Eye, EyeOff } from "@/components/icons";
import type { SecretRequest } from "@/hooks/useBackup";

type Props = {
  request: SecretRequest;
  onSubmit: (secret: string) => void;
  onCancel: () => void;
  /** Defaults to an encrypted backup's; the sync prompt asks the same thing about a device. */
  title?: string;
  body?: string;
};

/**
 * The one question an encrypted file asks: its password, or the recovery key. One field for both,
 * because the hero holding a recovery key should not have to know it is a different thing;
 * src/backupCipher.ts tells them apart by shape. The eye shows what is typed: a 64-character
 * recovery key copied off paper is not something to type blind.
 *
 * Mounted by every screen that calls `useBackup().runImport`, since the import pauses on it.
 */
export function BackupSecretSheet({ request, onSubmit, onCancel, title, body }: Props) {
  const { t } = useTranslation();
  const [secret, setSecret] = useState("");
  const [shown, setShown] = useState(false);

  const cancel = () => {
    setSecret("");
    onCancel();
  };

  const submit = () => {
    if (secret === "") return;
    Keyboard.dismiss();
    onSubmit(secret);
    // Cleared on the way out: a wrong password reopens the sheet, and retyping into the rejected
    // attempt is how the same typo is submitted twice.
    setSecret("");
  };

  return (
    <FormSheet open={request.open} title={title ?? t("backup.secretTitle")} onClose={cancel}>
      <Text color="$textSecondary">{body ?? t("backup.secretBody")}</Text>

      <XStack items="center" gap="$2">
        <Input
          testID="backup-secret-input"
          flex={1}
          minH={44}
          value={secret}
          onChangeText={setSecret}
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
          placeholder={t("backup.secretPlaceholder")}
          bg="$background"
          borderColor={request.wrong ? "$error" : "$borderStrong"}
          color="$text"
        />
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={shown ? t("backup.hideSecret") : t("backup.showSecret")}
          onPress={() => setShown((value) => !value)}
        >
          {shown ? (
            <EyeOff size={22} color="$textSecondary" />
          ) : (
            <Eye size={22} color="$textSecondary" />
          )}
        </Pressable>
      </XStack>
      {request.wrong ? <Text color="$error">{t("backup.secretWrong")}</Text> : null}

      <AppButton testID="backup-secret-submit" disabled={secret === ""} onPress={submit}>
        {t("backup.secretCta")}
      </AppButton>
    </FormSheet>
  );
}
