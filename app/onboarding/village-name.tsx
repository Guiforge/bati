import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { useUserStore } from "@/stores/user";
import { Check, Pencil } from "@tamagui/lucide-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform } from "react-native";
import { H1, H2, Input, Text, XStack, YStack } from "tamagui";

const TOTAL_STEPS = 3;
const CURRENT_STEP = 3;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 20;

export default function VillageName() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"editing" | "submitting" | "stamped">("editing");
  const { setVillageName, setHasFinishedOnboarding } = useUserStore();

  const isValidName = name.trim().length >= MIN_NAME_LENGTH;

  const completeOnboarding = useCallback(() => {
    setVillageName(name.trim());
    setHasFinishedOnboarding(true);
    router.replace("/");
  }, [name, setVillageName, setHasFinishedOnboarding, router]);

  const handleFinish = () => {
    if (isValidName) {
      setStatus("submitting");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Sequence the animations using timeouts
      setTimeout(() => {
        setStatus("stamped");
      }, 300);
    }
  };

  useEffect(() => {
    if (status === "stamped") {
      // Wait for the stamp "impact"
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigate after a short delay
        setTimeout(() => {
          completeOnboarding();
        }, 800);
      }, 300);
    }
  }, [status, completeOnboarding]);

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Stamp Animation Layer */}
      {status === "stamped" && (
        <YStack
          fullscreen
          justifyContent="center"
          alignItems="center"
          zIndex={100}
          pointerEvents="none"
          animation="bouncy"
          enterStyle={{
            opacity: 0,
            scale: 3,
          }}
          opacity={1}
          scale={1}
        >
          <H1
            color="$color"
            fontSize={42}
            fontWeight="900"
            textAlign="center"
            textShadowColor="rgba(0,0,0,0.1)"
            textShadowOffset={{ width: 0, height: 4 }}
            textShadowRadius={10}
          >
            {name}
          </H1>
          <Text textAlign="center" fontSize={24} opacity={0.6}>
            🏰
          </Text>
        </YStack>
      )}

      <YStack
        flex={1}
        animation="lazy"
        opacity={status === "editing" ? 1 : 0}
        pointerEvents={status === "editing" ? "auto" : "none"}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <YStack flex={1} padding="$5" justifyContent="space-between">
            <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />

            <YStack flex={1} justifyContent="center" alignItems="center" gap="$5">
              <YStack
                width="100%"
                aspectRatio={16 / 9}
                maxHeight={180}
                backgroundColor="$bgLight"
                borderRadius="$10"
                justifyContent="center"
                alignItems="center"
                borderWidth={4}
                borderColor="$color"
                shadowColor="$color"
                shadowRadius={0}
                shadowOffset={{ width: 6, height: 6 }}
                overflow="hidden"
                animation="lazy"
                enterStyle={{ opacity: 0, scale: 0.9, y: -20 }}
              >
                <Image
                  source={require("../../assets/onboardings/new_city.jpg")}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </YStack>

              <YStack gap="$2" alignItems="center">
                <H2
                  textAlign="center"
                  color="$color"
                  fontWeight="900"
                  fontSize={24}
                  animation="lazy"
                  enterStyle={{ opacity: 0, y: 20 }}
                >
                  {t("onboarding.village_name_title")}
                </H2>
                <XStack alignItems="center" gap="$2">
                  <Pencil size={16} color="$color" opacity={0.5} />
                  <Text fontSize={13} color="$color" opacity={0.5}>
                    {t("onboarding.village_name_placeholder")}
                  </Text>
                </XStack>
              </YStack>

              <YStack width="100%" gap="$3">
                <Input
                  value={name}
                  onChangeText={(text) => setName(text.slice(0, MAX_NAME_LENGTH))}
                  placeholder={t("onboarding.village_name_placeholder")}
                  width="100%"
                  size="$6"
                  borderWidth={3}
                  borderColor={isValidName ? "$success" : "$color"}
                  borderRadius={16}
                  backgroundColor="$bgLight"
                  focusStyle={{ borderColor: "$primary", borderWidth: 4 }}
                  fontWeight="700"
                  fontSize={18}
                  textAlign="center"
                />
                <XStack justifyContent="space-between" paddingHorizontal="$3">
                  <XStack alignItems="center" gap="$1">
                    {isValidName ? <Check size={14} color="$success" /> : null}
                    <Text
                      fontSize={12}
                      color={isValidName ? "$success" : "$color"}
                      opacity={isValidName ? 1 : 0.5}
                      fontWeight={isValidName ? "700" : "400"}
                    >
                      {name.length < MIN_NAME_LENGTH
                        ? `${MIN_NAME_LENGTH - name.length} ${t("onboarding.chars_min") || "chars min"}`
                        : t("onboarding.valid") || "Valid!"}
                    </Text>
                  </XStack>
                  <Text fontSize={12} color="$color" opacity={0.5}>
                    {name.length}/{MAX_NAME_LENGTH}
                  </Text>
                </XStack>
              </YStack>
            </YStack>

            <YStack paddingBottom="$4" paddingTop="$3">
              <AppButton
                variant="primary"
                onPress={handleFinish}
                disabled={!isValidName}
                opacity={isValidName ? 1 : 0.4}
                backgroundColor={isValidName ? "$success" : "$color"}
              >
                {t("onboarding.finish")} 🚀
              </AppButton>
            </YStack>
          </YStack>
        </KeyboardAvoidingView>
      </YStack>
    </YStack>
  );
}
