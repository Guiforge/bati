import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { AppText } from "@/components/common/AppText";
import { Card } from "@/components/common/Card";
import { Figure } from "@/components/common/Figure";
import { RuleDisclosure } from "@/components/common/RuleDisclosure";
import { ChevronRight, Map as MapIcon } from "@/components/icons";
import { HandMark } from "@/components/journal/HandMark";
import { PastSessionSheet } from "@/components/journal/PastSessionSheet";
import { formatClock, formatDistance, formatRate } from "@/constants/distanceFormat";
import { formatDuration } from "@/db/estimate";
import { pricedLocomotion } from "@/db/expeditions";
import { getVillageBuildings, type VillageBuilding } from "@/db/village";
import { reportError } from "@/src/reportError";
import { useExpeditionStore } from "@/stores/expedition";
import { recordedDurationSeconds, useSessionStore } from "@/stores/session";
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

type SummaryProps = {
  sessionUuid: string | null;
  /** The saved row, which the distance of an outing without GPS is typed onto. */
  sessionId?: number | null;
  language: AppLanguage;
};

/** The High Road, read after the save and again whenever `refresh` changes. */
function useHighRoad(refresh: unknown): VillageBuilding | null {
  const [road, setRoad] = useState<VillageBuilding | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `refresh` is the trigger, not an input
  useEffect(() => {
    getVillageBuildings()
      .then((buildings) => setRoad(buildings.find((b) => b.code === "high_road") ?? null))
      .catch((error) => {
        // A missing road line is a quieter victory screen; it is not worth failing the screen
        // over, but a village query that throws is worth knowing about.
        reportError("session.expeditionRoad", error);
      });
  }, [refresh]);
  return road;
}

export function ExpeditionSummary(props: SummaryProps) {
  // The hero went out without GPS: there is no track to read, only a clock.
  const withoutGps = useSessionStore((s) => !s.gps);
  return withoutGps ? <UntracedSummary {...props} /> : <TracedSummary {...props} />;
}

/**
 * An outing without GPS: the duration it was paid on, an optional way to add the distance, and the
 * rule. No map, no pace, and no distance of zero. Once a distance is typed it shows, marked, and
 * the road is read again because the leagues are credited.
 */
function UntracedSummary({ sessionId = null, language }: SummaryProps) {
  const { t } = useTranslation();
  const unit = useSettingsStore((s) => s.distanceUnit);
  const quest = useSessionStore((s) => s.quest);
  /** The distance typed after the fact, in metres. */
  const [typedM, setTypedM] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const road = useHighRoad(typedM);
  const seconds = recordedDurationSeconds();
  return (
    <Card
      testID="victory-expedition"
      width="100%"
      maxW={520}
      bg="surface"
      borderColor="glassBorder"
      gap="3"
    >
      <XStack>
        <Figure
          testID="victory-expedition-duration"
          label={t("quests.config_duration")}
          value={formatDuration(seconds, language)}
        />
        {typedM === null ? null : (
          <YStack flex={1}>
            <Figure
              testID="victory-expedition-distance"
              label={t("session.expedition_ground")}
              value={formatDistance(typedM, unit, language)}
            />
            <HandMark what="distance" />
          </YStack>
        )}
      </XStack>

      {/* The distance, if the hero wants it: the duration above is already paid and kept. Under
            the Duration and full width, because half a column cannot hold a button set in the
            title face at large text. */}
      {typedM === null && sessionId !== null ? (
        <AppButton
          testID="victory-add-distance"
          variant="outline"
          backgroundColor="surface2"
          onPress={() => setAdding(true)}
        >
          {t("session.add_distance")}
        </AppButton>
      ) : null}
      <RuleDisclosure testID="victory-no-gps-rule" text={t("past_session.rule_no_gps")} />

      {typedM !== null && road ? (
        <AppText
          testID="victory-expedition-road"
          fontSize={13}
          color="textSecondary"
          style={{ textAlign: "center" }}
        >
          {roadLine(road, language, t)}
        </AppText>
      ) : null}

      {sessionId === null ? null : (
        <PastSessionSheet
          open={adding}
          mode="distance"
          target={{
            id: sessionId,
            kind: quest ? (pricedLocomotion(quest) ?? "walk") : "walk",
            endedAt: new Date(),
            durationSeconds: seconds,
            label: null,
            distanceM: null,
          }}
          onClose={() => setAdding(false)}
          onSaved={(_result, metres) => setTypedM(metres)}
        />
      )}
    </Card>
  );
}

function TracedSummary({ sessionUuid, language }: SummaryProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const track = useExpeditionStore((s) => s.track);
  const unit = useSettingsStore((s) => s.distanceUnit);
  // The view frozen at the start: the same choice the panel read, whatever the settings say now.
  const rate = useExpeditionStore((s) => s.view.rate);
  // Read once, after the save: `saveSession` has already credited the leagues by the time this
  // mounts, so the level and the target here are the ones the hero just moved.
  const road = useHighRoad(null);

  return (
    <Card
      testID="victory-expedition"
      width="100%"
      maxW={520}
      bg="surface"
      borderColor="glassBorder"
      gap="3"
    >
      <XStack>
        <Figure
          testID="victory-expedition-distance"
          label={t("session.expedition_ground")}
          value={formatDistance(track.distanceM, unit, language)}
        />
        <Figure
          testID="victory-expedition-moving"
          label={t("session.expedition_moving")}
          value={formatClock(track.movingMs)}
        />
        <Figure
          testID="victory-expedition-pace"
          label={t(`session.expedition_${rate}`)}
          // The row's figures (`credited`): whole metres, whole seconds. On the live floats the
          // victory said 11:52 /mi and the Journal 11:51 for the same walk.
          value={formatRate(
            Math.round(track.distanceM),
            Math.floor(track.movingMs / 1000) * 1000,
            unit,
            language,
            rate,
          )}
        />
      </XStack>

      {road ? (
        <AppText
          testID="victory-expedition-road"
          fontSize={13}
          color="textSecondary"
          style={{ textAlign: "center" }}
        >
          {roadLine(road, language, t)}
        </AppText>
      ) : null}

      {/* The same door the Journal draws, in the same shape, so the map is one component family
          across both screens. Secondary by design: Continue is this screen's only primary. */}
      {sessionUuid ? (
        <Card
          bg="surface2"
          testID="victory-expedition-recap"
          onPress={() => router.push(`/recap?session=${encodeURIComponent(sessionUuid)}` as never)}
          accessibilityLabel={t("recap.open")}
        >
          <XStack items="center" gap="3">
            <MapIcon size={20} color="resourceGold" strokeWidth={2.5} />
            <AppText flex={1} fontWeight="700" fontSize={16} color="text">
              {t("recap.open")}
            </AppText>
            <ChevronRight size={20} color="textSecondary" />
          </XStack>
        </Card>
      ) : null}
    </Card>
  );
}
