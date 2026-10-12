import { useTranslation } from "react-i18next";
import Svg, { Path, Text as SvgText } from "react-native-svg";
import { Text, XStack, YStack } from "tamagui";
import { SectionLabel } from "@/components/common/SectionLabel";
import { factText } from "@/components/village/yearsText";
import { rawColors } from "@/constants/rawColors";
import type { RecordNames } from "@/db/villageYears";
import type { Stone } from "@/db/villageYearsRules";
import type { AppLanguage } from "@/stores/settings";

const SIZE = 44;
/** Beyond this many stones the wall is grouped by decade, each group under its own heading. */
const GROUP_FROM = 60;
const PER_ROW = 6;
const GAP = 4;
/** A rounded arch, the whole stone in one path: eighty of them stay cheap. */
const ARCH = "M4 40V18C4 9 12 4 22 4S40 9 40 18V40Z";

const rowsOf = (group: readonly Stone[]): Stone[][] =>
  Array.from({ length: Math.ceil(group.length / PER_ROW) }, (_, i) =>
    group.slice(i * PER_ROW, (i + 1) * PER_ROW),
  );

function StoneArt({ level }: { level: number }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 44 44">
      <Path d={ARCH} fill={rawColors.surface2} stroke={rawColors.borderStrong} strokeWidth={2} />
      <SvgText
        x={22}
        y={29}
        fontSize={level > 99 ? 12 : 15}
        fontWeight="700"
        fill={rawColors.resourceGold}
        textAnchor="middle"
      >
        {String(level)}
      </SvgText>
    </Svg>
  );
}

/**
 * The stones of the ramparts: one per level from 21, the level engraved, the fact (the level's
 * record, else its sessions) as text under the group. Nothing says it by colour alone, and
 * every stone is one labelled element.
 */
export function Stones({
  stones,
  names,
  language,
}: {
  stones: readonly Stone[];
  names: RecordNames;
  language: AppLanguage;
}) {
  const { t } = useTranslation();
  if (stones.length === 0) return null;
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
        const line = (s: Stone) =>
          t("village.stone_line", {
            level: s.level,
            fact: factText(s.fact, s.sessions, names, t, language),
          });
        return (
          <YStack key={first.decade} testID={`village-stones-${first.decade}`} gap="$2">
            {grouped ? (
              <Text fontSize={13} fontWeight="600" color="$textSecondary">
                {t("village.stones_decade", { from: first.level, to: last.level })}
              </Text>
            ) : null}
            {/* Rows of six, cut here: a wrapping row would fit five on a narrow phone. */}
            {rowsOf(group).map((row) => (
              <XStack key={row[0]?.level} gap={GAP}>
                {row.map((s) => (
                  <YStack
                    key={s.level}
                    testID={`village-stone-${s.level}`}
                    accessible
                    accessibilityLabel={line(s)}
                  >
                    <StoneArt level={s.level} />
                  </YStack>
                ))}
              </XStack>
            ))}
            {/* Read once, on the stones: the text is for the eye. */}
            <YStack gap={2} importantForAccessibility="no-hide-descendants">
              {group.map((s) => (
                <Text key={s.level} fontSize={12} lineHeight={17} color="$textSecondary">
                  {line(s)}
                </Text>
              ))}
            </YStack>
          </YStack>
        );
      })}
    </YStack>
  );
}
