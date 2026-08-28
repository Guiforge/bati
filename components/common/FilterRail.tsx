import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { Chip } from "@/components/common/Chip";
import { X } from "@/components/icons";

export type RailChip = {
  key: string;
  label: string;
  active: boolean;
  onPress: () => void;
  /** Toggles wear one, so a lone chip beside the pills reads as a switch, not a dimension. */
  icon?: ReactNode;
};
export type RailGroup = {
  key: string;
  label: string;
  chips: RailChip[];
  /** One value at a time (duration): picking an option folds the row back, you are done. */
  single?: boolean;
};

// flexGrow 0: don't stretch into the leftover column height. flexShrink 0: RN ScrollViews
// default to flexShrink 1, so the overflowing column squeezed the rail below the chips'
// 44pt height and Android clipped their tops — the "chips cut off by the header" bug.
const RAIL_STYLE = { flexGrow: 0, flexShrink: 0 } as const;

// Fixed height, pills centered: the 44pt pills always sit fully inside the 60pt row.
const PILLS_CONTENT_STYLE = {
  gap: 8,
  paddingHorizontal: 24,
  height: 60,
  alignItems: "center",
} as const;

/**
 * One dimension, closed. Its label never changes — not "Muscles · 2", not the chosen duration —
 * so the row never reflows under the finger: the whole point of moving state off the pills.
 * Colour carries "something is applied", the border carries "this one is open".
 */
function Pill({
  label,
  active,
  open,
  onPress,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <YStack
      minH={44}
      justify="center"
      px="$3"
      rounded="$10"
      bg={active ? "$primary" : "$bgLight"}
      borderWidth={2}
      borderColor={open ? "$primaryText" : "$borderStrong"}
      pressStyle={{ opacity: 0.92, scale: 0.99 }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: open, selected: active }}
    >
      <Text fontWeight="700" fontSize={13} color={active ? "$white" : "$text"}>
        {label}
      </Text>
    </YStack>
  );
}

/**
 * Filters in two lines, never three, and nothing ever shifts sideways.
 *
 * Line one is a pill per dimension with a fixed label. Line two carries all the state and has
 * one job at a time: the open dimension's options (what you are choosing), or — with nothing
 * open — the applied filters as removable chips (what you chose). No filters, no second line.
 *
 * This replaces one horizontal strip of ~22 chips, where the hero saw "DURATION ≤15 ≤30 30+"
 * and had no way to know Type, Muscles and Equipment existed off-screen; and where "Muscles · 2"
 * growing a chip, or "Clear" appearing at the front, moved every other chip under the finger.
 *
 * A one-chip group is not a dimension — it is a toggle, and renders as its own chip in line one.
 */
export function FilterRail({
  groups,
  onClearAll,
}: {
  groups: RailGroup[];
  onClearAll: () => void;
}) {
  const { t } = useTranslation();
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (groups.length === 0) return null;

  // Filtered by availability upstream, so the open group can vanish under us: fall through to
  // the summary rather than render an empty line.
  const openGroup = groups.find((g) => g.key === openKey && g.chips.length > 1) ?? null;

  // Toggles included: line one may scroll, and an applied filter the hero cannot see is a list
  // that filters itself for no visible reason.
  const applied = groups.flatMap((g) => g.chips.filter((c) => c.active));

  const toggleOpen = (key: string) => setOpenKey((k) => (k === key ? null : key));

  return (
    <YStack style={RAIL_STYLE} gap="$2" pb="$2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={PILLS_CONTENT_STYLE}
        style={RAIL_STYLE}
      >
        {groups.map((g) =>
          // A single-chip group renders as a bare chip, not a pill with one option.
          g.chips.length === 1 && g.chips[0] ? (
            <Chip
              key={g.key}
              label={g.chips[0].label}
              icon={g.chips[0].icon}
              tone={g.chips[0].active ? "primary" : "default"}
              onPress={g.chips[0].onPress}
              accessibilityRole="button"
              accessibilityState={{ selected: g.chips[0].active }}
            />
          ) : (
            <Pill
              key={g.key}
              label={g.label}
              active={g.chips.some((c) => c.active)}
              open={openGroup?.key === g.key}
              onPress={() => toggleOpen(g.key)}
            />
          ),
        )}
      </ScrollView>

      {openGroup ? (
        <XStack flexWrap="wrap" gap="$2" px="$5" accessibilityLabel={openGroup.label}>
          {openGroup.chips.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              tone={c.active ? "primary" : "default"}
              onPress={() => {
                c.onPress();
                // Single-select: choosing one is the end of the interaction. Multi stays open —
                // "back AND chest" is two taps, not two openings.
                if (openGroup.single) setOpenKey(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: c.active }}
            />
          ))}
        </XStack>
      ) : applied.length > 0 ? (
        <XStack flexWrap="wrap" gap="$2" px="$5" items="center">
          {applied.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              tone="primary"
              icon={<X size={14} color="$white" strokeWidth={3} />}
              onPress={c.onPress}
              accessibilityRole="button"
              accessibilityLabel={t("quests.filter_remove", {
                label: c.label,
                defaultValue: `Remove ${c.label}`,
              })}
            />
          ))}
          <Chip
            label={t("quests.filter_clear_all", "Clear")}
            icon={<X size={14} color="$text" />}
            onPress={onClearAll}
            accessibilityRole="button"
          />
        </XStack>
      ) : null}
    </YStack>
  );
}
