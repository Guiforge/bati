import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, Text, YStack } from "tamagui";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { useSessionStore } from "@/stores/session";

export function CountdownView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { remainingSeconds } = useSessionTimer();
  const { status, finishCountdown } = useSessionStore();

  useEffect(() => {
    if (status !== "countdown") return;
    if (remainingSeconds !== 0) return;

    const id = setTimeout(() => {
      finishCountdown();
    }, 450);

    return () => clearTimeout(id);
  }, [finishCountdown, remainingSeconds, status]);

  const showLetsGo = remainingSeconds === 0;

  return (
    <YStack
      flex={1}
      bg="$background"
      pt={insets.top + 16}
      pb={insets.bottom + 16}
      px="$5"
      items="center"
      justify="center"
      gap="$4"
    >
      <Text fontSize={28} opacity={0.9}>
        ⚔️
      </Text>

      {showLetsGo ? (
        <YStack items="center" gap="$2" animation="bouncy" enterStyle={{ scale: 0.9 }}>
          <H1
            fontWeight="900"
            fontSize={64}
            lineHeight={66}
            color="$primary"
            textTransform="uppercase"
            style={{ textAlign: "center" }}
          >
            {t("session.countdown_letsgo")}
          </H1>
          <Text fontWeight="800" opacity={0.6} color="$color" style={{ textAlign: "center" }}>
            {t("session.countdown_warmup_done")}
          </Text>
        </YStack>
      ) : (
        <H1
          fontWeight="900"
          fontSize={140}
          lineHeight={140}
          color="$color"
          fontFamily="$body"
          animation="quick"
          key={String(remainingSeconds)}
          enterStyle={{ scale: 0.92, opacity: 0.6 }}
          style={{ textAlign: "center" }}
        >
          {remainingSeconds}
        </H1>
      )}
    </YStack>
  );
}
