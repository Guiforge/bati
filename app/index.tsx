import { useAppColorScheme, useThemeStore } from "@/stores/theme";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

export default function Index() {
  const { t } = useTranslation();
  const colorScheme = useAppColorScheme();
  const { theme, setTheme } = useThemeStore();
  const isDark = colorScheme === "dark";


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
    <View
      className={`flex-1 items-center justify-center p-6 ${isDark ? "bg-base-content" : "bg-base-100"}`}
    >
      <Text className={`text-4xl font-bold mb-8 ${isDark ? "text-base-100" : "text-base-content"}`}>
        {t("welcome")}
      </Text>

      <View className="gap-4 w-full max-w-xs">
        <Pressable
          onPress={toggleLanguage}
          className="bg-primary py-4 px-6 rounded-xl active:opacity-80"
        >
          <Text className="text-white text-center font-semibold text-lg">
            {t("language")}: {i18n.language.toUpperCase()}
          </Text>
        </Pressable>

        <Pressable
          onPress={cycleTheme}
          className="bg-secondary py-4 px-6 rounded-xl active:opacity-80"
        >
          <Text className="text-white text-center font-semibold text-lg">
            {t("theme")}: {t(theme)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
