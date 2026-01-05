import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, H2, Input, Paragraph, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { GameIcon } from "@/components/common/GameIcon";
import { ProgressDots } from "@/components/ProgressDots";
import { useHaptics } from "@/hooks/useHaptics";
import { useUserStore } from "@/stores/user";

const TOTAL_STEPS = 3;
const CURRENT_STEP = 3;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 20;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex screen component, refactor planned
export default function VillageName() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { mediumImpact, success } = useHaptics();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"editing" | "stamped">("editing");
  const { setVillageName, setHasFinishedOnboarding } = useUserStore();

  const isValidName = name.trim().length >= MIN_NAME_LENGTH;

  const completeOnboarding = useCallback(() => {
    setVillageName(name.trim());
    setHasFinishedOnboarding(true);
    router.replace("/");
  }, [name, router, setHasFinishedOnboarding, setVillageName]);

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
    }, 350);

    return () => clearTimeout(id);
  }, [status, success, completeOnboarding]);

  return (
    <YStack flex={1} bg="$background">
      {/* Full-screen background image */}
      <Image
        source={require("../../assets/onboardings/new_city.jpg")}
        style={{ position: "absolute", width: "100%", height: "100%" }}
        contentFit="cover"
        contentPosition="center"
      />

      {/* Gradient overlays */}
      <LinearGradient
        colors={["rgba(16, 19, 35, 0.85)", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%" }}
      />
      <LinearGradient
        colors={["transparent", "rgba(16, 19, 35, 0.9)", "#101323"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%" }}
      />

      {/* Stamp Animation Layer */}
      {status === "stamped" ? (
        <YStack fullscreen justify="center" items="center" z={100} pointerEvents="none">
          <H1
            color="white"
            fontSize={48}
            fontWeight="900"
            text="center"
            textShadowColor="rgba(0,0,0,0.5)"
            textShadowOffset={{ width: 2, height: 2 }}
            textShadowRadius={10}
          >
            {name}
          </H1>
          <Text text="center" fontSize={32} mt="$2">
            🏰
          </Text>
        </YStack>
      ) : null}

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <YStack
          flex={1}
          justify="space-between"
          pt={insets.top + 20}
          pb={insets.bottom + 20}
          px="$5"
          opacity={status === "editing" ? 1 : 0}
          pointerEvents={status === "editing" ? "auto" : "none"}
        >
          {/* Header */}
          <YStack gap="$3" items="center">
            <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />
            <YStack gap="$2" items="center">
              <H2
                text="center"
                color="white"
                fontWeight="900"
                fontSize={28}
                textShadowColor="rgba(0,0,0,0.5)"
                textShadowOffset={{ width: 1, height: 1 }}
                textShadowRadius={4}
              >
                {t("onboarding.village_name_title")}
              </H2>
              <Paragraph
                text="center"
                color="$muted"
                fontWeight="500"
                textShadowColor="rgba(0,0,0,0.5)"
                textShadowOffset={{ width: 1, height: 1 }}
                textShadowRadius={4}
              >
                {t("onboarding.village_name_subtitle") || "Give your kingdom a name"}
              </Paragraph>
            </YStack>
          </YStack>

          {/* Bottom section with input and CTA */}
          <YStack gap="$5">
            {/* Input field */}
            <YStack gap="$3">
              <Input
                value={name}
                // biome-ignore lint/suspicious/noExplicitAny: Tamagui Input type definition mismatch
                onChangeText={(text: any) => {
                  setName(String(text).slice(0, MAX_NAME_LENGTH));
                }}
                placeholder={t("onboarding.village_name_placeholder") ?? ""}
                width="100%"
                size="$4"
                borderWidth={3}
                borderColor={isValidName ? "$success" : "rgba(255,255,255,0.3)"}
                rounded={16}
                bg="rgba(16, 19, 35, 0.8)"
                color="white"
                placeholderTextColor="$muted"
                focusStyle={{ borderColor: "$primary", borderWidth: 3 }}
                textAlign="center"
                height={56}
              />

              <XStack justify="space-between" px="$3">
                <XStack items="center" gap="$1">
                  {isValidName ? <GameIcon name="star" size={14} color="$success" /> : null}
                  <Text
                    fontSize={12}
                    color={isValidName ? "$success" : "$muted"}
                    fontWeight={isValidName ? "700" : "400"}
                  >
                    {name.trim().length < MIN_NAME_LENGTH
                      ? `${MIN_NAME_LENGTH - name.trim().length} ${t("onboarding.chars_min") || "chars min"}`
                      : t("onboarding.valid") || "Valid!"}
                  </Text>
                </XStack>
                <Text fontSize={12} color="$muted">
                  {name.length}/{MAX_NAME_LENGTH}
                </Text>
              </XStack>
            </YStack>

            {/* CTA Button */}
            <AppButton
              variant="primary"
              onPress={handleFinish}
              disabled={!isValidName}
              opacity={isValidName ? 1 : 0.4}
              rounded="$10"
              borderWidth={0}
              bg={isValidName ? "$success" : "$primary"}
            >
              <XStack items="center" gap="$2">
                <Text color="white" fontWeight="900" fontSize={18}>
                  {t("onboarding.finish")}
                </Text>
                {/* "Arrow" equivalent from available game icon set */}
                <GameIcon name="sword" size={20} color="white" />
              </XStack>
            </AppButton>
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </YStack>
  );
}
