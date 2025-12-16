import { ChevronLeft, Map as MapIcon } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { listExercises, listQuestTemplates } from "@/db";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import type { Exercise } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import type { QuestTemplate } from "@/db/quests";
import type { EquipmentCode, MuscleCode } from "@/db/schema";
import { useSettingsStore } from "@/stores/settings";

type LoadState =
  | { status: "loading"; quests: QuestTemplate[]; exercisesById: Record<number, Exercise> }
  | { status: "ready"; quests: QuestTemplate[]; exercisesById: Record<number, Exercise> }
  | {
      status: "error";
      quests: QuestTemplate[];
      exercisesById: Record<number, Exercise>;
      message: string;
    };

function questEmoji(rounds: number, exerciseCount: number) {
  if (rounds >= 4) return "🧨";
  if (exerciseCount >= 4) return "⚔️";
  return "🪓";
}

export default function QuestsGallery() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  const [state, setState] = useState<LoadState>({
    status: "loading",
    quests: [],
    exercisesById: {},
  });

  const [selectedMuscle, setSelectedMuscle] = useState<MuscleCode | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentCode | null>(null);

  const load = useCallback(async () => {
    setState((s) => ({ status: "loading", quests: s.quests, exercisesById: s.exercisesById }));
    try {
      const [quests, exercises] = await Promise.all([listQuestTemplates(), listExercises()]);
      const exercisesById = Object.fromEntries(exercises.map((e) => [e.id, e] as const));
      setState({ status: "ready", quests, exercisesById });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setState((s) => ({
        status: "error",
        quests: s.quests,
        exercisesById: s.exercisesById,
        message,
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const quests = state.quests;
  const exercisesById = state.exercisesById;

  const questMeta = useMemo(() => {
    return quests.map((q) => {
      const muscles = new Set<MuscleCode>();
      const equipment = new Set<EquipmentCode>();

      for (const qex of q.exercises) {
        const ex = exercisesById[qex.exerciseId];
        if (!ex) continue;
        equipment.add(ex.equipment);
        for (const m of ex.muscles) muscles.add(m);
      }

      return { quest: q, muscles: [...muscles], equipment: [...equipment] };
    });
  }, [exercisesById, quests]);

  const availableMuscles = useMemo(() => {
    const s = new Set<MuscleCode>();
    for (const m of questMeta) for (const code of m.muscles) s.add(code);
    return [...s];
  }, [questMeta]);

  const availableEquipment = useMemo(() => {
    const s = new Set<EquipmentCode>();
    for (const m of questMeta) for (const code of m.equipment) s.add(code);
    return [...s];
  }, [questMeta]);

  const filtered = useMemo(() => {
    return questMeta.filter((m) => {
      const okMuscle = selectedMuscle ? m.muscles.includes(selectedMuscle) : true;
      const okEquip = selectedEquipment ? m.equipment.includes(selectedEquipment) : true;
      return okMuscle && okEquip;
    });
  }, [questMeta, selectedEquipment, selectedMuscle]);

  const title = useMemo(() => t("quests.gallery_title", "Quest gallery"), [t]);
  const subtitle = useMemo(
    () => t("quests.gallery_subtitle", "Pick a quest and see the full details."),
    [t],
  );

  return (
    <YStack flex={1} bg="$background">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        <YStack p="$5" pt={insets.top + 12} gap="$4">
          <XStack items="center" justify="space-between">
            <XStack items="center" gap="$3">
              <AppIconButton onPress={() => router.back()}>
                <ChevronLeft size={22} color="#1A1A2E" strokeWidth={2.5} />
              </AppIconButton>

              <YStack>
                <XStack items="center" gap="$2">
                  <MapIcon size={18} color="#1A1A2E" />
                  <Text fontWeight="900" fontSize={20} color="$color">
                    {title}
                  </Text>
                </XStack>
                <Paragraph color="$color" opacity={0.65} mt="$1" size="$3">
                  {subtitle}
                </Paragraph>
              </YStack>
            </XStack>

            <Chip
              label={t("quests.count", {
                count: filtered.length,
                defaultValue: "{{count}}",
              })}
              tone="secondary"
            />
          </XStack>

          <Card bg="$bgLight">
            <YStack gap="$3">
              <Text fontWeight="900" fontSize={16} color="$color">
                {t("quests.filters_title", "Filters")}
              </Text>

              <YStack gap="$2">
                <Text fontWeight="900" color="$color" opacity={0.7}>
                  {t("quests.filter_muscles", "Muscles")}
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  <Chip
                    label={t("quests.all", "All")}
                    tone={!selectedMuscle ? "primary" : "default"}
                    onPress={() => setSelectedMuscle(null)}
                  />
                  {availableMuscles.map((m) => (
                    <Chip
                      key={m}
                      label={MUSCLE_LABELS[m]?.[language] ?? m}
                      tone={selectedMuscle === m ? "primary" : "default"}
                      onPress={() => setSelectedMuscle(m)}
                    />
                  ))}
                </XStack>
              </YStack>

              <YStack gap="$2">
                <Text fontWeight="900" color="$color" opacity={0.7}>
                  {t("quests.filter_equipment", "Equipment")}
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  <Chip
                    label={t("quests.all", "All")}
                    tone={!selectedEquipment ? "secondary" : "default"}
                    onPress={() => setSelectedEquipment(null)}
                  />
                  {availableEquipment.map((e) => (
                    <Chip
                      key={e}
                      label={EQUIPMENT_LABELS[e]?.[language] ?? e}
                      tone={selectedEquipment === e ? "secondary" : "default"}
                      onPress={() => setSelectedEquipment(e)}
                    />
                  ))}
                </XStack>
              </YStack>
            </YStack>
          </Card>

          {state.status === "error" ? (
            <Card bg="$bgLight">
              <YStack gap="$3">
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("quests.load_error", "Failed to load quests")}
                </Text>
                <Paragraph color="$color" opacity={0.7} size="$3">
                  {state.message}
                </Paragraph>

                <AppButton fullWidth={false} variant="secondary" onPress={() => void load()}>
                  {t("quests.retry", "Retry")} ↻
                </AppButton>
              </YStack>
            </Card>
          ) : null}

          {state.status === "loading" && quests.length === 0 ? (
            <Card bg="$bgLight">
              <XStack items="center" justify="space-between">
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("quests.loading", "Loading quests...")}
                </Text>
                <Text fontSize={24}>🏗️</Text>
              </XStack>
            </Card>
          ) : null}

          {state.status !== "loading" && quests.length === 0 ? (
            <Card bg="$bgLight">
              <YStack gap="$2">
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("quests.empty_title", "No quests yet")}
                </Text>
                <Paragraph color="$color" opacity={0.7} size="$3">
                  {t(
                    "quests.empty_subtitle",
                    "Come back soon — the village is preparing adventures.",
                  )}
                </Paragraph>
              </YStack>
            </Card>
          ) : null}

          <YStack gap="$3">
            {filtered.map(({ quest: q, muscles, equipment }) => {
              const qTitle = language === "fr" ? q.frTitle : q.enTitle;
              const qDesc = language === "fr" ? q.frDescription : q.enDescription;

              return (
                <Card key={q.id} onPress={() => router.push(`/quests/${q.id}` as never)}>
                  <XStack gap="$3" items="flex-start">
                    <YStack
                      width={54}
                      height={54}
                      rounded={27}
                      bg="$bgLight"
                      borderWidth={3}
                      borderColor="$color"
                      justify="center"
                      items="center"
                    >
                      <Text fontSize={26}>{questEmoji(q.rounds, q.exercises.length)}</Text>
                    </YStack>

                    <YStack flex={1} gap="$2">
                      <Text fontWeight="900" fontSize={18} color="$color">
                        {qTitle}
                      </Text>

                      <Paragraph color="$color" opacity={0.7} size="$3" numberOfLines={3}>
                        {qDesc}
                      </Paragraph>

                      <XStack gap="$2" flexWrap="wrap" pt="$1">
                        <Chip
                          label={t("quests.rounds", {
                            count: q.rounds,
                            defaultValue: `${q.rounds} rounds`,
                          })}
                        />
                        <Chip
                          label={t("quests.exercises", {
                            count: q.exercises.length,
                            defaultValue: `${q.exercises.length} exercises`,
                          })}
                          tone="primary"
                        />
                        <Chip
                          label={t("quests.rest", {
                            count: q.restSeconds,
                            defaultValue: `Rest ${q.restSeconds}s`,
                          })}
                          tone="warning"
                        />
                      </XStack>

                      <XStack gap="$2" flexWrap="wrap">
                        {equipment.slice(0, 2).map((e) => (
                          <Chip key={e} label={EQUIPMENT_LABELS[e]?.[language] ?? e} />
                        ))}
                        {muscles.slice(0, 3).map((m) => (
                          <Chip key={m} label={MUSCLE_LABELS[m]?.[language] ?? m} />
                        ))}
                      </XStack>
                    </YStack>
                  </XStack>
                </Card>
              );
            })}
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
