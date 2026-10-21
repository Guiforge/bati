import { Image } from "expo-image";
import type { TFunction } from "i18next";
import { memo, type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Trophy } from "@/components/icons";
import { HandMark } from "@/components/journal/HandMark";
import { feelingLabel, questLevelLabel } from "@/components/journal/journalFormat";
import { NKicker, NMuted, NText } from "@/components/journal/nocturne";
import type { ArtSource } from "@/constants/assetMap";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { formatDistance } from "@/constants/distanceFormat";
import { formatDuration } from "@/db";
import { hasGround } from "@/db/expeditions";
import type { DifficultyCode, FeedbackCode, Locomotion } from "@/db/schema";
import { firstSessionPhoto } from "@/db/sessionPhotos";
import { formatCount } from "@/db/targets";
import type { LngLat } from "@/src/gps/trace";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";
import { TraceThumb } from "./TraceThumb";

export interface JournalEntry {
  id: number;
  questTitle: string;
  /**
   * The quest's cover, list-sized, or null when it has none.
   *
   * Every row drew the same gold trophy, so a journal of twenty sessions was twenty identical
   * icons and the title was the only thing telling them apart - on the one screen whose job is
   * to let you find a session again. Resolved by the list rather than here, next to the title it
   * comes from: the quest template is already in hand there, and `SessionCard` is memoized on
   * props it should not be re-deriving.
   */
  cover?: ArtSource | null;
  performedAt: Date;
  durationSeconds: number | null;
  leaguesM: number | null;
  /** What the session paid. Zero on a row that somehow earned nothing, which draws no tag. */
  xpEarned: number;
  /** Moving seconds, on an outing. Null on a workout and on an outing saved before 0046. */
  movingSeconds: number | null;
  /** Which kind of session this was (`0049`). Null is a workout. */
  outing: Locomotion | null;
  /**
   * A few dozen points of this run, thinned for a thumbnail (`previewPathsFor`, `db/gps.ts`).
   * Empty on a workout, and on an outing whose service never started.
   */
  tracePoints: readonly LngLat[];
  /** The session's uuid: names the cached map under the line. Null on rows saved before uuids. */
  uuid?: string | null;
  userLevel: DifficultyCode;
  /** The hero's note on the session, shown on two lines (J-01). Empty when there is none. */
  notes?: string;
  /** How many photos the session has: the card reads its first one only when this is above 0. */
  photoCount?: number;
  /**
   * The uuid of the photo the card shows. The card re-reads when it changes, so a photo removed in
   * the detail does not stay on the card, and a recycled row never keeps another session's image.
   */
  firstPhotoUuid?: string | null;
  hasNewRecords?: boolean;
  /** How the hero said the session felt, when they said. Null when they did not. */
  feedback?: FeedbackCode | null;
  /**
   * Which part is the hero's word (`0078`): `'session'` for a session written down, `'distance'`
   * for an outing whose distance was typed. Absent or null: everything was measured.
   */
  byHand?: "session" | "distance" | null;
  /** The name a session written down was given ("gym"). */
  label?: string | null;
  /**
   * What the badge broke, when the row knows: the movement's name, or the record's own word.
   *
   * Null on every session saved before `0051`, which is when the row started keeping it. The
   * badge falls back to "PR" there rather than guessing: recomputing which record fell against
   * today's history would answer a different question than the one the day asked.
   */
  recordLabel?: string | null;
}

interface SessionCardProps {
  entry: JournalEntry;
  // Takes the id instead of a closure so the list can pass one stable handler to every
  // row and React.memo actually skips re-renders.
  onPressEntry?: (id: number) => void;
}

const COVER_STYLE = { width: "100%", height: "100%" } as const;

const SESSION_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
};

