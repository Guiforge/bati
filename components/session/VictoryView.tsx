import { Share2 } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Share, useWindowDimensions } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, Text, XStack, YStack } from "tamagui";
import { NarrativeModal } from "@/components/adventures/NarrativeModal";
import { recordCue } from "@/components/chorus/recordCue";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { GameIcon } from "@/components/common/GameIcon";
import { ImageViewer } from "@/components/common/ImageViewer";
import { useToast } from "@/components/common/Toast";
import { getBossAsset, getQuestAsset } from "@/constants/assetMap";
import { bossDisplayName } from "@/constants/bosses";
import { getQuestColorTokensFromQuest } from "@/constants/exerciseColors";
import { getAdventureStepOutroNarrative } from "@/db/adventures-narrative";
import { TRIUMPH_XP_BONUS } from "@/db/bossFights";
import { updateSessionFeedback } from "@/db/completed";
import type { FeedbackCode } from "@/db/schema";
import { calculateLevelFromXp, getLevelTitle, getXpForLevel } from "@/db/userLevel";
import { useHaptics } from "@/hooks/useHaptics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { formatTime } from "@/hooks/useSessionTimer";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useChorusStore } from "@/stores/chorus";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { ProgressionChart } from "./ProgressionChart";
import { SessionRewards } from "./SessionRewards";

type SaveResult = Awaited<ReturnType<ReturnType<typeof useSessionStore.getState>["saveSession"]>>;

/**
 * The hero's own gauge, filling with what this session earned — the one number that makes
 * "come back tomorrow" legible, and it only ever moved on Home, outside the celebration
 * (2026-08 audit, §06-B). Same visual language as the home header: gold on a dark track.
 */
