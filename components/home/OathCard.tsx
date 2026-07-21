import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { GameIcon } from "@/components/common/GameIcon";
import { ProgressBar } from "@/components/common/ProgressBar";
import { useOathText } from "@/components/oath/useOathText";
import { getOathProgress, type OathProgress } from "@/db/oaths";

/** The oath label + bar. Split out so the hook only runs when there is an oath. */
function OathBody({ oath }: { oath: OathProgress }) {
  const { t } = useTranslation();
  const label = useOathText(oath);

  return (
    <YStack gap="$2">
      <XStack items="center" gap="$2">
        <GameIcon name="star" size={20} color="$text" />
        <Text fontWeight="700" fontSize={13} color="$text" opacity={0.8}>
          {t("oath.card_title")}
        </Text>
      </XStack>

      <Text fontWeight="700" fontSize={16} color="$text">
        {label}
      </Text>

      <ProgressBar progress={oath.progress} />

      <Text fontSize={13} color="$text" opacity={0.75}>
        {oath.isFulfilled
          ? t("oath.card_fulfilled")
          : t("oath.card_progress", { current: oath.current, target: oath.target })}
      </Text>
    </YStack>
  );
}

/**
 * Sits under the coach nudge: the coach says what to do this week, the oath says
 * what the user is working toward. Renders nothing when no oath is sworn — an
 * empty prompt here would compete with the coach for the same slot.
 */
export function OathCard() {
  const router = useRouter();
  const [oath, setOath] = useState<OathProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setOath(await getOathProgress());
    } catch {
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

  if (isLoading || !oath) {
    return null;
  }

  return (
    <Card bg="$pastelPurple" width="100%" onPress={openOath}>
      <OathBody oath={oath} />
    </Card>
  );
}
