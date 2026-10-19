import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { AppText } from "@/components/common/AppText";
import {
  formatClock,
  formatDistance,
  formatElevation,
  formatRate,
} from "@/constants/distanceFormat";
import type { DistanceUnit } from "@/db/preferences";
import type { Locomotion } from "@/db/schema";
import { useRateKind } from "@/hooks/useRateKind";
import type { Split } from "@/src/gps/trace";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { useSettingsStore } from "@/stores/settings";

const NUMS = { fontVariant: ["tabular-nums" as const] };

/**
 * League by league, in moving time. The quickest full league is gold and carries a word, so the
 * highlight is not colour alone. A league stays 1 km in miles; only the rate changes unit.
 * Hidden under one full league.
 */
export function LeaguesTable({
  splits,
  unit,
  locomotion = null,
}: {
  splits: readonly Split[];
  unit: DistanceUnit;
  /** `undefined` while the row is still being read. */
  locomotion?: Locomotion | null;
}) {
  const { t } = useTranslation();
  const language: AppLanguage = useSettingsStore((s) => s.language);
  const rate = useRateKind(locomotion);
  if (!splits.some((s) => s.metres >= 1000)) return null;
  const withClimb = splits.some((s) => s.climbM !== null);

  const cell = (text: string, opts: { gold?: boolean; flex?: number; end?: boolean } = {}) => (
    <AppText
      flex={opts.flex ?? 1}
      fontSize={13}
      fontWeight={opts.gold ? "700" : "400"}
      color={opts.gold ? "$resourceGold" : "$text"}
      style={{ ...NUMS, textAlign: opts.end ? "right" : "left" }}
      numberOfLines={1}
    >
      {text}
    </AppText>
  );

  return (
    <YStack gap="$1" testID="recap-leagues">
      <AppText fontSize={11} letterSpacing={2} color="$textSecondary" textTransform="uppercase">
        {t("recap.leagues_title")}
      </AppText>
      <XStack gap="$2">
        {["#", t("session.expedition_moving"), t(`session.expedition_${rate}`)].map((label, i) => (
          <AppText
            key={label}
            flex={i === 0 ? 1.2 : 1}
            fontSize={11}
            color="$textSecondary"
            variant="label"
            numberOfLines={1}
            style={{ textAlign: i === 0 ? "left" : "right" }}
          >
            {label}
          </AppText>
        ))}
        {withClimb ? (
          <AppText
            flex={1}
            fontSize={11}
            color="$textSecondary"
            variant="label"
            numberOfLines={1}
            style={{ textAlign: "right" }}
          >
            {t("session.expedition_climb")}
          </AppText>
        ) : null}
      </XStack>
      {splits.map((split) => (
        <XStack key={split.league} gap="$2" items="center" testID={`recap-league-${split.league}`}>
          <XStack flex={1.2} gap="$1" items="center">
            {cell(
              split.metres >= 1000
                ? String(split.league)
                : formatDistance(split.metres, unit, language),
              { gold: split.best, flex: 0 },
            )}
            {split.best ? (
              <AppText
                testID="recap-league-best"
                fontSize={10}
                color="$resourceGold"
                variant="label"
                numberOfLines={1}
              >
                {t("recap.league_best")}
              </AppText>
            ) : null}
          </XStack>
          {cell(formatClock(split.movingMs), { gold: split.best, end: true })}
          {cell(formatRate(split.metres, split.movingMs, unit, language, rate), {
            gold: split.best,
            end: true,
          })}
          {withClimb
            ? cell(split.climbM === null ? "-" : formatElevation(split.climbM, unit), {
                gold: split.best,
                end: true,
              })
            : null}
        </XStack>
      ))}
      {unit === "imperial" ? (
        <AppText fontSize={11} color="$textSecondary">
          {t("outing_display.buzz_note")}
        </AppText>
      ) : null}
    </YStack>
  );
}
