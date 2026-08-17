import { ChevronLeft, ChevronRight, Dumbbell, Timer } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { PathStrip } from "@/components/common/PathStrip";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { Tag } from "@/components/common/Tag";
import { getExerciseAsset, getExerciseThumb } from "@/constants/assetMap";
import { getExerciseById } from "@/db";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { type Chain, getChainTo, getNextProgression, type NextProgression } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import { readPath } from "@/db/paths";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

type Exercise = NonNullable<Awaited<ReturnType<typeof getExerciseById>>>;
type Status = "loading" | "ready" | "error";

const resolveAsset = (path?: string | null): ImageSourcePropType =>
  path?.startsWith("http") ? { uri: path } : getExerciseAsset(path ?? "");

/**
 * The 1280 px art belongs to the 16:9 hero and nowhere else — an image costs its *source*
 * resolution in memory, not its slot (docs/architecture/performance.md). Every small slot reads
 * the 128 px thumbnail, which is what `ProgressionCard` and `SessionRewards` already do.
 */
const resolveThumb = (path?: string | null): ImageSourcePropType =>
  path?.startsWith("http") ? { uri: path } : getExerciseThumb(path ?? "");

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
  // Reserve the 16:9 hero and the title card so the screen doesn't jump by the full
  // image height when data lands.
  return (
    <YStack gap="$4">
      <Skeleton height={200} radius={16} />
      <SkeletonCard>
        <Skeleton height={24} width="60%" />
        <Skeleton height={16} width="80%" />
        <Skeleton height={16} width="40%" />
      </SkeletonCard>
    </YStack>
  );
}

function ExerciseImage({ source }: { source: ImageSourcePropType }) {
  return (
    <YStack
      width="100%"
      aspectRatio={16 / 9}
      bg="$bgLight"
      borderWidth={1}
      borderColor="$borderStrong"
      rounded="$8"
      shadowColor="$text"
      shadowRadius={0}
      shadowOffset={{ width: 0, height: 5 }}
      overflow="hidden"
    >
      <Image
        source={source}
        style={{ width: "100%", height: "100%" }}
        // contain, not cover: the movement art is a full figure on a dark ground, and the 16:9
        // crop was taking the head and feet with it. The card's own bg letterboxes invisibly.
        contentFit="contain"
        transition={200}
      />
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
      accessibilityLabel={target === null ? undefined : hereName}
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
 * and a hero who wants to try the next step tonight can (roadmap §15, the progression ladder).
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
      accessibilityLabel={`${t("exercises.next_step", "Next rung")} — ${name}`}
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
              ? t("exercises.next_step_earned", "You have earned it — give it a try.")
              : t("exercises.next_step_progress", {
                  count: remaining,
                  defaultValue: `Hit your target ${remaining} more times to earn it.`,
                })}
          </Paragraph>
        </YStack>

        <ChevronRight size={20} color="$textSecondary" />
      </XStack>
    </Card>
  );
}

function ExerciseContent({ exercise }: { exercise: Exercise }) {
  const language = useSettingsStore((s) => s.language);
  const { t } = useTranslation();

  const title = localizedName(exercise, language);
  const desc = language === "fr" ? exercise.frDescription : exercise.enDescription;
  const equipmentLabel = EQUIPMENT_LABELS[exercise.equipment]?.[language] ?? exercise.equipment;
  const img = resolveAsset(exercise.imagePath);

  const [progression, setProgression] = useState<NextProgression | null>(null);
  const [chain, setChain] = useState<Chain | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getNextProgression(exercise.id), getChainTo(exercise.id)])
      .then(([next, path]) => {
        if (cancelled) return;
        setProgression(next);
        setChain(path);
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
            <Tag
              icon={<Timer size={12} color="$text" opacity={0.7} />}
              label={t("exercises.seconds_per_rep", {
                count: exercise.secondsPerRep,
                defaultValue: `${exercise.secondsPerRep}s`,
              })}
              tone="primary"
            />
          </XStack>

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
          {status === "ready" && exercise && <ExerciseContent exercise={exercise} />}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
