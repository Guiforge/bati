import {
  ChevronLeft,
  ChevronRight,
  Languages,
  Menu,
  Moon,
  Scroll,
  Sparkles,
  User,
  Vibrate,
  Volume2,
  X,
} from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatePresence, Button, type ColorTokens, Text, useTheme, XStack, YStack } from "tamagui";
import { AppIconButton } from "@/components/common/AppButton";
import { AVATARS } from "@/constants/avatars";
import { useSettingsStore } from "@/stores/settings";

type MenuStep = "main" | "language" | "avatar" | "theme" | "haptics" | "sound" | "motion";

function MenuItem({
  icon,
  label,
  onPress,
  value,
  color = "$bgLight",
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  value?: string;
  color?: ColorTokens;
}) {
  const tamaguiTheme = useTheme();
  return (
    <Button
      onPress={onPress}
      bg={color}
      borderWidth={1}
      borderColor="$borderStrong"
      rounded="$6"
      height={60}
      pressStyle={{ opacity: 0.9, scale: 0.98 }}
      justify="space-between"
      px="$4"
      mb="$3"
    >
      <XStack items="center" gap="$3">
        {icon}
        <Text fontWeight="700" fontSize={18} color={tamaguiTheme.color?.get() as any}>
          {label}
        </Text>
      </XStack>
      {value ? (
        <Text fontWeight="700" opacity={0.6} color={tamaguiTheme.color?.get() as any}>
          {value}
        </Text>
      ) : (
        <ChevronRight size={20} color={tamaguiTheme.color?.get() as any} opacity={0.5} />
      )}
    </Button>
  );
}

function OptionItem({
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
      bg={active ? "$primary" : "$background"}
      borderWidth={1}
      borderColor={active ? "$primary" : "$color"}
      rounded="$6"
      height={54}
      pressStyle={{ opacity: 0.9 }}
      justify="flex-start"
      px="$4"
      mb="$2"
    >
      <XStack items="center" gap="$3">
        {icon}
        <Text fontWeight="700" fontSize={16} color={active ? "white" : "$color"}>
          {label}
        </Text>
      </XStack>
    </Button>
  );
}

