import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { formatShare } from "@/components/journal/journalFormat";
import {
  NBar,
  NBlock,
  NKickerQuiet,
  NMuted,
  NNum,
  NRule,
  NText,
} from "@/components/journal/nocturne";
import { MIN_BALANCE_SESSIONS, workVerdict } from "@/components/journal/stats/workVerdict";
import {
  getMuscleBalance,
  getPatternBalance,
  getPullDeficit,
  type MuscleBalance,
  type PatternBalance,
} from "@/db/muscleBalance";
import { formatCount } from "@/db/targets";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * The thirty days' balance in full: one verdict, the stats page's own sentence, then every muscle's
 * share, then the pull deficit that only movement patterns can see. Nocturne blocks, like the rest
 * of the Journal. The old card said "Needs Work" three ways, under a drop shadow, on a page that
 * measured 24 ms a frame beside Lifetime's 16.
 */
export function MuscleBalanceCard() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const [balance, setBalance] = useState<MuscleBalance | null>(null);
  const [patterns, setPatterns] = useState<PatternBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Two views of the same 30 days: muscles say *what* was worked, patterns say what the body
    // was *doing*, and only the second can see a pull deficit.
    Promise.all([getMuscleBalance("30d"), getPatternBalance("30d")])
      .then(([muscles, byPattern]) => {
        setBalance(muscles);
        setPatterns(byPattern);
      })
      // A card that fails to load looks exactly like a card with nothing to show.
      .catch((error) => reportError("journal.muscleBalance", error))
      .finally(() => setIsLoading(false));
  }, []);

  // The place the block will take, and nothing in it: a loading card says nothing about the hero.
  if (isLoading) return <NBlock minH={220}>{null}</NBlock>;

  const header = (
    <XStack items="baseline" justify="space-between" gap={8}>
      <NKickerQuiet>{t("journal.work_title")}</NKickerQuiet>
      <NMuted fontSize={11}>{t("journal.lifetime_30")}</NMuted>
    </XStack>
  );

  if (!balance || balance.totalVolume === 0) {
    return (
      <NBlock gap={8}>
        {header}
        <NText fontSize={13.5} lineHeight={19}>
          {t("chart.complete_more")}
        </NText>
      </NBlock>
    );
  }

  const verdict = workVerdict(t, language, balance);
  // Three sessions before the bars too: one quest's shape drawn as six shares is a verdict in
  // pictures, and the sentence has just said it is too early for one.
  if (balance.totalSessions < MIN_BALANCE_SESSIONS) {
    return (
      <NBlock gap={8}>
        {header}
        <NText fontSize={13.5} lineHeight={19}>
          {verdict.text}
        </NText>
      </NBlock>
    );
  }

  const maxVolume = Math.max(...balance.muscles.map((m) => m.volume));
  const pullDeficit = patterns ? getPullDeficit(patterns) : null;

  return (
    <NBlock gap={11}>
      {header}
      <NText fontSize={13.5} lineHeight={19}>
        {verdict.text}
      </NText>

      <YStack gap={8}>
        {balance.muscles.map((m) => {
          const weak = balance.weakAreas.includes(m.muscle);
          const share = formatShare(language, m.percentage);
          return (
            // One label for the row: the bar is drawn against the biggest muscle, and read on its
            // own it announced "100%" beside a share of 36.
            <XStack
              key={m.muscle}
              items="center"
              gap={8}
              accessible
              accessibilityLabel={`${m.label[language]} ${share}`}
            >
              <NText
                width={84}
                fontSize={12.5}
                lineHeight={17}
                numberOfLines={1}
                color={weak ? "$resourceGold" : "$text"}
              >
                {m.label[language]}
              </NText>
              <YStack flex={1}>
                <NBar
                  progress={maxVolume > 0 ? (m.volume / maxVolume) * 100 : 0}
                  height={6}
                  fill={weak ? "$resourceGold" : "$gold700"}
                />
              </YStack>
              <NNum width={44} fontSize={12.5} lineHeight={17} style={{ textAlign: "right" }}>
                {share}
              </NNum>
            </XStack>
          );
        })}
      </YStack>

      {/* The bars cannot show these either, for a blunter reason: an exercise with no muscle
          tags joins to nothing. Reporting the smaller total in silence is the same lie a
          loading state tells when it renders a zero. */}
      {balance.unclassifiedResults > 0 ? (
        <NMuted>{t("journal.unclassified_volume", { count: balance.unclassifiedResults })}</NMuted>
      ) : null}

      {/* The muscle bars above cannot show this: a row and a push-up both count as "arms". */}
      {pullDeficit ? (
        <YStack>
          <NRule my={0} />
          <NText mt={11} fontWeight="500" fontSize={13.5} lineHeight={19}>
            {t("journal.pull_deficit_title")}
          </NText>
          <NMuted mt={2}>
            {t("journal.pull_deficit_body", {
              pull: formatCount(language, pullDeficit.pullVolume),
              push: formatCount(language, pullDeficit.pushVolume),
            })}
          </NMuted>
        </YStack>
      ) : null}
    </NBlock>
  );
}
