import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform } from "react-native";
import { Button, H2, Input, Text, XStack, YStack } from "tamagui";
import { ProgressDots } from "@/components/ProgressDots";
import { useUserStore } from "../../stores/user";

const TOTAL_STEPS = 3;
const CURRENT_STEP = 3;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 20;

export default function VillageName() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const { setVillageName, setHasFinishedOnboarding } = useUserStore();

  const isValidName = name.trim().length >= MIN_NAME_LENGTH;

  const handleFinish = () => {
    if (isValidName) {
      setVillageName(name.trim());
      setHasFinishedOnboarding(true);
      router.replace("/");
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <YStack flex={1} padding="$5">
          <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />

          <YStack flex={1} justifyContent="center" alignItems="center" gap="$5">
            <YStack
              width="100%"
              aspectRatio={16 / 9}
              maxHeight={220}
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
              enterStyle={{ opacity: 0, scale: 0.8, rotate: "-3deg" }}
            >
              <Image
                source={require("../../assets/onboardings/new_city.jpg")}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            </YStack>

            <H2
              textAlign="center"
              color="$color"
              fontWeight="900"
              fontSize={28}
              animation="lazy"
              enterStyle={{ opacity: 0, y: 20 }}
            >
              {t("onboarding.village_name_title")} 🏰
            </H2>

            <YStack width="100%" gap="$2">
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
              <XStack justifyContent="space-between" paddingHorizontal="$2">
                <Text fontSize={12} color="$color" opacity={0.5}>
                  {name.length < MIN_NAME_LENGTH
                    ? `${MIN_NAME_LENGTH - name.length} chars min`
                    : "✓"}
                </Text>
                <Text fontSize={12} color="$color" opacity={0.5}>
                  {name.length}/{MAX_NAME_LENGTH}
                </Text>
              </XStack>
            </YStack>
          </YStack>

          <Button
            onPress={handleFinish}
            size="$6"
            width="100%"
            backgroundColor={isValidName ? "$success" : "$color"}
            borderColor="$color"
            borderWidth={3}
            borderRadius="$8"
            color="white"
            fontWeight="900"
            fontSize={20}
            shadowColor="$color"
            shadowRadius={0}
            shadowOffset={{ width: 4, height: 4 }}
            pressStyle={isValidName ? { x: 4, y: 4, shadowOffset: { width: 0, height: 0 } } : {}}
            disabled={!isValidName}
            opacity={isValidName ? 1 : 0.4}
            animation="quick"
            marginBottom="$4"
          >
            {t("onboarding.finish")} 🚀
          </Button>
        </YStack>
      </KeyboardAvoidingView>
    </YStack>
  );
}
