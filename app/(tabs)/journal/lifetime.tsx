import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { formatCount, formatHoursMinutes, shortDate } from "@/components/journal/journalFormat";
import { NKicker, NMuted, NNum, NPage, NRule, NText } from "@/components/journal/nocturne";
import { formatDistance } from "@/constants/distanceFormat";
import {
  getBossKills,
  getPeriodFigures,
  getRecordsStanding,
  getSessionBests,
  type PeriodFigures,
  type SessionBest,
} from "@/db/journal";
import { type FlameDetail, getFlameDetail } from "@/db/streaks";
import type { Localized } from "@/src/i18n/deviceLanguage";
import { reportError } from "@/src/reportError";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

const DAY_MS = 24 * 60 * 60 * 1000;

type Lifetime = {
  all: PeriodFigures;
  last30: PeriodFigures;
  standing: number;
  bossesAll: number;
  bosses30: number;
  flame: FlameDetail;
  bests: Awaited<ReturnType<typeof getSessionBests>>;
};

async function loadLifetime(): Promise<Lifetime> {
  const now = new Date();
  const since = new Date(now.getTime() - 30 * DAY_MS);
  const [all, last30, standing, kills, flame, bests] = await Promise.all([
    getPeriodFigures(null, now),
    getPeriodFigures(since, now),
    getRecordsStanding(),
    getBossKills(),
    getFlameDetail(now),
    getSessionBests(),
  ]);
  return {
    all,
    last30,
    standing,
    bossesAll: kills.length,
    bosses30: kills.filter((k) => k.felledAt >= since).length,
    flame,
    bests,
  };
}

const number = formatCount;

function Row({
  label,
  note,
  all,
  recent,
}: {
  label: string;
  note?: string;
  all: string;
  recent: string;
}) {
  return (
    <YStack>
      <XStack py={6} px={6} items="center" gap={8}>
        <YStack flex={1}>
          <NText fontSize={14} lineHeight={20}>
            {label}
          </NText>
          {note ? (
            <NMuted fontSize={10.5} lineHeight={14}>
              {note}
            </NMuted>
          ) : null}
        </YStack>
        <NNum width={76} fontSize={14} style={{ textAlign: "right" }}>
          {all}
        </NNum>
        <NNum width={76} fontSize={14} style={{ textAlign: "right" }}>
          {recent}
        </NNum>
      </XStack>
      <NRule my={0} />
    </YStack>
  );
}

/**
 * Every figure the Journal shows, with the period it covers and how it is counted: the drawer the
 * old stats tab spread over five screens of cards. Two columns rather than two pages, so the same
 * number over all time and over thirty days are read side by side and cannot count differently.
 */
