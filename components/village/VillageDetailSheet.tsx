import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, type ScrollViewInstance, useWindowDimensions } from "react-native";
import { Sheet, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { ImageViewer } from "@/components/common/ImageViewer";
import { ProgressBar } from "@/components/common/ProgressBar";
import { SectionLabel } from "@/components/common/SectionLabel";
import { tamaguiRef } from "@/components/common/tamaguiRef";
import { ChevronRight } from "@/components/icons";
import { DATE_OPTIONS, type Extra, loadExtra } from "@/components/village/detailExtra";
import { LevelPips } from "@/components/village/LevelPips";
import { buildingMilestoneLine } from "@/components/village/milestoneLine";
import {
  buildingScale,
  ctaLabel,
  feedsLine,
  levelText,
  nameOf,
  nextLine,
  questLink,
} from "@/components/village/rows";
import { Stones } from "@/components/village/Stones";
import { QuestLink } from "@/components/village/VillageLists";
import { withStones } from "@/components/village/yearsText";
import { getAdventureAsset, getBossAsset, getBuildingIconAsset } from "@/constants/assetMap";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { CONTENT_MAX_WIDTH } from "@/constants/layout";
import { rawColors } from "@/constants/rawColors";
import { MUSCLE_LABELS } from "@/db/labels";
import type { RecentFeeds } from "@/db/milestone";
import { type BuildingCode, buildingDefinitions } from "@/db/schema";
import { formatCount } from "@/db/targets";
import {
  type BossBanner,
  BUILDING_LABELS,
  buildingCeiling,
  getBuildingProgress,
  type VillageBuilding,
} from "@/db/village";
import type { VillageYearsView } from "@/db/villageYears";
import { SECONDS_PER_REP_EQUIVALENT } from "@/db/workUnits";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { inSentence, localizedName, localizedTitle } from "@/src/i18n/localized";
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
  /** What the latest sessions brought, for the milestone sentence; null until read. */
  feeds: RecentFeeds | null;
  /** The stones for the ramparts' sheet; null until read, then the sheet shows none. */
  years?: VillageYearsView | null;
  /** Buildings ready to improve (iso map on), and what the button does; both absent otherwise. */
  ready?: ReadonlySet<BuildingCode>;
  onClaim?: (building: VillageBuilding) => void;
  bottomInset: number;
};

// "Recent work" rows can land three sessions on the same day; the date alone can't tell them
// apart, so this pairs it with the time — same fields as SessionCard's journal row.
const RECENT_WORK_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
};

