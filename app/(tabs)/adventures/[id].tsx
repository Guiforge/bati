import { eq } from "drizzle-orm";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Dimensions, Easing, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Spinner, Text, XStack, YStack } from "tamagui";
import { useDatabase } from "@/src/components/DatabaseProvider";
import { resolveImageAsset } from "@/src/constants/assetMap";
import { Difficulty, getQuestById, type Quest } from "@/src/db/quests";
import { adventures, quests } from "@/src/db/schema";
import { GameIcon, type GameIconName } from "@/src/hooks/useGameIcon";
import { useSessionStore } from "@/src/stores/session";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const HERO_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.5;

// ─────────────────────────────────────────────────────────────────────────────
// NEO DARK FANTASY UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Glassmorphism Card with subtle border glow */
function GlassCard({
  children,
  accentColor = "$primary",
  glowOpacity = 0.15,
  ...props
}: {
  children: React.ReactNode;
  accentColor?: string;
  glowOpacity?: number;
} & React.ComponentProps<typeof YStack>) {
  return (
    <YStack
      bg="rgba(16, 19, 34, 0.75)"
      borderWidth={1}
      borderColor="rgba(232, 236, 255, 0.12)"
      borderRadius="$4"
      overflow="hidden"
      {...props}
    >
      {children}
    </YStack>
  );
}

/** Section Header with decorative line */
function SectionHeader({ title }: { title: string }) {
  return (
    <XStack items="center" gap="$3" mb="$3">
      <YStack width={3} height={16} bg="$primary" borderRadius={2} />
      <Text
        fontSize={11}
        fontWeight="900"
        color="$textSecondary"
        letterSpacing={2}
        textTransform="uppercase"
      >
        {title}
      </Text>
      <YStack flex={1} height={1} bg="rgba(232, 236, 255, 0.08)" />
    </XStack>
  );
}

/** Reward Item with optional glow for rare items */
function RewardItem({
  icon,
  label,
  value,
  color = "$text",
  isRare = false,
}: {
  icon: GameIconName;
  label: string;
  value: string | number;
  color?: "$text" | "$primary" | "$error" | "$success" | "$warning" | "$gold";
  isRare?: boolean;
}) {
  // Use a type assertion for the dynamic color since Tamagui's types are strict
  const textColor = color as "$text";
  return (
    <XStack
      items="center"
      gap="$2"
      bg={isRare ? "rgba(255, 215, 0, 0.1)" : "rgba(16, 19, 34, 0.5)"}
      borderWidth={1}
      borderColor={isRare ? "$gold" : "rgba(232, 236, 255, 0.08)"}
      px="$3"
      py="$2"
      borderRadius="$3"
      {...(isRare && {
        shadowColor: "$gold",
        shadowRadius: 8,
        shadowOpacity: 0.3,
      })}
    >
      <GameIcon name={icon} size={18} tintColor={color} />
      <YStack>
        <Text fontSize={14} fontWeight="800" color={textColor}>
          {value}
        </Text>
        <Text fontSize={10} color="$textSecondary" opacity={0.7}>
          {label}
        </Text>
      </YStack>
    </XStack>
  );
}

/** Pulsing Glow Button Animation Hook */
function usePulsingGlow() {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return pulseAnim;
}

