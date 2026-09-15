import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler } from "react-native";
import { Sheet, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { ImageViewer } from "@/components/common/ImageViewer";
import { ProgressBar } from "@/components/common/ProgressBar";
import { LevelPips } from "@/components/village/LevelPips";
import {
  barEnds,
  ctaLabel,
  feedsLine,
  levelText,
  nameOf,
  nextLine,
  questLink,
} from "@/components/village/rows";
import { BarEnds, Kicker, QuestLink } from "@/components/village/VillageLists";
import { getAdventureAsset, getBossAsset, getBuildingIconAsset } from "@/constants/assetMap";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { rawColors } from "@/constants/rawColors";
import { type FinishedAdventureSummary, listFinishedRunSummaries } from "@/db/adventures";
import { type ContributingSession, getRecentContributingSessions } from "@/db/completed";
import { MUSCLE_LABELS } from "@/db/muscles";
import { buildingDefinitions } from "@/db/schema";
import {
  type BossBanner,
  BUILDING_LABELS,
  buildingCeiling,
  getBuildingProgress,
  type VillageBuilding,
} from "@/db/village";
import { SECONDS_PER_REP_EQUIVALENT } from "@/db/workUnits";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { inSentence, localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import type { AppLanguage } from "@/stores/settings";

/**
 * A building from the village, or a defeated boss from the Journal's card. One sheet for both:
 * the back-button handling below was hard-won, and a second sheet would have to win it again.
 */
export type VillageSelection =
  | { kind: "building"; building: VillageBuilding }
  | { kind: "boss"; boss: BossBanner };

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

// "Recent work" rows can land three sessions on the same day; the date alone can't tell them
// apart, so this pairs it with the time — same fields as SessionCard's journal row.
const RECENT_WORK_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
};

/** The detail sheet's second half: the deeds behind the number, fetched only when opened. */
type Extra =
  | { kind: "sessions"; sessions: ContributingSession[] }
  | { kind: "adventures"; adventures: FinishedAdventureSummary[] }
  | null;

async function loadExtra(selected: VillageSelection): Promise<Extra> {
  if (selected.kind === "boss") {
    return { kind: "adventures", adventures: await listFinishedRunSummaries() };
  }

  const building = selected.building;

  // The hall lists the routes that raised it, the arena the bosses fought again: the same
  // split as the tally, so the list never shows a campaign the level did not count.
  if (building.driver === "routes" || building.driver === "rematches") {
    const summaries = await listFinishedRunSummaries();
    return {
      kind: "adventures",
      adventures:
        building.driver === "routes"
          ? summaries.filter((s) => s.kind !== "boss")
          : summaries.filter((s) => s.kind === "boss" && s.timesFinished > 1),
    };
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
      .catch((error) => {
        // The headline already answers "why this level"; the deed list is a bonus.
        reportError("village.detailSheet", error);
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  // One press of Android back was doing two things: the sheet closed *and* the router popped,
  // so the village unmounted while the sheet was still sliding shut and what it left behind
  // swallowed every tap afterwards. Registered last while the sheet is open, so it runs first
  // and the router never sees the press.
  useEffect(() => {
    if (!selected) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [selected, onClose]);

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
              onClose={onClose}
            />
          ) : null}
          {shown?.kind === "boss" ? (
            <BossDetail
              boss={shown.boss}
              extra={extra}
              language={language}
              formatDate={formatDate}
            />
          ) : null}

          <AppButton testID="village-detail-close" variant="outline" onPress={onClose}>
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
  onClose,
}: DetailProps & { building: VillageBuilding; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const built = building.level > 0;
  // Lower-cased mid-sentence, the way the Journal's balance verdict (`workVerdict`) writes muscles.
  const muscleLabel = building.relatedMuscle
    ? inSentence(MUSCLE_LABELS[building.relatedMuscle]?.[language] ?? "", language) ||
      building.relatedMuscle
    : "";
  const style = buildingDefinitions[building.code].relatedStyle;
  const styleLabel = style ? t(`village.style_${style}`, style) : "";
  const prereqCode = buildingDefinitions[building.code].prerequisiteBuilding;
  const prereqName = prereqCode ? BUILDING_LABELS[prereqCode][language] : "";

  // The unit note is a second sentence, so the join carries the full stop. The driver strings
  // themselves stay clause-shaped: the leagues one is reused on the victory screen after a
  // middot, where a period would be wrong.
  const repUnitNote = t("village.rep_unit", { seconds: SECONDS_PER_REP_EQUIVALENT });

  // The row shows no bar; this is the one place a building's bar is allowed, because it is the
  // one place it arrives with its unit at both ends. Same call as "Next to rise", so the two
  // cannot disagree about what "almost there" means.
  const progress = getBuildingProgress(building);
  const ends = barEnds(building, t);
  // An unbuilt deed is its condition and nothing else: "0 rematches won" above "Not built yet"
  // above "Built by your first rematch" said the same zero three times.
  const unbuiltDeed = building.tier === 4 && progress === null && !built;

  // One sentence naming the deed that raises this building, in its own unit.
  const driverLine = (() => {
    if (unbuiltDeed) return nextLine(building, t, language);
    switch (building.driver) {
      case "tier":
        return t("village.detail_tier_driver", { level: building.metricValue });
      // Reps, not "work units". A work unit has always *been* a rep (db/workUnits.ts), so the
      // sheet says rep, and names the one exchange rate that is not one-to-one the same way the
      // leagues line names its kilometre.
      case "muscle":
        return building.level === 0
          ? t("village.detail_unlock_muscle", { muscle: muscleLabel })
          : `${t("village.detail_muscle_driver", {
              volume: building.metricValue,
              muscle: muscleLabel,
            })}. ${repUnitNote}`;
      case "style":
        return building.level === 0
          ? t("village.detail_unlock_style", { style: styleLabel })
          : `${t("village.detail_style_driver", { volume: building.metricValue, style: styleLabel })}. ${repUnitNote}`;
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
      case "routes":
        return t("village.detail_routes_driver", { count: building.metricValue });
      case "rematches":
        return t("village.detail_rematches_driver", { count: building.metricValue });
      case "leagues":
        // The one place the unit gets named: a league is the only measure Bati invents.
        return `${t("village.detail_leagues_driver", { count: building.metricValue })}. ${t("village.league_unit")}`;
      default:
        return t("village.detail_bosses_driver", { count: building.metricValue });
    }
  })();

  const link = building.relatedMuscle || building.tier === 4 ? questLink(building) : null;
  // The arena counts rematches, not finishes: a boss beaten three times is two rematches.
  const listed =
    extra?.kind === "adventures"
      ? extra.adventures.map((a) => ({
          ...a,
          times: building.driver === "rematches" ? a.timesFinished - 1 : a.timesFinished,
        }))
      : [];

  return (
    <YStack gap="$4">
      <XStack gap={13} items="center">
        <Image
          source={getBuildingIconAsset(building.code, building.relatedMuscle, building.level)}
          style={{ width: 54, height: 54 }}
          contentFit="contain"
          tintColor={built ? undefined : rawColors.muted}
        />
        <YStack flex={1} minW={0} gap={3}>
          <Text fontWeight="700" fontSize={20} color="$text">
            {nameOf(building, language)}
          </Text>
          <Text fontSize={12.5} color="$textSecondary">
            {feedsLine(building, t, language)}
          </Text>
        </YStack>
        <YStack items="flex-end" gap={5}>
          <Text fontSize={13} fontWeight="600" color={built ? "$resourceGold" : "$textSecondary"}>
            {levelText(building, t)}
          </Text>
          {built ? <LevelPips level={building.level} max={buildingCeiling(building)} /> : null}
        </YStack>
      </XStack>

      <YStack gap="$2">
        <Text fontSize={13.5} lineHeight={20} color="$text">
          {driverLine}
        </Text>
        {building.kept ? (
          <Text fontSize={12.5} lineHeight={18} color="$textSecondary">
            {t("village.kept_level")}
          </Text>
        ) : null}
        {/* Only with both ends: starters and upgrades count a level, and a bar from zero to it
            without a unit said nothing about the rung. */}
        {ends && progress !== null ? (
          <>
            <ProgressBar progress={progress} height={6} color="$resourceGold" />
            <BarEnds left={ends.left} right={ends.right} />
          </>
        ) : unbuiltDeed ? null : (
          <Text fontSize={12} color="$textSecondary">
            {nextLine(building, t, language)}
          </Text>
        )}
      </YStack>

      {extra?.kind === "sessions" && extra.sessions.length > 0 && (
        <YStack gap="$2">
          <Kicker label={t("village.detail_recent_title")} />
          {extra.sessions.map((session) => {
            const title = session.enTitle
              ? localizedTitle(
                  {
                    enTitle: session.enTitle,
                    frTitle: session.frTitle ?? "",
                    deTitle: session.deTitle ?? "",
                    esTitle: session.esTitle ?? "",
                  },
                  language,
                )
              : null;
            const when = getDateTimeFormat(language, RECENT_WORK_DATE_OPTIONS).format(
              session.performedAt,
            );
            return (
              <XStack key={session.sessionId} justify="space-between" gap="$2">
                <Text fontSize={12} color="$textSecondary" flex={1} numberOfLines={1}>
                  {`${title ? `${title} · ` : ""}${when}`}
                </Text>
                <Text fontSize={12} color="$textSecondary">
                  {t("village.detail_recent_units", { volume: session.volume })}
                </Text>
              </XStack>
            );
          })}
        </YStack>
      )}

      {listed.length > 0 && (
        <YStack gap="$2">
          <Kicker
            label={t(
              building.driver === "rematches"
                ? "village.rematches_title"
                : "village.hall_finished_title",
            )}
          />
          {listed.map((adventure) => (
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
                {localizedTitle(adventure, language)}
              </Text>
              {adventure.times > 1 && (
                <Text fontSize={12} color="$textSecondary">
                  {t("village.hall_times", { count: adventure.times })}
                </Text>
              )}
              {!!adventure.lastFinishedAt && (
                <Text fontSize={12} color="$textSecondary">
                  {formatDate(adventure.lastFinishedAt)}
                </Text>
              )}
            </XStack>
          ))}
        </YStack>
      )}

      {link ? (
        <QuestLink
          label={ctaLabel(building, t)}
          onPress={() => {
            onClose();
            router.push(link as never);
          }}
        />
      ) : null}
    </YStack>
  );
}

function BossDetail({ boss, extra, language, formatDate }: DetailProps & { boss: BossBanner }) {
  const { t } = useTranslation();
  const title = localizedTitle(boss, language);
  const [expanded, setExpanded] = useState(false);
  const victories =
    extra?.kind === "adventures"
      ? extra.adventures.find((a) => a.adventureId === boss.adventureId)?.timesFinished
      : undefined;

  return (
    <YStack gap="$3">
      {/* The monster itself, its *fallen* painting, because a trophy is proof of the defeat:
          wide, and tappable to full screen. */}
      <YStack
        height={140}
        rounded="$6"
        overflow="hidden"
        onPress={() => setExpanded(true)}
        pressStyle={{ opacity: 0.9 }}
        accessibilityRole="imagebutton"
        accessibilityLabel={title}
      >
        <Image
          source={getBossAsset(boss.imagePath, 0, "defeated")}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </YStack>
      <Text fontWeight="700" fontSize={20} color="$text">
        {title}
      </Text>
      <ImageViewer
        source={getBossAsset(boss.imagePath, 0, "defeated")}
        name={title}
        visible={expanded}
        onClose={() => setExpanded(false)}
      />

      {/* The date is the trophy's story, when you did the thing, so it carries real weight
          instead of trailing off as a muted footnote. */}
      <Text fontSize={16} fontWeight="600" color="$textSecondary">
        {t("village.trophy_defeated", { date: formatDate(boss.defeatedAt) })}
      </Text>

      {!!victories && victories > 1 && (
        <Text fontSize={13} color="$textSecondary">
          {t("village.trophy_victories", { count: victories })}
        </Text>
      )}
    </YStack>
  );
}
