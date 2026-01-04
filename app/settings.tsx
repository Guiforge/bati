import { Card } from "@/components/common/Card";
import { AVATARS } from "@/constants/avatars";
import { useSettingsStore } from "@/stores/settings";
import {
  ChevronLeft,
  Languages,
  Moon,
  ScrollText,
  Sun,
  Vibrate,
  Volume2,
} from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, XStack, YStack } from "tamagui";

type SettingRowProps = {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
};

function SettingRow({ icon, label, value, onPress }: SettingRowProps) {
  return (
    <Button
      bg="$bgLight"
      borderColor="$color"
      borderWidth={2}
      rounded="$4"
      p="$3"
      height="auto"
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      onPress={onPress}
    >
      <XStack flex={1} items="center" gap="$3">
        {icon}
        <Text flex={1} fontSize="$4" fontWeight="bold" color="$color">
          {label}
        </Text>
        {value ? (
          <Text fontSize="$3" color="$color" opacity={0.7}>
            {value}
          </Text>
        ) : null}
      </XStack>
    </Button>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const {
    language,
    avatarId,
    theme: appTheme,
    hapticsEnabled,
    soundEnabled,
    setLanguage,
    setAvatarId,
    setTheme,
    setHapticsEnabled,
    setSoundEnabled,
  } = useSettingsStore();

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const currentAvatar = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];

  const toggleLanguage = () => {
    const newLang = language === "en" ? "fr" : "en";
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  const cycleTheme = () => {
    const themes: Array<"system" | "light" | "dark"> = ["system", "light", "dark"];
    const idx = themes.indexOf(appTheme);
    setTheme(themes[(idx + 1) % themes.length]);
  };

  const themeLabel =
    appTheme === "system"
      ? t("settings.system", "System")
      : appTheme === "light"
        ? t("settings.light", "Light")
        : t("settings.dark", "Dark");

  return (
    <YStack flex={1} bg="$background" pt={insets.top}>
      {/* Header */}
      <XStack px="$4" py="$3" items="center" gap="$3">
        <Button
          size="$3"
          circular
          chromeless
          onPress={() => router.back()}
          icon={<ChevronLeft size={24} color="$color" />}
        />
        <Text fontSize="$6" fontWeight="900" color="$color">
          {t("settings.title", "Settings")}
        </Text>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Avatar Section */}
        <Card bg="$bgLight" p="$4" gap="$3">
          <Text fontSize="$3" fontWeight="bold" color="$color" opacity={0.6}>
            {t("settings.avatar", "AVATAR")}
          </Text>

          {showAvatarPicker ? (
            <XStack flexWrap="wrap" gap="$3" justify="center">
              {AVATARS.map((avatar) => (
                <Button
                  key={avatar.id}
                  size="$5"
                  circular
                  p={0}
                  borderWidth={avatarId === avatar.id ? 3 : 1}
                  borderColor={avatarId === avatar.id ? "$primary" : "$color"}
                  onPress={() => {
                    setAvatarId(avatar.id);
                    setShowAvatarPicker(false);
                  }}
                >
                  <Image
                    source={avatar.source}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                  />
                </Button>
              ))}
            </XStack>
          ) : (
            <Button bg="transparent" height="auto" p="$2" onPress={() => setShowAvatarPicker(true)}>
              <XStack items="center" gap="$3">
                <Image
                  source={currentAvatar.source}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    borderWidth: 2,
                    borderColor: "#2C3E50",
                  }}
                />
                <YStack>
                  <Text fontSize="$4" fontWeight="bold" color="$color">
                    {currentAvatar.label}
                  </Text>
                  <Text fontSize="$2" color="$color" opacity={0.6}>
                    {t("settings.tap_change", "Tap to change")}
                  </Text>
                </YStack>
              </XStack>
            </Button>
          )}
        </Card>

        {/* Preferences */}
        <YStack gap="$3">
          <Text fontSize="$3" fontWeight="bold" color="$color" opacity={0.6} px="$1">
            {t("settings.preferences", "PREFERENCES")}
          </Text>

          <SettingRow
            icon={<Languages size={22} color="$color" />}
            label={t("settings.language", "Language")}
            value={language === "en" ? "English" : "Français"}
            onPress={toggleLanguage}
          />

          <SettingRow
            icon={
              appTheme === "dark" ? (
                <Moon size={22} color="$color" />
              ) : (
                <Sun size={22} color="$color" />
              )
            }
            label={t("settings.theme", "Theme")}
            value={themeLabel}
            onPress={cycleTheme}
          />

          <SettingRow
            icon={<Vibrate size={22} color="$color" />}
            label={t("settings.haptics", "Haptics")}
            value={hapticsEnabled ? t("common.on", "On") : t("common.off", "Off")}
            onPress={() => setHapticsEnabled(!hapticsEnabled)}
          />

          <SettingRow
            icon={<Volume2 size={22} color="$color" />}
            label={t("settings.sound", "Sound")}
            value={soundEnabled ? t("common.on", "On") : t("common.off", "Off")}
            onPress={() => setSoundEnabled(!soundEnabled)}
          />

          <SettingRow
            icon={<ScrollText size={22} color="$color" />}
            label={t("credits.title", "Credits")}
            value={t("credits.open", "Open")}
            onPress={() => router.push("/credits")}
          />
        </YStack>
      </RNScrollView>
    </YStack>
  );
}
