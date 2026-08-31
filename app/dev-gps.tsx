import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { ChevronLeft } from "@/components/icons";
import {
  addListener,
  hasGpsProvider,
  isAvailable,
  type LocationFix,
  requestPermission,
  start,
  stop,
} from "@/modules/bati-location";

// Field harness, not a screen. The service compiles and lints and passes a green suite, and none
// of that says a fix ever arrives — that only happens on a phone, outdoors, with the sky in view.
// This is the smallest thing that lets a person watch it happen: the raw event stream, a running
// count, and the first-fix delay, which on a de-Googled ROM is the number nobody has measured.
//
// Delete this once the session screen exists.

const NOTIFICATION = {
  title: "Bati",
  acquiring: "Acquiring GPS…",
  tracking: "Tracking",
  paused: "Paused",
  gpsOff: "GPS off",
};

/** Module scope so the effect below has no unstable dependency; React Compiler owns the rest. */
function append(setLog: React.Dispatch<React.SetStateAction<string[]>>, line: string): void {
  setLog((previous) => [`${new Date().toLocaleTimeString()} ${line}`, ...previous].slice(0, 40));
}

export default function DevGpsHarness() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [log, setLog] = useState<string[]>([]);
  const [fixes, setFixes] = useState(0);
  const [last, setLast] = useState<LocationFix | null>(null);
  const [running, setRunning] = useState(false);
  const startedAt = useRef<number | null>(null);
  const firstFixMs = useRef<number | null>(null);

  const say = (line: string) => append(setLog, line);

  useEffect(() => {
    const subs = [
      addListener("onLocation", (fix) => {
        if (firstFixMs.current === null && startedAt.current !== null) {
          firstFixMs.current = Date.now() - startedAt.current;
          append(setLog, `FIRST FIX after ${(firstFixMs.current / 1000).toFixed(1)} s`);
        }
        setFixes((n) => n + 1);
        setLast(fix);
      }),
      addListener("onProviderEnabled", (e) => append(setLog, `provider enabled=${e.enabled}`)),
      addListener("onNoFixTimeout", (e) =>
        append(setLog, `NO FIX for ${Math.round(e.sinceLastFixMs / 1000)} s`),
      ),
      addListener("onError", (e) => append(setLog, `ERROR ${e.code}: ${e.message}`)),
    ];
    return () => {
      for (const s of subs) s.remove();
    };
  }, []);

  if (!__DEV__) return null;

  return (
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <Button
          size="$3"
          circular
          chromeless
          onPress={() => router.back()}
          icon={<ChevronLeft size={24} color="$text" />}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        />
        <Text fontSize={20} fontWeight="700" color="$text">
          GPS harness
        </Text>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card p="$4" gap="$2">
          <Text fontSize="$4" fontWeight="700" color="$text">
            module: {isAvailable() ? "linked" : "ABSENT"} · provider:{" "}
            {hasGpsProvider() ? "yes" : "NO"}
          </Text>
          <Text fontSize="$6" fontWeight="700" color="$text">
            {fixes} fixes
          </Text>
          {last ? (
            <Paragraph fontSize="$2" color="$textSecondary">
              {last.lat.toFixed(5)}, {last.lon.toFixed(5)} · ±{Math.round(last.acc)} m ·{" "}
              {last.distFromPrev.toFixed(1)} m from previous · ele{" "}
              {last.ele === null ? "—" : `${Math.round(last.ele)} m`} · speed{" "}
              {last.speed === null ? "—" : `${last.speed.toFixed(1)} m/s`}
            </Paragraph>
          ) : (
            <Paragraph fontSize="$2" color="$textSecondary">
              no fix yet
            </Paragraph>
          )}
        </Card>

        <Card p="$4" gap="$3">
          <AppButton
            variant="secondary"
            onPress={() => {
              requestPermission()
                .then((r) => say(`permission ${r.status} granted=${r.granted}`))
                .catch((e: unknown) => say(`permission threw ${String(e)}`));
            }}
          >
            Ask permission
          </AppButton>
          <AppButton
            onPress={() => {
              startedAt.current = Date.now();
              firstFixMs.current = null;
              setFixes(0);
              setLast(null);
              const ok = start({ notification: NOTIFICATION, maxSpeedMs: 25 });
              setRunning(ok);
              say(`start() -> ${ok}`);
            }}
          >
            Start tracking
          </AppButton>
          <AppButton
            variant="secondary"
            onPress={() => {
              stop();
              setRunning(false);
              say("stop()");
            }}
          >
            Stop
          </AppButton>
          <Text fontSize="$2" color="$textSecondary">
            {running ? "service should be running — check the notification" : "stopped"}
          </Text>
        </Card>

        <Card p="$4" gap="$2">
          <Text fontSize="$3" fontWeight="700" color="$text">
            events
          </Text>
          {log.map((line) => (
            <Text key={line} fontSize={11} color="$textSecondary">
              {line}
            </Text>
          ))}
        </Card>
      </RNScrollView>
    </YStack>
  );
}
