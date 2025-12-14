import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, H2, Text, XStack, YStack } from "tamagui";
import { ProgressDots } from "@/components/ProgressDots";

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
    <YStack flex={1} padding="$5" backgroundColor="$background">
      <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />

      <YStack flex={1} justifyContent="center" alignItems="center" gap="$6">
        <YStack
          width={260}
          height={260}
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
          enterStyle={{ opacity: 0, scale: 0.8, rotate: "-5deg" }}
        >
          <Image
            source={require("../../assets/onboardings/lang.png")}
            style={{ width: "90%", height: "90%" }}
            contentFit="contain"
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
          {t("onboarding.language_selection")} 🌍
        </H2>

        <XStack gap="$4" width="100%">
          {languages.map((lang) => (
            <Button
              key={lang.code}
              onPress={() => i18n.changeLanguage(lang.code)}
              flex={1}
              height={80}
              backgroundColor={i18n.language === lang.code ? "$primary" : "transparent"}
              borderColor={i18n.language === lang.code ? "$primary" : "$color"}
              borderWidth={3}
              borderRadius="$6"
              pressStyle={{ scale: 0.95, rotate: "-2deg" }}
              animation="bouncy"
            >
              <YStack alignItems="center" gap="$1">
                <Text fontSize={28}>{lang.flag}</Text>
                <Text
                  color={i18n.language === lang.code ? "white" : "$color"}
                  fontWeight="800"
                  fontSize={16}
                >
                  {lang.label}
                </Text>
              </YStack>
            </Button>
          ))}
        </XStack>
      </YStack>

      <Button
        onPress={() => router.push("/onboarding/presentation")}
        size="$6"
        width="100%"
        backgroundColor="$secondary"
        borderColor="$color"
        borderWidth={3}
        borderRadius="$8"
        color="white"
        fontWeight="900"
        fontSize={20}
        shadowColor="$color"
        shadowRadius={0}
        shadowOffset={{ width: 4, height: 4 }}
        pressStyle={{ x: 4, y: 4, shadowOffset: { width: 0, height: 0 } }}
        animation="quick"
        marginBottom="$4"
      >
        {t("onboarding.next")} →
      </Button>
    </YStack>
  );
}
