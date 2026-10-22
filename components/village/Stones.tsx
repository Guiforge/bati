import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { LayoutChangeEvent } from "react-native";
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
/** Beyond this many stones the wall is cut by decade. The text always is: it is what a screen reader hears. */
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
  available,
}: {
  row: readonly Stone[];
  shifted: boolean;
  marks: ReadonlyMap<number, Mark>;
  /** The room the screen gives the wall, 0 until measured: a row wider than it scales down. */
  available: number;
}) {
  const width = row.length * SIZE + (row.length - 1) * GAP + (shifted ? HALF : 0);
  const shown = available > 0 ? Math.min(width, available) : width;
  return (
    <Svg
      testID="village-stone-row"
      width={shown}
      height={(HEIGHT * shown) / width}
      viewBox={`0 0 ${width} ${HEIGHT}`}
    >
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
  const [available, setAvailable] = useState(0);
  if (stones.length === 0) return null;
  const ageAt = new Map(ages.map((a) => [a.level, a]));
  // Not `Map.groupBy`: Hermes does not ship it. The stones come in level order, so a decade is a run.
  const decades: Stone[][] = [];
  for (const s of stones) {
    const open = decades[decades.length - 1];
    if (open && open[0]?.decade === s.decade) open.push(s);
    else decades.push([s]);
  }
  // The wall is cut by decade only when it is long; the words below are always by decade.
  const blocks = stones.length > GROUP_FROM ? decades.map((d) => [d]) : [decades];
  return (
    <YStack
      testID="village-stones"
      gap="3"
      onLayout={(e: LayoutChangeEvent) => setAvailable(Math.floor(e.nativeEvent.layout.width))}
    >
      <SectionLabel>{t("village.stones_title")}</SectionLabel>
      {blocks.map((block) => {
        const first = block[0]?.[0];
        if (first === undefined) return null;
        const written = block.map((group) => {
          const from = group[0]?.level ?? 0;
          const to = group[group.length - 1]?.level ?? 0;
          const { marks, lines } = decade(group, ageAt, names, t, language);
          const count = group.reduce((n, s) => n + s.sessions, 0);
          const summary = t(
            from === to ? "village.stones_summary_single" : "village.stones_summary",
            { from, to, level: from, count },
          );
          return { marks, lines, summary };
        });
        const marks = new Map(written.flatMap((w) => [...w.marks]));
        return (
          <YStack
            key={first.decade}
            testID={`village-stones-${first.decade}`}
            accessible
            accessibilityLabel={written.flatMap((w) => [w.summary, ...w.lines]).join(". ")}
            gap="2"
          >
            {/* Rows of six, cut here: a wrapping row would fit five on a narrow phone. */}
            <YStack gap={ROW_GAP}>
              {rowsOf(block.flat()).map((row, i) => (
                <StoneRow
                  key={row[0]?.level}
                  row={row}
                  shifted={i % 2 === 1}
                  marks={marks}
                  available={available}
                />
              ))}
            </YStack>
            <YStack gap={2}>
              {written.flatMap((w) => [
                ...w.lines.map((line) => (
                  <Text key={line} fontSize={12} lineHeight="17px" color="textSecondary">
                    {line}
                  </Text>
                )),
                <Text key={w.summary} fontSize={12} lineHeight="17px" color="textSecondary">
                  {w.summary}
                </Text>,
              ])}
            </YStack>
          </YStack>
        );
      })}
    </YStack>
  );
}
