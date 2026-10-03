import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { ChevronRight, Shield, X } from "@/components/icons";
import { useHaptics } from "@/hooks/useHaptics";
import { dismissProtectCard, protectCardVisible } from "@/src/protectHero";
import { reportError } from "@/src/reportError";

/**
 * A line under the scene, same family as `ReminderCard`: after a few sessions with nothing
 * protecting the hero, it opens Settings in one tap and can be closed for thirty days. Reads on
 * focus, so coming back from Settings with a folder chosen takes it down.
 */
export function ProtectCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const haptics = useHaptics();
  const [visible, setVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      protectCardVisible()
        .then((next) => {
          if (!cancelled) setVisible(next);
        })
        .catch((error: unknown) => reportError("protect.card", error));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (!visible) return null;

  const open = () => {
    haptics.selection();
    router.push("/settings" as never);
  };

  const close = () => {
    haptics.selection();
    setVisible(false);
    dismissProtectCard().catch((error: unknown) => reportError("protect.dismiss", error));
  };

  return (
    <Card testID="home-protect" mx="$4" mt="$3" py="$2" onPress={open}>
      <XStack items="center" gap="$2">
        <Shield size={16} color="$primaryText" />
        <YStack flex={1}>
          <Text fontSize="$3" fontWeight="bold" color="$primaryText">
            {t("backup.protectTitle")}
          </Text>
          <Text fontSize="$2" color="$textSecondary">
            {t("backup.protectBody")}
          </Text>
        </YStack>
        <ChevronRight size={16} color="$primaryText" />
        <Button
          testID="home-protect-dismiss"
          size="$2"
          circular
          chromeless
          hitSlop={8}
          onPress={close}
          icon={<X size={18} color="$textSecondary" />}
          accessibilityRole="button"
          accessibilityLabel={t("common.close", "Close")}
        />
      </XStack>
    </Card>
  );
}
