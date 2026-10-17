import { LegendList } from "@legendapp/list/react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { AdventureFooter } from "@/components/adventures/AdventureFooter";
import { focusLabel } from "@/components/adventures/focusLabel";
import { starsFor } from "@/components/adventures/replayStars";
import { useAmbientVisit, useScreenGuide } from "@/components/chorus/screenCues";
import { VillagerLine } from "@/components/chorus/VillagerLine";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { GameIcon } from "@/components/common/GameIcon";
import { Recitatif } from "@/components/common/Recitatif";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { Skull, Sparkles } from "@/components/icons";
import { getAdventureAsset } from "@/constants/assetMap";
import {
  type Adventure,
  activeRunAdventureIds,
  adventureOrder,
  getAnyActiveAdventureRun,
  getFinishedRunCountsByAdventure,
  getRecentSessionHistory,
  listAdventures,
  listExercises,
  previewQuests,
  type QuestPreview,
  suggestDifficultyFromSessions,
} from "@/db";
import { threatRank } from "@/db/bossFights";
import { preferences } from "@/db/preferences";
import { getAllQuestConfigs, startingDifficulty } from "@/db/questConfig";
import { USER_QUEST_AUTHOR } from "@/db/quests";
import { formatCount } from "@/db/targets";
import { adventureWeeksLabel, useReminderPace } from "@/hooks/useReminderPace";
import { localizedText, localizedTitle } from "@/src/i18n/localized";
import { lockedAdventures } from "@/src/plus/access";
import { reportError } from "@/src/reportError";
import { keepIfSame } from "@/src/sameContent";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

function resolveCoverImage(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getAdventureAsset(path);
}

/** The posters' data. The cover quests' chips are priced in one read: see `previewQuests`. */
type GalleryData = {
  adventures: Adventure[];
  previews: ReadonlyMap<number, QuestPreview>;
  /** Bati+ adventures this hero never started (P-04.2): grouped after the others, still tappable. */
  locked: ReadonlySet<number>;
};

type LoadState =
  | ({ status: "loading" } & GalleryData)
  | ({ status: "ready" } & GalleryData)
  | ({ status: "error" } & GalleryData);

/** A poster whose cover quest was not in the last pricing draws its chips off zero, not a guess. */
const EMPTY_PREVIEW: QuestPreview = { seconds: 0, xp: 0 };

const ANDROID_MIN_BOTTOM_INSET = 24;

// Precomputed once per data load — recomputing these in renderItem made every recycled
// row rebuild color maps and re-run the duration estimator while scrolling.
type AdventureRow = {
  adventure: Adventure;
  durationSeconds: number;
  xp: number;
  cover: ImageSourcePropType | null;
  title: string;
  description: string;
  kindLabel: string;
  /** "Force · Bras · Dos" — what the campaign trains, so the poster answers it before the tap. */
  focusLabel: string;
  /** Null while the hero's days are still being read. */
  weeksLabel: string | null;
  stepsLabel: string;
  xpLabel: string;
  finishedCount: number;
  /** "★", "★★", "★★★", then "★ ×n" — how many times this campaign was completed. */
  starsLabel: string | null;
  /** 1-4 skulls, null on a route: which of these has a monster worth the trip. */
  threat: 1 | 2 | 3 | 4 | null;
  /** Written by the hero: the card says so, quietly. */
  byHero: boolean;
};

/** How the hero is doing in the one campaign that can be active at a time. */
type AdventureProgress = {
  adventureId: number;
  completedCount: number;
  currentIndex: number;
};

function buildAdventureRow(
  a: Adventure,
  finishedCount: number,
  language: AppLanguage,
  t: TFunction,
  preview: QuestPreview,
  pace: number | null | undefined,
): AdventureRow {
  const q = a.coverQuest;
  // Same numbers as the quest detail and the quest gallery, off the same saved config, served
  // rung and records — priced off the cover quest, the one step the poster's XP chip advertises.
  const { seconds: durationSeconds, xp } = preview;

  return {
    adventure: a,
    durationSeconds,
    xp,
    cover: resolveCoverImage(a.imagePath),
    title: localizedTitle(a, language) || localizedTitle(q, language),
    description:
      localizedText(a, "description", language) || localizedText(q, "description", language),
    kindLabel:
      a.kind === "boss"
        ? t("adventures.kind_boss")
        : a.kind === "event"
          ? t("adventures.kind_event")
          : t("adventures.kind_route"),
    focusLabel: focusLabel(a.focus, language, t),
    weeksLabel: adventureWeeksLabel(a.stepsCount, pace, t),
    stepsLabel: t("adventures.steps", {
      count: a.stepsCount,
    }),
    xpLabel: t("adventures.reward_xp_per_step", {
      count: formatCount(language, xp),
    }),
    finishedCount,
    starsLabel: starsFor(finishedCount),
    // The pool the content tunes, not the hero's scaled one: a browsing card compares campaigns
    // to each other, and threading a difficulty in would make the same monster read differently
    // on two heroes' screens for a reason neither of them chose.
    threat: a.bossTotalHp == null ? null : threatRank(a.bossTotalHp),
    byHero: a.author === USER_QUEST_AUTHOR,
  };
}

