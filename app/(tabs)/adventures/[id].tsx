import { useDatabase } from "@/src/components/DatabaseProvider";
import { resolveImageAsset } from "@/src/constants/assetMap";
import {
  type AdventureDetails,
  type AdventureStepTemplate,
  getAdventureDetails,
} from "@/src/db/adventures";
import { Difficulty, getQuestById, type Quest } from "@/src/db/quests";
import { adventures, quests } from "@/src/db/schema";
import { GameIcon, type GameIconName } from "@/src/hooks/useGameIcon";
import { useSessionStore } from "@/src/stores/session";
import { eq } from "drizzle-orm";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Vibration } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Spinner, Text, XStack, YStack } from "tamagui";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & TYPES
// ─────────────────────────────────────────────────────────────────────────────
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.45;
const PARALLAX_FACTOR = 0.4;
const CARD_OVERLAP = 24;

type Adventure = typeof adventures.$inferSelect & {
  quest: typeof quests.$inferSelect | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// NEO DARK FANTASY UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Glassmorphism Adventure Card with subtle border glow */
function AdventureCard({
  children,
  accentColor = "$primary",
  ...props
}: {
  children: React.ReactNode;
  accentColor?: string;
} & React.ComponentProps<typeof YStack>) {
  return (
    <YStack
      bg="rgba(20, 20, 30, 0.92)"
      borderWidth={1}
      borderColor="rgba(110, 69, 226, 0.25)"
      borderRadius="$4"
      overflow="hidden"
      shadowColor="rgba(0, 0, 0, 0.4)"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={1}
      shadowRadius={12}
      {...props}
    >
      {children}
    </YStack>
  );
}

/** Section Header with decorative accent */
function SectionHeader({ title, icon }: { title: string; icon?: GameIconName }) {
  return (
    <XStack items="center" gap="$2" mb="$3">
      {icon && <GameIcon name={icon} size={16} tintColor="$primary" />}
      <Text
        fontSize={12}
        fontWeight="900"
        color="$textSecondary"
        letterSpacing={1.5}
        textTransform="uppercase"
      >
        {title}
      </Text>
      <YStack flex={1} height={1} bg="rgba(110, 69, 226, 0.2)" ml="$2" />
    </XStack>
  );
}

/** Expandable Text Component for Lore */
function ExpandableText({ text, maxLines = 4 }: { text: string; maxLines?: number }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);

  return (
    <YStack gap="$2">
      <Text
        color="$text"
        fontSize={14}
        lineHeight={22}
        opacity={0.9}
        numberOfLines={expanded ? undefined : maxLines}
        onTextLayout={(e) => {
          if (e.nativeEvent.lines.length > maxLines) {
            setNeedsExpansion(true);
          }
        }}
        style={{
          fontFamily: "NotoSans_400Regular",
          letterSpacing: 0.2,
        }}
      >
        {text}
      </Text>
      {needsExpansion && (
        <Pressable onPress={() => setExpanded(!expanded)}>
          <Text color="$primary" fontSize={13} fontWeight="700">
            {expanded ? t("common.show_less", "Show less") : t("common.show_more", "Show more")}
          </Text>
        </Pressable>
      )}
    </YStack>
  );
}

