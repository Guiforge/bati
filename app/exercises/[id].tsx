import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { PathStrip } from "@/components/common/PathStrip";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { Tag } from "@/components/common/Tag";
import { useToast } from "@/components/common/Toast";
import { ChevronLeft, ChevronRight, Dumbbell, Timer } from "@/components/icons";
import { shortDate } from "@/components/journal/journalFormat";
import { recordWhen } from "@/components/journal/stats/wall";
import { getExerciseAsset, getExerciseThumb } from "@/constants/assetMap";
import {
  deleteUserExercise,
  getExerciseById,
  getExerciseUsage,
  isUserExercise,
  retireUserExercise,
  unretireUserExercise,
} from "@/db";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { type Chain, getChainTo, getNextProgression, type NextProgression } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import { readPath } from "@/db/paths";
import { type ExerciseGhost, getExerciseHistory, ghostKey } from "@/db/personalRecords";
import type { QuestTargetType } from "@/db/schema";
import { formatTarget } from "@/db/targets";
import { NON_REP_STYLE } from "@/db/workUnits";
import { localizedName, localizedText } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

type Exercise = NonNullable<Awaited<ReturnType<typeof getExerciseById>>>;
type Status = "loading" | "ready" | "error";

/**
 * The 1280 px art belongs to the hero frame and nowhere else — an image costs its *source*
 * resolution in memory, not its slot (docs/architecture/performance.md). Every small slot reads
 * the 128 px thumbnail, which is what `ProgressionCard` and `SessionRewards` already do.
 */
const resolveThumb = (path?: string | null): ImageSourcePropType => getExerciseThumb(path ?? "");

const parseId = (raw?: string | string[]): number | null => {
  const val = Array.isArray(raw) ? raw[0] : raw;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  const { t } = useTranslation();
  return (
    <XStack items="center" gap="$3">
      <AppIconButton
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t("quests.go_back", "Go back")}
      >
        <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
      </AppIconButton>
      <XStack items="center" gap="$2">
        <Dumbbell size={18} color="$text" strokeWidth={2.5} />
        <Text fontWeight="700" fontSize={20} color="$text">
          {title}
        </Text>
      </XStack>
    </XStack>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Card>
      <YStack gap="$3" items="center" py="$2">
        <Text fontWeight="700" fontSize={16} color="$text">
          {t("exercises.load_error", "Failed to load")}
        </Text>
        <Paragraph color="$text" opacity={0.6} size="$3">
          {message}
        </Paragraph>
        <AppButton fullWidth={false} variant="secondary" onPress={onRetry}>
          {t("exercises.retry", "Retry")} ↻
        </AppButton>
      </YStack>
    </Card>
  );
}

function LoadingCard() {
  // The empty hero frame itself, not a skeleton of the same nominal height: a reserved slot that
  // is a guess drifts from what lands in it, and a fixed 200 under a square frame let the screen
  // jump by a third of the image.
  return (
    <YStack gap="$4">
      <ExerciseImage />
      <SkeletonCard>
        <Skeleton height={24} width="60%" />
        <Skeleton height={16} width="80%" />
        <Skeleton height={16} width="40%" />
      </SkeletonCard>
    </YStack>
  );
}

/** Also the loading state, with nothing in it. */
function ExerciseImage({ source }: { source?: ImageSourcePropType }) {
  return (
    <YStack
      width="100%"
      // Square, because the art is: all 64 movement illustrations are 1280×1280, and so is the
      // placeholder every unknown path falls back to. A 16:9 frame around them spent 44 % of its
      // width on empty background, which `contentFit="contain"` had to letterbox (exercise sheet
      // audit, 2026-09-15). `SessionRewards` already frames the same art square.
      aspectRatio={1}
      bg="$bgLight"
      borderWidth={1}
      borderColor="$borderStrong"
      rounded="$8"
      shadowColor="$text"
      shadowRadius={0}
      shadowOffset={{ width: 0, height: 5 }}
      overflow="hidden"
    >
      {source === undefined ? null : (
        <Image
          source={source}
          style={{ width: "100%", height: "100%" }}
          // contain, not cover: a hero's own photo is whatever shape their camera gave it, and a
          // crop of that takes the movement out of frame. The card's bg letterboxes invisibly.
          contentFit="contain"
          transition={200}
        />
      )}
    </YStack>
  );
}

