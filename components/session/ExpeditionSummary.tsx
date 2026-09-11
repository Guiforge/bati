import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Figure } from "@/components/common/Figure";
import { ChevronRight, Map as MapIcon } from "@/components/icons";
import { formatClock, formatDistance, formatPace } from "@/constants/distanceFormat";
import { getVillageBuildings, type VillageBuilding } from "@/db/village";
import { reportError } from "@/src/reportError";
import { useExpeditionStore } from "@/stores/expedition";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";
import { roadLine } from "./roadLine";

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
