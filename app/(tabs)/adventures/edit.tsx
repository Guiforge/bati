import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  usePreventRemove,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewInstance,
  type TextInputInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { balanceFacts, balanceSentence } from "@/components/adventures/balanceFacts";
import { type EditorEnd, EditorEndSection } from "@/components/adventures/EditorEnd";
import { type EditorStep, EditorStepCard } from "@/components/adventures/EditorStepCard";
import { focusLabel } from "@/components/adventures/focusLabel";
import { monsterName } from "@/components/adventures/monsterName";
import { QuestPickerSheet } from "@/components/adventures/QuestPickerSheet";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ImageChoiceField } from "@/components/common/ImageChoiceField";
import { Input } from "@/components/common/Input";
import { StatusBand } from "@/components/common/StatusBand";
import { useToast } from "@/components/common/Toast";
import { leavesWithoutAsking, useTabLeaveGuard } from "@/components/common/useTabLeaveGuard";
import { ChevronLeft, Plus } from "@/components/icons";
import { ADVENTURE_ASSETS, type AdventureAssetKey, getAdventureAsset } from "@/constants/assetMap";
import {
  getRecentSessionHistory,
  listExercises,
  listQuestTemplates,
  previewQuests,
  suggestDifficultyFromSessions,
} from "@/db";
import { bossHpForQuests } from "@/db/bossFights";
import { isOutingQuest } from "@/db/expeditions";
import {
  createHeroAdventure,
  type HeroAdventureDraft,
  listMonsters,
  listOfferedMonsters,
  loadHeroAdventureDraft,
  MAX_DESCRIPTION,
  MAX_STEPS,
  MAX_TITLE,
  MIN_STEPS,
  type Monster,
  recentSessionQuests,
  retireHeroAdventure,
  updateHeroAdventure,
} from "@/db/heroAdventures";
import { type HeroBoss, listHeroBosses } from "@/db/heroBosses";
import { preferences } from "@/db/preferences";
import { getAllQuestConfigs, startingDifficulty } from "@/db/questConfig";
import { type QuestTemplate, trainingFocus } from "@/db/quests";
import { useHaptics } from "@/hooks/useHaptics";
import { useKeyboardShown } from "@/hooks/useKeyboardShown";
import { adventureWeeksLabel, useReminderPace } from "@/hooks/useReminderPace";
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

const COVER_CHOICES = Object.keys(ADVENTURE_ASSETS) as AdventureAssetKey[];
const FIRST_COVER = COVER_CHOICES[0] ?? "squire_path";

/** What still stands between this form and a saved adventure: the name, then the steps, or nothing. */
function missingPiece(trimmedTitle: string, stepCount: number): "name" | "steps" | null {
  if (trimmedTitle.length === 0) return "name";
  if (stepCount < MIN_STEPS) return "steps";
  return null;
}

type Fields = {
  title: string;
  description: string;
  /** A bundled key or a `data:` photo. */
  cover: string;
  steps: EditorStep[];
  end: EditorEnd;
};

const NEW_FIELDS: Fields = {
  title: "",
  description: "",
  cover: FIRST_COVER,
  steps: [],
  end: { kind: "route" },
};

/** What the hero wrote, as the dirty-form guard compares it (the row ids are editor-only). */
const snapshot = (f: Fields) =>
  JSON.stringify({ ...f, steps: f.steps.map(({ uid: _uid, ...rest }) => rest) });

/** The lists the editor reads once: the quests to pick from and what prices them. */
type Catalogue = {
  quests: readonly QuestTemplate[];
  questsById: ReadonlyMap<number, QuestTemplate>;
  exercisesById: Record<number, Awaited<ReturnType<typeof listExercises>>[number]>;
  seconds: ReadonlyMap<number, number>;
  monsters: readonly Monster[];
  /** Keys of the monsters the picker offers; the others still resolve (a saved or imported boss). */
  offered: ReadonlySet<string>;
  /** The hero's own bosses, read again each time the screen is back in front. */
  heroBosses: readonly HeroBoss[];
  recent: readonly number[];
  level: "easy" | "medium" | "hard";
};

const EMPTY_CATALOGUE: Catalogue = {
  quests: [],
  questsById: new Map(),
  exercisesById: {},
  seconds: new Map(),
  monsters: [],
  offered: new Set(),
  heroBosses: [],
  recent: [],
  level: "medium",
};

