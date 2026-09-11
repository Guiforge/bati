import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { getTokens, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { RotateCcw, SlidersHorizontal } from "@/components/icons";
import { OutingGoalSheet } from "@/components/quests/OutingGoalSheet";
import { getQuestThumb } from "@/constants/assetMap";
import { formatDistance } from "@/constants/distanceFormat";
import { getRecentSessionHistory } from "@/db/completed";
import { formatDurationEstimate } from "@/db/estimate";
import { hasOutdoorSlot, outingGoal, withOutingGoal } from "@/db/expeditions";
import { listOutings, type Outing } from "@/db/outings";
import { getQuestConfig, loadConfiguredQuest, saveQuestConfig } from "@/db/questConfig";
import { Difficulty } from "@/db/targets";
import {
  ensureNotificationPermission,
  getPermissionStatus,
  requestPermission,
} from "@/modules/bati-location";
import type { OutingGoal } from "@/src/gps/track";
import { localizedName, localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { useStartQuest } from "./useStartQuest";

const TILE_WIDTH = 94;
const REPLAY_WIDTH = 88;
// 84 on a phone with room, 72 under 700 dp. The row never scrolls away, so on a 360x640 screen the
// 12 dp go back to the scene above it instead.
const TILE_HEIGHT = 84;
const TILE_HEIGHT_SHORT = 72;
const SHORT_SCREEN = 700;

/** What the sheet opens on for a quest with no goal to read: half an hour, its most common answer. */
const FALLBACK_GOAL: OutingGoal = { type: "time", seconds: 30 * 60 };

/**
 * Whether the why has been said in this process.
 *
 * Once per process rather than once for ever, and the same reasoning as
 * `ensureNotificationPermission`: what would make it permanent is a stored flag, and the only
 * thing worth storing about a permission here is precisely what the row refuses to store. The
 * preamble is not an answer, it is an explanation, so the cost of saying it a second time is one
 * sentence, while the cost of a stored "already explained" is a hero who never hears it again
 * after a reinstall of habit. In practice the repeat is near-invisible: the check below means the
 * why is only ever said when the grant is missing, so a hero who granted it hears it exactly once
 * in their life, and a hero who refused hears it again next launch, which is the one case where
 * saying it twice is the right answer.
 */
let whySaid = false;

/**
 * The row's head notice: one sentence, one action, above the tiles.
 *
 * Two things speak there and never at the same time, why Android is about to ask and where the
 * grant lives once it has been refused, so they share one shape rather than starting a second
 * family. Not on a tile: a sentence printed on an 84 dp thumbnail is a sentence nobody reads.
 */
function BandNotice({
  text,
  action,
  onPress,
}: {
  text: string;
  action: string;
  onPress: () => void;
}) {
  return (
    // Polite, never an alert: neither of the two is an error, and both appear under the thumb
    // that just tapped, where a screen reader has to be told something changed.
    <YStack px="$4" gap="$2" pb="$1" accessibilityLiveRegion="polite">
      <Text fontSize={13} color="$textSecondary">
        {text}
      </Text>
      <AppButton
        fullWidth={false}
        variant="outline"
        backgroundColor="$surface2"
        size="$3"
        // Size $3 lands under the 44×44 floor of DESIGN.md:150, and Yoga clamps a height to the
        // larger minimum, so the button keeps its compact type and gains the hit area.
        minH={44}
        fontSize={15}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={action}
      >
        {action}
      </AppButton>
    </YStack>
  );
}

/**
 * Everything Home starts by hand, in one row in the thumb's reach: the ways out, then the last
 * quest again.
 *
 * The ways out are here because Home's suggestion waterfall (`useSmartAction`) cannot reach an
 * expedition: one rule follows the oath's exercise chain, the other the muscles the last thirty
 * days went light on, and an expedition carries no muscles on purpose
 * (drizzle/0041_the_three_ways_out.sql). Deliberately quieter than the stage, art and a name with
 * no filled button, because two commanding actions in one viewport is neither of them commanding.
 *
 * The tile names the *movement*, not the quest: "Course du Messager" says which one is the run,
 * "La Parole Doit Passer" does not.
 *
 * **A tap starts the session**, with the goal written on the tile, so the hero knows what is about
 * to run before running it. The goal chip, or a long press on the tile, opens the same sheet the
 * quest screen uses and saves the answer there: the "Set up" toggle this replaced switched every
 * tile into an invisible mode, and it took five taps to leave with a number.
 */
export function QuickActions() {
  const { t } = useTranslation();
  // The row runs to the physical screen edge: the tile that does not fit is cut by the screen,
  // which reads as "there is more", instead of in mid-air inside a margin. The inset comes back as
  // the scroll's own padding, from the token so it lines up with the stage above.
  const pageInset = getTokens().space.$4.val;
  const { height: screenHeight } = useWindowDimensions();
  const tileHeight = screenHeight < SHORT_SCREEN ? TILE_HEIGHT_SHORT : TILE_HEIGHT;
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const unit = useSettingsStore((s) => s.distanceUnit);
  const status = useSessionStore((s) => s.status);
  const startSession = useSessionStore((s) => s.startSession);
  const startQuest = useStartQuest();
  const [outings, setOutings] = useState<Outing[] | null>(null);
  /** Each way out's goal as it would leave right now, keyed by quest id. */
  const [goals, setGoals] = useState<Record<number, OutingGoal | null>>({});
  /** The last workout, when there is one and it can start from here. */
  const [replay, setReplay] = useState<{ questId: number; title: string } | null>(null);
  /** Double-tap guard, the same one the quest screen keeps for the same reason. */
  const [isStarting, setIsStarting] = useState(false);
  /**
   * A refusal that has just happened, never a refusal that was remembered: a stored one would
   * never learn that the hero granted the permission from Android's settings, and the row would
   * say "denied" for ever. We ask on the tap and answer the answer.
   */
  const [denied, setDenied] = useState(false);
  /** The tile whose why is on screen, waiting for the tap that lets Android ask. */
  const [whyFor, setWhyFor] = useState<number | null>(null);
  /** The way out whose goal sheet is open. */
  const [goalFor, setGoalFor] = useState<number | null>(null);

  const load = useCallback(async () => {
    // Both reads underneath are cached and invalidated on write, so coming back from the editor
    // picks up a hero-authored outing without costing a query on every focus.
    const list = await listOutings();
    setOutings(list);

    // Loaded at `medium`, the level every tile leaves at, so the chip says what the tap will run.
    const entries = await Promise.all(
      list.map(async ({ quest }) => {
        const loaded = await loadConfiguredQuest(quest.id, Difficulty.Medium);
        const goal = loaded ? outingGoal(loaded.quest, loaded.config?.distanceM ?? null) : null;
        return [quest.id, goal] as const;
      }),
    );
    setGoals(Object.fromEntries(entries));

    const last = (await getRecentSessionHistory(1))[0];
    const lastQuest = last?.questId == null ? null : await loadConfiguredQuest(last.questId);
    // A quest that reads the position has a preamble to say first, which this tile has no room for.
    setReplay(
      lastQuest && !hasOutdoorSlot(lastQuest.quest)
        ? { questId: lastQuest.quest.id, title: localizedTitle(lastQuest.quest, language) }
        : null,
    );
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      // Coming back from the session must not leave the row stuck on a tap it already served.
      setIsStarting(false);
      setWhyFor(null);
      setGoalFor(null);
      load().catch((error) => reportError("home.quickActions", error));
    }, [load]),
  );

  const saveGoal = async (questId: number, goal: OutingGoal) => {
    // The hero's saved config as the base, never the one loaded at medium for the chip: that one
    // carries a level the hero did not choose, and writing it back would set it.
    const [saved, loaded] = await Promise.all([
      getQuestConfig(questId),
      loadConfiguredQuest(questId, Difficulty.Medium),
    ]);
    if (!loaded) return;
    await saveQuestConfig(
      questId,
      withOutingGoal(loaded.quest, saved ?? { level: Difficulty.Medium }, goal),
    );
    await load();
  };

  const startOuting = useCallback(
    async (questId: number) => {
      if (isStarting) return;
      // A session that is neither idle nor finished is a live one — an outing paused by the
      // hardware back button still holds its uuid and its points. `startSession` would overwrite
      // it and orphan every fix it had written, so the tap rejoins it instead.
      if (status !== "idle" && status !== "finished") {
        router.push("/session" as never);
        return;
      }

      setIsStarting(true);
      try {
        // Why, before Android's own dialog, and only when there is something to explain.
        // `quests.location_notice` says it on the quest screen, which this door skips: an unprimed
        // system dialog is refused more often, and a final refusal cannot be undone from inside
        // the app. The module answers without prompting, so a hero who granted months ago is
        // never told about a dialog that will not appear, and one who granted from the settings
        // is seen on the very next tap: the same reason a refusal is never persisted.
        const already = await getPermissionStatus();
        if (!whySaid && !already.granted) {
          whySaid = true;
          setDenied(false);
          setWhyFor(questId);
          setIsStarting(false);
          return;
        }
        setWhyFor(null);

        // Position first, then the notification: from API 33 the ongoing notification is the only
        // surface an outing has in a pocket, and bundling the two would let one refusal veto the
        // other. `begin()` asks again and both are idempotent once granted.
        const permission = await requestPermission();
        if (!permission.granted) {
          // No fix means no ground, and a session that measures nothing is not the session this
          // tile promises. Nothing starts, and the row says where the grant lives.
          setDenied(true);
          setIsStarting(false);
          return;
        }
        setDenied(false);
        // Once per process, and `begin()` calls the same helper: a hero who refused here used to
        // get the system dialog again, over a chronometer already counting their walk.
        await ensureNotificationPermission();

        // Loaded at `medium` whatever the quest screen was left on: a level stretches an outing's
        // duration and multiplies its XP, and the hero who taps here has chosen neither.
        const loaded = await loadConfiguredQuest(questId, Difficulty.Medium);
        if (!loaded) {
          setIsStarting(false);
          return;
        }

        // Awaited on purpose: `startSession` loads the boss fight and the warm-up preference
        // before it populates the store, and the session screen redirects home on an empty one.
        // The goal is the one on the chip: the hero's own when they set one, otherwise the slot's
        // duration, which is what "no number on it" has always meant here.
        await startSession(loaded.quest, loaded.level, {
          goal: outingGoal(loaded.quest, loaded.config?.distanceM ?? null),
        });
        router.push("/session" as never);
      } catch (error) {
        setIsStarting(false);
        reportError("home.startOuting", error);
      }
    },
    [isStarting, status, router, startSession],
  );

  if (outings === null) {
    // Reserve the row rather than guess at its contents: a placeholder tile would claim there is
    // a way out before the read says there is one.
    return <YStack height={tileHeight + 44} />;
  }

  if (outings.length === 0 && replay === null) return null;

  const goalLabel = (goal: OutingGoal | null) =>
    goal === null
      ? t("home.goal_free", "Free")
      : goal.type === "distance"
        ? formatDistance(goal.metres, unit)
        : formatDurationEstimate(goal.seconds);

  return (
    <YStack pt="$2.5" pb="$2" gap="$2">
      <XStack px="$4" items="baseline" justify="space-between" gap="$3">
        <Text fontSize={10} fontWeight="700" letterSpacing={1.8} color="$textSecondary">
          {t("home.quick_actions", "Quick actions").toUpperCase()}
        </Text>
        <Text flex={1} text="right" fontSize={10} color="$textSecondary" numberOfLines={1}>
          {t("home.quick_hint", "Long-press to set")}
        </Text>
      </XStack>

      {/* One slot, one occupant: the why is a question still open, so it holds the strip until it
          is answered, and the dead end only speaks once there is one. */}
      {whyFor !== null ? (
        <BandNotice
          text={t("session.expedition_permission_why")}
          action={t("common.continue")}
          onPress={() => {
            startOuting(whyFor).catch((error) => reportError("home.startOuting", error));
          }}
        />
      ) : null}

      {denied && whyFor === null ? (
        <BandNotice
          text={t("session.expedition_status_denied")}
          action={t("session.expedition_open_settings")}
          onPress={() => {
            Linking.openSettings().catch((e: unknown) => reportError("home.openSettings", e));
          }}
        />
      ) : null}

      {/* Horizontal rather than a row of equal columns: the seeded three are not a promise. A hero
          who writes their own outing adds a fourth, and a fixed-width tile that scrolls survives
          that where flexed columns quietly squeeze. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // The goal sheet's field raises a keyboard over this row; its first tap is a tile's.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8, paddingHorizontal: pageInset }}
      >
        {outings.map(({ quest, exercise }) => {
          const name = localizedName(exercise, language);
          const goal = goals[quest.id] ?? null;
          const label = goalLabel(goal);
          return (
            <YStack
              key={quest.id}
              width={TILE_WIDTH}
              height={tileHeight}
              bg="$surface"
              borderWidth={1}
              borderColor="$borderStrong"
              rounded={12}
              overflow="hidden"
              onPress={() => {
                startOuting(quest.id).catch((error) => reportError("home.startOuting", error));
              }}
              onLongPress={() => setGoalFor(quest.id)}
              pressStyle={{ opacity: 0.85, scale: 0.98 }}
              accessibilityRole="button"
              accessibilityLabel={t("home.outside_start_a11y", { quest: name, defaultValue: name })}
            >
              {/* The quest's cover, dimmed to texture: at this size no art distinguishes anything,
                  the name carries the meaning. */}
              <Image
                source={getQuestThumb(quest.imagePath)}
                style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
                contentFit="cover"
                transition={200}
              />
              {/* $bgDark (#0B0F19) as rgba - LinearGradient takes plain colors, not tokens. */}
              <LinearGradient
                colors={["rgba(11,15,25,0.1)", "rgba(11,15,25,0.92)"]}
                style={StyleSheet.absoluteFill}
              />
              <YStack flex={1} justify="flex-end" p="$2" gap={4}>
                <Text
                  fontSize={11}
                  fontWeight="700"
                  color="$text"
                  numberOfLines={2}
                  lineHeight={14}
                >
                  {name}
                </Text>
                {/* The goal, and the way to change it: 20 dp tall, 44 with its slop. */}
                <XStack
                  self="flex-start"
                  height={20}
                  px={7}
                  gap={4}
                  items="center"
                  rounded={10}
                  bg="$primaryGlow"
                  borderWidth={1}
                  borderColor="$primaryText"
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  onPress={() => setGoalFor(quest.id)}
                  pressStyle={{ opacity: 0.7 }}
                  accessibilityRole="button"
                  accessibilityLabel={t("home.goal_a11y", { quest: name, goal: label })}
                >
                  <SlidersHorizontal size={10} color="$text" />
                  <Text fontSize={10} fontWeight="700" color="$text">
                    {label}
                  </Text>
                </XStack>
              </YStack>
            </YStack>
          );
        })}

        {replay ? (
          <YStack
            testID="home-replay"
            width={REPLAY_WIDTH}
            height={tileHeight}
            p="$2"
            gap={3}
            justify="flex-end"
            bg="$surface"
            borderWidth={1}
            borderColor="$borderStrong"
            rounded={12}
            onPress={() => {
              startQuest(replay.questId).catch((error) => reportError("home.replay", error));
            }}
            pressStyle={{ opacity: 0.85, scale: 0.98 }}
            accessibilityRole="button"
            accessibilityLabel={t("home.replay_a11y", { quest: replay.title })}
          >
            <RotateCcw size={16} color="$primaryText" />
            <Text fontSize={10} fontWeight="700" color="$textSecondary">
              {t("home.replay", "Replay")}
            </Text>
            <Text fontSize={11} fontWeight="700" color="$text" numberOfLines={1}>
              {replay.title}
            </Text>
          </YStack>
        ) : null}
      </ScrollView>

      {/* Mounted on open, so the sheet's own initialiser is its reset. */}
      {goalFor !== null ? (
        <OutingGoalSheet
          open
          onOpenChange={(open) => {
            if (!open) setGoalFor(null);
          }}
          goal={goals[goalFor] ?? FALLBACK_GOAL}
          unit={unit}
          onPick={(goal) => {
            saveGoal(goalFor, goal).catch((error) => reportError("home.saveGoal", error));
          }}
        />
      ) : null}
    </YStack>
  );
}
