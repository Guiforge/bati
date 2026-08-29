import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { ImageChoiceField } from "@/components/common/ImageChoiceField";
import { Stepper } from "@/components/common/Stepper";
import { useToast } from "@/components/common/Toast";
import { ChevronDown, ChevronLeft, ChevronUp } from "@/components/icons";
import { EXERCISE_THUMB_ASSETS, getExerciseAsset, getExerciseThumb } from "@/constants/assetMap";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import {
  createUserExercise,
  DEFAULT_USER_EXERCISE_DRAFT,
  getExerciseById,
  isUserExercise,
  SECONDS_PER_REP_RANGE,
  type UserExerciseDraft,
  updateUserExercise,
} from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import {
  difficultyCodes,
  equipmentCodes,
  exerciseStyles,
  type MuscleCode,
  movementPatterns,
  muscleCodes,
} from "@/db/schema";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/** Everything under the fold. Split from the two required fields so the draft assembles in one. */
type Details = Omit<UserExerciseDraft, "name" | "description">;

/** The movement art already in the APK. */
const EXERCISE_CHOICES = Object.keys(EXERCISE_THUMB_ASSETS);

/**
 * Where a hero writes a movement of their own.
 *
 * Two fields, and a fold. A name and how to do it is all a movement needs to exist; the rest has
 * a schema default that is honest on its own. The fold says out loud what leaving it closed
 * costs — an exercise with no muscles is counted in no bar and no village building — because
 * `getMuscleBalance` reports the same fact from the other side, and a hero should hear it before
 * the journal tells them.
 *
 * Target type (reps vs time) is deliberately absent: it lives on `quest_exercises`, and the quest
 * editor already asks for it once per slot.
 *
 * Seed content is never editable here. `updateUserExercise` refuses it at the writer, and this
 * screen refuses to even load it, so a content update can never be clobbered.
 */
