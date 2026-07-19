import { ChevronLeft, Sparkles } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";

import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { Tag } from "@/components/common/Tag";
import { useToast } from "@/components/common/Toast";
import { getAdventureAsset, getQuestAsset } from "@/constants/assetMap";
import { getQuestColorTokensFromTemplateWithExercises } from "@/constants/exerciseColors";
import type { ActiveAdventureRun, AdventureDetails, AdventureStepTemplate } from "@/db";
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
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSettingsStore } from "@/stores/settings";

function resolveImage(
  path: string | null | undefined,
  getAsset: (id: string) => ImageSourcePropType,
): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getAsset(path);
}

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
  const { showError } = useToast();
  const reducedMotion = useReducedMotion();
  const [isStarting, setIsStarting] = useState(false);

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
  // A started run pins its difficulty for the whole campaign (schema comment on
  // `difficultyOverride`); once set, every step must honor it instead of a fresh suggestion.
  const effectiveDifficulty = run?.run.difficultyOverride ?? suggestedDifficulty;

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
  const heroImage = resolveImage(details?.adventure.imagePath, getAdventureAsset);

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
      userLevel: effectiveDifficulty,
    });

    const xp = computeSessionXp({ durationSeconds, userLevel: effectiveDifficulty });

    return {
      durationSeconds,
      xp,
    };
  }, [activeTemplateStep, state.exercisesById, effectiveDifficulty]);

  const handleStartOrContinue = useCallback(async () => {
    if (!details || adventureId == null || isStarting) return;

    setIsStarting(true);
    try {
      const nextRun =
        run ?? (await startAdventureRun({ adventureId, difficultyOverride: suggestedDifficulty }));
      const step =
        nextRun.activeStep ??
        nextRun.steps.find((s) => s.status === "active") ??
        nextRun.steps[0] ??
        null;

      if (!step) {
        setIsStarting(false);
        return;
      }

      const level = nextRun.run.difficultyOverride ?? suggestedDifficulty;
      router.push(
        `/quests/${step.questId}?level=${encodeURIComponent(level)}&runStepId=${step.id}` as never,
      );
    } catch (e) {
      setIsStarting(false);
      const message = e instanceof Error ? e.message : t("adventures.start_error");
      showError(message);
    }
  }, [adventureId, details, isStarting, router, run, showError, suggestedDifficulty, t]);

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

  const AdventureStepRow = ({ step }: { step: AdventureStepTemplate }) => {
    const rs = run?.steps.find((x) => x.stepIndex === step.stepIndex);
    const status: "locked" | "active" | "completed" =
      rs?.status ?? (step.stepIndex === 0 ? "active" : "locked");

    const stepTitle = langKey === "fr" ? step.quest.frTitle : step.quest.enTitle;

    const narrative =
      langKey === "fr"
        ? step.frNarrative || step.enNarrative
        : step.enNarrative || step.frNarrative;

    const stepImage = resolveImage(step.imagePath, getQuestAsset);

    return (
      <XStack
        items="center"
        justify="space-between"
        gap="$3"
        borderBottomWidth={1}
        borderColor="$borderStrong"
        pb="$3"
      >
        <XStack flex={1} items="center" gap="$3">
          {stepImage ? (
            <Image
              source={stepImage}
              style={{ width: 44, height: 44, borderRadius: 10 }}
              contentFit="cover"
              accessible={false}
            />
          ) : null}

          <YStack flex={1}>
            <Text fontWeight="700" color="$text">
              {t("adventures.step_label", { count: step.stepIndex + 1 })}
              {": "}
              {stepTitle}
            </Text>
            {narrative ? (
              <Paragraph color="$textSecondary" size="$3" numberOfLines={2}>
                {narrative}
              </Paragraph>
            ) : null}
          </YStack>
        </XStack>

        <StepStatusTag status={status} />
      </XStack>
    );
  };

  if (!adventureId) {
    return (
      <YStack flex={1} bg="$background" justify="center" items="center" p="$6" gap="$3">
        <Text fontWeight="700" fontSize={18} color="$text">
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
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <YStack p="$5" pt={insets.top + 12} gap="$4">
          <XStack items="center" justify="space-between">
            <XStack items="center" gap="$3">
              <AppIconButton
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel={t("quests.go_back")}
              >
                <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
              </AppIconButton>

              <XStack items="center" gap="$2">
                <Sparkles size={18} color="$primary" />
                <Text fontWeight="700" fontSize={20} color="$text">
                  {t("adventures.details_title")}
                </Text>
              </XStack>
            </XStack>

            <Tag label={levelLabel(toDifficultyEnum(effectiveDifficulty), t)} tone="secondary" />
          </XStack>

          {state.status === "error" ? (
            <Card bg="$surface">
              <YStack gap="$2">
                <Text fontWeight="700" fontSize={16} color="$text">
                  {t("adventures.load_error")}
                </Text>
                <Paragraph color="$textSecondary" size="$3">
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
            <Card
              bg={tokens?.bg ?? "$surface"}
              p="$0"
              overflow="hidden"
              animation={reducedMotion ? undefined : "bouncy"}
              enterStyle={{ opacity: 0, scale: 0.96, y: 10 }}
            >
              {heroImage ? (
                <Image
                  source={heroImage}
                  style={{ width: "100%", height: 180 }}
                  contentFit="cover"
                  transition={200}
                  accessible={false}
                />
              ) : null}

              <YStack gap="$2" p="$4">
                <H2 color="$text" fontWeight="700" fontSize={26}>
                  {title}
                </H2>

                {isBoss ? (
                  <XStack gap="$2" flexWrap="wrap">
                    <Tag label={t("adventures.kind_boss")} tone="primary" />
                  </XStack>
                ) : null}

                {description ? (
                  <Paragraph color="$textSecondary" size="$4" lineHeight={22}>
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
            <Card bg="$surface">
              <YStack gap="$3">
                <Text fontWeight="700" fontSize={16} color="$text">
                  {t("adventures.steps_title")}
                </Text>

                <YStack gap="$2">
                  {effectiveSteps.map((s) => (
                    <AdventureStepRow key={s.stepIndex} step={s} />
                  ))}
                </YStack>
              </YStack>
            </Card>
          ) : null}
        </YStack>
      </ScrollView>

      {details ? (
        <YStack
          p="$4"
          pb={insets.bottom + 16}
          bg="$background"
          borderTopWidth={1}
          borderColor="$borderStrong"
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
        >
          <AppButton
            onPress={() => {
              handleStartOrContinue().catch(() => {
                // Error already handled via showError above
              });
            }}
            disabled={isStarting}
            opacity={isStarting ? 0.6 : 1}
            variant="primary"
            fullWidth
            height={60}
            bg="$primary"
            borderWidth={0}
            rounded="$6"
            pressStyle={{ opacity: 0.9 }}
          >
            <Text color="$text" fontWeight="700" fontSize={22}>
              {isStarting
                ? t("quests.starting", "Starting…")
                : run?.activeStep
                  ? t("adventures.continue")
                  : isBoss
                    ? t("adventures.fight_boss")
                    : t("adventures.start")}
            </Text>
          </AppButton>
        </YStack>
      ) : null}
    </YStack>
  );
}
