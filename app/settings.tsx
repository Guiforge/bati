import { ChevronLeft, Languages, Moon, ScrollText, Vibrate, Volume2 } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, useTheme, XStack, YStack } from "tamagui";

import { Card } from "@/src/components/common/Card";
import { AVATARS } from "@/src/constants/avatars";
import { useSettingsStore } from "@/src/stores/settings";

type SettingRowProps = {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  disabled?: boolean;
};

function SettingRow({ icon, label, value, onPress, disabled }: SettingRowProps) {
  return (
    <Button
      bg="$bgLight"
      borderColor="$color"
      borderWidth={2}
      rounded="$4"
      p="$3"
      height="auto"
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      disabled={disabled}
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
  const theme = useTheme();

  const {
    language,
    avatarId,
    hapticsEnabled,
    soundEnabled,
    setLanguage,
    setAvatarId,
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
        <Text fontSize={20} fontWeight="900" color="$color">
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
                    borderColor: theme.borderStrong?.val,
                  }}
                />
                <YStack>
                  <Text fontSize="$4" fontWeight="bold" color="$color">
                    {t(currentAvatar.labelKey)}
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
            icon={<Moon size={22} color="$color" />}
            label={t("settings.theme", "Theme")}
            value={t("settings.dark", "Dark")}
            disabled
            onPress={() => {
              // NEW_STYLE: dark-only (forced globally)
            }}
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

        {/* Developer Section */}
        <DevSection />
      </RNScrollView>
    </YStack>
  );
}

function DevSection() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const handleClearAdventures = async () => {
    try {
      // Import dynamically to avoid issues
      const { db, schema } = await import("@/src/db/client");
      await db.delete(schema.adventureRuns);
      alert("Adventures cleared!");
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const handleResetBosses = async () => {
    try {
      const { db, schema } = await import("@/src/db/client");
      await db.delete(schema.bossFights);
      alert("Boss fights reset!");
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const handleClearSessions = async () => {
    try {
      const { db, schema } = await import("@/src/db/client");
      await db.delete(schema.completedQuest);
      await db.delete(schema.completedExercises);
      alert("Sessions cleared!");
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  if (!expanded) {
    return (
      <YStack gap="$3">
        <Button
          size="$3"
          bg="transparent"
          borderWidth={1}
          borderColor="$borderStrong"
          onPress={() => setExpanded(true)}
        >
          <Text fontSize={12} color="$textSecondary">
            🔧 {t("settings.dev_menu", "Developer Menu")}
          </Text>
        </Button>
      </YStack>
    );
  }

  return (
    <YStack gap="$3">
      <XStack items="center" justify="space-between">
        <Text fontSize="$3" fontWeight="bold" color="$error" opacity={0.8} px="$1">
          ⚠️ {t("settings.dev_menu", "DEVELOPER")}
        </Text>
        <Button size="$2" chromeless onPress={() => setExpanded(false)}>
          <Text color="$textSecondary">✕</Text>
        </Button>
      </XStack>

      <Card bg="rgba(244, 67, 54, 0.1)" borderColor="$error" borderWidth={1} p="$3" gap="$2">
        <Text fontSize={12} color="$textSecondary" mb="$2">
          {t("settings.dev_warning", "Danger zone - these actions cannot be undone")}
        </Text>

        <Button size="$3" bg="$error" onPress={handleClearAdventures} pressStyle={{ opacity: 0.8 }}>
          <Text fontSize={13} fontWeight="700" color="white">
            Clear Active Adventures
          </Text>
        </Button>

        <Button size="$3" bg="$error" onPress={handleResetBosses} pressStyle={{ opacity: 0.8 }}>
          <Text fontSize={13} fontWeight="700" color="white">
            Reset Boss Fights
          </Text>
        </Button>

        <Button size="$3" bg="$error" onPress={handleClearSessions} pressStyle={{ opacity: 0.8 }}>
          <Text fontSize={13} fontWeight="700" color="white">
            Clear All Sessions
          </Text>
        </Button>
      </Card>
    </YStack>
  );
}
