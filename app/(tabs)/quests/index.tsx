import { LegendList } from "@legendapp/list";
import { Map as MapIcon, Plus } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";

import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { QuestFiltersSheet } from "@/components/QuestFiltersSheet";
import { getQuestAsset } from "@/constants/assetMap";
import {
  type ExerciseColorTokens,
  getExerciseColorTokens,
  getQuestColorTokensFromTemplateWithExercises,
} from "@/constants/exerciseColors";
import {
  estimateQuestTemplateSeconds,
  formatDuration,
  listExercises,
  listQuestTemplates,
} from "@/db";
import type { Exercise } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import type { QuestTemplate } from "@/db/quests";
import type { EquipmentCode, MuscleCode } from "@/db/schema";
import { computeSessionXp } from "@/db/xp";
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

type QuestGlyph = {
  code: MuscleCode;
  bg: ExerciseColorTokens["bg"];
  label: string;
};

const COVER_IMAGE_STYLE = { width: "100%", height: "100%" } as const;

/**
 * Discreet muscle-group dots so the gallery reads at a glance without adding another chip
 * row. Plain colored dots, not sprite images: the previous version put up to 6 expo-image
 * instances per row, each re-decoded on recycle while scrolling.
 */
function MuscleGlyphs({ glyphs }: { glyphs: QuestGlyph[] }) {
  if (glyphs.length === 0) return null;
  return (
    <XStack gap="$1.5" items="center">
      {glyphs.map((g) => (
        <YStack
          key={g.code}
          width={10}
          height={10}
          rounded={5}
          bg={g.bg}
          borderWidth={1}
          borderColor="$borderStrong"
          accessibilityLabel={g.label}
        />
      ))}
    </XStack>
  );
}

function resolveCoverImage(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getQuestAsset(path);
}

type QuestMeta = {
  quest: QuestTemplate;
  muscles: MuscleCode[];
  equipment: EquipmentCode[];
  // Precomputed once per data load — recomputing these in renderItem made every
  // recycled row rebuild color maps, re-run the duration estimator, and re-interpolate
  // i18next strings while scrolling.
  tokens: ExerciseColorTokens;
  durationSeconds: number;
  xp: number;
  cover: ImageSourcePropType | null;
  title: string;
  description: string;
  glyphs: QuestGlyph[];
  /** "≈ 12 min" — worn as a chip over the cover banner. */
  durationLabel: string;
  /** "4 exercises · Strength" — one Text instead of bordered Chips. */
  metaLabel: string;
  /** "+45 XP" — the reward, in gold. */
  xpLabel: string;
};