/**
 * The path this movement sits on: its name, how far the hero has climbed, and where they stand.
 *
 * Named, not numbered. Everything else in Bati carries a name — quests, village tiers, the flame —
 * and the ladder alone spoke in coordinates ("rung 3 of 6"), which nobody can want or tell anyone
 * about. `db/paths.ts` supplies the noun; a summit with none falls back to the movement's own name.
 *
 * Segments, not a list of named nodes. A dedicated "my path" screen was designed and dropped for
 * showing a wall of unlit movements; the same wall would be no kinder here. The rung the hero is
 * on is named in the line below, so the colours reinforce it rather than carry it alone.
 *
 * Tapping opens the rung the hero actually stands on — which is also the honest answer to "this is
 * too hard, what do I train instead?". Not the direct prerequisite: on the Pull-ups page that is
 * Chin-Up, which someone who cannot do a pull-up cannot do either.
 */
function PathCard({ chain }: { chain: Chain }) {
  const language = useSettingsStore((s) => s.language);
  const { t } = useTranslation();
  const router = useRouter();

  const { here, isClimbed } = readPath(chain, language);
  if (!here) return null;

  // Standing on this page's own movement: tapping would reload the page the hero is reading.
  const target = chain.position < chain.rungs.length ? here.id : null;
  const hereName = localizedName(here, language);

  return (
    <Card
      onPress={target === null ? undefined : () => router.push(`/exercises/${target}` as never)}
      // The sentence, not the bare name: TalkBack read "Dead bug" with nothing to say what it was.
      accessibilityLabel={
        target === null ? undefined : t("exercises.path_you_are_on", { name: hereName })
      }
    >
      <YStack gap="$2">
        <XStack items="flex-start" gap="$2">
          <YStack flex={1}>
            <PathStrip chain={chain} />
          </YStack>
          {target === null ? null : <ChevronRight size={16} color="$textSecondary" mt="$1" />}
        </XStack>

        {isClimbed ? null : (
          <Paragraph color="$text" opacity={0.7} size="$3">
            {target === null
              ? t("exercises.path_you_are_here", "You are here.")
              : t("exercises.path_you_are_on", {
                  name: hereName,
                  defaultValue: `You are on ${hereName}.`,
                })}
          </Paragraph>
        )}
      </YStack>
    </Card>
  );
}

/**
 * What comes after this movement. A hint, never a gate — nothing in the app is locked behind it,
 * and a hero who wants to try the next step tonight can (roadmap §4.4, and §5 on gating a skill
 * branch).
 */
function NextStepCard({ progression }: { progression: NextProgression }) {
  const language = useSettingsStore((s) => s.language);
  const { t } = useTranslation();
  const router = useRouter();

  const name = localizedName(progression.next, language);
  const remaining = Math.max(0, progression.required - progression.metTarget);

  return (
    <Card
      onPress={() => router.push(`/exercises/${progression.next.id}` as never)}
      accessibilityLabel={`${t("exercises.next_step", "Next rung")} · ${name}`}
    >
      {/* The pose was always in the payload and never rendered — a named step you cannot see is
          a to-do list item, an illustrated one is a movement you want to try. */}
      <XStack gap="$3" items="center">
        <YStack
          width={80}
          height={80}
          rounded="$8"
          bg="$bgLight"
          borderWidth={1}
          borderColor="$borderStrong"
          overflow="hidden"
        >
          <Image
            source={resolveThumb(progression.next.imagePath)}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        </YStack>

        <YStack gap="$2" flex={1}>
          <Text fontWeight="700" fontSize={13} color="$text" opacity={0.5}>
            {t("exercises.next_step", "NEXT STEP").toUpperCase()}
          </Text>
          <Text color="$text" fontWeight="700" fontSize={18}>
            {name}
          </Text>
          <Paragraph color="$text" opacity={0.7} size="$3">
            {progression.isEarned
              ? t("exercises.next_step_earned", "You have earned it. Give it a try.")
              : t("exercises.next_step_progress", {
                  count: remaining,
                  defaultValue: `Hit your target ${remaining} more sessions in a row to earn it.`,
                })}
          </Paragraph>

          {/* A fork gets named, not illustrated: Push-ups opens three movements and the card
              announced Dip alone. Names on one line say the whole truth for the price of a line;
              three more 80 px poses would make the page a list of what the hero is not doing.
              The sentence is `progression.*` because the quest log and the victory screen say it
              too, about the same fork. */}
          {progression.alsoNext.length === 0 ? null : (
            <Paragraph color="$textSecondary" size="$2">
              {t("progression.rung_also_leads_to", {
                names: progression.alsoNext.map((m) => localizedName(m, language)).join(", "),
              })}
            </Paragraph>
          )}
        </YStack>

        <ChevronRight size={20} color="$textSecondary" />
      </XStack>
    </Card>
  );
}

