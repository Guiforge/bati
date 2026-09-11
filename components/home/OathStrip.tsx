import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { ProgressBar } from "@/components/common/ProgressBar";
// A rosette, not game-icons' star: at this size its prominences read as a cog, the second gear on
// a screen whose avatar is already the way to settings.
import { Award, ChevronRight } from "@/components/icons";
import { useOathText } from "@/components/oath/useOathText";
import { type Chain, getChainTo } from "@/db/exercises";
import { getOathProgress, type OathProgress, oathNeedsExercise } from "@/db/oaths";
import { readPath } from "@/db/paths";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/** One line of 13 px and its padding, held while the read is in flight so the CTA does not move. */
const STRIP_MIN_HEIGHT = 40;

/** The path leading to the sworn movement, or null when the oath does not name one. */
function useOathChain(oath: OathProgress): Chain | null {
  const [chain, setChain] = useState<Chain | null>(null);

  const exerciseId = oathNeedsExercise(oath.oath.metric) ? oath.oath.exerciseId : null;

  useEffect(() => {
    if (exerciseId === null) {
      setChain(null);
      return;
    }

    let cancelled = false;
    getChainTo(exerciseId)
      .then((result) => {
        if (!cancelled) setChain(result);
      })
      .catch((error) => {
        // The strip falls back to the plain bar; the oath itself is unaffected.
        reportError("home.oathChain", error);
      });

    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  return chain;
}

/** The rungs as ticks: gold behind the hero, indigo under their feet, the rest unlit. */
function Rungs({ chain, climbed }: { chain: Chain; climbed: boolean }) {
  return (
    <XStack gap={3}>
      {chain.rungs.map((rung, index) => (
        <YStack
          key={rung.exercise.id}
          width={11}
          height={4}
          rounded={2}
          bg={
            climbed || index < chain.position - 1
              ? "$resourceGold"
              : index === chain.position - 1
                ? "$primaryText"
                : "$borderStrong"
          }
        />
      ))}
    </XStack>
  );
}

/**
 * The oath, led by the climb it actually is, in one line.
 *
 * `exercise_pr` reads MAX(resultValue), so a beginner swearing "Pull-ups x15" who has never logged
 * a pull-up would see a bar frozen at 0/15 for months. Four of the seven presets sit on a path,
 * so the rungs *replace* the bar rather than joining it: two gauges on one line is two notions of
 * progress fighting for the same eye. The day the hero pulls their first rep the rungs are all
 * gold, and a fulfilled oath is about its number again.
 */
function SwornStrip({ oath }: { oath: OathProgress }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const label = useOathText(oath);
  const chain = useOathChain(oath);

  const climbing = chain !== null && !oath.isFulfilled;
  const path = climbing && chain ? readPath(chain, language) : null;

  const detail = oath.isFulfilled
    ? t("oath.card_fulfilled")
    : chain && path?.name
      ? path.isClimbed
        ? t("exercises.path_climbed", { path: path.name })
        : t("exercises.path_rung", { path: path.name, position: chain.position, total: path.total })
      : t("oath.card_progress", { current: oath.current, target: oath.target });

  return (
    <>
      <Award size={16} color="$resourceGold" />
      <Text flex={1} fontSize={13} lineHeight={18} color="$text" numberOfLines={2}>
        {label}
        {/* The detail travels as one piece with its dot: "5 / 50" split over two lines reads as
            two numbers, and a dot left at the end of a line reads as a stray mark. */}
        <Text color="$textSecondary">{` ·\u00A0${detail.replaceAll(" ", "\u00A0")}`}</Text>
      </Text>
      {climbing && chain && path?.name ? (
        <Rungs chain={chain} climbed={path.isClimbed} />
      ) : (
        <YStack width={56}>
          <ProgressBar
            testID="oath-progress-bar"
            progress={oath.progress}
            height={4}
            color="$resourceGold"
            trackColor="$borderStrong"
          />
        </YStack>
      )}
    </>
  );
}

/**
 * The chosen objective, as a strip along the foot of the scene rather than a card of its own.
 *
 * When none is sworn it becomes the way to swear one, in the same place and at the same height:
 * this is the only entry to the feature from Home, so it must not hide, and an empty card the size
 * of the scene was too much for something half the heroes use once.
 */
export function OathStrip() {
  const { t } = useTranslation();
  const router = useRouter();
  const [oath, setOath] = useState<OathProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getOathProgress()
        .then(setOath)
        .catch((error) => {
          // Falls back to the swear line, which is wrong for a hero who has one, so the failure
          // must at least be reported.
          reportError("home.oath", error);
          setOath(null);
        })
        .finally(() => setIsLoading(false));
    }, []),
  );

  if (isLoading) return <YStack minH={STRIP_MIN_HEIGHT} />;

  return (
    <XStack
      testID="home-oath-card"
      minH={STRIP_MIN_HEIGHT}
      px="$4"
      py="$2"
      gap="$2.5"
      items="center"
      bg="$glassBg"
      borderTopWidth={1}
      borderColor={oath ? "$goldHairline" : "$glassBorder"}
      onPress={() => router.push("/oath" as never)}
      pressStyle={{ opacity: 0.8 }}
      accessibilityRole="button"
    >
      {oath ? (
        <SwornStrip oath={oath} />
      ) : (
        <>
          <Award size={16} color="$textSecondary" />
          <Text flex={1} fontSize={13} lineHeight={18} color="$textSecondary" numberOfLines={2}>
            {`${t("oath.empty_cta")} · ${t("oath.empty_hint")}`}
          </Text>
          <ChevronRight size={16} color="$textSecondary" />
        </>
      )}
    </XStack>
  );
}
