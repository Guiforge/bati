import { LegendList } from "@legendapp/list/react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";
import {
  NImage,
  NMuted,
  NNum,
  NPageHeader,
  NRule,
  NStatusScrim,
  NText,
} from "@/components/journal/nocturne";
import { recordWhen } from "@/components/journal/stats/wall";
import { getExerciseThumb } from "@/constants/assetMap";
import { getMovementRecords, type MovementRecord } from "@/db/personalRecords";
import { formatSlotTarget } from "@/db/targets";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Every record standing, one row per movement and unit: the page behind "Records standing 62".
 * A tap opens the movement, where the last twelve sessions are drawn. Long (a veteran has 60 and
 * more), so the rows are recycled rather than all mounted.
 */
export default function RecordsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const [rows, setRows] = useState<MovementRecord[] | null>(null);
  const now = new Date();

  useEffect(() => {
    getMovementRecords(Number.MAX_SAFE_INTEGER)
      .then(setRows)
      .catch((error) => reportError("journal.records", error));
  }, []);

  return (
    <YStack testID="journal-records" flex={1} bg="bgDark">
      <LegendList
        data={rows ?? []}
        keyExtractor={(r) => `${r.exerciseId}:${r.type}`}
        renderItem={({ item }) => {
          const fresh = now.getTime() - item.bestAt.getTime() < WEEK_MS;
          const say = (value: number) =>
            formatSlotTarget({ target: { type: item.type, value }, exercise: item }, language);
          return (
            <YStack px={11}>
              <XStack
                testID="journal-records-row"
                onPress={() => router.push(`/exercises/${item.exerciseId}` as never)}
                accessibilityRole="button"
                items="center"
                gap={11}
                py={8}
                minH={56}
                opacity="1 press:0.85"
              >
                <NImage source={getExerciseThumb(item.imagePath)} size={44} />
                <YStack flex={1} minW={0}>
                  <NText fontWeight="500" fontSize={15} numberOfLines={1}>
                    {localizedName(
                      {
                        enName: item.enName,
                        frName: item.frName,
                        deName: item.deName,
                        esName: item.esName,
                        ruName: item.ruName,
                        zhName: item.zhName,
                      },
                      language,
                    )}
                  </NText>
                  <NMuted fontSize={12} numberOfLines={1}>
                    {t("journal.records_when", {
                      when: recordWhen(t, language, item.bestAt, now),
                      last: say(item.last),
                    })}
                  </NMuted>
                </YStack>
                <XStack items="center" gap={6}>
                  {fresh ? (
                    <YStack
                      testID="journal-records-fresh"
                      accessibilityLabel={t("journal.records_this_week")}
                      width={8}
                      height={8}
                      rounded={4}
                      bg="resourceGold"
                    />
                  ) : null}
                  <NNum fontSize={16} color="resourceGold">
                    {say(item.best)}
                  </NNum>
                </XStack>
              </XStack>
              <NRule my={0} />
            </YStack>
          );
        }}
        recycleItems
        estimatedItemSize={57}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <YStack px={11}>
            <NPageHeader
              title={t("journal.row_records")}
              onBack={() => router.back()}
              backLabel={t("common.go_back")}
            />
          </YStack>
        }
        ListEmptyComponent={
          rows ? (
            <NMuted px={11} fontSize={13.5} lineHeight="20px">
              {t("journal.records_empty")}
            </NMuted>
          ) : null
        }
      />
      <NStatusScrim />
    </YStack>
  );
}
