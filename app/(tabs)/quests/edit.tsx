import { ChevronLeft, Trash2, X } from "@tamagui/lucide-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Input, Separator, Text, XStack, YStack } from "tamagui";

import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { Stepper } from "@/components/common/Stepper";
import {
  clearQuestConfig,
  createQuestTemplate,
  deleteQuest,
  getQuestTemplateById,
  listExercises,
  REST_RANGE,
  ROUNDS_RANGE,
  setQuestExercises,
  TARGET_RANGE,
  USER_QUEST_AUTHOR,
  updateQuestMeta,
} from "@/db";
import type { Exercise } from "@/db/exercises";
import type { QuestTargetType } from "@/db/schema";
import { useSettingsStore } from "@/stores/settings";

/** An exercise as picked in the editor: one target value, not the min/max range seed content uses. */
type PickedExercise = {
  exerciseId: number;
  type: QuestTargetType;
  value: number;
};

const DEFAULT_ROUNDS = 3;
const DEFAULT_REST = 30;
const DEFAULT_REPS = 10;
const DEFAULT_SECONDS = 30;
const REST_STEP = 5;

/** How many candidates the picker shows at once — the search box is how you reach the rest. */
const PICKER_LIMIT = 24;

export default function QuestEditor() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const questId = useMemo(() => {
    const raw = Array.isArray(params.id) ? params.id[0] : params.id;
    const n = Number(raw);
    return raw != null && Number.isFinite(n) ? n : null;
  }, [params.id]);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS);
  const [rest, setRest] = useState(DEFAULT_REST);
  const [picked, setPicked] = useState<PickedExercise[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const exerciseName = useCallback(
    (exercise: Exercise) => (language === "fr" ? exercise.frName : exercise.enName),
    [language],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [all, template] = await Promise.all([
        listExercises(),
        questId == null ? Promise.resolve(null) : getQuestTemplateById(questId),
      ]);
      if (cancelled) return;

      setExercises(all);
      if (!template) return;

      setTitle(language === "fr" ? template.frTitle : template.enTitle);
      setDescription(language === "fr" ? template.frDescription : template.enDescription);
      setRounds(template.rounds);
      setRest(template.restSeconds);
      setPicked(
        template.exercises.map((qex) => ({
          exerciseId: qex.exerciseId,
          type: qex.baseTarget.type,
          value: Math.max(
            TARGET_RANGE.min,
            Math.round((qex.baseTarget.min + qex.baseTarget.max) / 2),
          ),
        })),
      );
    };

    load().catch(() => {
      Alert.alert(t("common.error", "Oops!"), t("quests.load_error", "Failed to load quest"));
    });

    return () => {
      cancelled = true;
    };
  }, [questId, language, t]);

  const exercisesById = useMemo(
    () => Object.fromEntries(exercises.map((e) => [e.id, e] as const)),
    [exercises],
  );

  const candidates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const chosen = new Set(picked.map((p) => p.exerciseId));
    return exercises
      .filter((e) => !chosen.has(e.id) && exerciseName(e).toLowerCase().includes(needle))
      .slice(0, PICKER_LIMIT);
  }, [exercises, exerciseName, picked, search]);

  const addExercise = useCallback((exercise: Exercise) => {
    setPicked((prev) => [...prev, { exerciseId: exercise.id, type: "reps", value: DEFAULT_REPS }]);
    setSearch("");
  }, []);

  const removeExercise = useCallback((exerciseId: number) => {
    setPicked((prev) => prev.filter((p) => p.exerciseId !== exerciseId));
  }, []);

  const patchExercise = useCallback((exerciseId: number, patch: Partial<PickedExercise>) => {
    setPicked((prev) => prev.map((p) => (p.exerciseId === exerciseId ? { ...p, ...patch } : p)));
  }, []);

  const save = async () => {
    const trimmed = title.trim();
    if (trimmed.length === 0 || picked.length === 0) {
      Alert.alert(
        t("quests.editor_incomplete_title", "Almost there"),
        t("quests.editor_incomplete_body", "A quest needs a name and at least one exercise."),
      );
      return;
    }

    // A quest written in the app has one language: the hero's. Both columns get the same text
    // rather than a machine translation nobody asked for.
    const text = description.trim();
    const payload = picked.map((p) => ({
      exerciseId: p.exerciseId,
      images: [],
      baseTarget: { type: p.type, min: p.value, max: p.value },
    }));

    setBusy(true);
    try {
      if (questId == null) {
        const id = await createQuestTemplate({
          enTitle: trimmed,
          frTitle: trimmed,
          enDescription: text,
          frDescription: text,
          author: USER_QUEST_AUTHOR,
          archetype: null,
          rounds,
          restSeconds: rest,
          exercises: payload,
        });
        router.replace(`/quests/${id}` as never);
        return;
      }

      await updateQuestMeta(questId, {
        enTitle: trimmed,
        frTitle: trimmed,
        enDescription: text,
        frDescription: text,
        rounds,
        restSeconds: rest,
      });
      await setQuestExercises(questId, payload);
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      Alert.alert(t("common.error", "Oops!"), message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (questId == null) return;

    Alert.alert(
      t("quests.editor_delete_title", "Delete this quest?"),
      t("quests.editor_delete_body", "This cannot be undone."),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("quests.editor_delete", "Delete"),
          style: "destructive",
          onPress: () => {
            setBusy(true);
            // The per-quest settings outlive the quest row otherwise: same key space, no FK.
            deleteQuest(questId)
              .then(() => clearQuestConfig(questId))
              .then(() => router.replace("/quests" as never))
              .catch((e: unknown) => {
                setBusy(false);
                const message = e instanceof Error ? e.message : "Unknown error";
                Alert.alert(t("common.error", "Oops!"), message);
              });
          },
        },
      ],
    );
  };

  return (
    <YStack flex={1} bg="$background">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <YStack p="$5" pt={insets.top + 12} gap="$4">
          <XStack items="center" justify="space-between">
            <XStack items="center" gap="$3" flex={1}>
              <AppIconButton
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel={t("quests.go_back", "Go back")}
              >
                <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
              </AppIconButton>
              <Text fontWeight="700" fontSize={20} color="$text">
                {questId == null
                  ? t("quests.editor_new_title", "New quest")
                  : t("quests.editor_edit_title", "Edit quest")}
              </Text>
            </XStack>

            {questId != null ? (
              <AppIconButton
                onPress={confirmDelete}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t("quests.editor_delete", "Delete")}
              >
                <Trash2 size={20} color="$danger" strokeWidth={2.5} />
              </AppIconButton>
            ) : null}
          </XStack>

          <Card>
            <YStack gap="$3">
              <YStack gap="$2">
                <Text fontWeight="700" fontSize={14} color="$textSecondary">
                  {t("quests.editor_name", "Name")}
                </Text>
                <Input
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t("quests.editor_name_placeholder", "Morning forge")}
                  bg="$background"
                  borderColor="$borderStrong"
                  color="$text"
                />
              </YStack>

              <YStack gap="$2">
                <Text fontWeight="700" fontSize={14} color="$textSecondary">
                  {t("quests.editor_description", "Description")}
                </Text>
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t("quests.editor_description_placeholder", "What is this for?")}
                  bg="$background"
                  borderColor="$borderStrong"
                  color="$text"
                />
              </YStack>

              <Separator borderColor="$borderStrong" />

              <Stepper
                label={t("quests.config_rounds", "Rounds")}
                value={rounds}
                min={ROUNDS_RANGE.min}
                max={ROUNDS_RANGE.max}
                onChange={setRounds}
              />
              <Stepper
                label={t("quests.config_rest", "Rest")}
                value={rest}
                min={REST_RANGE.min}
                max={REST_RANGE.max}
                step={REST_STEP}
                suffix="s"
                onChange={setRest}
              />
            </YStack>
          </Card>

          <Text fontWeight="700" fontSize={18} color="$text">
            {t("quests.exercises_list", "Exercises")}
          </Text>

          {picked.map((p, i) => {
            const exercise = exercisesById[p.exerciseId];
            if (!exercise) return null;

            return (
              <Card key={p.exerciseId}>
                <YStack gap="$3">
                  <XStack items="center" gap="$2">
                    <Text flex={1} fontWeight="700" fontSize={16} color="$text">
                      {i + 1}. {exerciseName(exercise)}
                    </Text>
                    <Button
                      size="$2"
                      circular
                      icon={<X size={14} />}
                      accessibilityLabel={t("quests.editor_remove", "Remove")}
                      onPress={() => removeExercise(p.exerciseId)}
                    />
                  </XStack>

                  <XStack gap="$2">
                    <Chip
                      label={t("quests.config_reps", "Reps")}
                      tone={p.type === "reps" ? "primary" : "default"}
                      onPress={() =>
                        patchExercise(p.exerciseId, { type: "reps", value: DEFAULT_REPS })
                      }
                    />
                    <Chip
                      label={t("quests.config_seconds", "Seconds")}
                      tone={p.type === "time" ? "primary" : "default"}
                      onPress={() =>
                        patchExercise(p.exerciseId, { type: "time", value: DEFAULT_SECONDS })
                      }
                    />
                  </XStack>

                  <Stepper
                    label={t("quests.editor_target", "Target")}
                    value={p.value}
                    min={TARGET_RANGE.min}
                    max={TARGET_RANGE.max}
                    step={p.type === "time" ? REST_STEP : 1}
                    suffix={p.type === "time" ? "s" : ""}
                    onChange={(value) => patchExercise(p.exerciseId, { value })}
                  />
                </YStack>
              </Card>
            );
          })}

          <Card bg="$surface">
            <YStack gap="$3">
              <Text fontWeight="700" fontSize={14} color="$textSecondary">
                {t("quests.editor_add_exercise", "Add an exercise")}
              </Text>
              <Input
                value={search}
                onChangeText={setSearch}
                placeholder={t("quests.editor_search", "Search")}
                bg="$background"
                borderColor="$borderStrong"
                color="$text"
              />
              <XStack gap="$2" flexWrap="wrap">
                {candidates.map((exercise) => (
                  <Chip
                    key={exercise.id}
                    label={exerciseName(exercise)}
                    onPress={() => addExercise(exercise)}
                  />
                ))}
              </XStack>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>

      <YStack
        p="$4"
        pb={insets.bottom + 16}
        bg="$background"
        borderTopWidth={1}
        borderColor="$borderStrong"
        style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
      >
        <AppButton testID="quest-save" height={56} disabled={busy} onPress={save} rounded="$6">
          <Text color="$text" fontSize={20} fontWeight="700">
            {t("quests.editor_save", "Save quest")}
          </Text>
        </AppButton>
      </YStack>
    </YStack>
  );
}
