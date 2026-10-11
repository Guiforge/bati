import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTokens, H2, Text, useTheme, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { useToast } from "@/components/common/Toast";
import { FirstFire } from "@/components/onboarding/FirstFire";
import { ProgressDots } from "@/components/ProgressDots";
import { VILLAGE_NAMES } from "@/constants/onboarding";
import { useHaptics } from "@/hooks/useHaptics";
import { reportError } from "@/src/reportError";
import {
  VILLAGE_NAME_MAX_LENGTH as MAX_NAME_LENGTH,
  VILLAGE_NAME_MIN_LENGTH as MIN_NAME_LENGTH,
  useUserStore,
} from "@/stores/user";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 2;

// Name-your-village step. The avatar picker used to live here too, but the avatar has no
// gameplay and is editable in Settings — the only onboarding choice left is the name.
//
// Laid out as a plate, like a story panel: the title on ink, the painting whole in a band of its
// own, the field under it. Full-bleed, the hamlet's one lit window sat under the gradient and the
// copy, and the smoke ran behind the title.
export default function VillageSetup() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { success } = useHaptics();
  const setVillageName = useUserStore((s) => s.setVillageName);
  const { showError } = useToast();

  // Arrives named, so the button is live and the keyboard is a choice, not a toll.
  const [name, setName] = useState<string>(
    () => VILLAGE_NAMES[Math.floor(Math.random() * VILLAGE_NAMES.length)] ?? "",
  );
  const [isFocused, setIsFocused] = useState(false);
  // Under the keyboard a 640dp screen has room for the field and its button, not for the two
  // sentences above them: with those in, "Continuer" sat below the keys.
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => setTyping(true));
    const hidden = Keyboard.addListener("keyboardDidHide", () => setTyping(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const trimmedName = name.trim();
  const isValidName = trimmedName.length >= MIN_NAME_LENGTH;

  const handleChangeText = (text: string) => {
    setName(text.slice(0, MAX_NAME_LENGTH));
  };

  const handleContinue = async () => {
    if (!isValidName) return;
    success();
    try {
      await setVillageName(trimmedName);
    } catch (error) {
      // Without this, a failed write left the hero stuck on step 2 with a mute button.
      reportError("onboarding.villageName", error);
      showError(t("onboarding.save_error"));
      return;
    }
    router.push("/onboarding/training-level");
  };

  const inputBorderColor = isFocused ? theme.primary?.val : theme.borderStrong?.val;

  return (
    <YStack flex={1} bg="$bgDark">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <YStack flex={1} pt={insets.top + 8} pb={insets.bottom + 20} gap="$3">
          {/* Header */}
          <YStack gap="$2" items="center" px="$5">
            <YStack position="absolute" t={0} l="$2" z={1}>
              <ScreenBackButton />
            </YStack>
            <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />
            <H2 text="center" color="$text" fontWeight="700" fontSize={28}>
              {t("onboarding.village_name_title")}
            </H2>
          </YStack>

          <FirstFire name={trimmedName} lit={isValidName} />

          {/* Bottom section: subtitle + name */}
          <YStack gap="$3" px="$5">
            {typing ? null : (
              <>
                <Text text="center" color="$text" fontSize={16} fontWeight="700">
                  {t("onboarding.village_name_subtitle")}
                </Text>
                <Text text="center" color="$textSecondary" fontSize={13}>
                  {t("onboarding.village_name_hint")}
                </Text>
              </>
            )}

            {/* Name input */}
            <YStack gap="$2">
              <TextInput
                testID="onboarding-village-name"
                value={name}
                onChangeText={handleChangeText}
                // Typing replaces the drawn name instead of adding to it.
                selectTextOnFocus
                placeholder={t("onboarding.village_name_placeholder") ?? "Your village name"}
                placeholderTextColor={theme.textSecondary?.val as string}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface?.val as string,
                    borderRadius: getTokens().radius.$3.val,
                    borderColor: inputBorderColor as string,
                    color: theme.text?.val as string,
                  },
                ]}
              />
              {/* No green here: the plate above has the one warm light, and it is the answer to
                  "is this name good". */}
              <XStack justify="space-between" px="$2">
                <Text fontSize={12} color="$textSecondary" fontWeight="700">
                  {isValidName
                    ? t("onboarding.valid")
                    : `${MIN_NAME_LENGTH} ${t("onboarding.chars_min")}`}
                </Text>
                <Text fontSize={12} color="$textSecondary">
                  {name.length}/{MAX_NAME_LENGTH}
                </Text>
              </XStack>
            </YStack>

            <AppButton
              testID="onboarding-village-continue"
              onPress={() => {
                handleContinue().catch(() => {
                  // Errors already surfaced via showError above
                });
              }}
              disabled={!isValidName}
            >
              {t("onboarding.next")}
            </AppButton>
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </YStack>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 60,
    textAlign: "center",
    fontSize: 22,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontWeight: "600",
  },
});
