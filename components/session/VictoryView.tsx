import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Share, useWindowDimensions } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, Text, XStack, YStack } from "tamagui";
import { NarrativeModal } from "@/components/adventures/NarrativeModal";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { useToast } from "@/components/common/Toast";
import { ConstructionAnimation } from "@/components/village/ConstructionAnimation";
import { getQuestColorTokensFromQuest } from "@/constants/exerciseColors";
import { SOUNDS } from "@/constants/sounds";
import { getAdventureStepOutroNarrative } from "@/db/adventures-narrative";
import type { NewRecordResult } from "@/db/personalRecords";
import { previewSessionLoot, type ResourceLoot } from "@/db/resources";
import type { BuildingCode } from "@/db/schema";
import { computeSessionXp } from "@/db/xp";
import { useHaptics } from "@/hooks/useHaptics";
import { useNotifications } from "@/hooks/useNotifications";
import { formatTime } from "@/hooks/useSessionTimer";
import { useSound } from "@/hooks/useSound";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { LevelUpModal } from "./LevelUpModal";
import { LootChest } from "./LootChest";
import { NewRecordsBadge } from "./NewRecordsBadge";
import { ProgressionChart } from "./ProgressionChart";

type Feedback = "easy" | "good" | "hard" | null;

export function VictoryView() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();
  const { success, selection } = useHaptics();
  const { scheduleSmartNotifications, showAchievementNotification } = useNotifications();
  const { playSound } = useSound();
  const { showError } = useToast();
  const {
    quest,
    userLevel,
    startTime,
    totalPausedTime,
    results,
    saveSession,
    quitSession,
    adventureRunStepId,
  } = useSessionStore();
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [newRecords, setNewRecords] = useState<NewRecordResult[]>([]);
  const [hasSaved, setHasSaved] = useState(false);
  const [outroNarrative, setOutroNarrative] = useState<string | null>(null);
  const [showOutroNarrative, setShowOutroNarrative] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState<{ oldLevel: number; newLevel: number } | null>(
    null,
  );

  useEffect(() => {
    playSound(SOUNDS.victory);
  }, [playSound]);

  useEffect(() => {
    if (adventureRunStepId) {
      getAdventureStepOutroNarrative(adventureRunStepId, language).then((text) => {
        if (text) {
          setOutroNarrative(text);
          setShowOutroNarrative(true);
        }
      });
    }
  }, [adventureRunStepId, language]);

  const [constructionQueue, setConstructionQueue] = useState<
    { type: "unlock" | "levelup"; buildingType: BuildingCode; level?: number }[]
  >([]);
  const [currentConstruction, setCurrentConstruction] = useState<{
    type: "unlock" | "levelup";
    buildingType: BuildingCode;
    level?: number;
  } | null>(null);

  // Calculate duration for display
  // Note: saveSession recalculates this accurately based on DB timestamp logic,
  // but this is good enough for the UI summary.
  const durationSeconds = useMemo(() => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime - totalPausedTime) / 1000);
  }, [startTime, totalPausedTime]);

  // Calculate loot preview
  const lootPreview: ResourceLoot = useMemo(() => {
    if (!quest) return { gold: 0, materials: [] };

    const exerciseResults = results.map((r) => {
      const questExercise = quest.exercises.find((qe) => qe.exercise.id === r.exerciseId);
      return {
        exerciseId: r.exerciseId,
        muscles: questExercise?.exercise.muscles ?? [],
        result: { type: r.result.type as "reps" | "time", value: r.result.value },
      };
    });

    return previewSessionLoot({
      durationSeconds,
      userLevel,
      exerciseResults,
    });
  }, [quest, results, durationSeconds, userLevel]);

  if (!quest || !startTime) return null;

  const questTitle = language === "fr" ? quest.frTitle : quest.enTitle;
  const { bg: questBg } = getQuestColorTokensFromQuest(quest);
  const xpEarned = computeSessionXp({ durationSeconds, userLevel });

  const handleShare = async () => {
    try {
      const message = t("session.share_message", {
        quest: questTitle,
        xp: xpEarned,
        defaultValue: `I just completed the '${questTitle}' quest and earned ${xpEarned} XP in Bati! ⚔️ #BatiApp`,
      });

      await Share.share({
        message,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleFinish = async () => {
    // If we've already saved and shown records, now navigate
    if (hasSaved) {
      quitSession();

      // Navigate based on campaign state (captured in first save)
      router.replace("/");
      return;
    }

    // Success haptic on finishing
    success();

    try {
      setIsSaving(true);
      // Pass feedback as FeedbackCode or null
      const feedbackCode = feedback as "easy" | "good" | "hard" | null;
      const {
        campaign,
        newRecords: records,
        buildings,
        levelUp,
        newAchievements,
      } = await saveSession(feedbackCode);

      // Update notifications (cancel streak warning if any, schedule next)
      scheduleSmartNotifications();

      // Show achievement notifications
      if (newAchievements && newAchievements.length > 0) {
        for (const achievement of newAchievements) {
          const title =
            language === "fr" ? achievement.definition.frTitle : achievement.definition.enTitle;
          const body =
            language === "fr"
              ? achievement.definition.frDescription
              : achievement.definition.enDescription;
          showAchievementNotification(title, body, achievement.definition.icon);
        }
      }

      if (levelUp) {
        setLevelUpInfo(levelUp);
      }

      // Queue up building animations
      const queue: typeof constructionQueue = [];

      if (buildings?.newUnlocks) {
        for (const unlock of buildings.newUnlocks) {
          queue.push({ type: "unlock", buildingType: unlock.buildingType, level: 1 });
        }
      }

      if (buildings?.levelUps) {
        for (const levelUp of buildings.levelUps) {
          queue.push({
            type: "levelup",
            buildingType: levelUp.buildingType,
            level: levelUp.newLevel,
          });
        }
      }

      // If we got new records or building updates, show them before navigating
      if (records.length > 0 || queue.length > 0) {
        setNewRecords(records);

        if (queue.length > 0) {
          setConstructionQueue(queue);
          setCurrentConstruction(queue[0]);
        }

        setHasSaved(true);
        setIsSaving(false);
        // Extra celebration haptic
        success();
        return;
      }

      quitSession();

      if (campaign?.nextQuestId && campaign.nextRunStepId) {
        router.replace(
          `/quests/${campaign.nextQuestId}?level=${encodeURIComponent(userLevel)}&runStepId=${campaign.nextRunStepId}` as never,
        );
        return;
      }

      if (campaign?.isFinished) {
        router.replace(`/adventures/${campaign.adventureId}` as never);
        return;
      }

      router.replace("/");
    } catch (e) {
      console.error("Failed to save session", e);
      showError(t("errors.save_session_failed"));
      setIsSaving(false);
    }
  };

  const handleFeedbackSelect = (value: Feedback) => {
    selection();
    setFeedback(value);
  };

  const handleNextConstruction = () => {
    const nextQueue = constructionQueue.slice(1);
    setConstructionQueue(nextQueue);

    if (nextQueue.length > 0) {
      setCurrentConstruction(nextQueue[0]);
    } else {
      setCurrentConstruction(null);
    }
  };

  return (
    <YStack flex={1} bg="$background" pt={insets.top + 16} pb={insets.bottom + 16}>
      {levelUpInfo && (
        <LevelUpModal
          visible={!!levelUpInfo}
          newLevel={levelUpInfo.newLevel}
          onClose={() => setLevelUpInfo(null)}
        />
      )}
      {currentConstruction && (
        <ConstructionAnimation
          visible={!!currentConstruction}
          buildingType={currentConstruction.buildingType}
          type={currentConstruction.type}
          level={currentConstruction.level}
          onClose={handleNextConstruction}
        />
      )}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          alignItems: "center",
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card bg={questBg} width="100%" maxW={520} mt="$6">
          <YStack items="center" gap="$3">
            <Text fontSize={72}>🏆</Text>
            <YStack items="center" gap="$1">
              <Text
                fontWeight="900"
                textTransform="uppercase"
                color="$color"
                fontSize={14}
                opacity={0.65}
                style={{ textAlign: "center" }}
              >
                {t("session.victory_title")}
              </Text>
              <H1
                fontWeight="900"
                color="$color"
                fontSize={34}
                lineHeight={38}
                style={{ textAlign: "center" }}
              >
                {questTitle}
              </H1>
            </YStack>
          </YStack>
        </Card>

        <Card width="100%" maxW={520} bg="$bgLight" gap="$4">
          <XStack
            justify="space-between"
            items="center"
            borderBottomWidth={1}
            borderColor="$bgLight"
            pb="$3"
          >
            <Text
              fontWeight="800"
              fontSize={16}
              color="$color"
              opacity={0.6}
              textTransform="uppercase"
            >
              {t("session.total_time")}
            </Text>
            <Text fontWeight="900" fontSize={24} color="$color" fontFamily="$body">
              {formatTime(durationSeconds)}
            </Text>
          </XStack>

          <XStack justify="space-between" items="center">
            <Text
              fontWeight="800"
              fontSize={16}
              color="$color"
              opacity={0.6}
              textTransform="uppercase"
            >
              {t("session.xp_earned")}
            </Text>
            <Text fontWeight="900" fontSize={24} color="$primary" fontFamily="$body">
              {t("quests.reward_xp", { count: xpEarned })}
            </Text>
          </XStack>
        </Card>

        {/* New Personal Records */}
        {newRecords.length > 0 && <NewRecordsBadge records={newRecords} />}

        {/* Loot Display */}
        <LootChest loot={lootPreview} />

        {/* Progression Chart */}
        <YStack width="100%" maxW={520}>
          <ProgressionChart questId={quest.id} limit={10} title={t("chart.your_progress")} />
        </YStack>

        {/* Post-workout Feedback */}
        <Card width="100%" maxW={520} bg="$bgLight" gap="$3">
          <Text
            fontWeight="800"
            fontSize={14}
            color="$color"
            opacity={0.7}
            textTransform="uppercase"
            style={{ textAlign: "center" }}
          >
            {t("session.feedback_title")}
          </Text>
          <XStack gap="$3" justify="center">
            <Button
              flex={1}
              size="$4"
              bg={feedback === "easy" ? "$pastelGreen" : "$bgLight"}
              borderWidth={2}
              borderColor={feedback === "easy" ? "$success" : "$color"}
              opacity={feedback === "easy" ? 1 : 0.7}
              pressStyle={{ opacity: 0.8, scale: 0.98 }}
              onPress={() => handleFeedbackSelect("easy")}
              rounded="$4"
              accessibilityLabel={t("session.feedback_easy")}
              accessibilityRole="button"
            >
              <YStack items="center" gap="$1">
                <Text fontSize={20}>😊</Text>
                <Text color="$color" fontSize={12} fontWeight="800" style={{ textAlign: "center" }}>
                  {t("session.feedback_easy")}
                </Text>
              </YStack>
            </Button>
            <Button
              flex={1}
              size="$4"
              bg={feedback === "good" ? "$pastelBlue" : "$bgLight"}
              borderWidth={2}
              borderColor={feedback === "good" ? "$primary" : "$color"}
              opacity={feedback === "good" ? 1 : 0.7}
              pressStyle={{ opacity: 0.8, scale: 0.98 }}
              onPress={() => handleFeedbackSelect("good")}
              rounded="$4"
              accessibilityLabel={t("session.feedback_good")}
              accessibilityRole="button"
            >
              <YStack items="center" gap="$1">
                <Text fontSize={20}>💪</Text>
                <Text color="$color" fontSize={12} fontWeight="800" style={{ textAlign: "center" }}>
                  {t("session.feedback_good")}
                </Text>
              </YStack>
            </Button>
            <Button
              flex={1}
              size="$4"
              bg={feedback === "hard" ? "$pastelPink" : "$bgLight"}
              borderWidth={2}
              borderColor={feedback === "hard" ? "$secondary" : "$color"}
              opacity={feedback === "hard" ? 1 : 0.7}
              pressStyle={{ opacity: 0.8, scale: 0.98 }}
              onPress={() => handleFeedbackSelect("hard")}
              rounded="$4"
              accessibilityLabel={t("session.feedback_hard")}
              accessibilityRole="button"
            >
              <YStack items="center" gap="$1">
                <Text fontSize={20}>😤</Text>
                <Text color="$color" fontSize={12} fontWeight="800" style={{ textAlign: "center" }}>
                  {t("session.feedback_hard")}
                </Text>
              </YStack>
            </Button>
          </XStack>
        </Card>

        {/* Share Button */}
        <AppButton backgroundColor="$bgLight" onPress={handleShare} marginBottom="$2">
          <Text color="$color" fontSize={16} fontWeight="800">
            {t("session.share", "Share Result")} 📤
          </Text>
        </AppButton>

        {/* Finish Button */}
        <AppButton onPress={handleFinish} disabled={isSaving}>
          <Text color="$background" fontSize={20} fontWeight="900" textTransform="uppercase">
            {isSaving ? t("common.saving") : t("session.finish_button")}
          </Text>
        </AppButton>
      </ScrollView>

      <ConfettiCannon
        count={200}
        origin={{ x: width / 2, y: -20 }}
        autoStart={true}
        fadeOut={true}
      />

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