/** Quest Step Card for Adventure Sequence */
function QuestStepCard({
  step,
  stepNumber,
  totalSteps,
  isLast,
  language,
  onPress,
}: {
  step: AdventureStepTemplate;
  stepNumber: number;
  totalSteps: number;
  isLast: boolean;
  language: string;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const quest = step.quest;
  const title = language === "fr" ? quest.frTitle : quest.enTitle;
  const imagePath = quest.imagePath;
  const imageSource = resolveImageAsset(imagePath);

  // Get primary exercise image if no quest image
  const fallbackImage =
    quest.exercises.length > 0 && quest.exercises[0].images.length > 0
      ? resolveImageAsset(quest.exercises[0].images[0])
      : null;

  const displayImage = imageSource ?? fallbackImage;

  return (
    <YStack>
      {/* Quest Card */}
      <Button
        unstyled
        onPress={onPress}
        disabled={!onPress}
        pressStyle={{ opacity: 0.9, scale: 0.99 }}
      >
        <XStack
          bg="rgba(20, 20, 30, 0.9)"
          borderWidth={1}
          borderColor="rgba(110, 69, 226, 0.25)"
          borderRadius="$4"
          overflow="hidden"
          height={100}
        >
          {/* Quest Image */}
          <YStack width={100} height={100} bg="rgba(0, 0, 0, 0.3)">
            {displayImage ? (
              <Image
                source={displayImage}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <YStack flex={1} justify="center" items="center">
                <GameIcon name="lorc/crossed-swords" size={32} tintColor="$textSecondary" />
              </YStack>
            )}
            {/* Image overlay gradient */}
            <LinearGradient
              colors={["transparent", "rgba(0, 0, 0, 0.5)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: 30,
              }}
            />
          </YStack>

          {/* Quest Info */}
          <YStack flex={1} p="$3" justify="space-between">
            <YStack>
              {/* Step indicator */}
              <XStack items="center" gap="$1" mb="$1">
                <Text
                  fontSize={10}
                  fontWeight="900"
                  color="$primary"
                  letterSpacing={1}
                  textTransform="uppercase"
                >
                  {t("adventures.step_progress", {
                    current: stepNumber,
                    total: totalSteps,
                  })}
                </Text>
              </XStack>

              {/* Quest Title */}
              <Text
                color="$text"
                fontSize={14}
                fontWeight="700"
                numberOfLines={2}
                lineHeight={18}
                style={{ fontFamily: "SpaceGrotesk_700Bold" }}
              >
                {title}
              </Text>
            </YStack>

            {/* Quest Meta */}
            <XStack items="center" gap="$2">
              {quest.estimatedMinutes && (
                <XStack items="center" gap="$1">
                  <GameIcon name="lorc/stopwatch" size={12} tintColor="$textSecondary" />
                  <Text color="$textSecondary" fontSize={11}>
                    {quest.estimatedMinutes} min
                  </Text>
                </XStack>
              )}
              {quest.difficulty && (
                <XStack
                  bg={
                    quest.difficulty === "Beginner"
                      ? "rgba(22, 163, 74, 0.2)"
                      : quest.difficulty === "Intermediate"
                        ? "rgba(255, 152, 0, 0.2)"
                        : "rgba(244, 67, 54, 0.2)"
                  }
                  px="$1.5"
                  py="$0.5"
                  borderRadius="$1"
                >
                  <Text
                    fontSize={9}
                    fontWeight="700"
                    color={
                      quest.difficulty === "Beginner"
                        ? "#4ADE80"
                        : quest.difficulty === "Intermediate"
                          ? "#FFB74D"
                          : "#EF5350"
                    }
                    textTransform="uppercase"
                  >
                    {quest.difficulty}
                  </Text>
                </XStack>
              )}
              {quest.exercises.length > 0 && (
                <Text color="$textSecondary" fontSize={11}>
                  {quest.exercises.length} {t("adventures.exercises_short")}
                </Text>
              )}
            </XStack>
          </YStack>

          {/* Step Number Badge */}
          <YStack
            position="absolute"
            top={-1}
            left={-1}
            bg="$primary"
            width={28}
            height={28}
            borderBottomRightRadius={12}
            justify="center"
            items="center"
            shadowColor="$primary"
            shadowRadius={8}
            shadowOpacity={0.5}
          >
            <Text
              color="white"
              fontSize={12}
              fontWeight="900"
              style={{ fontFamily: "SpaceGrotesk_700Bold" }}
            >
              {stepNumber}
            </Text>
          </YStack>
        </XStack>
      </Button>

      {/* Connection Line to Next Step */}
      {!isLast && (
        <YStack items="center" height={24}>
          <YStack width={2} flex={1} bg="rgba(110, 69, 226, 0.4)" borderRadius={1} />
          <GameIcon name="lorc/arrow-dunk" size={14} tintColor="$primary" />
        </YStack>
      )}
    </YStack>
  );
}

/** Reward Badge Component */
function RewardBadge({
  icon,
  label,
  value,
  color = "$primary",
  isRare = false,
}: {
  icon: GameIconName;
  label: string;
  value: string | number;
  color?: "$text" | "$primary" | "$error" | "$success" | "$warning" | "$gold";
  isRare?: boolean;
}) {
  return (
    <XStack
      items="center"
      gap="$2"
      bg={isRare ? "rgba(255, 215, 0, 0.12)" : "rgba(110, 69, 226, 0.1)"}
      borderWidth={1}
      borderColor={isRare ? "$gold" : "rgba(110, 69, 226, 0.3)"}
      px="$3"
      py="$2.5"
      borderRadius="$3"
      {...(isRare && {
        shadowColor: "$gold",
        shadowRadius: 10,
        shadowOpacity: 0.25,
      })}
    >
      <GameIcon name={icon} size={20} tintColor={color} />
      <YStack>
        <Text
          fontSize={15}
          fontWeight="800"
          color={color as "$text"}
          style={{ fontFamily: "SpaceGrotesk_700Bold" }}
        >
          {value}
        </Text>
        <Text fontSize={10} color="$textSecondary" opacity={0.8}>
          {label}
        </Text>
      </YStack>
    </XStack>
  );
}

/** Difficulty Badge */
function DifficultyBadge({
  difficulty,
  top = 16,
  right = 16,
}: {
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  top?: number;
  right?: number;
}) {
  const { t } = useTranslation();

  const config = {
    Beginner: {
      bg: "rgba(22, 163, 74, 0.15)",
      border: "#16A34A",
      text: "#4ADE80",
    },
    Intermediate: {
      bg: "rgba(255, 152, 0, 0.15)",
      border: "#FF9800",
      text: "#FFB74D",
    },
    Advanced: {
      bg: "rgba(244, 67, 54, 0.15)",
      border: "#F44336",
      text: "#EF5350",
    },
  };

  const cfg = config[difficulty];

  return (
    <XStack
      position="absolute"
      top={top}
      right={right}
      borderWidth={1}
      borderRadius={12}
      px="$3"
      py="$1.5"
      zIndex={10}
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      <Text
        fontSize={11}
        fontWeight="900"
        letterSpacing={0.5}
        textTransform="uppercase"
        style={{ color: cfg.text }}
      >
        {t(`quests.difficulty_${difficulty.toLowerCase()}`)}
      </Text>
    </XStack>
  );
}

/** Confirmation Modal */
function ConfirmationModal({
  visible,
  onConfirm,
  onCancel,
  title,
  exercises,
  isBoss,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  exercises: { name: string; target: string }[];
  isBoss: boolean;
}) {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 15,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.95);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: "rgba(10, 10, 18, 0.9)",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          opacity: opacityAnim,
        },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onCancel} />
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          width: SCREEN_WIDTH - 48,
          maxWidth: 400,
        }}
      >
        <LinearGradient
          colors={["#0A0A12", "#12121A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            borderRadius: 20,
            padding: 24,
            borderWidth: 1,
            borderColor: isBoss ? "rgba(244, 67, 54, 0.3)" : "rgba(110, 69, 226, 0.3)",
          }}
        >
          <XStack items="center" gap="$3" mb="$4">
            <GameIcon
              name={isBoss ? "lorc/crowned-skull" : "lorc/crossed-swords"}
              size={32}
              tintColor={isBoss ? "$error" : "$primary"}
            />
            <Text
              color="$text"
              fontSize={20}
              fontWeight="900"
              style={{ fontFamily: "SpaceGrotesk_700Bold" }}
            >
              {t("adventures.ready_title", "Ready for Adventure?")}
            </Text>
          </XStack>

          <Text color="$textSecondary" fontSize={14} mb="$4">
            {t("adventures.ready_subtitle", "You're about to embark on:")}
          </Text>

          <YStack bg="rgba(0, 0, 0, 0.3)" borderRadius="$3" p="$3" mb="$4" gap="$2">
            <Text color="$text" fontSize={16} fontWeight="700" mb="$2">
              {title}
            </Text>
            {exercises.slice(0, 3).map((ex) => (
              <XStack key={`${ex.name}-${ex.target}`} items="center" gap="$2">
                <Text color="$primary" fontSize={12}>
                  •
                </Text>
                <Text color="$textSecondary" fontSize={13}>
                  {ex.name} — {ex.target}
                </Text>
              </XStack>
            ))}
            {exercises.length > 3 && (
              <Text color="$textSecondary" fontSize={12} opacity={0.7}>
                +{exercises.length - 3} {t("adventures.more_exercises", "more exercises")}
              </Text>
            )}
          </YStack>

          <YStack gap="$3">
            <Button
              size="$5"
              height={56}
              bg={isBoss ? "$error" : "$primary"}
              color="white"
              fontWeight="900"
              fontSize={16}
              borderRadius={28}
              onPress={() => {
                Vibration.vibrate(10);
                onConfirm();
              }}
              pressStyle={{ opacity: 0.9, scale: 0.98 }}
              shadowColor={isBoss ? "$crimson" : "$primary"}
              shadowRadius={16}
              shadowOpacity={0.5}
            >
              {t("adventures.start_now", "START NOW")}
            </Button>

            <Button
              size="$4"
              height={48}
              bg="transparent"
              borderWidth={1}
              borderColor="rgba(110, 69, 226, 0.4)"
              color="$textSecondary"
              fontWeight="600"
              fontSize={15}
              borderRadius={24}
              onPress={onCancel}
              pressStyle={{ opacity: 0.7 }}
            >
              {t("common.cancel", "Cancel")}
            </Button>
          </YStack>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex component requires multiple checks
