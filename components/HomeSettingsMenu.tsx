import { ChevronLeft, ChevronRight, Languages, Menu, Scroll, User, X } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatePresence, Button, type ColorTokens, Text, XStack, YStack } from "tamagui";
import { AppIconButton } from "@/components/common/AppButton";
import { AVATARS } from "@/constants/avatars";
import { useSettingsStore } from "@/stores/settings";

type MenuStep = "main" | "language" | "avatar";

export function HomeSettingsMenu() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<MenuStep>("main");

  const { language, avatarId, setLanguage, setAvatarId } = useSettingsStore();

  const closeMenu = () => {
    setOpen(false);
    // Reset step after animation
    setTimeout(() => setStep("main"), 300);
  };

  const MenuItem = ({
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
  }) => (
    <Button
      onPress={onPress}
      bg={color}
      borderWidth={3}
      borderColor="$color"
      rounded="$6"
      height={60}
      pressStyle={{ opacity: 0.9, scale: 0.98 }}
      justify="space-between"
      px="$4"
      mb="$3"
    >
      <XStack items="center" gap="$3">
        {icon}
        <Text fontWeight="900" fontSize={18} color="$color">
          {label}
        </Text>
      </XStack>
      {value ? (
        <Text fontWeight="700" opacity={0.6} color="$color">
          {value}
        </Text>
      ) : (
        <ChevronRight size={20} color="$color" opacity={0.5} />
      )}
    </Button>
  );

  const OptionItem = ({
    active,
    label,
    onPress,
    icon,
  }: {
    active: boolean;
    label: string;
    onPress: () => void;
    icon?: ReactNode;
  }) => (
    <Button
      onPress={onPress}
      bg={active ? "$primary" : "$background"}
      borderWidth={3}
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
        <Text fontWeight="900" fontSize={16} color={active ? "white" : "$color"}>
          {label}
        </Text>
      </XStack>
    </Button>
  );

  const renderMain = () => (
    <YStack animation="quick" enterStyle={{ opacity: 0, x: -20 }} opacity={1} x={0}>
      <MenuItem
        icon={<Scroll size={24} color="$color" />}
        label={t("journal.title", "Quest Journal")}
        color="$pastelYellow"
        onPress={() => {
          closeMenu();
          router.push("/journal" as never);
        }}
        value=" " // Hide chevron
      />
      <MenuItem
        icon={<Languages size={24} color="$color" />}
        label={t("language")}
        onPress={() => setStep("language")}
        value={language.toUpperCase()}
      />
      <MenuItem
        icon={<User size={24} color="$color" />}
        label={t("onboarding.avatar_title")}
        onPress={() => setStep("avatar")}
      />

      {__DEV__ ? (
        <MenuItem
          icon={<Menu size={24} color="$color" />}
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
            borderWidth={3}
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
          </Button>
        );
      })}
    </XStack>
  );

  const getTitle = () => {
    switch (step) {
      case "language":
        return t("language");
      case "avatar":
        return t("onboarding.avatar_title");
      default:
        return t("settings");
    }
  };

  return (
    <>
      <XStack position="absolute" t={insets.top + 12} r={insets.right + 16} z={50}>
        <AppIconButton onPress={() => setOpen(true)}>
          <Menu size={24} color="$color" strokeWidth={3} />
        </AppIconButton>
      </XStack>

      <AnimatePresence>
        {open && (
          <YStack
            fullscreen
            z={1000}
            bg="rgba(0,0,0,0.6)"
            animation="lazy"
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
              borderColor="$color"
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
                borderBottomWidth={3}
                borderColor="$color"
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
                      borderWidth={2}
                    >
                      <ChevronLeft size={20} color="$color" />
                    </AppIconButton>
                  )}
                  <Text fontWeight="900" fontSize={20} color="$color" textTransform="uppercase">
                    {getTitle()}
                  </Text>
                </XStack>

                <AppIconButton
                  onPress={closeMenu}
                  width={36}
                  height={36}
                  rounded={18}
                  bg="$error"
                  borderWidth={2}
                >
                  <X size={20} color="white" />
                </AppIconButton>
              </XStack>

              {/* Content */}
              <YStack p="$4" minH={300}>
                {step === "main" && renderMain()}
                {step === "language" && renderLanguage()}
                {step === "avatar" && renderAvatar()}
              </YStack>
            </YStack>
          </YStack>
        )}
      </AnimatePresence>
    </>
  );
}
