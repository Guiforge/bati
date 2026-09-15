import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Skull } from "@/components/icons";
import { NBlock, NImage, NMuted, NPage, NText } from "@/components/journal/nocturne";
import { getBossAsset } from "@/constants/assetMap";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { type BossKill, getBossKills } from "@/db/journal";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * Every boss felled, newest first, each opening its report. The Village keeps what rises from
 * them; the Journal keeps the reports, dated, beside the sessions that did it.
 */
export default function BossesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const [kills, setKills] = useState<BossKill[] | null>(null);

  useEffect(() => {
    getBossKills()
      .then(setKills)
      .catch((error) => reportError("journal.bosses", error));
  }, []);

  const date = (at: Date) =>
    getDateTimeFormat(language, { day: "numeric", month: "long", year: "numeric" }).format(at);

  return (
    <NPage title={t("journal.bosses_title")} testID="journal-bosses">
      {kills?.length === 0 && <NMuted>{t("journal.bosses_empty")}</NMuted>}
      <YStack gap={6}>
        {kills?.map((kill, index) => (
          <NBlock
            // biome-ignore lint/suspicious/noArrayIndexKey: a rematch repeats the adventure id
            key={`${kill.adventureId}:${index}`}
            testID="journal-boss-row"
            onPress={
              kill.sessionId == null
                ? undefined
                : () => router.push(`/journal/${kill.sessionId}` as never)
            }
          >
            <XStack items="center" gap={11}>
              <NImage source={getBossAsset(kill.imagePath ?? "", 0, "defeated")} size={48} round />
              <YStack flex={1}>
                <NText fontWeight="500" fontSize={15}>
                  {kill.title[language] || kill.title.en}
                </NText>
                <XStack items="center" gap={5}>
                  <Skull size={12} color="$resourceGold" />
                  <NMuted>{t("journal.felled_on", { date: date(kill.felledAt) })}</NMuted>
                </XStack>
              </YStack>
            </XStack>
          </NBlock>
        ))}
      </YStack>
    </NPage>
  );
}
