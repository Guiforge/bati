import {
  Bell,
  ChevronLeft,
  Dumbbell,
  Flame,
  HeartPulse,
  ImagePlus,
  Languages,
  Moon,
  ScrollText,
  Swords,
  Vibrate,
  Volume2,
  Wrench,
} from "@tamagui/lucide-icons";
import Constants from "expo-constants";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, useTheme, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";
import { AVATARS, type AvatarId, getAvatarSource } from "@/constants/avatars";
import { preferences } from "@/db";
import type { EquipmentCode } from "@/db/schema";
import {
  ensureNotificationPermission,
  hasNotificationPermission,
  rescheduleOathReminder,
} from "@/src/notifications";
import { useSettingsStore } from "@/stores/settings";

// Version comes from the embedded manifest: EAS owns the build number (appVersionSource: remote),
// so it is only meaningful in a real build — in Expo Go / dev it can be missing.
const buildNumber =
  Constants.expoConfig?.android?.versionCode ?? Constants.expoConfig?.ios?.buildNumber;
const versionLabel = [
  Constants.expoConfig?.version,
  buildNumber && `(${buildNumber})`,
  __DEV__ && "· DEV",
]
  .filter(Boolean)
  .join(" ");

type SettingRowProps = {
  testID?: string;
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  disabled?: boolean;
};

function SettingRow({ testID, icon, label, value, onPress, disabled }: SettingRowProps) {
  return (
    <Button
      testID={testID}
      bg="$surface"
      borderColor="$borderStrong"
      borderWidth={1}
      rounded="$4"
      p="$3"
      height="auto"
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      disabled={disabled}
      onPress={onPress}
    >
      <XStack flex={1} items="center" gap="$3">
        {icon}
        <Text flex={1} fontSize="$4" fontWeight="bold" color="$text">
          {label}
        </Text>
        {value ? (
          <Text fontSize="$3" color="$textSecondary">
            {value}
          </Text>
        ) : null}
      </XStack>
    </Button>
  );
}

type AvatarSectionProps = {
  avatarId: AvatarId;
  customAvatarUri: string | null;
  showAvatarPicker: boolean;
  setShowAvatarPicker: (show: boolean) => void;
  setAvatarId: (id: AvatarId) => void;
  pickCustomAvatar: () => void;
};

function AvatarSection({
  avatarId,
  customAvatarUri,
  showAvatarPicker,
  setShowAvatarPicker,
  setAvatarId,
  pickCustomAvatar,
}: AvatarSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const currentAvatar = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
  const currentAvatarSource = getAvatarSource(avatarId, customAvatarUri);
  const currentAvatarLabel = customAvatarUri
    ? t("settings.avatar_custom", "Photo perso")
    : t(currentAvatar.labelKey);

  return (
    <Card bg="$surface" p="$4" gap="$3">
      <Text fontSize="$3" fontWeight="bold" color="$textSecondary">
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
              borderWidth={avatarId === avatar.id && !customAvatarUri ? 2 : 1}
              borderColor={
                avatarId === avatar.id && !customAvatarUri ? "$primary" : "$borderStrong"
              }
              accessibilityLabel={t(avatar.labelKey)}
              accessibilityState={{ selected: avatarId === avatar.id && !customAvatarUri }}
              onPress={() => {
                setAvatarId(avatar.id);
                setShowAvatarPicker(false);
              }}
            >
              <Image source={avatar.source} style={{ width: 48, height: 48, borderRadius: 24 }} />
            </Button>
          ))}
          <Button
            size="$5"
            circular
            p={0}
            bg="$surface2"
            borderWidth={customAvatarUri ? 2 : 1}
            borderColor={customAvatarUri ? "$primary" : "$borderStrong"}
            accessibilityLabel={t("settings.avatar_custom", "Photo perso")}
            accessibilityState={{ selected: !!customAvatarUri }}
            onPress={pickCustomAvatar}
          >
            {customAvatarUri ? (
              <Image
                source={{ uri: customAvatarUri }}
                style={{ width: 48, height: 48, borderRadius: 24 }}
              />
            ) : (
              <ImagePlus size={22} color="$textSecondary" />
            )}
          </Button>
        </XStack>
      ) : (
        <Button bg="transparent" height="auto" p="$2" onPress={() => setShowAvatarPicker(true)}>
          <XStack items="center" gap="$3">
            <Image
              source={currentAvatarSource}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                borderWidth: 2,
                borderColor: theme.borderStrong?.val,
              }}
            />
            <YStack>
              <Text fontSize="$4" fontWeight="bold" color="$text">
                {currentAvatarLabel}
              </Text>
              <Text fontSize="$2" color="$textSecondary">
                {t("settings.tap_change", "Tap to change")}
              </Text>
            </YStack>
          </XStack>
        </Button>
      )}
    </Card>
  );
}

