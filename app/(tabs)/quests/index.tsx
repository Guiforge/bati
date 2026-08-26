import { LegendList } from "@legendapp/list/react-native";
import { Dumbbell, Map as MapIcon, Plus } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { useAmbientVisit, useScreenGuide } from "@/components/chorus/screenCues";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { FilterRail, type RailGroup } from "@/components/common/FilterRail";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { getQuestAsset } from "@/constants/assetMap";
import {
  type ExerciseColorTokens,
  getQuestColorTokensFromTemplateWithExercises,
} from "@/constants/exerciseColors";
import {
  DURATION_BUCKETS,
  type DurationBucket,
  matchesFilters,
  NO_FILTERS,
  type QuestFilters,
  toggleInSet,
} from "@/constants/questFilters";
import {
  estimateQuestTemplateSeconds,
  formatDurationEstimate,
  isUserQuest,
  listExercises,
  listQuestTemplates,
  trainingFocus,
} from "@/db";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import type { Exercise } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import { getAllQuestConfigs, type QuestConfig, resolveTemplateOverrides } from "@/db/questConfig";
import type { QuestTemplate } from "@/db/quests";
import type { EquipmentCode, MuscleCode, QuestArchetype } from "@/db/schema";
import { computeSessionXp } from "@/db/xp";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

type LoadState =
  | { status: "loading"; quests: QuestTemplate[]; exercisesById: Record<number, Exercise> }
  | { status: "ready"; quests: QuestTemplate[]; exercisesById: Record<number, Exercise> }
  | {
      status: "error";
      quests: QuestTemplate[];
      exercisesById: Record<number, Exercise>;
      message: string;
    };

function questEmoji(rounds: number, exerciseCount: number) {
  if (rounds >= 4) return "🧨";
  if (exerciseCount >= 4) return "⚔️";
  return "🪓";
}

const COVER_IMAGE_STYLE = { width: "100%", height: "100%" } as const;

/** No path means no cover: the muscle tint carries the banner instead. Anything else — a bundled
 *  key, a seeded path, a hero's `data:` photo — `getQuestAsset` already knows. */
function resolveCoverImage(path?: string | null): ImageSourcePropType | null {
  return path ? getQuestAsset(path) : null;
}

type QuestMeta = {
  quest: QuestTemplate;
  /** Every muscle the quest touches — what the filter rail offers and `matchesFilters` reads. */
  muscles: MuscleCode[];
  equipment: EquipmentCode[];
  archetype: QuestArchetype | null;
  // Precomputed once per data load — recomputing these in renderItem made every
  // recycled row rebuild color maps, re-run the duration estimator, and re-interpolate
  // i18next strings while scrolling.
  tokens: ExerciseColorTokens;
  durationSeconds: number;
  xp: number;
  cover: ImageSourcePropType | null;
  title: string;
  description: string;
  /** "Strength · Arms · Back" — what the quest trains, in words. Colored dots said nothing. */
  focusLabel: string;
  /** "≈ 12 min" — worn as a chip over the cover banner. */
  durationLabel: string;
  /** "4 exercises" — one Text instead of bordered Chips. */
  metaLabel: string;
  /** "+45 XP" — the reward, in gold. */
  xpLabel: string;
  /** "Yours" on a hero-written quest, null on seed content. Resolved here because `QuestRow`
   *  deliberately has no `useTranslation` of its own. */
  heroLabel: string | null;
};

