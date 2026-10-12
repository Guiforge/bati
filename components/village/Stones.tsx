import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { Text, YStack } from "tamagui";
import { SectionLabel } from "@/components/common/SectionLabel";
import { ageTitle } from "@/components/session/bigFeastText";
import { factText } from "@/components/village/yearsText";
import { rawColors } from "@/constants/rawColors";
import type { MovementNamesById } from "@/db/villageYears";
import type { Age, Stone } from "@/db/villageYearsRules";
import type { AppLanguage } from "@/stores/settings";

const SIZE = 44;
const HEIGHT = 32;
/** Beyond this many stones the wall is grouped by decade. */
const GROUP_FROM = 60;
const PER_ROW = 6;
const GAP = 4;
const ROW_GAP = 3;
/** Alternate rows slide by half a stone, the way a wall is laid. */
const HALF = (SIZE + GAP) / 2;
/** A squared rubble stone, one path, its corners chipped unevenly: eighty of them stay cheap. */
const STONE = "M4 1H38L43 5V26L39 31H5L1 27V6Z";

const rowsOf = (group: readonly Stone[]): Stone[][] =>
  Array.from({ length: Math.ceil(group.length / PER_ROW) }, (_, i) =>
    group.slice(i * PER_ROW, (i + 1) * PER_ROW),
  );

/** A whole row of stones in one `<Svg>`: eighty stones were eighty native views. */
function StoneRow({
  row,
  shifted,
  marks,
}: {
  row: readonly Stone[];
  shifted: boolean;
  marks: ReadonlyMap<number, Mark>;
}) {
  const width = row.length * SIZE + (row.length - 1) * GAP + (shifted ? HALF : 0);
  return (
    <Svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`}>
      {row.map((s, i) => {
        const mark = marks.get(s.level);
        return (
          <G key={s.level} x={i * (SIZE + GAP) + (shifted ? HALF : 0)}>
            <Path
              testID={mark ? `village-stone-${mark}-${s.level}` : `village-stone-${s.level}`}
              d={STONE}
              fill={rawColors.surface2}
              stroke={mark ? rawColors.resourceGold : rawColors.borderStrong}
              strokeWidth={2}
            />
            {/* An Age is a second, inner border: told from a record by its shape, not its colour. */}
            {mark === "age" ? (
              <Path
                d={STONE}
                transform="translate(3.5 3.5) scale(0.84 0.78)"
                fill="none"
                stroke={rawColors.resourceGold}
                strokeWidth={1.5}
              />
            ) : null}
            <SvgText
              x={22}
              y={21}
              fontSize={s.level > 99 ? 12 : 14}
              fontWeight="700"
              fill={rawColors.resourceGold}
              textAnchor="middle"
            >
              {String(s.level)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

type Mark = "record" | "age";

/** What a decade writes out: a mark per record or Age stone, and a line for each. */
function decade(
  group: readonly Stone[],
  ageAt: ReadonlyMap<number, Age>,
  names: MovementNamesById,
  t: TFunction,
  language: AppLanguage,
) {
  const marks = new Map<number, Mark>();
  const lines: string[] = [];
  for (const s of group) {
    const age = ageAt.get(s.level);
    if (age) {
      marks.set(s.level, "age");
      const title = ageTitle(
        t,
        {
          level: age.level,
          practice: age.practice,
          movement: (age.exerciseId !== null && names.get(age.exerciseId)) || null,
        },
        language,
      );
      lines.push(t("village.stone_age_line", { level: s.level, title }));
    }
    // A record whose movement is gone says only a session count: nothing to mark.
    if (s.fact.kind === "record" && names.has(s.fact.exerciseId)) {
      if (!age) marks.set(s.level, "record");
      lines.push(
        t("village.stone_record_line", {
          level: s.level,
          fact: factText(s.fact, s.sessions, names, t, language),
        }),
      );
    }
  }
  return { marks, lines };
}

/**
 * The stones of the ramparts: one per level from 21, the level engraved. Only the records and the
 * Ages are written out, each under its decade, the rest summed ("Levels 70 to 79: 94 sessions").
 * The gold is never alone: the lines say "record" and "New era", and a decade is one labelled
 * element for a screen reader, not one per stone.
 */
export function Stones({
  stones,
  ages,
  names,
  language,
}: {
  stones: readonly Stone[];
  ages: readonly Age[];
  names: MovementNamesById;
  language: AppLanguage;
}) {
  const { t } = useTranslation();
  if (stones.length === 0) return null;
  const ageAt = new Map(ages.map((a) => [a.level, a]));
  const grouped = stones.length > GROUP_FROM;
  // Not `Map.groupBy`: Hermes does not ship it. The stones come in level order, so a decade is a run.
  const groups: Stone[][] = [];
  for (const s of stones) {
    const open = groups[groups.length - 1];
    if (open && (!grouped || open[0]?.decade === s.decade)) open.push(s);
    else groups.push([s]);
  }
  return (
    <YStack testID="village-stones" gap="$3">
      <SectionLabel>{t("village.stones_title")}</SectionLabel>
      {groups.map((group) => {
        const first = group[0];
        const last = group[group.length - 1];
        if (first === undefined || last === undefined) return null;
        const { marks, lines } = decade(group, ageAt, names, t, language);
        const count = group.reduce((n, s) => n + s.sessions, 0);
        const summary = t(
          first.level === last.level ? "village.stones_summary_single" : "village.stones_summary",
          { from: first.level, to: last.level, level: first.level, count },
        );
        return (
          <YStack
            key={first.decade}
            testID={`village-stones-${first.decade}`}
            accessible
            accessibilityLabel={[summary, ...lines].join(". ")}
            gap="$2"
          >
            {/* Rows of six, cut here: a wrapping row would fit five on a narrow phone. */}
            <YStack gap={ROW_GAP}>
              {rowsOf(group).map((row, i) => (
                <StoneRow key={row[0]?.level} row={row} shifted={i % 2 === 1} marks={marks} />
              ))}
            </YStack>
            <YStack gap={2}>
              {lines.map((line) => (
                <Text key={line} fontSize={12} lineHeight={17} color="$textSecondary">
                  {line}
                </Text>
              ))}
              <Text fontSize={12} lineHeight={17} color="$textSecondary">
                {summary}
              </Text>
            </YStack>
          </YStack>
        );
      })}
    </YStack>
  );
}
