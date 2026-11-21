import { useTranslation } from "react-i18next";
import { shortDate } from "@/components/journal/journalFormat";
import { NBlock, NKickerQuiet, NMuted, NNum } from "@/components/journal/nocturne";
import { formatDistance } from "@/constants/distanceFormat";
import type { QuestStanding } from "@/db/journal";
import { formatCount } from "@/db/targets";
import { useSettingsStore } from "@/stores/settings";

/**
 * The hero's own past for this quest, said in words: the gap to their best first, never a rank.
 * A bad day used to open on a huge "#16 of 16", which read as a verdict; the journal keeps the
 * rank and the bars, the victory screen says how far from the best and nothing louder.
 */
export function VictoryStanding({ standing }: { standing: QuestStanding }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const best = standing.values[0] ?? standing.mine;
  const show = (v: number) =>
    standing.unit === "metres"
      ? formatDistance(v, distanceUnit, language)
      : formatCount(language, v);
  const gap = t("session.standing_gap", {
    gap: show(best - standing.mine),
    value: show(best),
    date: shortDate(language, standing.bestAt),
  });
  const tied = best === standing.mine;
  const lowest = !tied && standing.rank === standing.outOf;

  const lead =
    standing.rank === 1
      ? t("session.standing_new_best")
      : tied
        ? t("session.standing_equal")
        : lowest
          ? t("session.standing_lowest", { total: standing.outOf })
          : gap;

  return (
    <NBlock testID="victory-standing-text" mt={6}>
      <NKickerQuiet>{t("journal.sits_title")}</NKickerQuiet>
      <NNum fontSize={22} lineHeight="28px" mt={8}>
        {lead}
      </NNum>
      {lowest ? <NMuted fontSize={12}>{gap}</NMuted> : null}
    </NBlock>
  );
}
