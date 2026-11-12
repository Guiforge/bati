import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState, ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { Activity } from "@/components/icons";
import { SettingRow } from "@/components/settings/SettingRow";
import { useHaptics } from "@/hooks/useHaptics";
import { nativeHealth } from "@/modules/bati-health";
import { syncHealthConnectQuietly } from "@/src/healthExport/inStep";
import type { HealthPort } from "@/src/healthExport/port";
import {
  type HealthExportState,
  readHealthExportState,
  turnHealthExportOff,
  turnHealthExportOn,
} from "@/src/healthExport/sync";
import { reportError } from "@/src/reportError";

/**
 * Settings > Devices and health data (W-04): one switch that sends each session to Health Connect.
 *
 * The switch shows what Android says, read on every focus and every return to the app: a permission
 * taken back in Android's own settings turns it off here, with a line saying so. Settings links here
 * only where Health Connect is available.
 */
export default function HealthDataScreen({ port = nativeHealth }: { port?: HealthPort }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [state, setState] = useState<HealthExportState | null>(null);
  // Health Connect's answer to the last tap, not a state of its own: only this visit says it.
  const [refused, setRefused] = useState(false);
  const [busy, setBusy] = useState(false);

  // `useCallback` because `useFocusEffect` runs again for every new function it is handed.
  const refresh = useCallback(() => {
    readHealthExportState(port)
      .then(setState)
      .catch((e: unknown) => reportError("healthExport.settingsRead", e));
  }, [port]);

  useFocusEffect(refresh);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const on = state?.kind === "on";

  const toggle = () => {
    if (busy) return;
    haptics.selection();
    setBusy(true);
    const change = on
      ? turnHealthExportOff().then(() => setRefused(false))
      : turnHealthExportOn(port).then((granted) => {
          setRefused(!granted);
          if (granted) syncHealthConnectQuietly(port);
        });
    change
      .catch((e: unknown) => reportError("healthExport.switch", e))
      .finally(() => {
        setBusy(false);
        refresh();
      });
  };

  const pending = state?.kind === "on" || state?.kind === "withdrawn" ? state.pending : 0;

  return (
    <YStack flex={1} bg="background" pt={insets.top} pb={insets.bottom}>
      <XStack px="4" py="3" items="center" gap="3">
        <ScreenBackButton />
        <Text flex={1} fontFamily="heading" fontSize={22} fontWeight="700" color="text">
          {t("healthExport.title")}
        </Text>
      </XStack>

      {state === null || state.kind === "unavailable" ? null : (
        <RNScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
          <SettingRow
            testID="health-export-switch"
            icon={<Activity size={22} color="text" />}
            label={t("healthExport.switch")}
            value={on ? t("common.on") : t("common.off")}
            checked={on}
            disabled={busy}
            onPress={toggle}
          />

          <Text fontSize="3" color="textSecondary" px="3">
            {t("healthExport.explain")}
          </Text>

          {refused && state.kind === "off" ? (
            <Text testID="health-export-refused" fontSize="3" color="text" px="3">
              {t("healthExport.refused")}
            </Text>
          ) : null}

          {state.kind === "withdrawn" ? (
            <Text testID="health-export-withdrawn" fontSize="3" color="text" px="3">
              {t("healthExport.withdrawn")}
            </Text>
          ) : null}

          {pending > 0 ? (
            <Text testID="health-export-pending" fontSize="3" color="textSecondary" px="3">
              {t("healthExport.pending", { count: pending })}
            </Text>
          ) : null}

          <Text fontSize="3" color="textSecondary" px="3">
            {t("healthExport.off_keeps")}
          </Text>

          <Text
            testID="health-export-open"
            fontSize="3"
            color="primaryText"
            textDecorationLine="underline"
            px="3"
            // Padding, not `minH` + `verticalAlign`: that pair drew the underline through the words.
            py="3"
            role="link"
            onPress={() => port.openSettings()}
          >
            {t("healthExport.open")}
          </Text>
        </RNScrollView>
      )}
    </YStack>
  );
}
