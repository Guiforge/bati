import { Image } from "expo-image";
import type { i18n as I18n, TFunction } from "i18next";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { AchievementIcon } from "@/components/common/AchievementIcon";
import { Card } from "@/components/common/Card";
import { GameIcon } from "@/components/common/GameIcon";
import { SectionLabel } from "@/components/common/SectionLabel";
import { oathText } from "@/components/oath/useOathText";
import { Crest } from "@/components/village/Crest";
import { PRACTICE_KEY, sentence } from "@/components/village/crestText";
import { getExerciseThumb, getVillageTierAsset } from "@/constants/assetMap";
import { TRIUMPH_XP_BONUS } from "@/db/bossFights";
import type { Animal } from "@/db/crestRules";
import type { DistanceUnit } from "@/db/preferences";
import { formatCount, formatTarget, perSideLabel } from "@/db/targets";
import { getLevelTitle } from "@/db/userLevel";
import { TIER_NAMES } from "@/db/village";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedName, localizedText, localizedTitle } from "@/src/i18n/localized";
import { useSettingsStore } from "@/stores/settings";
import type { Feast } from "./feasts";
import { formatRecordValue, recordTitle } from "./recordText";

type Badge = "after" | "record";
/** `text` may hold `<b>…</b>` runs: the figure the line is about, set in bold. */
type Line = { id: string; text: string; badge?: Badge; art?: ReactNode };
type CardData = { id: string; title: string; body?: string[]; art: ReactNode };

const shield = (animal: Animal, size: 24 | 48 = 48) => (
  <Crest
    size={size}
    crest={{ animal, manual: false, second: null, quarters: null, longestFlame: 0, rings: 0 }}
  />
);

/** "Brumeval becomes a Village.", or "Your village becomes a Village." before it has a name. */
const tierSentence = (
  t: TFunction,
  tier: Extract<Feast, { kind: "tier" }>["tier"],
  villageName: string,
  language: AppLanguage,
) =>
  t(`session.tonight_tier_${tier}`, {
    subject: villageName || t("session.tonight_tier_subject_unnamed"),
    tier: TIER_NAMES[tier][language],
  });

function placeOf(t: TFunction, villageName: string) {
  return villageName
    ? t("session.tonight_place_named", { name: villageName })
    : t("session.tonight_place_unnamed", { place: t("village.crest_place") });
}

const the = (t: TFunction, a: Animal) => sentence(t(`village.crest_the_${a}`));

/** The text of the feast that is shown full screen later: one line, with the "after" badge. */
function largeLine(t: TFunction, f: Feast, villageName: string, language: AppLanguage): string {
  switch (f.kind) {
    case "epilogue":
      return t("session.tonight_epilogue");
    case "reveal":
      return t(`session.tonight_reveal_${f.animal}`, { place: placeOf(t, villageName) });
    case "age":
      return f.name;
    case "anniversary":
      return t("session.tonight_anniversary", { count: f.years });
    case "tier":
      return tierSentence(t, f.tier, villageName, language);
    default:
      return "";
  }
}

function recordLine(
  t: TFunction,
  f: Extract<Feast, { kind: "record" }>,
  language: AppLanguage,
  unit: DistanceUnit,
): string {
  const { record } = f;
  const value = formatRecordValue(record, unit, language);
  const isExercise =
    record.recordType === "exercise_max_reps" || record.recordType === "exercise_max_time";
  if (!isExercise)
    return t("session.tonight_pair", { what: recordTitle(t, record, language), detail: value });
  const name = record.exerciseName?.[language] ?? recordTitle(t, record, language);
  if (record.previousValue === null) {
    // No "was" to read the unit off, so the figure carries it, as it does everywhere else.
    const unitValue =
      record.recordType === "exercise_max_reps"
        ? perSideLabel(
            formatTarget({ type: "reps", value: record.newValue }, language),
            record.perSide,
            language,
          )
        : value;
    return `<b>${name} ${unitValue}</b>`;
  }
  const was = formatRecordValue({ ...record, newValue: record.previousValue }, unit, language);
  return t("session.tonight_record_was", { name, value, was });
}

