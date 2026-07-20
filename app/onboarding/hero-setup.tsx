import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, useTheme, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { AVATARS, getAvatarById } from "@/constants/avatars";
import { useHaptics } from "@/hooks/useHaptics";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";

const TOTAL_STEPS = 3;
const CURRENT_STEP = 2;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 20;

// Merged avatar + village-name step: one lighter screen, tap-to-select strip (no swipe
// gesture, no full-screen background swap per avatar), name input below. See
// docs/planning/screen-redesign-proposals.md §2.
export default function HeroSetup() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { selection } = useHaptics();
  const { avatarId, setAvatarId } = useSettingsStore();
  const { setVillageName } = useUserStore();

  const [name, setName] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const currentAvatar = getAvatarById(avatarId);
  const trimmedName = useMemo(() => name.trim(), [name]);
  const isValidName = trimmedName.length >= MIN_NAME_LENGTH;

  const handleSelectAvatar = useCallback(
    (id: (typeof AVATARS)[number]["id"]) => {
      selection();
      setAvatarId(id).catch(() => {
        // Error handled silently: selection still reflected in UI state
      });
    },
    [selection, setAvatarId],
  );

  const handleChangeText = useCallback((text: string) => {
    setName(text.slice(0, MAX_NAME_LENGTH));
  }, []);

  const handleContinue = useCallback(() => {
    if (!isValidName) return;
    setVillageName(trimmedName);
    router.push("/onboarding/training-level");
  }, [isValidName, setVillageName, trimmedName, router]);

  const inputBorderColor = isFocused
    ? theme.primary?.val
    : isValidName
      ? theme.success?.val
      : theme.borderStrong?.val;

  return (
    <YStack flex={1} bg="$background">
      {/* Immersive background: the currently selected hero */}
      <Image
        source={currentAvatar.source}
        style={{ position: "absolute", width: "100%", height: "100%" }}
        contentFit="cover"
        contentPosition="top"
        transition={200}
      />
      <LinearGradient
        colors={["rgba(16, 19, 35, 0.85)", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%" }}
      />
      <LinearGradient
        colors={["transparent", "rgba(16, 19, 35, 0.92)", "#101323"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%" }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <YStack
          flex={1}
          justify="space-between"
          pt={insets.top + 20}
          pb={insets.bottom + 20}
          px="$5"
        >
          {/* Header */}
          <YStack gap="$3" items="center">
            <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />
            <H2
              text="center"
              color="$text"
              fontWeight="700"
              fontSize={28}
              textShadowColor="rgba(0,0,0,0.5)"
              textShadowOffset={{ width: 1, height: 1 }}
              textShadowRadius={4}
            >
              {t("onboarding.hero_setup_title", "Choose your hero")}
            </H2>
          </YStack>

          {/* Bottom section: avatar strip + name */}
          <YStack gap="$4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}
            >
              {AVATARS.map((a) => {
                const selected = a.id === avatarId;
                return (
                  <YStack
                    key={a.id}
                    width={72}
                    height={72}
                    rounded={36}
                    overflow="hidden"
                    borderWidth={selected ? 3 : 1}
                    borderColor={selected ? "$primary" : "$borderStrong"}
                    opacity={selected ? 1 : 0.6}
                    pressStyle={{ scale: 0.95 }}
                    onPress={() => handleSelectAvatar(a.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t(a.labelKey)}
                    accessibilityState={{ selected }}
                  >
                    <Image
                      source={a.source}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      contentPosition="top"
                    />
                  </YStack>
                );
              })}
            </ScrollView>

            <Text
              text="center"
              color="$text"
              fontSize={16}
              fontWeight="700"
              textShadowColor="rgba(0,0,0,0.5)"
              textShadowRadius={4}
            >
              {t(currentAvatar.labelKey)}
            </Text>

            {/* Name input */}
            <YStack gap="$2">
              <TextInput
                value={name}
                onChangeText={handleChangeText}
                placeholder={t("onboarding.village_name_placeholder") ?? "Your village name"}
                placeholderTextColor={theme.textSecondary?.val as string}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface?.val as string,
                    borderColor: inputBorderColor as string,
                    color: theme.text?.val as string,
                  },
                ]}
              />
              <XStack justify="space-between" px="$2">
                <Text
                  fontSize={12}
                  color={isValidName ? "$success" : "$textSecondary"}
                  fontWeight="700"
                >
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
              onPress={handleContinue}
              disabled={!isValidName}
              bg={isValidName ? "$primary" : "$surface"}
              borderColor={isValidName ? "$primary" : "$borderStrong"}
              borderWidth={0}
              rounded="$10"
              opacity={isValidName ? 1 : 0.5}
            >
              <Paragraph
                color={isValidName ? "white" : "$textSecondary"}
                fontWeight="700"
                fontSize={18}
              >
                {t("onboarding.next_avatar", "Continue")}
              </Paragraph>
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
    borderRadius: 16,
    paddingHorizontal: 16,
    fontWeight: "600",
  },
});
