import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { LevelPips } from "@/components/village/LevelPips";
import { getAdventureAsset, getBuildingIconAsset } from "@/constants/assetMap";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { type FinishedAdventureSummary, listFinishedRunSummaries } from "@/db/adventures";
import { type ContributingSession, getRecentContributingSessions } from "@/db/completed";
import { MUSCLE_LABELS } from "@/db/muscles";
import { buildingDefinitions } from "@/db/schema";
import {
  BUILDING_LABELS,
  getBuildingProgress,
  type Trophy,
  type VillageBuilding,
} from "@/db/village";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { AppLanguage } from "@/stores/settings";

export type VillageSelection =
  | { kind: "building"; building: VillageBuilding }
  | { kind: "trophy"; trophy: Trophy };

type Props = {
  selected: VillageSelection | null;
  onClose: () => void;
  language: AppLanguage;
  bottomInset: number;
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

/** The detail sheet's second half: the deeds behind the number, fetched only when opened. */
type Extra =
  | { kind: "sessions"; sessions: ContributingSession[] }
  | { kind: "adventures"; adventures: FinishedAdventureSummary[] }
  | null;

async function loadExtra(selected: VillageSelection): Promise<Extra> {
  if (selected.kind === "trophy") {
    if (selected.trophy.kind !== "boss") return null;
    return { kind: "adventures", adventures: await listFinishedRunSummaries() };
  }

  const building = selected.building;

  // The hall is the village's record of finished campaigns, so it lists them.
  if (building.driver === "adventures") {
    return { kind: "adventures", adventures: await listFinishedRunSummaries() };
  }

  if (building.driver === "muscle" && building.relatedMuscle) {
    return {
      kind: "sessions",
      sessions: await getRecentContributingSessions({ muscle: building.relatedMuscle }),
    };
  }

  if (building.driver === "style") {
    const style = buildingDefinitions[building.code].relatedStyle;
    if (style) {
      return { kind: "sessions", sessions: await getRecentContributingSessions({ style }) };
    }
  }

  return null;
}

export function VillageDetailSheet({ selected, onClose, language, bottomInset }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [extra, setExtra] = useState<Extra>(null);
  // Held past the close so the content does not blank out mid slide-down.
  const [shown, setShown] = useState<VillageSelection | null>(selected);

  useEffect(() => {
    if (selected) setShown(selected);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;

    let cancelled = false;
    setExtra(null);
    loadExtra(selected)
      .then((value) => {
        if (!cancelled) setExtra(value);
      })
      .catch(() => {
        // The headline already answers "why this level"; the deed list is a bonus.
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const formatDate = (date: Date) => getDateTimeFormat(language, DATE_OPTIONS).format(date);

  return (
    <Sheet
      modal
      open={selected !== null}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
      snapPointsMode="fit"
      dismissOnSnapToBottom
      transition={reducedMotion ? undefined : "quick"}
      zIndex={100_000}
    >
      <Sheet.Overlay
        bg="rgba(0,0,0,0.5)"
        transition={reducedMotion ? undefined : "quick"}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Handle bg="$borderStrong" />
      <Sheet.Frame bg="$surface">
        <YStack testID="village-detail" px="$4" pt="$4" pb={bottomInset + 16} gap="$4">
          {shown?.kind === "building" ? (
            <BuildingDetail
              building={shown.building}
              extra={extra}
              language={language}
              formatDate={formatDate}
            />
          ) : null}
          {shown?.kind === "trophy" ? (
            <TrophyDetail
              trophy={shown.trophy}
              extra={extra}
              language={language}
              formatDate={formatDate}
            />
          ) : null}

          <AppButton variant="outline" onPress={onClose}>
            {t("village.close", "Close")}
          </AppButton>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

type DetailProps = {
  extra: Extra;
  language: AppLanguage;
  formatDate: (date: Date) => string;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one branch per driver, flat — the alternative is seven near-identical components
function BuildingDetail({
  building,
  extra,
  language,
  formatDate,
}: DetailProps & { building: VillageBuilding }) {
  const { t } = useTranslation();
  const fr = language === "fr";
  const name = fr ? building.frName : building.enName;
  // Lower-cased mid-sentence, the way getBalanceRecommendation() writes muscles into prose.
  const muscleLabel = building.relatedMuscle
    ? (MUSCLE_LABELS[building.relatedMuscle]?.[fr ? "fr" : "en"].toLowerCase() ??
      building.relatedMuscle)
    : "";
  const style = buildingDefinitions[building.code].relatedStyle;
  const styleLabel = style ? t(`village.style_${style}`, style) : "";
  const prereqCode = buildingDefinitions[building.code].prerequisiteBuilding;
  const prereqName = prereqCode ? BUILDING_LABELS[prereqCode][fr ? "fr" : "en"] : "";

  // One sentence naming the deed that raises this building, in its own unit.
  const driverLine = (() => {
    switch (building.driver) {
      case "tier":
        return t("village.detail_tier_driver", { level: building.metricValue });
      case "muscle":
        return building.level === 0
          ? t("village.detail_unlock_muscle", { muscle: muscleLabel })
          : t("village.detail_muscle_driver", {
              volume: building.metricValue,
              muscle: muscleLabel,
            });
      case "style":
        return building.level === 0
          ? t("village.detail_unlock_style", { style: styleLabel })
          : t("village.detail_style_driver", { volume: building.metricValue, style: styleLabel });
      case "prereq":
        return building.level === 0
          ? t("village.detail_prereq_locked", {
              building: prereqName,
              target: building.nextTarget ?? 3,
              level: building.metricValue,
            })
          : t("village.detail_prereq_driver", {
              building: prereqName,
              level: building.metricValue,
            });
      case "adventures":
        return t("village.detail_adventures_driver", { count: building.metricValue });
      case "boss_victories":
        return t("village.detail_victories_driver", { count: building.metricValue });
      default:
        return t("village.detail_bosses_driver", { count: building.metricValue });
    }
  })();

  // Which buildings have something honest to count, and how far along: getBuildingProgress().
  // The village card shows the same bar, from the same call, so they cannot disagree.
  const progress = getBuildingProgress(building);
  const showProgress = progress !== null;

  // Levels are not a quantity you accumulate, so the upgrade tiers name the rung instead.
  const nextLine = (() => {
    if (building.nextTarget === null) return t("village.detail_max_level", "Maximum level");
    if (!showProgress) return null;
    if (building.driver === "prereq") {
      return building.level === 0
        ? null
        : t("village.detail_prereq_next", { building: prereqName, target: building.nextTarget });
    }
    if (building.driver === "tier") {
      return t("village.detail_tier_next", { target: building.nextTarget });
    }
    return t("village.detail_next_level", {
      remaining: Math.max(0, building.nextTarget - building.metricValue),
      level: building.level + 1,
    });
  })();

  return (
    <YStack gap="$4">
      <XStack items="center" gap="$3">
        <Image
          source={getBuildingIconAsset(building.code, building.relatedMuscle)}
          style={{ width: 48, height: 48 }}
          contentFit="contain"
        />
        <YStack flex={1} gap="$1">
          <Text fontWeight="700" fontSize={18} color="$text">
            {name}
          </Text>
          {building.level > 0 ? (
            <LevelPips level={building.level} />
          ) : (
            <Text fontSize={12} color="$muted">
              {t("village.to_build_title", "To build")}
            </Text>
          )}
        </YStack>
      </XStack>

      <YStack gap="$2">
        <Text fontSize={14} color="$textSecondary">
          {driverLine}
        </Text>

        {progress !== null ? <ProgressBar progress={progress} /> : null}

        {nextLine ? (
          <XStack justify="space-between" items="center" gap="$2">
            <Text fontSize={12} color="$muted" flex={1}>
              {nextLine}
            </Text>
            {showProgress && building.nextTarget !== null ? (
              <Text fontSize={12} color="$muted">
                {t("village.detail_progress", {
                  current: building.metricValue,
                  target: building.nextTarget,
                })}
              </Text>
            ) : null}
          </XStack>
        ) : null}
      </YStack>

      {extra?.kind === "sessions" && extra.sessions.length > 0 && (
        <YStack gap="$2">
          <Text fontWeight="700" fontSize={13} color="$text">
            {t("village.detail_recent_title", "Recent work")}
          </Text>
          {extra.sessions.map((session) => (
            <XStack key={session.sessionId} justify="space-between" gap="$2">
              <Text fontSize={12} color="$textSecondary">
                {formatDate(session.performedAt)}
              </Text>
              <Text fontSize={12} color="$muted">
                {t("village.detail_recent_units", { volume: session.volume })}
              </Text>
            </XStack>
          ))}
        </YStack>
      )}

      {extra?.kind === "adventures" && extra.adventures.length > 0 && (
        <YStack gap="$2">
          <Text fontWeight="700" fontSize={13} color="$text">
            {t("village.hall_finished_title", "Adventures completed")}
          </Text>
          {extra.adventures.map((adventure) => (
            <XStack key={adventure.adventureId} items="center" gap="$3">
              {!!adventure.imagePath && (
                <YStack width={32} height={32} rounded={16} overflow="hidden">
                  <Image
                    source={getAdventureAsset(adventure.imagePath)}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </YStack>
              )}
              <Text fontSize={12} color="$textSecondary" flex={1} numberOfLines={1}>
                {fr ? adventure.frTitle : adventure.enTitle}
              </Text>
              {adventure.timesFinished > 1 && (
                <Text fontSize={12} color="$muted">
                  {t("village.hall_times", { count: adventure.timesFinished })}
                </Text>
              )}
              {!!adventure.lastFinishedAt && (
                <Text fontSize={12} color="$muted">
                  {formatDate(adventure.lastFinishedAt)}
                </Text>
              )}
            </XStack>
          ))}
        </YStack>
      )}
    </YStack>
  );
}

function TrophyDetail({ trophy, extra, language, formatDate }: DetailProps & { trophy: Trophy }) {
  const { t } = useTranslation();
  const fr = language === "fr";
  const description = fr ? trophy.frDescription : trophy.enDescription;
  const victories =
    extra?.kind === "adventures"
      ? extra.adventures.find((a) => a.adventureId === trophy.adventureId)?.timesFinished
      : undefined;

  return (
    <YStack gap="$3">
      <XStack items="center" gap="$3">
        {trophy.imagePath ? (
          <YStack width={56} height={56} rounded={28} overflow="hidden">
            <Image
              source={getAdventureAsset(trophy.imagePath)}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </YStack>
        ) : (
          <Text fontSize={40}>{trophy.emoji}</Text>
        )}
        <Text fontWeight="700" fontSize={18} color="$text" flex={1}>
          {fr ? trophy.frTitle : trophy.enTitle}
        </Text>
      </XStack>

      {!!description && (
        <Text fontSize={14} color="$textSecondary">
          {description}
        </Text>
      )}

      <Text fontSize={13} color="$muted">
        {trophy.kind === "boss"
          ? t("village.trophy_defeated", { date: formatDate(trophy.earnedAt) })
          : t("village.trophy_earned", { date: formatDate(trophy.earnedAt) })}
      </Text>

      {!!victories && victories > 1 && (
        <Text fontSize={13} color="$muted">
          {t("village.trophy_victories", { count: victories })}
        </Text>
      )}
    </YStack>
  );
}
