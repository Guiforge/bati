import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";

import { ProgressBar } from "@/components/common/ProgressBar";
import { ChevronRight } from "@/components/icons";
import { LevelPips } from "@/components/village/LevelPips";
import {
  barEnds,
  ctaLabel,
  type Family,
  feedsLine,
  levelText,
  nameOf,
  nextLine,
  nextTitle,
  questLink,
} from "@/components/village/rows";
import { getBuildingIconAsset } from "@/constants/assetMap";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import {
  buildingCeiling,
  type GrownBuilding,
  getBuildingProgress,
  MAX_TIER,
  type TierProgress,
  type VillageBuilding,
} from "@/db/village";
import type { AppLanguage } from "@/stores/settings";

/**
 * Everything under the painting: what rises next, what just rose, and every building grouped by
 * what feeds it. One measure per row, and a bar only where it carries its unit at both ends.
 */

/** An unbuilt building is its own shape in outline: the same silhouette, no detail, no padlock. */
const SILHOUETTE_TINT = rawColors.muted;

function Kicker({
  label,
  color = "$textSecondary",
}: {
  label: string;
  color?: "$textSecondary" | "$resourceGold";
}) {
  return (
    <Text
      fontSize={10.5}
      fontWeight="600"
      letterSpacing={1.5}
      textTransform="uppercase"
      color={color}
    >
      {label}
    </Text>
  );
}

function BuildingThumb({ building, size }: { building: VillageBuilding; size: number }) {
  const built = building.level > 0;
  return (
    <YStack
      width={size + 4}
      height={size + 4}
      items="center"
      justify="center"
      rounded={9}
      borderWidth={built ? 0 : 1}
      borderStyle="dashed"
      borderColor="$borderStrong"
      bg={built ? undefined : "$surface2"}
    >
      <Image
        source={getBuildingIconAsset(building.code, building.relatedMuscle, building.level)}
        style={{ width: size, height: size }}
        contentFit="contain"
        tintColor={built ? undefined : SILHOUETTE_TINT}
      />
    </YStack>
  );
}

export function QuestLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <XStack
      self="flex-start"
      minH={44}
      items="center"
      gap={4}
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <Text fontSize={13} fontWeight="600" color="$primaryText">
        {label}
      </Text>
      <ChevronRight size={16} color="$primaryText" />
    </XStack>
  );
}

/** The ends of a bar, under it, so the bar is never a measure without a unit. */
export function BarEnds({ left, right }: { left: string; right: string }) {
  return (
    <XStack justify="space-between" gap="$2">
      <Text fontSize={11.5} fontWeight="600" color="$textSecondary">
        {left}
      </Text>
      <Text fontSize={11.5} fontWeight="600" color="$textSecondary">
        {right}
      </Text>
    </XStack>
  );
}

type NextProps = {
  building: VillageBuilding | null;
  dayOne: boolean;
  language: AppLanguage;
  onOpen: (building: VillageBuilding) => void;
};

/**
 * The line that gets someone training: which building one session is most likely to raise, and
 * what it costs, in the unit it counts. On day one there is no such building yet, so it states the
 * rule instead, and it is the one place the village carries a call to action: to a quest.
 */
export function NextToRise({ building, dayOne, language, onOpen }: NextProps) {
  const { t } = useTranslation();
  const router = useRouter();
  if (!(building || dayOne)) return null;

  const progress = building ? getBuildingProgress(building) : null;
  const ends = building ? barEnds(building, t) : null;

  return (
    <YStack
      testID="village-next"
      p={14}
      gap={10}
      rounded={12}
      borderWidth={1}
      borderColor="$borderStrong"
      bg="$surface"
    >
      <Kicker label={nextTitle(building, t)} />
      {building ? (
        <XStack
          gap={12}
          items="flex-start"
          onPress={() => onOpen(building)}
          accessibilityRole="button"
          accessibilityLabel={nameOf(building, language)}
        >
          <BuildingThumb building={building} size={40} />
          <YStack flex={1} minW={0} gap={4}>
            <Text fontWeight="700" fontSize={16} color="$text">
              {nameOf(building, language)}
            </Text>
            <Text fontSize={13} lineHeight={18} color="$text">
              {nextLine(building, t, language)}
            </Text>
            {progress !== null ? (
              <YStack pt={5}>
                <ProgressBar progress={progress} height={5} color="$resourceGold" />
              </YStack>
            ) : null}
            {ends ? <BarEnds left={ends.left} right={ends.right} /> : null}
          </YStack>
        </XStack>
      ) : (
        <YStack gap={4}>
          <Text fontWeight="700" fontSize={16} color="$text">
            {t("village.day_one_title")}
          </Text>
          <Text fontSize={13} lineHeight={18} color="$textSecondary">
            {t("village.day_one_body")}
          </Text>
        </YStack>
      )}
      <QuestLink
        label={ctaLabel(building, t)}
        onPress={() => router.push(questLink(building) as never)}
      />
    </YStack>
  );
}

