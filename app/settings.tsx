import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, useTheme, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { useToast } from "@/components/common/Toast";
import {
  Archive,
  ArchiveRestore,
  Bug,
  ChevronLeft,
  Dumbbell,
  Flame,
  FolderDown,
  FolderSync,
  HeartPulse,
  ImagePlus,
  Languages,
  MessagesSquare,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  Swords,
  Vibrate,
  Wrench,
} from "@/components/icons";
import { VillageNameRow } from "@/components/settings/VillageNameRow";
import { AVATARS, type AvatarId, getAvatarSource } from "@/constants/avatars";
import { preferences } from "@/db";
import type { EquipmentCode } from "@/db/schema";
import { useBackup } from "@/hooks/useBackup";
import { useHaptics } from "@/hooks/useHaptics";
import { buildBugReportMailto, readCrashLog } from "@/src/crashLog";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

// Version comes from the embedded manifest. The Android build number is derived from the version
// by app.config.js, so it is always present here; the iOS fallback is not, hence the guard.
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
          // Capped at just over half the row, and truncated rather than wrapped. `label` holds
          // the `flex={1}`, so it is the half that gives way: an unbounded value — a folder
          // path, a long count — takes the space the label needed and squeezes it off the
          // screen. `flexShrink` is not a prop Tamagui's `Text` accepts; `maxW` is.
          <Text fontSize="$3" color="$textSecondary" numberOfLines={1} maxW="55%">
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const {
    language,
    avatarId,
    customAvatarUri,
    hapticsEnabled,
    villagersEnabled,
    setLanguage,
    setAvatarId,
    setCustomAvatarUri,
    setHapticsEnabled,
    setVillagersEnabled,
  } = useSettingsStore();

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [crashCount, setCrashCount] = useState(0);
  const { showError, showSuccess } = useToast();
  const haptics = useHaptics();
  const {
    busy: backupBusy,
    autoFolder,
    runExport,
    runImport,
    runSaveToFolder,
    runEnableAuto,
    runDisableAuto,
  } = useBackup();

  // The confirmation lives here rather than in the hook: onboarding calls the same import with
  // no dialog, because at that point there is no history to lose. One writer, two entrances.
  const confirmImport = useCallback(() => {
    Alert.alert(t("backup.confirmTitle"), t("backup.confirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("backup.confirmCta"), style: "destructive", onPress: runImport },
    ]);
  }, [runImport, t]);

  // Turning it on is one tap into the folder picker — there is nothing to warn about, and the
  // first snapshot is written before the folder is remembered, so the confirmation is the toast.
  // Turning it *off* is the branch that needs a dialog, because "change folder" and "stop" are
  // the same row and only the hero knows which one they meant.
  const confirmAuto = useCallback(() => {
    if (autoFolder === null) {
      runEnableAuto();
      return;
    }

    // Order matters, and not for iOS: React Native maps a three-button Android alert to
    // neutral / negative / positive, and positive is the emphasised one on the right. Listing
    // "Turn off" last would put the destructive choice under the most inviting button —
    // `style: "destructive"` does nothing on Android to warn anyone off it.
    Alert.alert(t("backup.auto"), t("backup.autoMessage", { folder: autoFolder }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("backup.autoOffCta"), style: "destructive", onPress: runDisableAuto },
      { text: t("backup.autoChangeCta"), onPress: runEnableAuto },
    ]);
  }, [autoFolder, runDisableAuto, runEnableAuto, t]);

  useEffect(() => {
    readCrashLog()
      .then((reports) => setCrashCount(reports.length))
      .catch((error) => {
        // The row falls back to "0 reports"; the failure itself must not be one more silence.
        reportError("settings.crashLog", error);
      });
  }, []);

  // Reads the log at press time rather than holding it in state: the draft should carry what
  // is on disk now, and the row only ever needed the count.
  const openBugReport = useCallback(async () => {
    try {
      const reports = await readCrashLog();
      const url = buildBugReportMailto(reports, versionLabel, {
        subject: t("feedback.subject", { version: versionLabel }),
        prompt: t("feedback.prompt"),
        technicalHeader: t("feedback.technical_header"),
        noCrash: t("feedback.no_crash"),
      });
      if (!(await Linking.canOpenURL(url))) {
        // Tapping the row and having nothing ever happen reads as broken, not as "no mail app".
        showError(t("settings.no_mail_client", "No email app found on this device"));
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      // Nothing was sent, which is the safe direction to fail in — but say so.
      reportError("settings.bugReport", error);
      showError(t("settings.no_mail_client", "No email app found on this device"));
    }
  }, [t, showError]);

  const pickCustomAvatar = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        // A silently-declined permission used to make this row do nothing, forever.
        showError(t("settings.photos_denied", "Photo access is off — allow it in system settings"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled) return;

      const picked = result.assets[0];
      if (!picked) return;
      await setCustomAvatarUri(picked.uri);
      setShowAvatarPicker(false);
    } catch (error) {
      reportError("settings.avatar", error);
      showError(t("common.error", "Something went wrong"));
    }
  }, [setCustomAvatarUri, showError, t]);

  // What the hero owns, cycled through in one row: unanswered -> nothing -> bar -> bar + dips.
  // Unanswered shows everything, so nobody loses content by never opening this screen.
  const [ownedEquipment, setOwnedEquipment] = useState<EquipmentCode[] | null>(null);
  const [warmupEnabled, setWarmupEnabledState] = useState(true);

  useEffect(() => {
    let cancelled = false;
    preferences
      .getWarmupEnabled()
      .then((value) => {
        if (!cancelled) setWarmupEnabledState(value);
      })
      .catch((error) => {
        // Non-blocking: the warm-up defaults to on.
        reportError("settings.warmupRead", error);
      });
    preferences
      .getOwnedEquipment()
      .then((value) => {
        if (!cancelled) setOwnedEquipment(value);
      })
      .catch((error) => {
        // Non-blocking: an unreadable preference just means "show everything".
        reportError("settings.equipmentRead", error);
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
    preferences.setOwnedEquipment(next).catch((error) => {
      // Non-blocking: the filter is a preference, not a gate — but a write that stops
      // working is exactly the failure nobody notices for weeks.
      reportError("settings.equipmentWrite", error);
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

  const openOath = useCallback(() => {
    router.push("/oath" as never);
  }, [router]);

  // One writer: the store already swaps i18n and pokes the widgets. Calling
  // `i18n.changeLanguage` here too was a second one, silently racing the first.
  const toggleLanguage = () => {
    setLanguage(language === "en" ? "fr" : "en").catch((e) => reportError("settings.language", e));
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

      <RNScrollView
        // VillageNameRow holds a TextInput, so the keyboard opens over this list — and the
        // default ("never") would spend the first tap on every row below it closing the keyboard
        // instead. react-native#4087; see __tests__/keyboard-taps-guard.test.ts.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
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

          <VillageNameRow />

          <SettingRow
            icon={<Languages size={22} color="$text" />}
            label={t("settings.language", "Language")}
            value={language === "en" ? "English" : "Français"}
            onPress={toggleLanguage}
          />

          <SettingRow
            icon={<Vibrate size={22} color="$text" />}
            label={t("settings.haptics", "Haptics")}
            value={hapticsEnabled ? t("common.on", "On") : t("common.off", "Off")}
            onPress={() => {
              const next = !hapticsEnabled;
              setHapticsEnabled(next);
              // Direct call, not useHaptics: the hook still reads the old (off) value in
              // this render, and turning haptics ON should answer with the very thing
              // the hero just enabled.
              if (next) {
                Haptics.selectionAsync().catch(() => {
                  // Haptics errors are non-critical
                });
              }
            }}
          />

          <SettingRow
            testID="settings-villagers"
            icon={<MessagesSquare size={22} color="$text" />}
            label={t("settings.villagers", "Villagers")}
            value={villagersEnabled ? t("common.on", "On") : t("common.off", "Off")}
            onPress={() => {
              haptics.selection();
              setVillagersEnabled(!villagersEnabled).catch((error) => {
                reportError("settings.villagersWrite", error);
              });
            }}
          />

          {/* Clears the whole `guidesSeen` set, not one flag: forgetting one of five is exactly
              how a hero would end up with four guides back and wonder which one they missed. */}
          <SettingRow
            testID="settings-replay-guides"
            icon={<RotateCcw size={22} color="$text" />}
            label={t("settings.replay_guides", "Review the guides")}
            onPress={() => {
              haptics.selection();
              preferences
                .setGuidesSeen([])
                .then(() =>
                  showSuccess(t("settings.replay_guides_done", "The guides will show again")),
                )
                .catch((error) => reportError("settings.replayGuides", error));
            }}
          />

          <SettingRow
            icon={<Flame size={22} color="$text" />}
            label={t("settings.warmup", "Warm-up")}
            value={warmupEnabled ? t("common.on", "On") : t("common.off", "Off")}
            onPress={() => {
              haptics.selection();
              const next = !warmupEnabled;
              setWarmupEnabledState(next);
              preferences.setWarmupEnabled(next).catch((error) => {
                // Non-blocking: it can be skipped in-session either way.
                reportError("settings.warmupWrite", error);
              });
            }}
          />

          <SettingRow
            icon={<Dumbbell size={22} color="$text" />}
            label={t("settings.equipment", "Equipment")}
            value={equipmentLabel}
            onPress={() => {
              haptics.selection();
              cycleEquipment();
            }}
          />

          <SettingRow
            icon={<Swords size={22} color="$text" />}
            label={t("oath.screen_title", "Swear an Oath")}
            onPress={openOath}
          />

          <Text fontSize="$3" fontWeight="bold" color="$textSecondary" px="$1" mt="$2">
            {t("backup.section")}
          </Text>

          <SettingRow
            testID="settings-export-backup"
            icon={<Archive size={22} color="$text" />}
            label={t("backup.export")}
            value={t("backup.exportHint")}
            disabled={backupBusy}
            onPress={runExport}
          />

          {/* Separate from the share sheet rather than an option inside it: on a device with
              nothing installed that accepts a `.db`, the sheet is a dead end, and this is the
              row that still produces a file. Doing both is a hero's right. */}
          <SettingRow
            testID="settings-save-backup"
            icon={<FolderDown size={22} color="$text" />}
            label={t("backup.save")}
            value={t("backup.saveHint")}
            disabled={backupBusy}
            onPress={runSaveToFolder}
          />

          {/* Between the two manual rows and the destructive one, because it is the same act as
              "Save a file" with the remembering added — and because a hero scanning this section
              should meet the option that keeps working without them before the one that replaces
              everything. The value is the folder and nothing else: every other row here spends
              the same few words, and "Before each update · Documents/Bati" squeezed the label off
              the screen. When it runs is one tap away, in the dialog. */}
          <SettingRow
            testID="settings-auto-backup"
            icon={<FolderSync size={22} color="$text" />}
            label={t("backup.auto")}
            value={autoFolder ?? t("backup.autoOff")}
            disabled={backupBusy}
            onPress={confirmAuto}
          />

          <SettingRow
            testID="settings-import-backup"
            icon={<ArchiveRestore size={22} color="$text" />}
            label={t("backup.import")}
            value={t("backup.importHint")}
            disabled={backupBusy}
            onPress={confirmImport}
          />

          {/* Not gated on the crash log any more. The reports worth having come from people
              whose app works — "I never understood the village", "the rest timer is too short" —
              and none of that is a crash. The count still shows when there is one to send. */}
          <SettingRow
            icon={<Bug size={22} color="$text" />}
            label={t("settings.feedback", "Feedback, an idea, a bug")}
            value={
              crashCount > 0
                ? t("settings.report_bug_count", { count: crashCount })
                : t("settings.feedback_hint", "Write to me")
            }
            onPress={openBugReport}
          />

          <SettingRow
            icon={<HeartPulse size={22} color="$text" />}
            label={t("safety.title", "Train safely")}
            // `as never`: the typed-route union is generated by the dev server and does not know
            // this screen until it restarts — same idiom as the oath push above.
            onPress={() => router.push("/safety" as never)}
          />

          <SettingRow
            icon={<ShieldCheck size={22} color="$text" />}
            label={t("settings.privacy", "Privacy")}
            onPress={() => router.push("/privacy" as never)}
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
