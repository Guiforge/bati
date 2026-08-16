import { X } from "@tamagui/lucide-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { Chip } from "@/components/common/Chip";
import { rawColors } from "@/constants/rawColors";

export type RailChip = { key: string; label: string; active: boolean; onPress: () => void };
export type RailGroup = { key: string; label: string; chips: RailChip[] };

/**
 * Active chips to the front of their own group — never across dimensions, so a chip never
 * jumps out of the group whose label explains it. On a copy: `Array.sort` mutates, and the
 * caller's array is derived state. Stable, so ties keep the caller's order.
 */
const hoistActive = (chips: RailChip[]): RailChip[] =>
  [...chips].sort((a, b) => Number(b.active) - Number(a.active));

// flexGrow 0: don't stretch into the leftover column height. flexShrink 0: RN ScrollViews
// default to flexShrink 1, so the overflowing column squeezed the rail below the chips'
// 44pt height and Android clipped their tops — the "chips cut off by the header" bug.
const RAIL_STYLE = { flexGrow: 0, flexShrink: 0 } as const;

// Fixed height, chips centered: the 44pt chips always sit fully inside the 60pt rail.
const RAIL_CONTENT_STYLE = {
  gap: 8,
  paddingHorizontal: 24,
  height: 60,
  alignItems: "center",
} as const;

/**
 * Filters live in the page, not behind a modal: the sheet showed one dimension at a time,
 * cost three taps to apply what already updated live behind it, and reserved 94px of list
 * padding for its floating trigger. The rail is grouped by dimension with a muted label per
 * group — twenty undifferentiated chips gave no way to tell that "Chest" and "Barbell" answer
 * different questions, or that duration is single-select while the rest are not. Active chips
 * hoist to the front of their own group, so what's applied stays visible without shuffling
 * chips across dimensions.
 */
export function FilterRail({
  groups,
  onClearAll,
}: {
  groups: RailGroup[];
  onClearAll: () => void;
}) {
  const { t } = useTranslation();

  if (groups.length === 0) return null;
  const anyActive = groups.some((g) => g.chips.some((c) => c.active));

  return (
    <YStack position="relative" style={RAIL_STYLE}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={RAIL_CONTENT_STYLE}
        style={RAIL_STYLE}
      >
        {anyActive ? (
          <Chip
            label={t("quests.filter_clear_all", "Clear")}
            icon={<X size={14} color="$text" />}
            onPress={onClearAll}
            accessibilityRole="button"
          />
        ) : null}
        {groups.map((g) => (
          <XStack key={g.key} items="center" gap="$2">
            <Text fontSize={10} fontWeight="700" color="$textSecondary" opacity={0.7}>
              {g.label.toUpperCase()}
            </Text>
            {hoistActive(g.chips).map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                tone={c.active ? "primary" : "default"}
                onPress={c.onPress}
                accessibilityRole="button"
                accessibilityState={{ selected: c.active }}
              />
            ))}
          </XStack>
        ))}
      </ScrollView>
      {/* Right-edge fade: whatever the width, a chip or group label lands on the cut and looks
          amputated rather than scrollable. The fade turns the cut into an affordance. */}
      <LinearGradient
        colors={["transparent", rawColors.bgDark]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 36 }}
        pointerEvents="none"
      />
    </YStack>
  );
}
