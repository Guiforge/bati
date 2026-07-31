import { LegendList } from "@legendapp/list/react-native";
import { Sparkles } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";

import { starsFor } from "@/components/adventures/replayStars";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { GameIcon } from "@/components/common/GameIcon";
import { getAdventureAsset } from "@/constants/assetMap";
import {
  type ExerciseColorTokens,
  getQuestColorTokensFromTemplateWithExercises,
} from "@/constants/exerciseColors";
import {
  type Adventure,
  adventureWeeks,
  estimateQuestTemplateSeconds,
  getAnyActiveAdventureRun,
  getFinishedRunCountsByAdventure,
  listAdventures,
  listExercises,
} from "@/db";
import type { Exercise } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import { computeSessionXp } from "@/db/xp";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

function resolveCoverImage(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getAdventureAsset(path);
}

type LoadState =
  | { status: "loading"; adventures: Adventure[]; exercisesById: Record<number, Exercise> }
  | { status: "ready"; adventures: Adventure[]; exercisesById: Record<number, Exercise> }
  | {
      status: "error";
      adventures: Adventure[];
      exercisesById: Record<number, Exercise>;
      message: string;
    };

const ANDROID_MIN_BOTTOM_INSET = 24;

// Precomputed once per data load — recomputing these in renderItem made every recycled
// row rebuild color maps and re-run the duration estimator while scrolling.
type AdventureRow = {
  adventure: Adventure;
  tokens: ExerciseColorTokens;
  durationSeconds: number;
  xp: number;
  cover: ImageSourcePropType | null;
  title: string;
  description: string;
  kindLabel: string;
  /** "Force · Bras · Dos" — what the campaign trains, so the poster answers it before the tap. */
  focusLabel: string;
  weeksLabel: string;
  stepsLabel: string;
  xpLabel: string;
  finishedCount: number;
  /** "★", "★★", "★★★", then "★ ×n" — how many times this campaign was completed. */
  starsLabel: string | null;
};

/** How the hero is doing in the one campaign that can be active at a time. */
type AdventureProgress = {
  adventureId: number;
  completedCount: number;
  currentIndex: number;
};

function buildAdventureRow(
  a: Adventure,
  exercisesById: Record<number, Exercise>,
  finishedCount: number,
  language: AppLanguage,
  t: TFunction,
): AdventureRow {
  const q = a.coverQuest;
  const durationSeconds = estimateQuestTemplateSeconds({
    template: q,
    exercisesById,
    userLevel: "medium",
  });
  const xp = computeSessionXp({ durationSeconds, userLevel: "medium" });
  const weeks = adventureWeeks(a.stepsCount);

  return {
    adventure: a,
    tokens: getQuestColorTokensFromTemplateWithExercises({ quest: q, exercisesById }),
    durationSeconds,
    xp,
    cover: resolveCoverImage(a.imagePath),
    title: language === "fr" ? a.frTitle || q.frTitle : a.enTitle || q.enTitle,
    description:
      language === "fr" ? a.frDescription || q.frDescription : a.enDescription || q.enDescription,
    kindLabel:
      a.kind === "boss"
        ? t("adventures.kind_boss", "BOSS")
        : a.kind === "event"
          ? t("adventures.kind_event", "EVENT")
          : t("adventures.kind_route", "ROUTE"),
    focusLabel: [
      a.focus.archetype ? t(`quests.archetype_${a.focus.archetype}`) : null,
      ...a.focus.muscles.map((m) => MUSCLE_LABELS[m]?.[language] ?? m),
    ]
      .filter(Boolean)
      .join(" · "),
    weeksLabel: t("adventures.weeks", { count: weeks, defaultValue: `≈ ${weeks} weeks` }),
    stepsLabel: t("adventures.steps", {
      count: a.stepsCount,
      defaultValue: `${a.stepsCount} steps`,
    }),
    xpLabel: t("quests.reward_xp", { count: xp, defaultValue: `+${xp} XP` }),
    finishedCount,
    starsLabel: starsFor(finishedCount),
  };
}

const COVER_IMAGE_STYLE = { width: "100%", height: "100%" } as const;

/**
 * A campaign poster: taller banner than a quest ticket, world-tinted card, and the step
 * track — the visual signature of a journey, which quest cards never wear.
 */
