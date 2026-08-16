import { LegendList } from "@legendapp/list/react-native";
import { ChevronLeft, ChevronRight, Dumbbell, Link2, Search } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input, Paragraph, Text, XStack, YStack } from "tamagui";

import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { FilterRail, type RailGroup } from "@/components/common/FilterRail";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { ExerciseRow } from "@/components/exercises/ExerciseRow";
import { getExerciseThumb } from "@/constants/assetMap";
import {
  buildLeadsTo,
  type ExerciseFilters,
  filterExercises,
  NO_EXERCISE_FILTERS,
} from "@/constants/exerciseFilters";
import { toggleInSet } from "@/constants/questFilters";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { type Exercise, listExercises } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import type { EquipmentCode, MovementPattern, MuscleCode } from "@/db/schema";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

type LoadState =
  | { status: "loading"; exercises: Exercise[] }
  | { status: "ready"; exercises: Exercise[] }
  | { status: "error"; exercises: Exercise[]; message: string };

const ANDROID_MIN_BOTTOM_INSET = 24;

/** English fallbacks for the movement patterns, so a missing key still reads as a word. */
const PATTERN_FALLBACKS: Record<MovementPattern, string> = {
  push_horizontal: "Push (horizontal)",
  push_vertical: "Push (vertical)",
  pull_horizontal: "Pull (horizontal)",
  pull_vertical: "Pull (vertical)",
  squat: "Squat",
  hinge: "Hinge",
  core: "Core",
  locomotion: "Locomotion",
  mobility: "Mobility",
};

// Hoisted so the list doesn't get a fresh function identity on every parent render.
const exerciseKey = (e: Exercise) => String(e.id);
const ListGap = () => <YStack height={8} />;

/**
 * "⛓ leads to Scapular Pull-Up" — 4.4's ladder, seen from the list.
 *
 * The row says *that* the movement goes somewhere and where; how close the hero is stays on
 * the detail screen, which already owns it. A per-row progress bar would be the wall of unlit
 * nodes that the dedicated skill-tree screen was dropped for.
 */
