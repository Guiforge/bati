import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, useTheme, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { getVillageTierAsset } from "@/constants/assetMap";
import { rawColors } from "@/constants/rawColors";
import { useUserStore } from "@/stores/user";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 2;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 20;

// Name-your-village step. The avatar picker used to live here too, but the avatar has no
// gameplay and is editable in Settings — the only onboarding choice left is the name.
export default function VillageSetup() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const setVillageName = useUserStore((s) => s.setVillageName);

  const [name, setName] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const trimmedName = name.trim();
  const isValidName = trimmedName.length >= MIN_NAME_LENGTH;

  const handleChangeText = (text: string) => {
    setName(text.slice(0, MAX_NAME_LENGTH));
  };

  const handleContinue = async () => {
    if (!isValidName) return;
    await setVillageName(trimmedName);
    router.push("/onboarding/training-level");
  };

  const inputBorderColor = isFocused
    ? theme.primary?.val
    : isValidName
      ? theme.success?.val
      : theme.borderStrong?.val;

  return (
    <YStack flex={1} bg="$background">
      {/* Immersive background: the tier-1 hamlet the player is about to name */}
      <Image
        source={getVillageTierAsset(1)}
        style={{ position: "absolute", width: "100%", height: "100%" }}
        contentFit="cover"
        contentPosition="top"
        transition={200}
      />
      <LinearGradient
        colors={["rgba(11, 15, 25, 0.85)", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%" }}
      />
      <LinearGradient
        colors={["transparent", "rgba(11, 15, 25, 0.92)", rawColors.bgDark]}
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
              {t("onboarding.village_name_title", "Name your village")}
            </H2>
          </YStack>

          {/* Bottom section: subtitle + name */}
          <YStack gap="$4">
            <Text
              text="center"
              color="$text"
              fontSize={16}
              fontWeight="700"
              textShadowColor="rgba(0,0,0,0.5)"
              textShadowRadius={4}
            >
              {t("onboarding.village_name_subtitle")}
            </Text>
            <Text
              text="center"
              color="$textSecondary"
              fontSize={13}
              textShadowColor="rgba(0,0,0,0.5)"
              textShadowRadius={4}
            >
              {t("onboarding.village_name_hint", "Every muscle you train raises a building here.")}
            </Text>

            {/* Name input */}
            <YStack gap="$2">
              <TextInput
                testID="onboarding-village-name"
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
              testID="onboarding-village-continue"
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
                {t("onboarding.next", "Continue")}
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
