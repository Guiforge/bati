import { ChevronLeft, Trash2, X } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Input, Separator, Text, XStack, YStack } from "tamagui";

import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { Stepper } from "@/components/common/Stepper";
import { useToast } from "@/components/common/Toast";
import { ExercisePickerSheet } from "@/components/quests/ExercisePickerSheet";
import { getExerciseThumb } from "@/constants/assetMap";
import {
  clearQuestConfig,
  createQuestTemplate,
  deleteQuest,
  getQuestConfig,
  getQuestTemplateById,
  listExercises,
  REST_RANGE,
  ROUNDS_RANGE,
  saveQuestConfig,
  setQuestExercises,
  TARGET_RANGE,
  USER_QUEST_AUTHOR,
  updateQuestMeta,
} from "@/db";
import type { Exercise } from "@/db/exercises";
import type { QuestTargetType } from "@/db/schema";
import { useHaptics } from "@/hooks/useHaptics";
import { localizedName, localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/** An exercise as picked in the editor: one target value, not the min/max range seed content uses. */
type PickedExercise = {
  /**
   * Identifies the row, not the exercise. A circuit may hold the same movement twice, and
   * keying on `exerciseId` made those two rows one: React saw duplicate keys, and removing or
   * retargeting either hit both. Editor-only — the row id is never persisted.
   */
  uid: number;
  exerciseId: number;
  type: QuestTargetType;
  value: number;
};

/**
 * What still stands between this form and a saved quest, or null when nothing does. Names the one
 * thing that is missing: the old copy listed both, so it read as wrong whenever only one was.
 */
function missingPiece(
  trimmedTitle: string,
  exerciseCount: number,
  t: (key: string, fallback: string) => string,
): string | null {
  if (trimmedTitle.length === 0) {
    return t("quests.editor_incomplete_name", "Your quest needs a name.");
  }
  if (exerciseCount === 0) {
    return t("quests.editor_incomplete_exercises", "Add at least one exercise.");
  }
  return null;
}

const DEFAULT_ROUNDS = 3;
const DEFAULT_REST = 30;
const DEFAULT_REPS = 10;
const DEFAULT_SECONDS = 30;
const REST_STEP = 5;

export default function QuestEditor() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);

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
  const [roundRest, setRoundRest] = useState(DEFAULT_REST);
  const [picked, setPicked] = useState<PickedExercise[]>([]);
  const [busy, setBusy] = useState(false);
  const nextUid = useRef(0);
  // The absolute save bar overlapped the "add an exercise" button by ~75px, so taps meant for
  // it fired the save instead. Measured, not guessed: the bar's height moves with the inset.
  const [saveBarHeight, setSaveBarHeight] = useState(0);
  const { showSuccess } = useToast();
  const { success } = useHaptics();

  // Dirty-form guard: the delete path had a confirmation, the accidental back had none —
  // a name and five picked exercises vanished on one tap. `baseline` is what the form looked
  // like when it was last clean; `skipGuardRef` lets a successful save leave without asking.
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify({
      title: "",
      description: "",
      rounds: DEFAULT_ROUNDS,
      rest: DEFAULT_REST,
      roundRest: DEFAULT_REST,
      picked: [] as PickedExercise[],
    }),
  );
  const skipGuardRef = useRef(false);
  const isDirty =
    !skipGuardRef.current &&
    JSON.stringify({ title, description, rounds, rest, roundRest, picked }) !== baseline;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const navigation = useNavigation();
  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      Alert.alert(
        t("quests.editor_discard_title", "Discard changes?"),
        t("quests.editor_discard_body", "Your edits will be lost."),
        [
          { text: t("common.cancel", "Cancel"), style: "cancel" },
          {
            text: t("quests.editor_discard", "Discard"),
            style: "destructive",
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });
  }, [navigation, t]);

  const exerciseName = useCallback(
    (exercise: Exercise) => localizedName(exercise, language),
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

      const nextTitle = localizedTitle(template, language);
      const nextDescription = language === "fr" ? template.frDescription : template.enDescription;
      const nextPicked = template.exercises.map((qex, index) => ({
        uid: index,
        exerciseId: qex.exerciseId,
        type: qex.baseTarget.type,
        value: Math.max(
          TARGET_RANGE.min,
          Math.round((qex.baseTarget.min + qex.baseTarget.max) / 2),
        ),
      }));
      nextUid.current = nextPicked.length;

      setTitle(nextTitle);
      setDescription(nextDescription);
      setRounds(template.rounds);
      setRest(template.restSeconds);
      setRoundRest(template.roundRestSeconds ?? template.restSeconds);
      setPicked(nextPicked);
      setBaseline(
        JSON.stringify({
          title: nextTitle,
          description: nextDescription,
          rounds: template.rounds,
          rest: template.restSeconds,
          roundRest: template.roundRestSeconds ?? template.restSeconds,
          picked: nextPicked,
        }),
      );
    };

    load().catch((error) => {
      reportError("quest.editorLoad", error);
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
  const assetByExerciseId = useMemo(
    () => new Map(exercises.map((e) => [e.id, getExerciseThumb(e.imagePath)] as const)),
    [exercises],
  );

  const pickedIds = useMemo(() => picked.map((p) => p.exerciseId), [picked]);

  const addExercise = useCallback((exercise: Exercise) => {
    nextUid.current += 1;
    const uid = nextUid.current;
    setPicked((prev) => [
      ...prev,
      { uid, exerciseId: exercise.id, type: "reps", value: DEFAULT_REPS },
    ]);
  }, []);

  const removeExercise = useCallback((uid: number) => {
    setPicked((prev) => prev.filter((p) => p.uid !== uid));
  }, []);

  const patchExercise = useCallback((uid: number, patch: Partial<PickedExercise>) => {
    setPicked((prev) => prev.map((p) => (p.uid === uid ? { ...p, ...patch } : p)));
  }, []);

  const save = async () => {
    const trimmed = title.trim();
    const missing = missingPiece(trimmed, picked.length, t);
    if (missing) {
      Alert.alert(t("quests.editor_incomplete_title", "Almost there"), missing);
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
      skipGuardRef.current = true;
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
          roundRestSeconds: roundRest,
          exercises: payload,
        });
        // The edit used to vanish with no confirmation it persisted.
        success();
        showSuccess(t("quests.editor_saved", "Quest saved"));
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
        roundRestSeconds: roundRest,
      });
      await setQuestExercises(questId, payload);

      // The editor is the source of truth for a quest you own, so what was just typed replaces
      // the per-quest overrides. Target overrides could not survive anyway: they are keyed by
      // quest_exercises row id and this write rebuilds those rows. The remembered level stays —
      // that is a personal setting, not a property of the template.
      const saved = await getQuestConfig(questId);
      if (saved) await saveQuestConfig(questId, { level: saved.level });

      success();
      showSuccess(t("quests.editor_saved", "Quest saved"));
      router.back();
    } catch (e) {
      skipGuardRef.current = false;
      reportError("quest.editorSave", e);
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
            skipGuardRef.current = true;
            // The per-quest settings outlive the quest row otherwise: same key space, no FK.
            deleteQuest(questId)
              .then(() => clearQuestConfig(questId))
              .then(() => router.replace("/quests" as never))
              .catch((e: unknown) => {
                setBusy(false);
                skipGuardRef.current = false;
                reportError("quest.editorDelete", e);
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
      <ScrollView contentContainerStyle={{ paddingBottom: saveBarHeight + 24 }}>
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
              {/* The label renders on one line, so which rest is which goes in the hint. */}
              <Stepper
                label={t("quests.config_rest", "Rest")}
                hint={t("quests.config_rest_hint", "Between exercises")}
                value={rest}
                min={REST_RANGE.min}
                max={REST_RANGE.max}
                step={REST_STEP}
                suffix="s"
                onChange={setRest}
              />
              <Stepper
                label={t("quests.config_round_rest", "Round rest")}
                hint={t("quests.config_round_rest_hint", "Between rounds")}
                value={roundRest}
                min={REST_RANGE.min}
                max={REST_RANGE.max}
                step={REST_STEP}
                suffix="s"
                onChange={setRoundRest}
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
              <Card key={p.uid}>
                <YStack gap="$3">
                  <XStack items="center" gap="$3">
                    <YStack width={48} height={48} rounded="$4" overflow="hidden" bg="$background">
                      <Image
                        source={assetByExerciseId.get(exercise.id)}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                        transition={0}
                      />
                    </YStack>
                    <Text flex={1} fontWeight="700" fontSize={16} color="$text">
                      {i + 1}. {exerciseName(exercise)}
                    </Text>
                    <Button
                      size="$2"
                      circular
                      hitSlop={12}
                      icon={<X size={14} />}
                      accessibilityRole="button"
                      accessibilityLabel={t("quests.editor_remove", "Remove")}
                      onPress={() => removeExercise(p.uid)}
                    />
                  </XStack>

                  <XStack gap="$2">
                    <Chip
                      label={t("quests.config_reps", "Reps")}
                      tone={p.type === "reps" ? "primary" : "default"}
                      onPress={() => patchExercise(p.uid, { type: "reps", value: DEFAULT_REPS })}
                    />
                    <Chip
                      label={t("quests.config_seconds", "Seconds")}
                      tone={p.type === "time" ? "primary" : "default"}
                      onPress={() => patchExercise(p.uid, { type: "time", value: DEFAULT_SECONDS })}
                    />
                  </XStack>

                  <Stepper
                    label={t("quests.editor_target", "Target")}
                    value={p.value}
                    min={TARGET_RANGE.min}
                    max={TARGET_RANGE.max}
                    step={p.type === "time" ? REST_STEP : 1}
                    suffix={p.type === "time" ? "s" : ""}
                    onChange={(value) => patchExercise(p.uid, { value })}
                  />
                </YStack>
              </Card>
            );
          })}

          <ExercisePickerSheet
            exercises={exercises}
            pickedIds={pickedIds}
            language={language}
            onAdd={addExercise}
            bottomInset={insets.bottom}
          />
        </YStack>
      </ScrollView>

      <YStack
        p="$4"
        pb={insets.bottom + 16}
        bg="$background"
        borderTopWidth={1}
        borderColor="$borderStrong"
        style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
        onLayout={(e) => setSaveBarHeight(e.nativeEvent.layout.height)}
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
