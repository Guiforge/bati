import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, XStack, YStack } from "tamagui";
import { NarrativeModal } from "@/components/adventures/NarrativeModal";
import { VillagerLine } from "@/components/chorus/VillagerLine";
import { AppButton } from "@/components/common/AppButton";
import { AppText } from "@/components/common/AppText";
import { Card } from "@/components/common/Card";
import { GameIcon } from "@/components/common/GameIcon";
import { ImageViewer } from "@/components/common/ImageViewer";
import { InkGauge } from "@/components/common/InkGauge";
import { Recitatif } from "@/components/common/Recitatif";
import { useToast } from "@/components/common/Toast";
import { ChevronRight } from "@/components/icons";
import { SessionNotebook } from "@/components/journal/SessionNotebook";
import { useConfirmForget } from "@/components/journal/useConfirmForget";
import { ShareButton } from "@/components/share/ShareButton";
import { getBossAsset, getQuestAsset } from "@/constants/assetMap";
import { bossDisplayName } from "@/constants/bosses";
import { getQuestColorTokensFromQuest } from "@/constants/exerciseColors";
import { LEVEL_CARD_HEIGHT } from "@/constants/layout";
import { fade, rawColors } from "@/constants/rawColors";
import { getAdventureStepOutroNarrative } from "@/db/adventures-narrative";
import {
  UNTRACED_PAID_SECONDS_PER_DAY,
  updateSessionFeedback,
  updateSessionNotes,
} from "@/db/completed";
import { type Crest, getCrest } from "@/db/crest";
import { COAT_RARE_KEY } from "@/db/crestEvents";
import { countsAsDeed } from "@/db/deed";
import { formatDuration, formatDurationEstimate } from "@/db/estimate";
import { isOutingSession } from "@/db/expeditions";
import { preferences } from "@/db/preferences";
import { createQuestFromOuting } from "@/db/quests";
import type { FeedbackCode } from "@/db/schema";
import { formatCount } from "@/db/targets";
import { calculateLevelFromXp, getLevelTitle, getXpForLevel } from "@/db/userLevel";
import { useFontScaled } from "@/hooks/useFontScaled";
import { useHaptics } from "@/hooks/useHaptics";
import { formatTime } from "@/hooks/useSessionTimer";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useChorusStore } from "@/stores/chorus";
import { isExpedition } from "@/stores/expedition";
import { recordedDurationSeconds, type SaveResult, useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";
import { goOn, seeVillage } from "./destinations";
import { ExpeditionSummary } from "./ExpeditionSummary";
import { type Feast, feastKey, tonight } from "./feasts";
import { NextMilestone } from "./NextMilestone";
import { ProgressionChart } from "./ProgressionChart";
import { TonightList } from "./TonightList";

/** The big feasts that are a card when another one holds the screen, and are marked seen as such. */
const RELEGATED_KINDS: Feast["kind"][] = ["legendary", "age", "anniversary"];

/**
 * Under this, the session is asked about rather than saved.
 *
 * A time-based set records `Math.max(1, elapsedSeconds)` and ends whenever the hero taps done,
 * so starting an expedition and stopping after five seconds writes a real `completed_sessions`
 * row — one that counts toward the streak and toward `weekly_sessions`, the eight-week oath.
 * The hole is not new (a strength quest can be saved after one rep and a run of skips), but an
 * expedition makes it a single accidental tap: go out, change your mind, and the week is
 * credited.
 *
 * This does not try to police intent. It is an offline single-player app; a hero determined to
 * cheat their own oath will, and nothing here should pretend otherwise. What it catches is the
 * accident, and it catches it the way a sports watch does — by asking, because the hero is the
 * only one who knows whether those ninety seconds were the whole outing or a false start.
 *
 * Deliberately about the clock and nothing else. A rule that reasoned about reps would need one
 * definition per style, and two definitions of "did this count" is the drift this codebase
 * already spends a lot of comments avoiding.
 */
const TRIVIAL_SESSION_SECONDS = 120;

/**
 * The villager's slot at the top of the hero banner. 88 dp holds a name row and three lines of
 * text, padding included, at font scale 1 (the longest event line, 140 characters, fits in three
 * at this width); it grows with the system font scale, or the third line is cut mid-glyph at 1.3.
 * Anything longer is clamped rather than allowed to move the screen or reach the title below.
 */
const VILLAGER_SLOT_TOP = 12;
const VILLAGER_SLOT_HEIGHT = 88;

/**
 * The hero's own gauge, filling from where the session found it to where it left it (from empty
 * when the session crossed a level). It is the one number that makes "come back tomorrow" legible,
 * and it only ever moved on Home, outside the celebration (2026-08 audit, section 06-B). Same
 * visual language as the home header: gold on a dark track.
 */
function HeroLevelBar({
  heroXp,
  language,
}: {
  /** `null` until the save lands: a loading reward asserts nothing, so the card is not mounted. */
  heroXp: { before: number; after: number } | null;
  language: AppLanguage;
}) {
  return heroXp ? (
    <FilledLevelBar before={heroXp.before} after={heroXp.after} language={language} />
  ) : (
    <YStack
      testID="victory-level-spacer"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      width="100%"
      maxW={520}
      height={LEVEL_CARD_HEIGHT}
    />
  );
}

function FilledLevelBar({
  before,
  after,
  language,
}: {
  before: number;
  after: number;
  language: AppLanguage;
}) {
  const { t } = useTranslation();
  const level = calculateLevelFromXp(after);
  const base = getXpForLevel(level);
  const span = Math.max(1, getXpForLevel(level + 1) - base);
  const progress = Math.min(1, (after - base) / span);
  // Where the sweep starts: the hero's progress before the session, or the bottom of the level
  // when the session crossed it, so the sweep from zero *is* the level-up.
  const from = before >= base ? Math.min(progress, (before - base) / span) : 0;
  const title = getLevelTitle(level)[language];

  return (
    <Card
      width="100%"
      maxW={520}
      minH={LEVEL_CARD_HEIGHT}
      bg="$surface"
      borderColor="$glassBorder"
      gap="$2"
      py="$2"
    >
      <XStack items="center" justify="space-between">
        <AppText fontFamily="$body" fontWeight="700" fontSize={14} color="$text">
          {t("home.level_line", {
            level,
            title,
          })}
        </AppText>
        <AppText fontFamily="$body" fontWeight="700" fontSize={12} color="$resourceGold">
          {t("journal.xp_progress", {
            current: formatCount(language, after - base),
            next: formatCount(language, span),
          })}
        </AppText>
      </XStack>
      <InkGauge
        testIDPrefix="victory-level"
        progress={progress}
        fill="$resourceGold"
        track="$gold800"
        from={from}
      />
    </Card>
  );
}

/** Writes the open note editor's text once, whichever road off the screen gets there first. */
async function saveNoteDraft(draft: { current: string }, sessionId: number) {
  const text = draft.current;
  draft.current = "";
  if (text.trim()) await updateSessionNotes(sessionId, text);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Post-workout summary screen (save, reveal, feedback, actions)
export function VictoryView() {
  const { t } = useTranslation();
  const router = useRouter();
  const { confirmForget, dialog: forgetDialog } = useConfirmForget();
  const insets = useSafeAreaInsets();
  const villagerSlot = useFontScaled(VILLAGER_SLOT_HEIGHT);
  const language = useSettingsStore((s) => s.language);
  const villageName = useUserStore((s) => s.villageName);
  const { success, selection } = useHaptics();
  const { showError } = useToast();
  // Field by field: the whole store re-rendered this screen on every write, and `saveSession`
  // writes several while it holds the thread.
  const quest = useSessionStore((s) => s.quest);
  const startTime = useSessionStore((s) => s.startTime);
  const saveSession = useSessionStore((s) => s.saveSession);
  const quitSession = useSessionStore((s) => s.quitSession);
  const adventureRunStepId = useSessionStore((s) => s.adventureRunStepId);
  const bossFight = useSessionStore((s) => s.bossFight);
  const bossStartHp = useSessionStore((s) => s.bossStartHp);
  const felledByFinalBlow = useSessionStore((s) => s.felledByFinalBlow);
  const sessionUuid = useSessionStore((s) => s.sessionUuid);
  const goal = useSessionStore((s) => s.goal);
  const [bossExpanded, setBossExpanded] = useState(false);
  // "Voir tout": the milestone, the chart and the forget link, mounted only once asked for.
  const [expanded, setExpanded] = useState(false);
  const [noting, setNoting] = useState(false);
  const cue = useChorusStore((s) => s.cue);

  const [result, setResult] = useState<SaveResult | null>(null);
  const [saveError, setSaveError] = useState(false);
  /** Null until a short session is decided; the auto-save waits on it. */
  const [keepShort, setKeepShort] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<FeedbackCode | null>(null);
  const [outroNarrative, setOutroNarrative] = useState<string | null>(null);
  const [showOutroNarrative, setShowOutroNarrative] = useState(false);
  /** The outro lookup came back (with text or without): until then, "no outro" is not known. */
  const [outroSettled, setOutroSettled] = useState(false);
  const savedRef = useRef(false);
  const feedbackTouched = useRef(false);
  // What the open note editor holds: Continue is the only way on, and it must not drop it.
  const noteDraft = useRef("");
  // Continue is not the only road off this screen: the system back pops it too, and the draft
  // would go with it. Every exit unmounts the view, so the unmount saves what Continue did not.
  const savedSessionId = result?.sessionId;
  useEffect(
    () => () => {
      if (savedSessionId === undefined) return;
      saveNoteDraft(noteDraft, savedSessionId).catch((e: unknown) =>
        reportError("victory.note", e),
      );
    },
    [savedSessionId],
  );
  /** The bridge, once crossed: the button goes, the sentence stays. */
  const [madeQuest, setMadeQuest] = useState(false);
  // A ref rather than `madeQuest` alone: two taps land in the same frame, before any state the
  // first one sets has come back, and the hero would find two identical quests in their gallery.
  const makingQuest = useRef(false);
  // Same for Continue: it awaits the note write, and a second tap in that window pushed the next
  // page twice.
  const leaving = useRef(false);

  // Defeated *today*, not defeated ever. `currentHp <= 0` alone is true for every remaining
  // session of the campaign, so the sword, the boss copy and the 120-particle burst replayed on
  // each one. `bossStartHp` is what the session opened on: it is only positive on the session that
  // did the killing.
  const isBossDefeat = Boolean(
    bossStartHp != null && bossStartHp > 0 && (bossFight?.currentHp ?? 1) <= 0,
  );
  /** The monster this session felled, when it did — what the hero card shows instead of the quest. */
  const felledBoss = isBossDefeat ? bossFight : null;

  // What tonight says, sorted once the save has landed. Nothing before it: a loading screen
  // asserts nothing, and a retried save reaches here with the same facts.
  const feasts = result
    ? tonight(
        result,
        felledBoss
          ? {
              name: bossDisplayName(felledBoss, language),
              finalBlow: felledByFinalBlow,
              own: !countsAsDeed(felledBoss),
            }
          : null,
      )
    : [];
  // The reveal is marked as seen only when it was shown here, as a card (the night of an
  // epilogue). As the large feast it is marked when its full screen opens, which comes later.
  // The one that opens full screen after "Continue". Once it has opened, "Tonight" stops
  // announcing it (the phone has shown it).
  const bigFeast = feasts.find((f) => f.size === "large");
  const [feastOpened, setFeastOpened] = useState(false);
  // Read only for the reveal line of Tonight, which draws the same shield as the big feast.
  // Undefined until read: Tonight keeps the place and draws no shield before it knows the border.
  const [crest, setCrest] = useState<Crest | null | undefined>(undefined);
  const revealing = result?.crestReveal != null;
  useEffect(() => {
    if (!revealing) return;
    getCrest()
      .then(setCrest)
      .catch((e) => {
        setCrest(null); // read failed: the shield of the sessions, without a border
        reportError("victory.crest", e);
      });
  }, [revealing]);
  const revealShownAsCard = feasts.some((f) => f.kind === "reveal" && f.size !== "large");

  // What the journal is about to record, not the raw clock. They are different numbers for an
  // outing — `sessionClock` clamps a walk to its moving time plus twenty minutes of red lights —
  // and this screen showed 52 min for the session the next screen filed as 32.
  // Read once, when the screen opens: this is the session's final duration, and a value that
  // recomputed per render would tick upward under the hero while they read it.
  const [durationSeconds] = useState(recordedDurationSeconds);

  // Save once on mount, then reveal the real results. No preview, no two-tap flow. The retry below
  // is safe: `ensureSessionRow` makes `saveSession` idempotent.
  const runSave = useCallback(async () => {
    setSaveError(false);
    try {
      const r = await saveSession(null);
      setResult(r);
      success();
    } catch {
      setSaveError(true);
      showError(t("errors.save_session_failed"));
    }
  }, [saveSession, success, showError, t]);

  const tooShort = durationSeconds < TRIVIAL_SESSION_SECONDS && keepShort !== true;

  // System back on the question is not an answer: it used to pop the screen and drop the session
  // unsaved without a word. The question stays up, and Keep or Discard are the only ways out.
  useEffect(() => {
    if (!tooShort) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, [tooShort]);

  useEffect(() => {
    if (savedRef.current || tooShort) return;
    savedRef.current = true;
    runSave().catch((e) => reportError("session.save", e));
  }, [runSave, tooShort]);

  // The feeling buttons are inactive until the save lands (they are `disabled` below), because
  // persisting a feeling needs a session id that only exists once `result` does. The effect is
  // still keyed on both, so a feeling set at any time takes the one path.
  // One villager per victory, chosen here rather than by competing effects: these are all `event`
  // priority, so firing two would just mean the second silently overwrote the first and which one
  // you saw depended on effect ordering. A record is not cued at all: "Tonight" lists it, and a
  // fact is said once on this screen.
  useEffect(() => {
    if (!result) return;
    if (isBossDefeat) {
      cue("boss_defeated");
      return;
    }

    /**
     * The road, before the workshop's records.
     *
     * Three signals the session already carries, ordered by rarity. A first outing and the High
     * Road's first level land together, because `ROAD_FLOORS` starts at one league, so the rarer
     * of the two speaks. The Watcher owns all three: he has the tower and the road already, and
     * before this the village encashed every league without a word about any of them.
     */
    const outing = result.newRecords.find((r) => r.recordType === "longest_outing");
    if (outing && outing.previousValue == null) {
      cue("first_outing");
      return;
    }
    if (result.villageGrowth.some((g) => g.code === "high_road")) {
      cue("high_road");
      return;
    }
    if (outing) {
      cue("longest_outing");
      return;
    }
  }, [result, isBossDefeat, cue]);

  // The rare coat's card has no screen of its own: showing it here is what marks it.
  const coatShown = feasts.some((f) => f.kind === "coat");
  useEffect(() => {
    if (!coatShown) return;
    preferences
      .markBigFeastShown(COAT_RARE_KEY)
      .catch((e) => reportError("session.markCoatShown", e));
  }, [coatShown]);

  // A legendary feast, an Age or an anniversary relegated to a card is shown here, so it is marked
  // like the reveal and the coat: it must not reopen full screen tomorrow. Keys joined, so the
  // effect depends on a string.
  const relegatedCards = feasts
    .filter((f) => RELEGATED_KINDS.includes(f.kind) && f.size !== "large")
    .map(feastKey)
    .join(",");
  useEffect(() => {
    for (const key of relegatedCards.split(",").filter(Boolean))
      preferences.markBigFeastShown(key).catch((e) => reportError("session.markFeastShown", e));
  }, [relegatedCards]);

  useEffect(() => {
    if (!revealShownAsCard) return;
    preferences.markBigFeastShown("reveal").catch((e) => reportError("session.markRevealShown", e));
  }, [revealShownAsCard]);

  useEffect(() => {
    if (!result || !feedbackTouched.current) return;
    updateSessionFeedback(result.sessionId, feedback).catch(() => {
      // A feeling that fails to save is not worth interrupting the victory screen for.
    });
  }, [result, feedback]);

  useEffect(() => {
    if (!adventureRunStepId) {
      setOutroSettled(true);
      return;
    }
    setOutroSettled(false);
    getAdventureStepOutroNarrative(adventureRunStepId, language)
      .then((text) => {
        if (text) {
          setOutroNarrative(text);
          setShowOutroNarrative(true);
        }
      })
      .catch((error) => {
        // No outro is a fine victory; an unhandled rejection mid-save is not.
        reportError("session.outroNarrative", error);
      })
      .finally(() => setOutroSettled(true));
  }, [adventureRunStepId, language]);

  if (!quest || !startTime) return null;

  const questTitle = localizedTitle(quest, language);
  const heroTitle = felledBoss != null ? bossDisplayName(felledBoss, language) : questTitle;
  const { bg: questBg } = getQuestColorTokensFromQuest(quest);

  /**
   * The partant who just walked for 32 minutes without asking for anything is offered the same
   * walk again, as a quest. Nothing navigates: the hero is reading their recap, and they came
   * here to read it.
   */
  const handleMakeQuest = async () => {
    if (makingQuest.current) return;
    makingQuest.current = true;
    selection();
    try {
      await createQuestFromOuting(quest, durationSeconds);
      setMadeQuest(true);
    } catch (e) {
      makingQuest.current = false;
      reportError("session.makeQuestFromOuting", e);
      showError(t("errors.generic"));
    }
  };

  const handleFeedbackSelect = (value: FeedbackCode) => {
    selection();
    feedbackTouched.current = true;
    const next = feedback === value ? null : value;
    setFeedback(next);
  };

  const handleViewVillage = () => {
    if (!result) return;
    seeVillage(router, result);
  };

  // Like the village: a look at the rules, and the hero comes back to the same screen.
  const handleViewXpRules = () => router.push("/xp");

  const handleForget = () => {
    if (!result) return;
    confirmForget(result.sessionId, () => {
      quitSession();
      router.dismissTo("/");
    });
  };

  const handleContinue = async () => {
    if (!result || leaving.current) return;
    leaving.current = true;
    await saveNoteDraft(noteDraft, result.sessionId).catch((e: unknown) =>
      reportError("victory.note", e),
    );
    // One big feast a night. It opens over this screen and ends on `goOn`'s road itself (its
    // button, or the back gesture), so nothing is quit before it closes.
    if (bigFeast && !feastOpened) {
      setFeastOpened(true);
      router.push("/big-feast" as never);
      leaving.current = false;
      return;
    }
    goOn(router, result);
  };

  return (
    <YStack flex={1} bg="$background" pt={insets.top + 12}>
      {/* The window does not resize under the keyboard here, so without this the note editor and
          its buttons sat under it. Same pairing as the Journal detail. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            // The sticky action row's own band. Nothing floats over this screen: the villager is a
            // line inside the hero banner (VillagerLine), so there is nothing else to clear.
            paddingBottom: insets.bottom + 96,
            alignItems: "center",
            gap: 12,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero: the moment's own image with the title laid over it. A boss kill is the app's
            climax, so its card is the *monster* — named, felled, gold-rimmed — not the poster of
            the quest that happened to land the blow. */}
          <Card
            bg={questBg}
            width="100%"
            maxW={520}
            p={0}
            overflow="hidden"
            borderWidth={1.5}
            borderColor="$borderStrong"
            {...(isBossDefeat ? { borderWidth: 2, borderColor: "$resourceGold" } : null)}
          >
            {/* The ratio follows the source, because this slot serves two of them: a felled boss is
              1024x1024 and a quest cover is 1024x768. One fixed 16:9 box cut 22% off each end of
              the boss — the monster you just beat, shown with its head and its feet removed — and
              11% off the quest. Neither loses anything now. */}
            <YStack width="100%" aspectRatio={felledBoss ? 1 : 4 / 3} bg="$surface2">
              <Image
                source={
                  felledBoss
                    ? getBossAsset(felledBoss.imagePath, felledBoss.tier, "defeated")
                    : getQuestAsset(quest.imagePath)
                }
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
                accessible={false}
              />
              <LinearGradient
                colors={["transparent", fade(rawColors.bgDark, 0.55), fade(rawColors.bgDark, 0.95)]}
                style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0 }}
              />
              {/* The villager's line, top of the banner beside the trophy. Its slot is here from the
                first frame, villager or not, at a fixed height: the cue fires after the save, and
                a line that arrived with it would move things under the finger. Up here an empty
                slot is just artwork, where under the title it read as dead space. */}
              <YStack position="absolute" t={VILLAGER_SLOT_TOP} l={64} r="$3">
                <VillagerLine owner="victory" reserve={villagerSlot} />
              </YStack>
              <YStack position="absolute" t="$3" l="$3">
                <GameIcon
                  name={isBossDefeat ? "sword" : "trophy"}
                  size={40}
                  color="$resourceGold"
                />
              </YStack>
              <YStack position="absolute" b={0} l={0} r={0} p="$4" gap="$1">
                {/* The kicker and the title are one unit: the kicker announces a reward, gold, directly
                  over the cartouche. A felled boss has none: "Tonight" carries that fact as a card,
                  and a fact is said once. */}
                <YStack gap={2} self="flex-start">
                  {!isBossDefeat && (
                    <AppText
                      testID="victory-kicker"
                      fontFamily="$body"
                      fontWeight="700"
                      color="$resourceGold"
                      fontSize={13}
                      letterSpacing={2}
                    >
                      {t("session.victory_title").toUpperCase()}
                    </AppText>
                  )}
                  <Recitatif>{heroTitle}</Recitatif>
                </YStack>
              </YStack>
              {/* What opens the felled boss: the banner below the villager's slot, never the slot.
                The whole card used to be the button, so a tap on the line opened the boss and
                TalkBack met a focusable line inside a focusable card. */}
              {felledBoss != null && (
                <Pressable
                  testID="victory-boss-open"
                  onPress={() => setBossExpanded(true)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={heroTitle}
                  style={{
                    position: "absolute",
                    top: VILLAGER_SLOT_TOP + villagerSlot,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                />
              )}
            </YStack>
          </Card>

          {felledBoss != null && (
            <ImageViewer
              source={getBossAsset(felledBoss.imagePath, felledBoss.tier, "defeated")}
              name={heroTitle}
              visible={bossExpanded}
              onClose={() => setBossExpanded(false)}
            />
          )}

          {/* What the walk was worth. Held until the save lands for the same reason the rewards
            are: the leagues it reports are the ones `saveSession` has just credited. Rendered
            before the stat row (rather than at the bottom, with the rewards) so it is in view
            without scrolling past the stat tiles. */}
          {!!result && isExpedition(quest) && (
            <ExpeditionSummary
              sessionUuid={sessionUuid}
              sessionId={result.sessionId}
              language={language}
            />
          )}

          {/* The bridge (docs/designs/outing-doors.md, T17). Only after a *free* outing: a walk
            that already had a goal is a quest the hero has, and one with an indoor slot is not
            an outing at all. Held until the save lands, like everything else on this screen. */}
          {!!result && goal === null && isOutingSession(quest) && (
            <YStack width="100%" maxW={520} items="center">
              {madeQuest ? (
                <AppText
                  testID="victory-made-quest"
                  fontFamily="$body"
                  color="$textSecondary"
                  fontSize={14}
                  style={{ textAlign: "center" }}
                >
                  {t("session.expedition_made_quest")}
                </AppText>
              ) : (
                <AppButton
                  testID="victory-make-quest"
                  backgroundColor="$surface2"
                  height={48}
                  onPress={handleMakeQuest}
                >
                  <AppText color="$text" fontSize={16} fontWeight="700">
                    {t("session.expedition_make_quest")}
                  </AppText>
                </AppButton>
              )}
            </YStack>
          )}

          {/* Stat row: Time · XP */}
          {!tooShort && (
            <XStack testID="victory-stat-row" width="100%" maxW={520} gap="$3">
              <Card
                flex={1}
                bg="$surface"
                borderColor="$glassBorder"
                items="center"
                gap="$1"
                py="$2"
              >
                <AppText fontFamily="$body" fontWeight="700" fontSize={13} color="$textSecondary">
                  {t("session.total_time")}
                </AppText>
                <AppText
                  variant="display"
                  fontWeight="700"
                  fontSize={26}
                  lineHeight={32}
                  color="$text"
                  fontFamily="$body"
                >
                  {result ? formatTime(durationSeconds) : "\u00A0"}
                </AppText>
                {/* The wait for the sky and the red lights are in the total (D-58); the moving time is
                  what XP is paid in, said once the two differ by a minute. */}
                {result?.outing?.measured && durationSeconds - result.outing.seconds >= 60 ? (
                  <AppText fontSize={11} color="$textSecondary">
                    {t("session.total_time_moving", {
                      moving: formatTime(result.outing.seconds),
                    })}
                  </AppText>
                ) : null}
              </Card>
              <Card
                testID="victory-xp-rules"
                flex={1}
                bg="$surface"
                borderColor="$glassBorder"
                items="center"
                gap="$1"
                py="$2"
                // Not while saving: a card that answers a press and goes nowhere reads as broken.
                onPress={result ? handleViewXpRules : undefined}
                accessibilityRole="link"
              >
                <AppText fontFamily="$body" fontWeight="700" fontSize={13} color="$textSecondary">
                  {t("session.xp_earned")}
                </AppText>
                {/* In the corner, out of the label's row: beside it, the chevron took the width a
                long label needs, and at 130 % Russian broke "Заработано" in the middle. */}
                <YStack position="absolute" t={6} r={4}>
                  <ChevronRight size={16} color="$textSecondary" />
                </YStack>
                {/* The testID only exists once the session is banked: Continue is on screen, and
                disabled, for the whole save, so it cannot tell an E2E flow when to tap it. */}
                <AppText
                  variant="display"
                  testID={result ? "session-victory-xp" : undefined}
                  accessibilityElementsHidden={!result}
                  importantForAccessibility={result ? "auto" : "no"}
                  fontWeight="700"
                  fontSize={26}
                  lineHeight={32}
                  color="$resourceGold"
                  fontFamily="$body"
                >
                  {result
                    ? t("quests.reward_xp", { count: formatCount(language, result.xpEarned) })
                    : // Same line height, no glyph: a loading reward asserts nothing.
                      "\u00A0"}
                </AppText>
                {/* The rate, said out loud. A hero who walks an hour and reads "+300" has no way to
                know why, and a number with no rule behind it is the thing the research calls
                controlling rather than informative. This is the rule, in the hero's own numbers. */}
                {result?.outing ? (
                  <AppText fontWeight="700" fontSize={11} color="$textSecondary">
                    {/* No trace measured nothing moving: the clock is all the card may claim. */}
                    {result.outing.measured
                      ? t("session.xp_outing_rate", {
                          // The clock the time card prints beside it, not a rounded "2 min" that disagreed.
                          moving: formatTime(result.outing.seconds),
                          effort: formatDurationEstimate(result.outing.effortSeconds, language),
                        })
                      : result.outing.seconds === 0 && result.outing.clockSeconds > 0
                        ? // The day's allowance for time nothing witnessed is spent: say so, where
                          // a bare "+0 XP" would read as a fault.
                          t("session.xp_outing_capped", {
                            hours: UNTRACED_PAID_SECONDS_PER_DAY / 3600,
                          })
                        : t("session.xp_outing_rate_timed", {
                            time: formatTime(result.outing.clockSeconds),
                            effort: formatDurationEstimate(result.outing.effortSeconds, language),
                          })}
                  </AppText>
                ) : null}
                {!!result?.overshootXp && (
                  <AppText
                    fontWeight="700"
                    fontSize={11}
                    color="$success"
                    text="center"
                    fontFamily="$body"
                  >
                    {t("session.xp_overshoot", {
                      count: formatCount(language, result.overshootXp),
                    })}
                  </AppText>
                )}
              </Card>
            </XStack>
          )}

          {/* The hero's level bar, filling with this session's XP */}
          {/* A spacer of the card's height holds its place until the save lands: the card itself
            mounts only with data, and must not push the feel buttons from under the finger. */}
          {/* Held for the hero's answer: the question takes the level card's slot, above the fold,
            and no reward is drawn for a session that may be discarded. */}
          {tooShort ? (
            <YStack width="100%" maxW={520} items="center" gap="$3" py="$4">
              <AppText color="$text" fontSize={18} fontWeight="700">
                {t("session.summary_too_short_title")}
              </AppText>
              <AppText color="$textSecondary" fontSize={14} style={{ textAlign: "center" }}>
                {/* A walk is not held, it is walked. The shared line says "you held out for", the
                  verb of a plank, which reads as faint praise after ninety seconds outdoors. */}
                {t(
                  isOutingSession(quest)
                    ? "session.summary_too_short_body_outing"
                    : "session.summary_too_short_body",
                  { duration: formatDuration(durationSeconds, language) },
                )}
              </AppText>
              <AppButton
                variant="outline"
                borderColor="$error"
                onPress={() => {
                  // Discard is the existing quit path: nothing was written, so there is nothing
                  // to undo, and the session state has to be cleared either way. Home rather than
                  // back, because back from here is the session that just ended.
                  quitSession();
                  router.dismissTo("/");
                }}
              >
                {t("session.summary_too_short_discard")}
              </AppButton>
            </YStack>
          ) : (
            <HeroLevelBar heroXp={result ? result.heroXp : null} language={language} />
          )}

          {/* "Tonight": what the save changed. It arrives with the save and says nothing before it,
            nothing at all on a night where nothing rose. "See your village" only when it grew. */}
          {!!result && (
            <TonightList
              feasts={feastOpened ? feasts.filter((f) => f !== bigFeast) : feasts}
              villageName={villageName}
              crest={crest}
              epilogue={result.campaign?.isFinished === true && outroSettled && !outroNarrative}
              onViewVillage={
                result.tierUp || result.villageGrowth.length > 0 ? handleViewVillage : undefined
              }
            />
          )}

          {/* Feedback — above the fold: this answer is what steers the next
            session's difficulty, and below the fold a hurried hero never saw it (audit §06-B). */}
          <Card width="100%" maxW={520} bg="$surface" borderColor="$glassBorder" gap="$3">
            <AppText
              fontFamily="$body"
              fontWeight="700"
              fontSize={15}
              color="$text"
              style={{ textAlign: "center" }}
            >
              {t("session.feedback_title")}
            </AppText>
            <XStack gap="$3" justify="center">
              {(
                [
                  { value: "easy", glyph: "wind", accent: "$success" },
                  { value: "good", glyph: "sword", accent: "$primaryText" },
                  { value: "hard", glyph: "flame", accent: "$error" },
                ] as const
              ).map(({ value, glyph, accent }) => (
                <Button
                  key={value}
                  flex={1}
                  size="$4"
                  // Fixed height clipped the glyph onto the top edge once a label wrapped at 130 %.
                  height="auto"
                  py="$2"
                  bg={feedback === value || !result ? "$surface2" : "$surface"}
                  borderWidth={1}
                  borderColor={feedback === value ? accent : "$glassBorder"}
                  opacity={feedback === value ? 1 : 0.85}
                  pressStyle={{ opacity: 0.8, scale: 0.98 }}
                  onPress={() => handleFeedbackSelect(value)}
                  // Like Continue: "Tonight" lands with the save and has no reserved height, so a
                  // tap during the save could land on whatever it pushes into this slot.
                  disabled={!result}
                  rounded="$4"
                  accessibilityLabel={t(`session.feedback_${value}`)}
                  accessibilityRole="button"
                >
                  <YStack items="center" gap="$1">
                    <GameIcon
                      testID={`feedback-glyph-${value}`}
                      name={glyph}
                      size={22}
                      color={feedback === value ? accent : result ? "$text" : "$textSecondary"}
                    />
                    <AppText
                      color={result ? "$text" : "$textSecondary"}
                      fontSize={12}
                      fontWeight="700"
                      style={{ textAlign: "center" }}
                    >
                      {t(`session.feedback_${value}`)}
                    </AppText>
                  </YStack>
                </Button>
              ))}
            </XStack>
          </Card>

          {/* A failed save: the only thing that replaces "Tonight". */}
          {!!saveError && (
            <YStack width="100%" maxW={520} items="center" gap="$3">
              <AppText color="$textSecondary" fontSize={14} style={{ textAlign: "center" }}>
                {t("errors.save_session_failed")}
              </AppText>
              <AppButton backgroundColor="$surface2" onPress={runSave}>
                <AppText color="$text" fontSize={16} fontWeight="700">
                  {t("common.retry")}
                </AppText>
              </AppButton>
            </YStack>
          )}

          {/* Everything below the feeling is one tap away and costs nothing until asked for: the
            milestone and the chart read the journal, so they are not even mounted before. */}
          {expanded ? (
            <>
              <NextMilestone sessionId={result?.sessionId ?? null} language={language} />

              {/* Progression chart (lower priority; also available in the journal) */}
              <YStack width="100%" maxW={520}>
                <ProgressionChart questId={quest.id} limit={10} title={t("chart.your_progress")} />
              </YStack>

              {/* Last thing on the page and far from the sticky Continue, so it is found by looking for
                it and never by reaching for the next button. */}
              {!!result && (
                <AppText
                  testID="session-victory-forget"
                  accessibilityRole="button"
                  onPress={handleForget}
                  color="$textSecondary"
                  fontSize={14}
                  py="$3"
                  px="$4"
                  textDecorationLine="underline"
                >
                  {t("session.summary_forget")}
                </AppText>
              )}
            </>
          ) : (
            <AppText
              testID="victory-see-all"
              accessibilityRole="button"
              onPress={() => setExpanded(true)}
              color="$textSecondary"
              fontSize={14}
              minH={44}
              py="$3"
              px="$4"
              textDecorationLine="underline"
            >
              {t("session.victory_see_all")}
            </AppText>
          )}

          {/* A discreet line, never a second primary button: the roadmap's "un mot sur ce soir ?".
            It opens the note editor of the same notebook the Journal uses, on the saved row. */}
          {!!result && !tooShort && (
            <YStack width="100%" maxW={520} items="center">
              {noting ? (
                <SessionNotebook
                  sessionId={result.sessionId}
                  mode="note"
                  startEditing
                  onDraft={(draft) => {
                    noteDraft.current = draft;
                  }}
                  // Saved by its own button: nothing left for Continue to write again.
                  onChanged={() => {
                    noteDraft.current = "";
                  }}
                  onCancel={() => {
                    noteDraft.current = "";
                    setNoting(false);
                  }}
                />
              ) : (
                <AppText
                  testID="victory-note"
                  accessibilityRole="button"
                  onPress={() => setNoting(true)}
                  color="$textSecondary"
                  fontSize={14}
                  minH={44}
                  py="$3"
                  px="$4"
                  textDecorationLine="underline"
                >
                  {t("session.victory_note")}
                </AppText>
              )}
            </YStack>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky actions: Share + Continue */}
      <XStack
        px="$4"
        pt="$3"
        pb={insets.bottom + 8}
        gap="$3"
        bg="$bgDark"
        borderTopWidth={1}
        borderColor="$glassBorder"
        style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
      >
        {/* Only once the row exists, and never on a short session the hero has not kept yet:
            the share screen reads the saved session, and a discard would delete what it shows. */}
        {result && !tooShort ? (
          <ShareButton testID="session-victory-share" sessionId={result.sessionId} height={48} />
        ) : null}
        {/* While the hero has not said whether a short session counts, the bar's big button is the
            keep, not a disabled "Saving…": nothing is being saved, and a phone trace on 2026-09-13
            showed twenty taps landing on it before the hero found Keep higher up. Discard stays
            with the question. */}
        {tooShort ? (
          <AppButton
            testID="session-victory-keep-short"
            onPress={() => setKeepShort(true)}
            height={48}
            fullWidth={false}
            flex={1}
          >
            {t("session.summary_too_short_keep")}
          </AppButton>
        ) : (
          <AppButton
            testID="session-victory-continue"
            onPress={handleContinue}
            disabled={!result}
            height={48}
            fullWidth={false}
            flex={1}
          >
            {t("session.continue")}
          </AppButton>
        )}
      </XStack>

      <NarrativeModal
        visible={showOutroNarrative}
        title={questTitle}
        image={getQuestAsset(quest.imagePath)}
        text={outroNarrative ?? ""}
        onClose={() => setShowOutroNarrative(false)}
        type="outro"
      />
      {forgetDialog}
    </YStack>
  );
}
