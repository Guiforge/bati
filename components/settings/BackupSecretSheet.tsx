import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input, Sheet, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { X } from "@/components/icons";
import type { SecretRequest } from "@/hooks/useBackup";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Props = {
  request: SecretRequest;
  onSubmit: (secret: string) => void;
  onCancel: () => void;
};

/**
 * The one question an encrypted backup asks: its password, or the recovery key. One field for
 * both, because the hero holding a recovery key should not have to know it is a different thing;
 * src/backupCipher.ts tells them apart by shape.
 *
 * Built like `OutingGoalSheet`, `disableDrag` included, and mounted by every screen that calls
 * `useBackup().runImport`, since the import pauses on it.
 */
export function BackupSecretSheet({ request, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [secret, setSecret] = useState("");

  const cancel = () => {
    Keyboard.dismiss();
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
    <Sheet
      modal
      open={request.open}
      onOpenChange={(next: boolean) => (next ? undefined : cancel())}
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
              {t("backup.secretTitle")}
            </Text>
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("common.close", "Close")}
              onPress={cancel}
            >
              <X size={20} color="$textSecondary" />
            </Pressable>
          </XStack>

          <Text color="$textSecondary">{t("backup.secretBody")}</Text>

          <Input
            testID="backup-secret-input"
            minH={44}
            value={secret}
            onChangeText={setSecret}
            secureTextEntry
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
          {request.wrong ? <Text color="$error">{t("backup.secretWrong")}</Text> : null}

          <AppButton testID="backup-secret-submit" disabled={secret === ""} onPress={submit}>
            {t("backup.secretCta")}
          </AppButton>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
