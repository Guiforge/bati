import type { TFunction } from "i18next";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";
import { Input, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Chip } from "@/components/common/Chip";
import { FormSheet } from "@/components/common/FormSheet";
import { RuleDisclosure } from "@/components/common/RuleDisclosure";
import { useRevealInSheet } from "@/components/common/revealInSheet";
import { SectionLabel } from "@/components/common/SectionLabel";
import { useToast } from "@/components/common/Toast";
import { Info } from "@/components/icons";
import {
  DURATION_CHIPS_MIN,
  dayChoices,
  dayFromLink,
  filedDay,
  openingDay,
  parseDistanceM,
  parseMinutes,
  proposedEnd,
  settleDay,
  toastKey,
  typedEnd,
  typedEndOn,
} from "@/components/journal/pastSessionForm";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { formatDistance, formatRate, METRES_PER_TYPED_UNIT } from "@/constants/distanceFormat";
import { formatDuration } from "@/db";
import { dayKey } from "@/db/dates";
import {
  correctHandEntry,
  createHandEntry,
  getHandDefaults,
  HAND_LABEL_MAX,
  type HandDefaults,
  type HandInput,
  type HandResult,
  loadHandContext,
  refusalFor,
  setHandDistance,
} from "@/db/handEntries";
import {
  checkHandDistance,
  HAND_MAX_DAYS_BACK,
  HAND_PAID_MAX,
  type HandContext,
  type HandKind,
  type HandRefusal,
  handEntryPays,
  parseClock,
} from "@/db/handEntryRules";
import type { DistanceUnit } from "@/db/preferences";
import { listQuestTemplates } from "@/db/quests";
import type { Locomotion } from "@/db/schema";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/** The session being corrected, or the outing a distance is being added to. */
export type PastSessionTarget = {
  id: number;
  kind: HandKind;
  endedAt: Date;
  durationSeconds: number;
  label: string | null;
  distanceM: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  mode?: "entry" | "distance";
  target?: PastSessionTarget | null;
  /** `yyyy-MM-dd` from the reminder's link, read strictly (`dayFromLink`). */
  day?: string;
  /** The result, and the distance as saved in metres (null when none): the victory screen shows it. */
  onSaved?: (result: Extract<HandResult, { ok: true }>, distanceM: number | null) => void;
};

const KINDS: HandKind[] = ["workout", "walk", "run", "ride"];
const KIND_LABEL: Record<Locomotion, string> = {
  walk: "outing_display.tab_walk",
  run: "outing_display.tab_run",
  ride: "outing_display.tab_ride",
};

type Fields = {
  kind: HandKind;
  day: Date;
  end: Date;
  seconds: number;
  customOpen: boolean;
  customText: string;
  label: string;
  distanceText: string;
};

/** Every field the sheet opens on: the entry being corrected, else the last one's habits. */
function initialFields(
  target: PastSessionTarget | null,
  defaults: HandDefaults,
  context: HandContext,
  link: string | undefined,
  now: Date,
  metresPerUnit: number,
): Fields {
  const durationFields = (seconds: number) => {
    const isChip = DURATION_CHIPS_MIN.some((m) => m * 60 === seconds);
    return { customOpen: !isChip, customText: isChip ? "" : String(Math.round(seconds / 60)) };
  };
  if (target) {
    return {
      kind: target.kind,
      day: dayFromLink(dayKey(target.endedAt), now),
      end: target.endedAt,
      seconds: target.durationSeconds,
      ...durationFields(target.durationSeconds),
      label: target.label ?? "",
      distanceText: target.distanceM
        ? String(Math.round((target.distanceM / metresPerUnit) * 100) / 100)
        : "",
    };
  }
  const seconds = defaults.durationSeconds ?? (defaults.kind === "workout" ? 45 * 60 : 30 * 60);
  const opening =
    link === undefined
      ? openingDay(now, context.handDays, seconds, context.measured, context.firstMeasuredAt)
      : null;
  const day = opening?.day ?? dayFromLink(link, now);
  return {
    kind: defaults.kind,
    day,
    end: opening?.end ?? proposedEnd(day, now, seconds, context.measured),
    seconds,
    ...durationFields(seconds),
    label: defaults.label ?? "",
    distanceText: "",
  };
}

type SentenceContext = {
  t: TFunction;
  language: AppLanguage;
  unit: DistanceUnit;
  timeFormat: Intl.DateTimeFormat;
  /** The entry as typed, for the sentences that quote it. */
  kind: HandKind;
  durationSeconds: number;
  endAt: Date;
  distanceM: number;
  titleOf: (questId: number | null) => string | null;
};

