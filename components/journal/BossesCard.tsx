import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";
import { Skull } from "@/components/icons";
import { VillageDetailSheet, type VillageSelection } from "@/components/village/VillageDetailSheet";
import { getBossAsset } from "@/constants/assetMap";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { type BossBanner, getBossBanners } from "@/db/village";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

/**
 * The bosses the hero has beaten, newest first: the half of the old village trophy wall the
 * Journal did not already have. Achievements were listed twice (on the wall and in
 * AchievementsCard, a tab apart), and a dated rack is history, which is what this tab is for.
 * The village keeps what still rises: the Dragon Lair counts these same victories.
 *
 * An empty card still shows: a new hero otherwise never learns that bosses end up somewhere.
 */
export function BossesCard() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const [bosses, setBosses] = useState<BossBanner[] | null>(null);
  const [selected, setSelected] = useState<VillageSelection | null>(null);
  // The sheet is dead weight until the first tap, then has to outlive the selection to slide shut.
  const [sheetMounted, setSheetMounted] = useState(false);
  const close = useCallback(() => setSelected(null), []);

  useEffect(() => {
    getBossBanners()
      .then((banners) =>
        setBosses([...banners].sort((a, b) => b.defeatedAt.getTime() - a.defeatedAt.getTime())),
      )
      .catch((error) => {
        // A card that failed to load looks exactly like a card with nothing to show.
        reportError("journal.bosses", error);
      });
  }, []);

  if (bosses === null) return null;

  return (
    <Card testID="journal-bosses" bg="$bgLight">
      <YStack gap="$3">
        <XStack items="center" gap="$2">
          <Skull size={18} color="$primaryText" />
          <Text fontWeight="700" fontSize={16} color="$text">
            {t("journal.bosses_title")}
          </Text>
        </XStack>

        {bosses.length === 0 ? (
          <Text fontSize={12} color="$textSecondary">
            {t("journal.bosses_empty")}
          </Text>
        ) : (
          <XStack flexWrap="wrap" gap="$3">
            {bosses.map((boss) => (
              <YStack
                key={boss.adventureId}
                width="22%"
                items="center"
                gap="$2"
                onPress={() => {
                  setSheetMounted(true);
                  setSelected({ kind: "boss", boss });
                }}
                pressStyle={{ opacity: 0.85 }}
                accessibilityRole="button"
                accessibilityLabel={localizedTitle(boss, language)}
              >
                {/* The hardest trophy there is, so its medal is the one that shines. */}
                <YStack
                  width={56}
                  height={56}
                  rounded={28}
                  overflow="hidden"
                  borderWidth={2}
                  bg="$surface"
                  borderColor="$resourceGold"
                  shadowColor="$resourceGold"
                  shadowRadius={10}
                  shadowOpacity={0.55}
                  shadowOffset={{ width: 0, height: 0 }}
                  elevation={6}
                >
                  <Image
                    source={getBossAsset(boss.imagePath, 0, "defeated")}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </YStack>
                <Text
                  fontSize={11}
                  color="$textSecondary"
                  numberOfLines={2}
                  style={{ textAlign: "center" }}
                >
                  {localizedTitle(boss, language)}
                </Text>
                <Text fontSize={12} fontWeight="600" color="$textSecondary">
                  {getDateTimeFormat(language, DATE_OPTIONS).format(boss.defeatedAt)}
                </Text>
              </YStack>
            ))}
          </XStack>
        )}
      </YStack>

      {sheetMounted ? (
        <VillageDetailSheet
          selected={selected}
          onClose={close}
          language={language}
          bottomInset={insets.bottom}
        />
      ) : null}
    </Card>
  );
}