export function HomeSettingsMenu() {
  const { t } = useTranslation();
  const tamaguiTheme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<MenuStep>("main");

  const {
    language,
    avatarId,
    theme,
    hapticsEnabled,
    soundEnabled,
    reducedMotion,
    setLanguage,
    setAvatarId,
    setTheme,
    setHapticsEnabled,
    setSoundEnabled,
    setReducedMotion,
  } = useSettingsStore();

  const closeMenu = () => {
    setOpen(false);
    // Reset step after animation
    setTimeout(() => setStep("main"), 300);
  };

  const renderMain = () => (
    <YStack animation="quick" enterStyle={{ opacity: 0, x: -20 }} opacity={1} x={0}>
      <MenuItem
        icon={<Scroll size={24} color={tamaguiTheme.color?.get() as any} />}
        label={t("journal.title", "Quest Journal")}
        color="$pastelYellow"
        onPress={() => {
          closeMenu();
          router.push("/journal" as never);
        }}
        value=" " // Hide chevron
      />
      <MenuItem
        icon={<Languages size={24} color={tamaguiTheme.color?.get() as any} />}
        label={t("language")}
        onPress={() => setStep("language")}
        value={language.toUpperCase()}
      />
      <MenuItem
        icon={<User size={24} color={tamaguiTheme.color?.get() as any} />}
        label={t("onboarding.avatar_title")}
        onPress={() => setStep("avatar")}
      />
      <MenuItem
        icon={<Moon size={24} color={tamaguiTheme.color?.get() as any} />}
        label={t("theme")}
        onPress={() => setStep("theme")}
        value={t(theme)}
      />
      <MenuItem
        icon={<Vibrate size={24} color={tamaguiTheme.color?.get() as any} />}
        label={t("settings.haptics_title")}
        onPress={() => setStep("haptics")}
        value={hapticsEnabled ? t("settings.haptics_on_short") : t("settings.haptics_off_short")}
      />
      <MenuItem
        icon={<Volume2 size={24} color={tamaguiTheme.color?.get() as any} />}
        label={t("settings.sound_title")}
        onPress={() => setStep("sound")}
        value={soundEnabled ? t("settings.sound_on") : t("settings.sound_off")}
      />
      <MenuItem
        icon={<Sparkles size={24} color={tamaguiTheme.color?.get() as any} />}
        label={t("settings.motion_title")}
        onPress={() => setStep("motion")}
        value={reducedMotion ? t("settings.motion_reduced") : t("settings.motion_full")}
      />

      {__DEV__ ? (
        <MenuItem
          icon={<Menu size={24} color={tamaguiTheme.color?.get() as any} />}
          label={t("dev.title", "Dev Tools")}
          color="$pastelPurple"
          onPress={() => {
            closeMenu();
            router.push("/dev" as never);
          }}
          value=" "
        />
      ) : null}
    </YStack>
  );

  const renderLanguage = () => (
    <YStack animation="quick" enterStyle={{ opacity: 0, x: 20 }} opacity={1} x={0} gap="$2">
      <OptionItem
        active={language === "en"}
        label={`${t("common.language_en", "English")} 🇬🇧`}
        onPress={() => setLanguage("en")}
      />
      <OptionItem
        active={language === "fr"}
        label={`${t("common.language_fr", "Français")} 🇫🇷`}
        onPress={() => setLanguage("fr")}
      />
    </YStack>
  );

  const renderAvatar = () => (
    <XStack
      animation="quick"
      enterStyle={{ opacity: 0, x: 20 }}
      opacity={1}
      x={0}
      flexWrap="wrap"
      gap="$3"
      justify="center"
    >
      {AVATARS.map((a) => {
        const selected = avatarId === a.id;
        return (
          <Button
            key={a.id}
            onPress={() => setAvatarId(a.id)}
            p={0}
            bg={selected ? "$primary" : "$bgLight"}
            borderWidth={1}
            borderColor={selected ? "$primary" : "$color"}
            width={70}
            height={70}
            rounded={35}
            pressStyle={{ scale: 0.95 }}
          >
            <YStack
              width={60}
              height={60}
              rounded={30}
              overflow="hidden"
              borderWidth={1}
              borderColor={selected ? "white" : "transparent"}
            >
              <Image
                source={a.source}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={0}
              />
            </YStack>
          </Button>
        );
      })}
    </XStack>
  );

  const renderTheme = () => (
    <YStack animation="quick" enterStyle={{ opacity: 0, x: 20 }} opacity={1} x={0} gap="$2">
      <OptionItem
        active={theme === "light"}
        label={`${t("light")} ☀️`}
        onPress={() => setTheme("light")}
      />
      <OptionItem
        active={theme === "dark"}
        label={`${t("dark")} 🌙`}
        onPress={() => setTheme("dark")}
      />
      <OptionItem
        active={theme === "system"}
        label={`${t("system")} 📱`}
        onPress={() => setTheme("system")}
      />
    </YStack>
  );

  const renderHaptics = () => (
    <YStack animation="quick" enterStyle={{ opacity: 0, x: 20 }} opacity={1} x={0} gap="$2">
      <OptionItem
        active={hapticsEnabled}
        label={`${t("settings.haptics_on")} 📳`}
        onPress={() => setHapticsEnabled(true)}
      />
      <OptionItem
        active={!hapticsEnabled}
        label={`${t("settings.haptics_off")} 🔇`}
        onPress={() => setHapticsEnabled(false)}
      />
    </YStack>
  );

  const renderSound = () => (
    <YStack animation="quick" enterStyle={{ opacity: 0, x: 20 }} opacity={1} x={0} gap="$2">
      <OptionItem
        active={soundEnabled}
        label={`${t("settings.sound_on")} 🔊`}
        onPress={() => setSoundEnabled(true)}
      />
      <OptionItem
        active={!soundEnabled}
        label={`${t("settings.sound_off")} 🔇`}
        onPress={() => setSoundEnabled(false)}
      />
    </YStack>
  );

  const renderMotion = () => (
    <YStack animation="quick" enterStyle={{ opacity: 0, x: 20 }} opacity={1} x={0} gap="$2">
      <OptionItem
        active={!reducedMotion}
        label={`${t("settings.motion_full")} ✨`}
        onPress={() => setReducedMotion(false)}
      />
      <OptionItem
        active={reducedMotion}
        label={`${t("settings.motion_reduced")} 🐢`}
        onPress={() => setReducedMotion(true)}
      />
    </YStack>
  );

  const getTitle = () => {
    switch (step) {
      case "language":
        return t("language");
      case "avatar":
        return t("onboarding.avatar_title");
      case "theme":
        return t("theme");
      case "haptics":
        return t("settings.haptics_title");
      case "sound":
        return t("settings.sound_title");
      case "motion":
        return t("settings.motion_title");
      default:
        return t("settings");
    }
  };

  return (
    <>
      <XStack position="absolute" t={insets.top + 12} r={insets.right + 16} z={50}>
        <AppIconButton
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t("settings.title", "Settings")}
        >
          <Menu size={24} color={tamaguiTheme.color?.get() as any} strokeWidth={3} />
        </AppIconButton>
      </XStack>

      <AnimatePresence>
        {open && (
          <YStack
            fullscreen
            z={1000}
            bg="rgba(0,0,0,0.6)"
            animation="quick"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            justify="center"
            items="center"
            onPress={closeMenu}
            p="$4"
          >
            <YStack
              width="100%"
              style={{ maxWidth: 360 }}
              bg="$background"
              borderWidth={4}
              borderColor="$borderStrong"
              rounded="$8"
              shadowColor="black"
              shadowOffset={{ width: 8, height: 8 }}
              shadowOpacity={1}
              shadowRadius={0}
              overflow="hidden"
              onPress={(e) => e.stopPropagation()} // Prevent closing when clicking inside
              animation="bouncy"
              enterStyle={{ scale: 0.9, opacity: 0, y: 20 }}
              exitStyle={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              {/* Header */}
              <XStack
                bg="$bgLight"
                p="$4"
                borderBottomWidth={1}
                borderColor="$borderStrong"
                items="center"
                justify="space-between"
              >
                <XStack items="center" gap="$2">
                  {step !== "main" && (
                    <AppIconButton
                      onPress={() => setStep("main")}
                      width={36}
                      height={36}
                      rounded={18}
                      borderWidth={1}
                      accessibilityRole="button"
                      accessibilityLabel={t("quests.go_back", "Go back")}
                    >
                      <ChevronLeft size={20} color={tamaguiTheme.color?.get() as any} />
                    </AppIconButton>
                  )}
                  <Text
                    fontWeight="700"
                    fontSize={20}
                    color={tamaguiTheme.color?.get() as any}
                    textTransform="uppercase"
                  >
                    {getTitle()}
                  </Text>
                </XStack>

                <AppIconButton
                  onPress={closeMenu}
                  width={36}
                  height={36}
                  rounded={18}
                  bg="$error"
                  borderWidth={1}
                  accessibilityRole="button"
                  accessibilityLabel={t("village.close", "Close")}
                >
                  <X size={20} color="white" />
                </AppIconButton>
              </XStack>

              {/* Content */}
              <YStack p="$4" minH={300}>
                {step === "main" && renderMain()}
                {step === "language" && renderLanguage()}
                {step === "avatar" && renderAvatar()}
                {step === "theme" && renderTheme()}
                {step === "haptics" && renderHaptics()}
                {step === "sound" && renderSound()}
                {step === "motion" && renderMotion()}
              </YStack>
            </YStack>
          </YStack>
        )}
      </AnimatePresence>
    </>
  );
}
