import { ChevronLeft, Sparkles } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { memo, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";

import { BossPanel } from "@/components/adventures/BossPanel";
import { starsFor } from "@/components/adventures/replayStars";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { Tag } from "@/components/common/Tag";
import { useToast } from "@/components/common/Toast";
import { getAdventureAsset, getQuestAsset } from "@/constants/assetMap";
import { getQuestColorTokensFromTemplateWithExercises } from "@/constants/exerciseColors";
import type {
  ActiveAdventureRun,
  AdventureDetails,
  AdventureStepTemplate,
  TrainingFocus,
} from "@/db";
import {
  adventureWeeks,
  Difficulty,
  estimateQuestTemplateSeconds,
  getActiveAdventureRun,
  getAdventureDetails,
  getFinishedRunCountsByAdventure,
  getRecentSessionHistory,
  listExercises,
  startAdventureRun,
  suggestDifficultyFromSessions,
} from "@/db";
import { type BossFight, getBossFightByAdventure } from "@/db/bossFights";
import type { Exercise } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import { computeSessionXp } from "@/db/xp";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

function resolveImage(
  path: string | null | undefined,
  getAsset: (id: string) => ImageSourcePropType,
): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getAsset(path);
}

/** What every branch of LoadState carries, so a new field cannot be added to only one of three. */
type LoadedData = {
  activeRun: ActiveAdventureRun | null;
  exercisesById: Record<number, Exercise>;
  suggestedDifficulty: "easy" | "medium" | "hard";
  /** Null until the campaign's first session creates the fight, and for every non-boss adventure. */
  bossFight: BossFight | null;
};

type LoadState =
  | ({ status: "loading"; details: AdventureDetails | null } & LoadedData)
  | ({ status: "ready"; details: AdventureDetails } & LoadedData)
  | ({ status: "error"; details: AdventureDetails | null; message: string } & LoadedData);

const EMPTY_FOCUS: TrainingFocus = { archetype: null, muscles: [] };

function levelLabel(level: Difficulty, t: TFunction) {
  if (level === Difficulty.Easy) return t("quests.level_easy");
  if (level === Difficulty.Hard) return t("quests.level_hard");
  return t("quests.level_medium");
}

function StepStatusTag({ status }: { status: "locked" | "active" | "completed" }) {
  const { t } = useTranslation();
  const label =
    status === "completed"
      ? t("adventures.step_completed")
      : status === "active"
        ? t("adventures.step_active")
        : t("adventures.step_locked");

  const tone = status === "completed" ? "primary" : status === "active" ? "secondary" : "default";

  return <Tag label={label} tone={tone} />;
}