function buildQuestMeta(
  q: QuestTemplate,
  exercisesById: Record<number, Exercise>,
  language: AppLanguage,
  t: TFunction,
): QuestMeta {
  const muscles = new Set<MuscleCode>();
  const equipment = new Set<EquipmentCode>();

  for (const qex of q.exercises) {
    const ex = exercisesById[qex.exerciseId];
    if (!ex) continue;
    equipment.add(ex.equipment);
    for (const m of ex.muscles) muscles.add(m);
  }

  const durationSeconds = estimateQuestTemplateSeconds({
    template: q,
    exercisesById,
    userLevel: "medium",
  });
  const xp = computeSessionXp({ durationSeconds, userLevel: "medium" });
  const estimate = formatDuration(durationSeconds, language);
  const muscleList = [...muscles];

  return {
    quest: q,
    muscles: muscleList,
    equipment: [...equipment],
    tokens: getQuestColorTokensFromTemplateWithExercises({ quest: q, exercisesById }),
    durationSeconds,
    xp,
    cover: resolveCoverImage(q.imagePath),
    title: language === "fr" ? q.frTitle : q.enTitle,
    description: language === "fr" ? q.frDescription : q.enDescription,
    glyphs: muscleList.map((m) => ({
      code: m,
      bg: getExerciseColorTokens(m).bg,
      label: MUSCLE_LABELS[m]?.[language] ?? m,
    })),
    durationLabel: t("quests.estimate", { duration: estimate, defaultValue: `≈ ${estimate}` }),
    metaLabel: [
      t("quests.exercises", {
        count: q.exercises.length,
        defaultValue: `${q.exercises.length} exercises`,
      }),
      // What kind of session this is, so the hero knows before they tap. Absent on
      // user-authored quests, which declare no archetype.
      q.archetype ? t(`quests.archetype_${q.archetype}`) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    xpLabel: t("quests.reward_xp", { count: xp, defaultValue: `+${xp} XP` }),
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
        </YStack>

        <YStack gap="$2" p="$4">
          <XStack items="center" gap="$2">
            <Text flex={1} fontWeight="700" fontSize={18} color="$text" numberOfLines={1}>
              {meta.title}
            </Text>
            <MuscleGlyphs glyphs={meta.glyphs} />
          </XStack>

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
const FILTER_TRIGGER_SPACE = 64;

// Hoisted so the list doesn't get a fresh function identity on every parent render.
const questKey = (m: QuestMeta) => String(m.quest.id);
const ListGap = () => <YStack height={12} />;

function StatusMessage({
  state,
  filteredCount,
  onRetry,
  onClearFilters,
}: {
  state: LoadState;
  filteredCount: number;
  onRetry: () => void;
  onClearFilters: () => void;
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
    return (
      <YStack px="$5">
        <Card>
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

  if (state.status !== "loading" && state.quests.length === 0) {
    return (
      <YStack px="$5">
        <Card>
          <YStack gap="$3" items="center" py="$2">
            <Text fontSize={32}>🏚️</Text>
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("quests.empty_title", "No quests yet")}
            </Text>
            <Paragraph color="$textSecondary" size="$3">
              {t("quests.empty_subtitle", "Come back soon!")}
            </Paragraph>
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);

  const [state, setState] = useState<LoadState>({
    status: "loading",
    quests: [],
    exercisesById: {},
  });

  const [selectedMuscle, setSelectedMuscle] = useState<MuscleCode | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentCode | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Handlers below are plain closures on purpose: the React Compiler
  // (app.json experiments.reactCompiler) stabilizes them automatically.
  const selectMuscle = (m: MuscleCode | null) => {
    setSelectedMuscle(m);
    setVisibleCount(PAGE_SIZE);
  };

  const selectEquipment = (e: EquipmentCode | null) => {
    setSelectedEquipment(e);
    setVisibleCount(PAGE_SIZE);
  };

  const clearFilters = () => {
    selectMuscle(null);
    selectEquipment(null);
  };

  const load = useCallback(async () => {
    // Only show the loading state on first load — on focus refetches we already have data
    // and flipping status would re-render the whole gallery for nothing.
    setState((s) =>
      s.quests.length > 0
        ? s
        : { status: "loading", quests: s.quests, exercisesById: s.exercisesById },
    );
    try {
      const [quests, exercises] = await Promise.all([listQuestTemplates(), listExercises()]);
      setState((s) => {
        // listQuestTemplates/listExercises are promise-cached: a warm cache returns the same
        // array identity. Bail so a tab refocus doesn't invalidate questMeta → filtered → list.
        if (s.status === "ready" && s.quests === quests) return s;
        const exercisesById = Object.fromEntries(exercises.map((e) => [e.id, e] as const));
        return { status: "ready", quests, exercisesById };
      });
    } catch (e) {
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
    () => quests.map((q) => buildQuestMeta(q, exercisesById, language, t)),
    [exercisesById, quests, language, t],
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

  const filtered = useMemo(() => {
    return questMeta.filter((m) => {
      const okMuscle = selectedMuscle ? m.muscles.includes(selectedMuscle) : true;
      const okEquip = selectedEquipment ? m.equipment.includes(selectedEquipment) : true;
      return okMuscle && okEquip;
    });
  }, [questMeta, selectedEquipment, selectedMuscle]);

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
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$2">
            <MapIcon size={18} color="$text" strokeWidth={2.5} />
            <Text fontWeight="700" fontSize={20} color="$text">
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
              FILTER_TRIGGER_SPACE +
              30,
          }}
        />
      )}

      <QuestFiltersSheet
        language={language}
        availableMuscles={availableMuscles}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={selectMuscle}
        availableEquipment={availableEquipment}
        selectedEquipment={selectedEquipment}
        onSelectEquipment={selectEquipment}
        bottomInset={insets.bottom}
        resultCount={filtered.length}
      />
    </YStack>
  );
}
