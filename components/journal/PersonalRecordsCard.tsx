import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { Clock, Footprints, Map as MapIcon, Star, Trophy } from "@/components/icons";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { formatDistance } from "@/constants/distanceFormat";
import { formatDuration } from "@/db/estimate";
import {
  getMovementRecords,
  getPersonalRecordsSummary,
  type MovementRecord,
  type PersonalRecord,
} from "@/db/personalRecords";
import { formatTarget } from "@/db/targets";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

type RecordsSummary = {
  longestSession: PersonalRecord | null;
  mostXp: PersonalRecord | null;
  longestOuting: PersonalRecord | null;
  totalLeaguesM: number;
  totalSessions: number;
};

function RecordItem({
  icon,
  label,
  value,
  subLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subLabel?: string;
}) {
  return (
    <YStack
      bg="$background"
      p="$3"
      rounded="$4"
      borderWidth={1}
      borderColor="$borderStrong"
      flex={1}
      items="center"
      gap="$1"
    >
      {icon}
      <Text fontSize={11} color="$text" opacity={0.6} style={{ textAlign: "center" }}>
        {label}
      </Text>
      <Text fontWeight="700" fontSize={18} color="$text" style={{ textAlign: "center" }}>
        {value}
      </Text>
      {!!subLabel && (
        <Text fontSize={10} color="$text" opacity={0.5} style={{ textAlign: "center" }}>
          {subLabel}
        </Text>
      )}
    </YStack>
  );
}

export function PersonalRecordsCard() {
  const { t } = useTranslation();
  const unit = useSettingsStore((s) => s.distanceUnit);
  const language = useSettingsStore((s) => s.language);
  const [summary, setSummary] = useState<RecordsSummary | null>(null);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // The streak is not read here any more: "Best 1092" beside a current streak of 1092 was
        // the card comparing a number to itself, and the flame card above already carries both.
        const [data, wall] = await Promise.all([getPersonalRecordsSummary(), getMovementRecords()]);
        setSummary(data);
        setMovements(wall);
      } catch (error) {
        // A card that failed to load looks exactly like a card with nothing to show.
        reportError("journal.personalRecords", error);
      } finally {
        setIsLoading(false);
      }
    }
    load().catch(() => {
      // Error already handled
    });
  }, []);

  if (isLoading) {
    return (
      <SkeletonCard>
        <Skeleton height={132} />
      </SkeletonCard>
    );
  }

  // `totalSessions` counts *training* since 0049, so a hero who only ever walks reads zero here
  // and would lose the whole card — including the two tiles that are about their walking. The
  // question is whether there is anything to show, not whether they lifted.
  if (!summary || (summary.totalSessions === 0 && summary.longestOuting === null)) {
    return null;
  }

  const longestDuration = summary.longestSession
    ? formatDuration(summary.longestSession.value)
    : "--";
  const mostXp = summary.mostXp ? `${summary.mostXp.value}` : "--";

  return (
    <Card bg="$bgLight">
      <YStack gap="$3">
        <XStack items="center" gap="$2">
          <Trophy size={18} color="$primaryText" />
          <Text fontWeight="700" fontSize={16} color="$text">
            {t("journal.personal_records")}
          </Text>
        </XStack>

        {/* What can still be beaten, before what cannot.
            Every record under this one is about a *session*: its length, its XP, the longest
            walk. A hero settles those in the first month and they never move again, which is how
            a journal with three years in it grows a records card nobody opens. A movement's best
            moves, there is one for every movement, and it names something to do tomorrow. */}
        {movements.length > 0 && (
          <YStack gap="$2">
            {movements.map((record) => (
              <XStack key={`${record.exerciseId}:${record.type}`} items="baseline" gap="$2">
                <Text flex={1} fontSize={14} fontWeight="700" color="$text" numberOfLines={1}>
                  {localizedName(record, language)}
                </Text>
                <Text fontSize={15} fontWeight="700" color="$resourceGold">
                  {formatTarget({ type: record.type, value: record.best })}
                </Text>
                {record.last < record.best ? (
                  <Text fontSize={12} color="$textSecondary">
                    {t("session.ghost_last_label", "Last time")}{" "}
                    {formatTarget({ type: record.type, value: record.last })}
                  </Text>
                ) : (
                  <Text fontSize={12} color="$textSecondary">
                    {getDateTimeFormat(language, { day: "numeric", month: "short" }).format(
                      record.at,
                    )}
                  </Text>
                )}
              </XStack>
            ))}
          </YStack>
        )}

        <XStack gap="$2">
          <RecordItem
            icon={<Clock size={20} color="$secondary" />}
            label={t("journal.pr_longest")}
            value={longestDuration}
          />
          <RecordItem
            icon={<Star size={20} color="$pastelYellow" />}
            label={t("journal.pr_most_xp")}
            value={mostXp}
            subLabel={t("common.xp")}
          />
        </XStack>

        {/* Only once there is ground: two "--" tiles would tell a hero who lifts that they are
            missing something, and the band on Home already offers the door. The record is the
            guard rather than the total, because the two come from one snapshot and a positive
            sum of a never-negative column always has a positive maximum: guarding on the total
            left the tile a `"--"` arm nothing could ever reach. */}
        {summary.longestOuting ? (
          <XStack gap="$2">
            <RecordItem
              icon={<Footprints size={20} color="$primaryText" />}
              label={t("journal.pr_ground")}
              value={formatDistance(summary.totalLeaguesM, unit)}
            />
            <RecordItem
              icon={<MapIcon size={20} color="$secondary" />}
              label={t("journal.pr_longest_outing")}
              value={formatDistance(summary.longestOuting.value, unit)}
            />
          </XStack>
        ) : null}
      </YStack>
    </Card>
  );
}