type ChangesProps = {
  growth: GrownBuilding[];
  buildings: VillageBuilding[];
  language: AppLanguage;
};

/** What the session that brought the hero here raised, from which rung to which. */
export function SinceLastQuest({ growth, buildings, language }: ChangesProps) {
  const { t } = useTranslation();
  const byCode = new Map(buildings.map((b) => [b.code, b]));
  return (
    <YStack testID="village-changes" gap={2}>
      <Kicker label={t("village.changes_title")} />
      {growth.map((g) => {
        const building = byCode.get(g.code);
        if (!building) return null;
        return (
          <XStack
            key={g.code}
            items="center"
            gap={12}
            minH={48}
            py={8}
            borderBottomWidth={1}
            borderColor="$surface2"
          >
            <BuildingThumb building={building} size={30} />
            <YStack flex={1} minW={0}>
              <Text fontWeight="600" fontSize={14} color="$text">
                {nameOf(building, language)}
              </Text>
              <Text fontSize={11.5} color="$textSecondary">
                {feedsLine(building, t, language)}
              </Text>
            </YStack>
            <Text fontWeight="600" fontSize={13} color="$resourceGold">
              {`${g.oldLevel} → ${g.newLevel}`}
            </Text>
          </XStack>
        );
      })}
    </YStack>
  );
}

type FamiliesProps = {
  families: Family[];
  risen: ReadonlySet<BuildingCode>;
  /** The building "Next to rise" already names, marked in its family instead of read twice. */
  next: BuildingCode | null;
  language: AppLanguage;
  onOpen: (building: VillageBuilding) => void;
};

export function Families({ families, risen, next, language, onOpen }: FamiliesProps) {
  const { t } = useTranslation();
  return (
    <YStack testID="village-families" gap={18}>
      {families.map((family) => (
        <YStack key={family.key} testID={`village-family-${family.key}`} gap={2}>
          <XStack justify="space-between" items="baseline" gap={10}>
            <Kicker label={t(`village.family_${family.key}`, { count: family.items.length })} />
            <Text fontSize={11} color="$textSecondary" opacity={0.75} shrink={1}>
              {t(`village.family_${family.key}_feeds`, { count: family.items.length })}
            </Text>
          </XStack>
          {family.items.map((building) => (
            <BuildingRow
              key={building.code}
              building={building}
              risen={risen.has(building.code)}
              isNext={building.code === next}
              language={language}
              onPress={() => onOpen(building)}
            />
          ))}
        </YStack>
      ))}
    </YStack>
  );
}

type RowProps = {
  building: VillageBuilding;
  risen: boolean;
  isNext: boolean;
  language: AppLanguage;
  onPress: () => void;
};

/** Readable without a tap: the name, the next rung in words, and the level on its real ceiling. */
function BuildingRow({ building, risen, isNext, language, onPress }: RowProps) {
  const { t } = useTranslation();
  const name = nameOf(building, language);
  const built = building.level > 0;
  return (
    <XStack
      testID="village-building-row"
      items="center"
      gap={12}
      minH={56}
      py={9}
      position="relative"
      borderBottomWidth={1}
      borderColor="$surface2"
      onPress={onPress}
      pressStyle={{ opacity: 0.85 }}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      {/* In the page's gutter, not in the row: a left border pushed this one icon out of line
          with every other row, and read as a glitch. */}
      {isNext ? (
        <YStack position="absolute" l={-10} t={9} b={9} width={2} rounded={1} bg="$resourceGold" />
      ) : null}
      <BuildingThumb building={building} size={34} />
      <YStack flex={1} minW={0} gap={2}>
        <XStack items="center" gap={7} flexWrap="wrap">
          <Text fontWeight="600" fontSize={14.5} color="$text">
            {name}
          </Text>
          {risen ? (
            <XStack px={6} py={1} rounded={4} borderWidth={1} borderColor="$resourceGold">
              <Text
                fontSize={9.5}
                fontWeight="600"
                letterSpacing={0.8}
                textTransform="uppercase"
                color="$resourceGold"
              >
                {t("village.risen")}
              </Text>
            </XStack>
          ) : null}
        </XStack>
        <Text fontSize={11.5} lineHeight={16} color="$textSecondary">
          {/* "Next to rise" already reads the next rung aloud; its row says what feeds it. */}
          {isNext ? feedsLine(building, t, language) : nextLine(building, t, language)}
        </Text>
      </YStack>
      <YStack items="flex-end" gap={5}>
        <Text
          fontSize={12}
          fontWeight="600"
          color={built ? "$resourceGold" : "$textSecondary"}
          numberOfLines={1}
        >
          {levelText(building, t)}
        </Text>
        {built ? <LevelPips level={building.level} max={buildingCeiling(building)} /> : null}
      </YStack>
    </XStack>
  );
}