export default function ExerciseEditor() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const { showError } = useToast();

  const params = useLocalSearchParams<{ id?: string }>();
  const parsedId = params.id ? Number(params.id) : Number.NaN;
  const editingId = Number.isInteger(parsedId) ? parsedId : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState<Details>(DEFAULT_USER_EXERCISE_DRAFT);
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingId === null) return;
    let cancelled = false;

    getExerciseById(editingId)
      .then((ex) => {
        if (cancelled || !ex || !isUserExercise(ex)) return;
        setName(ex.enName);
        setDescription(ex.enDescription);
        setDetails({
          muscles: ex.muscles,
          style: ex.style,
          difficulty: ex.difficulty,
          equipment: ex.equipment,
          pattern: ex.pattern,
          secondsPerRep: ex.secondsPerRep,
          imagePath: ex.imagePath,
        });
      })
      .catch((error: unknown) => reportError("exercises.editor.load", error));

    return () => {
      cancelled = true;
    };
  }, [editingId]);

  const toggleMuscle = (muscle: MuscleCode) =>
    setDetails((d) => ({
      ...d,
      muscles: d.muscles.includes(muscle)
        ? d.muscles.filter((m) => m !== muscle)
        : [...d.muscles, muscle],
    }));

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showError(t("exercise_editor.name_required"));
      return;
    }

    setSaving(true);
    try {
      const draft: UserExerciseDraft = {
        ...details,
        name: trimmedName,
        description: description.trim(),
      };
      if (editingId === null) await createUserExercise(draft);
      else await updateUserExercise(editingId, draft);
      router.back();
    } catch (error) {
      reportError("exercises.editor.save", error);
      // No name-collision branch: `0036` dropped the hero-side unique index, so there is no
      // failure here a hero could act on. A branch nothing can reach is a control wired to
      // nothing, waiting to be believed.
      showError(t("exercise_editor.save_failed"));
    } finally {
      setSaving(false);
    }
  }, [details, description, editingId, name, router, showError, t]);

  return (
    <YStack flex={1} bg="$background">
      <ScrollView
        // With the keyboard up, the default ("never") spends the first tap on any control in
        // here dismissing it — react-native#4087, and the reason a button on a screen you
        // type into has to be pressed twice. "handled" keeps the dismiss-on-empty-space
        // gesture and gives the child the tap it was aimed at. Same value the exercise
        // picker sheet already uses.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
      >
        <XStack items="center" gap="$3">
          <AppIconButton
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t("quests.go_back", "Go back")}
          >
            <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
          </AppIconButton>
          <Text fontWeight="700" fontSize={20} color="$text">
            {editingId === null ? t("exercise_editor.title_new") : t("exercise_editor.title_edit")}
          </Text>
        </XStack>

        {/* The picture leads. A movement is a card before it is a form — the hero sees it in a
          session, in the catalogue and on its own page long before anyone reads the muscles —
          so the editor opens on that card forming rather than on two text fields. */}
        <ImageChoiceField
          value={details.imagePath}
          onChange={(imagePath) => setDetails((d) => ({ ...d, imagePath }))}
          choices={EXERCISE_CHOICES}
          resolve={getExerciseAsset}
          resolveThumb={getExerciseThumb}
          aspect={[1, 1]}
        />

        <Card>
          <YStack gap="$3">
            <Text fontWeight="700" fontSize={13} color="$textSecondary">
              {t("exercise_editor.name_label")}
            </Text>
            <Input
              testID="exercise-name"
              value={name}
              onChangeText={setName}
              placeholder={t("exercise_editor.name_placeholder")}
            />

            <Text fontWeight="700" fontSize={13} color="$textSecondary">
              {t("exercise_editor.description_label")}
            </Text>
            <Input
              testID="exercise-description"
              value={description}
              onChangeText={setDescription}
              placeholder={t("exercise_editor.description_placeholder")}
              multiline
              numberOfLines={4}
              height={110}
            />
          </YStack>
        </Card>

        <Card>
          <Pressable
            testID="exercise-details-toggle"
            hitSlop={12}
            onPress={() => setShowDetails((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showDetails }}
            accessibilityLabel={t("exercise_editor.details")}
          >
            <XStack items="center" justify="space-between">
              <Text fontWeight="700" fontSize={13} color="$textSecondary">
                {t("exercise_editor.details")}
              </Text>
              {showDetails ? (
                <ChevronUp size={16} color="$textSecondary" />
              ) : (
                <ChevronDown size={16} color="$textSecondary" />
              )}
            </XStack>
          </Pressable>

          <Text fontSize={12} color="$textSecondary" opacity={0.8} pt="$2">
            {t("exercise_editor.details_hint")}
          </Text>

          {showDetails ? (
            <YStack gap="$4" pt="$3">
              <YStack gap="$2">
                <Text fontSize={12} color="$textSecondary">
                  {t("exercise_editor.muscles")}
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {muscleCodes.map((muscle) => (
                    <Chip
                      key={muscle}
                      testID={`exercise-muscle-${muscle}`}
                      label={MUSCLE_LABELS[muscle][language]}
                      tone={details.muscles.includes(muscle) ? "primary" : "default"}
                      onPress={() => toggleMuscle(muscle)}
                    />
                  ))}
                </XStack>
              </YStack>

              <YStack gap="$2">
                <Text fontSize={12} color="$textSecondary">
                  {t("exercise_editor.style")}
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {exerciseStyles.map((style) => (
                    <Chip
                      key={style}
                      testID={`exercise-style-${style}`}
                      label={t(`exercise_editor.style_${style}`)}
                      tone={details.style === style ? "primary" : "default"}
                      onPress={() => setDetails((d) => ({ ...d, style }))}
                    />
                  ))}
                </XStack>
              </YStack>

              <YStack gap="$2">
                <Text fontSize={12} color="$textSecondary">
                  {t("exercise_editor.difficulty")}
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {difficultyCodes.map((difficulty) => (
                    <Chip
                      key={difficulty}
                      testID={`exercise-difficulty-${difficulty}`}
                      label={t(`exercise_editor.difficulty_${difficulty}`)}
                      tone={details.difficulty === difficulty ? "primary" : "default"}
                      onPress={() => setDetails((d) => ({ ...d, difficulty }))}
                    />
                  ))}
                </XStack>
              </YStack>

              <YStack gap="$2">
                <Text fontSize={12} color="$textSecondary">
                  {t("exercise_editor.equipment")}
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {equipmentCodes.map((equipment) => (
                    <Chip
                      key={equipment}
                      testID={`exercise-equipment-${equipment}`}
                      label={EQUIPMENT_LABELS[equipment][language]}
                      tone={details.equipment === equipment ? "primary" : "default"}
                      onPress={() => setDetails((d) => ({ ...d, equipment }))}
                    />
                  ))}
                </XStack>
              </YStack>

              <YStack gap="$2">
                <Text fontSize={12} color="$textSecondary">
                  {t("exercise_editor.pattern")}
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  <Chip
                    testID="exercise-pattern-none"
                    label={t("exercise_editor.pattern_none")}
                    tone={details.pattern === null ? "primary" : "default"}
                    onPress={() => setDetails((d) => ({ ...d, pattern: null }))}
                  />
                  {movementPatterns.map((pattern) => (
                    <Chip
                      key={pattern}
                      testID={`exercise-pattern-${pattern}`}
                      label={t(`exercises.pattern_${pattern}`)}
                      tone={details.pattern === pattern ? "primary" : "default"}
                      onPress={() => setDetails((d) => ({ ...d, pattern }))}
                    />
                  ))}
                </XStack>
              </YStack>

              <Stepper
                label={t("exercise_editor.seconds_per_rep")}
                hint={t("exercise_editor.seconds_per_rep_hint")}
                value={details.secondsPerRep}
                min={SECONDS_PER_REP_RANGE.min}
                max={SECONDS_PER_REP_RANGE.max}
                onChange={(secondsPerRep) => setDetails((d) => ({ ...d, secondsPerRep }))}
              />
            </YStack>
          ) : null}
        </Card>

        <AppButton
          testID="exercise-save"
          variant="primary"
          disabled={saving}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel={t("exercise_editor.save")}
        >
          {t("exercise_editor.save")}
        </AppButton>
      </ScrollView>
    </YStack>
  );
}