const AdventureStepRow = memo(function AdventureStepRow({
  step,
  status,
}: {
  step: AdventureStepTemplate;
  status: "locked" | "active" | "completed";
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const langKey = useSettingsStore((s) => s.language);

  const stepTitle = langKey === "fr" ? step.quest.frTitle : step.quest.enTitle;

  // Locked steps stay inert; active/completed ones open the quest sheet read-only.
  // withAnchor mounts the gallery under the sheet so the hardware back has somewhere to pop.
  const openQuest =
    status === "locked"
      ? undefined
      : () => router.push(`/quests/${step.questId}` as never, { withAnchor: true });

  const narrative =
    langKey === "fr" ? step.frNarrative || step.enNarrative : step.enNarrative || step.frNarrative;

  const stepImage = resolveImage(step.imagePath, getQuestAsset);

  return (
    <XStack
      items="center"
      justify="space-between"
      gap="$3"
      borderBottomWidth={1}
      borderColor="$borderStrong"
      pb="$3"
      onPress={openQuest}
      pressStyle={openQuest ? { opacity: 0.6 } : undefined}
      accessibilityRole={openQuest ? "button" : undefined}
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
});

// ponytail: 540-line screen — run state, step list, boss panel and narrative in one place.
//           Ceiling: same as the quest screen. Lift the step list out when it needs its own state.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: see the ponytail note above
export default function AdventureDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const { showError } = useToast();
  const reducedMotion = useReducedMotion();
  const [isStarting, setIsStarting] = useState(false);
  const [finishedCount, setFinishedCount] = useState(0);

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
    bossFight: null,
  });

  const load = useCallback(
    async (id: number, isStale: () => boolean = () => false) => {
      setState((s) => ({ ...s, status: "loading" }));

      try {
        const [details, activeRun, exercises, history, finishedCounts, bossFight] =
          await Promise.all([
            getAdventureDetails(id),
            getActiveAdventureRun(id),
            listExercises(),
            getRecentSessionHistory(10),
            getFinishedRunCountsByAdventure(),
            // Read-only: the fight is created by the session that first swings at it, so a
            // campaign never browsed and never started has nothing here and shows no panel.
            getBossFightByAdventure(id),
          ]);

        if (isStale()) return;
        setFinishedCount(finishedCounts.get(id) ?? 0);

        if (!details) {
          setState({
            status: "error",
            details: null,
            activeRun: null,
            exercisesById: {},
            suggestedDifficulty: "medium",
            bossFight: null,
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
          bossFight,
        });
      } catch (e) {
        if (isStale()) return;
        reportError("adventure.load", e);
        const message = e instanceof Error ? e.message : "Unknown error";
        setState((s) => ({ ...s, status: "error", message }));
      }
    },
    [t],
  );

  // On focus, not on mount: this screen stays on the stack under the quest and the session,
  // so a mount-only load showed stale step statuses, boss HP and CTA on the way back. Focus
  // is also what un-sticks `isStarting` after a successful start.
  useFocusEffect(
    useCallback(() => {
      if (!adventureId) return;
      let ignore = false;
      setIsStarting(false);
      // Guard against fast screen-switching: only the latest load commits state.
      load(adventureId, () => ignore).catch(() => {
        // Error already handled in load function
      });
      return () => {
        ignore = true;
      };
    }, [adventureId, load]),
  );

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

  // One Map instead of a run.steps.find() per row (O(n²) over the step list).
  const stepStatusByIndex = useMemo(() => {
    const byIndex = new Map<number, "locked" | "active" | "completed">();
    for (const s of run?.steps ?? []) byIndex.set(s.stepIndex, s.status);
    return byIndex;
  }, [run]);
  const isBoss = details?.adventure.kind === "boss";
  const bossFight = state.bossFight;
  const focus = details?.adventure.focus ?? EMPTY_FOCUS;
  const heroImage = resolveImage(details?.adventure.imagePath, getAdventureAsset);

  const activeTemplateStep = useMemo(() => {
    if (!details) return null;
    if (activeStep) return effectiveSteps.find((s) => s.stepIndex === activeStep.stepIndex) ?? null;
    return effectiveSteps[0] ?? null;
  }, [activeStep, details, effectiveSteps]);

  // A "boss" adventure is a multi-step campaign that culminates in the boss fight, not a boss
  // fight from step one — the CTA should only read "Fight Boss" once that final step is next.
  const isNextStepBossFight =
    isBoss &&
    activeTemplateStep != null &&
    activeTemplateStep.stepIndex === effectiveSteps.length - 1;

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
        { withAnchor: true },
      );
    } catch (e) {
      setIsStarting(false);
      reportError("adventure.start", e);
      showError(t("adventures.start_error", "Could not start the adventure"));
    }
  }, [adventureId, details, isStarting, router, run, showError, suggestedDifficulty, t]);

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
                <Sparkles size={18} color="$primaryText" />
                <Text fontWeight="700" fontSize={20} color="$text">
                  {t("adventures.details_title")}
                </Text>
              </XStack>
            </XStack>

            <Tag label={levelLabel(effectiveDifficulty, t)} tone="secondary" />
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

          {state.status === "loading" && !details ? (
            // This screen used to render a back button on an empty background while loading —
            // the worst loading state in the audit. Reserve the hero card and the step list.
            <YStack gap="$4">
              <SkeletonCard>
                <Skeleton height={180} />
                <Skeleton height={24} width="60%" />
                <Skeleton height={16} width="80%" />
              </SkeletonCard>
              <SkeletonCard>
                <Skeleton height={160} />
              </SkeletonCard>
            </YStack>
          ) : null}

          {details ? (
            <Card
              bg={tokens?.bg ?? "$surface"}
              p="$0"
              overflow="hidden"
              transition={reducedMotion ? undefined : "bouncy"}
              enterStyle={reducedMotion ? undefined : { opacity: 0, scale: 0.96, y: 10 }}
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
                <XStack items="center" gap="$3">
                  <H2 flex={1} color="$text" fontWeight="700" fontSize={26}>
                    {title}
                  </H2>
                  {starsFor(finishedCount) ? (
                    <Text
                      fontSize={16}
                      fontWeight="700"
                      color="$resourceGold"
                      accessibilityLabel={t("adventures.completed_times", { count: finishedCount })}
                    >
                      {starsFor(finishedCount)}
                    </Text>
                  ) : null}
                </XStack>

                {isBoss || focus.archetype || focus.muscles.length > 0 ? (
                  <XStack gap="$2" flexWrap="wrap">
                    {isBoss ? <Tag label={t("adventures.kind_boss")} tone="primary" /> : null}
                    {focus.archetype ? (
                      <Tag label={t(`quests.archetype_${focus.archetype}`)} tone="secondary" />
                    ) : null}
                    {focus.muscles.map((m) => (
                      <Tag key={m} label={MUSCLE_LABELS[m]?.[language] ?? m} />
                    ))}
                  </XStack>
                ) : null}

                {description ? (
                  <Paragraph color="$textSecondary" size="$4" lineHeight={22}>
                    {description}
                  </Paragraph>
                ) : null}

                {/* Who is actually at the end of this. The `BOSS` tag above says a fight exists;
                    this says which monster, how far through it you are, and what it is weak to. */}
                {bossFight ? (
                  <YStack pt="$2">
                    <BossPanel fight={bossFight} language={language} />
                  </YStack>
                ) : null}

                <XStack gap="$2" flexWrap="wrap" pt="$2">
                  <Chip
                    label={t("adventures.steps", {
                      count: effectiveSteps.length,
                    })}
                  />

                  <Chip
                    label={t("adventures.weeks", {
                      count: adventureWeeks(effectiveSteps.length),
                    })}
                  />

                  {preview ? (
                    <Chip
                      label={t("quests.reward_xp_estimate", {
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
                    <AdventureStepRow
                      key={s.stepIndex}
                      step={s}
                      status={
                        stepStatusByIndex.get(s.stepIndex) ??
                        (s.stepIndex === 0 ? "active" : "locked")
                      }
                    />
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
          bg="$bgDark"
          borderTopWidth={1}
          borderColor="$borderStrong"
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
        >
          <AppButton
            testID="adventure-start"
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
                : isNextStepBossFight
                  ? t("adventures.fight_boss")
                  : run?.activeStep
                    ? t("adventures.continue")
                    : finishedCount > 0
                      ? t("adventures.cta_replay")
                      : t("adventures.start")}
            </Text>
          </AppButton>
        </YStack>
      ) : null}
    </YStack>
  );
}