async function loadCatalogue(): Promise<Catalogue> {
  const [quests, exercises, monsters, offered, bosses, recent, configs, history, answer] =
    await Promise.all([
      listQuestTemplates(),
      listExercises(),
      listMonsters(),
      listOfferedMonsters(),
      listHeroBosses(),
      recentSessionQuests(),
      getAllQuestConfigs(),
      getRecentSessionHistory(10),
      preferences.getTrainingLevel(),
    ]);
  const exercisesById = Object.fromEntries(exercises.map((e) => [e.id, e] as const));
  const level = suggestDifficultyFromSessions(history, {
    maxSessions: 10,
    defaultDifficulty: startingDifficulty(answer, history.length),
  }).level;
  const previews = await previewQuests(quests, exercisesById, configs, level);
  return {
    quests,
    questsById: new Map(quests.map((q) => [q.id, q] as const)),
    exercisesById,
    seconds: new Map([...previews].map(([id, p]) => [id, p.seconds] as const)),
    monsters,
    offered: new Set(offered.map((m) => m.key)),
    heroBosses: bosses,
    recent,
    level,
  };
}

// ponytail: one long form, as the quest editor is. Ceiling: it grows a section per phase; lift the
// summary and the retire link out when a third screen needs them.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: see the ponytail note above
export default function AdventureEditor() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const pace = useReminderPace();
  const { success } = useHaptics();
  const { showSuccess } = useToast();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const adventureId = useMemo(() => {
    const raw = Array.isArray(params.id) ? params.id[0] : params.id;
    const n = Number(raw);
    return raw != null && Number.isFinite(n) ? n : null;
  }, [params.id]);

  const [catalogue, setCatalogue] = useState<Catalogue>(EMPTY_CATALOGUE);
  const [fields, setFields] = useState<Fields>(NEW_FIELDS);
  const [baseline, setBaseline] = useState(() => snapshot(NEW_FIELDS));
  const [frozen, setFrozen] = useState(false);
  const [hp, setHp] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [nameMissing, setNameMissing] = useState(false);
  const [stepsMissing, setStepsMissing] = useState(false);
  const typing = useKeyboardShown();
  const nextUid = useRef(0);
  const nameRef = useRef<TextInputInstance>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const nameCardY = useRef(0);
  const addStepY = useRef(0);
  const skipGuardRef = useRef(false);

  const { title, description, cover, steps, end } = fields;
  const patch = useCallback((next: Partial<Fields>) => setFields((f) => ({ ...f, ...next })), []);
  const showMessage = (heading: string, body: string) =>
    setDialog({ title: heading, body, confirmLabel: t("common.close") });

  const isDirty = snapshot(fields) !== baseline;

  // The ref is read when the hero leaves, never during render (the React Compiler skips a screen
  // that reads one in its body). Same guard as the quest editor: one tap on back lost the draft.
  const navigation = useNavigation();
  usePreventRemove(isDirty, ({ repeat }) => {
    if (leavesWithoutAsking(navigation, isDirty, skipGuardRef)) {
      repeat();
      return;
    }
    setDialog({
      title: t("quests.editor_discard_title"),
      body: t("quests.editor_discard_body"),
      confirmLabel: t("quests.editor_discard"),
      cancelLabel: t("common.cancel"),
      destructive: true,
      onConfirm: () => {
        // The field that was being typed in is about to unmount; without this the keyboard
        // outlives it and sits over the screen the hero lands on.
        Keyboard.dismiss();
        repeat();
      },
    });
  });

  useTabLeaveGuard(isDirty, skipGuardRef, (go) =>
    setDialog({
      title: t("quests.editor_discard_title"),
      body: t("quests.editor_discard_body"),
      confirmLabel: t("quests.editor_discard"),
      cancelLabel: t("common.cancel"),
      destructive: true,
      onConfirm: go,
    }),
  );

  useEffect(() => {
    let cancelled = false;
    const toStep = (s: HeroAdventureDraft["steps"][number]): EditorStep => {
      nextUid.current += 1;
      return { uid: nextUid.current, ...s, showOutro: s.outro.length > 0 };
    };
    loadCatalogue()
      .then(async (loaded) => {
        const draft = adventureId == null ? null : await loadHeroAdventureDraft(adventureId);
        if (cancelled) return;
        setCatalogue(loaded);
        if (!draft) return;
        // A step whose quest is gone leaves the form (saving repairs the adventure), unless a
        // playthrough is under way: the steps are fixed then, and the texts go by position.
        const kept = draft.frozen
          ? draft.steps
          : draft.steps.filter((s) => loaded.questsById.has(s.questId));
        const next: Fields = {
          title: draft.title,
          description: draft.description,
          cover: draft.imagePath,
          steps: kept.map(toStep),
          end: draft.end,
        };
        setFields(next);
        setBaseline(snapshot(next));
        setFrozen(draft.frozen);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        reportError("adventure.editorLoad", error);
        setDialog({
          title: t("common.error"),
          body: t("errors.generic"),
          confirmLabel: t("common.close"),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [adventureId, t]);

  // Back from the boss editor with a new boss: it shows in the list, and it is the one chosen,
  // since the hero made it for this adventure (the uuids known when they left tell it apart).
  const bossesBefore = useRef<ReadonlySet<string> | null>(null);
  useFocusEffect(
    useCallback(() => {
      listHeroBosses()
        .then((heroBosses) => {
          setCatalogue((c) => ({ ...c, heroBosses }));
          const known = bossesBefore.current;
          const made = known ? heroBosses.find((b) => !known.has(b.uuid)) : undefined;
          // One return only: left without saving, a boss a sync brings later is not the shortcut's.
          bossesBefore.current = null;
          if (!made) return;
          patch({
            end: { kind: "boss", monster: made.monsterKey ?? "stone_golem", heroBoss: made.uuid },
          });
        })
        .catch((error: unknown) => reportError("adventure.editorBosses", error));
    }, [patch]),
  );

  const questIds = useMemo(() => steps.map((s) => s.questId), [steps]);
  const bossEnd = end.kind === "boss";

  // The pool at the hero's level for these steps, by the function the fight itself uses.
  useEffect(() => {
    if (!bossEnd || questIds.length === 0) {
      setHp(null);
      return;
    }
    let cancelled = false;
    bossHpForQuests(questIds, catalogue.level)
      .then((value) => {
        if (!cancelled) setHp(value);
      })
      .catch((error: unknown) => reportError("adventure.editorHp", error));
    return () => {
      cancelled = true;
    };
  }, [bossEnd, questIds, catalogue.level]);

  const resolved = useMemo(
    () => steps.flatMap((s) => catalogue.questsById.get(s.questId) ?? []),
    [steps, catalogue.questsById],
  );
  const outingsOnly =
    resolved.length > 0 && resolved.every((q) => isOutingQuest(q, catalogue.exercisesById));
  // The hero's boss, if the adventure ends on one: its name is what the summary says.
  const heroBoss =
    end.kind === "boss" && end.heroBoss
      ? catalogue.heroBosses.find((b) => b.uuid === end.heroBoss)
      : undefined;
  const heroBossName = heroBoss?.name.trim() ?? "";
  const monster =
    end.kind === "boss" ? catalogue.monsters.find((m) => m.key === end.monster) : null;

  const addStep = (quest: QuestTemplate) => {
    setStepsMissing(false);
    nextUid.current += 1;
    const uid = nextUid.current;
    setFields((f) =>
      f.steps.length >= MAX_STEPS
        ? f
        : {
            ...f,
            steps: [
              ...f.steps,
              { uid, questId: quest.id, narrative: "", outro: "", showOutro: false },
            ],
          },
    );
    // Eight is the ceiling: the sheet closes on the last one it can take.
    if (steps.length + 1 >= MAX_STEPS) setPickerOpen(false);
  };

  const patchStep = (uid: number, change: Partial<EditorStep>) =>
    setFields((f) => ({
      ...f,
      steps: f.steps.map((s) => (s.uid === uid ? { ...s, ...change } : s)),
    }));

  const moveStep = (index: number, direction: -1 | 1) =>
    setFields((f) => {
      const to = index + direction;
      const a = f.steps[index];
      const b = f.steps[to];
      if (!a || !b) return f;
      const next = [...f.steps];
      next[index] = b;
      next[to] = a;
      return { ...f, steps: next };
    });

  const prefill = () => {
    const ids = [...catalogue.recent].filter((id) => catalogue.questsById.has(id));
    patch({
      steps: ids.map((questId) => {
        nextUid.current += 1;
        return { uid: nextUid.current, questId, narrative: "", outro: "", showOutro: false };
      }),
    });
    setStepsMissing(false);
  };

  const save = async () => {
    const trimmed = title.trim();
    const missing = missingPiece(trimmed, steps.length);
    if (missing) {
      setNameMissing(missing === "name");
      setStepsMissing(missing === "steps");
      if (missing === "name") {
        scrollRef.current?.scrollTo({ y: Math.max(0, nameCardY.current - 16), animated: true });
        nameRef.current?.focus();
      } else {
        // To the message under "Add a step", not the end: the boss grid below it is taller than a screen.
        scrollRef.current?.scrollTo({ y: Math.max(0, addStepY.current - 16), animated: true });
      }
      return;
    }
    const draft: HeroAdventureDraft = {
      title: trimmed,
      description,
      imagePath: cover,
      end,
      steps: steps.map(({ questId, narrative, outro }) => ({ questId, narrative, outro })),
    };
    // A promise chain, not `try ... finally`: the React Compiler cannot lower one.
    setBusy(true);
    skipGuardRef.current = true;
    await (adventureId == null
      ? createHeroAdventure(draft)
      : updateHeroAdventure(adventureId, draft).then(() => adventureId)
    )
      .then((id) => {
        success();
        showSuccess(t("adventures.editor_saved"));
        // An existing adventure is reached from its own page: go back to it, a replace would stack a twin.
        if (adventureId == null) router.replace(`/adventures/${id}` as never);
        else router.back();
      })
      .catch((error: unknown) => {
        skipGuardRef.current = false;
        reportError("adventure.editorSave", error);
        showMessage(t("common.error"), t("adventures.editor_error"));
      });
    setBusy(false);
  };

  const confirmRetire = () => {
    if (adventureId == null) return;
    setDialog({
      title: t("adventures.retire_title", { title: title.trim() }),
      body: t("adventures.retire_body"),
      confirmLabel: t("adventures.retire_confirm"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        setBusy(true);
        skipGuardRef.current = true;
        retireHeroAdventure(adventureId)
          .then(() => router.dismissTo("/adventures" as never))
          .catch((error: unknown) => {
            setBusy(false);
            skipGuardRef.current = false;
            reportError("adventure.retire", error);
            showMessage(t("common.error"), t("errors.generic"));
          });
      },
    });
  };

  const weeks = adventureWeeksLabel(steps.length, pace, t);
  const focus = focusLabel(trainingFocus([...resolved], catalogue.exercisesById), language, t);
  const sentences = balanceFacts(resolved, catalogue.exercisesById).map((fact) =>
    balanceSentence(fact, language, t),
  );
  const summary = [
    t("adventures.steps", { count: steps.length }),
    weeks,
    monster
      ? t("adventures.editor_summary_boss", {
          name: heroBossName || monsterName(monster, language),
        })
      : null,
    focus || null,
  ].filter(Boolean);

  return (
    <YStack flex={1} bg="background">
      {/* The window does not resize under the keyboard here (edge-to-edge), so without this the
          focused field and the save bar sat under it. Same pairing as journal/[id]. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <YStack p="5" pt={insets.top + 12} gap="4">
            <XStack items="center" gap="3">
              <AppIconButton
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel={t("quests.go_back")}
              >
                <ChevronLeft size={22} color="text" strokeWidth={2.5} />
              </AppIconButton>
              <Text fontFamily="heading" fontWeight="700" fontSize={20} color="text">
                {adventureId == null ? t("adventures.editor_title_new") : t("adventures.edit")}
              </Text>
            </XStack>

            {adventureId == null && steps.length === 0 && catalogue.recent.length >= MIN_STEPS ? (
              <Text
                testID="editor-from-recent"
                onPress={prefill}
                minH={44}
                fontWeight="700"
                color="primaryText"
                accessibilityRole="button"
              >
                {t("adventures.editor_from_recent")}
              </Text>
            ) : null}

            {/* The name is the one required field: above the cover picker, so at a large font it is not
                the thing under the save bar (persona audit 81). */}
            <Card
              onLayout={(e) => {
                nameCardY.current = e.nativeEvent.layout.y;
              }}
            >
              <YStack gap="3">
                <YStack gap="2">
                  <Text fontWeight="700" fontSize={14} color="textSecondary">
                    {t("adventures.editor_name")}
                  </Text>
                  <Input
                    ref={nameRef}
                    testID="adventure-name"
                    value={title}
                    onChangeText={(next) => {
                      patch({ title: next });
                      setNameMissing(false);
                    }}
                    maxLength={MAX_TITLE}
                    bg="background"
                    borderColor={`${nameMissing ? "error" : "borderStrong"}`}
                    color="text"
                  />
                  {nameMissing ? (
                    <Text
                      testID="adventure-name-error"
                      accessibilityLiveRegion="polite"
                      fontSize={13}
                      color="error"
                    >
                      {t("adventures.editor_name_missing")}
                    </Text>
                  ) : null}
                </YStack>

                <YStack gap="2">
                  <Text fontWeight="700" fontSize={14} color="textSecondary">
                    {t("adventures.editor_description")}
                  </Text>
                  <Input
                    value={description}
                    onChangeText={(next) => patch({ description: next })}
                    maxLength={MAX_DESCRIPTION}
                    multiline
                    py={8}
                    bg="background"
                    borderColor="borderStrong"
                    color="text"
                  />
                </YStack>
              </YStack>
            </Card>

            <ImageChoiceField
              value={cover}
              onChange={(next) => patch({ cover: next })}
              choices={COVER_CHOICES}
              resolve={getAdventureAsset}
              resolveThumb={getAdventureAsset}
              aspect={[4, 3]}
            />

            <Text fontWeight="700" fontSize={18} color="text">
              {t("adventures.editor_steps")}
            </Text>
            {frozen ? (
              <Text testID="editor-frozen" fontSize={13} color="textSecondary">
                {t("adventures.editor_frozen")}
              </Text>
            ) : null}

            {steps.map((step, i) => {
              const quest = catalogue.questsById.get(step.questId) ?? null;
              return (
                <EditorStepCard
                  key={step.uid}
                  index={i}
                  isLast={i === steps.length - 1}
                  step={step}
                  quest={quest}
                  seconds={catalogue.seconds.get(step.questId) ?? 0}
                  language={language}
                  frozen={frozen}
                  onChange={(change) => patchStep(step.uid, change)}
                  onMove={(direction) => moveStep(i, direction)}
                  onRemove={() => patch({ steps: steps.filter((s) => s.uid !== step.uid) })}
                />
              );
            })}

            {steps.length < MAX_STEPS && !frozen ? (
              <YStack
                onLayout={(e) => {
                  addStepY.current = e.nativeEvent.layout.y;
                }}
              >
                <AppButton
                  testID="editor-add-step"
                  variant="outline"
                  icon={<Plus size={20} color="text" strokeWidth={2.5} />}
                  onPress={() => setPickerOpen(true)}
                >
                  {t("adventures.editor_add_step")}
                </AppButton>
              </YStack>
            ) : null}
            {stepsMissing ? (
              <Text
                testID="adventure-steps-error"
                accessibilityLiveRegion="polite"
                fontSize={13}
                color="error"
              >
                {t("adventures.editor_steps_missing")}
              </Text>
            ) : null}

            <Text fontWeight="700" fontSize={18} color="text">
              {t("adventures.editor_end")}
            </Text>
            <EditorEndSection
              end={end}
              monsters={catalogue.monsters}
              offered={catalogue.offered}
              heroBosses={catalogue.heroBosses}
              onCreateBoss={() => {
                bossesBefore.current = new Set(catalogue.heroBosses.map((b) => b.uuid));
                router.push("/bosses/edit" as never);
              }}
              language={language}
              hp={hp}
              outingsOnly={outingsOnly}
              frozen={frozen}
              onChange={(next) => patch({ end: next })}
            />

            <Text testID="editor-summary" fontSize={13} color="textSecondary">
              {summary.join(" · ")}
            </Text>
            {sentences.map((sentence) => (
              <Text key={sentence} testID="editor-balance" fontSize={13} color="textSecondary">
                {sentence}
              </Text>
            ))}

            {adventureId != null && !frozen ? (
              <Text
                testID="editor-retire"
                onPress={confirmRetire}
                minH={44}
                fontWeight="700"
                color="textSecondary"
                accessibilityRole="button"
              >
                {t("adventures.editor_retire")}
              </Text>
            ) : null}

            <QuestPickerSheet
              quests={catalogue.quests}
              seconds={catalogue.seconds}
              language={language}
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              onPick={addStep}
              bottomInset={insets.bottom}
            />
          </YStack>
        </ScrollView>

        <StatusBand />

        <YStack
          p="4"
          pb={typing ? 16 : insets.bottom + 16}
          bg="bgDark"
          borderTopWidth={1}
          borderColor="borderStrong"
        >
          <AppButton testID="adventure-save" height={56} disabled={busy} onPress={save}>
            {t("adventures.editor_save")}
          </AppButton>
        </YStack>
      </KeyboardAvoidingView>
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
