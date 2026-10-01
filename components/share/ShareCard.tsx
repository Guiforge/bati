import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Swords, Trophy } from "@/components/icons";
import { NKicker, NKickerQuiet, NMuted, NNum, NText } from "@/components/journal/nocturne";
import type { QuestLogData } from "@/components/journal/QuestLog";
import { recordName, recordValue } from "@/components/journal/recordLabel";
import { type MapState, TraceThumb } from "@/components/journal/TraceThumb";
import { getQuestAsset } from "@/constants/assetMap";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { MAP_ATTRIBUTION } from "@/constants/mapStyle";
import type { KillReport } from "@/db/journal";
import { useSettingsStore } from "@/stores/settings";
import { sharedLine, shareKicker, shareStats } from "./shareStats";

/**
 * The picture a hero sends: what they did, when, and the one thing worth bragging about.
 *
 * Drawn for a stranger's chat, not for the journal. So the date is a date and never "yesterday",
 * which would be wrong by the time it is read; there is no back button, no difficulty word only
 * this app defines, and nothing tappable. The name of the app sits at the foot, small, as a
 * signature rather than an advert.
 *
 * Everything on it is drawn from `QuestLogData`, the journal page's own read, so the card and the
 * page the hero came from cannot tell two stories about one session.
 */
export function ShareCard({
  log,
  kill,
  width,
  showMap,
  mapState,
  onMapState,
}: {
  log: QuestLogData;
  kill: KillReport | null;
  width: number;
  showMap: boolean;
  /** Whether the map under the line is on screen, told by the line itself (`TraceThumb`). */
  mapState: MapState;
  onMapState: (state: MapState) => void;
}) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const unit = useSettingsStore((s) => s.distanceUnit);
  const { session } = log;
  const stats = shareStats(session, t, language, unit);

  const date = getDateTimeFormat(language, { dateStyle: "long" }).format(session.performedAt);

  return (
    <YStack
      testID="share-card"
      width={width}
      bg="$bgDark"
      rounded={16}
      borderWidth={1}
      borderColor="$glassBorder"
      overflow="hidden"
    >
      <CardVisual log={log} width={width} showMap={showMap} onMapState={onMapState} />

      <YStack p={17} gap={6}>
        {/* The kicker names the best thing that happened, so a boss or a record is the first
            word read and not a line under the numbers. */}
        <NKicker testID="share-card-kicker">{t(shareKicker(log, kill != null))}</NKicker>
        <NText fontWeight="500" fontSize={22} lineHeight={28}>
          {log.questTitle}
        </NText>
        <NMuted>{date}</NMuted>

        <Brag log={log} kill={kill} />

        {stats.length > 0 ? (
          <XStack gap={17} mt={11} flexWrap="wrap">
            {stats.map((stat) => (
              <YStack key={stat.label}>
                <NNum fontSize={20} lineHeight={26}>
                  {stat.value}
                </NNum>
                <NMuted fontSize={11}>{stat.label}</NMuted>
              </YStack>
            ))}
          </XStack>
        ) : null}

        <XStack mt={11} items="flex-end" justify="space-between" gap={11}>
          <NKickerQuiet>Bati</NKickerQuiet>
          {/* ODbL wants the credit wherever the map is shown, and a sent picture is shown. Only
              when it is: a credit over a line whose map never arrived credits nothing. */}
          {mapState === "ready" ? (
            <NMuted flex={1} fontSize={9} lineHeight={12} style={{ textAlign: "right" }}>
              {MAP_ATTRIBUTION}
            </NMuted>
          ) : null}
        </XStack>
      </YStack>
    </YStack>
  );
}

/**
 * The run's own line when there is one: the shape is what a walk is remembered by. A workout
 * leads with its quest's painting instead. The square stays a square in both states of the map
 * toggle, so switching the map off does not move the text under it.
 */
function CardVisual({
  log,
  width,
  showMap,
  onMapState,
}: {
  log: QuestLogData;
  width: number;
  showMap: boolean;
  onMapState: (state: MapState) => void;
}) {
  const line = sharedLine(log.trace);
  if (line.length > 0) {
    const uuid = log.session.uuid;
    return (
      <YStack bg="$bgDark" items="center" minH={width}>
        {/* The ends are cut on a picture that leaves the phone, map or not: a loop from the front
            door draws the street in front of it either way. Its own cache key, so the
            journal's full-line pictures and this one never stand in for each other. */}
        <TraceThumb
          segments={line}
          size={width}
          mapKey={showMap && uuid ? `${uuid}-shared` : undefined}
          onMapState={onMapState}
        />
      </YStack>
    );
  }
  if (!log.questImage) return null;
  return (
    <Image
      source={getQuestAsset(log.questImage)}
      style={{ width, height: Math.round(width * 0.5) }}
      contentFit="cover"
      accessible={false}
    />
  );
}

/** The boss that fell and the record that broke: the reason anyone sends the picture at all. */
function Brag({ log, kill }: { log: QuestLogData; kill: KillReport | null }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const unit = useSettingsStore((s) => s.distanceUnit);
  // A movement first, as the journal does: it names something to beat next time.
  const record = log.records.find((r) => r.exerciseId != null) ?? log.records[0];
  // Counted the way the journal's record panel counts them, so the card and the page agree.
  const otherRecords = log.records.filter((r) => r !== record && r.exerciseId != null).length;

  return (
    <>
      {kill ? (
        <XStack testID="share-card-kill" gap={8} items="center" mt={6}>
          <Swords size={20} color="$resourceGold" strokeWidth={2.5} />
          <NText flex={1} fontSize={17} lineHeight={23} color="$gold300">
            {t("share.boss_felled", { boss: kill.title[language] || kill.title.en })}
          </NText>
        </XStack>
      ) : null}
      {record ? (
        <XStack testID="share-card-record" gap={8} items="center" mt={6}>
          <Trophy size={20} color="$resourceGold" strokeWidth={2.5} />
          <NText flex={1} fontSize={17} lineHeight={23} color="$gold300">
            {t("share.record", {
              record: `${recordName(t, language, record)}, ${recordValue(record, unit, language)}`,
            })}
            {otherRecords > 0 ? ` ${t("journal.record_more", { count: otherRecords })}` : ""}
          </NText>
        </XStack>
      ) : null}
    </>
  );
}