/**
 * What a hero may do to a movement they wrote. Nothing here is offered for seed content.
 *
 * Retire is the normal path and delete is the narrow one, because foreign keys are off on the
 * device and nine queries innerJoin `exercises` — removing a movement someone has trained would
 * silently rewrite their volume, their village level and their records. `getExerciseUsage` is
 * what decides which of the two this screen shows.
 */
function HeroActions({ exercise, onGone }: { exercise: Exercise; onGone: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { showError } = useToast();
  const [deletable, setDeletable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getExerciseUsage(exercise.id)
      .then((usage) => {
        // Every count, not the two this screen knows the names of — see `ExerciseUsage`.
        if (!cancelled) setDeletable(Object.values(usage).every((n) => n === 0));
      })
      .catch((error) => {
        // Unknown usage means the safe answer, not a missing button: retire.
        reportError("exercise.usage", error);
        if (!cancelled) setDeletable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exercise.id]);

  const run = (action: () => Promise<void>, failureKey: string) => {
    setBusy(true);
    action()
      .then(onGone)
      .catch((error: unknown) => {
        setBusy(false);
        reportError("exercise.heroAction", error);
        showError(t(failureKey));
      });
  };

  const confirmRetire = () =>
    Alert.alert(t("exercises.retire_confirm_title"), t("exercises.retire_confirm_body"), [
      { text: t("common.cancel", "Cancel"), style: "cancel" },
      {
        text: t("exercises.retire"),
        onPress: () => run(() => retireUserExercise(exercise.id), "exercises.retire_failed"),
      },
    ]);

  const confirmDelete = () =>
    Alert.alert(t("exercises.delete_confirm_title"), t("exercises.delete_confirm_body"), [
      { text: t("common.cancel", "Cancel"), style: "cancel" },
      {
        text: t("exercises.delete"),
        style: "destructive",
        onPress: () => run(() => deleteUserExercise(exercise.id), "exercises.delete_failed"),
      },
    ]);

  return (
    <Card>
      <YStack gap="$3">
        <AppButton
          testID="exercise-edit"
          variant="outline"
          disabled={busy}
          // `as never` like every other push here: typed routes are generated by `expo start`
          // (see AGENTS.md), so a fresh checkout does not know this route exists.
          onPress={() =>
            router.push({ pathname: "/exercises/new", params: { id: exercise.id } } as never)
          }
          accessibilityRole="button"
          accessibilityLabel={t("exercises.edit")}
        >
          {t("exercises.edit")}
        </AppButton>

        {/* A retired movement offers only the way back: it is already out of every list you
            pick from, and "Retirer" promised that door opens both ways. */}
        {exercise.retiredAt !== null ? (
          <AppButton
            testID="exercise-restore"
            variant="outline"
            disabled={busy}
            onPress={() => run(() => unretireUserExercise(exercise.id), "exercises.restore_failed")}
            accessibilityRole="button"
            accessibilityLabel={t("exercises.restore")}
          >
            {t("exercises.restore")}
          </AppButton>
        ) : null}

        {/* One button, never both: a movement with history cannot be deleted, and one that has
            none has nothing to keep. `null` means the count is still in flight. */}
        {exercise.retiredAt !== null ? null : deletable === null ? null : deletable ? (
          <AppButton
            testID="exercise-delete"
            variant="outline"
            disabled={busy}
            onPress={confirmDelete}
            accessibilityRole="button"
            accessibilityLabel={t("exercises.delete")}
          >
            {t("exercises.delete")}
          </AppButton>
        ) : (
          <AppButton
            testID="exercise-retire"
            variant="outline"
            disabled={busy}
            onPress={confirmRetire}
            accessibilityRole="button"
            accessibilityLabel={t("exercises.retire")}
          >
            {t("exercises.retire")}
          </AppButton>
        )}
      </YStack>
    </Card>
  );
}

function ExerciseContent({ exercise, onGone }: { exercise: Exercise; onGone: () => void }) {
  const language = useSettingsStore((s) => s.language);
  const { t } = useTranslation();
  // Read once per render and passed down, the way the Journal's wall takes it: two dates on the
  // same line must not straddle midnight.
  const now = new Date();

  const title = localizedName(exercise, language);
  const desc = localizedText(exercise, "description", language);
  const equipmentLabel = EQUIPMENT_LABELS[exercise.equipment]?.[language] ?? exercise.equipment;
  // `getExerciseAsset` understands a bundled path, a picked illustration and a photo's
  // data URI alike, so this screen no longer needs its own `startsWith("http")` branch.
  const img = getExerciseAsset(exercise.imagePath);

  const [progression, setProgression] = useState<NextProgression | null>(null);
  const [chain, setChain] = useState<Chain | null>(null);
  /**
   * What the hero has already done on this movement, in the units they did it in.
   *
   * The same map the session screen reads for its "Last time / best" line, and the same one a
   * quest reads when it opens: one query, already written, already indexed. Until this call
   * existed, the page for a movement someone had trained for three years held the art, the form
   * cues and the ladder, and not one number that came from their own journal (audit 2026-09-10).
   *
   * Keyed by unit, because reps and seconds share `resultValue` and a movement can have been
   * logged as both: a plank held for 60 and a plank done for 12 reps are two different records.
   */
  const [history, setHistory] = useState<Map<string, ExerciseGhost> | null>(null);
  // Both units, because a movement can have been logged as a hold and as reps, and the two are
  // different records. `getExerciseHistory` simply omits what has never been done.
  const loggedHere = (["reps", "time"] as const)
    .map((type) => ({ type, ghost: history?.get(ghostKey(exercise.id, type)) }))
    .filter((entry): entry is { type: QuestTargetType; ghost: ExerciseGhost } => !!entry.ghost);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getNextProgression(exercise.id),
      getChainTo(exercise.id),
      getExerciseHistory([exercise.id]),
    ])
      .then(([next, path, logged]) => {
        if (cancelled) return;
        setProgression(next);
        setChain(path);
        setHistory(logged);
      })
      .catch((error) => {
        // The ladder is a hint; its absence changes nothing about the screen.
        reportError("exercise.ladder", error);
      });
    return () => {
      cancelled = true;
    };
  }, [exercise.id]);

  return (
    <YStack gap="$4">
      <ExerciseImage source={img} />

      <Card>
        <YStack gap="$3">
          {/* Title */}
          <Text color="$text" fontWeight="700" fontSize={24} lineHeight={28}>
            {title}
          </Text>

          {/* Description */}
          {desc ? (
            <Paragraph color="$text" opacity={0.7} size="$4" lineHeight={22}>
              {desc}
            </Paragraph>
          ) : null}

          {/* Tags */}
          <XStack gap="$2" flexWrap="wrap">
            <Tag
              label={equipmentLabel}
              tone={exercise.equipment === "none" ? "default" : "secondary"}
            />
            {/* A tempo is seconds per repetition, and neither a hold nor an expedition has
                repetitions: one is measured in seconds held, the other in ground covered
                (db/workUnits.ts). The column still holds a 1 so the duration estimator has
                something to multiply; that number is not a fact about the movement, so it does
                not get a chip. `QuestExerciseRow` already drew the line at a hold. */}
            {exercise.measure === "time" || exercise.style === NON_REP_STYLE ? null : (
              <Tag
                icon={<Timer size={12} color="$text" opacity={0.7} />}
                label={t("exercises.seconds_per_rep", {
                  count: exercise.secondsPerRep,
                  defaultValue: `${exercise.secondsPerRep}s`,
                })}
                tone="primary"
              />
            )}
          </XStack>

          {/* What the hero has done here, in the same shape and the same colours the session
              screen uses for it: the number they are trying to beat is the gold one, wherever
              they meet it. */}
          {loggedHere.length > 0 && (
            <YStack gap="$2">
              <Text fontWeight="700" fontSize={13} color="$text" opacity={0.5}>
                {t("exercises.your_numbers", "Your numbers").toUpperCase()}
              </Text>
              {loggedHere.map(({ type, ghost }) => (
                <XStack key={type} items="baseline" gap="$2" flexWrap="wrap">
                  <Text fontSize={12} color="$textSecondary">
                    {t("session.ghost_last_label", "Last time")}
                  </Text>
                  <Text fontSize={15} fontWeight="700" color="$text">
                    {formatTarget({ type, value: ghost.last }, language)}
                  </Text>
                  <Text fontSize={12} color="$textSecondary">
                    {shortDate(language, new Date(ghost.at), now)}
                  </Text>
                  {ghost.best > ghost.last ? (
                    <>
                      <Text fontSize={12} color="$textSecondary" opacity={0.5}>
                        ·
                      </Text>
                      {/* The Journal's word and the Journal's date. This line said "best 60s"
                          with no date while the wall two taps away said "Record 1:00 · 10 months
                          ago" about the same hold, and an undated number reads as tonight's. */}
                      <Text fontSize={12} color="$textSecondary">
                        {t("exercises.record_label", "Record")}
                      </Text>
                      <Text fontSize={15} fontWeight="700" color="$resourceGold">
                        {formatTarget({ type, value: ghost.best }, language)}
                      </Text>
                      <Text fontSize={12} color="$textSecondary">
                        {recordWhen(t, language, new Date(ghost.bestAt), now)}
                      </Text>
                    </>
                  ) : null}
                </XStack>
              ))}
            </YStack>
          )}

          {/* Muscles */}
          {exercise.muscles.length > 0 && (
            <YStack gap="$2">
              <Text fontWeight="700" fontSize={13} color="$text" opacity={0.5}>
                {t("exercises.muscles", "Muscles").toUpperCase()}
              </Text>
              <XStack gap="$2" flexWrap="wrap">
                {exercise.muscles.map((m) => (
                  <Tag key={m} label={MUSCLE_LABELS[m]?.[language] ?? m} tone="success" />
                ))}
              </XStack>
            </YStack>
          )}
        </YStack>
      </Card>

      {/* Two cards, rendered independently. They used to be one, with the path nested inside the
          next-step card — so on the twelve summits, where there *is* no next step, the whole
          ladder vanished. The movement a hero opens out of ambition showed the least. */}
      {chain ? <PathCard chain={chain} /> : null}
      {progression ? <NextStepCard progression={progression} /> : null}

      {/* Seed content is never offered these — a content update must not be clobberable. */}
      {isUserExercise(exercise) ? <HeroActions exercise={exercise} onGone={onGone} /> : null}
    </YStack>
  );
}