const COVER_IMAGE_STYLE = { width: "100%", height: "100%" } as const;

/** threatRank is 1-4; identical glyphs still need stable keys. Same list as BossPanel's. */
const SKULL_KEYS = ["skull-1", "skull-2", "skull-3", "skull-4"] as const;

/**
 * A campaign poster: taller banner than a quest ticket, world-tinted card, and the step
 * track — the visual signature of a journey, which quest cards never wear.
 */
function AdventureCard({
  row,
  progress,
  onPressAdventure,
}: {
  row: AdventureRow;
  progress: AdventureProgress | null;
  onPressAdventure: (id: number) => void;
}) {
  const { t } = useTranslation();
  const item = row.adventure;

  const stepProgressLabel = progress
    ? t("adventures.step_progress", {
        current: progress.currentIndex + 1,
        total: item.stepsCount,
      })
    : null;
  // The weeks join once the hero's days are read, never a guess in the meantime.
  const metaLabel = [
    stepProgressLabel ?? row.weeksLabel,
    stepProgressLabel ? row.weeksLabel : row.stepsLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <YStack px="$5">
      <Card
        testID="adventures-adventure-card"
        p="$0"
        overflow="hidden"
        onPress={() => onPressAdventure(item.id)}
      >
        <YStack height={180}>
          {row.cover ? (
            <Image
              source={row.cover}
              recyclingKey={String(item.id)}
              style={COVER_IMAGE_STYLE}
              contentFit="cover"
              accessible={false}
            />
          ) : (
            <YStack flex={1} items="center" justify="center">
              <GameIcon name="scroll" size={44} color="$textSecondary" />
            </YStack>
          )}
          <XStack position="absolute" t="$3" l="$3" items="center" gap="$2">
            <Chip
              label={row.kindLabel}
              tone={item.kind === "boss" ? "primary" : undefined}
              icon={
                item.kind === "boss" ? (
                  // The same `$white` the chip writes its own label in. `$bgDark` here was
                  // 2.71:1 on the `$primary` fill, under the 3:1 a meaningful icon needs, next
                  // to a label sitting at 7.06:1.
                  <GameIcon name="sword" size={14} color="$white" accessible={false} />
                ) : undefined
              }
            />
            {/* The same skulls the boss panel draws inside the campaign, read the same way. The
                `BOSS` tag says a monster exists; this says whether it is the Golem's 278 or the
                Ranger's 1115, which is the question a browsing screen was not answering. */}
            {row.threat ? (
              <XStack
                items="center"
                gap={2}
                bg="$bgLight"
                rounded="$4"
                px="$2"
                py="$1"
                borderWidth={1}
                borderColor="$borderStrong"
                accessibilityLabel={t("boss.threat", { rank: row.threat })}
              >
                {SKULL_KEYS.slice(0, row.threat).map((k) => (
                  <Skull key={k} size={14} color="$error" />
                ))}
              </XStack>
            ) : null}
          </XStack>
          {/* The title on the art, like Home and the session: a poster names itself. */}
          {row.cover ? (
            <YStack position="absolute" b="$3" l="$3" r="$3">
              <Recitatif numberOfLines={2} testID="adventure-card-title">
                {row.title}
              </Recitatif>
            </YStack>
          ) : null}
          {row.starsLabel ? (
            <XStack
              position="absolute"
              t="$3"
              r="$3"
              bg="$bgLight"
              rounded="$4"
              px="$2"
              py="$1"
              borderWidth={1}
              borderColor="$borderStrong"
              accessibilityLabel={t("adventures.completed_times", { count: row.finishedCount })}
            >
              <Text fontSize={12} fontWeight="700" color="$resourceGold">
                {row.starsLabel}
              </Text>
            </XStack>
          ) : null}
        </YStack>

        {/* Step track — the campaign's signature. Filled only on the active run. */}
        <XStack px="$4" pt="$3" gap={3} accessibilityLabel={stepProgressLabel ?? row.stepsLabel}>
          {Array.from({ length: item.stepsCount }, (_, i) => (
            <YStack
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length ordinal segments
              key={i}
              flex={1}
              height={4}
              rounded={2}
              bg={progress && i < progress.completedCount ? "$primary" : "$borderStrong"}
            />
          ))}
        </XStack>

        <YStack gap="$2" p="$4">
          {/* Without a cover there is no art to carry it: the title stays in the body. */}
          {row.cover ? null : (
            <Text
              fontFamily="$heading"
              fontWeight="700"
              fontSize={18}
              color="$text"
              numberOfLines={1}
            >
              {row.title}
            </Text>
          )}

          {row.byHero ? (
            <Text fontSize={12} color="$textSecondary" testID="adventure-card-by-you">
              {t("adventures.by_you")}
            </Text>
          ) : null}

          {row.focusLabel ? (
            <Text fontSize={12} fontWeight="700" color="$textSecondary" numberOfLines={1}>
              {row.focusLabel}
            </Text>
          ) : null}

          <Paragraph color="$textSecondary" size="$3" numberOfLines={2}>
            {row.description}
          </Paragraph>

          {item.coverMissing ? (
            // Its preview is of an empty quest: no duration, no XP, and the way to the repair.
            <Text fontSize={13} color="$textSecondary">
              {t("adventures.missing_quest_own")}
            </Text>
          ) : (
            <AdventureFooter meta={metaLabel} xp={row.xpLabel} />
          )}
        </YStack>
      </Card>
    </YStack>
  );
}