function buildQuestMeta(
  q: QuestTemplate,
  exercisesById: Record<number, Exercise>,
  language: AppLanguage,
  t: TFunction,
  config: QuestConfig | null,
): QuestMeta {
  const muscles = new Set<MuscleCode>();
  const equipment = new Set<EquipmentCode>();

  for (const qex of q.exercises) {
    const ex = exercisesById[qex.exerciseId];
    if (!ex) continue;
    equipment.add(ex.equipment);
    for (const m of ex.muscles) muscles.add(m);
  }

  // Same numbers as the detail screen: the saved level and structure overrides feed the
  // estimate. ponytail: target/swap overrides are not folded in — the detail's
  // estimateQuestSeconds sees them, so a target-overridden quest can still drift by
  // a few seconds; fold them in if anyone notices.
  const level = config?.level ?? "medium";
  const durationSeconds = estimateQuestTemplateSeconds({
    template: { ...q, ...resolveTemplateOverrides(q, config) },
    exercisesById,
    userLevel: level,
  });
  const xp = computeSessionXp({ durationSeconds, userLevel: level });
  const estimate = formatDurationEstimate(durationSeconds);
  const muscleList = [...muscles];
  // Ranked, not the full set above: a five-exercise quest brushes five muscle groups, and the
  // two it brushes once say nothing. Same rule as the adventure posters.
  const focus = trainingFocus([q], exercisesById);

  return {
    quest: q,
    muscles: muscleList,
    equipment: [...equipment],
    archetype: q.archetype,
    tokens: getQuestColorTokensFromTemplateWithExercises({ quest: q, exercisesById }),
    durationSeconds,
    xp,
    cover: resolveCoverImage(q.imagePath),
    title: localizedTitle(q, language),
    description: language === "fr" ? q.frDescription : q.enDescription,
    // The archetype leads it — what kind of session this is, then what it works. Absent on
    // user-authored quests, which declare no archetype, so their line starts on the muscles.
    focusLabel: [
      focus.archetype ? t(`quests.archetype_${focus.archetype}`) : null,
      ...focus.muscles.map((m) => MUSCLE_LABELS[m]?.[language] ?? m),
    ]
      .filter(Boolean)
      .join(" · "),
    durationLabel: t("quests.estimate", { duration: estimate, defaultValue: `≈ ${estimate}` }),
    metaLabel: t("quests.exercises", {
      count: q.exercises.length,
      defaultValue: `${q.exercises.length} exercises`,
    }),
    xpLabel: t("quests.reward_xp_estimate", { count: xp, defaultValue: `up to +${xp} XP` }),
    heroLabel: isUserQuest(q) ? t("common.hero_badge") : null,
  };
}

// No manual memo/useCallback: the React Compiler (app.json experiments.reactCompiler)
// memoizes components and closures automatically.
function QuestRow({ meta, onPressQuest }: { meta: QuestMeta; onPressQuest: (id: number) => void }) {
  const q = meta.quest;
  const handlePress = () => onPressQuest(q.id);

  return (
    <YStack px="$5">
      <Card
        flat
        testID="quests-quest-card"
        bg="$surface"
        p="$0"
        overflow="hidden"
        onPress={handlePress}
      >
        {/* Cover banner — same card family as the adventures gallery. */}
        <YStack height={140}>
          {meta.cover ? (
            <Image
              source={meta.cover}
              recyclingKey={String(q.id)}
              style={COVER_IMAGE_STYLE}
              contentFit="cover"
              accessible={false}
            />
          ) : (
            // User-authored quests have no cover art: the muscle tint carries the banner.
            <YStack flex={1} bg={meta.tokens.bg} items="center" justify="center">
              <Text fontSize={44}>{questEmoji(q.rounds, q.exercises.length)}</Text>
            </YStack>
          )}
          <XStack position="absolute" t="$3" l="$3">
            <Chip label={meta.durationLabel} />
          </XStack>
          {/* Opposite the duration, so a hero's own quest is legible from the gallery rather
            than only once opened. Same word the movement rows wear. */}
          {meta.heroLabel ? (
            <XStack position="absolute" t="$3" r="$3">
              <Chip label={meta.heroLabel} tone="primary" />
            </XStack>
          ) : null}
        </YStack>

        <YStack gap="$2" p="$4">
          <Text fontWeight="700" fontSize={18} color="$text" numberOfLines={1}>
            {meta.title}
          </Text>

          {meta.focusLabel ? (
            <Text fontSize={12} fontWeight="700" color="$primaryText" numberOfLines={1}>
              {meta.focusLabel}
            </Text>
          ) : null}

          <Paragraph color="$textSecondary" size="$3" numberOfLines={2}>
            {meta.description}
          </Paragraph>

          <XStack items="center" justify="space-between" gap="$2">
            <Text flex={1} fontSize={12} fontWeight="700" color="$textSecondary" numberOfLines={1}>
              {meta.metaLabel}
            </Text>
            {/* The reward reads in gold — the design system's resource color for loot. */}
            <Text fontSize={14} fontWeight="700" color="$resourceGold">
              {meta.xpLabel}
            </Text>
          </XStack>
        </YStack>
      </Card>
    </YStack>
  );
}