/** The first photo of a session, read when the card mounts: a page never loads 100 images. */
function CardPhoto({ uuid, photoUuid }: { uuid: string; photoUuid: string }) {
  const key = `${uuid}/${photoUuid}`;
  const [shown, setShown] = useState<{ key: string; uri: string | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    firstSessionPhoto(uuid)
      .then((image) => {
        if (!cancelled) setShown({ key, uri: image });
      })
      .catch((error: unknown) => reportError("journal.cardPhoto", error));
    return () => {
      cancelled = true;
    };
  }, [uuid, key]);
  // An image read for another row or another photo is never drawn: the hold stands in until it lands.
  const uri = shown?.key === key ? shown.uri : null;
  if (uri === null) return <YStack testID="journal-card-photo-hold" height={120} />;
  return (
    <Image
      testID="journal-card-photo"
      source={{ uri }}
      style={{ width: "100%", height: 120, borderRadius: 6 }}
      contentFit="cover"
      accessible={false}
    />
  );
}

/**
 * The 64 px square at the start of a row. Blank (`blank`) for a session written down: there is no
 * run to draw and no cover to show, and the empty square is the honest picture of it.
 */
function Thumb({ entry, blank }: { entry: JournalEntry; blank: boolean }) {
  return (
    <YStack
      width={64}
      height={64}
      bg="$surface2"
      rounded="$4"
      borderWidth={1}
      borderColor="$borderStrong"
      items="center"
      justify="center"
      overflow="hidden"
    >
      {/* The run itself, when there is one. The three seeded outings share three pictures, so
              a page of walks was a column of identical thumbnails - the same complaint the
              trophy below records, one row further in. A line is never the same twice. */}
      {/* One segment: `previewPathsFor` downsamples and drops the clock, so a row cannot know
              where the run broke. The detail screen behind it draws the real stretches. */}
      {blank ? null : entry.tracePoints.length > 1 ? (
        <TraceThumb segments={[entry.tracePoints]} size={64} mapKey={entry.uuid ?? undefined} />
      ) : entry.cover ? (
        <Image
          source={entry.cover}
          recyclingKey={String(entry.id)}
          style={COVER_STYLE}
          contentFit="cover"
          accessible={false}
        />
      ) : (
        // A hero-authored quest has no cover, and the trophy is the honest stand-in: it says
        // "a session happened" without pretending to be a picture of one.
        <Trophy size={24} color="$resourceGold" />
      )}
    </YStack>
  );
}

/** A session written down is named by the hero, or "Session elsewhere"; any other by its quest. */
function rowTitle(entry: JournalEntry, t: TFunction): string {
  return entry.byHand === "session"
    ? (entry.label ?? t("past_session.default_name"))
    : entry.questTitle;
}

/** No difficulty on a walk, nor on a session the hero wrote down: nobody chose a level for it. */
function levelOf(entry: JournalEntry, t: TFunction): string | null {
  return entry.outing || entry.byHand === "session" ? null : questLevelLabel(t, entry.userLevel);
}