// Hoisted so the list doesn't get a fresh function identity on every parent render.
/** "With Bati+" and how many are still behind it, once, above the locked posters. */
type PlusHeaderRow = { plusHeader: true; count: number };
/** "Tes aventures", above the hero's own posters. */
type YoursHeaderRow = { yoursHeader: true };
/** The way to write one: after the hero's own, or after the game's when there are none. */
type WriteRowItem = { writeRow: true };
type GalleryItem = AdventureRow | PlusHeaderRow | YoursHeaderRow | WriteRowItem;

const adventureKey = (item: GalleryItem) =>
  "plusHeader" in item
    ? "plus-header"
    : "yoursHeader" in item
      ? "yours-header"
      : "writeRow" in item
        ? "write-row"
        : String(item.adventure.id);
const itemType = (item: GalleryItem) =>
  "plusHeader" in item || "yoursHeader" in item
    ? "header"
    : "writeRow" in item
      ? "write"
      : "poster";

function YoursHeader() {
  const { t } = useTranslation();
  return (
    <YStack testID="adventures-yours-header" px="$5" pt="$3">
      <Text fontFamily="$heading" fontWeight="700" fontSize={18} color="$text">
        {t("adventures.yours_section")}
      </Text>
    </YStack>
  );
}

function WriteRow({ onWrite }: { onWrite: () => void }) {
  const { t } = useTranslation();
  return (
    <YStack px="$5">
      <AppButton testID="adventures-write" variant="outline" onPress={onWrite}>
        {t("adventures.write")}
      </AppButton>
    </YStack>
  );
}

function PlusHeader({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <YStack testID="adventures-plus-header" px="$5" pt="$3" gap="$1">
      <Text fontFamily="$heading" fontWeight="700" fontSize={18} color="$text">
        {t("adventures.plus_section")}
      </Text>
      <Text color="$textSecondary" fontSize={13}>
        {t("adventures.plus_more", { count })}
      </Text>
    </YStack>
  );
}
const ListGap = () => <YStack height={12} />;

