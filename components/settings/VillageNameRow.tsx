import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInput } from "react-native";
import { Text, useTheme, XStack, YStack } from "tamagui";
import { useToast } from "@/components/common/Toast";
import { Castle } from "@/components/icons";
import { reportError } from "@/src/reportError";
import { useUserStore, VILLAGE_NAME_MAX_LENGTH, VILLAGE_NAME_MIN_LENGTH } from "@/stores/user";

// Same rule as onboarding: 3–20 chars, trimmed. A too-short entry is dropped and the old name
// stays; there is no "invalid" state to get stuck in — blur, and it is over.
export function VillageNameRow() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { showError } = useToast();
  const villageName = useUserStore((s) => s.villageName);
  const setVillageName = useUserStore((s) => s.setVillageName);
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    const next = draft?.trim() ?? "";
    setDraft(null);
    if (next.length < VILLAGE_NAME_MIN_LENGTH || next === villageName) return;
    setVillageName(next).catch((error) => {
      reportError("settings.villageName", error);
      showError(t("onboarding.save_error", "Could not save. Try again"));
    });
  };

  return (
    <XStack
      testID="settings-village-name"
      bg="$surface"
      borderColor={draft === null ? "$borderStrong" : "$primary"}
      borderWidth={1}
      rounded="$4"
      p="$3"
      items="center"
      gap="$3"
      onPress={() => setDraft(villageName)}
    >
      <Castle size={22} color="$text" />
      <YStack flex={1}>
        <Text fontSize="$4" fontWeight="bold" color="$text">
          {t("settings.village_name", "Village name")}
        </Text>
        {draft === null ? (
          <Text fontSize="$3" color="$textSecondary">
            {villageName || t("settings.tap_change", "Tap to change")}
          </Text>
        ) : (
          <TextInput
            testID="settings-village-name-input"
            autoFocus
            value={draft}
            maxLength={VILLAGE_NAME_MAX_LENGTH}
            onChangeText={setDraft}
            onBlur={commit}
            onSubmitEditing={commit}
            returnKeyType="done"
            style={{ color: theme.text?.val as string, fontSize: 16, padding: 0 }}
          />
        )}
      </YStack>
    </XStack>
  );
}