function LeadsToCaption({ name }: { name: string }) {
  const { t } = useTranslation();
  return (
    <XStack items="center" gap="$1">
      <Link2 size={11} color="$primaryText" strokeWidth={2.5} />
      <Text fontSize={12} fontWeight="700" color="$primaryText" numberOfLines={1}>
        {t("exercises.leads_to", { name, defaultValue: `leads to ${name}` })}
      </Text>
    </XStack>
  );
}

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
              {t("exercises.load_error", "Failed to load exercise")}
            </Text>
            <Paragraph color="$textSecondary" size="$3">
              {state.message}
            </Paragraph>
            <AppButton fullWidth={false} variant="secondary" onPress={onRetry}>
              {t("exercises.retry", "Retry")} ↻
            </AppButton>
          </YStack>
        </Card>
      </YStack>
    );
  }

  if (state.status === "loading") {
    // Reserve three row heights instead of a short card the list then jumps from.
    return (
      <YStack px="$5" gap="$2">
        <SkeletonCard>
          <Skeleton height={56} />
        </SkeletonCard>
        <SkeletonCard>
          <Skeleton height={56} />
        </SkeletonCard>
        <SkeletonCard>
          <Skeleton height={56} />
        </SkeletonCard>
      </YStack>
    );
  }

  if (filteredCount === 0) {
    return (
      <YStack px="$5">
        <Card>
          <YStack gap="$3" items="center" py="$2">
            <Text fontSize={32}>🔍</Text>
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("exercises.empty_filters_title", "No matches")}
            </Text>
            <Paragraph color="$textSecondary" size="$3">
              {t("exercises.empty_filters_subtitle", "Try removing filters.")}
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

/**
 * Everything Bati knows about movement, in one list.
 *
 * Until this screen existed the only route to an exercise was through a quest that happened to
 * contain it, which is why the variation ladder on the detail screen was invisible: nobody
 * could get there on purpose (roadmap 4.22).
 */
export default function ExerciseCatalogue() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);

  const [state, setState] = useState<LoadState>({ status: "loading", exercises: [] });
  const [filters, setFilters] = useState<ExerciseFilters>(NO_EXERCISE_FILTERS);

  const load = useCallback(async () => {
    setState((s) => (s.exercises.length > 0 ? s : { status: "loading", exercises: [] }));
    try {
      const exercises = await listExercises();
      setState({ status: "ready", exercises });
    } catch (e) {
      reportError("exercises.catalogue", e);
      const message = e instanceof Error ? e.message : "Unknown error";
      setState((s) => ({ status: "error", exercises: s.exercises, message }));
    }
  }, []);

  // Not `useFocusEffect`: exercises are seed content with no in-app editing, so unlike the
  // quest gallery there is nothing that can change under this screen while it is open.
  useEffect(() => {
    load().catch(() => {
      // Error already handled in `load`.
    });
  }, [load]);

  const exercises = state.exercises;

  // Handlers below are plain closures on purpose: the React Compiler
  // (app.json experiments.reactCompiler) stabilizes them automatically.
  const toggleMuscle = (m: MuscleCode) =>
    setFilters((f) => ({ ...f, muscles: toggleInSet(f.muscles, m) }));
  const toggleEquipment = (e: EquipmentCode) =>
    setFilters((f) => ({ ...f, equipment: toggleInSet(f.equipment, e) }));
  const togglePattern = (p: MovementPattern) =>
    setFilters((f) => ({ ...f, patterns: toggleInSet(f.patterns, p) }));
  const toggleLadder = () => setFilters((f) => ({ ...f, ladderOnly: !f.ladderOnly }));
  const setSearch = (search: string) => setFilters((f) => ({ ...f, search }));
  const clearFilters = () => setFilters(NO_EXERCISE_FILTERS);

  const leadsTo = useMemo(() => buildLeadsTo(exercises), [exercises]);

  // Keyed on the stable full list, not on the filtered one: the asset lookup is a split +
  // regex, and re-running it per row on every keystroke is what this memo exists to stop.
  const thumbById = useMemo(
    () => new Map(exercises.map((e) => [e.id, getExerciseThumb(e.imagePath)] as const)),
    [exercises],
  );

  // Seed order is insertion order across six migrations, which reads as random on a flat list.
  const sorted = useMemo(
    () =>
      [...exercises].sort((a, b) =>
        localizedName(a, language).localeCompare(localizedName(b, language), language),
      ),
    [exercises, language],
  );

  const visible = useMemo(
    () => filterExercises(sorted, filters, language, leadsTo),
    [sorted, filters, language, leadsTo],
  );

  const availableMuscles = useMemo(() => {
    const s = new Set<MuscleCode>();
    for (const e of exercises) for (const m of e.muscles) s.add(m);
    return [...s];
  }, [exercises]);

  const availableEquipment = useMemo(() => {
    const s = new Set<EquipmentCode>();
    for (const e of exercises) s.add(e.equipment);
    return [...s];
  }, [exercises]);

  const availablePatterns = useMemo(() => {
    const s = new Set<MovementPattern>();
    for (const e of exercises) if (e.pattern) s.add(e.pattern);
    return [...s];
  }, [exercises]);

  // Ladder first — it is the reason this screen exists — then what the movement *is*, then
  // what it works, then what it needs. One labeled group per dimension.
  const railGroups: RailGroup[] = [
    {
      key: "ladder",
      label: t("exercises.filter_group_ladder", "Ladder"),
      chips: leadsTo.size
        ? [
            {
              key: "ladder-only",
              label: t("exercises.filter_ladder", "Leads somewhere"),
              active: filters.ladderOnly,
              onPress: toggleLadder,
            },
          ]
        : [],
    },
    {
      key: "pattern",
      label: t("exercises.filter_group_pattern", "Movement"),
      chips: availablePatterns.map((p) => ({
        key: `p-${p}`,
        label: t(`exercises.pattern_${p}`, PATTERN_FALLBACKS[p]),
        active: filters.patterns.has(p),
        onPress: () => togglePattern(p),
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

  const renderItem = ({ item }: { item: Exercise }) => {
    const next = leadsTo.get(item.id);
    const name = localizedName(item, language);
    const nextName = next ? localizedName(next, language) : null;

    return (
      <YStack px="$5">
        <ExerciseRow
          exercise={item}
          language={language}
          thumb={thumbById.get(item.id)}
          caption={nextName ? <LeadsToCaption name={nextName} /> : undefined}
          trailing={<ChevronRight size={20} color="$textSecondary" strokeWidth={2.5} />}
          accessibilityLabel={
            nextName
              ? `${name}, ${t("exercises.leads_to", { name: nextName, defaultValue: `leads to ${nextName}` })}`
              : name
          }
          onPress={() => router.push(`/exercises/${item.id}` as never)}
        />
      </YStack>
    );
  };

  return (
    // Opaque background on purpose: $background is translucent over the full-screen
    // AppBackground image, which makes the compositor blend the whole viewport per scroll frame.
    <YStack flex={1} bg="$bgDark">
      <YStack bg="$bgDark" pt={insets.top + 12} px="$5" pb="$3" gap="$3">
        <XStack items="center" justify="space-between" gap="$2">
          {/* Same rule as the quests header: only the title gives way. Yoga's flexShrink
              defaults to 0, so the back button and the count keep their box on their own. */}
          <XStack items="center" gap="$3" flex={1} minW={0}>
            <AppIconButton
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t("exercises.go_back", "Go back")}
            >
              <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
            </AppIconButton>
            <XStack items="center" gap="$2" flex={1} minW={0}>
              <Dumbbell size={18} color="$text" strokeWidth={2.5} />
              <Text flex={1} fontWeight="700" fontSize={20} color="$text" numberOfLines={1}>
                {t("exercises.catalogue_title", "Exercises")}
              </Text>
            </XStack>
          </XStack>
          <Chip
            label={t("exercises.count", {
              count: visible.length,
              defaultValue: "{{count}} movements",
            })}
            tone="secondary"
          />
        </XStack>

        <XStack items="center" gap="$2">
          <Input
            flex={1}
            value={filters.search}
            onChangeText={setSearch}
            placeholder={t("exercises.search", "Search a movement")}
            bg="$background"
            borderColor="$borderStrong"
            color="$text"
          />
          <Search size={18} color="$textSecondary" />
        </XStack>
      </YStack>

      {/* Above the status message on purpose: when a filter empties the list, the way out
          stays right under the sentence that says it is empty. */}
      {exercises.length > 0 ? <FilterRail groups={railGroups} onClearAll={clearFilters} /> : null}

      <StatusMessage
        state={state}
        filteredCount={visible.length}
        onRetry={() => {
          load().catch(() => {
            // Error already handled in `load`.
          });
        }}
        onClearFilters={clearFilters}
      />

      {visible.length > 0 && (
        <LegendList
          data={visible}
          renderItem={renderItem}
          keyExtractor={exerciseKey}
          ItemSeparatorComponent={ListGap}
          recycleItems
          estimatedItemSize={76}
          contentContainerStyle={{
            paddingTop: 4,
            paddingBottom:
              Math.max(insets.bottom, Platform.OS === "android" ? ANDROID_MIN_BOTTOM_INSET : 0) +
              30,
          }}
        />
      )}
    </YStack>
  );
}
