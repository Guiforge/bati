import { Calendar, RefreshCw, Sparkles } from "@tamagui/lucide-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Button, H3, Sheet, Spinner, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import type { PlannedSession } from "@/db/plans";
import { useSettingsStore } from "@/stores/settings";

interface PlanPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: PlannedSession[];
  isLoading: boolean;
  onConfirm: () => void;
  onRegenerate: () => void;
}

const DAY_COLORS = [
  "$pastelPink",
  "$pastelBlue",
  "$pastelYellow",
  "$pastelGreen",
  "$pastelPurple",
  "$pastelOrange",
  "$pastelPink",
] as const;

type DayColor = (typeof DAY_COLORS)[number];

function PlanPreviewSheetComponent({
  open,
  onOpenChange,
  sessions,
  isLoading,
  onConfirm,
  onRegenerate,
}: PlanPreviewSheetProps) {
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  // Group sessions by week
  const sessionsByWeek = useMemo(() => {
    const grouped = new Map<number, PlannedSession[]>();
    for (const session of sessions) {
      const week = session.weekNumber;
      if (!grouped.has(week)) {
        grouped.set(week, []);
      }
      grouped.get(week)?.push(session);
    }
    return grouped;
  }, [sessions]);

  const formatDate = (date: Date) => {
    return format(date, "EEEE d MMM", { locale: language === "fr" ? fr : undefined });
  };

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPointsMode="fit"
      dismissOnSnapToBottom
      animation="quick"
    >
      <Sheet.Overlay animation="quick" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
      <Sheet.Handle bg="$color" opacity={0.3} />
      <Sheet.Frame bg="$background" rounded="$6" borderWidth={1} borderColor="$borderStrong" p="$4">
        {/* Header */}
        <YStack gap="$2" mb="$4">
          <XStack items="center" gap="$2">
            <Sparkles size={24} color="$primary" />
            <H3 fontWeight="700" color="$color">
              {t("goals.preview_title")}
            </H3>
          </XStack>
          <Text fontSize={14} color="$color" opacity={0.7}>
            {t("goals.preview_subtitle")}
          </Text>
        </YStack>

        {isLoading ? (
          <YStack items="center" py="$6" gap="$3">
            <Spinner size="large" color="$primary" />
            <Text color="$color" opacity={0.6}>
              {t("goals.generating_plan")}
            </Text>
          </YStack>
        ) : sessions.length === 0 ? (
          <YStack items="center" py="$6">
            <Text color="$color" opacity={0.6}>
              {t("goals.preview_empty")}
            </Text>
          </YStack>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 400 }}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <YStack gap="$4">
              {Array.from(sessionsByWeek.entries()).map(([weekNum, weekSessions]) => (
                <YStack key={weekNum} gap="$2">
                  <Text fontWeight="700" fontSize={14} color="$color" opacity={0.6} ml="$1">
                    {t("goals.preview_week", { week: weekNum })}
                  </Text>
                  {weekSessions.map((session) => (
                    <Card
                      key={`${session.weekNumber}-${session.dayOfWeek}-${session.quest.id}`}
                      bg={DAY_COLORS[session.dayOfWeek % DAY_COLORS.length] as DayColor}
                      width="100%"
                      px="$3"
                      py="$3"
                    >
                      <XStack items="center" gap="$3">
                        <Calendar size={20} color="$color" />
                        <YStack flex={1}>
                          <Text fontWeight="700" fontSize={16} color="$color">
                            {language === "fr" ? session.quest.frTitle : session.quest.enTitle}
                          </Text>
                          <Text fontSize={12} color="$color" opacity={0.7}>
                            {formatDate(session.scheduledDate)}
                          </Text>
                        </YStack>
                        <Text fontWeight="700" fontSize={12} color="$color" opacity={0.6}>
                          {session.quest.exercises.length} {t("common.exercises_short")}
                        </Text>
                      </XStack>
                    </Card>
                  ))}
                </YStack>
              ))}
            </YStack>
          </ScrollView>
        )}

        {/* Action Buttons */}
        <XStack gap="$3" mt="$4">
          <Button
            flex={1}
            size="$5"
            bg="$bgLight"
            borderWidth={1}
            borderColor="$borderStrong"
            onPress={onRegenerate}
            rounded="$6"
            disabled={isLoading}
            opacity={isLoading ? 0.5 : 1}
            icon={<RefreshCw size={18} color="$color" />}
          >
            <Text fontWeight="700" color="$color" fontSize={14}>
              {t("goals.preview_regenerate")}
            </Text>
          </Button>
          <Button
            flex={1}
            size="$5"
            bg="$primary"
            borderWidth={1}
            borderColor="$borderStrong"
            onPress={onConfirm}
            rounded="$6"
            disabled={isLoading || sessions.length === 0}
            opacity={isLoading || sessions.length === 0 ? 0.5 : 1}
          >
            <Text fontWeight="700" color="$text" fontSize={14}>
              {t("goals.preview_confirm")}
            </Text>
          </Button>
        </XStack>
      </Sheet.Frame>
    </Sheet>
  );
}

export const PlanPreviewSheet = memo(PlanPreviewSheetComponent);
