import { ChevronLeft, Sparkles } from "@tamagui/lucide-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";

import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { Tag } from "@/components/common/Tag";
import { getQuestColorTokensFromTemplateWithExercises } from "@/constants/exerciseColors";
import type { ActiveAdventureRun, AdventureDetails } from "@/db";
import {
  Difficulty,
  estimateQuestTemplateSeconds,
  formatDuration,
  getActiveAdventureRun,
  getAdventureDetails,
  getRecentSessionHistory,
  listExercises,
  startAdventureRun,
  suggestDifficultyFromSessions,
} from "@/db";
import type { Exercise } from "@/db/exercises";
import { computeSessionXp } from "@/db/xp";
import { useSettingsStore } from "@/stores/settings";

type LoadState =
  | {
      status: "loading";
      details: AdventureDetails | null;
      activeRun: ActiveAdventureRun | null;
      exercisesById: Record<number, Exercise>;
      suggestedDifficulty: "easy" | "medium" | "hard";
    }
  | {
      status: "ready";
      details: AdventureDetails;
      activeRun: ActiveAdventureRun | null;
      exercisesById: Record<number, Exercise>;
      suggestedDifficulty: "easy" | "medium" | "hard";
    }
  | {
      status: "error";
      details: AdventureDetails | null;
      activeRun: ActiveAdventureRun | null;
      exercisesById: Record<number, Exercise>;
      suggestedDifficulty: "easy" | "medium" | "hard";
      message: string;
    };

function levelLabel(level: Difficulty, t: TFunction) {
  if (level === Difficulty.Easy) return t("quests.level_easy");
  if (level === Difficulty.Hard) return t("quests.level_hard");
  return t("quests.level_medium");
}

