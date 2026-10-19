import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Pressable } from "react-native";
import { Text, YStack } from "tamagui";
import { RuleDisclosure } from "@/components/common/RuleDisclosure";
import { GpsChip } from "@/components/quests/GpsChip";
import { preferences } from "@/db/preferences";
import { getPermissionStatus } from "@/modules/bati-location";
import { reportError } from "@/src/reportError";

/**
 * The GPS row of the goal sheet: the chip, the rule behind it, and, when GPS is off and Android
 * has not been given the position, the way to the system setting that grants it (the one door the
 * old "Bati has no access to your location" dead end had).
 *
 * Owns `outing_gps`: read when the sheet opens, written at once on a tap, never asked again at
 * start. The outing under way keeps the choice it began with; this prefills the next one. The
 * value is handed up for the one line of the sheet that depends on it.
 */
export function GpsSetting({ open, onValue }: { open: boolean; onValue: (gps: boolean) => void }) {
  const { t } = useTranslation();
  const [gps, setGps] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `onValue` is the parent's setter; the open edge is what reads
  useEffect(() => {
    if (!open) return;
    preferences
      .getOutingGps()
      .then((value) => {
        setGps(value);
        onValue(value);
      })
      .catch((e) => reportError("goalSheet.gps", e));
    // Asked of the module and never stored: the grant may have been given in Android's settings.
    getPermissionStatus()
      .then((status) => setLocationDenied(!status.granted))
      .catch((e) => reportError("goalSheet.permission", e));
  }, [open]);

  const flip = (next: boolean) => {
    setGps(next);
    onValue(next);
    preferences.setOutingGps(next).catch((e) => reportError("goalSheet.gps", e));
  };

  return (
    <YStack gap="$1">
      <GpsChip value={gps} onChange={flip} />
      <RuleDisclosure testID="goal-gps-rule" text={t("past_session.rule_no_gps")} />
      {gps || !locationDenied ? null : (
        <Pressable
          testID="goal-allow-location"
          accessibilityRole="link"
          style={{ minHeight: 44, justifyContent: "center" }}
          onPress={() =>
            Linking.openSettings().catch((e: unknown) => reportError("goalSheet.settings", e))
          }
        >
          <Text fontSize={14} color="$textSecondary" textDecorationLine="underline">
            {t("quests.gps_allow_location")}
          </Text>
        </Pressable>
      )}
    </YStack>
  );
}
