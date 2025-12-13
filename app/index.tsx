import { useThemeStore } from "@/stores/theme";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { Button, H1, Text, YStack } from "tamagui";

export default function Index() {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "fr" : "en";
    i18n.changeLanguage(newLang);
  };

  const cycleTheme = () => {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  return (
    <YStack flex={1} items="center" justify="center" p="$4" bg="$background" gap="$4">
      <H1 color="$color" fontWeight="bold">
        {t("welcome")}
      </H1>

      <YStack gap="$3" width={280}>
        <Button
          size="$5"
          bg="$primary"
          color="white"
          rounded="$4"
          pressStyle={{ opacity: 0.8, scale: 0.98 }}
          animation="quick"
          onPress={toggleLanguage}
        >
          <Text color="white" fontWeight="600" fontSize="$5">
            {t("language")}: {i18n.language.toUpperCase()}
   
          </Text>
        </Button>

        <Button
          size="$5"
          bg="$secondary"
          color="white"
          rounded="$4"
          pressStyle={{ opacity: 0.8, scale: 0.98 }}
          animation="quick"
          onPress={cycleTheme}
        >
          <Text color="white" fontWeight="600" fontSize="$5">
            {t("theme")}: {t(theme)}
          </Text>
        </Button>
      </YStack>
    </YStack>
  );
}
