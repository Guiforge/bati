import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type LayoutChangeEvent, Pressable, ScrollView } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type ColorTokens, Text, XStack, YStack } from "tamagui";

import { getQuestHistoryStats, type QuestHistoryStats } from "@/src/db/completed";
import type { ResourceLoot } from "@/src/db/resources";
import type { ResourceCode } from "@/src/db/schema";
import { calculateLevelFromXp, getLevelTitle, getXpForLevel } from "@/src/db/userLevel";
import { type GameIconName, useGameIcon } from "@/src/hooks/useGameIcon";
import { useHaptics } from "@/src/hooks/useHaptics";
import { formatTime } from "@/src/hooks/useSessionTimer";
import { useSettingsStore } from "@/src/stores/settings";

type RewardsManifestProps = {
  active?: boolean;
  questTitle: string;
  questId: number;
  durationSeconds: number;
  xpEarned: number;
  oldTotalXp: number;
  newTotalXp: number;
  loot: ResourceLoot;
  totalReps: number;
  totalSets: number;
  onContinue: () => void;
  onShare?: () => void;
};

const MIN_CONTINUE_MS = 1500;

const RESOURCE_ICON: Record<string, GameIconName> = {
  gold: "lorc/crown-coin",
  wood: "lorc/wood-axe",
  stone: "lorc/stone-block",
  fire: "lorc/campfire",
  water: "lorc/drop",
  wind: "lorc/feather",
  grain: "lorc/wheat",
  mana: "lorc/star-prominences",
  leaf: "lorc/open-book",
  boss_token: "lorc/crowned-skull",
};

