import { ChevronDown, Languages, MoonStar, Palette, Sun, SunMoon, X } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
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
    <Button
      onPress={onPress}
      height={40}
      px="$3"
      bg={active ? "$primary" : "$bgLight"}
      borderWidth={2}
      borderColor={active ? "$primary" : "$color"}
      rounded="$10"
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      animation="quick"
    >
      <XStack items="center" gap="$2">
        {icon}
        <Text color={active ? "white" : "$color"} fontWeight="900">
          {label}
        </Text>
      </XStack>
    </Button>
  );
}

export function HomeSettingsMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
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
      <XStack position="absolute" t="$4" r="$4" z={50}>
        <Button
          onPress={() => setOpen(true)}
          height={44}
          width={44}
          p={0}
          rounded={22}
          bg="$bgLight"
          borderWidth={3}
          borderColor="$color"
          pressStyle={{ scale: 0.98, opacity: 0.9 }}
          animation="quick"
        >
          <Palette size={20} color="#1A1A2E" strokeWidth={2.5} />
        </Button>
      </XStack>

      {open ? (
        <YStack fullscreen z={49} bg="rgba(0,0,0,0.25)" onPress={() => setOpen(false)}>
          <YStack
            position="absolute"
            t={72}
            r={16}
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

              <Button
                onPress={() => setOpen(false)}
                height={32}
                width={32}
                p={0}
                rounded={16}
                bg="$bgLight"
                borderWidth={2}
                borderColor="$color"
              >
                <X size={16} color="#1A1A2E" />
              </Button>
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
                      <Button
                        key={a.id}
                        onPress={() => void setAvatarId(a.id)}
                        height={52}
                        width={52}
                        p={0}
                        rounded={26}
                        bg={selected ? "$primary" : "$bgLight"}
                        borderWidth={3}
                        borderColor={selected ? "$primary" : "$color"}
                        pressStyle={{ scale: 0.98, opacity: 0.9 }}
                        animation="quick"
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
                            transition={120}
                          />
                        </YStack>
                      </Button>
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
