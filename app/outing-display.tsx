import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { Chip } from "@/components/common/Chip";
import { FormSheet } from "@/components/common/FormSheet";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { SectionLabel } from "@/components/common/SectionLabel";
import { Check } from "@/components/icons";
import { SettingRow } from "@/components/settings/SettingRow";
import {
  OUTING_ACTIVITIES,
  OUTING_METRICS,
  type OutingLayout,
  type Place,
  type SmallPlaces,
  viewOf,
  withActivity,
} from "@/constants/outingDisplay";
import type { Locomotion } from "@/db/schema";
import { useHaptics } from "@/hooks/useHaptics";
import { metricLabelKey } from "@/src/gps/liveFigures";
import { useSettingsStore } from "@/stores/settings";

/** The places a choice can fill, in the order of the list: the big one, then the three small. */
type PlaceId = "big" | 0 | 1 | 2;

const RATES: readonly Place[] = ["rate", "rateAvg"];

const asActivity = (value: string | undefined): Locomotion =>
  OUTING_ACTIVITIES.find((a) => a === value) ?? "walk";

/**
 * "Affichage des sorties": what the outing panel shows, per activity (walk, run, ride).
 *
 * A list and no preview, and every choice writes on tap: there is no Save button. The blob is the
 * hero's and travels with them (`outingDisplay`); whether the screen stays on is this phone's and
 * lives in SecureStore (`src/outingKeepAwake.ts`). The handlebar preset has no state of its own:
 * it writes the three values it names, and reads as checked while they hold.
 */
