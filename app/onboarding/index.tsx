import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { useSettingsStore } from "@/stores/settings";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Text, XStack, YStack } from "tamagui";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 1;

export default function LanguageSelection() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language, setLanguage } = useSettingsStore();
  const insets = useSafeAreaInsets();

  const languages = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
  ];

  return (
    <YStack flex={1} bg="$background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 16 }}
        keyboardShouldPersistTaps="handled"
      >
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
            source={require("../../assets/onboardings/lang.jpg")}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={0}
          />
        </YStack>

        <YStack flex={1} p="$5" justify="space-between" gap="$5" style={{ flexGrow: 1 }}>
          <YStack gap="$3">
            <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />

            <H2 text="center" color="$color" fontWeight="900" fontSize={28}>
              {t("onboarding.language_selection")}
            </H2>

            <XStack gap="$3" width="100%">
              {languages.map((lang) => {
                const isSelected = language === lang.code;

                return (
                  <AppButton
                    key={lang.code}
                    onPress={() => void setLanguage(lang.code as "en" | "fr")}
                    fullWidth={false}
                    flex={1}
                    height={72}
                    bg={isSelected ? "$pastelBlue" : "$bgLight"}
                    borderColor={isSelected ? "$primary" : "$color"}
                    borderWidth={3}
                    rounded="$6"
                    fontSize={16}
                    pressStyle={{ opacity: 0.9 }}
                  >
                    <YStack items="center" gap="$1">
                      <Text fontSize={28}>{lang.flag}</Text>
                      <Text color="$color" fontWeight="800" fontSize={16}>
                        {lang.label}
                      </Text>
                    </YStack>
                  </AppButton>
                );
              })}
            </XStack>
          </YStack>

          <AppButton
            variant="secondary"
            onPress={() => router.push("/onboarding/presentation")}
            mb="$4"
          >
            {t("onboarding.next")} →
          </AppButton>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