/** Said before saving a new entry that will pay nothing; null when it pays, or is a correction. */
function unpaidNote(t: TFunction, pays: boolean, target: PastSessionTarget | undefined | null) {
  if (pays || target) return null;
  return t("past_session.note_unpaid", { max: HAND_PAID_MAX, days: HAND_MAX_DAYS_BACK + 1 });
}

/** The refusal as a sentence, one voice each (`past_session.refuse_*`). */
function refusalSentence(r: HandRefusal, c: SentenceContext): string {
  const { t, language, unit } = c;
  switch (r.key) {
    case "too_old":
      return t("past_session.refuse_too_old");
    case "before_first":
      return t("past_session.refuse_before_first");
    case "duration":
      return t("past_session.refuse_duration");
    case "future":
      return t("past_session.refuse_future");
    case "one_per_day": {
      if (r.day === dayKey(new Date())) return t("past_session.refuse_one_per_day_today");
      if (r.day === dayKey(new Date(Date.now() - 86_400_000))) {
        return t("past_session.refuse_one_per_day_yesterday");
      }
      const [y, m, d] = r.day.split("-").map(Number);
      const weekday = getDateTimeFormat(language, { weekday: "long" }).format(
        new Date(y ?? 0, (m ?? 1) - 1, d ?? 1),
      );
      return t("past_session.refuse_one_per_day_weekday", { weekday });
    }
    case "overlap": {
      // The first moment the entry and the measured session share.
      const start = Math.max(
        c.endAt.getTime() - c.durationSeconds * 1000,
        r.with.startedAt.getTime(),
      );
      return t("past_session.refuse_overlap", {
        time: c.timeFormat.format(new Date(start)),
        name: c.titleOf(r.with.questId) ?? t("past_session.overlap_unknown"),
      });
    }
    case "implausible":
      return t(
        r.fixM === null
          ? "past_session.refuse_implausible_nofix"
          : "past_session.refuse_implausible",
        {
          distance: formatDistance(c.distanceM, unit, language),
          duration: formatDuration(c.durationSeconds, language),
          speed: formatRate(c.distanceM, c.durationSeconds * 1000, unit, language, "speed"),
          way: t(`past_session.way_${c.kind === "workout" ? "walk" : c.kind}`),
          fix: r.fixM === null ? "" : formatDistance(r.fixM, unit, language),
        },
      );
    default:
      return "";
  }
}

function customUnreadable(distanceOnly: boolean, open: boolean, text: string): boolean {
  return !distanceOnly && open && parseMinutes(text) === null;
}

/**
 * Writes down a session Bati did not see: a gym session, a walk without the phone, or, in distance
 * mode, the distance of an outing Bati timed without GPS. Every field is prefilled so the usual
 * answer is one tap on "Enregistrer", and the prefill never opens on a refusal.
 *
 * The button and the line above it (the rule, or the refusal) are the sheet's footer, outside the
 * scroll: they stay in reach at 130 % text and with the keyboard up. A refusal is a sentence in the
 * footer and never red, and "Enregistrer" is off while one stands.
 *
 * No `useMemo` or `useCallback`: the React Compiler memoizes.
 */