type TierProps = {
  progress: TierProgress;
  /** The village's name, for the finished state. */
  name: string;
  complete: boolean;
  openDeeds: number;
  language: AppLanguage;
};

/**
 * When the painting changes next, first on the panel in every state. The village follows the
 * hero's level alone, so the answer is a hero level and the XP to it. The bar is indigo on
 * purpose: gold belongs to the buildings, and two systems in one colour read as one.
 *
 * On the last tier the bar goes and the sentence becomes final, since a gauge at 100 % for life
 * promises a next step that never comes. A finished village says so here too, in the same block:
 * two cards announcing the end, one above the other, was one too many.
 */
export function VillageTier({ progress, name, complete, openDeeds, language }: TierProps) {
  const { t } = useTranslation();
  const xp = (n: number) => n.toLocaleString(language);
  const foot = tierFoot(progress, complete, openDeeds, t, xp);

  return (
    <YStack
      testID="village-tier"
      p={14}
      gap={8}
      rounded={12}
      borderWidth={1}
      borderColor={complete ? "$resourceGold" : "$borderStrong"}
      bg="$surface"
    >
      <XStack justify="space-between" items="baseline" gap={10}>
        <Kicker
          label={t(progress.final ? "village.tier_final_kicker" : "village.tier_next_kicker")}
        />
        <Text
          fontSize={11.5}
          fontWeight="600"
          color={progress.final ? "$resourceGold" : "$textSecondary"}
          numberOfLines={1}
        >
          {t("village.tier_badge", { tier: progress.tier, max: MAX_TIER })}
        </Text>
      </XStack>

      {complete ? (
        <YStack testID="village-done" gap={4}>
          <Text fontWeight="600" fontSize={14} color="$resourceGold">
            {t("village.done_title", { name })}
          </Text>
          <Text fontSize={12.5} lineHeight={18} color="$text">
            {t("village.done_body")}
          </Text>
        </YStack>
      ) : null}

      {progress.final ? (
        <Text fontSize={13} lineHeight={19} color={complete ? "$textSecondary" : "$text"}>
          {t("village.tier_final_line", { level: progress.reachedAt })}
        </Text>
      ) : (
        <>
          <Text fontSize={13} lineHeight={19} color="$text">
            {t("village.tier_next_line", { level: progress.nextLevel, count: progress.levelsAway })}
          </Text>
          <YStack gap={6} pt={2}>
            <ProgressBar progress={progress.progress} height={5} color="$primaryText" />
            <BarEnds
              left={t("village.tier_bar_end", {
                level: progress.fromLevel,
                xp: xp(progress.fromXp),
              })}
              right={t("village.tier_bar_end", {
                level: progress.nextLevel,
                xp: xp(progress.targetXp),
              })}
            />
          </YStack>
        </>
      )}

      {foot ? (
        <Text fontSize={12} lineHeight={17} color="$textSecondary">
          {foot}
        </Text>
      ) : null}
    </YStack>
  );
}

/** What is left once the sentence above has said when: the XP gap, or what still moves. */
function tierFoot(
  progress: TierProgress,
  complete: boolean,
  openDeeds: number,
  t: TFunction,
  xp: (n: number) => string,
): string | null {
  if (!progress.final) {
    return progress.sessionsAtPace === null
      ? t("village.tier_short", { xp: xp(progress.xpShort) })
      : t("village.tier_short_pace", { xp: xp(progress.xpShort), count: progress.sessionsAtPace });
  }
  if (!complete) return t("village.tier_final_rest");
  return openDeeds > 0 ? t("village.done_deeds", { count: openDeeds }) : null;
}

export { Kicker };