function toDifficultyEnum(code: "easy" | "medium" | "hard"): Difficulty {
  if (code === "easy") return Difficulty.Easy;
  if (code === "hard") return Difficulty.Hard;
  return Difficulty.Medium;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex screen component, refactor planned
export default function AdventureDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  const adventureId = useMemo(() => {
    const raw = params.id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const [state, setState] = useState<LoadState>({
    status: "loading",
    details: null,
    activeRun: null,
    exercisesById: {},
    suggestedDifficulty: "medium",
  });

  const load = useCallback(
    async (id: number) => {
      setState((s) => ({ ...s, status: "loading" }));

      try {
        const [details, activeRun, exercises, history] = await Promise.all([
          getAdventureDetails(id),
          getActiveAdventureRun(id),
          listExercises(),
          getRecentSessionHistory(10),
        ]);

        if (!details) {
          setState({
            status: "error",
            details: null,
            activeRun: null,
            exercisesById: {},
            suggestedDifficulty: "medium",
            message: t("adventures.not_found"),
          });
          return;
        }

        const exercisesById = Object.fromEntries(exercises.map((e) => [e.id, e] as const));
        const suggestedDifficulty = suggestDifficultyFromSessions(history, {
          maxSessions: 10,
          defaultDifficulty: "medium",
        });

        setState({
          status: "ready",
          details,
          activeRun,
          exercisesById,
          suggestedDifficulty,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setState((s) => ({ ...s, status: "error", message }));
      }
    },
    [t],
  );

  useEffect(() => {
    if (!adventureId) return;
    load(adventureId).catch(() => {
      // Error already handled in load function
    });
  }, [adventureId, load]);

  const details = state.details;
  const run = state.activeRun;
  const suggestedDifficulty = state.suggestedDifficulty;

  const langKey = language;

  const title = details
    ? langKey === "fr"
      ? details.adventure.frTitle || t("adventures.details_title")
      : details.adventure.enTitle || t("adventures.details_title")
    : "";

  const description = details
    ? langKey === "fr"
      ? details.adventure.frDescription
      : details.adventure.enDescription
    : "";

  const effectiveSteps = details?.steps ?? [];
  const activeStep = run?.activeStep ?? null;
  const isBoss = details?.adventure.kind === "boss";

  const activeTemplateStep = useMemo(() => {
    if (!details) return null;
    if (activeStep) return effectiveSteps.find((s) => s.stepIndex === activeStep.stepIndex) ?? null;
    return effectiveSteps[0] ?? null;
  }, [activeStep, details, effectiveSteps]);

  const tokens = useMemo(() => {
    if (!activeTemplateStep) return null;
    return getQuestColorTokensFromTemplateWithExercises({
      quest: activeTemplateStep.quest,
      exercisesById: state.exercisesById,
    });
  }, [activeTemplateStep, state.exercisesById]);

  const preview = useMemo(() => {
    if (!activeTemplateStep) return null;

    const durationSeconds = estimateQuestTemplateSeconds({
      template: activeTemplateStep.quest,
      exercisesById: state.exercisesById,
      userLevel: suggestedDifficulty,
    });

    const xp = computeSessionXp({ durationSeconds, userLevel: suggestedDifficulty });

    return {
      durationSeconds,
      xp,
    };
  }, [activeTemplateStep, state.exercisesById, suggestedDifficulty]);

  const handleStartOrContinue = useCallback(async () => {
    if (!details || adventureId == null) return;

    try {
      const nextRun =
        run ?? (await startAdventureRun({ adventureId, difficultyOverride: suggestedDifficulty }));
      const step =
        nextRun.activeStep ??
        nextRun.steps.find((s) => s.status === "active") ??
        nextRun.steps[0] ??
        null;

      if (!step) return;

      router.push(
        `/quests/${step.questId}?level=${encodeURIComponent(suggestedDifficulty)}&runStepId=${step.id}` as never,
      );
    } catch {
      // Error handled silently
    }
  }, [adventureId, details, router, run, suggestedDifficulty]);

  const StepStatusTag = ({ status }: { status: "locked" | "active" | "completed" }) => {
    const label =
      status === "completed"
        ? t("adventures.step_completed")
        : status === "active"
          ? t("adventures.step_active")
          : t("adventures.step_locked");

    const tone = status === "completed" ? "primary" : status === "active" ? "secondary" : "default";

    return <Tag label={label} tone={tone} />;
  };

  if (!adventureId) {
    return (
      <YStack flex={1} bg="$background" justify="center" items="center" p="$6" gap="$3">
        <Text fontWeight="900" fontSize={18} color="$color">
          {t("adventures.invalid_id")}
        </Text>
        <AppButton fullWidth={false} variant="secondary" onPress={() => router.back()}>
          {t("quests.go_back")}
        </AppButton>
      </YStack>
    );
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <YStack p="$5" pt={insets.top + 12} gap="$4">
          <XStack items="center" justify="space-between">
            <XStack items="center" gap="$3">
              <AppIconButton onPress={() => router.back()}>
                <ChevronLeft size={22} color="$color" strokeWidth={2.5} />
              </AppIconButton>

              <XStack items="center" gap="$2">
                <Sparkles size={18} color="$color" />
                <Text fontWeight="900" fontSize={20} color="$color">
                  {t("adventures.details_title")}
                </Text>
              </XStack>
            </XStack>

            <Tag label={levelLabel(toDifficultyEnum(suggestedDifficulty), t)} tone="secondary" />
          </XStack>

          {state.status === "error" ? (
            <Card bg="$bgLight">
              <YStack gap="$2">
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("adventures.load_error")}
                </Text>
                <Paragraph color="$color" opacity={0.7} size="$3">
                  {"message" in state ? state.message : ""}
                </Paragraph>
                <AppButton
                  fullWidth={false}
                  variant="secondary"
                  onPress={() => {
                    load(adventureId).catch(() => {
                      // Error already handled
                    });
                  }}
                >
                  {t("quests.retry")} ↻
                </AppButton>
              </YStack>
            </Card>
          ) : null}

          {details ? (
            <Card bg={tokens?.bg ?? "$bgLight"}>
              <YStack gap="$2">
                <H2 color="$color" fontWeight="900" fontSize={26}>
                  {title}
                </H2>

                {isBoss ? (
                  <XStack gap="$2" flexWrap="wrap">
                    <Tag label={t("adventures.kind_boss")} tone="primary" />
                  </XStack>
                ) : null}

                {description ? (
                  <Paragraph color="$color" opacity={0.7} size="$4" lineHeight={22}>
                    {description}
                  </Paragraph>
                ) : null}

                <XStack gap="$2" flexWrap="wrap" pt="$2">
                  <Chip
                    label={t("adventures.steps", {
                      count: effectiveSteps.length,
                    })}
                  />

                  {preview ? (
                    <Chip
                      label={t("quests.estimate", {
                        duration: formatDuration(preview.durationSeconds, langKey),
                      })}
                    />
                  ) : null}

                  {preview ? (
                    <Chip
                      label={t("quests.reward_xp", {
                        count: preview.xp,
                      })}
                      tone="secondary"
                    />
                  ) : null}
                </XStack>
              </YStack>
            </Card>
          ) : null}

          {effectiveSteps.length > 0 ? (
            <Card bg="$bgLight">
              <YStack gap="$3">
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("adventures.steps_title")}
                </Text>

                <YStack gap="$2">
                  {effectiveSteps.map((s) => {
                    const rs = run?.steps.find((x) => x.stepIndex === s.stepIndex);
                    const status: "locked" | "active" | "completed" =
                      rs?.status ?? (s.stepIndex === 0 ? "active" : "locked");

                    const stepTitle = langKey === "fr" ? s.quest.frTitle : s.quest.enTitle;

                    const narrative =
                      langKey === "fr"
                        ? s.frNarrative || s.enNarrative
                        : s.enNarrative || s.frNarrative;

                    return (
                      <XStack key={s.stepIndex} items="center" justify="space-between" gap="$3">
                        <YStack flex={1}>
                          <Text fontWeight="900" color="$color">
                            {t("adventures.step_label", {
                              count: s.stepIndex + 1,
                            })}
                            {": "}
                            {stepTitle}
                          </Text>
                          {narrative ? (
                            <Paragraph color="$color" opacity={0.65} size="$3" numberOfLines={2}>
                              {narrative}
                            </Paragraph>
                          ) : null}
                        </YStack>

                        <StepStatusTag status={status} />
                      </XStack>
                    );
                  })}
                </YStack>
              </YStack>
            </Card>
          ) : null}

          <AppButton
            onPress={() => {
              handleStartOrContinue().catch(() => {
                // Error already handled
              });
            }}
            variant="primary"
            fullWidth
            height={54}
            bg="$color"
            borderWidth={0}
            rounded="$8"
            pressStyle={{ opacity: 0.9 }}
          >
            <Text color="$background" fontWeight="900" fontSize={18}>
              {run?.activeStep
                ? t("adventures.continue")
                : isBoss
                  ? t("adventures.fight_boss")
                  : t("adventures.start")}
            </Text>
          </AppButton>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
