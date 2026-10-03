import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { ChevronRight, Skull } from "@/components/icons";
import { NBlock, NImage, NKicker, NMuted, NPage, NText } from "@/components/journal/nocturne";
import { getBossAsset } from "@/constants/assetMap";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { type BossKill, getBossKills, getStandingBosses, type StandingBoss } from "@/db/journal";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * Every boss felled, newest first, each opening its report. The Village keeps what rises from
 * them; the Journal keeps the reports, dated, beside the sessions that did it. Under them, the
 * ones still standing as silhouettes, each opening its campaign: a shelf with nothing on it was a
 * dead end for a hero who has felled nothing yet.
 */
export default function BossesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const [kills, setKills] = useState<BossKill[] | null>(null);

  const [standing, setStanding] = useState<StandingBoss[]>([]);

  useEffect(() => {
    getBossKills()
      .then(setKills)
      .catch((error) => reportError("journal.bosses", error));
    getStandingBosses()
      .then(setStanding)
      .catch((error) => reportError("journal.bosses.standing", error));
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
              {/* A kill logged before its session was linked has no report to open. */}
              {kill.sessionId == null ? null : <ChevronRight size={18} color="$textSecondary" />}
            </XStack>
          </NBlock>
        ))}
      </YStack>
      {standing.length > 0 && (
        <YStack gap={6} mt={kills?.length ? 11 : 0}>
          <NKicker>{t("journal.bosses_standing")}</NKicker>
          {standing.map((boss) => (
            <NBlock
              key={boss.adventureId}
              testID="journal-boss-standing"
              accessibilityLabel={boss.title[language] || boss.title.en}
              onPress={() => router.push(`/adventures/${boss.adventureId}` as never)}
            >
              <XStack items="center" gap={11}>
                {/* The painting nearly dark: a shape, not a name. */}
                <YStack opacity={0.15}>
                  <NImage source={getBossAsset(boss.imagePath ?? "", 0)} size={48} round />
                </YStack>
                <NText flex={1} fontWeight="500" fontSize={15} color="$textSecondary">
                  ?
                </NText>
                <ChevronRight size={18} color="$textSecondary" />
              </XStack>
            </NBlock>
          ))}
        </YStack>
      )}
    </NPage>
  );
}