const PAGE_SIZE = 10;

// Hoisted so the list doesn't get a fresh function identity on every parent render.
const questKey = (m: QuestMeta) => String(m.quest.id);
const ListGap = () => <YStack height={12} />;

const DURATION_FALLBACKS: Record<DurationBucket, string> = {
  short: "≤ 15 min",
  medium: "≤ 30 min",
  long: "30 min+",
};

function StatusMessage({
  state,
  filteredCount,
  onRetry,
  onClearFilters,
  onCreate,
}: {
  state: LoadState;
  filteredCount: number;
  onRetry: () => void;
  onClearFilters: () => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation();

  if (state.status === "error") {
    return (
      <YStack px="$5">
        <Card>
          <YStack gap="$3" items="center" py="$2">
            <Text fontSize={32}>😵</Text>
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("quests.load_error", "Oops!")}
            </Text>
            <Paragraph color="$textSecondary" size="$3">
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

  if (state.status === "loading" && state.quests.length === 0) {
    // Reserve two poster-row heights instead of a ~80dp "Loading…" card the list jumps from.
    return (
      <YStack px="$5" gap="$3">
        <SkeletonCard>
          <Skeleton height={200} />
        </SkeletonCard>
        <SkeletonCard>
          <Skeleton height={200} />
        </SkeletonCard>
      </YStack>
    );
  }

  if (state.status !== "loading" && state.quests.length === 0) {
    return (
      <YStack px="$5">
        <Card>
          <YStack gap="$3" items="center" py="$2">
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("quests.empty_title", "No quests yet")}
            </Text>
            <Paragraph color="$textSecondary" size="$3">
              {t("quests.empty_subtitle", "Come back soon!")}
            </Paragraph>
            {/* The header's 36dp "+" was the only way in; an empty gallery should offer it. */}
            <AppButton fullWidth={false} onPress={onCreate}>
              {t("quests.editor_new_title", "New quest")}
            </AppButton>
          </YStack>
        </Card>
      </YStack>
    );
  }

  if (state.status !== "loading" && state.quests.length > 0 && filteredCount === 0) {
    return (
      <YStack px="$5">
        <Card>
          <YStack gap="$3" items="center" py="$2">
            <Text fontSize={32}>🔍</Text>
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("quests.empty_filters_title", "No matches")}
            </Text>
            <Paragraph color="$textSecondary" size="$3">
              {t("quests.empty_filters_subtitle", "Try removing filters.")}
            </Paragraph>
            <AppButton fullWidth={false} variant="secondary" onPress={onClearFilters}>
              {t("quests.filters_clear", "Clear filters")}
            </AppButton>
          </YStack>
        </Card>
      </YStack>
    );
  }

  return null;
}
const ANDROID_MIN_BOTTOM_INSET = 24;

