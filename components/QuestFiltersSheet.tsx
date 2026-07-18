import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, PanResponder, Platform, Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { MUSCLE_LABELS } from "@/db/muscles";
import type { EquipmentCode, MuscleCode } from "@/db/schema";
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
  handleHeight?: number;
  sheetHeight?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Bottom sheet gesture and filter UI state are tightly coupled.
export function QuestFiltersSheet({
  language,
  availableMuscles,
  selectedMuscle,
  onSelectMuscle,
  availableEquipment,
  selectedEquipment,
  onSelectEquipment,
  bottomInset,
  handleHeight = 64,
  sheetHeight = 340,
}: Props) {
  const { t } = useTranslation();

  // On Android, safe-area bottom inset is often reported as 0 even though the system gesture area
  // can make the very bottom edge hard/impossible to tap. Keep a minimum gutter.
  const minBottomInset = Platform.OS === "android" ? 24 : 0;
  const bottomPad = useMemo(
    () => Math.max(bottomInset, minBottomInset) + 10,
    [bottomInset, minBottomInset],
  );
  const containerHeight = useMemo(() => sheetHeight + bottomPad, [sheetHeight, bottomPad]);
  // Important: when closed, we want the handle to sit ABOVE the bottom safe area.
  // If we used (containerHeight - handleHeight), the handle would be flush with the screen bottom.
  const closedOffset = useMemo(
    () => Math.max(0, sheetHeight - handleHeight),
    [sheetHeight, handleHeight],
  );

  const translateY = useRef(new Animated.Value(closedOffset)).current;
  const lastY = useRef(closedOffset);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Keep the handle visible if safe area / sizing changes while closed.
    if (isOpen) return;
    translateY.setValue(closedOffset);
    lastY.current = closedOffset;
  }, [closedOffset, isOpen, translateY]);

  const [activeGroup, setActiveGroup] = useState<"muscles" | "equipment">("muscles");

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
      ].filter(Boolean) as Array<{
        key: string;
        label: string;
        clear: () => void;
      }>,
    [language, onSelectEquipment, onSelectMuscle, selectedEquipment, selectedMuscle],
  );

  const animateTo = useCallback(
    (toValue: number) => {
      // Snap instantly (no animation).
      translateY.setValue(toValue);
      lastY.current = toValue;
      setIsOpen(toValue <= 1);
    },
    [translateY],
  );

  const toggle = useCallback(
    () => animateTo(isOpen ? closedOffset : 0),
    [animateTo, closedOffset, isOpen],
  );

  const panResponder = useMemo(() => {
    const onGestureStart = () => {
      translateY.stopAnimation((v) => {
        lastY.current = typeof v === "number" ? v : closedOffset;
      });
    };

    const onGestureMove = (_evt: unknown, g: { dy: number }) => {
      const next = clamp(lastY.current + g.dy, 0, closedOffset);
      translateY.setValue(next);
    };

    const onGestureEnd = (_evt: unknown, g: { dy: number; vy: number }) => {
      const projected = clamp(lastY.current + g.dy, 0, closedOffset);
      const shouldOpen = g.vy < -0.35 || projected < closedOffset / 2;
      animateTo(shouldOpen ? 0 : closedOffset);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dy) > 3,
      onPanResponderGrant: onGestureStart,
      onPanResponderMove: onGestureMove,
      onPanResponderRelease: onGestureEnd,
      onPanResponderTerminate: onGestureEnd,
    });
  }, [animateTo, closedOffset, translateY]);

  const hasActiveFilters = Boolean(selectedMuscle || selectedEquipment);
  const activeCount = selectedFilters.length;

  return (
    <>
      {isOpen ? (
        <Pressable
          onPress={() => animateTo(closedOffset)}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.25)",
          }}
        />
      ) : null}

      <Animated.View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: containerHeight,
          zIndex: 50,
          elevation: 20,
          transform: [{ translateY }],
        }}
      >
        <YStack px="$5" pb={bottomPad} pointerEvents="box-none">
          <Card>
            <YStack gap="$3">
              <Pressable onPress={toggle} {...panResponder.panHandlers}>
                <YStack>
                  <XStack items="center" justify="space-between">
                    <XStack items="center" gap="$2">
                      <Text fontSize={18}>{isOpen ? "🔽" : "🔼"}</Text>
                      <Text fontWeight="900" fontSize={16} color="$color">
                        {t("quests.filters_title", "Filters")}
                      </Text>
                    </XStack>

                    <Text fontWeight="900" fontSize={14} color="$primary">
                      {isOpen ? t("quests.filters_hide", "Hide") : t("quests.filters_show", "Show")}
                    </Text>
                  </XStack>

                  <XStack mt="$2" items="center" justify="space-between" gap="$2">
                    <Text fontSize={13} color="$color" opacity={0.7}>
                      {activeCount
                        ? t("quests.filters_active_summary", {
                            count: activeCount,
                            defaultValue: `${activeCount} active filters`,
                          })
                        : t("quests.filters_browse_all", "Browse all quests")}
                    </Text>

                    {hasActiveFilters ? (
                      <Pressable
                        onPress={() => {
                          onSelectMuscle(null);
                          onSelectEquipment(null);
                        }}
                      >
                        <Text fontWeight="900" fontSize={13} color="$primary">
                          {t("quests.filters_clear", "Clear all")}
                        </Text>
                      </Pressable>
                    ) : null}
                  </XStack>

                  <YStack mt="$2" items="center">
                    <YStack
                      width={44}
                      height={6}
                      rounded={999}
                      bg="$bgLight"
                      borderWidth={2}
                      borderColor="$color"
                      opacity={0.7}
                    />
                  </YStack>
                </YStack>
              </Pressable>

              {isOpen ? (
                <YStack gap="$3">
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
                    <YStack gap="$2">
                      <Text fontWeight="900" fontSize={13} color="$color" opacity={0.55}>
                        {t("quests.filters_selected", "Selected")}
                      </Text>
                      <XStack gap="$2" flexWrap="wrap">
                        {selectedFilters.map((filter) => (
                          <Chip
                            key={filter.key}
                            label={filter.label}
                            tone="primary"
                            onPress={filter.clear}
                          />
                        ))}
                      </XStack>
                    </YStack>
                  ) : null}

                  <YStack gap="$2">
                    <Text fontWeight="900" fontSize={13} color="$color" opacity={0.55}>
                      {activeGroup === "muscles"
                        ? t("quests.filter_muscles", "Muscles")
                        : t("quests.filter_equipment", "Equipment")}
                    </Text>
                    <XStack gap="$2" flexWrap="wrap">
                      {activeGroup === "muscles"
                        ? availableMuscles.map((value) => (
                            <Chip
                              key={value}
                              label={MUSCLE_LABELS[value]?.[language] ?? value}
                              tone={selectedMuscle === value ? "primary" : "default"}
                              onPress={() => onSelectMuscle(value)}
                            />
                          ))
                        : availableEquipment.map((value) => (
                            <Chip
                              key={value}
                              label={EQUIPMENT_LABELS[value]?.[language] ?? value}
                              tone={selectedEquipment === value ? "secondary" : "default"}
                              onPress={() => onSelectEquipment(value)}
                            />
                          ))}
                    </XStack>
                  </YStack>
                </YStack>
              ) : null}
            </YStack>
          </Card>
        </YStack>
      </Animated.View>
    </>
  );
}
