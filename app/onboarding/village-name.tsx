import { Check, Pencil } from "@tamagui/lucide-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { H1, H2, Input, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { useUserStore } from "@/stores/user";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 4;
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStatus("stamped");
    }
  };

  useEffect(() => {
    if (status === "stamped") {
      const id = setTimeout(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        completeOnboarding();
      }, 350);

      return () => clearTimeout(id);
    }
  }, [status, completeOnboarding]);

  return (
    <YStack flex={1} bg="$background">
      {/* Stamp Animation Layer */}
      {status === "stamped" && (
        <YStack fullscreen justify="center" items="center" z={100} pointerEvents="none" opacity={1}>
          <H1
            color="$color"
            fontSize={42}
            fontWeight="900"
            text="center"
            textShadowColor="rgba(0,0,0,0.1)"
            textShadowOffset={{ width: 0, height: 4 }}
            textShadowRadius={10}
          >
            {name}
          </H1>
          <Text text="center" fontSize={24} opacity={0.6}>
            🏰
          </Text>
        </YStack>
      )}

      <YStack
        flex={1}
        opacity={status === "editing" ? 1 : 0}
        pointerEvents={status === "editing" ? "auto" : "none"}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
            <YStack flex={1} justify="space-between" style={{ flexGrow: 1 }}>
              <YStack
                width="100%"
                aspectRatio={16 / 11}
                bg="$bgLight"
                borderBottomWidth={4}
                borderColor="$color"
                shadowColor="$color"
                shadowRadius={0}
                shadowOffset={{ width: 0, height: 6 }}
                overflow="hidden"
              >
                <Image
                  source={require("../../assets/onboardings/new_city.jpg")}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={0}
                />
              </YStack>

              <YStack flex={1} p="$5" justify="space-between" gap="$5" style={{ flexGrow: 1 }}>
                <YStack gap="$3">
                  <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />

                  <YStack gap="$2" items="center">
                    <H2 text="center" color="$color" fontWeight="900" fontSize={24}>
                      {t("onboarding.village_name_title")}
                    </H2>
                    <XStack items="center" gap="$2">
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
                      rounded={16}
                      bg="$bgLight"
                      focusStyle={{ borderColor: "$primary", borderWidth: 4 }}
                      fontWeight="700"
                      fontSize={18}
                      text="center"
                    />

                    <XStack justify="space-between" px="$3">
                      <XStack items="center" gap="$1">
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

                <AppButton
                  variant="primary"
                  onPress={handleFinish}
                  disabled={!isValidName}
                  opacity={isValidName ? 1 : 0.4}
                  backgroundColor={isValidName ? "$success" : "$color"}
                  mb="$4"
                >
                  {t("onboarding.finish")} 🚀
                </AppButton>
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </YStack>
    </YStack>
  );
}
