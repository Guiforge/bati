import { useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { ChevronRight, Map as MapIcon } from "@/components/icons";
import { formatClock, formatDistance, formatPace } from "@/constants/distanceFormat";
import { getVillageBuildings, type VillageBuilding } from "@/db/village";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useExpeditionStore } from "@/stores/expedition";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

/**
 * What the walk was worth, said on the screen that celebrates it.
 *
 * An outing used to end on an XP number and nothing else: the ground covered lived behind the
 * Village tab and the map behind two taps in the Journal, so the one screen the hero actually
 * looks at after walking 2.5 km never mentioned the 2.5 km.
 *
 * The figures are read, never re-derived. `stores/expedition` still holds the reducer's reading
 * when this mounts — `end()` stops the subscriptions and flushes the buffer, it does not clear
 * `track` — so this is the same distance and the same moving time `saveSession` paid the road
 * and the XP from. Summing `gps_points` here would be a third answer to "how far did I go".
 */

/** Recap's `Figure` recipe: DESIGN.md's uppercase label over a number, one third of the row. */
function Figure({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <YStack flex={1} gap="$1" items="center">
      <Text fontSize={11} letterSpacing={2} color="$textSecondary" textTransform="uppercase">
        {label}
      </Text>
      {/* 22, where the XP beside it is 26. This block reports the outing; it does not out-shout
          the reward. */}
      <Text testID={testID} fontSize={22} fontWeight="700" color="$text">
        {value}
      </Text>
    </YStack>
  );
}

/**
 * The one line about the High Road, in the two shapes the road can be in.
 *
 * A road still climbing reads as a fraction of its next floor. A maxed one has no floor left,
 * and `nextTarget` is null there — printing "42/null leagues" is the bug this exists to avoid,
 * so the maxed road borrows the village sheet's own sentence for the same driver rather than
 * inventing a fifteenth way to say "leagues covered".
 */
function roadLine(road: VillageBuilding, language: AppLanguage, t: TFunction): string {
  const building = localizedName(road, language);
  if (road.nextTarget === null) {
    return `${building} · ${t("village.detail_leagues_driver", { count: road.metricValue })}`;
  }
  return t("session.expedition_road", {
    building,
    value: road.metricValue,
    target: road.nextTarget,
  });
}

export function ExpeditionSummary({
  sessionUuid,
  language,
}: {
  sessionUuid: string | null;
  language: AppLanguage;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const track = useExpeditionStore((s) => s.track);
  const unit = useSettingsStore((s) => s.distanceUnit);
  const [road, setRoad] = useState<VillageBuilding | null>(null);

  // Read once, after the save: `saveSession` has already credited the leagues by the time this
  // mounts, so the level and the target here are the ones the hero just moved.
  useEffect(() => {
    getVillageBuildings()
      .then((buildings) => setRoad(buildings.find((b) => b.code === "high_road") ?? null))
      .catch((error) => {
        // A missing road line is a quieter victory screen; it is not worth failing the screen
        // over, but a village query that throws is worth knowing about.
        reportError("session.expeditionRoad", error);
      });
  }, []);

  return (
    <Card
      testID="victory-expedition"
      width="100%"
      maxW={520}
      bg="$surface"
      borderColor="$glassBorder"
      gap="$3"
    >
      <XStack>
        <Figure
          testID="victory-expedition-distance"
          label={t("session.expedition_ground")}
          value={formatDistance(track.distanceM, unit)}
        />
        <Figure
          testID="victory-expedition-moving"
          label={t("session.expedition_moving")}
          value={formatClock(track.movingMs)}
        />
        <Figure
          testID="victory-expedition-pace"
          label={t("session.expedition_pace")}
          value={formatPace(track.distanceM, track.movingMs, unit)}
        />
      </XStack>

      {road ? (
        <Text
          testID="victory-expedition-road"
          fontSize={13}
          color="$textSecondary"
          style={{ textAlign: "center" }}
        >
          {roadLine(road, language, t)}
        </Text>
      ) : null}

      {/* The same door the Journal draws, in the same shape, so the map is one component family
          across both screens. Secondary by design: Continue is this screen's only primary. */}
      {sessionUuid ? (
        <Card
          flat
          bg="$surface2"
          testID="victory-expedition-recap"
          onPress={() => router.push(`/recap?session=${encodeURIComponent(sessionUuid)}` as never)}
          accessibilityLabel={t("recap.open")}
        >
          <XStack items="center" gap="$3">
            <MapIcon size={20} color="$resourceGold" strokeWidth={2.5} />
            <Text flex={1} fontWeight="700" fontSize={16} color="$text">
              {t("recap.open")}
            </Text>
            <ChevronRight size={20} color="$textSecondary" />
          </XStack>
        </Card>
      ) : null}
    </Card>
  );
}
