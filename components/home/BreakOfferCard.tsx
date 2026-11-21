import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack } from "tamagui";
import { AppText } from "@/components/common/AppText";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { ChevronRight, Pause, X } from "@/components/icons";
import { closeBreakOffer } from "@/db/pause";
import { useHaptics } from "@/hooks/useHaptics";
import { reportError } from "@/src/reportError";

/** Home's offer to the hero who has been away for a week with the flame still alive: /pause. */
export function BreakOfferCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const haptics = useHaptics();
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  return (
    <Card
      testID="home-break-offer"
      mx="4"
      mt="3"
      py="2"
      accessibilityRole="button"
      onPress={() => {
        haptics.selection();
        router.push("/pause" as never);
      }}
    >
      <XStack items="center" gap="2">
        <Pause size={16} color="primaryText" />
        <AppText flex={1} fontSize="3" color="primaryText">
          {t("home.break_offer")}
        </AppText>
        <ChevronRight size={16} color="primaryText" />
        <Button
          testID="home-break-offer-dismiss"
          size="2"
          circular
          chromeless
          hitSlop={8}
          onPress={() => {
            haptics.selection();
            setClosed(true);
            closeBreakOffer().catch((e: unknown) => reportError("home.breakOffer", e));
          }}
          icon={<X size={18} color="textSecondary" />}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        />
      </XStack>
    </Card>
  );
}