export function PastSessionSheet({ open, onClose, mode = "entry", target, day, onSaved }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const language = useSettingsStore((s) => s.language);
  const unit = useSettingsStore((s) => s.distanceUnit);
  const metresPerUnit = METRES_PER_TYPED_UNIT[unit];
  const unitWord = unit === "imperial" ? "mi" : "km";
  const distanceOnly = mode === "distance";

  const [kind, setKind] = useState<HandKind>("workout");
  const [otherDays, setOtherDays] = useState(false);
  const [endAt, setEndAt] = useState<Date>(new Date());
  const [endText, setEndText] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(45 * 60);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [label, setLabel] = useState("");
  const [distanceText, setDistanceText] = useState("");
  const [refusal, setRefusal] = useState<HandRefusal | null>(null);
  /** The distance the refusal was read on: the sentence quotes it, so it must not follow the field. */
  const [refusalM, setRefusalM] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  /** A new entry still pays its XP (`handEntryPays`), read when the sheet opens. */
  const [pays, setPays] = useState(true);
  const [ready, setReady] = useState(false);
  /** A typed field settled (blur): the refusals of typed fields are read then, never per key. */
  const [settled, setSettled] = useState(0);
  const [titles, setTitles] = useState<Map<number, string>>(new Map());
  const endTouched = useRef(false);

  const timeFormat = getDateTimeFormat(language, { hour: "2-digit", minute: "2-digit" });

  // Opened: read the journal once and set every field, so the hero starts from an answer. The open
  // edge only: the fields are the hero's from here on.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    let cancelled = false;
    const now = new Date();
    setRefusal(null);
    setOtherDays(false);
    endTouched.current = false;
    (async () => {
      const [defaults, context, templates] = await Promise.all([
        getHandDefaults(),
        loadHandContext(target?.id ?? null, now),
        listQuestTemplates().catch(() => []),
      ]);
      if (cancelled) return;
      setTitles(new Map(templates.map((q) => [q.id, localizedTitle(q, language)])));
      const f = initialFields(target ?? null, defaults, context, day, now, metresPerUnit);
      setPays(handEntryPays(context));
      setKind(f.kind);
      setEndAt(f.end);
      setEndText(timeFormat.format(f.end));
      setDurationSeconds(f.seconds);
      setCustomOpen(f.customOpen);
      setCustomText(f.customText);
      setLabel(f.label);
      setDistanceText(f.distanceText);
      setReady(true);
      setSettled((n) => n + 1);
    })().catch((e: unknown) => reportError("pastSession.open", e));
    return () => {
      cancelled = true;
    };
  }, [open]);

  // The language can arrive after the form opens (cold start from a notification): an end time the
  // hero has not touched follows it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new language reformats
  useEffect(() => {
    if (ready && !endTouched.current) setEndText(timeFormat.format(endAt));
  }, [language]);

  /** What the fields say right now: a typed time or duration counts before its field blurs. */
  const typed = () => {
    const clock = endText === timeFormat.format(endAt) ? null : parseClock(endText);
    const minutes = customOpen ? parseMinutes(customText) : null;
    const seconds = minutes ?? durationSeconds;
    return {
      endedAt: clock === null ? endAt : typedEnd(endAt, seconds, clock, new Date()),
      durationSeconds: seconds,
    };
  };

  const input = (): HandInput => ({
    kind,
    ...typed(),
    distanceM: kind === "workout" ? null : parseDistanceM(distanceText, metresPerUnit),
    label,
  });

  // Back closes the keyboard without a blur: read the typed fields then too.
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => setSettled((n) => n + 1));
    return () => sub.remove();
  }, []);

  // The refusal, read when a chip changes or a typed field settles.
  // biome-ignore lint/correctness/useExhaustiveDependencies: typed fields count on `settled`
  useEffect(() => {
    if (!open || !ready) return;
    let cancelled = false;
    const read = (): Promise<HandRefusal | null> => {
      if (!distanceOnly) return refusalFor(input(), target?.id ?? null);
      const m = parseDistanceM(distanceText, metresPerUnit);
      return Promise.resolve(
        target && target.kind !== "workout"
          ? checkHandDistance(target.kind, target.durationSeconds, m)
          : null,
      );
    };
    read()
      .then((next) => {
        if (cancelled) return;
        setRefusal(next);
        setRefusalM(parseDistanceM(distanceText, metresPerUnit));
      })
      .catch((e: unknown) => reportError("pastSession.refusal", e));
    return () => {
      cancelled = true;
    };
  }, [open, ready, kind, endAt, durationSeconds, customOpen, settled]);

  // A refusal on screen is re-read as the hero types, so it goes the moment the value is plausible
  // instead of waiting for Enter or a blur. Only while one is showing: a field is never refused
  // mid-word, it is only released early. The effect above reads the state this render commits.
  const retype = (set: (v: string) => void) => (v: string) => {
    set(v);
    if (refusal !== null) setSettled((n) => n + 1);
  };

  const pickDay = (picked: Date) => {
    if (!endTouched.current) {
      // Not touched yet: another day proposes its own hour; a touched hour follows the hero.
      loadHandContext(target?.id ?? null, new Date())
        .then((ctx) => {
          // Settled on the filed day: "today" at 00:20 is the evening before, as at the opening.
          const { end } = settleDay(picked, new Date(), durationSeconds, ctx.measured);
          setEndAt(end);
          setEndText(timeFormat.format(end));
        })
        .catch((e: unknown) => reportError("pastSession.day", e));
      return;
    }
    // The typed hour on the day the chip names, which is the filed day: `endOn` put it on the
    // calendar day and filed a 00:10 under the day before.
    setEndAt(
      typedEndOn(
        picked,
        durationSeconds,
        { hours: endAt.getHours(), minutes: endAt.getMinutes() },
        new Date(),
      ),
    );
  };

  const commitEnd = () => {
    const clock = parseClock(endText);
    if (clock === null) {
      setEndText(timeFormat.format(endAt));
      return;
    }
    endTouched.current = true;
    const next = typedEnd(endAt, typed().durationSeconds, clock, new Date());
    setEndAt(next);
    setEndText(timeFormat.format(next));
    setSettled((n) => n + 1);
  };

  const commitCustom = () => {
    const seconds = parseMinutes(customText);
    if (seconds !== null) setDurationSeconds(seconds);
    setSettled((n) => n + 1);
  };

  /** The write for this mode, or null when there is nothing to write. */
  const write = (): Promise<HandResult> | null => {
    if (distanceOnly) {
      return target
        ? setHandDistance(target.id, parseDistanceM(distanceText, metresPerUnit))
        : null;
    }
    return target ? correctHandEntry(target.id, input()) : createHandEntry(input());
  };

  const afterWrite = (result: HandResult) => {
    if (!result.ok) {
      setRefusal(result.refusal);
      setRefusalM(parseDistanceM(distanceText, metresPerUnit));
      return;
    }
    // A distance alone says nothing, unless it tipped the oath.
    if (target && !distanceOnly && !result.oathKept) {
      // A correction pays nothing: no "+XP".
      toast.showSuccess(t("past_session.toast_corrected"));
    } else if (!distanceOnly || result.oathKept) {
      toast.showSuccess(t(`past_session.${toastKey(result)}`, { xp: result.xp }));
    }
    onSaved?.(result, outing ? parseDistanceM(distanceText, metresPerUnit) : null);
    onClose();
  };

  // A promise chain, not try/finally: the React Compiler cannot lower one inside a component.
  const save = () => {
    const writing = saving ? null : write();
    if (writing === null) return;
    setSaving(true);
    writing
      .then(afterWrite)
      .catch((e: unknown) => reportError("pastSession.save", e))
      .finally(() => setSaving(false));
  };

  const refusalText = (r: HandRefusal): string =>
    refusalSentence(r, {
      t,
      language,
      unit,
      timeFormat,
      kind,
      durationSeconds,
      endAt,
      distanceM: refusalM ?? 0,
      titleOf: (id) => (id === null ? null : (titles.get(id) ?? null)),
    });

  const days = dayChoices(new Date());
  const shownDays = otherDays ? days : days.slice(0, 2);
  // The chip names the day the entry is filed under, whatever moved it there (a tap, the
  // duration, a typed hour): derived from the end and the length, never held beside them.
  const live = typed();
  const shownDay = filedDay(live.endedAt, live.durationSeconds);
  const isChosen = (d: Date) => dayKey(d) === dayKey(shownDay);
  const dayLabel = (d: Date, index: number) =>
    index === 0
      ? t("past_session.today")
      : index === 1
        ? t("past_session.yesterday")
        : getDateTimeFormat(language, { weekday: "short", day: "numeric" }).format(d);
  const dayA11y = (d: Date, index: number) =>
    index <= 1
      ? dayLabel(d, index)
      : getDateTimeFormat(language, { weekday: "long", day: "numeric", month: "long" }).format(d);

  const title = distanceOnly
    ? t("past_session.title_distance")
    : target
      ? t("past_session.title_edit")
      : t("past_session.title");
  const outing = kind !== "workout";
  const ruleKey = distanceOnly ? "past_session.rule_no_gps" : "past_session.rule";

  // "Other" chosen and nothing readable in it: saving would write the chip the hero just left.
  const unreadableCustom = customUnreadable(distanceOnly, customOpen, customText);

  const footer = (
    <SheetFooter
      refusalLine={refusal ? refusalText(refusal) : null}
      noteLine={unpaidNote(t, pays, target)}
      rule={t(ruleKey)}
      disabled={refusal !== null || saving || !ready || unreadableCustom}
      onSave={save}
    />
  );

  // The fix chips of refusal 5 sit in the body, under the field they correct.
  const fix = refusal !== null && refusal.key === "implausible" ? refusal : null;
  const fixM = fix === null ? null : fix.fixM;
  const fixLabel =
    fixM === null
      ? null
      : t("past_session.fix_distance", { fix: formatDistance(fixM, unit, language) });

  return (
    <FormSheet open={open} title={title} onClose={onClose} footer={footer}>
      {distanceOnly ? null : (
        <>
          <XStack gap="$2" flexWrap="wrap">
            {KINDS.map((k) => (
              <Chip
                key={k}
                label={k === "workout" ? t("past_session.type_workout") : t(KIND_LABEL[k])}
                selected={kind === k}
                onPress={() => setKind(k)}
              />
            ))}
          </XStack>

          <WhenSection
            choices={shownDays.map((d, i) => ({
              key: dayKey(d),
              label: dayLabel(d, i),
              a11y: dayA11y(d, i),
              chosen: isChosen(d),
              day: d,
            }))}
            showOtherDays={!otherDays}
            otherChosen={!shownDays.some(isChosen)}
            otherLabel={dayLabel(shownDay, days.findIndex(isChosen))}
            onPickDay={pickDay}
            onOtherDays={() => setOtherDays(true)}
            endText={endText}
            onEndText={retype(setEndText)}
            onEndCommit={commitEnd}
          />

          <DurationSection
            seconds={durationSeconds}
            customOpen={customOpen}
            customText={customText}
            onChip={(m) => {
              setCustomOpen(false);
              setDurationSeconds(m * 60);
            }}
            onCustom={() => setCustomOpen(true)}
            onCustomText={retype(setCustomText)}
            onCustomCommit={commitCustom}
          />
        </>
      )}

      {outing || distanceOnly ? (
        <DistanceField
          value={distanceText}
          onChange={retype(setDistanceText)}
          onSettle={() => setSettled((n) => n + 1)}
          unitWord={unitWord}
          a11y={t("past_session.distance_a11y", { unit: unitWord })}
          fix={fix}
          fixLabel={fixLabel}
          onFix={() => {
            setDistanceText(String(Math.round(((fixM ?? 0) / metresPerUnit) * 100) / 100));
            setSettled((n) => n + 1);
          }}
        />
      ) : (
        <YStack gap="$2">
          <Text fontSize={15} color="$text">
            {t("past_session.name")}
          </Text>
          <Input
            testID="past-session-name"
            minH={44}
            value={label}
            onChangeText={(v) => setLabel(v.slice(0, HAND_LABEL_MAX))}
            placeholder={t("past_session.name_hint")}
            accessibilityLabel={t("past_session.name")}
            maxLength={HAND_LABEL_MAX}
            bg="$background"
            borderColor="$borderStrong"
            color="$text"
          />
        </YStack>
      )}
    </FormSheet>
  );
}

