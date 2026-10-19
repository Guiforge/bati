import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Input, Separator, type TamaguiElement, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ImageChoiceField } from "@/components/common/ImageChoiceField";
import { QuotaPanel } from "@/components/common/QuotaPanel";
import { StatusBand } from "@/components/common/StatusBand";
import { Stepper } from "@/components/common/Stepper";
import { useToast } from "@/components/common/Toast";
import { ChevronLeft, Plus, Trash2, X } from "@/components/icons";
import { ExercisePickerSheet } from "@/components/quests/ExercisePickerSheet";
import { ImportQuestButton } from "@/components/quests/QuestFileButtons";
import { getExerciseThumb, getQuestAsset, QUEST_ASSETS } from "@/constants/assetMap";
import {
  clearQuestConfig,
  createQuestTemplate,
  deleteQuest,
  getQuestConfig,
  getQuestTemplateById,
  heroFirst,
  listExercises,
  pickableExercises,
  REST_RANGE,
  ROUNDS_RANGE,
  saveQuestConfig,
  setQuestExercises,
  TARGET_RANGE,
  targetRangeFor,
  USER_QUEST_AUTHOR,
  updateQuestMeta,
} from "@/db";
import type { Exercise } from "@/db/exercises";
import type { QuestTargetType } from "@/db/schema";
import { DEFAULT_TARGET_VALUE, SECONDS_SUFFIX } from "@/db/targets";
import { useHaptics } from "@/hooks/useHaptics";
import { localizedName, localizedText, localizedTitle } from "@/src/i18n/localized";
import { quotaRefusal } from "@/src/plus/access";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/** What the in-app dialog says; `onConfirm` and `cancelLabel` left out make it a plain message. */
type DialogState = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
};

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
 * thing that is missing: the old copy listed both, so it read as wrong whenever only one was. The
 * screen says it, on the field, so this returns which piece and never a sentence.
 */
function missingPiece(trimmedTitle: string, exerciseCount: number): "name" | "exercises" | null {
  if (trimmedTitle.length === 0) return "name";
  if (exerciseCount === 0) return "exercises";
  return null;
}

/**
 * "No cover chosen" — a real state, not a picture. The gallery paints a muscle-tinted banner for
 * a quest with no `imagePath`, which is nicer than a grey plate, so an untouched field must save
 * as null rather than as the placeholder's path.
 */
const NO_COVER = "";

/** The quest art already in the APK. Covers are 4:3, unlike the movements' square plates. */
const QUEST_CHOICES = Object.keys(QUEST_ASSETS);

