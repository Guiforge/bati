import { Plus } from "@tamagui/lucide-icons";
import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList } from "react-native";
import { Sheet, Spinner, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { createScheduledSession } from "@/db/scheduling";
import { listQuestTemplates, type QuestTemplate } from "@/db/quests";
import { useSettingsStore } from "@/stores/settings";
import { useHaptics } from "@/hooks/useHaptics";

interface AddScheduleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  onSessionAdded: () => void;
}

export function AddScheduleSheet({
  open,
  onOpenChange,
  selectedDate,
  onSessionAdded,
}: AddScheduleSheetProps) {
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const { success: hapticSuccess } = useHaptics();
  const [quests, setQuests] = useState<QuestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      listQuestTemplates()
        .then(setQuests)
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleSelectQuest = useCallback(
    async (questId: number) => {
      setSaving(true);
      try {
        await createScheduledSession({
          questId,
          scheduledDate: selectedDate,
        });
        hapticSuccess();
        onSessionAdded();
        onOpenChange(false);
      } catch (e) {
        console.error("Failed to schedule session:", e);
      } finally {
        setSaving(false);
      }
    },
    [selectedDate, onSessionAdded, onOpenChange, hapticSuccess],
  );

  const renderQuest = useCallback(
    ({ item }: { item: QuestTemplate }) => {
      const title = language === "fr" ? item.frTitle : item.enTitle;
      const exerciseCount = item.exercises.length;

      return (
        <Card
          p="$3"
          mb="$2"
          onPress={() => handleSelectQuest(item.id)}
          pressStyle={{ opacity: 0.8, scale: 0.98 }}
          disabled={saving}
        >
          <XStack justify="space-between" items="center">
            <YStack flex={1} gap="$1">
              <Text fontWeight="800" fontSize={16} color="$color">
                {title}
              </Text>
              <Text fontSize={12} opacity={0.6} color="$color">
                {item.rounds} {t("common.rounds", "rounds")} • {exerciseCount}{" "}
                {t("common.exercises", "exercises")}
              </Text>
            </YStack>
            <Plus size={20} color="$primary" />
          </XStack>
        </Card>
      );
    },
    [language, handleSelectQuest, saving, t],
  );

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[85]}
      dismissOnSnapToBottom
      animation="quick"
    >
      <Sheet.Overlay />
      <Sheet.Frame bg="$background" p="$4" rounded="$6">
        <Sheet.Handle />
        <YStack gap="$4" flex={1}>
          <YStack gap="$1">
            <Text fontSize={20} fontWeight="900" color="$color">
              {t("scheduling.add_session", "Schedule Workout")}
            </Text>
            <Text fontSize={14} opacity={0.7} color="$color">
              {format(selectedDate, "EEEE, MMMM d")}
            </Text>
          </YStack>

          {loading ? (
            <YStack flex={1} justify="center" items="center">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : quests.length === 0 ? (
            <YStack flex={1} justify="center" items="center">
              <Text opacity={0.6}>{t("scheduling.no_quests", "No quests available")}</Text>
            </YStack>
          ) : (
            <FlatList
              data={quests}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderQuest}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          )}

          <AppButton variant="secondary" onPress={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </AppButton>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