function HeroLevelBar({
  before,
  after,
  language,
  reducedMotion,
}: {
  before: number;
  after: number;
  language: string;
  reducedMotion: boolean;
}) {
  const { t } = useTranslation();
  const level = calculateLevelFromXp(after);
  const base = getXpForLevel(level);
  const span = Math.max(1, getXpForLevel(level + 1) - base);
  const target = Math.min(100, ((after - base) / span) * 100);
  // Where the bar starts filling from: the hero's progress before the session, or the bottom
  // of the level when the session crossed it — the sweep from zero *is* the level-up.
  const from = before >= base ? Math.min(target, ((before - base) / span) * 100) : 0;
  const title = getLevelTitle(level)[language === "fr" ? "fr" : "en"];

  const width = useSharedValue(reducedMotion ? target : from);
  useEffect(() => {
    if (reducedMotion) {
      width.value = target;
      return;
    }
    width.value = withDelay(500, withTiming(target, { duration: 900 }));
  }, [reducedMotion, target, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <Card width="100%" maxW={520} bg="$surface" borderColor="$glassBorder" gap="$2" py="$3">
      <XStack items="center" justify="space-between">
        <Text fontFamily="$body" fontWeight="700" fontSize={14} color="$text">
          {t("home.level_line", {
            level,
            title,
            defaultValue: `Level ${level} • ${title}`,
          })}
        </Text>
        <Text fontFamily="$body" fontWeight="700" fontSize={12} color="$resourceGold">
          {t("journal.xp_progress", {
            current: after - base,
            next: span,
            defaultValue: `${after - base} / ${span} XP`,
          })}
        </Text>
      </XStack>
      <XStack height={8} bg="$surface2" rounded={4} overflow="hidden" width="100%">
        <Animated.View style={[{ height: "100%", borderRadius: 4 }, fill]}>
          <YStack flex={1} bg="$resourceGold" rounded={4} />
        </Animated.View>
      </XStack>
    </Card>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Post-workout summary screen (save, reveal, feedback, actions)
export function VictoryView() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const reducedMotion = useReducedMotion();
  const { success, selection } = useHaptics();
  const { showError } = useToast();
  const {
    quest,
    startTime,
    totalPausedTime,
    saveSession,
    quitSession,
    adventureRunStepId,
    bossFight,
    bossStartHp,
    felledByFinalBlow,
  } = useSessionStore();
  const [bossExpanded, setBossExpanded] = useState(false);
  const cue = useChorusStore((s) => s.cue);

  const [result, setResult] = useState<SaveResult | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackCode | null>(null);
  const [outroNarrative, setOutroNarrative] = useState<string | null>(null);
  const [showOutroNarrative, setShowOutroNarrative] = useState(false);
  const savedRef = useRef(false);
  const feedbackTouched = useRef(false);

  // Defeated *today*, not defeated ever. `currentHp <= 0` alone is true for every remaining
  // session of the campaign, so the sword, the boss copy and the 120-particle burst replayed on
  // each one. `bossStartHp` is what the session opened on: it is only positive on the session that
  // did the killing.
  const isBossDefeat = Boolean(
    bossStartHp != null && bossStartHp > 0 && (bossFight?.currentHp ?? 1) <= 0,
  );
  /** The monster this session felled, when it did — what the hero card shows instead of the quest. */
  const felledBoss = isBossDefeat ? bossFight : null;

  const durationSeconds = useMemo(() => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime - totalPausedTime) / 1000);
  }, [startTime, totalPausedTime]);

  // Save once on mount, then reveal the real results. No preview, no two-tap flow. The retry below
  // is safe: `ensureSessionRow` makes `saveSession` idempotent.
  const runSave = useCallback(async () => {
    setSaveError(false);
    try {
      const r = await saveSession(null);
      setResult(r);
      success();
    } catch {
      setSaveError(true);
      showError(t("errors.save_session_failed"));
    }
  }, [saveSession, success, showError, t]);

  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    runSave().catch((e) => reportError("session.save", e));
  }, [runSave]);

  // The feeling can be tapped while the save is still in flight, but persisting it needs a
  // session id that only exists once `result` lands. Writing it from the tap handler meant the
  // early taps were dropped on the floor — the button lit up, the row kept `feedback: null`.
  // Keyed on both, so a tap before the save and a tap after take the same path.
  // One villager per victory, chosen here rather than by competing effects: these are all `event`
  // priority, so firing two would just mean the second silently overwrote the first and which one
  // you saw depended on effect ordering. A felled boss outranks a record — it is the rarer thing,
  // and the hero already has the badge for the other.
  useEffect(() => {
    if (!result) return;
    if (isBossDefeat) {
      cue("boss_defeated");
      return;
    }

    const earned = recordCue(result.newRecords, language);
    if (!earned) return;
    if (earned.moment === "personal_record") {
      cue("personal_record");
      return;
    }

    // The one place a villager quotes a number, and the reason the layer bothers: "ten more than
    // last time" is the shape the evidence says keeps working, where "well done!" stops working
    // inside two months. Pluralised through i18next rather than glued together, so the English
    // says "1 rep" and not "1 reps".
    cue("personal_record_beat", {
      delta: t(`villagers.units.delta_${earned.unit}`, { count: earned.delta }),
      exercise: earned.exercise,
    });
  }, [result, isBossDefeat, cue, language, t]);

  useEffect(() => {
    if (!result || !feedbackTouched.current) return;
    updateSessionFeedback(result.sessionId, feedback).catch(() => {
      // A feeling that fails to save is not worth interrupting the victory screen for.
    });
  }, [result, feedback]);

  useEffect(() => {
    if (adventureRunStepId) {
      getAdventureStepOutroNarrative(adventureRunStepId, language)
        .then((text) => {
          if (text) {
            setOutroNarrative(text);
            setShowOutroNarrative(true);
          }
        })
        .catch((error) => {
          // No outro is a fine victory; an unhandled rejection mid-save is not.
          reportError("session.outroNarrative", error);
        });
    }
  }, [adventureRunStepId, language]);

  if (!quest || !startTime) return null;

  const questTitle = localizedTitle(quest, language);
  const heroTitle = felledBoss != null ? bossDisplayName(felledBoss, language) : questTitle;
  const { bg: questBg } = getQuestColorTokensFromQuest(quest);

  const handleShare = async () => {
    try {
      const message = t("session.share_message", {
        quest: questTitle,
        xp: result?.xpEarned ?? 0,
        defaultValue: `I just completed the '${questTitle}' quest and earned ${result?.xpEarned ?? 0} XP in Bati! ⚔️ #BatiApp`,
      });
      await Share.share({ message });
    } catch {
      // Dismissing the share sheet rejects. That is the hero changing their mind, not a
      // failure — there is nothing to report and nothing to tell them.
    }
  };

  const handleFeedbackSelect = (value: FeedbackCode) => {
    selection();
    feedbackTouched.current = true;
    const next = feedback === value ? null : value;
    setFeedback(next);
  };

  const handleViewVillage = () => {
    if (!result) return;
    quitSession();
    const codes = result.villageGrowth.map((g) => g.code).join(",");
    router.push(`/(tabs)/village?grown=${codes}` as never);
  };

  const handleContinue = () => {
    if (!result) return;
    quitSession();

    const campaign = result.campaign;
    if (campaign?.nextQuestId && campaign.nextRunStepId) {
      router.replace(
        `/quests/${campaign.nextQuestId}?runStepId=${campaign.nextRunStepId}` as never,
      );
      return;
    }
    if (campaign?.isFinished) {
      router.replace(`/adventures/${campaign.adventureId}` as never);
      return;
    }
    router.replace("/");
  };

  return (
    <YStack flex={1} bg="$background" pt={insets.top + 16}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 96,
          alignItems: "center",
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: the moment's own image with the title laid over it. A boss kill is the app's
            climax, so its card is the *monster* — named, felled, gold-rimmed — not the poster of
            the quest that happened to land the blow. */}
        <Card
          bg={questBg}
          width="100%"
          maxW={520}
          mt="$4"
          p={0}
          overflow="hidden"
          {...(isBossDefeat ? { borderWidth: 2, borderColor: "$resourceGold" } : null)}
          {...(felledBoss != null
            ? {
                onPress: () => setBossExpanded(true),
                accessibilityRole: "imagebutton" as const,
                accessibilityLabel: heroTitle,
              }
            : null)}
        >
          <YStack width="100%" aspectRatio={16 / 9} bg="$surface2">
            <Image
              source={
                felledBoss
                  ? getBossAsset(felledBoss.imagePath, felledBoss.tier, "defeated")
                  : getQuestAsset(quest.imagePath)
              }
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
              accessible={false}
            />
            <LinearGradient
              colors={["transparent", "rgba(11,15,25,0.55)", "rgba(11,15,25,0.95)"]}
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0 }}
            />
            <YStack position="absolute" t="$3" l="$3">
              <GameIcon name={isBossDefeat ? "sword" : "trophy"} size={40} color="$primaryText" />
            </YStack>
            <YStack position="absolute" b={0} l={0} r={0} p="$4" gap="$1">
              <Text
                fontFamily="$body"
                fontWeight="700"
                color={isBossDefeat ? "$resourceGold" : "$textSecondary"}
                fontSize={13}
                letterSpacing={1.2}
              >
                {(isBossDefeat
                  ? t("boss.victory_title")
                  : t("session.victory_title")
                ).toUpperCase()}
              </Text>
              <H1 fontFamily="$body" fontWeight="700" color="$text" fontSize={26} lineHeight={31}>
                {heroTitle}
              </H1>
              {isBossDefeat && (
                <Text
                  fontFamily="$body"
                  fontSize={14}
                  fontWeight={felledByFinalBlow ? "400" : "700"}
                  color={felledByFinalBlow ? "$textSecondary" : "$resourceGold"}
                >
                  {/* The Triumph is the pool emptied by your own damage — what HP are for; the
                      final blow is the guarantee that finishing the campaign always kills. */}
                  {felledByFinalBlow
                    ? t("boss.final_blow")
                    : t("boss.triumph_subtitle", { xp: TRIUMPH_XP_BONUS })}
                </Text>
              )}
            </YStack>
          </YStack>
        </Card>

        {felledBoss != null && (
          <ImageViewer
            source={getBossAsset(felledBoss.imagePath, felledBoss.tier, "defeated")}
            name={heroTitle}
            visible={bossExpanded}
            onClose={() => setBossExpanded(false)}
          />
        )}

        {/* Stat row: Time · XP (accurate, incl. daily bonus) */}
        <XStack width="100%" maxW={520} gap="$3">
          <Card flex={1} bg="$surface" borderColor="$glassBorder" items="center" gap="$1" py="$3">
            <Text fontFamily="$body" fontWeight="700" fontSize={13} color="$textSecondary">
              {t("session.total_time")}
            </Text>
            <Text fontWeight="700" fontSize={26} color="$text" fontFamily="$body">
              {formatTime(durationSeconds)}
            </Text>
          </Card>
          <Card flex={1} bg="$surface" borderColor="$glassBorder" items="center" gap="$1" py="$3">
            <Text fontFamily="$body" fontWeight="700" fontSize={13} color="$textSecondary">
              {t("session.xp_earned")}
            </Text>
            <Text fontWeight="700" fontSize={26} color="$primaryText" fontFamily="$body">
              {result ? t("quests.reward_xp", { count: result.xpEarned }) : "…"}
            </Text>
            {!!result?.dailyBonusApplied && (
              <Text fontWeight="700" fontSize={11} color="$success">
                {t("common.daily_xp_bonus")}
              </Text>
            )}
          </Card>
        </XStack>

        {/* The hero's level bar, filling with this session's XP */}
        {!!result && (
          <HeroLevelBar
            before={result.heroXp.before}
            after={result.heroXp.after}
            language={language}
            reducedMotion={reducedMotion}
          />
        )}

        {/* Feedback — above the fold and above the rewards: this answer is what steers the next
            session's difficulty, and below the fold a hurried hero never saw it (audit §06-B). */}
        <Card width="100%" maxW={520} bg="$surface" borderColor="$glassBorder" gap="$3">
          <Text
            fontFamily="$body"
            fontWeight="700"
            fontSize={15}
            color="$text"
            style={{ textAlign: "center" }}
          >
            {t("session.feedback_title")}
          </Text>
          <XStack gap="$3" justify="center">
            {(
              [
                { value: "easy", emoji: "😊", accent: "$success" },
                { value: "good", emoji: "💪", accent: "$primary" },
                { value: "hard", emoji: "😤", accent: "$secondary" },
              ] as const
            ).map(({ value, emoji, accent }) => (
              <Button
                key={value}
                flex={1}
                size="$4"
                bg={feedback === value ? "$surface2" : "$surface"}
                borderWidth={1}
                borderColor={feedback === value ? accent : "$glassBorder"}
                opacity={feedback === value ? 1 : 0.85}
                pressStyle={{ opacity: 0.8, scale: 0.98 }}
                onPress={() => handleFeedbackSelect(value)}
                rounded="$4"
                accessibilityLabel={t(`session.feedback_${value}`)}
                accessibilityRole="button"
              >
                <YStack items="center" gap="$1">
                  <Text fontSize={20}>{emoji}</Text>
                  <Text
                    color="$text"
                    fontSize={12}
                    fontWeight="700"
                    style={{ textAlign: "center" }}
                  >
                    {t(`session.feedback_${value}`)}
                  </Text>
                </YStack>
              </Button>
            ))}
          </XStack>
        </Card>

        {/* Saving / error / rewards */}
        {!result && !saveError && (
          <YStack items="center" gap="$3" py="$6">
            <ActivityIndicator />
            <Text color="$textSecondary" fontSize={14}>
              {t("session.summary_saving")}
            </Text>
          </YStack>
        )}

        {!!saveError && (
          <YStack width="100%" maxW={520} items="center" gap="$3">
            <Text color="$textSecondary" fontSize={14} style={{ textAlign: "center" }}>
              {t("errors.save_session_failed")}
            </Text>
            <AppButton backgroundColor="$surface2" onPress={runSave}>
              <Text color="$text" fontSize={16} fontWeight="700">
                {t("common.retry")}
              </Text>
            </AppButton>
          </YStack>
        )}

        {!!result && (
          <SessionRewards result={result} language={language} onViewVillage={handleViewVillage} />
        )}

        {/* Progression chart (lower priority; also available in the journal) */}
        <YStack width="100%" maxW={520}>
          <ProgressionChart questId={quest.id} limit={10} title={t("chart.your_progress")} />
        </YStack>
      </ScrollView>

      {/* Sticky actions: single Continue + Share */}
      <XStack
        p="$4"
        pb={insets.bottom + 16}
        gap="$3"
        bg="$bgDark"
        borderTopWidth={1}
        borderColor="$glassBorder"
        style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
      >
        <Button
          bg="$surface2"
          height={60}
          rounded="$6"
          px="$4"
          onPress={handleShare}
          disabled={!result}
          pressStyle={{ opacity: 0.8, scale: 0.98 }}
          accessibilityLabel={t("session.share", "Share Result")}
        >
          <Share2 size={22} color="$text" />
        </Button>
        <AppButton
          testID="session-victory-continue"
          onPress={handleContinue}
          disabled={!result}
          height={60}
          rounded="$6"
          fullWidth={false}
          flex={1}
        >
          <Text color="$text" fontSize={20} fontWeight="700">
            {result ? t("session.continue") : t("common.saving")}
          </Text>
        </AppButton>
      </XStack>

      {/* Confetti: fewer pieces (JS-thread animated), and held until the save finishes so the
          burst doesn't fight the DB write + sound decode on the mount frame. */}
      {!reducedMotion && result && (
        <ConfettiCannon
          // A boss defeat, a fulfilled oath, or a village tier crossed is a big win — bigger, faster burst.
          count={isBossDefeat || result.fulfilledOath || result.tierUp ? 120 : 80}
          origin={{ x: width / 2, y: -20 }}
          autoStart={true}
          fadeOut={true}
          explosionSpeed={isBossDefeat || result.fulfilledOath || result.tierUp ? 450 : 350}
          fallSpeed={3000}
        />
      )}

      <NarrativeModal
        visible={showOutroNarrative}
        title={questTitle}
        text={outroNarrative ?? ""}
        onClose={() => setShowOutroNarrative(false)}
        type="outro"
      />
    </YStack>
  );
}
