import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Skull } from "@/components/icons";
import { formatHold } from "@/components/journal/journalFormat";
import {
  NBar,
  NBlock,
  NButton,
  NFact,
  NImage,
  NKicker,
  NKickerQuiet,
  NMuted,
  NNum,
  NPanel,
  NText,
} from "@/components/journal/nocturne";
import { ReportHero } from "@/components/journal/QuestLog";
import { getBossAsset, getExerciseThumb } from "@/constants/assetMap";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import type { CompletedSession } from "@/db/completed";
import type { KillReport as KillReportData } from "@/db/journal";
import { BUILDING_LABELS } from "@/db/village";
import type { Localized } from "@/src/i18n/deviceLanguage";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

const HURT_FILLS = ["$resourceGold", "$gold600", "$gold700", "$gold800"] as const;
const HURT_SHOWN = 4;

const pick = (text: Localized, language: AppLanguage) => text[language] || text.en;
const number = (language: AppLanguage, value: number) =>
  new Intl.NumberFormat(language).format(Math.round(value));

function LastBlow({ blow }: { blow: NonNullable<KillReportData["lastBlow"]> }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const health = number(language, blow.healthBefore);
  let what = blow.name ? pick(blow.name, language) : t("journal.last_blow_campaign");
  if (blow.name && blow.value != null) {
    const movement = pick(blow.name, language);
    what =
      blow.type === "time"
        ? t("journal.last_blow_hold", { movement, value: formatHold(blow.value) })
        : t("journal.last_blow_reps", { movement, count: blow.value });
  }

  return (
    <YStack mt={11}>
      <NPanel>
        <XStack items="center" gap={11}>
          {blow.imagePath ? <NImage source={getExerciseThumb(blow.imagePath)} size={44} /> : null}
          <YStack flex={1}>
            <NKicker>{t("journal.last_blow")}</NKicker>
            <NText fontSize={15} mt={3}>
              {what}
            </NText>
            <NMuted mt={1}>
              {blow.roundIndex == null
                ? t("journal.last_blow_health", { health })
                : t("journal.last_blow_round", { round: blow.roundIndex + 1, health })}
            </NMuted>
          </YStack>
        </XStack>
      </NPanel>
    </YStack>
  );
}

function WhatHurtIt({ report }: { report: KillReportData }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const hurt = report.hurt.slice(0, HURT_SHOWN);
  const maxHurt = hurt[0]?.damage || 1;
  const hurtName = (name: Localized | null) =>
    name ? pick(name, language) : t("journal.hurt_campaign");

  return (
    <NBlock mt={6} testID="journal-hurt">
      <XStack justify="space-between" items="baseline">
        <NKickerQuiet>{t("journal.hurt_title")}</NKickerQuiet>
        <NMuted fontSize={11}>
          {t("journal.hurt_meta", { total: number(language, report.pool) })}
        </NMuted>
      </XStack>
      <YStack gap={11} mt={11}>
        {hurt.map((entry, index) => (
          <YStack key={String(entry.exerciseId)} gap={5}>
            <XStack justify="space-between" items="baseline">
              <NText fontSize={12.5} lineHeight={17}>
                {hurtName(entry.name)}
              </NText>
              <NText fontSize={12.5} lineHeight={17}>
                <NNum fontSize={12.5}>{number(language, entry.damage)}</NNum>
                <NMuted fontSize={11}>
                  {" "}
                  {Math.round((entry.damage / (report.pool || 1)) * 100)} %
                </NMuted>
              </NText>
            </XStack>
            <NBar
              progress={(entry.damage / maxHurt) * 100}
              height={6}
              fill={HURT_FILLS[index] ?? "$gold800"}
            />
          </YStack>
        ))}
      </YStack>
      <NMuted fontSize={11.5} lineHeight={17} mt={11}>
        {t("journal.hurt_note")}
      </NMuted>
    </NBlock>
  );
}

/**
 * The session that felled a boss, told as a report rather than a receipt: the painting of the thing
 * it killed, the health it had, the blow that ended it, what hurt it, and what it left.
 *
 * The one page of the Journal allowed to be epic, and it does it with a painting and a sentence:
 * the gold is already the page's one accent, so it cannot also be the celebration.
 */
export function KillReport({
  report,
  session,
}: {
  report: KillReportData;
  session: CompletedSession;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const felled = getDateTimeFormat(language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(report.felledAt);

  return (
    <YStack testID="journal-kill-report">
      <ReportHero
        source={report.bossImagePath ? getBossAsset(report.bossImagePath, 0, "defeated") : null}
        height={240}
      >
        <XStack items="center" gap={6}>
          <Skull size={15} color="$resourceGold" strokeWidth={2.5} />
          <NKicker>{t("journal.felled_on", { date: felled })}</NKicker>
        </XStack>
        <NText fontWeight="500" fontSize={28} lineHeight={34} mt={6}>
          {pick(report.title, language)}
        </NText>
        <NMuted fontSize={12.5} mt={2}>
          {t("journal.kill_adventure", {
            count: report.steps,
            days: t("journal.kill_days", { count: report.days }),
          })}
        </NMuted>
      </ReportHero>

      <YStack px={11}>
        <YStack pt={11}>
          <XStack justify="space-between" items="baseline">
            <NKickerQuiet>{t("journal.health_title")}</NKickerQuiet>
            <NNum fontSize={12}>0 / {number(language, report.pool)}</NNum>
          </XStack>
          <YStack
            height={7}
            mt={8}
            rounded={4}
            bg="$ink900"
            borderWidth={1}
            borderColor="$ink800"
          />
          <NMuted fontSize={11} mt={6}>
            {t("journal.health_emptied", { count: report.steps })}
          </NMuted>
        </YStack>

        {report.lastBlow ? <LastBlow blow={report.lastBlow} /> : null}

        {report.hurt.length > 0 ? <WhatHurtIt report={report} /> : null}

        <NBlock mt={6} gap={11} testID="journal-left">
          <NKickerQuiet>{t("journal.left_title")}</NKickerQuiet>
          <NFact>
            <NText fontSize={13.5} lineHeight={19}>
              {t("journal.left_lair", { building: BUILDING_LABELS.dragon_lair[language] })}
            </NText>
          </NFact>
          <NFact>
            <NText fontSize={13.5} lineHeight={19}>
              {t("journal.moved_xp", { xp: report.xpSession })}
              <NMuted fontSize={13.5}>
                {" · "}
                {t("journal.left_xp_run", { total: number(language, report.xpRun) })}
              </NMuted>
            </NText>
          </NFact>
          <NFact tone="quiet">
            <NMuted fontSize={13.5} lineHeight={19}>
              {t("journal.left_victories", { count: report.victories })}{" "}
              {report.nextBoss
                ? t("journal.left_next", { boss: pick(report.nextBoss, language) })
                : t("journal.left_all")}
            </NMuted>
          </NFact>
        </NBlock>

        <YStack py={17} gap={8}>
          <NButton
            testID="journal-cta-boss"
            variant="primary"
            block
            minH={48}
            onPress={() => router.push(`/adventures/${report.adventureId}` as never)}
          >
            {t("journal.cta_boss")}
          </NButton>
          <NMuted fontSize={11} style={{ textAlign: "center" }}>
            {t("journal.cta_boss_note")}
          </NMuted>
        </YStack>
        {session.notes ? (
          <NBlock mb={17}>
            <NKickerQuiet>{t("journal.notes")}</NKickerQuiet>
            <NText mt={6} fontSize={13.5} lineHeight={20}>
              {session.notes}
            </NText>
          </NBlock>
        ) : null}
      </YStack>
    </YStack>
  );
}