function InvalidIdView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <YStack flex={1} bg="$background" justify="center" items="center" p="$6" gap="$4">
      <Text fontSize={48}>🤷</Text>
      <Text fontWeight="700" fontSize={18} color="$text">
        {t("exercises.invalid_id", "Exercise not found")}
      </Text>
      <AppButton fullWidth={false} variant="secondary" onPress={onBack}>
        {t("exercises.go_back", "Go back")}
      </AppButton>
    </YStack>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function ExerciseDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { t } = useTranslation();

  const exerciseId = parseId(params.id);

  const [status, setStatus] = useState<Status>("loading");
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(
    async (id: number) => {
      setStatus("loading");
      setError("");
      try {
        const data = await getExerciseById(id);
        if (!data) {
          setError(t("exercises.not_found", "Exercise not found"));
          setStatus("error");
          return;
        }
        setExercise(data);
        setStatus("ready");
      } catch (e) {
        // The raw message goes to the report; the hero gets a translated sentence, not
        // SQLite prose.
        reportError("exercise.load", e);
        setError(t("exercises.load_error", "Failed to load exercise"));
        setStatus("error");
      }
    },
    [t],
  );

  useEffect(() => {
    if (exerciseId) load(exerciseId).catch((e) => reportError("exercise.detail", e));
  }, [exerciseId, load]);

  const goBack = () => router.back();

  if (!exerciseId) return <InvalidIdView onBack={goBack} />;

  return (
    <YStack flex={1} bg="$background">
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          minHeight: "100%",
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack p="$5" pt={insets.top + 12} gap="$5">
          <Header onBack={goBack} title={t("exercises.details_title", "Exercise")} />

          {status === "loading" && <LoadingCard />}
          {status === "error" && <ErrorCard message={error} onRetry={() => load(exerciseId)} />}
          {status === "ready" && exercise && (
            <ExerciseContent exercise={exercise} onGone={goBack} />
          )}
        </YStack>
      </ScrollView>

      {/* Content scrolls edge-to-edge; this keeps the status bar readable over it, as on the
          quest screen. Without it the back button slid under the clock. */}
      <YStack
        position="absolute"
        t={0}
        l={0}
        r={0}
        height={insets.top}
        bg="$bgDark"
        opacity={0.88}
        pointerEvents="none"
      />
    </YStack>
  );
}
