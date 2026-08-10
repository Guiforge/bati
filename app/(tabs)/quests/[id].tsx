import { ChevronLeft, Dumbbell, Pencil, Sparkles } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";

import { NarrativeModal } from "@/components/adventures/NarrativeModal";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Tag } from "@/components/common/Tag";
import { useToast } from "@/components/common/Toast";
import { QuestConfigCard } from "@/components/quests/QuestConfigCard";
import { getExerciseAsset, getQuestAsset } from "@/constants/assetMap";
import { getQuestColorTokensFromQuest } from "@/constants/exerciseColors";
import {
  applyQuestConfig,
  Difficulty,
  estimateQuestSeconds,
  formatDuration,
  getQuestById,
  getQuestConfig,
  isUserQuest,
  type QuestConfig,
  saveQuestConfig,
} from "@/db";
import { getAdventureStepNarrative } from "@/db/adventures-narrative";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { MUSCLE_LABELS } from "@/db/muscles";
import { getCached } from "@/db/queryCache";
import type { Quest, Target } from "@/db/quests";
import type { DifficultyCode } from "@/db/schema";
import { computeSessionXp } from "@/db/xp";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

type LoadState =
  | { status: "loading"; quest: Quest | null }
  | { status: "ready"; quest: Quest }
  | { status: "error"; quest: Quest | null; message: string };

function resolveQuestImage(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getQuestAsset(path);
}

function resolveExerciseImage(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getExerciseAsset(path);
}

// "reps" reads fine in French too — see the "reps"/"config_reps" locale keys, which are
// the same word in both languages — so there is no per-language branch here.
function formatTarget(target: Target) {
  if (target.type === "time") return `${target.value}s`;
  return `${target.value} reps`;
}

function levelLabel(level: Difficulty, t: TFunction) {
  if (level === Difficulty.Easy) return t("quests.level_easy", "Easy");
  if (level === Difficulty.Hard) return t("quests.level_hard", "Hard");
  return t("quests.level_medium", "Medium");
}

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

  return (
    <AppButton
      onPress={() => onSelect(value)}
      fullWidth={false}
      height={40}
      // 40 is under the 44×44 floor. Vertical only: these sit in a row, and widening them
      // sideways would make neighbouring chips fight over the same pixels.
      hitSlop={{ top: 4, bottom: 4 }}
      px="$3"
      bg={active ? "$secondary" : "$surface"}
      borderColor={active ? "$secondary" : "$borderStrong"}
      borderWidth={1}
      rounded="$10"
      fontSize={14}
      pressStyle={{ opacity: 0.9 }}
    >
      <Text color="$text" fontWeight="700">
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
  const [narrative, setNarrative] = useState<string | null>(null);
  const [showNarrative, setShowNarrative] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

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
        const quest = await getQuestById(id, nextLevel);
        if (!quest) {
          setState({
            status: "error",
            quest: null,
            message: t("quests.not_found", "Quest not found"),
          });
          return;
        }
        setState({ status: "ready", quest });
      } catch (e) {
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
  // A level passed in the route (an adventure step picks one) outranks the remembered one.
  useFocusEffect(
    useCallback(() => {
      if (!questId) return;
      let cancelled = false;

      getQuestConfig(questId)
        .then((saved) => {
          if (cancelled) return;
          const next = saved ?? { level: initialLevel };
          setConfig(params.level ? { ...next, level: initialLevel } : next);
        })
        .catch(() => {
          // A missing or corrupt config just means "run the quest as written".
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
  const goToGallery = useCallback(() => {
    router.dismissTo("/quests");
  }, [router]);

  const updateConfig = useCallback(
    (next: QuestConfig) => {
      setConfig(next);
      if (questId == null) return;
      saveQuestConfig(questId, next).catch(() => {
        // Persisting is best-effort: the session still runs with what is on screen.
      });
    },
    [questId],
  );

  const selectLevel = useCallback(
    (nextLevel: Difficulty) => {
      updateConfig({ ...config, level: nextLevel });
    },
    [config, updateConfig],
  );

  const resetConfig = useCallback(() => {
    updateConfig({ level: config.level });
  }, [config.level, updateConfig]);

  // Everything below — the estimate, the XP preview, the session that gets started — reads the
  // configured quest, so the numbers on screen are the numbers that will run. Memoized: this
  // used to run in the render body, so any unrelated re-render rebuilt the whole quest object
  // and re-ran the color/duration/XP pipeline.
  const derived = useMemo(() => {
    if (!state.quest) return null;
    const quest = applyQuestConfig(state.quest, config);
    const estimatedSeconds = estimateQuestSeconds(quest);
    return {
      quest,
      questTitle: localizedTitle(quest, language),
      questDesc: language === "fr" ? quest.frDescription : quest.enDescription,
      questTokens: getQuestColorTokensFromQuest(quest),
      estimatedSeconds,
      estimate: formatDuration(estimatedSeconds, language),
      xpReward: computeSessionXp({
        durationSeconds: estimatedSeconds,
        userLevel: level as unknown as DifficultyCode,
      }),
    };
  }, [state.quest, config, language, level]);

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
            <Card bg="$surface">
              <XStack items="center" justify="space-between">
                <Text fontWeight="700" fontSize={16} color="$text">
                  {t("quests.loading", "Loading quest...")}
                </Text>
                <Text fontSize={24}>🧠</Text>
              </XStack>
            </Card>
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
                  <Tag
                    label={t("quests.rest", {
                      count: quest.restSeconds,
                      defaultValue: `Rest ${quest.restSeconds}s`,
                    })}
                  />
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
                      label={t("quests.reward_xp", {
                        count: xpReward,
                        defaultValue: `+${xpReward} XP`,
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
                        <Dumbbell size={24} color="$text" strokeWidth={2.5} />
                      </YStack>

                      <YStack flex={1} gap="$1">
                        <XStack items="center" justify="space-between" gap="$2">
                          <Text fontWeight="700" fontSize={17} color="$text" flex={1}>
                            {i + 1}. {exName}
                          </Text>
                          <Tag
                            label={formatTarget(qex.target)}
                            tone={qex.target.type === "time" ? "secondary" : "primary"}
                          />
                        </XStack>

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

      {quest ? (
        <YStack
          p="$4"
          pb={insets.bottom + 16}
          bg="$background"
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
