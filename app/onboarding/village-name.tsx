import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, Paragraph, Text, useTheme, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { useHaptics } from "@/hooks/useHaptics";
import { useUserStore } from "@/stores/user";

const TOTAL_STEPS = 3;
const CURRENT_STEP = 3;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 20;

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS (extracted to reduce cognitive complexity)
// ─────────────────────────────────────────────────────────────────────────────

function StampOverlay({ villageName }: { villageName: string }) {
  return (
    <YStack
      fullscreen
      z={100}
      justify="center"
      items="center"
      animation="quick"
      enterStyle={{ opacity: 0 }}
    >
      {/* Semi-transparent background to keep image visible but dim it */}
      <YStack fullscreen bg="rgba(0, 0, 0, 0.6)" />

      {/* Main content */}
      <YStack
        items="center"
        gap="$6"
        px="$6"
        scale={1}
        animation="bouncy"
        enterStyle={{ scale: 0.3, opacity: 0, y: 50 }}
      >
        {/* Bati Logo */}
        <Image
          source={require("../../assets/app-icon.png")}
          style={{ width: 120, height: 120, borderRadius: 24 }}
          contentFit="contain"
        />

        {/* Village name */}
        <H1
          color="$text"
          fontFamily="$heading"
          fontSize={56}
          fontWeight="900"
          text="center"
          textShadowColor="rgba(0,0,0,0.5)"
          textShadowRadius={20}
          letterSpacing={1}
        >
          {villageName}
        </H1>
      </YStack>
    </YStack>
  );
}

function VillageNameHeader() {
  const { t } = useTranslation();

  return (
    <YStack gap="$6" items="center">
      <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />

      <YStack gap="$2" items="center" px="$4">
        <H1
          fontFamily="$heading"
          color="$text"
          fontSize={32}
          text="center"
          textShadowColor="rgba(0,0,0,0.5)"
          textShadowRadius={4}
        >
          {t("onboarding.village_name_title")}
        </H1>
        <Paragraph
          fontFamily="$body"
          color="$text"
          text="center"
          fontSize={16}
          textShadowColor="rgba(0,0,0,0.5)"
          textShadowRadius={4}
        >
          {t("onboarding.village_name_subtitle")}
        </Paragraph>
      </YStack>
    </YStack>
  );
}

interface InputSectionProps {
  name: string;
  onChangeText: (text: string) => void;
  isValidName: boolean;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
}

function InputSection({
  name,
  onChangeText,
  isValidName,
  isFocused,
  onFocus,
  onBlur,
}: InputSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const inputBorderColor = isFocused
    ? theme.primary?.val
    : isValidName
      ? theme.success?.val
      : theme.borderStrong?.val;

  return (
    <YStack gap="$2">
      <TextInput
        value={name}
        onChangeText={onChangeText}
        placeholder={t("onboarding.village_name_placeholder") ?? "e.g. Ironhold"}
        placeholderTextColor={theme.textSecondary?.val as string}
        onFocus={onFocus}
        onBlur={onBlur}
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
        <Text fontSize={12} color={isValidName ? "$success" : "$textSecondary"} fontWeight="600">
          {isValidName ? t("onboarding.valid") : `${MIN_NAME_LENGTH} ${t("onboarding.chars_min")}`}
        </Text>
        <Text fontSize={12} color="$textSecondary">
          {name.length}/{MAX_NAME_LENGTH}
        </Text>
      </XStack>
    </YStack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function VillageName() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { mediumImpact, success } = useHaptics();
  const { setVillageName, setHasFinishedOnboarding } = useUserStore();

  const [name, setName] = useState("");
  const [status, setStatus] = useState<"editing" | "stamped">("editing");
  const [isFocused, setIsFocused] = useState(false);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const isValidName = trimmedName.length >= MIN_NAME_LENGTH;

  const completeOnboarding = useCallback(() => {
    setVillageName(trimmedName);
    setHasFinishedOnboarding(true);
    router.replace("/");
  }, [router, setHasFinishedOnboarding, setVillageName, trimmedName]);

  const handleFinish = useCallback(() => {
    if (!isValidName) return;
    mediumImpact();
    setStatus("stamped");
  }, [isValidName, mediumImpact]);

  useEffect(() => {
    if (status !== "stamped") return;
    const id = setTimeout(() => {
      success();
      completeOnboarding();
    }, 1200);
    return () => clearTimeout(id);
  }, [status, success, completeOnboarding]);

  const handleChangeText = useCallback((text: string) => {
    setName(text.slice(0, MAX_NAME_LENGTH));
  }, []);

  return (
    <YStack flex={1} bg="$bgDark">
      {/* 1. IMMERSIVE BACKGROUND */}
      <Image
        source={require("../../assets/onboardings/splash-bg1.jpg")}
        style={{ position: "absolute", width: "100%", height: "100%" }}
        contentFit="cover"
      />

      {/* 2. GRADIENT OVERLAYS */}
      <LinearGradient
        colors={["rgba(11, 15, 25, 0.8)", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%" }}
      />
      <LinearGradient
        colors={["transparent", "rgba(11, 15, 25, 0.95)", "#0B0F19"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%" }}
      />

      {/* 3. STAMP ANIMATION OVERLAY */}
      {status === "stamped" && <StampOverlay villageName={trimmedName} />}

      {/* 4. MAIN CONTENT */}
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
          opacity={status === "editing" ? 1 : 0}
        >
          <VillageNameHeader />

          {/* INPUT SECTION */}
          <YStack gap="$6">
            <InputSection
              name={name}
              onChangeText={handleChangeText}
              isValidName={isValidName}
              isFocused={isFocused}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />

            {/* FINISH BUTTON */}
            <AppButton
              onPress={handleFinish}
              disabled={!isValidName}
              bg={isValidName ? "$primary" : "$surface"}
              borderColor={isValidName ? "$primary" : "$borderStrong"}
              borderWidth={0}
              rounded="$10"
              height={56}
              opacity={isValidName ? 1 : 0.5}
              shadowColor={isValidName ? "$primaryGlow" : undefined}
              shadowRadius={20}
              shadowOpacity={0.8}
            >
              <Text
                fontFamily="$heading"
                color={isValidName ? "white" : "$textSecondary"}
                fontSize={18}
                letterSpacing={1}
              >
                {t("onboarding.finish").toUpperCase()}
              </Text>
            </AppButton>
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </YStack>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 64,
    textAlign: "center",
    fontSize: 24,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontWeight: "600",
  },
});