export default function OutingDisplayScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Locomotion>(asActivity(params.tab));
  const [editing, setEditing] = useState<PlaceId | null>(null);

  const display = useSettingsStore((s) => s.outingDisplay);
  const keepAwakeSet = useSettingsStore((s) => s.outingKeepAwake);
  const setDisplay = useSettingsStore((s) => s.setOutingDisplay);
  const setKeepAwake = useSettingsStore((s) => s.setOutingKeepAwake);

  const view = viewOf(display, tab);
  const keepAwake = keepAwakeSet.includes(tab);
  const ride = tab === "ride";
  const customised = display[tab] !== undefined || keepAwake;

  const change = (patch: Parameters<typeof withActivity>[2]) => {
    haptics.selection();
    setDisplay(withActivity(display, tab, patch)).catch(() => undefined);
  };

  const placeValue = (place: Place | null) =>
    place === null
      ? t("outing_display.none")
      : place === "auto"
        ? t("outing_display.auto")
        : t(metricLabelKey(place, tab));

  const pick = (id: PlaceId, value: Place | null) => {
    if (id === "big") {
      if (value !== null) change({ big: value });
    } else {
      const small: SmallPlaces = [...view.small];
      small[id] = value;
      change({ small });
    }
    setEditing(null);
  };

  const handlebar = view.big === "rate" && view.layout === "bigFigures" && keepAwake;
  const applyHandlebar = () => {
    if (handlebar) return;
    change({ big: "rate", layout: "bigFigures" });
    setKeepAwake("ride", true).catch(() => undefined);
  };

  const reset = () => {
    haptics.selection();
    setDisplay(withActivity(display, tab, null)).catch(() => undefined);
    setKeepAwake(tab, false).catch(() => undefined);
  };

  const rows: { id: PlaceId; label: string; value: Place | null }[] = [
    { id: "big", label: t("outing_display.big"), value: view.big },
    ...([0, 1, 2] as const).map((i) => ({
      id: i,
      label: t("outing_display.small", { n: i + 1 }),
      value: view.small[i] ?? null,
    })),
  ];
  const options: (Place | null)[] = [
    "auto",
    ...OUTING_METRICS,
    ...(editing !== null && editing !== "big" ? [null] : []),
  ];
  const current = editing === null ? undefined : rows.find((r) => r.id === editing);

  return (
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <ScreenBackButton />
        <Text flex={1} fontFamily="$heading" fontSize={22} fontWeight="700" color="$text">
          {t("outing_display.title")}
        </Text>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <XStack gap="$2" flexWrap="wrap">
          {OUTING_ACTIVITIES.map((activity) => (
            <Chip
              key={activity}
              testID={`outing-display-tab-${activity}`}
              label={t(`outing_display.tab_${activity}`)}
              tone={tab === activity ? "primary" : "default"}
              accessibilityState={{ selected: tab === activity }}
              onPress={() => setTab(activity)}
            />
          ))}
        </XStack>
        {tab === "walk" ? (
          <Paragraph fontSize={13} color="$textSecondary">
            {t("outing_display.walk_note")}
          </Paragraph>
        ) : null}

        {ride ? (
          <YStack gap="$1">
            <SettingRow
              testID="outing-display-handlebar"
              icon={handlebar ? <Check size={22} color="$success" /> : null}
              label={t("outing_display.handlebar")}
              onPress={applyHandlebar}
            />
            <Paragraph fontSize={13} color="$textSecondary" px="$3">
              {t("outing_display.handlebar_note")}
            </Paragraph>
          </YStack>
        ) : null}

        <YStack gap="$2">
          {rows.map((row) => (
            <SettingRow
              key={String(row.id)}
              testID={`outing-display-place-${row.id}`}
              icon={null}
              label={row.label}
              value={placeValue(row.value)}
              onPress={() => setEditing(row.id)}
            />
          ))}
        </YStack>

        <SectionLabel px="$1" mt="$2">
          {t("outing_display.layout")}
        </SectionLabel>
        <XStack gap="$2" flexWrap="wrap">
          {(["map", "bigFigures"] as const satisfies readonly OutingLayout[]).map((layout) => (
            <Chip
              key={layout}
              testID={`outing-display-layout-${layout}`}
              label={t(
                layout === "map" ? "outing_display.layout_map" : "outing_display.layout_big",
              )}
              tone={view.layout === layout ? "primary" : "default"}
              accessibilityState={{ selected: view.layout === layout }}
              onPress={() => change({ layout })}
            />
          ))}
        </XStack>

        <SectionLabel px="$1" mt="$2">
          {t("outing_display.screen")}
        </SectionLabel>
        <XStack gap="$2" flexWrap="wrap">
          {([false, true] as const).map((on) => (
            <Chip
              key={String(on)}
              testID={`outing-display-screen-${on ? "on" : "off"}`}
              label={t(on ? "outing_display.screen_on" : "outing_display.screen_off")}
              tone={keepAwake === on ? "primary" : "default"}
              accessibilityState={{ selected: keepAwake === on }}
              onPress={() => {
                haptics.selection();
                setKeepAwake(tab, on).catch(() => undefined);
              }}
            />
          ))}
        </XStack>
        <Paragraph fontSize={13} color="$textSecondary">
          {t(ride ? "outing_display.screen_note_ride" : "outing_display.screen_note_foot")}
        </Paragraph>

        {customised ? (
          <Pressable
            testID="outing-display-reset"
            accessibilityRole="button"
            onPress={reset}
            hitSlop={8}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text color="$primaryText" fontSize={15} fontWeight="700">
              {t("outing_display.reset")}
            </Text>
          </Pressable>
        ) : null}
      </RNScrollView>

      <FormSheet
        open={editing !== null}
        title={current?.label ?? ""}
        onClose={() => setEditing(null)}
      >
        {options.map((option) => {
          const selected = current !== undefined && current.value === option;
          const note = tab !== "ride" && option !== null && RATES.includes(option);
          return (
            <Pressable
              key={String(option)}
              testID={`outing-place-option-${option ?? "none"}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => editing !== null && pick(editing, option)}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <XStack items="center" gap="$2">
                <YStack flex={1}>
                  <Text fontSize={16} fontWeight={selected ? "700" : "400"} color="$text">
                    {placeValue(option)}
                  </Text>
                  {note ? (
                    <Text fontSize={13} color="$textSecondary">
                      {t("outing_display.walk_run_note")}
                    </Text>
                  ) : null}
                </YStack>
                {selected ? <Check size={20} color="$success" /> : null}
              </XStack>
            </Pressable>
          );
        })}
        <Paragraph fontSize={13} color="$textSecondary">
          {t("outing_display.auto_note")}
        </Paragraph>
      </FormSheet>
    </YStack>
  );
}