const RESOURCE_COLOR: Record<string, ColorTokens> = {
  gold: "$gold",
  wood: "$resourceWood",
  stone: "$resourceStone",
  fire: "$resourceFire",
  water: "$resourceWater",
  wind: "$resourceWind",
  grain: "$resourceGrain",
  mana: "$resourceMana",
  leaf: "$resourceLeaf",
  boss_token: "$resourceBossToken",
};

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function getProgressPercent(totalXp: number) {
  const level = calculateLevelFromXp(totalXp);
  const start = getXpForLevel(level);
  const next = getXpForLevel(level + 1);
  const denom = Math.max(1, next - start);
  const within = totalXp - start;
  return {
    level,
    start,
    next,
    within,
    toNext: next - totalXp,
    percent: clamp01(within / denom) * 100,
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex reward animation orchestration with level-up effects
export function RewardsManifest({
  active = true,
  questTitle,
  questId,
  durationSeconds,
  xpEarned,
  oldTotalXp,
  newTotalXp,
  loot,
  totalReps,
  totalSets,
  onContinue,
  onShare,
}: RewardsManifestProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { GameIcon } = useGameIcon();
  const { impact } = useHaptics();
  const language = useSettingsStore((s) => s.language);

  const [canContinue, setCanContinue] = useState(false);
  const [history, setHistory] = useState<QuestHistoryStats | null>(null);

  // Load quest history for comparison
  useEffect(() => {
    if (questId > 0) {
      getQuestHistoryStats(questId)
        .then(setHistory)
        .catch(() => setHistory(null));
    }
  }, [questId]);

  const oldProg = useMemo(() => getProgressPercent(oldTotalXp), [oldTotalXp]);
  const newProg = useMemo(() => getProgressPercent(newTotalXp), [newTotalXp]);

  const levelTitle = useMemo(() => {
    const title = getLevelTitle(newProg.level);
    return title;
  }, [newProg.level]);

  const lootItems = useMemo(() => {
    const items: Array<{ resource: ResourceCode; amount: number }> = [];
    if (loot.gold > 0) items.push({ resource: "gold", amount: loot.gold });
    for (const m of loot.materials) items.push({ resource: m.resource, amount: m.amount });
    return items;
  }, [loot.gold, loot.materials]);

  const [trackWidth, setTrackWidth] = useState(0);
  const fillPx = useSharedValue(0);
  const levelFlash = useSharedValue(0);

  const hasLevelUp = newProg.level > oldProg.level;

  const didStartRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setCanContinue(false);
      return;
    }

    const id = setTimeout(() => setCanContinue(true), MIN_CONTINUE_MS);
    return () => clearTimeout(id);
  }, [active]);

  useEffect(() => {
    if (!active) {
      didStartRef.current = false;
      fillPx.value = 0;
      levelFlash.value = 0;
    }
  }, [active, fillPx, levelFlash]);

  useEffect(() => {
    if (!active) return;
    if (trackWidth <= 0) return;
    if (didStartRef.current) return;
    didStartRef.current = true;

    const oldPx = (trackWidth * oldProg.percent) / 100;
    const newPx = (trackWidth * newProg.percent) / 100;

    fillPx.value = oldPx;

    if (!hasLevelUp) {
      fillPx.value = withTiming(newPx, {
        duration: 1500,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    // Level up: fill to 100%, flash, then refill for the new level.
    fillPx.value = withTiming(trackWidth, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });

    levelFlash.value = withSequence(
      withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) })
    );

    // Strong thud when leveling.
    setTimeout(() => {
      impact();
    }, 900);

    setTimeout(() => {
      fillPx.value = 0;
      fillPx.value = withTiming(newPx, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
    }, 980);
  }, [
    active,
    fillPx,
    hasLevelUp,

    levelFlash,

    oldProg.percent,
    newProg.percent,
    trackWidth,
    impact,
  ]);

  useEffect(() => {
    if (lootItems.length === 0) return;

    // Staggered “clunk” feel.
    const ids: number[] = [];
    lootItems.forEach((_item, idx) => {
      ids.push(
        setTimeout(
          () => {
            impact();
          },
          420 + idx * 140
        ) as unknown as number
      );
    });

    return () => {
      for (const id of ids) {
        clearTimeout(id);
      }
    };
  }, [lootItems, impact]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(Math.max(0, Math.round(e.nativeEvent.layout.width)));
  };

  const fillStyle = useAnimatedStyle(() => {
    return {
      width: fillPx.value,
    };
  });

  const flashStyle = useAnimatedStyle(() => {
    return {
      opacity: levelFlash.value,
    };
  });

  return (
    <YStack fullscreen>
      <YStack flex={1} pt={insets.top + 8} pb={insets.bottom + 8}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, gap: 14 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <YStack items="center" gap="$1">
            <Text
              fontFamily="$heading"
              fontWeight="900"
              fontSize={24}
              letterSpacing={2}
              textTransform="uppercase"
              color="$text"
              textAlign="center"
            >
              {t("session.quest_complete")}
            </Text>
            <Text color="$textSecondary" fontSize={13} fontWeight="700" numberOfLines={1}>
              {questTitle}
            </Text>
          </YStack>

          {/* XP & Level */}
          <YStack
            bg="$glassBg"
            borderColor="$borderStrong"
            borderWidth={1}
            borderRadius="$4"
            p="$4"
            gap="$3"
          >
            <XStack justify="space-between" items="baseline">
              <Text fontFamily="$heading" fontWeight="900" fontSize={20} color="$text">
                {t("session.level_label", { level: newProg.level })}
              </Text>
              <Text fontFamily="$heading" fontWeight="900" fontSize={16} color="$gold">
                +{xpEarned} {t("common.xp")}
              </Text>
            </XStack>
            <Text color="$textSecondary" fontSize={12} fontWeight="700">
              {language === "fr" ? levelTitle.fr : levelTitle.en}
            </Text>

            <YStack gap="$2">
              <YStack
                onLayout={onTrackLayout}
                height={16}
                bg="$bgOverlay"
                borderRadius={999}
                overflow="hidden"
                borderWidth={1}
                borderColor="$borderStrong"
              >
                <Animated.View style={[{ height: 16 }, fillStyle]}>
                  <YStack height={16} width="100%" bg="$primary" />
                </Animated.View>
                <Animated.View style={[{ position: "absolute", inset: 0 }, flashStyle]}>
                  <YStack fullscreen bg="$gold" opacity={0.22} />
                </Animated.View>
              </YStack>
              <XStack justify="space-between" items="center">
                <Text color="$textSecondary" fontSize={12} fontWeight="700">
                  {t("common.xp")} {newProg.within} / {Math.max(0, newProg.next - newProg.start)}
                </Text>
                <Text color="$textSecondary" fontSize={12} fontWeight="700">
                  {Math.round(newProg.percent)}%
                </Text>
              </XStack>
            </YStack>
          </YStack>

          {/* Loot */}
          <YStack gap="$2">
            <Text
              fontFamily="$heading"
              fontWeight="900"
              fontSize={14}
              letterSpacing={3}
              textTransform="uppercase"
              color="$textSecondary"
              textAlign="center"
            >
              {t("session.loot_obtained")}
            </Text>

            <XStack flexWrap="wrap" gap="$3" justify="center">
              {lootItems.map((item) => {
                const icon = RESOURCE_ICON[item.resource] ?? "lorc/locked-chest";
                const color = RESOURCE_COLOR[item.resource] ?? "$text";
                return (
                  <YStack
                    key={`${item.resource}-${item.amount}`}
                    width="46%"
                    minW={150}
                    bg="$glassBg"
                    borderColor="$borderStrong"
                    borderWidth={1}
                    borderRadius="$4"
                    p="$4"
                    gap="$2"
                  >
                    <XStack items="center" gap="$3">
                      <YStack
                        width={40}
                        height={40}
                        borderRadius={999}
                        bg="$bgOverlay"
                        borderWidth={1}
                        borderColor="$borderStrong"
                        items="center"
                        justify="center"
                        shadowColor={color}
                        shadowOpacity={0.45}
                        shadowRadius={12}
                      >
                        <GameIcon name={icon} size={18} tintColor={color} />
                      </YStack>
                      <YStack flex={1}>
                        <Text fontFamily="$heading" fontWeight="900" fontSize={18} color={color}>
                          +{item.amount}
                        </Text>
                        <Text fontSize={12} fontWeight="700" color="$textSecondary">
                          {t(`resources.${item.resource}`)}
                        </Text>
                      </YStack>
                    </XStack>
                  </YStack>
                );
              })}
            </XStack>
          </YStack>

          {/* Stats Strip */}
          <YStack
            bg="$glassBg"
            borderColor="$borderStrong"
            borderWidth={1}
            borderRadius="$4"
            p="$4"
            gap="$3"
          >
            <Text
              fontFamily="$heading"
              fontWeight="900"
              fontSize={14}
              letterSpacing={3}
              textTransform="uppercase"
              color="$textSecondary"
              textAlign="center"
            >
              {t("session.session_stats")}
            </Text>

            {/* Row 1: Time, Sets, Reps */}
            <XStack justify="space-between" items="center">
              <YStack items="center" flex={1}>
                <Text fontFamily="$heading" fontWeight="900" fontSize={18} color="$text">
                  {formatTime(durationSeconds)}
                </Text>
                <Text
                  fontSize={11}
                  fontWeight="800"
                  color="$textSecondary"
                  textTransform="uppercase"
                >
                  {t("session.total_time")}
                </Text>
              </YStack>
              <YStack width={1} height={34} bg="$borderStrong" opacity={0.35} />
              <YStack items="center" flex={1}>
                <Text fontFamily="$heading" fontWeight="900" fontSize={18} color="$text">
                  {totalSets}
                </Text>
                <Text
                  fontSize={11}
                  fontWeight="800"
                  color="$textSecondary"
                  textTransform="uppercase"
                >
                  {t("session.sets")}
                </Text>
              </YStack>
              <YStack width={1} height={34} bg="$borderStrong" opacity={0.35} />
              <YStack items="center" flex={1}>
                <Text fontFamily="$heading" fontWeight="900" fontSize={18} color="$text">
                  {totalReps}
                </Text>
                <Text
                  fontSize={11}
                  fontWeight="800"
                  color="$textSecondary"
                  textTransform="uppercase"
                >
                  {t("session.reps")}
                </Text>
              </YStack>
            </XStack>

            {/* Row 2: XP, Avg/Set */}
            <XStack justify="space-between" items="center">
              <YStack items="center" flex={1}>
                <Text fontFamily="$heading" fontWeight="900" fontSize={18} color="$gold">
                  +{xpEarned}
                </Text>
                <Text
                  fontSize={11}
                  fontWeight="800"
                  color="$textSecondary"
                  textTransform="uppercase"
                >
                  {t("common.xp")}
                </Text>
              </YStack>
              <YStack width={1} height={34} bg="$borderStrong" opacity={0.35} />
              <YStack items="center" flex={1}>
                <Text fontFamily="$heading" fontWeight="900" fontSize={18} color="$text">
                  {totalSets > 0 ? formatTime(Math.round(durationSeconds / totalSets)) : "—"}
                </Text>
                <Text
                  fontSize={11}
                  fontWeight="800"
                  color="$textSecondary"
                  textTransform="uppercase"
                >
                  {t("session.avg_per_set")}
                </Text>
              </YStack>
              <YStack width={1} height={34} bg="$borderStrong" opacity={0.35} />
              <YStack items="center" flex={1}>
                <Text fontFamily="$heading" fontWeight="900" fontSize={18} color="$text">
                  {history ? history.timesCompleted + 1 : 1}
                </Text>
                <Text
                  fontSize={11}
                  fontWeight="800"
                  color="$textSecondary"
                  textTransform="uppercase"
                >
                  {t("session.times_done")}
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* History Comparison */}
          {history?.bestDurationSeconds && (
            <YStack
              bg="$glassBg"
              borderColor="$borderStrong"
              borderWidth={1}
              borderRadius="$4"
              p="$4"
              gap="$2"
            >
              <Text
                fontFamily="$heading"
                fontWeight="900"
                fontSize={12}
                letterSpacing={2}
                textTransform="uppercase"
                color="$textSecondary"
                textAlign="center"
              >
                {t("session.vs_previous")}
              </Text>
              <XStack justify="space-between" items="center" gap="$2">
                {/* Time comparison */}
                <YStack items="center" flex={1}>
                  <XStack items="center" gap="$1">
                    {durationSeconds < history.bestDurationSeconds ? (
                      <Text color="$success" fontSize={14} fontWeight="900">
                        🏆
                      </Text>
                    ) : durationSeconds <=
                      (history.avgDurationSeconds ?? history.bestDurationSeconds) ? (
                      <Text color="$primary" fontSize={14}>
                        ✓
                      </Text>
                    ) : (
                      <Text color="$textSecondary" fontSize={14}>
                        —
                      </Text>
                    )}
                    <Text
                      fontFamily="$body"
                      fontWeight="700"
                      fontSize={13}
                      color={durationSeconds < history.bestDurationSeconds ? "$success" : "$text"}
                    >
                      {formatTime(history.bestDurationSeconds)}
                    </Text>
                  </XStack>
                  <Text fontSize={10} color="$textSecondary">
                    {t("session.best_time")}
                  </Text>
                </YStack>

                <YStack width={1} height={28} bg="$borderStrong" opacity={0.25} />

                {/* XP comparison */}
                <YStack items="center" flex={1}>
                  <XStack items="center" gap="$1">
                    {xpEarned > history.bestXp ? (
                      <Text color="$gold" fontSize={14} fontWeight="900">
                        🏆
                      </Text>
                    ) : xpEarned >= history.avgXp ? (
                      <Text color="$primary" fontSize={14}>
                        ✓
                      </Text>
                    ) : (
                      <Text color="$textSecondary" fontSize={14}>
                        —
                      </Text>
                    )}
                    <Text
                      fontFamily="$body"
                      fontWeight="700"
                      fontSize={13}
                      color={xpEarned > history.bestXp ? "$gold" : "$text"}
                    >
                      {history.bestXp}
                    </Text>
                  </XStack>
                  <Text fontSize={10} color="$textSecondary">
                    {t("session.best_xp")}
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          )}

          {/* Footer Actions */}
          <XStack gap="$3" mt="auto" pt="$2">
            <YStack flex={1}>
              <Pressable
                onPress={onShare}
                disabled={!onShare}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <YStack
                  bg="$glassBg"
                  borderColor="$borderStrong"
                  borderWidth={1}
                  borderRadius={999}
                  py="$3"
                  items="center"
                  opacity={onShare ? 1 : 0.6}
                >
                  <Text fontFamily="$heading" fontWeight="900" color="$textSecondary">
                    {t("session.share")}
                  </Text>
                </YStack>
              </Pressable>
            </YStack>

            <YStack flex={1}>
              <Pressable
                onPress={canContinue ? onContinue : undefined}
                disabled={!canContinue}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  opacity: pressed && canContinue ? 0.9 : 1,
                  transform: [{ scale: pressed && canContinue ? 0.97 : 1 }],
                })}
              >
                <YStack
                  bg={canContinue ? "$primary" : "$bgOverlay"}
                  borderColor={canContinue ? "$primary" : "$borderStrong"}
                  borderWidth={1}
                  borderRadius={999}
                  py="$3"
                  items="center"
                  shadowColor={canContinue ? "$primaryGlow" : undefined}
                  shadowOpacity={canContinue ? 0.55 : 0}
                  shadowRadius={18}
                  opacity={canContinue ? 1 : 0.7}
                >
                  <Text
                    fontFamily="$heading"
                    fontWeight="900"
                    color={canContinue ? "$text" : "$textSecondary"}
                  >
                    {t("common.continue")}
                  </Text>
                </YStack>
              </Pressable>
            </YStack>
          </XStack>
        </ScrollView>
      </YStack>
    </YStack>
  );
}
