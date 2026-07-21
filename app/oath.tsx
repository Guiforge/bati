import { ChevronLeft } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Input, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { ProgressBar } from "@/components/common/ProgressBar";
import { type Exercise, listExercises } from "@/db/exercises";
import {
  breakOath,
  getOathProgress,
  type OathMetric,
  type OathProgress,
  oathNeedsExercise,
  swearOath,
} from "@/db/oaths";
import { useSettingsStore } from "@/stores/settings";

const METRICS: OathMetric[] = ["exercise_pr", "exercise_volume", "sessions", "streak"];

/** Chip wrappers exist only so the list rows don't rebind a closure on every render. */
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
  const press = useCallback(() => onSelect(metric), [onSelect, metric]);

  return (
    <Chip
      label={t(`oath.metric_label_${metric}`)}
      tone={selected ? "primary" : "default"}
      onPress={press}
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
  const press = useCallback(() => onSelect(exercise.id), [onSelect, exercise.id]);

  return <Chip label={label} tone={selected ? "primary" : "default"} onPress={press} />;
}

/** Sensible starting target per metric, so the field is never empty on open. */
const DEFAULT_TARGET: Record<OathMetric, number> = {
  exercise_pr: 10,
  exercise_volume: 1000,
  sessions: 50,
  streak: 30,
};

export default function OathScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();
  const isFr = language === "fr";

  const [existing, setExisting] = useState<OathProgress | null>(null);
  const [metric, setMetric] = useState<OathMetric>("exercise_pr");
  const [target, setTarget] = useState(String(DEFAULT_TARGET.exercise_pr));
  const [exerciseId, setExerciseId] = useState<number | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOathProgress()
      .then(setExisting)
      .catch(() => setExisting(null));
    listExercises()
      .then(setExercises)
      .catch(() => setExercises([]));
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

  const exerciseLabel = useCallback((e: Exercise) => (isFr ? e.frName : e.enName), [isFr]);

  const visibleExercises = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matching = needle
      ? exercises.filter((e) => exerciseLabel(e).toLowerCase().includes(needle))
      : exercises;
    // Long list on a phone mid-session: cap it and let the filter do the work.
    return matching.slice(0, 30);
  }, [exercises, filter, exerciseLabel]);

  const submit = useCallback(async () => {
    const parsed = Number.parseInt(target, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError(t("oath.error_target"));
      return;
    }
    if (oathNeedsExercise(metric) && exerciseId === null) {
      setError(t("oath.error_exercise"));
      return;
    }

    await swearOath({ metric, target: parsed, exerciseId });
    router.back();
  }, [metric, target, exerciseId, router, t]);

  const abandon = useCallback(async () => {
    await breakOath();
    router.back();
  }, [router]);

  return (
    <YStack flex={1} bg="$background" pt={insets.top}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <Button
          size="$3"
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
          {existing !== null && (
            <Card bg="$pastelPurple" gap="$2">
              <Text fontWeight="700" fontSize={13} color="$text" opacity={0.8}>
                {t("oath.current_title")}
              </Text>
              <ProgressBar progress={existing.progress} />
              <Text fontSize={13} color="$text" opacity={0.75}>
                {t("oath.card_progress", {
                  current: existing.current,
                  target: existing.target,
                })}
              </Text>
              <AppButton variant="outline" size="$3" fontSize={15} onPress={abandon}>
                {t("oath.abandon")}
              </AppButton>
            </Card>
          )}

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
        </YStack>
      </RNScrollView>
    </YStack>
  );
}
