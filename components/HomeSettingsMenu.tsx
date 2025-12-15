import { ChevronDown, Languages, MoonStar, Palette, Sun, SunMoon, X } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { AVATARS } from "@/constants/avatars";
import { type AppLanguage, type ThemePreference, useSettingsStore } from "@/stores/settings";

function Chip({
  active,
  label,
  onPress,
  icon,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  icon?: ReactNode;
}) {
  return (
    <AppButton
      onPress={onPress}
      height={40}
      px="$3"
      bg={active ? "$primary" : "$bgLight"}
      borderWidth={2}
      borderColor={active ? "$primary" : "$color"}
      rounded="$10"
      fullWidth={false}
      fontSize={14}
      pressStyle={{ opacity: 0.9 }}
    >
      <XStack items="center" gap="$2">
        {icon}
        <Text color={active ? "white" : "$color"} fontWeight="900">
          {label}
        </Text>
      </XStack>
    </AppButton>
  );
}

export function HomeSettingsMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { language, theme, avatarId, setLanguage, setTheme, setAvatarId } = useSettingsStore();

  const languageOptions: Array<{ code: AppLanguage; label: string; flag: string }> = [
    { code: "en", label: "EN", flag: "🇬🇧" },
    { code: "fr", label: "FR", flag: "🇫🇷" },
  ];

  const themeOptions: Array<{ key: ThemePreference; label: string; icon: ReactNode }> = [
    {
      key: "system",
      label: t("system"),
      icon: <SunMoon size={16} color={theme === "system" ? "white" : "#1A1A2E"} />,
    },
    {
      key: "light",
      label: t("light"),
      icon: <Sun size={16} color={theme === "light" ? "white" : "#1A1A2E"} />,
    },
    {
      key: "dark",
      label: t("dark"),
      icon: <MoonStar size={16} color={theme === "dark" ? "white" : "#1A1A2E"} />,
    },
  ];

  return (
    <>
      <XStack position="absolute" t={insets.top + 12} r={insets.right + 16} z={50}>
        <AppIconButton onPress={() => setOpen(true)}>
          <Palette size={20} color="#1A1A2E" strokeWidth={2.5} />
        </AppIconButton>
      </XStack>

      {open ? (
        <YStack fullscreen z={49} bg="rgba(0,0,0,0.25)" onPress={() => setOpen(false)}>
          <YStack
            position="absolute"
            t={insets.top + 72}
            r={insets.right + 16}
            width={320}
            maxW="92%"
            bg="$background"
            borderWidth={3}
            borderColor="$color"
            rounded="$8"
            p="$4"
            shadowColor="$color"
            shadowRadius={0}
            shadowOffset={{ width: 0, height: 6 }}
          >
            <XStack items="center" justify="space-between" mb="$3">
              <XStack items="center" gap="$2">
                <Text fontWeight="900" fontSize={18} color="$color">
                  {t("settings")}
                </Text>
                <ChevronDown size={16} color="#1A1A2E" opacity={0.6} />
              </XStack>

              <AppIconButton
                onPress={() => setOpen(false)}
                borderWidth={2}
                borderColor="$color"
                width={32}
                height={32}
                rounded={16}
              >
                <X size={16} color="#1A1A2E" />
              </AppIconButton>
            </XStack>

            <YStack gap="$4">
              <YStack gap="$2">
                <XStack items="center" gap="$2">
                  <Palette size={16} color="#1A1A2E" />
                  <Text color="$color" fontWeight="900">
                    {t("theme")}
                  </Text>
                </XStack>

                <XStack gap="$2" flexWrap="wrap">
                  {themeOptions.map((opt) => (
                    <Chip
                      key={opt.key}
                      active={theme === opt.key}
                      label={opt.label}
                      icon={opt.icon}
                      onPress={() => void setTheme(opt.key)}
                    />
                  ))}
                </XStack>
              </YStack>

              <YStack gap="$2">
                <XStack items="center" gap="$2">
                  <Languages size={16} color="#1A1A2E" />
                  <Text color="$color" fontWeight="900">
                    {t("language")}
                  </Text>
                </XStack>

                <XStack gap="$2" flexWrap="wrap">
                  {languageOptions.map((opt) => (
                    <Chip
                      key={opt.code}
                      active={language === opt.code}
                      label={`${opt.flag} ${opt.label}`}
                      onPress={() => void setLanguage(opt.code)}
                    />
                  ))}
                </XStack>
              </YStack>

              <YStack gap="$2">
                <XStack items="center" gap="$2">
                  <SunMoon size={16} color="#1A1A2E" opacity={0} />
                  <Text color="$color" fontWeight="900">
                    {t("onboarding.avatar_title")}
                  </Text>
                </XStack>

                <Paragraph color="$color" opacity={0.6} mb="$1">
                  {t("settings_avatar_hint")}
                </Paragraph>

                <XStack gap="$2" flexWrap="wrap">
                  {AVATARS.map((a) => {
                    const selected = avatarId === a.id;

                    return (
                      <AppIconButton
                        key={a.id}
                        onPress={() => void setAvatarId(a.id)}
                        p={0}
                        bg={selected ? "$primary" : "$bgLight"}
                        borderWidth={3}
                        borderColor={selected ? "$primary" : "$color"}
                        width={52}
                        height={52}
                        rounded={26}
                        pressStyle={{ opacity: 0.9 }}
                      >
                        <YStack
                          width={44}
                          height={44}
                          rounded={22}
                          overflow="hidden"
                          borderWidth={2}
                          borderColor={selected ? "white" : "transparent"}
                        >
                          <Image
                            source={a.source}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                            transition={0}
                          />
                        </YStack>
                      </AppIconButton>
                    );
                  })}
                </XStack>
              </YStack>
            </YStack>
          </YStack>
        </YStack>
      ) : null}
    </>
  );
}
