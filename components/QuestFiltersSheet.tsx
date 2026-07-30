import { SlidersHorizontal, X } from "@tamagui/lucide-icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable } from "react-native";
import { Sheet, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Chip } from "@/components/common/Chip";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { MUSCLE_LABELS } from "@/db/muscles";
import type { EquipmentCode, MuscleCode } from "@/db/schema";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { AppLanguage } from "@/stores/settings";

type Props = {
  language: AppLanguage;

  availableMuscles: MuscleCode[];
  selectedMuscle: MuscleCode | null;
  onSelectMuscle: (m: MuscleCode | null) => void;

  availableEquipment: EquipmentCode[];
  selectedEquipment: EquipmentCode | null;
  onSelectEquipment: (e: EquipmentCode | null) => void;

  bottomInset: number;
  resultCount: number;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: several independent JSX ternaries (chips, groups, sheet sections), not deeply nested branching
export function QuestFiltersSheet({
  language,
  availableMuscles,
  selectedMuscle,
  onSelectMuscle,
  availableEquipment,
  selectedEquipment,
  onSelectEquipment,
  bottomInset,
  resultCount,
}: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  // The Sheet (portal + overlay + frame) is expensive to keep mounted behind the quest list.
  // Mount it on first open only; afterwards it stays mounted so the close animation works.
  const [sheetMounted, setSheetMounted] = useState(false);
  const [activeGroup, setActiveGroup] = useState<"muscles" | "equipment">("muscles");

  const openSheet = () => {
    setSheetMounted(true);
    setOpen(true);
  };

  // On Android, safe-area bottom inset is often reported as 0 even though the system gesture area
  // can make the very bottom edge hard/impossible to tap. Keep a minimum gutter.
  const minBottomInset = Platform.OS === "android" ? 24 : 0;
  const bottomPad = Math.max(bottomInset, minBottomInset) + 10;

  const activeCount = (selectedMuscle ? 1 : 0) + (selectedEquipment ? 1 : 0);
  const hasActiveFilters = activeCount > 0;

  const selectedFilters = useMemo(
    () =>
      [
        selectedMuscle
          ? {
              key: `muscle-${selectedMuscle}`,
              label: MUSCLE_LABELS[selectedMuscle]?.[language] ?? selectedMuscle,
              clear: () => onSelectMuscle(null),
            }
          : null,
        selectedEquipment
          ? {
              key: `equipment-${selectedEquipment}`,
              label: EQUIPMENT_LABELS[selectedEquipment]?.[language] ?? selectedEquipment,
              clear: () => onSelectEquipment(null),
            }
          : null,
      ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>,
    [language, onSelectEquipment, onSelectMuscle, selectedEquipment, selectedMuscle],
  );

  return (
    <>
      <XStack
        position="absolute"
        b={bottomPad}
        l={0}
        r={0}
        justify="center"
        pointerEvents="box-none"
      >
        <Chip
          label={
            hasActiveFilters
              ? `${activeCount} ${t("quests.filters_active", "Active")}`
              : t("quests.filters_title", "Filters")
          }
          icon={<SlidersHorizontal size={14} color={hasActiveFilters ? "$bgDark" : "$text"} />}
          tone={hasActiveFilters ? "primary" : "default"}
          onPress={openSheet}
          accessibilityRole="button"
          accessibilityLabel={t("quests.filters_title", "Filters")}
        />
      </XStack>

      {sheetMounted ? (
        <Sheet
          modal
          open={open}
          onOpenChange={setOpen}
          snapPoints={[85]}
          dismissOnSnapToBottom
          transition={reducedMotion ? undefined : "quick"}
          zIndex={100_000}
        >
          <Sheet.Overlay
            bg="rgba(0,0,0,0.5)"
            transition={reducedMotion ? undefined : "quick"}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <Sheet.Handle bg="$borderStrong" />
          <Sheet.Frame bg="$surface" flex={1}>
            <YStack px="$4" pt="$4" pb="$3" gap="$3">
              <XStack items="center" justify="space-between">
                <Text fontWeight="700" fontSize={18} color="$text">
                  {t("quests.filters_title", "Filters")}
                </Text>
                <Pressable
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t("quests.filters_close", "Close filters")}
                  onPress={() => setOpen(false)}
                >
                  <X size={20} color="$textSecondary" />
                </Pressable>
              </XStack>

              <XStack gap="$2" flexWrap="wrap">
                <Chip
                  label={t("quests.filter_muscles", "Muscles")}
                  tone={activeGroup === "muscles" ? "primary" : "default"}
                  onPress={() => setActiveGroup("muscles")}
                />
                <Chip
                  label={t("quests.filter_equipment", "Equipment")}
                  tone={activeGroup === "equipment" ? "secondary" : "default"}
                  onPress={() => setActiveGroup("equipment")}
                />
              </XStack>

              {selectedFilters.length > 0 ? (
                <XStack gap="$2" flexWrap="wrap">
                  {selectedFilters.map((filter) => (
                    <Chip
                      key={filter.key}
                      label={`${filter.label} ✕`}
                      tone="primary"
                      onPress={filter.clear}
                    />
                  ))}
                </XStack>
              ) : null}
            </YStack>

            <Sheet.ScrollView flex={1} px="$4" pb="$3">
              <XStack gap="$2" flexWrap="wrap">
                {activeGroup === "muscles"
                  ? availableMuscles.map((value) => (
                      <Chip
                        key={value}
                        label={MUSCLE_LABELS[value]?.[language] ?? value}
                        tone={selectedMuscle === value ? "primary" : "default"}
                        onPress={() => onSelectMuscle(selectedMuscle === value ? null : value)}
                      />
                    ))
                  : availableEquipment.map((value) => (
                      <Chip
                        key={value}
                        label={EQUIPMENT_LABELS[value]?.[language] ?? value}
                        tone={selectedEquipment === value ? "secondary" : "default"}
                        onPress={() =>
                          onSelectEquipment(selectedEquipment === value ? null : value)
                        }
                      />
                    ))}
              </XStack>
            </Sheet.ScrollView>

            <XStack gap="$3" p="$4" pb={bottomPad} borderTopWidth={1} borderColor="$borderStrong">
              {hasActiveFilters ? (
                <AppButton
                  fullWidth={false}
                  variant="outline"
                  onPress={() => {
                    onSelectMuscle(null);
                    onSelectEquipment(null);
                  }}
                >
                  {t("quests.filters_clear", "Clear filters")}
                </AppButton>
              ) : null}
              <AppButton fullWidth={false} flex={1} onPress={() => setOpen(false)}>
                {t("quests.filters_show_results", {
                  count: resultCount,
                  defaultValue: `Show ${resultCount} quests`,
                })}
              </AppButton>
            </XStack>
          </Sheet.Frame>
        </Sheet>
      ) : null}
    </>
  );
}