export default function LifetimeScreen() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const [data, setData] = useState<Lifetime | null>(null);

  useEffect(() => {
    loadLifetime()
      .then(setData)
      .catch((error) => reportError("journal.lifetime", error));
  }, []);

  const date = (at: Date) => shortDate(language, at);
  const hoursAndMinutes = (seconds: number) => formatHoursMinutes(t, seconds);
  const title = (best: SessionBest) =>
    best.questTitle ? pick(best.questTitle, language) : t("journal.own_quest");

  return (
    <NPage title={t("journal.lifetime_title")} testID="journal-lifetime">
      <NMuted fontSize={13.5} lineHeight={20} pb={11}>
        {t("journal.lifetime_intro")}
      </NMuted>
      {data ? (
        <>
          <XStack px={6} py={6}>
            <NMuted
              flex={1}
              fontSize={11}
              letterSpacing={0.9}
              style={{ textTransform: "uppercase" }}
            >
              {t("journal.lifetime_figure")}
            </NMuted>
            <NMuted
              width={76}
              fontSize={11}
              letterSpacing={0.9}
              style={{ textAlign: "right", textTransform: "uppercase" }}
            >
              {t("journal.lifetime_all")}
            </NMuted>
            <NMuted
              width={76}
              fontSize={11}
              letterSpacing={0.9}
              style={{ textAlign: "right", textTransform: "uppercase" }}
            >
              {t("journal.lifetime_30")}
            </NMuted>
          </XStack>
          <NRule my={0} />
          <Row
            label={t("journal.row_quests")}
            all={number(language, data.all.quests)}
            recent={number(language, data.last30.quests)}
          />
          <Row
            label={t("journal.row_outings")}
            all={number(language, data.all.outings)}
            recent={number(language, data.last30.outings)}
          />
          <Row
            label={t("journal.row_reps")}
            note={t("journal.row_reps_note")}
            all={number(language, data.all.reps)}
            recent={number(language, data.last30.reps)}
          />
          <Row
            label={t("journal.row_ground")}
            note={t("journal.row_ground_note")}
            all={formatDistance(data.all.leaguesM, distanceUnit, language)}
            recent={formatDistance(data.last30.leaguesM, distanceUnit, language)}
          />
          <Row
            label={t("journal.row_time")}
            all={hoursAndMinutes(data.all.questSeconds)}
            recent={hoursAndMinutes(data.last30.questSeconds)}
          />
          {/* An outing's time is its own row: a walker could not find her hours outside anywhere. */}
          {data.all.outings > 0 ? (
            <Row
              label={t("journal.row_outside")}
              note={t("journal.row_outside_note")}
              all={hoursAndMinutes(data.all.outingSeconds)}
              recent={hoursAndMinutes(data.last30.outingSeconds)}
            />
          ) : null}
          <Row
            label={t("journal.row_xp")}
            all={number(language, data.all.xp)}
            recent={number(language, data.last30.xp)}
          />
          <Row
            label={t("journal.row_records")}
            all={number(language, data.standing)}
            recent={t("journal.row_records_new", { count: data.last30.records })}
          />
          <Row
            label={t("journal.row_bosses")}
            all={number(language, data.bossesAll)}
            recent={number(language, data.bosses30)}
          />
          <Row
            label={t("journal.row_days_lit")}
            note={
              data.flame.best > 0
                ? t("journal.row_days_lit_note", { count: data.flame.best })
                : undefined
            }
            all={number(language, data.flame.litDays)}
            recent={number(language, data.flame.litDaysLast30)}
          />

          <YStack pt={22} gap={11}>
            <NKicker>{t("journal.session_records")}</NKicker>
            {(
              [
                ["sr_longest", data.bests.longest, (v: number) => `${Math.round(v / 60)} min`],
                ["sr_most_xp", data.bests.mostXp, (v: number) => number(language, v)],
                ["sr_most_reps", data.bests.mostReps, (v: number) => number(language, v)],
                [
                  "sr_longest_outing",
                  data.bests.longestOuting,
                  (v: number) => formatDistance(v, distanceUnit, language),
                ],
              ] as const
            )
              // The outing record only for a hero who has been out: "none yet" is noise otherwise.
              .filter(([key]) => key !== "sr_longest_outing" || data.all.outings > 0)
              .map(([key, best, format]) => (
                <XStack key={key} justify="space-between" items="baseline" gap={8}>
                  <NText fontSize={13.5} lineHeight={19}>
                    {t(`journal.${key}`)}
                  </NText>
                  {best ? (
                    <NText
                      fontSize={13.5}
                      lineHeight={19}
                      style={{ flexShrink: 1, textAlign: "right" }}
                    >
                      <NNum fontSize={13.5}>{format(best.value)}</NNum>
                      <NMuted fontSize={12}>
                        {" · "}
                        {t("journal.sr_detail", { title: title(best), date: date(best.at) })}
                      </NMuted>
                    </NText>
                  ) : (
                    <NMuted fontSize={12}>{t("journal.fig_no_record")}</NMuted>
                  )}
                </XStack>
              ))}
          </YStack>
        </>
      ) : null}
    </NPage>
  );
}

function pick(text: Localized, language: AppLanguage): string {
  return text[language] || text.en;
}
