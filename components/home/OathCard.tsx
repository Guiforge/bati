import { ChevronRight } from "@tamagui/lucide-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { GameIcon } from "@/components/common/GameIcon";
import { PathStrip } from "@/components/common/PathStrip";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Skeleton } from "@/components/common/Skeleton";
import { useOathText } from "@/components/oath/useOathText";
import { type Chain, getChainTo } from "@/db/exercises";
import { getOathProgress, type OathProgress, oathNeedsExercise } from "@/db/oaths";
import { reportError } from "@/src/reportError";

// Card padding + icon row + bar + progress line: the sworn state, which is the taller of the two.
// Deliberately not raised for the chain line below — that line is conditional, so a taller
// skeleton would make the *majority* of oaths jump instead of the minority.
const OATH_CARD_HEIGHT = 116;

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
        // The card falls back to the plain bar; the oath itself is unaffected.
        reportError("home.oathChain", error);
      });

    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  return chain;
}

/**
 * The oath, led by the climb it actually is.
 *
 * Four of the seven presets swear a movement that sits on a path — `lsit_30` is commented "the top
 * of the skill ladder" — so swearing is already choosing a summit, and `useSmartAction` already
 * trains the rung the hero stands on. What the card showed was the other measure: `exercise_pr`
 * reads MAX(resultValue), so a beginner swearing "Pull-ups x15" who has never logged a pull-up saw
 * a gold bar frozen at 0/15 for months, on the most visible card in the app, while the climb under
 * it moved every three sessions in 13px grey.
 *
 * So the strip *replaces* the bar rather than joining it — two gauges on one card is two notions
 * of progress fighting for the same eye. The rest falls out for free: `getChainTo` ends its chain
 * on the sworn movement, so the strip measures the distance to the movement and the counter the
 * distance to 15 reps of it. The day the hero pulls their first rep, the strip fills and the
 * counter starts moving — the card hands over from one measure to the other exactly when the
 * second one starts meaning something.
 */
function OathBody({ oath }: { oath: OathProgress }) {
  const { t } = useTranslation();
  const label = useOathText(oath);
  const chain = useOathChain(oath);

  // A fulfilled oath is about its number again: the path behind it is history.
  const climbing = chain !== null && !oath.isFulfilled;

  return (
    <YStack gap="$2">
      {/* No eyebrow above the label: the star carries "oath", the label speaks for itself. */}
      <XStack items="center" gap="$2">
        <GameIcon name="star" size={20} color="$resourceGold" />
        <Text fontWeight="700" fontSize={16} color="$text" flex={1}>
          {label}
        </Text>
      </XStack>

      {climbing && chain ? (
        <PathStrip chain={chain} />
      ) : (
        <ProgressBar
          testID="oath-progress-bar"
          progress={oath.progress}
          height={6}
          color="$resourceGold"
        />
      )}

      <Text fontSize={13} color="$textSecondary">
        {oath.isFulfilled
          ? t("oath.card_fulfilled")
          : t("oath.card_progress", { current: oath.current, target: oath.target })}
      </Text>
    </YStack>
  );
}

/**
 * The user's chosen objective. When none is sworn it shows a CTA to swear one —
 * this is the only entry point to the feature from Home, so it must not hide.
 */
export function OathCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const [oath, setOath] = useState<OathProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setOath(await getOathProgress());
    } catch (error) {
      // On error the card falls back to the "swear an oath" CTA — wrong for a hero who has
      // one, so the failure must at least be reported.
      reportError("home.oath", error);
      setOath(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {
        // Error already handled
      });
    }, [load]),
  );

  const openOath = useCallback(() => {
    router.push("/oath" as never);
  }, [router]);

  if (isLoading) {
    // Hold the card's height so the legend below it doesn't jump on first load.
    return <Skeleton height={OATH_CARD_HEIGHT} radius={16} bg="$surface" />;
  }

  if (!oath) {
    return (
      <Card testID="home-oath-card" width="100%" onPress={openOath}>
        <XStack items="center" gap="$3">
          <GameIcon name="star" size={20} color="$text" />
          <YStack flex={1}>
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("oath.empty_cta")}
            </Text>
            <Text fontSize={13} color="$textSecondary">
              {t("oath.empty_hint")}
            </Text>
          </YStack>
          <ChevronRight size={20} color="$textSecondary" opacity={0.6} />
        </XStack>
      </Card>
    );
  }

  return (
    <Card testID="home-oath-card" width="100%" onPress={openOath}>
      <OathBody oath={oath} />
    </Card>
  );
}
