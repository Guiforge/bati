import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";

import { ProgressBar } from "@/components/common/ProgressBar";
import { ChevronRight } from "@/components/icons";
import { LevelPips } from "@/components/village/LevelPips";
import {
  barEnds,
  type Family,
  feedsLine,
  levelText,
  nameOf,
  nextLine,
  questLink,
} from "@/components/village/rows";
import { getBuildingIconAsset } from "@/constants/assetMap";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import {
  buildingCeiling,
  type GrownBuilding,
  getBuildingProgress,
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

export function BuildingThumb({ building, size }: { building: VillageBuilding; size: number }) {
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
  const cta = dayOne
    ? t("village.cta_first")
    : building?.driver === "leagues"
      ? t("village.cta_outing")
      : building?.relatedMuscle
        ? t("village.cta_feeds")
        : t("village.cta_quest");

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
      <Kicker label={t("village.next_title")} />
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
      <QuestLink label={cta} onPress={() => router.push(questLink(building) as never)} />
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
  language: AppLanguage;
  onOpen: (building: VillageBuilding) => void;
};

export function Families({ families, risen, language, onOpen }: FamiliesProps) {
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
  language: AppLanguage;
  onPress: () => void;
};

/** Readable without a tap: the name, the next rung in words, and the level on its real ceiling. */
function BuildingRow({ building, risen, language, onPress }: RowProps) {
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
      borderBottomWidth={1}
      borderColor="$surface2"
      onPress={onPress}
      pressStyle={{ opacity: 0.85 }}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
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
          {nextLine(building, t, language)}
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

/** The last painting says it first: the village is finished, and what is left to answer. */
export function VillageDone({ name, openDeeds }: { name: string; openDeeds: number }) {
  const { t } = useTranslation();
  const body =
    openDeeds > 0
      ? `${t("village.done_body")} ${t("village.done_deeds", { count: openDeeds })}`
      : t("village.done_body");
  return (
    <YStack
      testID="village-done"
      p={14}
      gap={5}
      rounded={12}
      borderWidth={1}
      borderColor="$resourceGold"
      bg="$surface"
    >
      <Text fontWeight="600" fontSize={14} color="$resourceGold">
        {t("village.done_title", { name })}
      </Text>
      <Text fontSize={12.5} lineHeight={18} color="$textSecondary">
        {body}
      </Text>
    </YStack>
  );
}

export { Kicker };