export default function QuestsGallery() {
  useScreenGuide("guide_quests");
  useAmbientVisit("menu_visit");

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);

  const [state, setState] = useState<LoadState>({
    status: "loading",
    quests: [],
    exercisesById: {},
  });

  const [filters, setFilters] = useState<QuestFilters>(NO_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // One bulk read alongside the templates — never per card, the list renders ~34 of them.
  const [configs, setConfigs] = useState<Map<number, QuestConfig>>(new Map());

  // Handlers below are plain closures on purpose: the React Compiler
  // (app.json experiments.reactCompiler) stabilizes them automatically.
  // Narrowing the results always resets pagination — page 3 of the old list means nothing.
  const applyFilters = (next: (f: QuestFilters) => QuestFilters) => {
    setFilters(next);
    setVisibleCount(PAGE_SIZE);
  };

  const toggleMuscle = (m: MuscleCode) =>
    applyFilters((f) => ({ ...f, muscles: toggleInSet(f.muscles, m) }));

  const toggleEquipment = (e: EquipmentCode) =>
    applyFilters((f) => ({ ...f, equipment: toggleInSet(f.equipment, e) }));

  const toggleArchetype = (a: QuestArchetype) =>
    applyFilters((f) => ({ ...f, archetypes: toggleInSet(f.archetypes, a) }));

  // Single-select: you only ever have one amount of time. Tapping the active one clears it.
  const toggleDuration = (d: DurationBucket) =>
    applyFilters((f) => ({ ...f, duration: f.duration === d ? null : d }));

  const clearFilters = () => applyFilters(() => NO_FILTERS);

  const load = useCallback(async () => {
    // Only show the loading state on first load — on focus refetches we already have data
    // and flipping status would re-render the whole gallery for nothing.
    setState((s) =>
      s.quests.length > 0
        ? s
        : { status: "loading", quests: s.quests, exercisesById: s.exercisesById },
    );
    try {
      const [quests, exercises, questConfigs] = await Promise.all([
        listQuestTemplates(),
        listExercises(),
        getAllQuestConfigs(),
      ]);
      setConfigs(questConfigs);
      setState((s) => {
        // listQuestTemplates/listExercises are promise-cached: a warm cache returns the same
        // array identity. Bail so a tab refocus doesn't invalidate questMeta → filtered → list.
        if (s.status === "ready" && s.quests === quests) return s;
        const exercisesById = Object.fromEntries(exercises.map((e) => [e.id, e] as const));
        return { status: "ready", quests, exercisesById };
      });
    } catch (e) {
      reportError("quests.gallery", e);
      const message = e instanceof Error ? e.message : "Unknown error";
      setState((s) => ({
        status: "error",
        quests: s.quests,
        exercisesById: s.exercisesById,
        message,
      }));
    }
  }, []);

  // On focus: a quest written or deleted in the editor has to show up here on the way back.
  useFocusEffect(
    useCallback(() => {
      load().catch(() => {
        // Error already handled
      });
    }, [load]),
  );

  const quests = state.quests;
  const exercisesById = state.exercisesById;

  const questMeta = useMemo(
    () =>
      quests.map((q) => buildQuestMeta(q, exercisesById, language, t, configs.get(q.id) ?? null)),
    [exercisesById, quests, language, t, configs],
  );

  const availableMuscles = useMemo(() => {
    const s = new Set<MuscleCode>();
    for (const m of questMeta) for (const code of m.muscles) s.add(code);
    return [...s];
  }, [questMeta]);

  const availableEquipment = useMemo(() => {
    const s = new Set<EquipmentCode>();
    for (const m of questMeta) for (const code of m.equipment) s.add(code);
    return [...s];
  }, [questMeta]);

  const availableArchetypes = useMemo(() => {
    const s = new Set<QuestArchetype>();
    for (const m of questMeta) if (m.archetype) s.add(m.archetype);
    return [...s];
  }, [questMeta]);

  const filtered = useMemo(
    () => questMeta.filter((m) => matchesFilters(m, filters)),
    [questMeta, filters],
  );

  // Duration first (the "how long have I got" question), then the kind of training, then muscles,
  // then equipment — one pill per dimension; the rail owns how they open and summarise.
  const railGroups: RailGroup[] = [
    {
      key: "duration",
      label: t("quests.filter_group_duration", "Duration"),
      single: true,
      chips: DURATION_BUCKETS.map((b) => ({
        key: `d-${b}`,
        label: t(`quests.filter_duration_${b}`, DURATION_FALLBACKS[b]),
        active: filters.duration === b,
        onPress: () => toggleDuration(b),
      })),
    },
    {
      key: "type",
      label: t("quests.filter_group_type", "Type"),
      chips: availableArchetypes.map((a) => ({
        key: `a-${a}`,
        label: t(`quests.archetype_${a}`),
        active: filters.archetypes.has(a),
        onPress: () => toggleArchetype(a),
      })),
    },
    {
      key: "muscle",
      label: t("quests.filter_group_muscle", "Muscles"),
      chips: availableMuscles.map((m) => ({
        key: `m-${m}`,
        label: MUSCLE_LABELS[m]?.[language] ?? m,
        active: filters.muscles.has(m),
        onPress: () => toggleMuscle(m),
      })),
    },
    {
      key: "equipment",
      label: t("quests.filter_group_equipment", "Equipment"),
      chips: availableEquipment.map((e) => ({
        key: `e-${e}`,
        label: EQUIPMENT_LABELS[e]?.[language] ?? e,
        active: filters.equipment.has(e),
        onPress: () => toggleEquipment(e),
      })),
    },
  ].filter((g) => g.chips.length > 0);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const canLoadMore = visible.length < filtered.length;

  const onEndReached = () => {
    if (!canLoadMore) return;
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
  };

  const title = t("quests.gallery_title", "Quests");

  const onPressQuest = (id: number) => router.push(`/quests/${id}` as never);

  const renderItem = ({ item }: { item: QuestMeta }) => (
    <QuestRow meta={item} onPressQuest={onPressQuest} />
  );

  return (
    // Opaque background on purpose: $background is translucent (alpha 0.92) over the
    // full-screen AppBackground image, which makes the compositor blend the entire
    // viewport on every scroll frame. Same RGB as $background, so visually identical
    // (the image showed through at ~1.4%).
    <YStack flex={1} bg="$bgDark">
      {/* Fixed Header - stays in place */}
      <YStack bg="$bgDark" pt={insets.top + 12} px="$5" pb="$3" gap="$1">
        {/* Title Row */}
        {/* The title gives way, never the actions: nothing in this row could shrink, so the
            count chip plus two 36dp buttons pushed the "+" off the right edge. */}
        <XStack items="center" justify="space-between" gap="$2">
          <XStack items="center" gap="$2" flex={1} minW={0}>
            <MapIcon size={18} color="$text" strokeWidth={2.5} />
            <Text flex={1} fontWeight="700" fontSize={20} color="$text" numberOfLines={1}>
              {title}
            </Text>
          </XStack>
          <XStack items="center" gap="$2">
            <Chip
              label={t("quests.count", {
                count: filtered.length,
                defaultValue: "{{count}} quests",
              })}
              tone="secondary"
            />
            {/* The catalogue: the only way to ask "what does Bati know about rows?" without
                first finding a quest that happens to contain one (roadmap 4.22). */}
            <AppIconButton
              width={36}
              height={36}
              rounded={18}
              onPress={() => router.push("/exercises" as never)}
              accessibilityRole="button"
              accessibilityLabel={t("exercises.catalogue_title", "Exercises")}
            >
              <Dumbbell size={18} color="$text" strokeWidth={2.5} />
            </AppIconButton>
            <AppIconButton
              width={36}
              height={36}
              rounded={18}
              onPress={() => router.push("/quests/edit" as never)}
              accessibilityRole="button"
              accessibilityLabel={t("quests.editor_new_title", "New quest")}
            >
              <Plus size={18} color="$text" strokeWidth={2.5} />
            </AppIconButton>
          </XStack>
        </XStack>
        <Text color="$textSecondary" fontSize={13}>
          {t("quests.gallery_subtitle", "Single workouts — pick one and go")}
        </Text>
      </YStack>

      {/* Filters, in the page rather than behind a modal. Above StatusMessage on purpose:
          when a filter empties the list, the way out stays right under the message. */}
      {quests.length > 0 ? <FilterRail groups={railGroups} onClearAll={clearFilters} /> : null}

      {/* Status Messages */}
      <StatusMessage
        state={state}
        filteredCount={filtered.length}
        onRetry={() => {
          load().catch(() => {
            // Error already handled
          });
        }}
        onClearFilters={clearFilters}
        onCreate={() => router.push("/quests/edit" as never)}
      />

      {/* Scrollable Quest List */}
      {filtered.length > 0 && (
        <LegendList
          data={visible}
          renderItem={renderItem}
          keyExtractor={questKey}
          ItemSeparatorComponent={ListGap}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          recycleItems
          estimatedItemSize={240}
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
