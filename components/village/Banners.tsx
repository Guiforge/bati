import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { SectionLabel } from "@/components/common/SectionLabel";
import { factText } from "@/components/village/yearsText";
import { ANIMAL_TOKEN } from "@/constants/animalColors";
import type { MovementNamesById } from "@/db/villageYears";
import type { Banner } from "@/db/villageYearsRules";
import type { AppLanguage } from "@/stores/settings";

/**
 * The seasons the village has lived, a row per village year. The colour is the animal's and only
 * decorates: the season's name and its fact are written on every banner. Nothing is mounted
 * before the first finished season.
 */
export function Banners({
  banners,
  names,
  language,
}: {
  banners: readonly Banner[];
  names: MovementNamesById;
  language: AppLanguage;
}) {
  const { t } = useTranslation();
  if (banners.length === 0) return null;
  // Oldest first, so a year's banners are a run of the list.
  const years: Banner[][] = [];
  for (const b of banners) {
    const open = years[years.length - 1];
    if (open && open[0]?.villageYear === b.villageYear) open.push(b);
    else years.push([b]);
  }
  return (
    <YStack testID="village-seasons" gap="3">
      <SectionLabel>{t("village.years_title")}</SectionLabel>
      {years.map((row) => {
        const year = t("village.year_n", { n: row[0]?.villageYear });
        return (
          <YStack key={row[0]?.villageYear} testID="village-year-row" gap="2">
            <Text fontSize={13} fontWeight="600" color="textSecondary">
              {year}
            </Text>
            {/* Two to a line: four across left a fact a few letters wide at a large font. */}
            <XStack gap={8} flexWrap="wrap">
              {row.map((b) => {
                const season = t(`village.season_${b.kind}`);
                const fact = factText(b.fact, b.sessions, names, t, language);
                return (
                  <YStack
                    key={b.start}
                    testID="village-banner"
                    accessible
                    accessibilityLabel={t("village.banner_label", { year, season, fact })}
                    flexBasis="48%"
                    rounded={10}
                    overflow="hidden"
                    bg="surface2"
                  >
                    <YStack
                      height={6}
                      bg={b.animal && b.animal !== "boar" ? ANIMAL_TOKEN[b.animal] : "borderStrong"}
                    />
                    <YStack p="2" gap={2}>
                      <Text fontSize={13} fontWeight="700" color="text">
                        {season}
                      </Text>
                      <Text fontSize={12} lineHeight="17px" color="textSecondary">
                        {fact}
                      </Text>
                    </YStack>
                  </YStack>
                );
              })}
            </XStack>
          </YStack>
        );
      })}
    </YStack>
  );
}
