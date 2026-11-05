import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { myWeekDays, sessionCounts } from "@/db/duo";
import { listPairs, type Pair } from "@/db/pairs";
import { clampGoal, isoWeekOf } from "@/src/multiplayer/duoWeek";
import { MULTIPLAYER_ENABLED } from "@/src/multiplayer/flag";
import { sendCoups } from "@/src/multiplayer/sendCoups";
import { reportError } from "@/src/reportError";

/**
 * The victory's one line of the duo challenge (LOT1-SPEC.md § 5.4, E1, E4): what this session did
 * for the week, and "Envoyer mes coups". Only after a counted session, only with a companion; with
 * several, the tap unfolds one button each in place. Closing the share sheet changes nothing.
 */
export function DuoVictoryLine({ sessionId }: { sessionId: number }) {
  const { t } = useTranslation();
  const [state, setState] = useState<{ pairs: Pair[]; hits: number } | null>(null);
  const [unfolded, setUnfolded] = useState(false);

  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;
    (async () => {
      const pairs = await listPairs();
      if (pairs.length === 0 || !(await sessionCounts(sessionId))) return;
      const days = await myWeekDays(isoWeekOf(new Date()));
      setState({ pairs, hits: days.filter(Boolean).length });
    })().catch((error: unknown) => reportError("duo.victory", error));
  }, [sessionId]);

  const [first] = state?.pairs ?? [];
  if (state === null || first === undefined) return null;
  const goal = clampGoal(first.goal);
  const send = (pair: Pair) => () => {
    sendCoups(pair).catch((error: unknown) => reportError("duo.victory.send", error));
  };

  return (
    <YStack gap="2" width="100%" maxW={520} testID="duo-victory">
      <XStack gap="3" items="center" flexWrap="wrap">
        <Text
          flex={1}
          minW={160}
          color="text"
          fontSize={15}
          testID="duo-victory-fact"
          accessibilityLabel={t("duo.victory_fact_label", { hits: state.hits, goal })}
        >
          {t("duo.victory_fact", { hits: state.hits, goal })}
        </Text>
        <AppButton
          testID="duo-victory-send"
          variant="outline"
          backgroundColor="surface2"
          height={48}
          fullWidth={false}
          accessibilityLabel={
            state.pairs.length === 1 ? t("duo.send_to_label", { name: first.name }) : undefined
          }
          onPress={state.pairs.length === 1 ? send(first) : () => setUnfolded((v) => !v)}
        >
          {t("duo.send")}
        </AppButton>
      </XStack>
      {unfolded ? (
        <XStack gap="2" flexWrap="wrap">
          {state.pairs.map((pair) => (
            <AppButton
              key={pair.id}
              testID={`duo-victory-send-${pair.name}`}
              variant="outline"
              backgroundColor="surface2"
              height={48}
              fullWidth={false}
              accessibilityLabel={t("duo.send_to_label", { name: pair.name })}
              onPress={send(pair)}
            >
              {t("duo.to_name", { name: pair.name })}
            </AppButton>
          ))}
        </XStack>
      ) : null}
    </YStack>
  );
}
