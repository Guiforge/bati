import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState, ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { Activity } from "@/components/icons";
import { HealthExportOptions } from "@/components/settings/HealthExportOptions";
import { SettingRow } from "@/components/settings/SettingRow";
import { useHaptics } from "@/hooks/useHaptics";
import { nativeHealth } from "@/modules/bati-health";
import { syncHealthConnectQuietly } from "@/src/healthExport/inStep";
import type { HealthPort } from "@/src/healthExport/port";
import {
  type HealthExportState,
  readHealthExportState,
  startHealthHistory,
  stopHealthHistory,
  takeHistoryQuestion,
  turnHealthExportOff,
  turnHealthExportOn,
  turnHealthRouteOff,
  turnHealthRouteOn,
} from "@/src/healthExport/sync";
import { reportError } from "@/src/reportError";

/**
 * Settings > Devices and health data (W-04): one switch that sends each session to Health Connect,
 * and under it, only while it is on, the route option and the past sessions. Progress is shown
 * here and nowhere else.
 *
 * The switches show what Android says, read on every focus and every return to the app: a
 * permission taken back in Android's own settings turns one off here, with a line saying so.
 * Settings links here only where Health Connect is available.
 */
/**
 * What the screen shows, read on every focus, every return to the app, and every second while past
 * sessions go out (the count moves; here only, never on another screen).
 */
function useHealthExportState(port: HealthPort) {
  const [state, setState] = useState<HealthExportState | null>(null);

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

  const sending = state?.kind === "on" && state.history.running;
  useEffect(() => {
    if (!sending) return;
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [sending, refresh]);

  return [state, refresh] as const;
}

export default function HealthDataScreen({ port = nativeHealth }: { port?: HealthPort }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [state, refresh] = useHealthExportState(port);
  // Health Connect's answer to the last tap, not a state of its own: only this visit says it.
  const [refused, setRefused] = useState(false);
  const [routeRefused, setRouteRefused] = useState(false);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const on = state?.kind === "on";

  /** One change at a time, then the state read again. */
  const run = (change: () => Promise<unknown>, context: string) => {
    if (busy) return;
    haptics.selection();
    setBusy(true);
    change()
      .catch((e: unknown) => reportError(context, e))
      .finally(() => {
        setBusy(false);
        refresh();
      });
  };

  const toggle = () =>
    run(
      () =>
        on
          ? turnHealthExportOff().then(() => setRefused(false))
          : turnHealthExportOn(port).then(async (granted) => {
              setRefused(!granted);
              if (!granted) return;
              syncHealthConnectQuietly(port);
              setAsking(await takeHistoryQuestion());
            }),
      "healthExport.switch",
    );

  const route = state?.kind === "on" || state?.kind === "withdrawn" ? state.route : false;
  const toggleRoute = () =>
    run(
      () =>
        route
          ? turnHealthRouteOff().then(() => setRouteRefused(false))
          : turnHealthRouteOn(port).then((granted) => setRouteRefused(!granted)),
      "healthExport.route",
    );

  const history = (start: boolean) =>
    run(async () => {
      setAsking(false);
      if (!start) return stopHealthHistory();
      await startHealthHistory();
      syncHealthConnectQuietly(port);
    }, "healthExport.history");

  const details = state?.kind === "on" || state?.kind === "withdrawn" ? state : null;

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

          {details ? (
            <HealthExportOptions
              details={details}
              busy={busy}
              routeRefused={routeRefused}
              onRoute={toggleRoute}
              onHistory={history}
            />
          ) : null}

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

          <Text fontSize="3" color="textSecondary" px="3">
            {t("healthExport.off_keeps")}
          </Text>
        </RNScrollView>
      )}

      <ConfirmDialog
        testID="health-export-history-question"
        open={asking}
        title={t("healthExport.history_question_title")}
        body={t("healthExport.history_question_body")}
        confirmLabel={t("healthExport.history_yes")}
        cancelLabel={t("healthExport.history_later")}
        onConfirm={() => history(true)}
        onCancel={() => setAsking(false)}
      />
    </YStack>
  );
}
