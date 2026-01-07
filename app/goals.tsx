import { ChevronLeft, Target } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H4, Progress, Text, XStack, YStack } from "tamagui";

import { Card } from "@/src/components/common/Card";
import { PlanPreviewSheet } from "@/src/components/goals/PlanPreviewSheet";
import {
  createGoal,
  type Goal,
  type GoalProgress,
  getActiveGoal,
  getGoalProgressHistory,
  getOrCreateWeekProgress,
  goalTypeInfo,
  updateGoalStatus,
} from "@/src/db/goals";
import { generatePlanForGoal, type PlannedSession, previewPlanForGoal } from "@/src/db/plans";
import type { GoalStatusCode, GoalTypeCode } from "@/src/db/schema";
import { useHaptics } from "@/src/hooks/useHaptics";
import { useSettingsStore } from "@/src/stores/settings";

const GOAL_TYPES: GoalTypeCode[] = ["strength", "endurance", "flexibility", "balanced"];
const DAYS_OPTIONS = [2, 3, 4, 5, 6, 7];
const DURATION_OPTIONS = [15, 20, 30, 45, 60];

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex screen component, refactor planned
export default function GoalsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();
  const { mediumImpact, selection } = useHaptics();

  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [weekProgress, setWeekProgress] = useState<GoalProgress | null>(null);
  const [progressHistory, setProgressHistory] = useState<GoalProgress[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Plan preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewSessions, setPreviewSessions] = useState<PlannedSession[]>([]);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Form state for editing/creating
  const [selectedType, setSelectedType] = useState<GoalTypeCode>("balanced");
  const [selectedDays, setSelectedDays] = useState(3);
  const [selectedDuration, setSelectedDuration] = useState(20);

  const loadData = useCallback(async () => {
    try {
      const goal = await getActiveGoal();
      setActiveGoal(goal);

      if (goal) {
        const progress = await getOrCreateWeekProgress(goal.id);
        setWeekProgress(progress);

        const history = await getGoalProgressHistory(goal.id, 8);
        setProgressHistory(history);

        // Initialize form with current goal values
        setSelectedType(goal.goalType);
        setSelectedDays(goal.daysPerWeek);
        setSelectedDuration(goal.sessionMinutes);
      } else {
        setIsEditing(true); // Show form if no goal
      }
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => {
      // Error already handled
    });
  }, [loadData]);

  const handleSaveGoal = async () => {
    mediumImpact();

    try {
      // Show preview first before creating goal
      setShowPreview(true);
      setIsGeneratingPreview(true);

      // Generate preview with selected params
      const sessions = await previewPlanForGoal({ daysPerWeek: selectedDays });
      setPreviewSessions(sessions);
    } catch {
      setShowPreview(false);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleConfirmPlan = async () => {
    mediumImpact();

    try {
      // Now create the goal and generate the actual plan
      const goalId = await createGoal({
        goalType: selectedType,
        daysPerWeek: selectedDays,
        sessionMinutes: selectedDuration,
      });

      await generatePlanForGoal(goalId);
      setShowPreview(false);
      setIsEditing(false);
      setPreviewSessions([]);
      await loadData();
    } catch {
      // Error handled silently
    }
  };

  const handleRegeneratePlan = async () => {
    selection();
    setIsGeneratingPreview(true);

    try {
      const sessions = await previewPlanForGoal({ daysPerWeek: selectedDays });
      setPreviewSessions(sessions);
    } catch {
      // Error handled silently
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleStatusUpdate = async (status: GoalStatusCode) => {
    if (!activeGoal) return;
    mediumImpact();

    try {
      await updateGoalStatus(activeGoal.id, status);
      await loadData();
    } catch {
      // Error handled silently
    }
  };

  const percentage = weekProgress
    ? Math.min(100, (weekProgress.completedSessions / weekProgress.targetSessions) * 100)
    : 0;
  const isComplete = weekProgress
    ? weekProgress.completedSessions >= weekProgress.targetSessions
    : false;

  return (
    <YStack flex={1} bg="$background">
      {/* Header */}
      <XStack
        pt={insets.top + 8}
        px="$4"
        pb="$3"
        bg="$background"
        items="center"
        gap="$3"
        borderBottomWidth={2}
        borderBottomColor="$color"
      >
        <Button
          width={44}
          height={44}
          circular
          bg="$surface2"
          borderWidth={2}
          borderColor="$borderStrong"
          pressStyle={{ opacity: 0.9, scale: 0.98 }}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="$color" />
        </Button>
        <YStack flex={1}>
          <H1 fontSize={24} fontWeight="900" color="$color">
            {t("goals.title")}
          </H1>
        </YStack>
        {activeGoal && !isEditing && (
          <Pressable onPress={() => setIsEditing(true)}>
            <Text fontWeight="900" color="$primary" fontSize={14}>
              {t("goals.edit_goal")}
            </Text>
          </Pressable>
        )}
      </XStack>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {isLoading ? (
          <YStack items="center" py="$6">
            <Text color="$color" opacity={0.6}>
              {t("common.loading")}
            </Text>
          </YStack>
        ) : isEditing ? (
          // Goal creation/editing form
          <YStack gap="$4">
            {/* Goal Type Selection */}
            <Card bg="$bgLight" width="100%">
              <YStack gap="$3">
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("goals.goal_type")}
                </Text>
                <YStack gap="$2">
                  {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex rendering logic, refactor planned */}
                  {GOAL_TYPES.map((type) => {
                    const info = goalTypeInfo[type];
                    const isSelected = selectedType === type;
                    return (
                      <Pressable
                        key={type}
                        onPress={() => {
                          selection();
                          setSelectedType(type);
                        }}
                      >
                        <XStack
                          bg={isSelected ? "$pastelYellow" : "$background"}
                          borderWidth={2}
                          borderColor={isSelected ? "$primary" : "$color"}
                          rounded="$4"
                          px="$3"
                          py="$3"
                          items="center"
                          gap="$3"
                        >
                          <Text fontSize={28}>{info.emoji}</Text>
                          <YStack flex={1}>
                            <Text fontWeight="900" fontSize={16} color="$color">
                              {language === "fr" ? info.fr : info.en}
                            </Text>
                            <Text fontSize={12} color="$color" opacity={0.6}>
                              {language === "fr" ? info.description.fr : info.description.en}
                            </Text>
                          </YStack>
                          {isSelected && <Target size={20} color="$primary" />}
                        </XStack>
                      </Pressable>
                    );
                  })}
                </YStack>
              </YStack>
            </Card>

            {/* Days per Week */}
            <Card bg="$bgLight" width="100%">
              <YStack gap="$3">
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("goals.days_per_week")}
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {DAYS_OPTIONS.map((days) => {
                    const isSelected = selectedDays === days;
                    return (
                      <Button
                        key={days}
                        size="$3"
                        bg={isSelected ? "$primary" : "$background"}
                        borderWidth={2}
                        borderColor={isSelected ? "$primary" : "$color"}
                        onPress={() => {
                          selection();
                          setSelectedDays(days);
                        }}
                        rounded="$4"
                      >
                        <Text
                          fontWeight="800"
                          color={isSelected ? "$background" : "$color"}
                          fontSize={14}
                        >
                          {days}
                        </Text>
                      </Button>
                    );
                  })}
                </XStack>
              </YStack>
            </Card>

            {/* Session Duration */}
            <Card bg="$bgLight" width="100%">
              <YStack gap="$3">
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("goals.session_duration")}
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {DURATION_OPTIONS.map((duration) => {
                    const isSelected = selectedDuration === duration;
                    return (
                      <Button
                        key={duration}
                        size="$3"
                        bg={isSelected ? "$primary" : "$background"}
                        borderWidth={2}
                        borderColor={isSelected ? "$primary" : "$color"}
                        onPress={() => {
                          selection();
                          setSelectedDuration(duration);
                        }}
                        rounded="$4"
                      >
                        <Text
                          fontWeight="800"
                          color={isSelected ? "$background" : "$color"}
                          fontSize={14}
                        >
                          {duration}m
                        </Text>
                      </Button>
                    );
                  })}
                </XStack>
              </YStack>
            </Card>

            {/* Action Buttons */}
            <XStack gap="$3">
              {activeGoal && (
                <Button
                  flex={1}
                  size="$5"
                  bg="$bgLight"
                  borderWidth={2}
                  borderColor="$color"
                  onPress={() => setIsEditing(false)}
                  rounded="$6"
                >
                  <Text fontWeight="900" color="$color" fontSize={16}>
                    {t("goals.cancel")}
                  </Text>
                </Button>
              )}
              <Button
                flex={1}
                size="$5"
                bg="$primary"
                borderWidth={0}
                onPress={handleSaveGoal}
                rounded="$6"
              >
                <Text fontWeight="900" color="$background" fontSize={16}>
                  {t("goals.save")}
                </Text>
              </Button>
            </XStack>
          </YStack>
        ) : activeGoal && weekProgress ? (
          // Goal display view
          <YStack gap="$4">
            {/* Current Goal Card */}
            <Card bg="$pastelYellow" width="100%">
              <YStack gap="$3">
                <XStack items="center" gap="$3">
                  <Text fontSize={48}>{goalTypeInfo[activeGoal.goalType].emoji}</Text>
                  <YStack flex={1}>
                    <Text fontWeight="900" fontSize={20} color="$color">
                      {language === "fr"
                        ? goalTypeInfo[activeGoal.goalType].fr
                        : goalTypeInfo[activeGoal.goalType].en}
                    </Text>
                    <Text fontSize={14} color="$color" opacity={0.7}>
                      {t("goals.days", { count: activeGoal.daysPerWeek })} •{" "}
                      {t("goals.minutes", { count: activeGoal.sessionMinutes })}
                    </Text>
                  </YStack>
                </XStack>
              </YStack>
            </Card>

            {/* Weekly Progress */}
            <Card bg="$bgLight" width="100%">
              <YStack gap="$3">
                <H4 fontWeight="900" color="$color">
                  {t("goals.weekly_progress")}
                </H4>
                <YStack gap="$2">
                  <Progress size="$4" value={percentage} bg="$background" rounded="$4">
                    <Progress.Indicator
                      animation="bouncy"
                      bg={isComplete ? "$success" : "$primary"}
                    />
                  </Progress>
                  <XStack justify="space-between">
                    <Text fontSize={14} color="$color" opacity={0.7}>
                      {t("goals.sessions_completed", {
                        completed: weekProgress.completedSessions,
                        target: weekProgress.targetSessions,
                      })}
                    </Text>
                    <Text fontWeight="900" fontSize={14} color={isComplete ? "$success" : "$color"}>
                      {isComplete ? t("goals.goal_complete") : `${Math.round(percentage)}%`}
                    </Text>
                  </XStack>
                </YStack>
              </YStack>
            </Card>

            {/* Progress History */}
            {progressHistory.length > 1 && (
              <Card bg="$bgLight" width="100%">
                <YStack gap="$3">
                  <H4 fontWeight="900" color="$color">
                    {t("journal.history")}
                  </H4>
                  <YStack gap="$2">
                    {progressHistory.slice(0, 4).map((p) => {
                      const pct = Math.min(100, (p.completedSessions / p.targetSessions) * 100);
                      const done = p.completedSessions >= p.targetSessions;
                      return (
                        <XStack key={p.weekKey} items="center" gap="$3">
                          <Text fontSize={12} color="$color" opacity={0.6} width={60}>
                            {p.weekKey}
                          </Text>
                          <YStack flex={1}>
                            <Progress size="$2" value={pct} bg="$background" rounded="$2">
                              <Progress.Indicator bg={done ? "$success" : "$secondary"} />
                            </Progress>
                          </YStack>
                          <Text fontSize={12} color="$color" fontWeight="700" width={40}>
                            {p.completedSessions}/{p.targetSessions}
                          </Text>
                        </XStack>
                      );
                    })}
                  </YStack>
                </YStack>
              </Card>
            )}

            {/* Goal Actions */}
            <Card bg="$bgLight" width="100%">
              <XStack gap="$3">
                <Button
                  flex={1}
                  size="$4"
                  bg="$pastelGreen"
                  borderWidth={2}
                  borderColor="$color"
                  onPress={() => handleStatusUpdate("completed")}
                  rounded="$4"
                >
                  <Text fontWeight="800" color="$color" fontSize={12}>
                    {t("goals.complete_goal")}
                  </Text>
                </Button>
                <Button
                  flex={1}
                  size="$4"
                  bg="$pastelPink"
                  borderWidth={2}
                  borderColor="$color"
                  onPress={() => handleStatusUpdate("paused")}
                  rounded="$4"
                >
                  <Text fontWeight="800" color="$color" fontSize={12}>
                    {t("goals.pause_goal")}
                  </Text>
                </Button>
              </XStack>
            </Card>
          </YStack>
        ) : null}
      </ScrollView>

      {/* Plan Preview Sheet */}
      <PlanPreviewSheet
        open={showPreview}
        onOpenChange={setShowPreview}
        sessions={previewSessions}
        isLoading={isGeneratingPreview}
        onConfirm={handleConfirmPlan}
        onRegenerate={handleRegeneratePlan}
      />
    </YStack>
  );
}
