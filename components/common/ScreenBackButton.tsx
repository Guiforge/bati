import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "tamagui";

import { ChevronLeft } from "@/components/icons";

/**
 * The chevron every screen outside the tabs draws in its own header.
 *
 * It was the same eight lines copied into seven files, and the copies had already drifted: one of
 * them carried `hitSlop`, six did not, and `recap.tsx` used `AppIconButton` instead and so came
 * out at 44x44 where the rest measured **36x36 dp** on a device. The most repeated control in the
 * app was also the one most often under the floor, and no screen-by-screen check could see it,
 * because each screen looked fine against the six others that were wrong in the same way.
 *
 * `chromeless` and `size="$3"` are the design, kept exactly: this is a bare chevron, not the
 * bordered disc `AppIconButton` draws. The 8 dp of `hitSlop` is what makes the 36 a 52 without
 * moving a pixel, the same trade `AppIconButton` and the session's own controls already make.
 */
export function ScreenBackButton() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Button
      size="$3"
      hitSlop={8}
      circular
      chromeless
      onPress={() => router.back()}
      icon={<ChevronLeft size={24} color="$text" />}
      accessibilityRole="button"
      accessibilityLabel={t("quests.go_back", "Go back")}
    />
  );
}