function AdventureCard({
  row,
  progress,
  onPressAdventure,
}: {
  row: AdventureRow;
  progress: AdventureProgress | null;
  onPressAdventure: (id: number) => void;
}) {
  const { t } = useTranslation();
  const item = row.adventure;

  const stepProgressLabel = progress
    ? t("adventures.step_progress", {
        current: progress.currentIndex + 1,
        total: item.stepsCount,
        defaultValue: `Step ${progress.currentIndex + 1}/${item.stepsCount}`,
      })
    : null;
  const metaLabel = stepProgressLabel
    ? `${stepProgressLabel} · ${row.weeksLabel}`
    : `${row.weeksLabel} · ${row.stepsLabel}`;

  return (
    <YStack px="$5">
      <Card
        flat
        testID="adventures-adventure-card"
        bg={row.tokens.bg}
        p="$0"
        overflow="hidden"
        onPress={() => onPressAdventure(item.id)}
      >
        <YStack height={180}>
          {row.cover ? (
            <Image
              source={row.cover}
              recyclingKey={String(item.id)}
              style={COVER_IMAGE_STYLE}
              contentFit="cover"
              accessible={false}
            />
          ) : (
            <YStack flex={1} items="center" justify="center">
              <Text fontSize={44}>🗺️</Text>
            </YStack>
          )}
          <XStack position="absolute" t="$3" l="$3">
            <Chip
              label={row.kindLabel}
              tone={item.kind === "boss" ? "primary" : undefined}
              icon={
                item.kind === "boss" ? (
                  <GameIcon name="sword" size={14} color="$bgDark" accessible={false} />
                ) : undefined
              }
            />
          </XStack>
          {row.starsLabel ? (
            <XStack
              position="absolute"
              t="$3"
              r="$3"
              bg="$bgLight"
              rounded="$4"
              px="$2"
              py="$1"
              borderWidth={1}
              borderColor="$borderStrong"
              accessibilityLabel={t("adventures.completed_times", { count: row.finishedCount })}
            >
              <Text fontSize={12} fontWeight="700" color="$resourceGold">
                {row.starsLabel}
              </Text>
            </XStack>
          ) : null}
        </YStack>

        {/* Step track — the campaign's signature. Filled only on the active run. */}
        <XStack px="$4" pt="$3" gap={3} accessibilityLabel={stepProgressLabel ?? row.stepsLabel}>
          {Array.from({ length: item.stepsCount }, (_, i) => (
            <YStack
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length ordinal segments
              key={i}
              flex={1}
              height={4}
              rounded={2}
              bg={progress && i < progress.completedCount ? "$primary" : "$borderStrong"}
            />
          ))}
        </XStack>

        <YStack gap="$2" p="$4">
          <Text fontWeight="700" fontSize={18} color="$text" numberOfLines={1}>
            {row.title}
          </Text>

          {row.focusLabel ? (
            <Text fontSize={12} fontWeight="700" color="$primary" numberOfLines={1}>
              {row.focusLabel}
            </Text>
          ) : null}

          <Paragraph color="$textSecondary" size="$3" numberOfLines={2}>
            {row.description}
          </Paragraph>

          <XStack items="center" justify="space-between" gap="$2">
            <Text flex={1} fontSize={12} fontWeight="700" color="$textSecondary" numberOfLines={1}>
              {metaLabel}
            </Text>
            {/* The reward reads in gold — same resource color as the quest gallery. */}
            <Text fontSize={14} fontWeight="700" color="$resourceGold">
              {row.xpLabel}
            </Text>
          </XStack>
        </YStack>
      </Card>
    </YStack>
  );
}

// Hoisted so the list doesn't get a fresh function identity on every parent render.
const adventureKey = (a: AdventureRow) => String(a.adventure.id);
const ListGap = () => <YStack height={12} />;

