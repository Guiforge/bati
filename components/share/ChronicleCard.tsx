import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Image as RNImage } from "react-native";
import { XStack, YStack } from "tamagui";
import { NKicker, NKickerQuiet, NMuted, NText } from "@/components/journal/nocturne";
import { getVillageTierAsset } from "@/constants/assetMap";
import { formatDay } from "@/constants/dateFormatters";
import type { Chronicle } from "@/db/chronicle";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";
import { CardFrame, CardStats } from "./ShareCard";
import { chronicleStats } from "./shareStats";

/**
 * The year as a picture to send: the village it ended on, then what built it.
 *
 * Drawn like `ShareCard`, for a stranger's chat: dates are dates, nothing is tappable and the
 * name of the app is a signature at the foot. One shape for every hero: the figures that measured
 * nothing are left out of the list, never out of the layout.
 */
export function ChronicleCard({
  chronicle,
  width,
  onPainted,
}: {
  chronicle: Chronicle;
  width: number;
  /** The painting is drawn: a capture before it would send a hole where the village is. */
  onPainted: () => void;
}) {
  const { t } = useTranslation();
  const painting = getVillageTierAsset(chronicle.villageTier);
  const asset = RNImage.resolveAssetSource(painting);
  const ratio = asset?.width && asset.height ? asset.height / asset.width : 1;
  const language = useSettingsStore((s) => s.language);
  const unit = useSettingsStore((s) => s.distanceUnit);
  const stats = chronicleStats(chronicle, t, language, unit);
  const day = (date: Date) => formatDay(language, date, { month: "long", day: "numeric" });

  return (
    <CardFrame testID="chronicle-card" width={width}>
      <Image
        testID="chronicle-painting"
        source={painting}
        // At the painting's own ratio, whole: a 2:1 band cut a quarter off the top and bottom of
        // the village, and a square cut the sides off the hamlet, which is not square.
        style={{ width, height: Math.round(width * ratio) }}
        contentFit="cover"
        onLoad={onPainted}
        // A painting that never comes must not lock the send: the card goes without it.
        onError={(event) => {
          reportError("chronicle.painting", event.error);
          onPainted();
        }}
        accessible={false}
      />

      <YStack p={17} gap={6}>
        <NKicker>{t("chronicle.title")}</NKicker>
        <NText fontWeight="500" fontSize={22} lineHeight="28px">
          {t("chronicle.heading", { year: chronicle.year })}
        </NText>
        <NMuted testID="chronicle-span">
          {/* A year that is one day so far is that day, not "December 15 to December 15". */}
          {day(chronicle.since) === day(chronicle.to)
            ? day(chronicle.to)
            : t("chronicle.span", { from: day(chronicle.since), to: day(chronicle.to) })}
        </NMuted>

        <CardStats stats={stats} />

        <XStack mt={11}>
          <NKickerQuiet>Bati</NKickerQuiet>
        </XStack>
      </YStack>
    </CardFrame>
  );
}
