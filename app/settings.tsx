import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, useTheme, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { SectionLabel } from "@/components/common/SectionLabel";
import { useToast } from "@/components/common/Toast";
import { useConfirmDialog } from "@/components/common/useConfirmDialog";
import {
  ArchiveRestore,
  Bug,
  Download,
  Dumbbell,
  Flame,
  FolderDown,
  HeartPulse,
  ImagePlus,
  Languages,
  // Aliased: an unqualified `Map` shadows the global of the same name, which is a trap for
  // whoever edits this file next. Same reason `app/recap.tsx` renames MapLibre's component.
  Map as MapIcon,
  MessagesSquare,
  RotateCcw,
  Ruler,
  ScrollText,
  ShieldCheck,
  Swords,
  Timer,
  Vibrate,
  Volume2,
  Wrench,
  Zap,
} from "@/components/icons";
import { BackupSecretSheet } from "@/components/settings/BackupSecretSheet";
import { BackupSecurityRows } from "@/components/settings/BackupSecurityRows";
import { CrestAnimalRow } from "@/components/settings/CrestAnimalRow";
import { HeroSizeLine } from "@/components/settings/HeroSizeLine";
import { MapStyleRow } from "@/components/settings/MapStyleRow";
import { OutingDisplayRow } from "@/components/settings/OutingDisplayRow";
import { PauseRow } from "@/components/settings/PauseRow";
import { ReminderSection } from "@/components/settings/ReminderSection";
import { RestDefaultRow } from "@/components/settings/RestDefaultRow";
import { SetAsideRow } from "@/components/settings/SetAsideRow";
import { SettingRow } from "@/components/settings/SettingRow";
import { StartingPointRow } from "@/components/settings/StartingPointRow";
import { VillageNameRow } from "@/components/settings/VillageNameRow";
import { AVATARS, type AvatarId, getAvatarSource } from "@/constants/avatars";
import { LEARNING_SESSIONS, transitionSeconds } from "@/constants/warmup";
import { preferences } from "@/db";
import type { WarmupTransition } from "@/db/preferences";
import type { EquipmentCode } from "@/db/schema";
import { useBackup } from "@/hooks/useBackup";
import { useBugReport, versionLabel } from "@/hooks/useBugReport";
import { useHaptics } from "@/hooks/useHaptics";
import { encodeAvatar } from "@/src/customAvatar";
import { UPDATE_CHECK_OFFERED } from "@/src/distribution";
import { LANGUAGE_NAMES, MACHINE_TRANSLATED, nextAppLanguage } from "@/src/i18n/deviceLanguage";
import { reportError } from "@/src/reportError";
import { releaseNotes } from "@/src/whatsNew";
import { useSettingsStore } from "@/stores/settings";

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
    ? t("settings.avatar_custom")
    : t(currentAvatar.labelKey);

  return (
    <Card bg="$surface" p="$4" gap="$3">
      <SectionLabel>{t("settings.avatar")}</SectionLabel>

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
            accessibilityLabel={t("settings.avatar_custom")}
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
                {t("settings.tap_change")}
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

/**
 * The wait before a session's first movement: the warm-up's first one, or the screen before the
 * first exercise. One answer for both, read by the session store at each one (`prepTimer`).
 */
function PrepModeRow() {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const prepMode = useSettingsStore((s) => s.prepMode);
  const setPrepMode = useSettingsStore((s) => s.setPrepMode);

  return (
    <SettingRow
      testID="settings-prep-mode"
      icon={<Timer size={22} color="$text" />}
      label={t("settings.prep_mode")}
      value={prepMode === "timer" ? t("settings.prep_timer") : t("settings.prep_tap")}
      onPress={() => {
        haptics.selection();
        setPrepMode(prepMode === "timer" ? "tap" : "timer").catch((error) => {
          reportError("settings.prepModeWrite", error);
        });
      }}
    />
  );
}

// Auto is not on the cycle: it reads as 5 s, and the first tap is a choice that replaces it.
const NEXT_TRANSITION: Record<WarmupTransition, WarmupTransition> = {
  auto: "10",
  "5": "10",
  "10": "tap",
  tap: "off",
  off: "5",
};

/**
 * The gap between two warm-up movements (issue #198), cycled in place like the rows around it.
 * Hidden with the warm-up: it would set something that never plays. Its own `null` rather than
 * a condition in the screen, which sits one point under Biome's complexity ceiling.
 */
function WarmupTransitionRow({ warmupEnabled }: { warmupEnabled: boolean }) {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const transition = useSettingsStore((s) => s.warmupTransition);
  const setWarmupTransition = useSettingsStore((s) => s.setWarmupTransition);

  if (!warmupEnabled) return null;

  const labels: Record<WarmupTransition, string> = {
    // Read through `transitionSeconds`, so a duration changed there cannot leave this saying the old one.
    auto: t("settings.warmup_transition_seconds", {
      seconds: transitionSeconds("auto", LEARNING_SESSIONS),
    }),
    "5": t("settings.warmup_transition_seconds", { seconds: transitionSeconds("5", 0) }),
    "10": t("settings.warmup_transition_seconds", { seconds: transitionSeconds("10", 0) }),
    tap: t("settings.prep_tap"),
    off: t("settings.warmup_transition_off"),
  };

  return (
    <YStack gap="$1">
      <SettingRow
        testID="settings-warmup-transition"
        icon={<Timer size={22} color="$text" />}
        label={t("settings.warmup_transition")}
        value={labels[transition]}
        onPress={() => {
          haptics.selection();
          setWarmupTransition(NEXT_TRANSITION[transition]).catch((error) => {
            reportError("settings.warmupTransitionWrite", error);
          });
        }}
      />
      {/* Until the hero chooses, the first sessions get longer transitions than the 5 s shown. */}
      {transition === "auto" ? (
        <Text testID="settings-warmup-transition-note" fontSize="$2" color="$textSecondary" px="$3">
          {t("settings.warmup_transition_auto_note", {
            seconds: transitionSeconds("auto", 0),
            sessions: LEARNING_SESSIONS,
          })}
        </Text>
      ) : null}
    </YStack>
  );
}

/**
 * The two network switches read the same way, and their ternaries live out here rather than in
 * the screen: `SettingsScreen` sits one point under Biome's complexity ceiling, and one more row
 * is not what should be allowed to push it over.
 */
function onOffLabel(enabled: boolean, t: ReturnType<typeof useTranslation>["t"]): string {
  return enabled ? t("common.on") : t("common.off");
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Home's reminder line opens `/settings?section=reminder` and lands on the section, not on the
  // avatar two screens above it (audit 2026-10-11, F6). The section mounts after its own read and
  // sits inside the preferences group, so the offset is the two added, taken again at each layout
  // until the hero scrolls by hand.
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const anchor = useRef({ wanted: section === "reminder", group: 0, row: -1 });
  const scrollToAnchor = () => {
    const { wanted, group, row } = anchor.current;
    if (wanted && row >= 0) scrollRef.current?.scrollTo({ y: group + row, animated: false });
  };

  const {
    language,
    avatarId,
    customAvatarUri,
    hapticsEnabled,
    soundEnabled,
    villagersEnabled,
    distanceUnit,
    mapTilesEnabled,
    updateCheckEnabled,
    setLanguage,
    setAvatarId,
    setCustomAvatarUri,
    setHapticsEnabled,
    setSoundEnabled,
    setVillagersEnabled,
    setDistanceUnit,
    setMapTilesEnabled,
    setUpdateCheckEnabled,
  } = useSettingsStore();
  const hasNotes = releaseNotes(language).length > 0;

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const { openBugReport, crashCount } = useBugReport();
  const { showError, showSuccess } = useToast();
  const haptics = useHaptics();
  const { ask, dialog } = useConfirmDialog();
  const {
    busy: backupBusy,
    autoFolder,
    runExport,
    runImport,
    runSaveAs,
    runEnableAuto,
    runDisableAuto,
    secretRequest,
    submitSecret,
    cancelSecret,
    dialog: backupDialog,
  } = useBackup();
  // The confirmation lives here rather than in the hook: onboarding calls the same import with
  // no dialog, because at that point there is no history to lose. One writer, two entrances.
  //
  // It names the folder the pre-restore copy goes to, or asks for a file when there is none: the
  // swap's own `.bak` sits in app-private storage, so promising it as "a recovery copy" promised
  // something no hero could ever open.
  const confirmImport = useCallback(() => {
    const message =
      autoFolder === null
        ? t("backup.confirmMessage")
        : t("backup.confirmMessageAuto", { folder: autoFolder });
    ask({
      title: t("backup.confirmTitle"),
      body: message,
      cancelLabel: t("common.cancel"),
      confirmLabel: t("backup.confirmCta"),
      destructive: true,
      onConfirm: runImport,
    });
  }, [autoFolder, runImport, t, ask]);

  // Turning it on is one tap into the folder picker — there is nothing to warn about, and the
  // first snapshot is written before the folder is remembered, so the confirmation is the toast.
  // Turning it *off* is the branch that needs a dialog, because "change folder" and "stop" are
  // the same row and only the hero knows which one they meant.
  const confirmAuto = useCallback(() => {
    if (autoFolder === null) {
      runEnableAuto();
      return;
    }

    // "Turn off" is the red confirm, "change folder" the quiet button between it and cancel: the
    // dialog paints one destructive answer, so the other two cannot be mistaken for it.
    ask({
      title: t("backup.auto"),
      body: t("backup.autoMessage", { folder: autoFolder }),
      confirmLabel: t("backup.autoOffCta"),
      destructive: true,
      extraLabel: t("backup.autoChangeCta"),
      cancelLabel: t("common.cancel"),
      onConfirm: runDisableAuto,
      onExtra: runEnableAuto,
    });
  }, [autoFolder, runDisableAuto, runEnableAuto, t, ask]);

  const pickCustomAvatar = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        // A silently-declined permission used to make this row do nothing, forever.
        showError(t("settings.photos_denied"));
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
      await setCustomAvatarUri(await encodeAvatar(picked.uri));
      setShowAvatarPicker(false);
    } catch (error) {
      reportError("settings.avatar", error);
      showError(t("common.error"));
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
      ? t("settings.equipment_any")
      : ownedEquipment.length === 0
        ? t("settings.equipment_none")
        : ownedEquipment.length === 1
          ? t("settings.equipment_bar")
          : t("settings.equipment_bar_dip");

  const openOath = useCallback(() => {
    router.push("/oath" as never);
  }, [router]);

  // One writer: the store already swaps i18n and pokes the widgets. Calling
  // `i18n.changeLanguage` here too was a second one, silently racing the first.
  // One tap, the next language, the way the equipment row cycles its four states.
  const cycleLanguage = () => {
    setLanguage(nextAppLanguage(language)).catch((e) => reportError("settings.language", e));
  };

  return (
    <YStack testID="settings-screen" flex={1} bg="$background" pt={insets.top}>
      {/* Header */}
      <XStack px="$4" py="$3" items="center" gap="$3">
        <ScreenBackButton />
        <Text fontFamily="$heading" fontSize={20} fontWeight="700" color="$text">
          {t("settings.title")}
        </Text>
      </XStack>

      <RNScrollView
        ref={scrollRef}
        onScrollBeginDrag={() => {
          anchor.current.wanted = false;
        }}
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

        <YStack gap="$3">
          <SectionLabel px="$1">{t("settings.village_section")}</SectionLabel>
          <VillageNameRow />
          <CrestAnimalRow />
        </YStack>

        {/* Preferences */}
        <YStack
          gap="$3"
          onLayout={(event) => {
            anchor.current.group = event.nativeEvent.layout.y;
            scrollToAnchor();
          }}
        >
          <SectionLabel px="$1">{t("settings.preferences")}</SectionLabel>

          <SettingRow
            icon={<Languages size={22} color="$text" />}
            label={t("settings.language")}
            value={LANGUAGE_NAMES[language]}
            onPress={cycleLanguage}
          />

          {MACHINE_TRANSLATED[language] ? (
            <Text testID="settings-language-ai-note" fontSize="$2" color="$textSecondary" px="$3">
              {t("settings.language_ai_note")}
            </Text>
          ) : null}

          <SettingRow
            icon={<Vibrate size={22} color="$text" />}
            label={t("settings.haptics")}
            value={hapticsEnabled ? t("common.on") : t("common.off")}
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
            testID="settings-sound"
            icon={<Volume2 size={22} color="$text" />}
            label={t("settings.sound")}
            value={soundEnabled ? t("common.on") : t("common.off")}
            onPress={() => {
              haptics.selection();
              setSoundEnabled(!soundEnabled).catch((error) => {
                reportError("settings.soundWrite", error);
              });
            }}
          />

          <SettingRow
            testID="settings-villagers"
            icon={<MessagesSquare size={22} color="$text" />}
            label={t("settings.villagers")}
            value={villagersEnabled ? t("common.on") : t("common.off")}
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
            label={t("settings.replay_guides")}
            onPress={() => {
              haptics.selection();
              preferences
                .setGuidesSeen([])
                .then(() => showSuccess(t("settings.replay_guides_done")))
                .catch((error) => reportError("settings.replayGuides", error));
            }}
          />

          <SettingRow
            icon={<Flame size={22} color="$text" />}
            label={t("settings.warmup")}
            value={warmupEnabled ? t("common.on") : t("common.off")}
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

          <WarmupTransitionRow warmupEnabled={warmupEnabled} />

          <PrepModeRow />

          <RestDefaultRow />

          {/* Draws distances, stores nothing new: every metre stays a metre in the database and
              in every GPX, and constants/distanceFormat.ts is the only place that converts. */}
          <SettingRow
            testID="settings-distance-unit"
            icon={<Ruler size={22} color="$text" />}
            label={t("settings.distance_unit")}
            value={
              distanceUnit === "metric"
                ? t("settings.distance_metric")
                : t("settings.distance_imperial")
            }
            onPress={() => {
              haptics.selection();
              setDistanceUnit(distanceUnit === "metric" ? "imperial" : "metric").catch((error) => {
                reportError("settings.distanceUnitWrite", error);
              });
            }}
          />

          {/* One of the app's three network destinations, off until this row is tapped. The host is
              named on the line below rather than in the policy, because "somewhere in Privacy"
              is where a hero finds out after the fact. */}
          <SettingRow
            testID="settings-map-tiles"
            icon={<MapIcon size={22} color="$text" />}
            label={t("settings.map_tiles")}
            value={onOffLabel(mapTilesEnabled, t)}
            onPress={() => {
              haptics.selection();
              setMapTilesEnabled(!mapTilesEnabled).catch((error) => {
                reportError("settings.mapTilesWrite", error);
              });
            }}
          />

          <Text testID="settings-map-tiles-note" fontSize="$2" color="$textSecondary" px="$3">
            {t("settings.map_tiles_note")}
          </Text>

          <MapStyleRow />

          <OutingDisplayRow />

          <SettingRow
            icon={<Dumbbell size={22} color="$text" />}
            label={t("settings.equipment")}
            value={equipmentLabel}
            onPress={() => {
              haptics.selection();
              cycleEquipment();
            }}
          />

          <StartingPointRow />

          <SetAsideRow />

          <PauseRow />

          <SettingRow
            icon={<Swords size={22} color="$text" />}
            label={t("oath.screen_title")}
            onPress={openOath}
          />

          {/* Above the backup, below the oath it can serve (docs/designs/rappels.md). Renders
              nothing on a build without the reminders' native half. */}
          <ReminderSection
            onLayout={(event) => {
              anchor.current.row = event.nativeEvent.layout.y;
              scrollToAnchor();
            }}
          />

          <SectionLabel px="$1" mt="$2">
            {t("backup.section")}
          </SectionLabel>

          <BackupSecurityRows
            disabled={backupBusy}
            autoFolder={autoFolder}
            onLocalCopy={confirmAuto}
          >
            {/* One door, Android's own "Save as": the hero names the file and picks Drive,
              Downloads or a stick. The share sheet stays one small link below, for the hero who
              wants to hand the file straight to another app. */}
            <SettingRow
              testID="settings-save-backup"
              icon={<FolderDown size={22} color="$text" />}
              label={t("backup.save")}
              value={t("backup.saveHint")}
              disabled={backupBusy}
              onPress={runSaveAs}
            />
            <Text
              testID="settings-export-backup"
              fontSize="$3"
              color="$textSecondary"
              textDecorationLine="underline"
              px="$1"
              minH={44}
              verticalAlign="middle"
              role="link"
              onPress={runExport}
            >
              {t("backup.export")}
            </Text>
          </BackupSecurityRows>

          <HeroSizeLine />

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
            label={t("settings.feedback")}
            value={
              crashCount > 0
                ? t("settings.report_bug_count", { count: crashCount })
                : t("settings.feedback_hint")
            }
            onPress={openBugReport}
          />

          <SettingRow
            icon={<Zap size={22} color="$text" />}
            label={t("xp.title")}
            onPress={() => router.push("/xp" as never)}
          />

          <SettingRow
            icon={<HeartPulse size={22} color="$text" />}
            label={t("safety.title")}
            // `as never`: the typed-route union is generated by the dev server and does not know
            // this screen until it restarts — same idiom as the oath push above.
            onPress={() => router.push("/safety" as never)}
          />

          <SettingRow
            icon={<ShieldCheck size={22} color="$text" />}
            label={t("settings.privacy")}
            onPress={() => router.push("/privacy" as never)}
          />

          <SettingRow
            icon={<ScrollText size={22} color="$text" />}
            label={t("credits.title")}
            value={t("credits.open")}
            onPress={() => router.push("/credits")}
          />

          {/* Next to the version rather than beside the map row, because the question it answers
              is the one the line below raises. The second host this app talks to, off like the
              first, and named on the line under it rather than inside the policy. Absent from the
              F-Droid build, whose signature the GitHub APK does not share. */}
          {UPDATE_CHECK_OFFERED ? (
            <>
              <SettingRow
                testID="settings-update-check"
                icon={<Download size={22} color="$text" />}
                label={t("settings.update_check")}
                value={onOffLabel(updateCheckEnabled, t)}
                onPress={() => {
                  haptics.selection();
                  setUpdateCheckEnabled(!updateCheckEnabled).catch((error) => {
                    reportError("settings.updateCheckWrite", error);
                  });
                }}
              />

              <Text
                testID="settings-update-check-note"
                fontSize="$2"
                color="$textSecondary"
                px="$3"
              >
                {t("settings.update_check_note")}
              </Text>
            </>
          ) : null}

          <DevFooter />
          {/* The version line is also the door to its release notes, any time after the card,
              and only when this build has some: a door onto "no notes" is a dead end. */}
          {hasNotes ? (
            <YStack
              testID="settings-version-notes"
              self="center"
              px="$4"
              minH={48}
              justify="center"
              onPress={() => router.push("/whats-new" as never)}
              accessibilityRole="button"
              accessibilityLabel={t("whats_new.version_label", {
                version: versionLabel,
              })}
            >
              <Text
                testID="settings-version"
                fontSize="$2"
                color="$textSecondary"
                textDecorationLine="underline"
              >
                {versionLabel}
              </Text>
            </YStack>
          ) : (
            <Text testID="settings-version" fontSize="$2" color="$textSecondary" text="center">
              {versionLabel}
            </Text>
          )}
        </YStack>
      </RNScrollView>

      <BackupSecretSheet request={secretRequest} onSubmit={submitSecret} onCancel={cancelSecret} />
      {dialog}
      {backupDialog}
    </YStack>
  );
}