function lineOf(
  t: TFunction,
  f: Feast,
  villageName: string,
  language: AppLanguage,
  unit: DistanceUnit,
): Line | null {
  if (f.size === "large")
    return {
      id: f.id,
      text: largeLine(t, f, villageName, language),
      badge: "after",
      // The reveal wears the animal it names, where the other lines wear the gold bead.
      ...(f.kind === "reveal" ? { art: shield(f.animal, 24) } : {}),
    };
  switch (f.kind) {
    case "level":
      return {
        id: f.id,
        text: `${t("session.level_label")} ${f.level} · ${getLevelTitle(f.level)[language]}`,
      };
    case "growth":
      return {
        id: f.id,
        text: t("session.tonight_growth", {
          name: localizedName(f.building, language),
          level: f.building.newLevel,
        }),
      };
    case "record":
      return { id: f.id, text: recordLine(t, f, language, unit), badge: "record" };
    case "standing": {
      const s = f.standing;
      const value = perSideLabel(
        formatTarget({ type: s.type, value: s.value }, language),
        s.perSide,
        language,
      );
      return {
        id: f.id,
        text: t("session.tonight_pair", {
          what: `${s.exerciseName[language]} ${value}`,
          detail: t(`session.standing_${s.scope}_${s.rank}`, { count: s.outOf }),
        }),
      };
    }
    default:
      return null;
  }
}

/** A stage rises exactly at its threshold, so the body is that many sessions of its own practice. */
function stageBody(t: TFunction, f: Extract<Feast, { kind: "stageUp" }>) {
  return t(f.own ? `session.tonight_stage_body_${f.animal}` : "session.tonight_stage_body_any", {
    n: f.n,
  });
}

function cardOf(
  t: TFunction,
  i18n: I18n,
  f: Feast,
  villageName: string,
  language: AppLanguage,
): CardData | null {
  switch (f.kind) {
    case "reveal": {
      const [a, b] = f.quarters ?? [];
      return {
        id: f.id,
        title: t(`session.tonight_reveal_${f.animal}`, { place: placeOf(t, villageName) }),
        body:
          a && b && a !== b
            ? [
                t("session.tonight_boar_body", {
                  first: t(PRACTICE_KEY[a]),
                  second: t(PRACTICE_KEY[b]),
                }),
              ]
            : undefined,
        art: shield(f.animal),
      };
    }
    case "secondJoins":
      return {
        id: f.id,
        title: t("session.tonight_join", {
          second: sentence(t(`village.crest_${f.animal}`)),
          first: t(`village.crest_to_${f.first}`),
        }),
        body: [t(`session.tonight_join_body_${f.animal}`, { n: f.n, total: f.total })],
        art: shield(f.animal),
      };
    case "stageUp":
      return {
        id: f.id,
        title: t(`session.tonight_stage_${f.stage}`, { animal: the(t, f.animal) }),
        body: [stageBody(t, f)],
        art: shield(f.animal),
      };
    case "tier":
      return {
        id: f.id,
        title: tierSentence(t, f.tier, villageName, language),
        body: [
          f.level === null
            ? t("session.tonight_tier_plain")
            : t("session.tonight_tier_body", { level: f.level }),
        ],
        art: (
          <Image
            source={getVillageTierAsset(f.tier)}
            style={{ width: 48, height: 48, borderRadius: 8 }}
            contentFit="cover"
          />
        ),
      };
    case "age":
      return {
        id: f.id,
        title: f.name,
        art: <GameIcon name="crown" size={32} color="$resourceGold" />,
      };
    case "anniversary":
      return {
        id: f.id,
        title: t("session.tonight_anniversary", { count: f.years }),
        art: <GameIcon name="crown" size={32} color="$resourceGold" />,
      };
    case "boss":
      return {
        id: f.id,
        title: t("boss.victory_title"),
        body: [
          f.name,
          f.finalBlow
            ? t("boss.final_blow")
            : t("boss.triumph_subtitle", { xp: formatCount(language, TRIUMPH_XP_BONUS) }),
        ],
        art: <GameIcon name="sword" size={32} color="$resourceGold" />,
      };
    case "oath":
      return {
        id: f.id,
        title: t("oath.fulfilled_title"),
        body: [
          oathText(f.progress, i18n),
          t("oath.fulfilled_subtitle"),
          ...(f.bonusXp > 0
            ? [t("oath.fulfilled_xp_bonus", { count: formatCount(language, f.bonusXp) })]
            : []),
        ],
        art: <GameIcon name="scroll" size={32} color="$resourceGold" />,
      };
    case "rung":
      return {
        id: f.id,
        title: localizedName(f.step.next, language),
        body: [
          t("progression.new_rung_from", { name: localizedName(f.step.from, language) }),
          ...(f.step.alsoNext.length > 0
            ? [
                t("progression.rung_also_leads_to", {
                  names: f.step.alsoNext.map((m) => localizedName(m, language)).join(", "),
                }),
              ]
            : []),
        ],
        art: (
          <Image
            source={getExerciseThumb(f.step.next.imagePath)}
            style={{ width: 48, height: 48, borderRadius: 8 }}
            contentFit="cover"
          />
        ),
      };
    case "achievement":
      return {
        id: f.id,
        title: localizedTitle(f.achievement.definition, language),
        body: [localizedText(f.achievement.definition, "description", language)],
        art: <AchievementIcon icon={f.achievement.definition.icon} size={32} color="$text" />,
      };
    default:
      return null;
  }
}