export const SessionCard = memo(function SessionCard({ entry, onPressEntry }: SessionCardProps) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const unit = useSettingsStore((s) => s.distanceUnit);
  const onPress = onPressEntry ? () => onPressEntry(entry.id) : undefined;
  const writtenDown = entry.byHand === "session";
  const title = rowTitle(entry, t);

  // The year only when it is not this one: a veteran's history runs back two years, and "Sun, Sep
  // 15" from 2024 read as last Sunday.
  const performed = new Date(entry.performedAt);
  const dateLabel = getDateTimeFormat(
    language,
    performed.getFullYear() === new Date().getFullYear()
      ? SESSION_DATE_OPTIONS
      : { ...SESSION_DATE_OPTIONS, year: "numeric" },
  ).format(performed);

  const durationLabel = entry.durationSeconds
    ? formatDuration(entry.durationSeconds, language)
    : null;
  // An outing's row leads with the ground, which is the one number a walk is remembered by.
  const metaLabel = hasGround(entry)
    ? [formatDistance(entry.leaguesM, unit, language), durationLabel].filter(Boolean).join(" · ")
    : durationLabel;
  // What the session was worth, not only how long it took. A row gave a duration and a difficulty
  // and never what was done inside it, so two runs of the same quest a month apart were
  // indistinguishable unless one happened to last longer. XP is priced off reps, tempo and
  // difficulty, so it is the effort, in the unit this game already counts in. A difficulty means
  // nothing on a walk.
  const parts: ReactNode[] = [
    metaLabel,
    entry.xpEarned > 0 ? (
      <NText key="xp" testID="journal-row-xp" fontSize={12} lineHeight={17} color="$resourceGold">
        {t("quests.reward_xp", { count: formatCount(language, entry.xpEarned) })}
      </NText>
    ) : null,
    levelOf(entry, t),
  ].filter(Boolean);

  return (
    <Card testID="journal-session-card" onPress={onPress}>
      <YStack gap="$2">
        <XStack gap="$3" items="center">
          {/* Icon */}
          {/* 64, not 50.
            The journal's covers are dark-fantasy paintings, and a dark painting cropped to a 50 px
            square on a dark card is a smudge: four rows of it read as four identical smudges with
            the title as the only thing telling them apart, on the one screen whose job is finding
            a session again. Fourteen more pixels is the whole fix, and the axe, the shield and the
            tower are legible at it.

            A ring in the quest's own colour was tried and dropped: `accent` is the same token for
            every key, and `bg`'s pastels resolve to near-identical plums against `$surface2`, so
            it was an ornament that looked like information. */}
          <Thumb entry={entry} blank={writtenDown} />

          <YStack flex={1} gap="$1">
            <XStack gap="$2" items="center">
              <NText fontWeight="500" fontSize={16} lineHeight={22} numberOfLines={1} flex={1}>
                {title}
              </NText>
              {/* A gold word, the wall's own kicker, where a filled badge was: no plate, no border,
                nothing more for the GPU to draw per row than the text it already draws. */}
              {!!entry.hasNewRecords && !writtenDown && (
                <NKicker numberOfLines={1} style={{ flexShrink: 1, maxWidth: "40%" }}>
                  {entry.recordLabel ?? t("journal.pr_badge")}
                </NKicker>
              )}
            </XStack>

            {/* One line of text where there were a calendar icon and three tags: the row cost the
              emulator's GPU 18 ms a frame against 10 for every other list, and History scrolled at
              26 ms (perf audit, 2026-09-15). No single element was the cause, each icon, tag and
              translucent text added to it; the line took the list from 0 smooth passes out of 9
              to about half.
              ponytail: measured on the emulator only, whose GPU is the host's through a
              translation layer. A release build on a phone decides whether the row needs more. */}
            <NMuted numberOfLines={1}>{dateLabel}</NMuted>
            {/* Two lines: at 130 % "Quête difficile" was cut to "Quête d…" at the end of one. */}
            <NText fontSize={12} lineHeight={17} numberOfLines={2}>
              {parts.flatMap((part, i) => (i ? [" · ", part] : [part]))}
            </NText>
            {entry.feedback ? (
              <NMuted fontSize={12} lineHeight={17} numberOfLines={1} testID="journal-row-feeling">
                {feelingLabel(t, language, entry.feedback)}
              </NMuted>
            ) : null}
            {/* On its own line: the details line is one line, and the mark was cut at its end. */}
            {entry.byHand ? <HandMark what={writtenDown ? "entry" : "distance"} /> : null}
          </YStack>
        </XStack>
        {entry.photoCount && entry.uuid && entry.firstPhotoUuid ? (
          <CardPhoto uuid={entry.uuid} photoUuid={entry.firstPhotoUuid} />
        ) : null}
        {!!entry.notes && (
          <NText testID="journal-card-note" fontSize={12} lineHeight={17} numberOfLines={2}>
            {entry.notes}
          </NText>
        )}
      </YStack>
    </Card>
  );
});
