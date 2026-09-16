import { useTranslation } from "react-i18next";
import { AppIconButton } from "@/components/common/AppButton";
import { LocateFixed } from "@/components/icons";

/**
 * The way back after a finger moved a map: to the hero on the live map, to the whole trace on the
 * recap. Absent while the camera is where it belongs, so there is nothing to press for nothing.
 */
export function MapRecenterButton({
  visible,
  top,
  testID,
  onPress,
}: {
  visible: boolean;
  top: number;
  testID: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <AppIconButton
      testID={testID}
      position="absolute"
      t={top}
      r="$4"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("recap.map_recenter")}
    >
      <LocateFixed size={20} color="$text" strokeWidth={2.5} />
    </AppIconButton>
  );
}