const TAGS = /<\/?b>/g;

function LineRow({ line }: { line: Line }) {
  const { t } = useTranslation();
  const badge = line.badge ? t(`session.tonight_badge_${line.badge}`) : null;
  const plain = line.text.replace(TAGS, "");
  return (
    <XStack
      items="center"
      gap="$3"
      accessible
      accessibilityLabel={badge ? `${plain}, ${badge}` : plain}
    >
      {line.art ?? <YStack width={8} height={8} rounded={4} bg="$resourceGold" />}
      <Text flex={1} fontSize={15} color="$text">
        {line.text.split(/<b>|<\/b>/).map((part, i) =>
          i % 2 ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: a static split, never reordered
            <Text key={i} fontWeight="700">
              {part}
            </Text>
          ) : (
            part
          ),
        )}
      </Text>
      {badge ? (
        <YStack borderWidth={1} borderColor="$glassBorder" rounded="$2" px="$2" py="$1">
          <Text fontSize={12} color="$textSecondary">
            {badge}
          </Text>
        </YStack>
      ) : null}
    </XStack>
  );
}

function CardRow({ card }: { card: CardData }) {
  return (
    <Card
      bg="$background"
      p="$3"
      accessible
      accessibilityLabel={card.body ? [card.title, ...card.body].join(". ") : card.title}
    >
      <XStack items="center" gap="$3">
        <YStack width={48} items="center" importantForAccessibility="no-hide-descendants">
          {card.art}
        </YStack>
        <YStack flex={1} gap="$1">
          {/* Alegreya for a name, Noto for a title carrying a digit ("Level 5", "3 years"). */}
          <Text
            fontFamily={/\d/.test(card.title) ? "$body" : "$heading"}
            fontWeight="700"
            fontSize={17}
            color="$text"
          >
            {card.title}
          </Text>
          {card.body?.map((line) => (
            <Text key={line} fontSize={13} color="$textSecondary">
              {line}
            </Text>
          ))}
        </YStack>
      </XStack>
    </Card>
  );
}

/**
 * "Tonight": what this session changed, as lines and cards. The large feast is only named here,
 * with an "after" badge: it opens full screen once the hero presses Continue. Nothing to say
 * renders nothing, not even the title. No animation.
 */
export function TonightList({
  feasts,
  villageName,
  onViewVillage,
}: {
  feasts: Feast[];
  villageName: string;
  /** Given only on a night the village grew: the way into it, same road as the Village tab. */
  onViewVillage?: (() => void) | undefined;
}) {
  const { t, i18n } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const unit = useSettingsStore((s) => s.distanceUnit);
  if (feasts.length === 0) return null;

  const lines = feasts.flatMap((f) => lineOf(t, f, villageName, language, unit) ?? []);
  const cards = feasts.flatMap((f) =>
    f.size === "medium" ? (cardOf(t, i18n, f, villageName, language) ?? []) : [],
  );

  return (
    <YStack width="100%" maxW={520} gap="$3" testID="tonight-list">
      <SectionLabel>{t("session.tonight_title")}</SectionLabel>
      {lines.length > 0 ? (
        <YStack gap="$3">
          {lines.map((line) => (
            <LineRow key={line.id} line={line} />
          ))}
        </YStack>
      ) : null}
      {cards.map((card) => (
        <CardRow key={card.id} card={card} />
      ))}
      {onViewVillage ? (
        <Pressable
          testID="tonight-view-village"
          accessibilityRole="link"
          onPress={onViewVillage}
          style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}
        >
          <Text fontSize={15} color="$primaryText" textDecorationLine="underline">
            {t("session.village_growth_cta")}
          </Text>
        </Pressable>
      ) : null}
    </YStack>
  );
}
