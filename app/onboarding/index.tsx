import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, H2, Text, XStack, YStack } from "tamagui";

const TOTAL_STEPS = 3;
const CURRENT_STEP = 1;

export default function LanguageSelection() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const languages = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
  ];

  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack
        width="100%"
        aspectRatio={16 / 11}
        backgroundColor="$bgLight"
        borderBottomWidth={4}
        borderColor="$color"
        shadowColor="$color"
        shadowRadius={0}
        shadowOffset={{ width: 0, height: 6 }}
        overflow="hidden"
        animation="lazy"
        enterStyle={{ opacity: 0, y: -20 }}
      >
        <Image
          source={require("../../assets/onboardings/lang.jpg")}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={180}
        />
      </YStack>

      <YStack flex={1} padding="$5" justifyContent="space-between" gap="$5">
        <YStack gap="$3">
          <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />

          <H2
            textAlign="center"
            color="$color"
            fontWeight="900"
            fontSize={28}
            animation="lazy"
            enterStyle={{ opacity: 0, y: 18 }}
          >
            {t("onboarding.language_selection")}
          </H2>

          <XStack gap="$3" width="100%">
            {languages.map((lang) => {
              const isSelected = i18n.language === lang.code;

              return (
                <Button
                  key={lang.code}
                  onPress={() => i18n.changeLanguage(lang.code)}
                  flex={1}
                  height={72}
                  backgroundColor={isSelected ? "$primary" : "transparent"}
                  borderColor={isSelected ? "$primary" : "$color"}
                  borderWidth={3}
                  borderRadius="$6"
                  pressStyle={{ scale: 0.98, opacity: 0.9 }}
                  animation="quick"
                >
                  <YStack alignItems="center" gap="$1">
                    <Text fontSize={28}>{lang.flag}</Text>
                    <Text color={isSelected ? "white" : "$color"} fontWeight="800" fontSize={16}>
                      {lang.label}
                    </Text>
                  </YStack>
                </Button>
              );
            })}
          </XStack>
        </YStack>

        <AppButton
          variant="secondary"
          onPress={() => router.push("/onboarding/presentation")}
          marginBottom="$4"
        >
          {t("onboarding.next")} →
        </AppButton>
      </YStack>
    </YStack>
  );
}
