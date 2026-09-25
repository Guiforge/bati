import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input, Sheet, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { X } from "@/components/icons";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Resolves once the browser sign-in is approved and the first sync ran, or was abandoned. */
  onConnect: (server: string) => Promise<boolean>;
  onCancel: () => void;
};

/**
 * One field, the server's address, and nothing else: the hero signs in on their own server's page
 * in their own browser (Nextcloud's Login Flow v2), so Bati never sees their password and there is
 * no second field to get wrong. The sheet waits while they do, and says where to look.
 *
 * Built like `EncryptionSheet`, keyboard lift included.
 */
export function NextcloudSheet({ open, onClose, onConnect, onCancel }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [server, setServer] = useState("");
  const [waiting, setWaiting] = useState(false);

  const close = () => {
    Keyboard.dismiss();
    if (waiting) onCancel();
    setWaiting(false);
    onClose();
  };

  const submit = () => {
    if (server.trim() === "" || waiting) return;
    Keyboard.dismiss();
    setWaiting(true);
    onConnect(server).then(
      (connected) => {
        setWaiting(false);
        if (connected) onClose();
      },
      () => setWaiting(false),
    );
  };

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={(next: boolean) => (next ? undefined : close())}
      snapPointsMode="fit"
      disableDrag
      moveOnKeyboardChange
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
              {t("sync.connectTitle")}
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

          <Text color="$textSecondary">
            {waiting ? t("sync.connectWaiting") : t("sync.connectIntro")}
          </Text>

          {waiting ? null : (
            <Input
              testID="sync-server"
              minH={44}
              value={server}
              onChangeText={setServer}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              autoFocus
              returnKeyType="go"
              onSubmitEditing={submit}
              placeholder={t("sync.serverPlaceholder")}
              bg="$background"
              borderColor="$borderStrong"
              color="$text"
            />
          )}

          <AppButton
            testID="sync-connect"
            variant={waiting ? "outline" : "primary"}
            disabled={!waiting && server.trim() === ""}
            onPress={waiting ? close : submit}
          >
            {waiting ? t("common.cancel") : t("sync.connectCta")}
          </AppButton>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
