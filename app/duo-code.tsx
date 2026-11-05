import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { QrCode } from "@/components/multiplayer/QrCode";
import { listPairs, type Pair } from "@/db/pairs";
import { MULTIPLAYER_ENABLED } from "@/src/multiplayer/flag";
import { coupsLink } from "@/src/multiplayer/sendCoups";
import { reportError } from "@/src/reportError";

/**
 * "Montrer mon QR" (LOT1-SPEC.md § 5.6): the same bundle "Envoyer mes coups" would send, as a code
 * for the companion in the room. Sealed for that pair, so it carries no secret; the pair's id in the
 * route is in clear in every envelope already.
 */
export default function DuoCodeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { pair: pairId } = useLocalSearchParams<{ pair?: string }>();
  const [shown, setShown] = useState<{ pair: Pair; link: string } | "failed" | null>(null);

  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;
    (async () => {
      const pair = (await listPairs()).find((p) => p.id === pairId);
      setShown(pair ? { pair, link: await coupsLink(pair) } : "failed");
    })().catch((error: unknown) => {
      reportError("duo.code", error);
      setShown("failed");
    });
  }, [pairId]);

  if (!MULTIPLAYER_ENABLED) return <Redirect href="/" />;

  return (
    <YStack flex={1} bg="background" pt={insets.top} pb={insets.bottom} testID="duo-code-screen">
      <XStack px="4" py="3" items="center" gap="3">
        <ScreenBackButton />
        <Text fontSize={20} fontWeight="700" color="text">
          {t("duo.qr_title")}
        </Text>
      </XStack>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, alignItems: "center" }}>
        {shown === "failed" ? (
          <Text color="text" testID="duo-code-failed">
            {t("duo.failed")}
          </Text>
        ) : shown ? (
          <>
            <YStack accessible accessibilityLabel={t("duo.qr_label", { name: shown.pair.name })}>
              <QrCode value={shown.link} size={280} />
            </YStack>
            <Text color="text" fontSize={16} style={{ textAlign: "center" }}>
              {t("duo.qr_hint", { name: shown.pair.name })}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </YStack>
  );
}