function StatusMessage({
  state,
  onRetry,
  onBrowseQuests,
  onWrite,
}: {
  state: LoadState;
  onRetry: () => void;
  onBrowseQuests: () => void;
  onWrite: () => void;
}) {
  const { t } = useTranslation();

  if (state.status === "error") {
    return (
      <YStack px="$5">
        <Card bg="$surface">
          <YStack gap="$3" items="center" py="$2">
            <Text fontSize={32}>😵</Text>
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("quests.load_error")}
            </Text>
            <Paragraph color="$textSecondary" size="$3" style={{ textAlign: "center" }}>
              {t("errors.generic")}
            </Paragraph>
            <AppButton fullWidth={false} variant="outline" onPress={onRetry}>
              {t("quests.retry")} ↻
            </AppButton>
          </YStack>
        </Card>
      </YStack>
    );
  }

  if (state.status === "loading" && state.adventures.length === 0) {
    // Reserve a poster's height instead of a small "Loading…" card the list jumps from.
    return (
      <YStack px="$5" gap="$3">
        <SkeletonCard>
          <Skeleton height={280} />
        </SkeletonCard>
      </YStack>
    );
  }

  if (state.status !== "loading" && state.adventures.length === 0) {
    return (
      <YStack px="$5">
        <Card bg="$surface">
          <YStack gap="$3" items="center" py="$2">
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("adventures.empty_title")}
            </Text>
            <Paragraph color="$textSecondary" size="$3" style={{ textAlign: "center" }}>
              {t("adventures.empty_subtitle")}
            </Paragraph>
            {/* The hero can write one, and single quests are the way to train meanwhile. */}
            <AppButton fullWidth={false} onPress={onWrite}>
              {t("adventures.write")}
            </AppButton>
            <AppButton fullWidth={false} variant="outline" onPress={onBrowseQuests}>
              {t("quests.gallery_title")}
            </AppButton>
          </YStack>
        </Card>
      </YStack>
    );
  }

  return null;
}

