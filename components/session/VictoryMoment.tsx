import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { AppText } from "@/components/common/AppText";
import { Card } from "@/components/common/Card";
import { GameIcon } from "@/components/common/GameIcon";
import { SectionLabel } from "@/components/common/SectionLabel";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedName } from "@/src/i18n/localized";
import type { SaveResult } from "@/stores/session";
import { tierSentence } from "./bigFeastText";

/** The village event as the headline: what grew (or the new tier), and the way into the village. */
export function VillageMoment({
  result,
  villageName,
  language,
  onViewVillage,
}: {
  result: Pick<SaveResult, "tierUp" | "villageGrowth">;
  villageName: string;
  language: AppLanguage;
  onViewVillage: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card
      testID="victory-moment-village"
      width="100%"
      maxW={520}
      bg="surface"
      borderColor="resourceGold"
      gap="2"
      onPress={onViewVillage}
      accessibilityRole="link"
    >
      <SectionLabel>{t("session.tonight_title")}</SectionLabel>
      {result.tierUp ? (
        <XStack items="center" gap="3">
          <GameIcon name="crown" size={32} color="resourceGold" />
          <AppText flex={1} fontSize={17} fontWeight="700" color="text">
            {tierSentence(t, result.tierUp.newTier, villageName, language)}
          </AppText>
        </XStack>
      ) : null}
      <YStack gap="1">
        {result.villageGrowth.map((b) => (
          <AppText key={`${b.code}`} fontSize={16} color="text">
            {t("session.tonight_growth", {
              name: localizedName(b, language),
              level: b.newLevel,
            }).replace(/<\/?b>/g, "")}
          </AppText>
        ))}
      </YStack>
      <AppText fontSize={14} color="primaryText" textDecorationLine="underline">
        {t("session.village_growth_cta")}
      </AppText>
    </Card>
  );
}