/** The reserved line (the rule link, or the refusal that took its place) and the one button. */
function SheetFooter({
  refusalLine,
  noteLine,
  rule,
  disabled,
  onSave,
}: {
  refusalLine: string | null;
  /** Said before saving, takes nothing away: the entry will be noted but pay no XP. */
  noteLine: string | null;
  rule: string;
  disabled: boolean;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  return (
    <YStack gap="$2">
      <YStack minH={44} justify="center" accessibilityLiveRegion="polite">
        {refusalLine || noteLine ? (
          <XStack gap="$2" items="flex-start">
            <Info size={16} color="$primaryText" />
            <Text
              testID={refusalLine ? "past-session-refusal" : "past-session-note"}
              flex={1}
              fontSize={14}
              color="$text"
            >
              {refusalLine ?? noteLine}
            </Text>
          </XStack>
        ) : (
          <RuleDisclosure testID="past-session-rule" text={rule} />
        )}
      </YStack>
      <AppButton
        testID="past-session-save"
        disabled={disabled}
        aria-disabled={disabled}
        onPress={onSave}
      >
        {t("past_session.save")}
      </AppButton>
    </YStack>
  );
}

/** The distance and, under it, the two ways out of an implausible one (refusal 5). */
function DistanceField({
  value,
  onChange,
  onSettle,
  unitWord,
  a11y,
  fix,
  fixLabel,
  onFix,
}: {
  value: string;
  onChange: (v: string) => void;
  onSettle: () => void;
  unitWord: string;
  a11y: string;
  fix: Extract<HandRefusal, { key: "implausible" }> | null;
  fixLabel: string | null;
  onFix: () => void;
}) {
  const { t } = useTranslation();
  return (
    <YStack gap="$2">
      <Text fontSize={15} color="$text">
        {t("past_session.distance")}
      </Text>
      <XStack gap="$2" items="center">
        <Input
          testID="past-session-distance"
          flex={1}
          minH={44}
          value={value}
          onChangeText={onChange}
          onBlur={onSettle}
          onSubmitEditing={onSettle}
          keyboardType="decimal-pad"
          accessibilityLabel={a11y}
          bg="$background"
          borderColor="$borderStrong"
          color="$text"
        />
        <Text fontWeight="700" fontSize={15} color="$textSecondary">
          {unitWord}
        </Text>
      </XStack>
      {fix ? (
        <XStack gap="$2" flexWrap="wrap">
          {fixLabel === null ? null : (
            <Chip testID="past-session-fix" label={fixLabel} onPress={onFix} />
          )}
          <Chip
            testID="past-session-drop"
            label={t("past_session.drop_distance")}
            onPress={() => {
              onChange("");
              onSettle();
            }}
          />
        </XStack>
      ) : null}
    </YStack>
  );
}

type DayChoice = { key: string; label: string; a11y: string; chosen: boolean; day: Date };

/** The day chips (today, yesterday, another day) and the hour the entry finished. */
function WhenSection({
  choices,
  showOtherDays,
  otherChosen,
  otherLabel,
  onPickDay,
  onOtherDays,
  endText,
  onEndText,
  onEndCommit,
}: {
  choices: DayChoice[];
  showOtherDays: boolean;
  otherChosen: boolean;
  otherLabel: string;
  onPickDay: (day: Date) => void;
  onOtherDays: () => void;
  endText: string;
  onEndText: (v: string) => void;
  onEndCommit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <YStack gap="$2">
      <SectionLabel>{t("past_session.when")}</SectionLabel>
      <XStack gap="$2" flexWrap="wrap">
        {choices.map((c) => (
          <Chip
            key={c.key}
            label={c.label}
            accessibilityLabel={c.a11y}
            selected={c.chosen}
            onPress={() => onPickDay(c.day)}
          />
        ))}
        {showOtherDays ? (
          <Chip
            label={otherChosen ? otherLabel : t("past_session.other_day")}
            selected={otherChosen}
            onPress={onOtherDays}
          />
        ) : null}
      </XStack>
      <XStack gap="$2" items="center">
        <Text fontSize={15} color="$text">
          {t("past_session.ended_at")}
        </Text>
        <Input
          testID="past-session-end"
          width={96}
          minH={44}
          value={endText}
          onChangeText={onEndText}
          onBlur={onEndCommit}
          onSubmitEditing={onEndCommit}
          accessibilityLabel={t("past_session.ended_at")}
          returnKeyType="done"
          bg="$background"
          borderColor="$borderStrong"
          color="$text"
        />
      </XStack>
    </YStack>
  );
}

/** The duration chips and, behind "Autre", a field in minutes. No stepper. */
function DurationSection({
  seconds,
  customOpen,
  customText,
  onChip,
  onCustom,
  onCustomText,
  onCustomCommit,
}: {
  seconds: number;
  customOpen: boolean;
  customText: string;
  onChip: (minutes: number) => void;
  onCustom: () => void;
  onCustomText: (v: string) => void;
  onCustomCommit: () => void;
}) {
  const { t } = useTranslation();
  const reveal = useRevealInSheet();
  return (
    <YStack gap="$2">
      <SectionLabel>{t("past_session.duration")}</SectionLabel>
      <XStack gap="$2" flexWrap="wrap" items="center">
        {DURATION_CHIPS_MIN.map((m) => (
          <Chip
            key={m}
            label={String(m)}
            accessibilityLabel={`${m} ${t("past_session.minutes")}`}
            selected={!customOpen && seconds === m * 60}
            onPress={() => onChip(m)}
          />
        ))}
        <Chip label={t("past_session.duration_custom")} selected={customOpen} onPress={onCustom} />
        <Text fontSize={15} color="$textSecondary">
          {t("past_session.minutes")}
        </Text>
      </XStack>
      {customOpen ? (
        <Input
          testID="past-session-custom"
          ref={reveal}
          minH={44}
          value={customText}
          onChangeText={onCustomText}
          onBlur={onCustomCommit}
          onSubmitEditing={onCustomCommit}
          keyboardType="decimal-pad"
          accessibilityLabel={`${t("past_session.duration")} (${t("past_session.minutes")})`}
          bg="$background"
          borderColor="$borderStrong"
          color="$text"
        />
      ) : null}
    </YStack>
  );
}