export default function AdventuresGallery() {
  useScreenGuide("guide_adventures");
  useAmbientVisit("menu_visit", { owner: "adventures" });

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const pace = useReminderPace();

  const [state, setState] = useState<LoadState>({
    status: "loading",
    adventures: [],
    previews: new Map(),
    locked: new Set(),
  });
  const [activeProgress, setActiveProgress] = useState<AdventureProgress | null>(null);
  const [finishedCounts, setFinishedCounts] = useState<Map<number, number>>(new Map());
  const [runningIds, setRunningIds] = useState<ReadonlySet<number>>(new Set());

  const load = useCallback(async () => {
    // Only show the loading state on first load — on focus refetches we already have data.
    setState((s) => (s.adventures.length > 0 ? s : { ...s, status: "loading" }));

    // A promise chain rather than `try`: the React Compiler cannot lower a `?.` or a ternary
    // inside one, and skipped this whole screen over it.
    await Promise.all([
      listAdventures(),
      listExercises(),
      getAnyActiveAdventureRun(),
      getFinishedRunCountsByAdventure(),
      getAllQuestConfigs(),
      getRecentSessionHistory(10),
      preferences.getTrainingLevel(),
      lockedAdventures(),
      activeRunAdventureIds(),
    ])
      .then(
        ([
          adventures,
          exercises,
          activeRun,
          finished,
          questConfigs,
          history,
          answer,
          locked,
          running,
        ]) => {
          const progress: AdventureProgress | null = activeRun
            ? {
                adventureId: activeRun.adventureId,
                completedCount: activeRun.activeRun.steps.filter((s) => s.status === "completed")
                  .length,
                currentIndex: activeRun.activeRun.activeStep?.stepIndex ?? 0,
              }
            : null;
          // Same content, same identity: a focus with nothing new re-renders no poster.
          setActiveProgress((previous) => keepIfSame(previous, progress));
          setFinishedCounts((previous) => keepIfSame(previous, finished));
          setRunningIds((previous) => keepIfSame(previous, running));
          const exercisesById = Object.fromEntries(exercises.map((e) => [e.id, e] as const));
          // The cover quests, priced the way each one's own detail screen will price it, in one
          // read for the whole gallery: see `previewQuests`. At the level a campaign would run at,
          // which is the suggestion and not the hero's saved config: the poster said "up to +60 XP
          // per step" over a detail screen quoting +90 for the same step.
          const suggestion = suggestDifficultyFromSessions(history, {
            maxSessions: 10,
            defaultDifficulty: startingDifficulty(answer, history.length),
          });
          return previewQuests(
            adventures.filter((a) => !a.coverMissing).map((a) => a.coverQuest),
            exercisesById,
            questConfigs,
            suggestion.level,
          ).then((previews) => {
            setState((s) => ({
              status: "ready",
              adventures,
              previews: keepIfSame(s.previews, previews),
              locked: keepIfSame(s.locked, locked),
            }));
          });
        },
      )
      .catch((e: unknown) => {
        reportError("adventures.gallery", e);
        setState((s) => ({ ...s, status: "error" }));
      });
  }, []);

  // On focus, not on mount: progression and replay stars must be fresh when the hero
  // comes back from a finished session or campaign.
  useFocusEffect(
    useCallback(() => {
      load().catch(() => {
        // Error already handled
      });
    }, [load]),
  );

  const adventures = state.adventures;
  const previews = state.previews;

  const locked = state.locked;
  const rows = useMemo(() => {
    const build = (a: Adventure) =>
      buildAdventureRow(
        a,
        finishedCounts.get(a.id) ?? 0,
        language,
        t,
        previews.get(a.coverQuestId) ?? EMPTY_PREVIEW,
        pace,
      );
    // Ordered before the rows are built, so the sort reads the adventures themselves rather
    // than the display strings derived from them. Locked ones keep seed order, under a header.
    // Under way first (every run, not only the newest), then the rest in `adventureOrder`.
    // ponytail: the progress chip stays with the newest run only (`getAnyActiveAdventureRun`);
    // per-run progress on each poster is the fix if two runs at once turns out to be common.
    const order = (list: Adventure[]) =>
      adventureOrder(list, activeProgress?.adventureId ?? null, finishedCounts).sort(
        (a, b) => Number(runningIds.has(b.id)) - Number(runningIds.has(a.id)),
      );
    const game = adventures.filter((a) => a.author !== USER_QUEST_AUTHOR);
    // A hero adventure retired on another device stays while a run of it is active here, so that run
    // and its "Laisser la partie" are reachable from somewhere; it leaves when the run ends or is left.
    const own = adventures
      .filter((a) => a.author === USER_QUEST_AUTHOR && (a.isActive === 1 || runningIds.has(a.id)))
      .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
    const rows: GalleryItem[] = order(game.filter((a) => !locked.has(a.id))).map(build);
    if (own.length > 0) rows.push({ yoursHeader: true }, ...order(own).map(build));
    rows.push({ writeRow: true });
    if (locked.size === 0) return rows;
    const header: PlusHeaderRow = { plusHeader: true, count: locked.size };
    return [...rows, header, ...game.filter((a) => locked.has(a.id)).map(build)];
  }, [adventures, locked, finishedCounts, runningIds, language, t, previews, activeProgress, pace]);

  const title = t("adventures.gallery_title");

  const onPressAdventure = (id: number) => router.push(`/adventures/${id}` as never);
  const onWrite = () => router.push("/adventures/edit" as never);

  const renderItem = ({ item }: { item: GalleryItem }) =>
    "plusHeader" in item ? (
      <PlusHeader count={item.count} />
    ) : "yoursHeader" in item ? (
      <YoursHeader />
    ) : "writeRow" in item ? (
      <WriteRow onWrite={onWrite} />
    ) : (
      <AdventureCard
        row={item}
        progress={
          activeProgress && activeProgress.adventureId === item.adventure.id ? activeProgress : null
        }
        onPressAdventure={onPressAdventure}
      />
    );

  return (
    <YStack testID="adventures-screen" flex={1} bg="$background">
      <YStack bg="$background" pt={insets.top + 12} px="$5" pb="$3" gap="$1">
        <XStack items="center" gap="$2">
          <Sparkles size={18} color="$text" strokeWidth={2.5} />
          <Text fontFamily="$heading" fontWeight="700" fontSize={20} color="$text">
            {title}
          </Text>
        </XStack>
        <Text color="$textSecondary" fontSize={13}>
          {t("adventures.gallery_subtitle")}
        </Text>
      </YStack>

      <VillagerLine owner="adventures" />

      <StatusMessage
        state={state}
        onRetry={() => {
          load().catch(() => {
            // Error already handled
          });
        }}
        onBrowseQuests={() => router.push("/quests" as never)}
        onWrite={onWrite}
      />

      {adventures.length > 0 && (
        <LegendList
          data={rows}
          renderItem={renderItem}
          keyExtractor={adventureKey}
          getItemType={itemType}
          ItemSeparatorComponent={ListGap}
          recycleItems
          estimatedItemSize={300}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom:
              Math.max(insets.bottom, Platform.OS === "android" ? ANDROID_MIN_BOTTOM_INSET : 0) +
              30,
          }}
        />
      )}
    </YStack>
  );
}
