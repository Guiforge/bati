import { ChevronLeft, ChevronRight, PenLine } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Input, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { GameIcon } from "@/components/common/GameIcon";
import { ProgressBar } from "@/components/common/ProgressBar";
import { useToast } from "@/components/common/Toast";
import { useOathText } from "@/components/oath/useOathText";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { type Exercise, listExercises } from "@/db/exercises";
import {
  breakOath,
  DEFAULT_WEEKLY_TARGET,
  getOathProgress,
  OATH_PRESETS,
  type OathMetric,
  type OathPreset,
  type OathProgress,
  oathNeedsExercise,
  oathNeedsWeeklyTarget,
  swearOath,
} from "@/db/oaths";
import { preferences } from "@/db/preferences";
import type { EquipmentCode } from "@/db/schema";
import { useHaptics } from "@/hooks/useHaptics";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { requestWidgetsUpdate } from "@/src/widget";
import { useSettingsStore } from "@/stores/settings";

const METRICS: OathMetric[] = [
  "weekly_sessions",
  "exercise_pr",
  "exercise_volume",
  "sessions",
  "streak",
];

/** Sessions per week offered in the custom form. Two is a real answer, not a lesser one. */
const WEEKLY_TARGETS = [2, 3, 4];

function MetricChip({
  metric,
  selected,
  onSelect,
}: {
  metric: OathMetric;
  selected: boolean;
  onSelect: (metric: OathMetric) => void;
}) {
  const { t } = useTranslation();

  return (
    <Chip
      label={t(`oath.metric_label_${metric}`)}
      tone={selected ? "primary" : "default"}
      onPress={() => onSelect(metric)}
    />
  );
}

function WeeklyChip({
  value,
  selected,
  onSelect,
}: {
  value: number;
  selected: boolean;
  onSelect: (value: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <Chip
      label={t("oath.weekly_chip", { count: value })}
      tone={selected ? "primary" : "default"}
      onPress={() => onSelect(value)}
    />
  );
}

function ExerciseChip({
  exercise,
  label,
  selected,
  onSelect,
}: {
  exercise: Exercise;
  label: string;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <Chip
      label={label}
      tone={selected ? "primary" : "default"}
      onPress={() => onSelect(exercise.id)}
    />
  );
}

/** A ready-made oath: tap to swear it, no target to guess. */
function PresetRow({
  preset,
  label,
  onSwear,
}: {
  preset: OathPreset;
  label: string;
  onSwear: (preset: OathPreset) => void;
}) {
  return (
    <Card testID="oath-preset" bg="$surface" onPress={() => onSwear(preset)}>
      <XStack items="center" gap="$3">
        <GameIcon name="star" size={20} color="$primaryText" />
        <Text flex={1} fontWeight="700" fontSize={15} color="$text">
          {label}
        </Text>
        <ChevronRight size={20} color="$text" opacity={0.5} />
      </XStack>
    </Card>
  );
}

const SWORN_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

/**
 * The oath in force, said in full.
 *
 * Split into its own component so `useOathText` is never called conditionally — the card only
 * renders when there is an oath. Same reason `OathCard` splits out `OathBody`, and the same
 * hook, so the swear screen and Home can never word the same oath differently.
 */
function CurrentOathCard({
  progress,
  onAbandon,
}: {
  progress: OathProgress;
  onAbandon: () => void;
}) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const label = useOathText(progress);

  // `isOath` only checks that `swornAt` is a string, so an unparseable one would reach
  // Intl and throw on format. No date is better than no screen.
  const sworn = new Date(progress.oath.swornAt);
  const swornLabel = Number.isNaN(sworn.getTime())
    ? null
    : getDateTimeFormat(language, SWORN_DATE_OPTIONS).format(sworn);

  return (
    <Card testID="oath-current" bg="$pastelPurple" gap="$2">
      <Text fontWeight="700" fontSize={13} color="$text" opacity={0.8}>
        {t("oath.current_title")}
      </Text>

      {/* The oath itself — the card showed a bar and two numbers without ever saying what
          had been sworn. */}
      <XStack items="center" gap="$2">
        <GameIcon name="star" size={20} color="$text" />
        <Text flex={1} fontWeight="700" fontSize={16} color="$text">
          {label}
        </Text>
      </XStack>

      <ProgressBar progress={progress.progress} />

      <Text fontSize={13} color="$text" opacity={0.75}>
        {progress.isFulfilled
          ? t("oath.card_fulfilled")
          : t("oath.card_progress", { current: progress.current, target: progress.target })}
      </Text>

      {swornLabel !== null && (
        <Text fontSize={13} color="$text" opacity={0.6}>
          {t("oath.sworn_on", { date: swornLabel })}
        </Text>
      )}

      <AppButton variant="outline" size="$3" fontSize={15} onPress={onAbandon}>
        {t("oath.abandon")}
      </AppButton>
    </Card>
  );
}