const DEFAULT_ROUNDS = 3;
const DEFAULT_REST = 30;
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
  const [imagePath, setImagePath] = useState(NO_COVER);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  // How many the hero holds once creating is refused. The form shows until the answer says
  // otherwise, and edit mode never asks.
  const [refusedAt, setRefusedAt] = useState<number | null>(null);
  // Set by a save that found the name empty: the field goes red until the hero types.
  const [nameMissing, setNameMissing] = useState(false);
  // Same for a quest with no exercise: the line under "Add an exercise" stays until one is added.
  const [exercisesMissing, setExercisesMissing] = useState(false);
  const nameRef = useRef<TamaguiElement>(null);
  const scrollRef = useRef<ScrollView>(null);
  const showMessage = (title: string, body: string) =>
    setDialog({ title, body, confirmLabel: t("common.close") });
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
      imagePath: NO_COVER,
      picked: [] as PickedExercise[],
    }),
  );
  const skipGuardRef = useRef(false);
  const isDirty =
    JSON.stringify({ title, description, rounds, rest, roundRest, imagePath, picked }) !== baseline;

  // The ref is read when the hero leaves, never during render: a ref read in the render body is
  // one of the things that makes the React Compiler skip the whole editor.
  const navigation = useNavigation();
  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      if (skipGuardRef.current || !isDirty) return;
      e.preventDefault();
      setDialog({
        title: t("quests.editor_discard_title"),
        body: t("quests.editor_discard_body"),
        confirmLabel: t("quests.editor_discard"),
        cancelLabel: t("common.cancel"),
        destructive: true,
        onConfirm: () => navigation.dispatch(e.data.action),
      });
    });
  }, [navigation, t, isDirty]);

  const exerciseName = useCallback(
    (exercise: Exercise) => localizedName(exercise, language),
    [language],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [all, template, refused] = await Promise.all([
        listExercises(),
        questId == null ? Promise.resolve(null) : getQuestTemplateById(questId),
        questId == null ? quotaRefusal("createQuest") : Promise.resolve(null),
      ]);
      if (cancelled) return;

      setExercises(all);
      setRefusedAt(refused);
      if (!template) return;

      const nextTitle = localizedTitle(template, language);
      const nextDescription = localizedText(template, "description", language);
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
      const nextImagePath = template.imagePath ?? NO_COVER;
      setImagePath(nextImagePath);
      setBaseline(
        JSON.stringify({
          title: nextTitle,
          description: nextDescription,
          rounds: template.rounds,
          rest: template.restSeconds,
          roundRest: template.roundRestSeconds ?? template.restSeconds,
          imagePath: nextImagePath,
          picked: nextPicked,
        }),
      );
    };

    load().catch((error) => {
      reportError("quest.editorLoad", error);
      setDialog({
        title: t("common.error"),
        body: t("quests.load_error"),
        confirmLabel: t("common.close"),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [questId, language, t]);

  // Retired movements leave every list you pick from — but not a quest that already holds one.
  // Filtering them out of `exercises` filtered them out of `exercisesById` too, so an existing
  // row rendered as nothing while `save()` still wrote it: the hero saw four exercises, saved
  // five, and had no way to remove the one they could not see.
  // Same rule as the catalogue: what the hero wrote leads the sheet.
  const pickable = useMemo(() => heroFirst(pickableExercises(exercises)), [exercises]);

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
    setExercisesMissing(false);
    nextUid.current += 1;
    const uid = nextUid.current;
    setPicked((prev) => [
      ...prev,
      {
        uid,
        exerciseId: exercise.id,
        // The movement's own unit when it has one — "10 reps of Plank" is the swap bug at birth.
        type: exercise.measure ?? "reps",
        value: DEFAULT_TARGET_VALUE[exercise.measure ?? "reps"],
      },
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
    const missing = missingPiece(trimmed, picked.length);
    if (missing) {
      setNameMissing(missing === "name");
      setExercisesMissing(missing === "exercises");
      // shortcut: the field is at the top and the exercises line at the bottom of one column, so
      // the scroll goes to either end rather than measuring; re-measure if a section is added
      // between them.
      if (missing === "name") {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        nameRef.current?.focus();
      } else {
        scrollRef.current?.scrollToEnd({ animated: true });
      }
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

    // No `try ... finally` here: the React Compiler cannot lower one and gives up on the whole
    // editor. The write is its own function, and the catch below never rethrows, so the line after
    // it runs on both paths.
    const persist = async () => {
      if (questId == null) {
        const id = await createQuestTemplate({
          enTitle: trimmed,
          frTitle: trimmed,
          deTitle: trimmed,
          esTitle: trimmed,
          enDescription: text,
          frDescription: text,
          deDescription: text,
          esDescription: text,
          author: USER_QUEST_AUTHOR,
          archetype: null,
          rounds,
          restSeconds: rest,
          roundRestSeconds: roundRest,
          imagePath: imagePath || null,
          exercises: payload,
        });
        // The edit used to vanish with no confirmation it persisted.
        success();
        showSuccess(t("quests.editor_saved"));
        router.replace(`/quests/${id}` as never);
        return;
      }

      await updateQuestMeta(questId, {
        enTitle: trimmed,
        frTitle: trimmed,
        deTitle: trimmed,
        esTitle: trimmed,
        enDescription: text,
        frDescription: text,
        deDescription: text,
        esDescription: text,
        rounds,
        restSeconds: rest,
        roundRestSeconds: roundRest,
        imagePath: imagePath || null,
      });
      await setQuestExercises(questId, payload);

      // The editor is the source of truth for a quest you own, so what was just typed replaces
      // the per-quest overrides. Target overrides could not survive anyway: they are keyed by
      // quest_exercises row id and this write rebuilds those rows. The remembered level stays —
      // that is a personal setting, not a property of the template.
      const saved = await getQuestConfig(questId);
      if (saved) await saveQuestConfig(questId, { level: saved.level }, { replace: "all" });

      success();
      showSuccess(t("quests.editor_saved"));
      router.back();
    };

    setBusy(true);
    skipGuardRef.current = true;
    await persist().catch((e: unknown) => {
      skipGuardRef.current = false;
      reportError("quest.editorSave", e);
      const message = t("errors.generic");
      showMessage(t("common.error"), message);
    });
    setBusy(false);
  };

  const confirmDelete = () => {
    if (questId == null) return;

    setDialog({
      title: t("quests.editor_delete_title"),
      body: t("quests.editor_delete_body"),
      confirmLabel: t("quests.editor_delete"),
      cancelLabel: t("common.cancel"),
      destructive: true,
      onConfirm: () => {
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
            showMessage(t("common.error"), t("errors.generic"));
          });
      },
    });
  };

  if (refusedAt !== null) {
    return (
      <YStack flex={1} bg="$background" p="$5" pt={insets.top + 12} gap="$4">
        <QuotaPanel text={t("plus.quest_quota", { count: refusedAt })}>
          <ImportQuestButton />
        </QuotaPanel>
      </YStack>
    );
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView
        ref={scrollRef}
        // With the keyboard up, the default ("never") spends the first tap on any control in
        // here dismissing it — react-native#4087, and the reason a button on a screen you
        // type into has to be pressed twice. "handled" keeps the dismiss-on-empty-space
        // gesture and gives the child the tap it was aimed at. Same value the exercise
        // picker sheet already uses.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: saveBarHeight + 24 }}
      >
        <YStack p="$5" pt={insets.top + 12} gap="$4">
          <XStack items="center" justify="space-between">
            <XStack items="center" gap="$3" flex={1}>
              <AppIconButton
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel={t("quests.go_back")}
              >
                <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
              </AppIconButton>
              <Text fontFamily="$heading" fontWeight="700" fontSize={20} color="$text">
                {questId == null ? t("quests.editor_new_title") : t("quests.editor_edit_title")}
              </Text>
            </XStack>

            {questId != null ? (
              <AppIconButton
                onPress={confirmDelete}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t("quests.editor_delete")}
              >
                <Trash2 size={20} color="$danger" strokeWidth={2.5} />
              </AppIconButton>
            ) : null}
          </XStack>

          {/* Before the form, on a new quest only: a hero holding a quest someone sent them should
              not have to scroll past an empty form to find where it goes. */}
          {questId == null ? <ImportQuestButton /> : null}

          {/* The cover leads, as it does in the movement editor: a quest is a card in a gallery
            long before anyone reads its rounds. Seed quests carry authored art; a hero picks
            from the same set or brings a photo. */}
          <ImageChoiceField
            value={imagePath}
            onChange={setImagePath}
            choices={QUEST_CHOICES}
            resolve={getQuestAsset}
            resolveThumb={getQuestAsset}
            aspect={[4, 3]}
          />

          <Card>
            <YStack gap="$3">
              <YStack gap="$2">
                <Text fontWeight="700" fontSize={14} color="$textSecondary">
                  {t("quests.editor_name")}
                </Text>
                <Input
                  value={title}
                  onChangeText={(next) => {
                    setTitle(next);
                    setNameMissing(false);
                  }}
                  ref={nameRef}
                  testID="quest-name"
                  placeholder={t("quests.editor_name_placeholder")}
                  bg="$background"
                  borderColor={nameMissing ? "$error" : "$borderStrong"}
                  color="$text"
                />
                {nameMissing ? (
                  <Text
                    testID="quest-name-error"
                    accessibilityLiveRegion="polite"
                    fontSize={13}
                    color="$error"
                  >
                    {t("quests.editor_incomplete_name")}
                  </Text>
                ) : null}
              </YStack>

              <YStack gap="$2">
                <Text fontWeight="700" fontSize={14} color="$textSecondary">
                  {t("quests.editor_description")}
                </Text>
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t("quests.editor_description_placeholder")}
                  bg="$background"
                  borderColor="$borderStrong"
                  color="$text"
                />
              </YStack>

              <Separator borderColor="$borderStrong" />

              <Stepper
                label={t("quests.config_rounds")}
                value={rounds}
                min={ROUNDS_RANGE.min}
                max={ROUNDS_RANGE.max}
                onChange={setRounds}
              />
              {/* The label renders on one line, so which rest is which goes in the hint. */}
              <Stepper
                label={t("quests.config_rest")}
                hint={t("quests.config_rest_hint")}
                value={rest}
                min={REST_RANGE.min}
                max={REST_RANGE.max}
                step={REST_STEP}
                suffix={SECONDS_SUFFIX[language]}
                onChange={setRest}
              />
              <Stepper
                label={t("quests.config_round_rest")}
                hint={t("quests.config_round_rest_hint")}
                value={roundRest}
                min={REST_RANGE.min}
                max={REST_RANGE.max}
                step={REST_STEP}
                suffix={SECONDS_SUFFIX[language]}
                onChange={setRoundRest}
              />
            </YStack>
          </Card>

          <Text fontWeight="700" fontSize={18} color="$text">
            {t("quests.exercises_list")}
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
                      accessibilityLabel={t("quests.editor_remove")}
                      onPress={() => removeExercise(p.uid)}
                    />
                  </XStack>

                  <XStack gap="$2">
                    <Chip
                      label={t("quests.config_reps")}
                      tone={p.type === "reps" ? "primary" : "default"}
                      onPress={() =>
                        patchExercise(p.uid, { type: "reps", value: DEFAULT_TARGET_VALUE.reps })
                      }
                    />
                    <Chip
                      label={t("quests.config_seconds")}
                      tone={p.type === "time" ? "primary" : "default"}
                      onPress={() =>
                        patchExercise(p.uid, { type: "time", value: DEFAULT_TARGET_VALUE.time })
                      }
                    />
                  </XStack>

                  <Stepper
                    label={t("quests.editor_target")}
                    value={p.value}
                    min={targetRangeFor(p.type, exercise?.style).min}
                    max={targetRangeFor(p.type, exercise?.style).max}
                    step={p.type === "time" ? REST_STEP : 1}
                    suffix={p.type === "time" ? SECONDS_SUFFIX[language] : ""}
                    onChange={(value) => patchExercise(p.uid, { value })}
                  />
                </YStack>
              </Card>
            );
          })}

          {/* The trigger lives here, not in the sheet: its label names *this* screen's action,
              and substitution opens the same sheet from a row with a different one. */}
          <AppButton
            variant="outline"
            icon={<Plus size={20} color="$text" strokeWidth={2.5} />}
            onPress={() => setPickerOpen(true)}
            accessibilityLabel={t("quests.editor_add_exercise")}
          >
            {t("quests.editor_add_exercise")}
          </AppButton>
          {exercisesMissing ? (
            <Text
              testID="quest-exercises-error"
              accessibilityLiveRegion="polite"
              fontSize={13}
              color="$error"
            >
              {t("quests.editor_incomplete_exercises")}
            </Text>
          ) : null}

          <ExercisePickerSheet
            exercises={pickable}
            pickedIds={pickedIds}
            language={language}
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            title={t("quests.editor_add_exercise")}
            onPick={addExercise}
            pickAction={<Plus size={20} color="$primaryText" strokeWidth={2.5} />}
            bottomInset={insets.bottom}
          />
        </YStack>
      </ScrollView>

      {/* Content scrolls edge-to-edge; this keeps the status bar readable over it. */}
      <StatusBand />

      {/* `$bgDark`, opaque like the quest screen's Start bar: the theme's `$background` is
          translucent, and the form scrolling under it read through as ghost headings. */}
      <YStack
        p="$4"
        pb={insets.bottom + 16}
        bg="$bgDark"
        borderTopWidth={1}
        borderColor="$borderStrong"
        style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
        onLayout={(e) => setSaveBarHeight(e.nativeEvent.layout.height)}
      >
        <AppButton testID="quest-save" height={56} disabled={busy} onPress={save}>
          {t("quests.editor_save")}
        </AppButton>
      </YStack>
      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        body={dialog?.body ?? ""}
        confirmLabel={dialog?.confirmLabel ?? ""}
        cancelLabel={dialog?.cancelLabel}
        destructive={dialog?.destructive}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          const confirm = dialog?.onConfirm;
          setDialog(null);
          confirm?.();
        }}
      />
    </YStack>
  );
}
