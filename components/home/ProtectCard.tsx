import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, XStack, YStack } from "tamagui";
import { AppText } from "@/components/common/AppText";
import { Card } from "@/components/common/Card";
import { ChevronRight, Shield, X } from "@/components/icons";
import { useHaptics } from "@/hooks/useHaptics";
import { dismissProtectCard, type ProtectCardKind, protectCardKind } from "@/src/protectHero";
import { reportError } from "@/src/reportError";

const TEXT = {
  plain: ["backup.protectTitle", "backup.protectBody"],
  heavy: ["backup.protectHeavyTitle", "backup.protectHeavyBody"],
  noLock: ["backup.protectNoLockTitle", "backup.protectNoLockBody"],
} as const satisfies Record<ProtectCardKind, readonly [string, string]>;

/**
 * A line under the scene, same family as `ReminderCard`: after a few sessions with nothing
 * protecting the hero, it opens Settings in one tap and can be closed for thirty days. Reads on
 * focus, so coming back from Settings with a folder chosen takes it down.
 */
export function ProtectCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const haptics = useHaptics();
  const [kind, setKind] = useState<ProtectCardKind | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      protectCardKind()
        .then((next) => {
          if (!cancelled) setKind(next);
        })
        .catch((error: unknown) => reportError("protect.card", error));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (kind === null) return null;

  const open = () => {
    haptics.selection();
    router.push("/settings" as never);
  };

  const close = () => {
    haptics.selection();
    setKind(null);
    dismissProtectCard().catch((error: unknown) => reportError("protect.dismiss", error));
  };

  return (
    <Card testID="home-protect" mx="$4" mt="$3" py="$2" onPress={open}>
      <XStack items="center" gap="$2">
        <Shield size={16} color="$textSecondary" />
        <YStack flex={1}>
          <AppText fontSize="$3" fontWeight="bold" color="$text">
            {t(TEXT[kind][0])}
          </AppText>
          <AppText fontSize="$2" color="$textSecondary">
            {t(TEXT[kind][1])}
          </AppText>
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
          accessibilityLabel={t("common.close")}
        />
      </XStack>
    </Card>
  );
}
