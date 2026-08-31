import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type ColorTokens, H2, Paragraph, Text, XStack, YStack } from "tamagui";
import { NarrativeModal } from "@/components/adventures/NarrativeModal";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { Tag } from "@/components/common/Tag";
import { useToast } from "@/components/common/Toast";
import { ChevronLeft, Dumbbell, Footprints, Pencil, Repeat, Sparkles } from "@/components/icons";
import { ExercisePickerSheet } from "@/components/quests/ExercisePickerSheet";
import { QuestConfigCard } from "@/components/quests/QuestConfigCard";
import { restsBetweenExercises } from "@/components/quests/questShape";
import { getExerciseThumb, getQuestAsset } from "@/constants/assetMap";
import { getQuestColorTokensFromQuest } from "@/constants/exerciseColors";
import { rankSwapCandidates, type SwapReason } from "@/constants/exerciseFilters";
import {
  applyQuestConfig,
  Difficulty,
  estimateQuestSeconds,
  estimateQuestXp,
  formatDurationEstimate,
  getQuestById,
  getQuestConfig,
  indexExercises,
  isUserQuest,
  type QuestConfig,
  saveQuestConfig,
} from "@/db";
import { getAdventureStepNarrative } from "@/db/adventures-narrative";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { formatDuration } from "@/db/estimate";
import { type Exercise, listExercises, pickableExercises } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import { preferences } from "@/db/preferences";
import { getCached } from "@/db/queryCache";
import type { Quest } from "@/db/quests";
import type { DifficultyCode, EquipmentCode } from "@/db/schema";
import { formatTarget, type Target } from "@/db/targets";
import { NON_REP_STYLE } from "@/db/workUnits";
import { localizedName, localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

type LoadState =
  | { status: "loading"; quest: Quest | null }
  | { status: "ready"; quest: Quest }
  | { status: "error"; quest: Quest | null; message: string };

/** No path means no cover — the header simply does not render. Every other form, bundled key or
 *  a hero's `data:` photo, `getQuestAsset` resolves. */
function resolveQuestImage(path?: string | null): ImageSourcePropType | null {
  return path ? getQuestAsset(path) : null;
}

function resolveExerciseImage(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getExerciseThumb(path);
}

/**
 * A target in the words the hero reads it in.
 *
 * `formatTarget` prints seconds raw, which is fine at plank length and unreadable past a minute:
 * an expedition asks for 900, and "900s" is not a number anybody converts. Time targets go
 * through `formatDuration`, the app's own exact form — "15 min" above the minute, still "30s"
 * below it, so nothing shorter than a round changes. Reps stay `formatTarget`'s job.
 */
function targetLabel(target: Target): string {
  return target.type === "time" ? formatDuration(target.value) : formatTarget(target);
}

/** Stable empty list, so the sheet's props do not change identity on every render. */
const EMPTY_CANDIDATES: ReturnType<typeof rankSwapCandidates> = [];

/**
 * Why a substitute is offered, in one line under the muscles — the slot `ExerciseRow` already
 * keeps for the catalogue's ladder marker. One caption, never a row of badges: a difficulty chip
 * and a progress bar per row were both refused on this component for the catalogue, and a wall of
 * labels would be no kinder here.
 */
function swapReasonLabel(reason: SwapReason | null | undefined, t: TFunction): string | null {
  if (reason === "easier") return t("quests.swap_reason_easier", "An easier rung");
  if (reason === "harder") return t("quests.swap_reason_harder", "A harder rung");
  if (reason === "same_pattern") return t("quests.swap_reason_pattern", "Same movement");
  if (reason === "same_family") return t("quests.swap_reason_family", "Same family");
  return null;
}

function levelLabel(level: Difficulty, t: TFunction) {
  if (level === Difficulty.Easy) return t("quests.level_easy", "Easy");
  if (level === Difficulty.Hard) return t("quests.level_hard", "Hard");
  return t("quests.level_medium", "Medium");
}

// The Journal's difficulty breakdown (components/journal/JournalStats.tsx, the `Chip` tones on
// its "Difficulty Split" card) is what a hero actually reads as "this colour means this level" —
// easy/success green, medium/primary violet, hard/secondary pink, with success alone keeping dark
// text (Task 7 moved primary and secondary to $white on contrast grounds; success was never
// flagged, so its $bgDark text stays). Matching it here, not `DIFFICULTY_COLOR_TOKENS`
// (constants/rawColors.ts), whose bar uses $error for hard — a second, undocumented mapping nested
// in the same Journal card that this task does not touch.
const LEVEL_CHIP_COLORS: Record<Difficulty, { bg: ColorTokens; text: ColorTokens }> = {
  [Difficulty.Easy]: { bg: "$success", text: "$bgDark" },
  [Difficulty.Medium]: { bg: "$primary", text: "$white" },
  [Difficulty.Hard]: { bg: "$secondary", text: "$white" },
};

function LevelChip({
  value,
  level,
  onSelect,
}: {
  value: Difficulty;
  level: Difficulty;
  onSelect: (value: Difficulty) => void;
}) {
  const { t } = useTranslation();
  const active = value === level;
  const colors = LEVEL_CHIP_COLORS[value];

  return (
    <AppButton
      onPress={() => onSelect(value)}
      fullWidth={false}
      height={40}
      // 40 is under the 44×44 floor. Vertical only: these sit in a row, and widening them
      // sideways would make neighbouring chips fight over the same pixels.
      hitSlop={{ top: 4, bottom: 4 }}
      px="$3"
      bg={active ? colors.bg : "$surface"}
      borderColor={active ? colors.bg : "$borderStrong"}
      borderWidth={1}
      rounded="$10"
      fontSize={14}
      pressStyle={{ opacity: 0.9 }}
    >
      <Text color={active ? colors.text : "$text"} fontWeight="700">
        {levelLabel(value, t)}
      </Text>
    </AppButton>
  );
}

// ponytail: 630-line screen — quest detail, boss preview, narrative gate and session start in
//           one component. Ceiling: every new branch is another path nobody can hold in their
//           head. Split the narrative gate out first if it grows again.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: see the ponytail note above
export default function QuestDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showError } = useToast();
  const params = useLocalSearchParams<{
    id?: string | string[];
    level?: string;
    runStepId?: string;
    adventureId?: string | string[];
  }>();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const { startSession } = useSessionStore();

  const questId = useMemo(() => {
    const raw = params.id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const runStepId = useMemo(() => {
    const raw = params.runStepId;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params.runStepId]);

  const initialLevel = useMemo((): Difficulty => {
    if (params.level === "easy") return Difficulty.Easy;
    if (params.level === "hard") return Difficulty.Hard;
    if (params.level === "medium") return Difficulty.Medium;
    return Difficulty.Medium;
  }, [params.level]);

  const [config, setConfig] = useState<QuestConfig>(() => ({ level: initialLevel }));
  const level = config.level;
  const [state, setState] = useState<LoadState>(() => {
    const cached = questId != null ? getCached<Quest>(`quest:${questId}:${initialLevel}`) : null;
    return cached ? { status: "ready", quest: cached } : { status: "loading", quest: null };
  });
  // The catalogue and the hero's kit: what a substitution picks from, and how it is ordered.
  // Loaded with the quest rather than in their own effect, so a swapped slot never paints its
  // original movement for a frame first.
  const [catalogue, setCatalogue] = useState<Exercise[]>([]);
  const [owned, setOwned] = useState<ReadonlySet<EquipmentCode> | null>(null);
  /** The `quest_exercises` row whose picker is open, if any. */
  const [swapFor, setSwapFor] = useState<number | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [showNarrative, setShowNarrative] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  // Whether the route's level has already been applied once. A route level (an adventure step
  // picks one) should win on the first load, but not re-win on every later refocus — opening an
  // exercise sheet and coming back must not snap a hero's own choice back to it.
  const routeLevelConsumed = useRef(false);

  // The screen stays mounted under the session; without this, coming back would leave
  // the start button stuck on "Starting…" forever.
  useFocusEffect(
    useCallback(() => {
      setIsStarting(false);
    }, []),
  );

  const load = useCallback(
    async (id: number, nextLevel: Difficulty) => {
      setState((s) => ({ status: "loading", quest: s.quest }));
      try {
        const [quest, exercises, ownedList] = await Promise.all([
          getQuestById(id, nextLevel),
          listExercises(),
          preferences.getOwnedEquipment(),
        ]);
        if (!quest) {
          setState({
            status: "error",
            quest: null,
            message: t("quests.not_found", "Quest not found"),
          });
          return;
        }
        setCatalogue(exercises);
        // null means the question was never answered — "allow everything", as everywhere else.
        setOwned(ownedList === null ? null : new Set(ownedList));
        setState({ status: "ready", quest });
      } catch (e) {
        reportError("quest.load", e);
        const message = e instanceof Error ? e.message : "Unknown error";
        setState((s) => ({ status: "error", quest: s.quest, message }));
      }
    },
    [t],
  );

  // On focus, not on mount: coming back from the editor must show the edited quest.
  useFocusEffect(
    useCallback(() => {
      if (!questId) return;
      load(questId, level).catch(() => {
        // Error already handled
      });
    }, [questId, level, load]),
  );

  // What the hero last set on this quest. Re-read on focus, not just on mount: editing a quest
  // you wrote drops its overrides, and the screen underneath must not keep showing them.
  // A level passed in the route (an adventure step picks one) outranks the remembered one — but
  // only the first time this screen focuses. The route's level wins once — after that the hero's
  // own choice is the saved truth.
  useFocusEffect(
    useCallback(() => {
      if (!questId) return;
      let cancelled = false;

      getQuestConfig(questId)
        .then((saved) => {
          if (cancelled) return;
          const next = saved ?? { level: initialLevel };
          const applyRouteLevel = Boolean(params.level) && !routeLevelConsumed.current;
          if (params.level) routeLevelConsumed.current = true;
          setConfig(applyRouteLevel ? { ...next, level: initialLevel } : next);
        })
        .catch((error) => {
          // A missing or corrupt config just means "run the quest as written" — but a corrupt
          // one silently discards the hero's saved rounds/rest/targets, so report it.
          reportError("quest.config", error);
        });

      return () => {
        cancelled = true;
      };
      // `level` is deliberately absent: it is written by this effect, and reading it back would
      // make the two focus effects chase each other.
    }, [questId, params.level, initialLevel]),
  );

  // Not router.back(): this screen is pushed from home, the journal and adventure steps as well
  // as from the gallery, so "back" used to land wherever you came from. A quest belongs to the
  // gallery, and dismissTo unwinds to it — it already sits at the bottom of this tab's stack.
  //
  // A quest opened from an adventure step is the exception: the hero thinks of the adventure as
  // "back", not a gallery they never visited. The chevron honors that richer intent; hardware
  // back still pops structurally to the gallery (anchored in 0b41d31) regardless of origin — the
  // asymmetry is deliberate, not a bug to unify. `navigate` is the honest expression of that intent
  // ("go to that screen", don't grow a stack) — it is not what stops duplicate adventure screens;
  // expo-router downgrades a cross-tab `push` to a `navigate` at the tab boundary regardless of
  // which call is used here, so `push` would behave identically. Not `dismissTo` either — the
  // adventure isn't on this tab's stack to begin with, it lives on the adventures tab's own stack.
  const goToGallery = useCallback(() => {
    const raw = Array.isArray(params.adventureId) ? params.adventureId[0] : params.adventureId;
    const adventureId = Number(raw);
    // A malformed deep link (literal "undefined", non-numeric garbage) is truthy but not a real
    // id — Number.isFinite catches it, same guard as questId/adventureId above in this file.
    if (raw && Number.isFinite(adventureId)) {
      router.navigate(`/adventures/${adventureId}` as never);
      return;
    }
    router.dismissTo("/quests");
  }, [router, params.adventureId]);

  const updateConfig = useCallback(
    (next: QuestConfig) => {
      setConfig(next);
      if (questId == null) return;
      saveQuestConfig(questId, next).catch((error) => {
        // Persisting is best-effort: the session still runs with what is on screen. But the
        // config card promises "it comes back next time" — a failed write breaks that promise,
        // so it must at least be reported.
        reportError("quest.saveConfig", error);
      });
    },
    [questId],
  );

  const selectLevel = useCallback(
    (nextLevel: Difficulty) => {
      // A value tuned at one level is not a value for another — 22 stepped at Hard is not what
      // Easy should serve, and a hold pinned by hand stops following the hero's record. Swaps
      // are about the movement, not the level, and stay.
      const { targets: _tuned, ...rest } = config;
      updateConfig({ ...rest, level: nextLevel });
    },
    [config, updateConfig],
  );

  const resetConfig = useCallback(() => {
    updateConfig({ level: config.level });
  }, [config.level, updateConfig]);

  const applySwap = useCallback(
    (questExerciseId: number, exercise: Exercise) => {
      // The target override goes with the movement it was tuned for: "20" carried from push-ups
      // onto a one-arm push-up is a bad prescription, and a swap is the hero saying this movement
      // is not right for them. Dropped here rather than in `applyQuestConfig`, which stays a pure
      // projection — `targets[id]` must never mean "a value for a movement no longer in this slot".
      const { [String(questExerciseId)]: _replaced, ...targets } = config.targets ?? {};

      updateConfig({
        ...config,
        targets,
        swaps: { ...config.swaps, [String(questExerciseId)]: exercise.id },
      });
      setSwapFor(null);
    },
    [config, updateConfig],
  );

  // Everything below — the estimate, the XP preview, the session that gets started — reads the
  // configured quest, so the numbers on screen are the numbers that will run. Memoized: this
  // used to run in the render body, so any unrelated re-render rebuilt the whole quest object
  // and re-ran the color/duration/XP pipeline.
  const derived = useMemo(() => {
    if (!state.quest) return null;
    const quest = applyQuestConfig(state.quest, config, indexExercises(catalogue));
    const estimatedSeconds = estimateQuestSeconds(quest);
    return {
      quest,
      questTitle: localizedTitle(quest, language),
      questDesc: language === "fr" ? quest.frDescription : quest.enDescription,
      questTokens: getQuestColorTokensFromQuest(quest),
      estimatedSeconds,
      estimate: formatDurationEstimate(estimatedSeconds),
      xpReward: estimateQuestXp(quest, level as unknown as DifficultyCode),
    };
  }, [state.quest, config, language, level, catalogue]);

  // The slot being replaced, and what can go in it. Ranked here rather than inside the sheet:
  // the sheet renders the order it is given, which is what lets the editor and this screen share
  // it without a mode flag.
  const swapSlot = derived?.quest.exercises.find((qex) => qex.id === swapFor) ?? null;
  // `pickableExercises` here and not on `catalogue`: the line above resolves the slot's current
  // movement by id, and a retired one still has to render as the thing you are replacing.
  const swapCandidates = swapSlot
    ? rankSwapCandidates(pickableExercises(catalogue), swapSlot.exercise, owned)
    : EMPTY_CANDIDATES;
  const swapReasons = new Map(swapCandidates.map((c) => [c.exercise.id, c.reason] as const));

  // Thumbnails resolved once per quest — resolveExerciseImage (a split+regex asset lookup)
  // used to run twice per thumb on every render: once to filter, once to display.
  const thumbsByExercise = useMemo(() => {
    const map = new Map<number, { key: string; source: ImageSourcePropType }[]>();
    for (const qex of derived?.quest.exercises ?? []) {
      const paths = Array.from(new Set([qex.exercise.imagePath, ...qex.images].filter(Boolean)));
      const thumbs: { key: string; source: ImageSourcePropType }[] = [];
      for (const p of paths) {
        // A handful of 42px tiles reads fine; past 4 it was a nested horizontal ScrollView.
        if (thumbs.length >= 4) break;
        const source = resolveExerciseImage(p);
        // Only keep thumbs that actually resolve to a real image; a row of
        // fallback-emoji tiles is noise, not content.
        if (source != null && typeof p === "string") thumbs.push({ key: p, source });
      }
      map.set(qex.id, thumbs);
    }
    return map;
  }, [derived]);

  if (!questId) {
    return (
      <YStack flex={1} bg="$background" justify="center" items="center" p="$6" gap="$3">
        <Text fontWeight="700" fontSize={18} color="$text">
          {t("quests.invalid_id", "Invalid quest")}
        </Text>
        <AppButton fullWidth={false} variant="secondary" onPress={goToGallery}>
          {t("quests.go_back", "Go back")}
        </AppButton>
      </YStack>
    );
  }

  const quest = derived?.quest ?? null;
  const questTitle = derived?.questTitle ?? "";
  const questDesc = derived?.questDesc ?? "";
  const questTokens = derived?.questTokens ?? null;
  const estimate = derived?.estimate ?? null;
  const xpReward = derived?.xpReward ?? null;

  const proceedToSession = async () => {
    // The isStarting guard is what stops a double-tap from starting two sessions while the
    // boss fight loads; it resets on the next focus (coming back from the session).
    if (!quest || isStarting) return;
    setIsStarting(true);

    try {
      // Awaited on purpose: startSession loads the boss fight and the warm-up preference before it
      // populates the store, and the session screen redirects home if it mounts on an empty one.
      await startSession(quest, level, { adventureRunStepId: runStepId });
      router.push("/session" as never);
    } catch (error) {
      setIsStarting(false);
      reportError("quest.startSession", error);
      showError(t("quests.start_error", "Could not start the quest"));
    }
  };

  const handleStart = async () => {
    if (!quest) return;

    if (runStepId) {
      try {
        const text = await getAdventureStepNarrative(runStepId, language);
        if (text) {
          setNarrative(text);
          setShowNarrative(true);
          return;
        }
      } catch (error) {
        // Deliberate fall-through: no narrative is a fine session, so the hero still trains.
        reportError("quest.introNarrative", error);
      }
    }

    await proceedToSession();
  };

  const headerImage = resolveQuestImage(quest?.imagePath);

  return (
    <YStack flex={1} bg="$background">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <YStack p="$5" pt={insets.top + 12} gap="$4">
          <XStack items="center" justify="space-between">
            <XStack items="center" gap="$3">
              <AppIconButton
                onPress={goToGallery}
                accessibilityRole="button"
                accessibilityLabel={t("quests.go_back", "Go back")}
              >
                <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
              </AppIconButton>

              <XStack items="center" gap="$2">
                <Sparkles size={18} color="$text" />
                <Text fontWeight="700" fontSize={20} color="$text">
                  {t("quests.details_title", "Quest")}
                </Text>
              </XStack>
            </XStack>

            <XStack items="center" gap="$2">
              {/* Says whose quest this is before the pencil implies it. Same word the gallery
                card and the movement rows wear. */}
              {quest && isUserQuest(quest) ? (
                <Tag label={t("common.hero_badge")} tone="primary" />
              ) : null}
              <Tag label={levelLabel(level, t)} tone="secondary" />
              {/* Only quests written in the app may be edited: seed content is shared. */}
              {quest && isUserQuest(quest) ? (
                <AppIconButton
                  onPress={() => router.push(`/quests/edit?id=${quest.id}` as never)}
                  accessibilityRole="button"
                  accessibilityLabel={t("quests.edit_quest", "Edit quest")}
                >
                  <Pencil size={18} color="$text" strokeWidth={2.5} />
                </AppIconButton>
              ) : null}
            </XStack>
          </XStack>

          {headerImage ? (
            <YStack
              width="100%"
              aspectRatio={16 / 9}
              bg={questTokens?.bg ?? "$surface"}
              borderWidth={1}
              borderColor="$borderStrong"
              rounded="$8"
              shadowColor="$shadowColor"
              shadowRadius={6}
              shadowOffset={{ width: 0, height: 3 }}
              overflow="hidden"
            >
              <Image
                source={headerImage}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={0}
              />
            </YStack>
          ) : null}

          {state.status === "error" ? (
            <Card bg="$surface">
              <YStack gap="$2">
                <Text fontWeight="700" fontSize={16} color="$text">
                  {t("quests.load_error", "Failed to load quest")}
                </Text>
                <Paragraph color="$textSecondary" size="$3">
                  {state.message}
                </Paragraph>
                <AppButton
                  fullWidth={false}
                  variant="secondary"
                  onPress={() => {
                    load(questId, level).catch(() => {
                      // Error already handled
                    });
                  }}
                >
                  {t("quests.retry", "Retry")} ↻
                </AppButton>
              </YStack>
            </Card>
          ) : null}

          {state.status === "loading" && !quest ? (
            // Hero image + title card + config card, held at height instead of popping in.
            <YStack gap="$4">
              <Skeleton height={200} radius={16} />
              <SkeletonCard>
                <Skeleton height={24} width="60%" />
                <Skeleton height={16} width="80%" />
                <Skeleton height={16} width="40%" />
              </SkeletonCard>
              <SkeletonCard>
                <Skeleton height={120} />
              </SkeletonCard>
            </YStack>
          ) : null}

          {quest ? (
            <Card bg={questTokens?.bg ?? "$surface"}>
              <YStack gap="$2">
                <H2 color="$text" fontWeight="700" fontSize={26}>
                  {questTitle}
                </H2>

                <Paragraph color="$textSecondary" size="$4" lineHeight={22}>
                  {questDesc}
                </Paragraph>

                <XStack gap="$2" flexWrap="wrap" pt="$2">
                  <Tag
                    label={t("quests.rounds", {
                      count: quest.rounds,
                      defaultValue: `${quest.rounds} rounds`,
                    })}
                  />
                  <Tag
                    label={t("quests.exercises", {
                      count: quest.exercises.length,
                      defaultValue: `${quest.exercises.length} exercises`,
                    })}
                    tone="primary"
                  />
                  {/* One movement means every gap is a round boundary, so this rest is never
                      taken — components/quests/questShape.ts. */}
                  {restsBetweenExercises(quest) ? (
                    <Tag
                      label={t("quests.rest", {
                        count: quest.restSeconds,
                        defaultValue: `Rest ${quest.restSeconds}s`,
                      })}
                    />
                  ) : null}
                  {estimate ? (
                    <Tag
                      label={t("quests.estimate", {
                        duration: estimate,
                        defaultValue: `≈ ${estimate}`,
                      })}
                      tone="secondary"
                    />
                  ) : null}
                  {xpReward != null ? (
                    <Tag
                      label={t("quests.reward_xp_estimate", {
                        count: xpReward,
                        defaultValue: `up to +${xpReward} XP`,
                      })}
                      tone="secondary"
                    />
                  ) : null}
                </XStack>

                <XStack gap="$2" flexWrap="wrap" pt="$2">
                  <Text fontWeight="700" color="$textSecondary">
                    {t("quests.level", "Level")}
                  </Text>
                  <LevelChip value={Difficulty.Easy} level={level} onSelect={selectLevel} />
                  <LevelChip value={Difficulty.Medium} level={level} onSelect={selectLevel} />
                  <LevelChip value={Difficulty.Hard} level={level} onSelect={selectLevel} />
                </XStack>
                {/* What the selected level actually does — the chips above already re-derive
                    every number, but nothing said so (2026-08 audit, §06-C). The multipliers are
                    USER_LEVEL_MULTIPLIER (targets) and computeSessionXp (payout). */}
                <Text fontSize={13} color="$textSecondary" pt="$1">
                  {level === Difficulty.Easy
                    ? t("quests.level_effect_easy", "Targets −25% · XP ×0.9")
                    : level === Difficulty.Hard
                      ? t("quests.level_effect_hard", "Targets +25% · XP ×1.2")
                      : t("quests.level_effect_medium", "Baseline targets · XP ×1")}
                </Text>
              </YStack>
            </Card>
          ) : null}

          {quest ? (
            <QuestConfigCard
              quest={quest}
              config={config}
              language={language}
              onChange={updateConfig}
              onReset={resetConfig}
              onSwap={setSwapFor}
            />
          ) : null}

          {quest ? (
            <YStack gap="$3">
              <Text fontWeight="700" fontSize={18} color="$text">
                {t("quests.exercises_list", "Exercises")}
              </Text>

              {/* ponytail: nested conditional rendering; extract a subcomponent when a fourth branch lands. */}
              {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: see the ponytail note above */}
              {quest.exercises.map((qex, i) => {
                const exName = language === "fr" ? qex.exercise.frName : qex.exercise.enName;
                const exDesc =
                  language === "fr" ? qex.exercise.frDescription : qex.exercise.enDescription;

                const thumbs = thumbsByExercise.get(qex.id) ?? [];

                return (
                  <Card
                    key={qex.id}
                    onPress={() => router.push(`/exercises/${qex.exercise.id}` as never)}
                  >
                    <XStack gap="$3" items="flex-start">
                      <YStack
                        width={52}
                        height={52}
                        rounded={26}
                        bg="$surface"
                        borderWidth={1}
                        borderColor="$borderStrong"
                        justify="center"
                        items="center"
                      >
                        {/* An outing is not a dumbbell. `Footprints` is already in
                            components/icons.ts, so this costs the bundle nothing. */}
                        {qex.exercise.style === NON_REP_STYLE ? (
                          <Footprints size={24} color="$text" strokeWidth={2.5} />
                        ) : (
                          <Dumbbell size={24} color="$text" strokeWidth={2.5} />
                        )}
                      </YStack>

                      <YStack flex={1} gap="$1">
                        <XStack items="center" justify="space-between" gap="$2">
                          <Text fontWeight="700" fontSize={17} color="$text" flex={1}>
                            {i + 1}. {exName}
                          </Text>
                          <Tag
                            label={targetLabel(qex.target)}
                            tone={qex.target.type === "time" ? "secondary" : "primary"}
                          />
                        </XStack>

                        {/* A slot the hero is not on the rung for is served easier (issue #33).
                          Said out loud, or the card disagrees with the quest for no visible
                          reason — and the movement it names stays one tap away through swap. */}
                        {qex.substitutedFor ? (
                          <Text fontSize={12} color="$textSecondary" fontFamily="$body">
                            {t("quests.served_easier_rung", {
                              name: localizedName(qex.substitutedFor, language),
                              defaultValue: `Working up to ${localizedName(qex.substitutedFor, language)}`,
                            })}
                          </Text>
                        ) : null}

                        {thumbs.length > 0 ? (
                          <XStack gap="$2" pt="$2" pb="$1">
                            {thumbs.map((thumb) => (
                              <YStack
                                key={thumb.key}
                                width={42}
                                height={42}
                                rounded={12}
                                overflow="hidden"
                                bg="$surface"
                                borderWidth={1}
                                borderColor="$borderStrong"
                              >
                                <Image
                                  source={thumb.source}
                                  style={{ width: "100%", height: "100%" }}
                                  contentFit="cover"
                                  transition={0}
                                />
                              </YStack>
                            ))}
                          </XStack>
                        ) : null}

                        <Paragraph color="$textSecondary" size="$3" numberOfLines={3}>
                          {exDesc}
                        </Paragraph>

                        <XStack gap="$2" flexWrap="wrap" pt="$2">
                          {/* What the hero did on this movement last time, in the slot's own unit.
                              Here rather than in the config card's steppers: that card is folded
                              shut by default, and this is the row the hero is already reading. */}
                          {qex.ghost ? (
                            <Tag
                              label={t("quests.ghost_last", {
                                value: targetLabel({
                                  type: qex.target.type,
                                  value: qex.ghost.last,
                                }),
                                defaultValue: `Last: ${qex.ghost.last}`,
                              })}
                              tone="secondary"
                            />
                          ) : null}
                          <Tag
                            label={
                              EQUIPMENT_LABELS[qex.exercise.equipment]?.[language] ??
                              qex.exercise.equipment
                            }
                          />
                          {qex.target.type === "reps" ? (
                            <Tag
                              label={t("quests.seconds_per_rep", {
                                count: qex.exercise.secondsPerRep,
                                defaultValue: `${qex.exercise.secondsPerRep}s/rep`,
                              })}
                              tone="secondary"
                            />
                          ) : null}
                          {qex.exercise.muscles.slice(0, 4).map((m) => (
                            <Tag key={m} label={MUSCLE_LABELS[m]?.[language] ?? m} />
                          ))}
                          {qex.exercise.muscles.length > 4 ? (
                            <Tag label={`+${qex.exercise.muscles.length - 4}`} />
                          ) : null}
                        </XStack>
                      </YStack>
                    </XStack>
                  </Card>
                );
              })}
            </YStack>
          ) : null}
        </YStack>
      </ScrollView>

      {/* Content scrolls edge-to-edge; this keeps the status bar readable over it. */}
      <YStack
        position="absolute"
        t={0}
        l={0}
        r={0}
        height={insets.top}
        bg="$bgDark"
        opacity={0.88}
        pointerEvents="none"
      />

      {quest ? (
        <YStack
          p="$4"
          pb={insets.bottom + 16}
          bg="$bgDark"
          borderTopWidth={1}
          borderColor="$borderStrong"
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
        >
          <AppButton
            testID="quest-start"
            height={60}
            variant="primary"
            pressStyle={{ opacity: 0.9 }}
            onPress={() => {
              handleStart().catch(() => {
                // Errors already surfaced via showError inside proceedToSession
              });
            }}
            disabled={isStarting}
            opacity={isStarting ? 0.6 : 1}
            rounded="$6"
          >
            <Text color="$text" fontSize={22} fontWeight="700">
              {isStarting
                ? t("quests.starting", "Starting…")
                : t("quests.start_button", "Start Quest")}
            </Text>
          </AppButton>
        </YStack>
      ) : null}

      {swapSlot ? (
        <ExercisePickerSheet
          exercises={swapCandidates.map((c) => c.exercise)}
          // The movement that is there now: the row wears the picker's "already picked" outline,
          // which reads correctly as "this is the one you have".
          pickedIds={[swapSlot.exercise.id]}
          language={language}
          open
          onOpenChange={(next) => {
            if (!next) setSwapFor(null);
          }}
          title={t("quests.swap_exercise", "Replace this movement")}
          onPick={(exercise) => applySwap(swapSlot.id, exercise)}
          closeOnPick
          pickAction={<Repeat size={20} color="$primaryText" strokeWidth={2.5} />}
          captionFor={(exercise) => swapReasonLabel(swapReasons.get(exercise.id), t)}
          bottomInset={insets.bottom}
        />
      ) : null}

      <NarrativeModal
        visible={showNarrative}
        title={questTitle}
        text={narrative ?? ""}
        onClose={() => {
          setShowNarrative(false);
          proceedToSession().catch(() => {
            // Non-blocking: the hero stays on the quest screen and can tap start again.
          });
        }}
        onDismiss={() => setShowNarrative(false)}
        type="intro"
      />
    </YStack>
  );
}