function DevFooter() {
  const router = useRouter();
  if (!__DEV__) return null;
  return (
    <SettingRow
      testID="settings-dev"
      icon={<Wrench size={22} color="$text" />}
      label="Dev tools"
      // `as never`: same typed-route caveat as the pushes above.
      onPress={() => router.push("/dev" as never)}
    />
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const {
    language,
    avatarId,
    customAvatarUri,
    hapticsEnabled,
    soundEnabled,
    notificationsEnabled,
    setLanguage,
    setAvatarId,
    setCustomAvatarUri,
    setHapticsEnabled,
    setSoundEnabled,
    setNotificationsEnabled,
  } = useSettingsStore();

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const pickCustomAvatar = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    await setCustomAvatarUri(result.assets[0].uri);
    setShowAvatarPicker(false);
  }, [setCustomAvatarUri]);

  // What the hero owns, cycled through in one row: unanswered -> nothing -> bar -> bar + dips.
  // Unanswered shows everything, so nobody loses content by never opening this screen.
  const [ownedEquipment, setOwnedEquipment] = useState<EquipmentCode[] | null>(null);
  const [warmupEnabled, setWarmupEnabledState] = useState(true);
  // The stored preference defaults to on, but the OS has the last word: without permission the
  // row would claim reminders are on while nothing can ever fire.
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasNotificationPermission()
      .then((granted) => {
        if (!cancelled) setPermissionGranted(granted);
      })
      .catch(() => {
        // Non-blocking: treated as "not granted", which is the honest default.
      });
    preferences
      .getWarmupEnabled()
      .then((value) => {
        if (!cancelled) setWarmupEnabledState(value);
      })
      .catch(() => {
        // Non-blocking: the warm-up defaults to on.
      });
    preferences
      .getOwnedEquipment()
      .then((value) => {
        if (!cancelled) setOwnedEquipment(value);
      })
      .catch(() => {
        // Non-blocking: an unreadable preference just means "show everything".
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cycleEquipment = useCallback(() => {
    const next =
      ownedEquipment === null
        ? []
        : ownedEquipment.length === 0
          ? (["pullup_bar"] as EquipmentCode[])
          : ownedEquipment.length === 1
            ? (["pullup_bar", "dip_bar"] as EquipmentCode[])
            : null;

    setOwnedEquipment(next);
    preferences.setOwnedEquipment(next).catch(() => {
      // Non-blocking: the filter is a preference, not a gate.
    });
  }, [ownedEquipment]);

  const equipmentLabel =
    ownedEquipment === null
      ? t("settings.equipment_any", "Show all")
      : ownedEquipment.length === 0
        ? t("settings.equipment_none", "Bodyweight only")
        : ownedEquipment.length === 1
          ? t("settings.equipment_bar", "Pull-up bar")
          : t("settings.equipment_bar_dip", "Bar + dip station");

  const remindersOn = notificationsEnabled && permissionGranted;

  const toggleNotifications = useCallback(async () => {
    if (!remindersOn && !(await ensureNotificationPermission())) {
      // Denied at the OS level: leave the preference alone so the row keeps telling the truth.
      setPermissionGranted(false);
      return;
    }
    setPermissionGranted(true);
    await setNotificationsEnabled(!remindersOn);
    await rescheduleOathReminder();
  }, [remindersOn, setNotificationsEnabled]);

  const openOath = useCallback(() => {
    router.push("/oath" as never);
  }, [router]);

  const toggleLanguage = () => {
    const newLang = language === "en" ? "fr" : "en";
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  return (
    <YStack testID="settings-screen" flex={1} bg="$background" pt={insets.top}>
      {/* Header */}
      <XStack px="$4" py="$3" items="center" gap="$3">
        <Button
          size="$3"
          circular
          chromeless
          onPress={() => router.back()}
          icon={<ChevronLeft size={24} color="$text" />}
          accessibilityRole="button"
          accessibilityLabel={t("quests.go_back", "Go back")}
        />
        <Text fontSize={20} fontWeight="700" color="$text">
          {t("settings.title", "Settings")}
        </Text>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Avatar Section */}
        <AvatarSection
          avatarId={avatarId}
          customAvatarUri={customAvatarUri}
          showAvatarPicker={showAvatarPicker}
          setShowAvatarPicker={setShowAvatarPicker}
          setAvatarId={setAvatarId}
          pickCustomAvatar={pickCustomAvatar}
        />

        {/* Preferences */}
        <YStack gap="$3">
          <Text fontSize="$3" fontWeight="bold" color="$textSecondary" px="$1">
            {t("settings.preferences", "PREFERENCES")}
          </Text>

          <SettingRow
            icon={<Languages size={22} color="$text" />}
            label={t("settings.language", "Language")}
            value={language === "en" ? "English" : "Français"}
            onPress={toggleLanguage}
          />

          <SettingRow
            icon={<Moon size={22} color="$text" />}
            label={t("settings.theme", "Theme")}
            value={t("settings.dark", "Dark")}
            disabled
            onPress={() => {
              // NEW_STYLE: dark-only (forced globally)
            }}
          />

          <SettingRow
            icon={<Vibrate size={22} color="$text" />}
            label={t("settings.haptics", "Haptics")}
            value={hapticsEnabled ? t("common.on", "On") : t("common.off", "Off")}
            onPress={() => setHapticsEnabled(!hapticsEnabled)}
          />

          <SettingRow
            icon={<Volume2 size={22} color="$text" />}
            label={t("settings.sound", "Sound")}
            value={soundEnabled ? t("common.on", "On") : t("common.off", "Off")}
            onPress={() => setSoundEnabled(!soundEnabled)}
          />

          <SettingRow
            testID="settings-notifications"
            icon={<Bell size={22} color="$text" />}
            label={t("settings.notifications", "Oath reminder")}
            value={remindersOn ? t("common.on", "On") : t("common.off", "Off")}
            onPress={() => {
              toggleNotifications().catch(() => {
                // Non-blocking: a failed permission prompt just leaves the row as it was.
              });
            }}
          />

          <SettingRow
            icon={<Flame size={22} color="$text" />}
            label={t("settings.warmup", "Warm-up")}
            value={warmupEnabled ? t("common.on", "On") : t("common.off", "Off")}
            onPress={() => {
              const next = !warmupEnabled;
              setWarmupEnabledState(next);
              preferences.setWarmupEnabled(next).catch(() => {
                // Non-blocking: it can be skipped in-session either way.
              });
            }}
          />

          <SettingRow
            icon={<Dumbbell size={22} color="$text" />}
            label={t("settings.equipment", "Equipment")}
            value={equipmentLabel}
            onPress={cycleEquipment}
          />

          <SettingRow
            icon={<Swords size={22} color="$text" />}
            label={t("oath.screen_title", "Swear an Oath")}
            onPress={openOath}
          />

          <SettingRow
            icon={<HeartPulse size={22} color="$text" />}
            label={t("safety.title", "Train safely")}
            // `as never`: the typed-route union is generated by the dev server and does not know
            // this screen until it restarts — same idiom as the oath push above.
            onPress={() => router.push("/safety" as never)}
          />

          <SettingRow
            icon={<ScrollText size={22} color="$text" />}
            label={t("credits.title", "Credits")}
            value={t("credits.open", "Open")}
            onPress={() => router.push("/credits")}
          />

          <DevFooter />
          <Text testID="settings-version" fontSize="$2" color="$textSecondary" text="center">
            {versionLabel}
          </Text>
        </YStack>
      </RNScrollView>
    </YStack>
  );
}