export default function AdventureDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { db } = useDatabase();
  const insets = useSafeAreaInsets();
  const startSession = useSessionStore((state) => state.startSession);

  // State
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [adventureDetails, setAdventureDetails] = useState<AdventureDetails | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [userLevel] = useState<Difficulty>(Difficulty.Medium);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  // Parallax effect
  const imageTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, HERO_IMAGE_HEIGHT],
    outputRange: [-50, 0, HERO_IMAGE_HEIGHT * PARALLAX_FACTOR],
    extrapolate: "clamp",
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: "clamp",
  });

  // Pulsing glow effect
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Load adventure data
  useEffect(() => {
    if (!db || !id) return;

    const adventureId = Number.parseInt(id as string, 10);
    if (Number.isNaN(adventureId)) {
      setLoading(false);
      return;
    }

    const loadAdventure = async () => {
      try {
        // Load basic adventure data
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

        // Load adventure details with all steps
        const details = await getAdventureDetails(adventureId);
        setAdventureDetails(details);

        const startQuestId = details?.steps?.[0]?.questId ?? adventureData?.questId;
        if (startQuestId) {
          const questData = await getQuestById(startQuestId, userLevel);
          setQuest(questData);
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    loadAdventure();
  }, [db, id, userLevel]);

  const handleGoBack = useCallback(() => {
    Vibration.vibrate(5);
    const canGoBack = (router as unknown as { canGoBack?: () => boolean }).canGoBack?.() ?? false;
    if (canGoBack) {
      router.back();
      return;
    }
    const dismiss = (router as unknown as { dismiss?: () => void }).dismiss;
    if (typeof dismiss === "function") {
      dismiss();
      return;
    }
    router.replace("/(tabs)/adventures");
  }, [router]);

  const handleStartAdventure = useCallback(async () => {
    if (!adventure || !quest) return;
    setShowConfirmModal(false);
    await startSession(quest, userLevel, { adventureId: adventure.id });
    router.push("/session/countdown");
  }, [adventure, quest, userLevel, startSession, router]);

  const handleShowConfirmation = useCallback(() => {
    Vibration.vibrate(10);
    setShowConfirmModal(true);
  }, []);

  // Loading state
  if (loading) {
    return (
      <YStack flex={1} bg="$bgDark" items="center" justify="center">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  // Not found state
  if (!adventure) {
    return (
      <YStack flex={1} bg="$bgDark" items="center" justify="center" p="$4">
        <GameIcon name="lorc/treasure-map" size={64} tintColor="$textSecondary" />
        <Text color="$text" fontSize={24} fontWeight="bold" mb="$2" mt="$4">
          {t("adventures.not_found")}
        </Text>
        <Text color="$textSecondary" fontSize="$4" mb="$4" textAlign="center">
          {t("adventures.invalid_id")}
        </Text>
        <Button onPress={handleGoBack} bg="$primary" borderRadius={1000} px="$6">
          {t("common.go_back")}
        </Button>
      </YStack>
    );
  }

  // Derived values
  const title = i18n.language === "fr" ? adventure.frTitle : adventure.enTitle;
  const description = i18n.language === "fr" ? adventure.frDescription : adventure.enDescription;
  const isBoss = adventure.kind === "boss";
  const imageSource = resolveImageAsset(adventure.imagePath);
  const accentColor = isBoss ? "$error" : "$primary";

  // Rewards
  const rewards = {
    xp: isBoss ? 500 : 150,
    gold: isBoss ? 100 : 25,
  };

  // Exercise list for modal
  const exerciseList =
    quest?.exercises.map((qe) => ({
      name: i18n.language === "fr" ? qe.exercise.frName : qe.exercise.enName,
      target: qe.target.type === "reps" ? `${qe.target.value} reps` : `${qe.target.value}s`,
    })) || [];

  return (
    <YStack flex={1} bg="$bgDark">
      {/* ═══════════════════════════════════════════════════════════════════
          SCROLLABLE CONTENT WITH PARALLAX
      ═══════════════════════════════════════════════════════════════════ */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
      >
        {/* ─────────────────────────────────────────────────────────────────
            HERO IMAGE WITH PARALLAX
        ───────────────────────────────────────────────────────────────── */}
        <YStack height={HERO_IMAGE_HEIGHT} overflow="hidden">
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: HERO_IMAGE_HEIGHT + 100,
              transform: [{ translateY: imageTranslateY }, { scale: imageScale }],
            }}
          >
            <Image
              source={imageSource}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </Animated.View>

          {/* Top Gradient for Navigation */}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(10, 10, 18, 0.8)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.6 }}
            style={{ position: "absolute", width: "100%", height: 140 }}
          />

          {/* Bottom Gradient for Content */}
          <LinearGradient
            pointerEvents="none"
            colors={["transparent", "rgba(10, 10, 18, 0.7)", "rgba(10, 10, 18, 1)"]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "60%",
            }}
          />

          {/* Edge glow effect */}
          <YStack
            pointerEvents="none"
            position="absolute"
            left={0}
            right={0}
            bottom={0}
            height={2}
            bg="rgba(110, 69, 226, 0.5)"
            shadowColor="$primary"
            shadowRadius={20}
            shadowOpacity={0.3}
          />

          {/* ─────────────────────────────────────────────────────────────────
              BACK BUTTON - Enhanced Visibility
          ───────────────────────────────────────────────────────────────── */}
          <Button
            unstyled
            onPress={handleGoBack}
            accessibilityRole="button"
            accessibilityLabel={t("common.go_back")}
            position="absolute"
            top={insets.top + 12}
            left={16}
            zIndex={50}
            width={44}
            height={44}
            borderRadius={1000}
            bg="rgba(0, 0, 0, 0.55)"
            borderWidth={1}
            borderColor="rgba(255, 255, 255, 0.15)"
            justify="center"
            items="center"
            pressStyle={{ opacity: 0.7, scale: 0.95 }}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <GameIcon name="lorc/return-arrow" size={20} tintColor="white" />
          </Button>

          {/* ─────────────────────────────────────────────────────────────────
              DIFFICULTY BADGE (Top Right)
          ───────────────────────────────────────────────────────────────── */}
          {adventure.quest?.difficulty && (
            <DifficultyBadge
              difficulty={adventure.quest.difficulty as "Beginner" | "Intermediate" | "Advanced"}
              top={insets.top + 12}
            />
          )}

          {/* ─────────────────────────────────────────────────────────────────
              TITLE SECTION (Bottom of Hero)
          ───────────────────────────────────────────────────────────────── */}
          <YStack position="absolute" bottom={CARD_OVERLAP + 16} left={0} right={0} px="$5">
            {/* Type Badge */}
            <XStack
              bg={isBoss ? "rgba(244, 67, 54, 0.9)" : "rgba(110, 69, 226, 0.9)"}
              borderRadius={1000}
              px="$3"
              py="$1.5"
              alignSelf="flex-start"
              mb="$2"
              gap="$2"
              items="center"
            >
              <GameIcon
                name={isBoss ? "lorc/crowned-skull" : "lorc/treasure-map"}
                size={14}
                tintColor="white"
              />
              <Text
                fontSize={10}
                fontWeight="900"
                color="white"
                letterSpacing={1}
                textTransform="uppercase"
              >
                {isBoss
                  ? t("adventures.boss_fight", "BOSS FIGHT")
                  : t("adventures.campaign", "ADVENTURE")}
              </Text>
            </XStack>

            {/* Title */}
            <Text
              fontSize={28}
              fontWeight="900"
              color="$text"
              lineHeight={34}
              numberOfLines={2}
              textShadowColor="rgba(0, 0, 0, 0.8)"
              textShadowRadius={12}
              textShadowOffset={{ width: 0, height: 2 }}
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                letterSpacing: 0.3,
              }}
            >
              {title || t("adventures.untitled")}
            </Text>

            {/* Subtitle with Duration & Muscle */}
            {adventure.quest && (
              <XStack items="center" gap="$2" mt="$2" opacity={0.85}>
                {adventure.quest.estimatedMinutes && (
                  <>
                    <GameIcon name="lorc/stopwatch" size={14} tintColor="$textSecondary" />
                    <Text color="$textSecondary" fontSize={13} fontStyle="italic">
                      {adventure.quest.estimatedMinutes} min
                    </Text>
                  </>
                )}
                {adventure.quest.primaryMuscle && (
                  <>
                    <Text color="$textSecondary" fontSize={13}>
                      •
                    </Text>
                    <Text color="$textSecondary" fontSize={13} fontStyle="italic">
                      {adventure.quest.primaryMuscle}
                    </Text>
                  </>
                )}
              </XStack>
            )}
          </YStack>
        </YStack>

        {/* ═══════════════════════════════════════════════════════════════════
            MAIN ADVENTURE CARD (Overlaps Hero)
        ═══════════════════════════════════════════════════════════════════ */}
        <YStack px="$4" mt={-CARD_OVERLAP}>
          <AdventureCard p="$5" accentColor={accentColor}>
            {/* ─────────────────────────────────────────────────────────────────
                LORE SECTION
            ───────────────────────────────────────────────────────────────── */}
            <SectionHeader title={t("adventures.lore", "LORE")} icon="lorc/scroll-unfurled" />
            <ExpandableText
              text={
                description || t("adventures.no_description", "A mysterious adventure awaits...")
              }
            />

            {/* ─────────────────────────────────────────────────────────────────
                DURATION & REWARDS
            ───────────────────────────────────────────────────────────────── */}
            <YStack mt="$5" gap="$3">
              <SectionHeader title={t("adventures.rewards", "REWARDS")} icon="lorc/trophy" />
              <XStack gap="$3" flexWrap="wrap">
                <RewardBadge
                  icon="lorc/lightning-branches"
                  label="XP"
                  value={`+${rewards.xp}`}
                  color="$primary"
                />
                <RewardBadge
                  icon="lorc/crown-coin"
                  label={t("adventures.gold", "Gold")}
                  value={`+${rewards.gold}`}
                  color="$gold"
                  isRare={isBoss}
                />
                {isBoss && (
                  <RewardBadge
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
                BOSS INFO (if applicable)
            ───────────────────────────────────────────────────────────────── */}
            {isBoss && adventure.bossTotalHp && (
              <YStack
                mt="$5"
                bg="rgba(244, 67, 54, 0.1)"
                borderWidth={1}
                borderColor="$error"
                borderRadius="$3"
                p="$4"
                gap="$3"
              >
                <XStack items="center" gap="$3">
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
                  <YStack>
                    <Text
                      color="$text"
                      fontSize={18}
                      fontWeight="900"
                      style={{ fontFamily: "SpaceGrotesk_700Bold" }}
                    >
                      {t("adventures.epic_battle", "Epic Battle")}
                    </Text>
                    <Text color="$error" fontSize={14} fontWeight="600">
                      {adventure.bossTotalHp} HP
                    </Text>
                  </YStack>
                </XStack>

                {(adventure.bossWeaknessMuscle || adventure.bossResistanceMuscle) && (
                  <XStack gap="$2" flexWrap="wrap">
                    {adventure.bossWeaknessMuscle && (
                      <XStack
                        bg="rgba(22, 163, 74, 0.15)"
                        borderWidth={1}
                        borderColor="$success"
                        px="$2"
                        py="$1"
                        borderRadius="$2"
                        items="center"
                        gap="$1"
                      >
                        <GameIcon name="lorc/fire-silhouette" size={12} tintColor="$success" />
                        <Text color="$success" fontSize={11} fontWeight="700">
                          {t("adventures.weakness", "Weak")}: {adventure.bossWeaknessMuscle}
                        </Text>
                      </XStack>
                    )}
                    {adventure.bossResistanceMuscle && (
                      <XStack
                        bg="rgba(255, 152, 0, 0.15)"
                        borderWidth={1}
                        borderColor="$warning"
                        px="$2"
                        py="$1"
                        borderRadius="$2"
                        items="center"
                        gap="$1"
                      >
                        <GameIcon name="lorc/checked-shield" size={12} tintColor="$warning" />
                        <Text color="$warning" fontSize={11} fontWeight="700">
                          {t("adventures.resistance", "Resists")}: {adventure.bossResistanceMuscle}
                        </Text>
                      </XStack>
                    )}
                  </XStack>
                )}
              </YStack>
            )}
          </AdventureCard>
        </YStack>

        {/* ═══════════════════════════════════════════════════════════════════
            QUEST SEQUENCE / JOURNEY
        ═══════════════════════════════════════════════════════════════════ */}
        {adventureDetails && adventureDetails.steps.length > 0 && (
          <YStack px="$4" mt="$5" gap="$3">
            <SectionHeader
              title={`${t("adventures.quest_sequence")} (${adventureDetails.steps.length})`}
              icon="lorc/walking-boot"
            />

            {/* Journey Header */}
            <XStack
              bg="rgba(110, 69, 226, 0.1)"
              borderWidth={1}
              borderColor="rgba(110, 69, 226, 0.3)"
              borderRadius="$3"
              p="$3"
              items="center"
              gap="$3"
              mb="$2"
            >
              <GameIcon name="lorc/treasure-map" size={24} tintColor="$primary" />
              <YStack flex={1}>
                <Text color="$text" fontSize={14} fontWeight="700">
                  {t("adventures.journey_title")}
                </Text>
                <Text color="$textSecondary" fontSize={12}>
                  {t("adventures.journey_subtitle")}
                </Text>
              </YStack>
            </XStack>

            {/* Quest Steps */}
            <YStack gap="$0">
              {adventureDetails.steps.map((step, index) => (
                <QuestStepCard
                  key={step.id}
                  step={step}
                  stepNumber={index + 1}
                  totalSteps={adventureDetails.steps.length}
                  isLast={index === adventureDetails.steps.length - 1}
                  language={i18n.language}
                  onPress={() => {
                    Vibration.vibrate(5);
                    router.push(`/(modals)/quests/${step.quest.id}`);
                  }}
                />
              ))}
            </YStack>

            {/* Final Goal Banner */}
            <XStack
              bg={isBoss ? "rgba(244, 67, 54, 0.15)" : "rgba(22, 163, 74, 0.15)"}
              borderWidth={1}
              borderColor={isBoss ? "$error" : "$success"}
              borderRadius="$3"
              p="$3"
              items="center"
              gap="$3"
              mt="$2"
            >
              <YStack
                bg={isBoss ? "$error" : "$success"}
                width={40}
                height={40}
                borderRadius={1000}
                justify="center"
                items="center"
                shadowColor={isBoss ? "$error" : "$success"}
                shadowRadius={12}
                shadowOpacity={0.4}
              >
                <GameIcon
                  name={isBoss ? "lorc/crowned-skull" : "lorc/trophy"}
                  size={20}
                  tintColor="white"
                />
              </YStack>
              <YStack flex={1}>
                <Text
                  color={isBoss ? "$error" : "$success"}
                  fontSize={14}
                  fontWeight="800"
                  style={{ fontFamily: "SpaceGrotesk_700Bold" }}
                >
                  {isBoss ? t("adventures.defeat_boss") : t("adventures.complete_adventure")}
                </Text>
                <Text color="$textSecondary" fontSize={12}>
                  {isBoss ? t("adventures.boss_awaits") : t("adventures.glory_awaits")}
                </Text>
              </YStack>
            </XStack>
          </YStack>
        )}
      </Animated.ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════
          FIXED BOTTOM ACTION BAR
      ═══════════════════════════════════════════════════════════════════ */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        pb={insets.bottom + 16}
        pt="$4"
        px="$4"
      >
        {/* Blur backdrop */}
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(15, 15, 25, 0.95)"
        />

        {/* Gradient fade above */}
        <LinearGradient
          colors={["transparent", "rgba(15, 15, 25, 0.95)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: "absolute",
            top: -40,
            left: 0,
            right: 0,
            height: 40,
          }}
        />

        {/* Primary: Start Button with Glow */}
        <YStack position="relative">
          {/* Animated glow behind button */}
          <Animated.View
            style={{
              position: "absolute",
              top: 2,
              left: 4,
              right: 4,
              bottom: 2,
              borderRadius: 28,
              backgroundColor: isBoss ? "rgba(244, 67, 54, 0.5)" : "rgba(110, 69, 226, 0.5)",
              opacity: pulseAnim,
              transform: [{ scale: 1.02 }],
            }}
          />
          <Button
            size="$5"
            height={56}
            width="100%"
            bg={isBoss ? "$error" : "#6E45E2"}
            color="white"
            fontWeight="900"
            fontSize={15}
            borderRadius={28}
            onPress={handleShowConfirmation}
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
            shadowColor={isBoss ? "$crimson" : "#6E45E2"}
            shadowRadius={20}
            shadowOpacity={0.4}
            icon={<GameIcon name="lorc/crossed-swords" size={18} tintColor="white" />}
          >
            {t("adventures.start_button", "START")}
          </Button>
        </YStack>
      </YStack>

      {/* ═══════════════════════════════════════════════════════════════════
          CONFIRMATION MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      <ConfirmationModal
        visible={showConfirmModal}
        onConfirm={handleStartAdventure}
        onCancel={() => setShowConfirmModal(false)}
        title={title || ""}
        exercises={exerciseList}
        isBoss={isBoss}
      />
    </YStack>
  );
}