export function VillageDetailSheet({
  selected,
  onClose,
  language,
  feeds,
  years = null,
  ready,
  onClaim,
  bottomInset,
}: Props) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
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

  // The scroll position survives a close, so the next building opened below the fold.
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    if (selected) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [selected]);

  const formatDate = (date: Date) => getDateTimeFormat(language, DATE_OPTIONS).format(date);

  return (
    <Sheet
      modal
      open={selected !== null}
      onOpenChange={(next: boolean) => {
        // Tamagui also reports a change of the `open` prop through here.
        if (!next && selected !== null) onClose();
      }}
      snapPointsMode="fit"
      dismissOnSnapToBottom
      transition={reducedMotion ? undefined : "quick"}
      zIndex={100_000}
    >
      <Sheet.Overlay
        bg="sheetScrim"
        transition={reducedMotion ? undefined : "quick"}
        opacity="1 enter:0 exit:0"
      />
      {/* What does not fit scrolls: eighty stones are taller than a phone. */}
      <Sheet.Container
        overflow="hidden"
        borderTopLeftRadius="6"
        borderTopRightRadius="6"
        width="100%"
        maxW={CONTENT_MAX_WIDTH}
        self="center"
        style={{ maxHeight: Math.round(height * 0.9) }}
      >
        <Sheet.Background bg="surface" borderTopLeftRadius="6" borderTopRightRadius="6" />
        {/* Inside the frame: Sheet.Handle floats above its top edge, over the dimmed list. A bar
            only: with one `fit` snap point the handle's tap has nothing to cycle, and the drag
            still lives on the frame. */}
        <YStack
          testID="village-detail-handle"
          self="center"
          width={40}
          height={4}
          rounded={2}
          mt="2"
          bg="borderStrong"
        />
        {/* ponytail: `onMoveShouldSetResponder` as in FormSheet, Tamagui 2.7.7 cancels the first
            tap of a button in a Sheet.ScrollView (see .biome/plugins/noBareSheetScrollView.grit). */}
        <Sheet.ScrollView px={0} ref={tamaguiRef(scroll)} onMoveShouldSetResponder={() => false}>
          <YStack testID="village-detail" px="4" pt="3" pb={bottomInset + 16} gap="4">
            {shown?.kind === "building" ? (
              <BuildingDetail
                building={shown.building}
                extra={extra}
                language={language}
                feeds={feeds}
                years={years}
                formatDate={formatDate}
                onClose={onClose}
                onClaim={
                  onClaim && ready?.has(shown.building.code)
                    ? () => {
                        onClose();
                        onClaim(shown.building);
                      }
                    : undefined
                }
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
              {t("village.close")}
            </AppButton>
          </YStack>
        </Sheet.ScrollView>
      </Sheet.Container>
    </Sheet>
  );
}

type DetailProps = {
  extra: Extra;
  language: AppLanguage;
  formatDate: (date: Date) => string;
};

type FactsProps = DetailProps & {
  building: VillageBuilding;
  feeds: RecentFeeds | null;
  years: VillageYearsView | null;
  onClose: () => void;
  /** Set when the building is ready to improve. */
  onClaim?: () => void;
  /** The iso card only: linked rows, the exercises, no repeated sentence. The old sheet leaves it out. */
  surCarte?: boolean;
};

function BuildingDetail(props: FactsProps) {
  const { t } = useTranslation();
  const { building, language } = props;
  const built = building.level > 0;
  const unbuiltMuscle = building.driver === "muscle" && building.level === 0;
  return (
    <YStack gap="4">
      <XStack gap={13} items="center">
        <Image
          source={getBuildingIconAsset(building.code, building.relatedMuscle, building.level)}
          style={{ width: 54, height: 54 }}
          contentFit="contain"
          tintColor={built ? undefined : rawColors.muted}
        />
        <YStack flex={1} minW={0} gap={3}>
          <Text fontFamily="heading" fontWeight="700" fontSize={20} color="text">
            {nameOf(building, language)}
          </Text>
          {/* An unbuilt muscle building already says "Built by training your arms" below, and
              "Rises with your arms" right above it was the same sentence twice. */}
          {unbuiltMuscle ? null : (
            <Text fontSize={12.5} color="textSecondary">
              {feedsLine(building, t, language)}
            </Text>
          )}
        </YStack>
        <BuildingLevel building={building} />
      </XStack>
      <BuildingFacts {...props} />
    </YStack>
  );
}

/** The building's level and its pips: in the sheet's header, and in the iso map's bubble. */
export function BuildingLevel({ building }: { building: VillageBuilding }) {
  const { t } = useTranslation();
  const built = building.level > 0;
  return (
    <YStack items="flex-end" gap={5}>
      <Text fontSize={13} fontWeight="600" color={`${built ? "resourceGold" : "textSecondary"}`}>
        {levelText(building, t)}
      </Text>
      {built ? <LevelPips level={building.level} max={buildingCeiling(building)} /> : null}
    </YStack>
  );
}

/**
 * What a building's figures say, under its name: the driver, the bar, the milestone, the deeds,
 * the claim and the links. One writer for the sheet (list, Journal, flag off) and the iso bubble.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one branch per driver, flat — the alternative is seven near-identical components
export function BuildingFacts({
  building,
  extra,
  language,
  feeds,
  years,
  formatDate,
  onClose,
  onClaim,
  surCarte = false,
}: FactsProps) {
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

  // The bar lives here because here it arrives with its unit at both ends. It starts at the rung
  // the building stands on (`buildingScale`), the same start "Next to rise" ranks by, so the two
  // cannot disagree about what "almost there" means.
  const progress = getBuildingProgress(building);
  const scale = buildingScale(building, t, language);
  const milestone = buildingMilestoneLine(building, feeds, t, language);
  // The driver line above always says what is done ("101 reps of chest", "3 routes"): the bar
  // keeps its two ends and does not say it a second time.
  // An unbuilt deed is its condition and nothing else: "0 rematches won" above "Not built yet"
  // above "Built by your first rematch" said the same zero three times.
  const unbuiltDeed = building.tier === 4 && progress === null && !built;

  // The driver line already says "Appears when the Forge reaches rank 3, it is at rank 1": the
  // next line under the bar would repeat the first half.
  const unbuiltPrereq = building.driver === "prereq" && building.level === 0;

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
          ? t(`village.detail_unlock_muscle_${building.relatedMuscle}`)
          : `${t("village.detail_muscle_driver", {
              volume: formatCount(language, building.metricValue),
              muscle: muscleLabel,
            })}. ${repUnitNote}`;
      case "style":
        return building.level === 0
          ? t("village.detail_unlock_style", { style: styleLabel })
          : `${t("village.detail_style_driver", {
              volume: formatCount(language, building.metricValue),
              style: styleLabel,
            })}. ${repUnitNote}`;
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

  // On the card, a building that waits for its tap does not also say it is at its ceiling, and a
  // built follower says its sentence once (the driver line, which carries the rank).
  const pretAuPlafond = surCarte && !!onClaim && building.nextTarget === null;
  const suiveuse = surCarte && building.driver === "prereq" && built;
  const open = (href: string) => {
    onClose();
    router.push(href as never);
  };

  const link = building.relatedMuscle || building.tier === 4 ? questLink(building) : null;
  // The arena counts rematches, not finishes: a boss beaten three times is two rematches.
  const listed =
    extra?.kind === "adventures"
      ? extra.adventures.map((a) => ({
          ...a,
          times: building.driver === "rematches" ? a.timesFinished - 1 : a.timesFinished,
        }))
      : [];

  // A fragment: its rows are the parent's, so the sheet's gaps are the ones it always had.
  return (
    <>
      <YStack gap="2">
        <Text fontSize={13.5} lineHeight="20px" color="text">
          {driverLine}
        </Text>
        {building.kept ? (
          <Text fontSize={12.5} lineHeight="18px" color="textSecondary">
            {t("village.kept_level")}
          </Text>
        ) : null}
        {/* Only with both ends: starters and upgrades count a level, and a bar from zero to it
            without a unit said nothing about the rung. */}
        {scale ? (
          <ProgressBar
            progress={scale.progress}
            height={6}
            color="resourceGold"
            ends={scale.ends}
          />
        ) : building.nextTarget === null ||
          building.driver === "tier" ||
          (building.driver === "prereq" && !unbuiltPrereq) ? (
          pretAuPlafond || suiveuse ? null : (
            <Text fontSize={12} color="textSecondary">
              {building.code === "castle_wall"
                ? withStones(nextLine(building, t, language), years?.years.stones.length ?? 0, t)
                : nextLine(building, t, language)}
            </Text>
          )
        ) : null}
        {milestone ? (
          <Text fontSize={12.5} lineHeight="18px" color="text">
            {milestone}
          </Text>
        ) : null}
      </YStack>

      {/* Before the long lists (a wall's stones, the deeds): the one action must not sit below a scroll of 24 stones. */}
      {onClaim ? (
        <YStack gap="2">
          <Text fontSize={13} color="textSecondary">
            {t("village.claim_ready_body", { name: nameOf(building, language) })}
          </Text>
          <AppButton
            testID="village-claim"
            // The bubble's one action (village-bulle.md): 48 dp, over AppButton's 44.
            minH={48}
            onPress={onClaim}
            accessibilityRole="button"
            accessibilityLabel={t("village.claim_action_a11y", {
              name: nameOf(building, language),
            })}
          >
            {t("village.claim_action")}
          </AppButton>
        </YStack>
      ) : null}

      {extra?.kind === "sessions" && extra.sessions.length > 0 && (
        <YStack gap="2">
          <SectionLabel>{t("village.detail_recent_title")}</SectionLabel>
          {extra.sessions.map((session) => {
            const title = session.enTitle
              ? localizedTitle(
                  {
                    enTitle: session.enTitle,
                    frTitle: session.frTitle ?? "",
                    deTitle: session.deTitle ?? "",
                    esTitle: session.esTitle ?? "",
                    ruTitle: session.ruTitle ?? "",
                    zhTitle: session.zhTitle ?? "",
                  },
                  language,
                )
              : null;
            const when = getDateTimeFormat(language, RECENT_WORK_DATE_OPTIONS).format(
              session.performedAt,
            );
            return (
              <XStack
                key={session.sessionId}
                justify="space-between"
                gap="2"
                {...(surCarte
                  ? {
                      minH: 48,
                      items: "center" as const,
                      opacity: "press:0.7" as const,
                      onPress: () => open(`/journal/${session.sessionId}?from=village`),
                      accessibilityRole: "link" as const,
                      accessibilityLabel: t("village.open_session_a11y", {
                        what: title ?? when,
                      }),
                    }
                  : {})}
              >
                <Text fontSize={12} color={surCarte ? "primaryText" : "textSecondary"} flex={1}>
                  {`${title ? `${title} · ` : ""}${when}`}
                </Text>
                <Text fontSize={12} color="textSecondary">
                  {t("village.detail_recent_units", { volume: session.volume })}
                </Text>
                {surCarte ? <ChevronRight size={16} color="primaryText" /> : null}
              </XStack>
            );
          })}
        </YStack>
      )}

      {surCarte && extra?.kind === "sessions" && (extra.exercises?.length ?? 0) > 0 && (
        <YStack gap="2" testID="iso-bulle-exercices">
          <SectionLabel>{t("village.detail_exercises_title")}</SectionLabel>
          {extra.exercises?.map((exercise) => (
            <XStack
              key={exercise.exerciseId}
              justify="space-between"
              gap="2"
              minH={48}
              items="center"
              opacity="press:0.7"
              onPress={() => open(`/exercises/${exercise.exerciseId}`)}
              accessibilityRole="link"
              accessibilityLabel={t("village.open_exercise_a11y", {
                name: localizedName(exercise, language),
              })}
            >
              <Text fontSize={12} color="primaryText" flex={1}>
                {localizedName(exercise, language)}
              </Text>
              <Text fontSize={12} color="textSecondary">
                {t("village.detail_recent_units", { volume: exercise.volume })}
              </Text>
              <ChevronRight size={16} color="primaryText" />
            </XStack>
          ))}
        </YStack>
      )}

      {listed.length > 0 && (
        <YStack gap="2">
          <SectionLabel>
            {t(
              building.driver === "rematches"
                ? "village.rematches_title"
                : "village.hall_finished_title",
            )}
          </SectionLabel>
          {listed.map((adventure) => (
            <XStack key={adventure.adventureId} items="center" gap="3">
              {!!adventure.imagePath && (
                <YStack width={32} height={32} rounded={16} overflow="hidden">
                  <Image
                    source={getAdventureAsset(adventure.imagePath)}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </YStack>
              )}
              <Text fontSize={12} color="textSecondary" flex={1}>
                {localizedTitle(adventure, language)}
              </Text>
              {adventure.times > 1 && (
                <Text fontSize={12} color="textSecondary">
                  {t("village.hall_times", { count: adventure.times })}
                </Text>
              )}
              {!!adventure.lastFinishedAt && (
                <Text fontSize={12} color="textSecondary">
                  {formatDate(adventure.lastFinishedAt)}
                </Text>
              )}
            </XStack>
          ))}
        </YStack>
      )}

      {/* Whatever the wall's rank: the stones are the years, not a reward for a level. */}
      {building.code === "castle_wall" && years ? (
        <Stones
          stones={years.years.stones}
          ages={years.years.ages}
          names={years.names}
          language={language}
        />
      ) : null}

      {link ? (
        <QuestLink
          label={ctaLabel(building, t)}
          onPress={() => {
            onClose();
            router.push(link as never);
          }}
        />
      ) : null}

      {/* The Forge is a place too: the page where what the hero made lives. Built or not, since
          the page asks nothing of the building. */}
      {building.code === "forge" ? (
        <QuestLink
          label={t("village.forge_enter")}
          onPress={() => {
            onClose();
            router.push("/forge" as never);
          }}
        />
      ) : null}
    </>
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
    <YStack gap="3">
      {/* The monster itself, its *fallen* painting, because a trophy is proof of the defeat:
          wide, and tappable to full screen. */}
      <YStack
        height={140}
        rounded="6"
        overflow="hidden"
        opacity="press:0.9"
        onPress={() => setExpanded(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={title}
      >
        <Image
          source={getBossAsset(boss.imagePath, 0, "defeated")}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </YStack>
      <Text fontFamily="heading" fontWeight="700" fontSize={20} color="text">
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
      <Text fontSize={16} fontWeight="600" color="textSecondary">
        {t("village.trophy_defeated", { date: formatDate(boss.defeatedAt) })}
      </Text>

      {!!victories && victories > 1 && (
        <Text fontSize={13} color="textSecondary">
          {t("village.trophy_victories", { count: victories })}
        </Text>
      )}
    </YStack>
  );
}