type Adventure = typeof adventures.$inferSelect & {
  quest: typeof quests.$inferSelect | null;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex component requires multiple checks
export default function AdventureDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { db } = useDatabase();
  const insets = useSafeAreaInsets();
  const startSession = useSessionStore((state) => state.startSession);
  const pulseAnim = usePulsingGlow(); // Must be called before any early returns

  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [userLevel] = useState<Difficulty>(Difficulty.Medium);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !id) return;

    const adventureId = Number.parseInt(id as string, 10);
    if (Number.isNaN(adventureId)) {
      setLoading(false);
      return;
    }

    const loadAdventure = async () => {
      try {
        const adventureData = await db
          .select({
            id: adventures.id,
            questId: adventures.questId,
            enTitle: adventures.enTitle,
            frTitle: adventures.frTitle,
            enDescription: adventures.enDescription,
            frDescription: adventures.frDescription,
            author: adventures.author,
            sortOrder: adventures.sortOrder,
            kind: adventures.kind,
            isActive: adventures.isActive,
            imagePath: adventures.imagePath,
            bossTotalHp: adventures.bossTotalHp,
            bossWeaknessMuscle: adventures.bossWeaknessMuscle,
            bossResistanceMuscle: adventures.bossResistanceMuscle,
            createdAt: adventures.createdAt,
            updatedAt: adventures.updatedAt,
            quest: quests,
          })
          .from(adventures)
          .leftJoin(quests, eq(adventures.questId, quests.id))
          .where(eq(adventures.id, adventureId))
          .get();

        setAdventure(adventureData || null);

        if (adventureData?.questId) {
          const questData = await getQuestById(adventureData.questId, userLevel);
          setQuest(questData);
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    loadAdventure();
  }, [db, id, userLevel]);

  const handleStartAdventure = async () => {
    if (!adventure || !quest) return;

    await startSession(quest, userLevel, { adventureId: adventure.id });
    router.push("/session/countdown");
  };

  if (loading) {
    return (
      <YStack flex={1} bg="$bgDark" alignItems="center" justifyContent="center">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  if (!adventure) {
    return (
      <YStack flex={1} bg="$bgDark" alignItems="center" justifyContent="center" p="$4">
        <GameIcon name="lorc/treasure-map" size={64} tintColor="$textSecondary" />
        <Text color="$text" fontSize={24} fontWeight="bold" mb="$2" mt="$4">
          {t("adventures.not_found")}
        </Text>
        <Text color="$textSecondary" fontSize="$4" mb="$4" textAlign="center">
          {t("adventures.invalid_id")}
        </Text>
        <Button onPress={() => router.back()} bg="$primary" borderRadius={1000} px="$6">
          {t("common.go_back")}
        </Button>
      </YStack>
    );
  }

  const title = i18n.language === "fr" ? adventure.frTitle : adventure.enTitle;
  const description = i18n.language === "fr" ? adventure.frDescription : adventure.enDescription;
  const isBoss = adventure.kind === "boss";
  const imageSource = resolveImageAsset(adventure.imagePath);
  const accentColor = isBoss ? "$error" : "$primary";

  // Mock rewards data (in production, this would come from the adventure/quest data)
  const rewards = {
    xp: isBoss ? 500 : 150,
    gold: isBoss ? 100 : 25,
    resources: adventure.quest?.primaryMuscle ? [adventure.quest.primaryMuscle] : [],
  };

  return (
    <YStack flex={1} bg="$bgDark">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            IMMERSIVE HERO SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        <YStack height={HERO_IMAGE_HEIGHT} position="relative">
          <Image
            source={imageSource}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
            }}
            contentFit="cover"
          />

          {/* Top Gradient for Navigation */}
          <LinearGradient
            colors={["rgba(11, 15, 25, 0.7)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.5 }}
            style={{ position: "absolute", width: "100%", height: 140 }}
          />

          {/* Bottom Gradient for Title Readability */}
          <LinearGradient
            colors={["transparent", "rgba(11, 15, 25, 0.85)", "rgba(11, 15, 25, 1)"]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "70%",
            }}
          />

          {/* Vignette Effect */}
          <LinearGradient
            colors={["rgba(11, 15, 25, 0.3)", "transparent", "rgba(11, 15, 25, 0.3)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: "absolute", width: "100%", height: "100%" }}
          />

          {/* Back Button - Glassmorphism */}
          <Pressable
            onPress={() => router.back()}
            style={{
              position: "absolute",
              top: insets.top + 12,
              left: 16,
              zIndex: 10,
            }}
          >
            <YStack
              bg="rgba(16, 19, 34, 0.75)"
              borderWidth={1}
              borderColor="rgba(232, 236, 255, 0.15)"
              borderRadius={1000}
              width={48}
              height={48}
              justify="center"
              items="center"
              pressStyle={{ opacity: 0.7, scale: 0.95 }}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }}
            >
              <GameIcon name="lorc/cycle" size={22} tintColor="$text" />
            </YStack>
          </Pressable>

          {/* Type Badge - Enhanced with Glow */}
          <YStack position="absolute" top={insets.top + 12} right={16}>
            <XStack
              bg={isBoss ? "rgba(220, 38, 38, 0.95)" : "rgba(13, 51, 242, 0.95)"}
              borderWidth={1}
              borderColor={isBoss ? "rgba(255, 100, 100, 0.3)" : "rgba(100, 150, 255, 0.3)"}
              borderRadius={1000}
              px="$3"
              py="$2"
              gap="$2"
              items="center"
              shadowColor={isBoss ? "$crimson" : "$primary"}
              shadowRadius={12}
              shadowOpacity={0.5}
            >
              <GameIcon
                name={isBoss ? "lorc/crowned-skull" : "lorc/treasure-map"}
                size={16}
                tintColor="white"
              />
              <Text fontSize={11} fontWeight="900" color="white" letterSpacing={1.5}>
                {isBoss
                  ? t("adventures.boss_fight", "BOSS FIGHT")
                  : t("adventures.campaign", "CAMPAIGN")}
              </Text>
            </XStack>
          </YStack>

          {/* Title Section with Gothic Style */}
          <YStack position="absolute" bottom={0} left={0} right={0} px="$5" pb="$4">
            <Text
              fontSize={36}
              fontWeight="900"
              color="$text"
              lineHeight={40}
              textShadowColor="rgba(0,0,0,0.8)"
              textShadowRadius={8}
              textShadowOffset={{ width: 0, height: 2 }}
              numberOfLines={3}
              style={{ letterSpacing: 0.5 }}
            >
              {title || t("adventures.untitled")}
            </Text>
          </YStack>
        </YStack>

        {/* ═══════════════════════════════════════════════════════════════════
            CONTENT SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        <YStack px="$5" gap="$6" mt="$4">
          {/* ─────────────────────────────────────────────────────────────────
              KEY INFO BADGES (Difficulty, Duration, Target Muscle)
          ───────────────────────────────────────────────────────────────── */}
          {adventure.quest && (
            <XStack gap="$3" flexWrap="wrap">
              {/* Difficulty Badge */}
              {adventure.quest.difficulty && (
                <XStack
                  bg={
                    adventure.quest.difficulty === "Beginner"
                      ? "rgba(22, 163, 74, 0.15)"
                      : adventure.quest.difficulty === "Intermediate"
                        ? "rgba(255, 107, 53, 0.15)"
                        : "rgba(220, 38, 38, 0.15)"
                  }
                  borderWidth={1}
                  borderColor={
                    adventure.quest.difficulty === "Beginner"
                      ? "$success"
                      : adventure.quest.difficulty === "Intermediate"
                        ? "$warning"
                        : "$error"
                  }
                  px="$3"
                  py="$2.5"
                  borderRadius={1000}
                  items="center"
                  gap="$2"
                >
                  <GameIcon
                    name={
                      adventure.quest.difficulty === "Beginner"
                        ? "lorc/checked-shield"
                        : adventure.quest.difficulty === "Intermediate"
                          ? "lorc/crossed-swords"
                          : "lorc/fire-silhouette"
                    }
                    size={16}
                    tintColor={
                      adventure.quest.difficulty === "Beginner"
                        ? "$success"
                        : adventure.quest.difficulty === "Intermediate"
                          ? "$warning"
                          : "$error"
                    }
                  />
                  <Text
                    color={
                      adventure.quest.difficulty === "Beginner"
                        ? "$success"
                        : adventure.quest.difficulty === "Intermediate"
                          ? "$warning"
                          : "$error"
                    }
                    fontSize={13}
                    fontWeight="800"
                  >
                    {t(`quests.difficulty_${adventure.quest.difficulty.toLowerCase()}`)}
                  </Text>
                </XStack>
              )}

              {/* Duration Badge */}
              {adventure.quest.estimatedMinutes && (
                <XStack
                  bg="rgba(16, 19, 34, 0.75)"
                  borderColor="rgba(232, 236, 255, 0.12)"
                  borderWidth={1}
                  px="$3"
                  py="$2.5"
                  borderRadius={1000}
                  items="center"
                  gap="$2"
                >
                  <GameIcon name="lorc/stopwatch" size={16} tintColor="$textSecondary" />
                  <Text color="$text" fontSize={13} fontWeight="700">
                    {adventure.quest.estimatedMinutes} min
                  </Text>
                </XStack>
              )}

              {/* Target Muscle Badge */}
              {adventure.quest.primaryMuscle && (
                <XStack
                  bg="rgba(13, 51, 242, 0.12)"
                  borderWidth={1}
                  borderColor="$primary"
                  px="$3"
                  py="$2.5"
                  borderRadius={1000}
                  items="center"
                  gap="$2"
                >
                  <GameIcon name="lorc/crossed-swords" size={16} tintColor="$primary" />
                  <Text color="$primary" fontSize={13} fontWeight="800">
                    {adventure.quest.primaryMuscle}
                  </Text>
                </XStack>
              )}
            </XStack>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              LORE / DESCRIPTION SECTION
          ───────────────────────────────────────────────────────────────── */}
          <GlassCard p="$4">
            <SectionHeader title={t("adventures.lore", "LORE")} />
            <Text
              color="$text"
              fontSize={15}
              lineHeight={26}
              opacity={0.9}
              style={{ letterSpacing: 0.2 }}
            >
              {description || t("adventures.no_description", "A mysterious adventure awaits...")}
            </Text>
          </GlassCard>

          {/* ─────────────────────────────────────────────────────────────────
              REWARDS SECTION
          ───────────────────────────────────────────────────────────────── */}
          <YStack gap="$3">
            <SectionHeader title={t("adventures.rewards", "REWARDS")} />
            <XStack gap="$3" flexWrap="wrap">
              <RewardItem
                icon="lorc/lightning-branches"
                label="XP"
                value={`+${rewards.xp}`}
                color="$primary"
              />
              <RewardItem
                icon="lorc/crown-coin"
                label={t("adventures.gold", "Gold")}
                value={`+${rewards.gold}`}
                color="$gold"
                isRare={isBoss}
              />
              {isBoss && (
                <RewardItem
                  icon="lorc/crowned-skull"
                  label={t("adventures.boss_token", "Boss Token")}
                  value="1"
                  color="$error"
                  isRare
                />
              )}
            </XStack>
          </YStack>

          {/* ─────────────────────────────────────────────────────────────────
              BOSS INFO CARD (Only for Boss Adventures)
          ───────────────────────────────────────────────────────────────── */}
          {isBoss && adventure.bossTotalHp && (
            <YStack
              bg="rgba(220, 38, 38, 0.08)"
              borderWidth={2}
              borderColor="$error"
              borderRadius="$4"
              p="$4"
              gap="$4"
              shadowColor="$crimson"
              shadowRadius={16}
              shadowOpacity={0.2}
            >
              <XStack items="center" gap="$4">
                <YStack
                  bg="$error"
                  width={56}
                  height={56}
                  borderRadius={1000}
                  justify="center"
                  items="center"
                  shadowColor="$error"
                  shadowRadius={16}
                  shadowOpacity={0.6}
                >
                  <GameIcon name="lorc/crowned-skull" size={28} tintColor="white" />
                </YStack>
                <YStack flex={1}>
                  <Text color="$text" fontSize={20} fontWeight="900">
                    {t("adventures.epic_battle", "Epic Battle")}
                  </Text>
                  <Text color="$error" fontSize={14} fontWeight="600">
                    {t("adventures.boss_hp", "{{hp}} HP", { hp: adventure.bossTotalHp })}
                  </Text>
                </YStack>
              </XStack>

              {/* Weakness/Resistance Info */}
              {(adventure.bossWeaknessMuscle || adventure.bossResistanceMuscle) && (
                <XStack gap="$3" flexWrap="wrap">
                  {adventure.bossWeaknessMuscle && (
                    <XStack
                      bg="rgba(22, 163, 74, 0.15)"
                      borderWidth={1}
                      borderColor="$success"
                      px="$3"
                      py="$2"
                      borderRadius="$3"
                      items="center"
                      gap="$2"
                    >
                      <GameIcon name="lorc/fire-silhouette" size={14} tintColor="$success" />
                      <Text color="$success" fontSize={12} fontWeight="700">
                        {t("adventures.weakness", "Weak to")}: {adventure.bossWeaknessMuscle}
                      </Text>
                    </XStack>
                  )}
                  {adventure.bossResistanceMuscle && (
                    <XStack
                      bg="rgba(255, 107, 53, 0.15)"
                      borderWidth={1}
                      borderColor="$warning"
                      px="$3"
                      py="$2"
                      borderRadius="$3"
                      items="center"
                      gap="$2"
                    >
                      <GameIcon name="lorc/checked-shield" size={14} tintColor="$warning" />
                      <Text color="$warning" fontSize={12} fontWeight="700">
                        {t("adventures.resistance", "Resists")}: {adventure.bossResistanceMuscle}
                      </Text>
                    </XStack>
                  )}
                </XStack>
              )}
            </YStack>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              QUEST SEQUENCE SECTION
          ───────────────────────────────────────────────────────────────── */}
          {adventure.quest && (
            <YStack gap="$3">
              <SectionHeader title={t("adventures.quest_sequence", "QUEST SEQUENCE")} />

              <GlassCard borderColor={accentColor} borderWidth={1} overflow="hidden">
                <XStack p="$4" items="center" gap="$4">
                  <YStack
                    bg={accentColor}
                    width={48}
                    height={48}
                    borderRadius={1000}
                    justify="center"
                    items="center"
                    shadowColor={accentColor}
                    shadowRadius={12}
                    shadowOpacity={0.4}
                  >
                    <Text color="white" fontSize={20} fontWeight="900">
                      1
                    </Text>
                  </YStack>
                  <YStack flex={1}>
                    <Text color="$text" fontSize={17} fontWeight="800">
                      {i18n.language === "fr" ? adventure.quest.frTitle : adventure.quest.enTitle}
                    </Text>
                    <Text color="$textSecondary" fontSize={13} mt="$1">
                      {quest?.exercises.length ?? 0} {t("quests.exercises", "exercises")}
                    </Text>
                  </YStack>
                  <GameIcon name="lorc/unlocking" size={24} tintColor="$success" />
                </XStack>
              </GlassCard>

              {/* Boss Battle Step */}
              {isBoss && (
                <GlassCard borderColor="$error" borderWidth={2} overflow="hidden">
                  <XStack p="$4" items="center" gap="$4">
                    <YStack
                      bg="$error"
                      width={48}
                      height={48}
                      borderRadius={1000}
                      justify="center"
                      items="center"
                      shadowColor="$error"
                      shadowRadius={12}
                      shadowOpacity={0.5}
                    >
                      <GameIcon name="lorc/crowned-skull" size={24} tintColor="white" />
                    </YStack>
                    <YStack flex={1}>
                      <Text color="$text" fontSize={17} fontWeight="800">
                        {t("adventures.boss_fight", "Boss Fight")}
                      </Text>
                      <Text color="$error" fontSize={13} mt="$1">
                        {adventure.bossTotalHp} HP
                      </Text>
                    </YStack>
                    <GameIcon name="lorc/locked-chest" size={24} tintColor="$textSecondary" />
                  </XStack>
                </GlassCard>
              )}
            </YStack>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              EXERCISES PREVIEW
          ───────────────────────────────────────────────────────────────── */}
          {quest && quest.exercises.length > 0 && (
            <YStack gap="$3">
              <SectionHeader
                title={`${t("quests.exercises_list", "EXERCISES")} (${quest.exercises.length})`}
              />

              {quest.exercises.map((qe, index) => {
                const exerciseName =
                  i18n.language === "fr" ? qe.exercise.frName : qe.exercise.enName;

                return (
                  <GlassCard key={qe.exercise.id} p="$3.5">
                    <XStack items="center" gap="$3">
                      <YStack
                        bg="rgba(13, 51, 242, 0.15)"
                        borderWidth={1}
                        borderColor="$primary"
                        width={36}
                        height={36}
                        borderRadius={1000}
                        justify="center"
                        items="center"
                      >
                        <Text color="$primary" fontSize={14} fontWeight="900">
                          {index + 1}
                        </Text>
                      </YStack>
                      <YStack flex={1}>
                        <Text color="$text" fontSize={15} fontWeight="700">
                          {exerciseName}
                        </Text>
                        <Text color="$textSecondary" fontSize={12} mt="$1">
                          {qe.target.type === "reps"
                            ? `${qe.target.value} ${t("session.reps", "reps")}`
                            : `${qe.target.value}s`}
                        </Text>
                      </YStack>
                      <GameIcon name="lorc/fire-silhouette" size={18} tintColor="$textSecondary" />
                    </XStack>
                  </GlassCard>
                );
              })}
            </YStack>
          )}
        </YStack>
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════
          FIXED BOTTOM CTA - START ADVENTURE
      ═══════════════════════════════════════════════════════════════════ */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        pb={insets.bottom + 20}
        pt="$4"
        px="$5"
      >
        {/* Gradient fade above button */}
        <LinearGradient
          colors={["transparent", "rgba(11, 15, 25, 0.9)", "rgba(11, 15, 25, 1)"]}
          locations={[0, 0.3, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: "absolute",
            top: -60,
            left: 0,
            right: 0,
            height: 80,
          }}
        />

        {/* Animated Glow Effect */}
        <Animated.View
          style={{
            position: "absolute",
            bottom: insets.bottom + 20,
            left: 20,
            right: 20,
            height: 56,
            borderRadius: 1000,
            backgroundColor: isBoss ? "rgba(220, 38, 38, 0.4)" : "rgba(13, 51, 242, 0.4)",
            opacity: pulseAnim,
            transform: [{ scale: 1.05 }],
          }}
        />

        <Button
          size="$5"
          height={56}
          bg={accentColor}
          color="white"
          fontWeight="900"
          fontSize={17}
          borderRadius={1000}
          onPress={handleStartAdventure}
          pressStyle={{ opacity: 0.9, scale: 0.98 }}
          borderWidth={1}
          borderColor={isBoss ? "rgba(255, 100, 100, 0.3)" : "rgba(100, 150, 255, 0.3)"}
          shadowColor={isBoss ? "$crimson" : "$primary"}
          shadowRadius={24}
          shadowOpacity={0.6}
          iconAfter={<GameIcon name="lorc/crossed-swords" size={20} tintColor="white" />}
        >
          {t("adventures.start_button", "BEGIN ADVENTURE")}
        </Button>
      </YStack>
    </YStack>
  );
}