function StatusMessage({ state, onRetry }: { state: LoadState; onRetry: () => void }) {
  const { t } = useTranslation();

  if (state.status === "error") {
    return (
      <YStack px="$5">
        <Card bg="$surface">
          <YStack gap="$3" items="center" py="$2">
            <Text fontSize={32}>😵</Text>
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("quests.load_error", "Oops!")}
            </Text>
            <Paragraph color="$textSecondary" size="$3" style={{ textAlign: "center" }}>
              {state.message}
            </Paragraph>
            <AppButton fullWidth={false} variant="secondary" onPress={onRetry}>
              {t("quests.retry", "Retry")} ↻
            </AppButton>
          </YStack>
        </Card>
      </YStack>
    );
  }

  if (state.status === "loading" && state.adventures.length === 0) {
    return (
      <YStack px="$5">
        <Card bg="$surface">
          <XStack items="center" justify="center" gap="$3" py="$4">
            <Text fontSize={28}>🏗️</Text>
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("quests.loading", "Loading...")}
            </Text>
          </XStack>
        </Card>
      </YStack>
    );
  }

  if (state.status !== "loading" && state.adventures.length === 0) {
    return (
      <YStack px="$5">
        <Card bg="$surface">
          <YStack gap="$3" items="center" py="$2">
            <Text fontSize={32}>🏚️</Text>
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("adventures.empty_title", "No adventures yet")}
            </Text>
            <Paragraph color="$textSecondary" size="$3" style={{ textAlign: "center" }}>
              {t("adventures.empty_subtitle", "Come back soon!")}
            </Paragraph>
          </YStack>
        </Card>
      </YStack>
    );
  }

  return null;
}

export default function AdventuresGallery() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);

  const [state, setState] = useState<LoadState>({
    status: "loading",
    adventures: [],
    exercisesById: {},
  });
  const [activeProgress, setActiveProgress] = useState<AdventureProgress | null>(null);
  const [finishedCounts, setFinishedCounts] = useState<Map<number, number>>(new Map());

  const load = useCallback(async () => {
    // Only show the loading state on first load — on focus refetches we already have data.
    setState((s) =>
      s.adventures.length > 0
        ? s
        : { status: "loading", adventures: s.adventures, exercisesById: s.exercisesById },
    );

    try {
      const [adventures, exercises, activeRun, finished] = await Promise.all([
        listAdventures(),
        listExercises(),
        getAnyActiveAdventureRun(),
        getFinishedRunCountsByAdventure(),
      ]);
      setActiveProgress(
        activeRun
          ? {
              adventureId: activeRun.adventureId,
              completedCount: activeRun.activeRun.steps.filter((s) => s.status === "completed")
                .length,
              currentIndex: activeRun.activeRun.activeStep?.stepIndex ?? 0,
            }
          : null,
      );
      setFinishedCounts(finished);
      const exercisesById = Object.fromEntries(exercises.map((e) => [e.id, e] as const));
      setState({ status: "ready", adventures, exercisesById });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setState((s) => ({
        status: "error",
        adventures: s.adventures,
        exercisesById: s.exercisesById,
        message,
      }));
    }
  }, []);

  // On focus, not on mount: progression and replay stars must be fresh when the hero
  // comes back from a finished session or campaign.
  useFocusEffect(
    useCallback(() => {
      load().catch(() => {
        // Error already handled
      });
    }, [load]),
  );

  const adventures = state.adventures;
  const exercisesById = state.exercisesById;

  const rows = useMemo(
    () =>
      adventures.map((a) =>
        buildAdventureRow(a, exercisesById, finishedCounts.get(a.id) ?? 0, language, t),
      ),
    [adventures, exercisesById, finishedCounts, language, t],
  );

  const title = t("adventures.gallery_title", "Adventures");

  const onPressAdventure = (id: number) => router.push(`/adventures/${id}` as never);

  const renderItem = ({ item }: { item: AdventureRow }) => (
    <AdventureCard
      row={item}
      progress={
        activeProgress && activeProgress.adventureId === item.adventure.id ? activeProgress : null
      }
      onPressAdventure={onPressAdventure}
    />
  );

  return (
    <YStack testID="adventures-screen" flex={1} bg="$background">
      <YStack bg="$background" pt={insets.top + 12} px="$5" pb="$3" gap="$1">
        <XStack items="center" gap="$2">
          <Sparkles size={18} color="$primary" strokeWidth={2.5} />
          <Text fontWeight="700" fontSize={20} color="$text">
            {title}
          </Text>
        </XStack>
        <Text color="$textSecondary" fontSize={13}>
          {t("adventures.gallery_subtitle", "Multi-workout programs with a story and a boss fight")}
        </Text>
      </YStack>

      <StatusMessage
        state={state}
        onRetry={() => {
          load().catch(() => {
            // Error already handled
          });
        }}
      />

      {adventures.length > 0 && (
        <LegendList
          data={rows}
          renderItem={renderItem}
          keyExtractor={adventureKey}
          ItemSeparatorComponent={ListGap}
          recycleItems
          estimatedItemSize={300}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom:
              Math.max(insets.bottom, Platform.OS === "android" ? ANDROID_MIN_BOTTOM_INSET : 0) +
              30,
          }}
        />
      )}
    </YStack>
  );
}