/** Sensible starting target per metric, so the field is never empty on open. */
const DEFAULT_TARGET: Record<OathMetric, number> = {
  exercise_pr: 10,
  exercise_volume: 1000,
  sessions: 50,
  streak: 30,
  weekly_sessions: 8, // weeks
};

export default function OathScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);

  const [existing, setExisting] = useState<OathProgress | null>(null);
  const [metric, setMetric] = useState<OathMetric>("exercise_pr");
  const [target, setTarget] = useState(String(DEFAULT_TARGET.exercise_pr));
  const [exerciseId, setExerciseId] = useState<number | null>(null);
  const [weeklyTarget, setWeeklyTarget] = useState(DEFAULT_WEEKLY_TARGET);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [ownedEquipment, setOwnedEquipment] = useState<EquipmentCode[] | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const { showError, showSuccess } = useToast();
  const { success } = useHaptics();

  useEffect(() => {
    getOathProgress()
      .then(setExisting)
      .catch((e) => {
        reportError("oath.progress", e);
        setExisting(null);
      });
    preferences
      .getOwnedEquipment()
      .then(setOwnedEquipment)
      .catch((e) => {
        reportError("oath.equipment", e);
        setOwnedEquipment(null);
      });
    listExercises()
      .then(setExercises)
      .catch((e) => {
        reportError("oath.exercises", e);
        setExercises([]);
      });
  }, []);

  const pickMetric = useCallback((next: OathMetric) => {
    setMetric(next);
    setTarget(String(DEFAULT_TARGET[next]));
    setError(null);
  }, []);

  const pickExercise = useCallback((id: number) => {
    setExerciseId(id);
    setError(null);
  }, []);

  const exerciseLabel = useCallback((e: Exercise) => localizedName(e, language), [language]);

  const visibleExercises = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matching = needle
      ? exercises.filter((e) => exerciseLabel(e).toLowerCase().includes(needle))
      : exercises;
    // Long list on a phone mid-session: cap it and let the filter do the work.
    return matching.slice(0, 30);
  }, [exercises, filter, exerciseLabel]);

  // Exercise presets need a real id; drop any whose seed exercise isn't loaded yet/present.
  const presetRows = useMemo(() => {
    const rows: { preset: OathPreset; label: string }[] = [];
    for (const p of OATH_PRESETS) {
      if (!oathNeedsExercise(p.metric)) {
        rows.push({
          preset: p,
          label: t(`oath.metric_${p.metric}`, {
            count: p.target,
            exercise: "",
            weekly: p.weeklyTarget ?? DEFAULT_WEEKLY_TARGET,
          }),
        });
        continue;
      }
      const ex = exercises.find((e) => e.enName === p.exerciseName);
      // Drop presets whose exercise is absent, and any that need kit the hero does not own —
      // an oath you cannot move is worse than no oath at all.
      if (
        !ex ||
        (ownedEquipment !== null &&
          ex.equipment !== "none" &&
          !ownedEquipment.includes(ex.equipment))
      )
        continue;
      // ponytail: `metric_exercise_pr` reads as "N reps in a row", true for every exercise_pr
      // preset except this one hold — L-Sit's PR is seconds. One special case rather than a
      // unit field on OathPreset, since it's the only hold-type preset today; give the field a
      // real home if a second one shows up.
      rows.push({
        preset: p,
        label:
          p.id === "lsit_30"
            ? t("oath.preset_lsit_30", { count: p.target })
            : t(`oath.metric_${p.metric}`, { count: p.target, exercise: exerciseLabel(ex) }),
      });
    }
    return rows;
  }, [exercises, exerciseLabel, ownedEquipment, t]);

  const performSwear = useCallback(
    async (input: Parameters<typeof swearOath>[0]) => {
      try {
        await swearOath(input);
      } catch (e) {
        // swearOath throws on invalid input; without this the tap looked like it worked
        // while the promise rejected unhandled and the screen never closed.
        reportError("oath.swear", e);
        showError(t("oath.save_error", "Could not save the oath"));
        return;
      }
      // The oath is the bar the flame and the weekly count are measured against — both
      // widgets can jump the moment it changes. Best-effort, never blocks the ceremony.
      requestWidgetsUpdate().catch((e) => reportError("widget.update", e));
      // The app's most ceremonial commitment used to end in a silent router.back().
      success();
      showSuccess(t("oath.sworn_toast", "Oath sworn"));
      router.back();
    },
    [router, showError, showSuccess, success, t],
  );

  // Swearing overwrites the single stored oath. The screen's own footnote says so; the tap
  // that destroys an oath in force — and its accumulated progress — must say it louder.
  const confirmThenSwear = useCallback(
    (input: Parameters<typeof swearOath>[0]) => {
      if (existing && !existing.isFulfilled) {
        Alert.alert(
          t("oath.replace_title", "Replace your current oath?"),
          t("oath.replace_body", "The oath in force and its progress will be abandoned."),
          [
            { text: t("common.cancel", "Cancel"), style: "cancel" },
            {
              text: t("oath.replace_confirm", "Swear the new oath"),
              style: "destructive",
              onPress: () => {
                performSwear(input).catch(() => {
                  // Errors already surfaced via showError above
                });
              },
            },
          ],
        );
        return;
      }
      performSwear(input).catch(() => {
        // Errors already surfaced via showError above
      });
    },
    [existing, performSwear, t],
  );

  const swearPreset = useCallback(
    (preset: OathPreset) => {
      let id: number | null = null;
      if (oathNeedsExercise(preset.metric)) {
        const ex = exercises.find((e) => e.enName === preset.exerciseName);
        if (!ex) return; // filtered out of the list, shouldn't reach here
        id = ex.id;
      }
      confirmThenSwear({
        metric: preset.metric,
        target: preset.target,
        exerciseId: id,
        weeklyTarget: preset.weeklyTarget,
      });
    },
    [exercises, confirmThenSwear],
  );

  const submit = useCallback(() => {
    const parsed = Number.parseInt(target, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError(t("oath.error_target"));
      return;
    }
    if (oathNeedsExercise(metric) && exerciseId === null) {
      setError(t("oath.error_exercise"));
      return;
    }

    confirmThenSwear({ metric, target: parsed, exerciseId, weeklyTarget });
  }, [metric, target, exerciseId, weeklyTarget, confirmThenSwear, t]);

  const abandon = useCallback(() => {
    Alert.alert(
      t("oath.abandon_title", "Abandon this oath?"),
      t("oath.abandon_body", "Its progress will be lost."),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("oath.abandon", "Abandon"),
          style: "destructive",
          onPress: () => {
            breakOath()
              .then(() => {
                // Breaking the oath drops the quota back to the baseline — same redraw
                // contract as swearing one.
                requestWidgetsUpdate().catch((e) => reportError("widget.update", e));
                router.back();
              })
              .catch((e) => {
                reportError("oath.abandon", e);
                showError(t("oath.save_error", "Could not save the oath"));
              });
          },
        },
      ],
    );
  }, [router, showError, t]);

  return (
    <YStack testID="oath-screen" flex={1} bg="$background" pt={insets.top}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <Button
          size="$3"
          hitSlop={8}
          circular
          chromeless
          onPress={router.back}
          icon={<ChevronLeft size={24} color="$text" />}
          accessibilityRole="button"
          accessibilityLabel={t("quests.go_back", "Go back")}
        />
        <Text fontSize={20} fontWeight="700" color="$text">
          {t("oath.screen_title")}
        </Text>
      </XStack>

      <RNScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <YStack px="$4" gap="$4">
          {/* Current oath — swearing a new one replaces it, so say so up front */}
          {existing !== null && <CurrentOathCard progress={existing} onAbandon={abandon} />}

          {/* Ready-made oaths — a tap, no target to guess. The default path. */}
          {!showCustom && (
            <YStack gap="$2">
              <Text fontSize={13} fontWeight="700" color="$textSecondary">
                {t("oath.presets_title")}
              </Text>
              {presetRows.map((row) => (
                <PresetRow
                  key={row.preset.id}
                  preset={row.preset}
                  label={row.label}
                  onSwear={swearPreset}
                />
              ))}
              <AppButton
                variant="outline"
                size="$3"
                fontSize={15}
                icon={<PenLine size={16} color="$text" />}
                onPress={() => setShowCustom(true)}
              >
                {t("oath.custom_toggle")}
              </AppButton>
            </YStack>
          )}

          {/* Custom form — behind the toggle, for power users who want an exact target. */}
          {showCustom ? (
            <>
              {/* Metric */}
              <YStack gap="$2">
                <Text fontSize={13} fontWeight="700" color="$textSecondary">
                  {t("oath.pick_metric")}
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {METRICS.map((m) => (
                    <MetricChip key={m} metric={m} selected={metric === m} onSelect={pickMetric} />
                  ))}
                </XStack>
              </YStack>

              {/* Target */}
              <YStack gap="$2">
                <Text fontSize={13} fontWeight="700" color="$textSecondary">
                  {t("oath.pick_target")}
                </Text>
                <Input
                  value={target}
                  onChangeText={setTarget}
                  keyboardType="number-pad"
                  bg="$surface"
                  borderColor="$borderStrong"
                  color="$text"
                  fontSize={18}
                  height={52}
                  accessibilityLabel={t("oath.pick_target")}
                />
              </YStack>

              {/* Sessions per week — only for the weekly metric */}
              {oathNeedsWeeklyTarget(metric) && (
                <YStack gap="$2">
                  <Text fontSize={13} fontWeight="700" color="$textSecondary">
                    {t("oath.pick_weekly")}
                  </Text>
                  <XStack gap="$2" flexWrap="wrap">
                    {WEEKLY_TARGETS.map((n) => (
                      <WeeklyChip
                        key={n}
                        value={n}
                        selected={weeklyTarget === n}
                        onSelect={setWeeklyTarget}
                      />
                    ))}
                  </XStack>
                </YStack>
              )}

              {/* Exercise — only for the exercise_* metrics */}
              {oathNeedsExercise(metric) && (
                <YStack gap="$2">
                  <Text fontSize={13} fontWeight="700" color="$textSecondary">
                    {t("oath.pick_exercise")}
                  </Text>
                  <Input
                    value={filter}
                    onChangeText={setFilter}
                    placeholder={t("oath.search_exercise")}
                    bg="$surface"
                    borderColor="$borderStrong"
                    color="$text"
                    height={48}
                    accessibilityLabel={t("oath.search_exercise")}
                  />
                  <YStack gap="$2">
                    {visibleExercises.map((e) => (
                      <ExerciseChip
                        key={e.id}
                        exercise={e}
                        label={exerciseLabel(e)}
                        selected={exerciseId === e.id}
                        onSelect={pickExercise}
                      />
                    ))}
                  </YStack>
                </YStack>
              )}

              {error !== null && (
                <Text fontSize={14} color="$error" fontWeight="700">
                  {error}
                </Text>
              )}

              <AppButton onPress={submit}>{t("oath.swear")}</AppButton>
            </>
          ) : null}
        </YStack>
      </RNScrollView>
    </YStack>
  );
}
