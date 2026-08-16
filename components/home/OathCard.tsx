import { ChevronRight } from "@tamagui/lucide-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { GameIcon } from "@/components/common/GameIcon";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Skeleton } from "@/components/common/Skeleton";
import { useOathText } from "@/components/oath/useOathText";
import { type Chain, getChainTo } from "@/db/exercises";
import { getOathProgress, type OathProgress, oathNeedsExercise } from "@/db/oaths";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

// Card padding + icon row + bar + progress line: the sworn state, which is the taller of the two.
// Deliberately not raised for the chain line below — that line is conditional, so a taller
// skeleton would make the *majority* of oaths jump instead of the minority.
const OATH_CARD_HEIGHT = 116;

/**
 * Where the sworn movement sits on the variation ladder.
 *
 * Half the oath presets already target a rung — "Pull-ups 15", "L-Sit 30" — so swearing one is
 * already choosing a path. The oath only ever counted; this is the path it was counting along.
 */
function ChainLine({ oath }: { oath: OathProgress }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
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
        // The line simply does not appear; the oath itself is unaffected.
        reportError("home.oathChain", error);
      });

    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  if (!chain) return null;

  const current = chain.rungs[chain.position - 1]?.exercise;
  if (!current) return null;

  return (
    <Text fontSize={13} color="$textSecondary" opacity={0.85}>
      {t("progression.chain_position", {
        position: chain.position,
        total: chain.rungs.length,
        name: language === "fr" ? current.frName : current.enName,
      })}
    </Text>
  );
}

/** The oath label + bar. Split out so the hook only runs when there is an oath. */
function OathBody({ oath }: { oath: OathProgress }) {
  const { t } = useTranslation();
  const label = useOathText(oath);

  return (
    <YStack gap="$2">
      {/* No eyebrow above the label: the star carries "oath", the label speaks for itself. */}
      <XStack items="center" gap="$2">
        <GameIcon name="star" size={20} color="$resourceGold" />
        <Text fontWeight="700" fontSize={16} color="$text" flex={1}>
          {label}
        </Text>
      </XStack>

      <ProgressBar progress={oath.progress} height={6} color="$resourceGold" />

      <Text fontSize={13} color="$textSecondary">
        {oath.isFulfilled
          ? t("oath.card_fulfilled")
          : t("oath.card_progress", { current: oath.current, target: oath.target })}
      </Text>

      <ChainLine oath={oath} />
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
