import type { File } from "expo-file-system";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { ChevronLeft } from "@/components/icons";
import { formatDistance, formatPace } from "@/constants/distanceFormat";
import {
  addListener,
  hasGpsProvider,
  isAvailable,
  type LocationFix,
  requestPermission,
  start,
  stop,
} from "@/modules/bati-location";
import { accept, EMPTY, type TrackState } from "@/src/gps/track";
import { FLUSH_EVERY, flushTrack, shareTrack, trackFileFor } from "@/src/gps/trackFile";
import { useSettingsStore } from "@/stores/settings";

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
  reached: "Goal reached",
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
  const [distanceM, setDistanceM] = useState(0);
  const [elapsedS, setElapsedS] = useState(0);
  const [track, setTrack] = useState<File | null>(null);
  const startedAt = useRef<number | null>(null);
  const firstFixMs = useRef<number | null>(null);
  // The recorded trace. Kept in a ref rather than state because it is appended once a second and
  // nothing renders it — only its length and the running distance do.
  const recorded = useRef<LocationFix[]>([]);
  const file = useRef<File | null>(null);
  const distance = useRef(0);
  // The filtered reading, folded from the same stream. Kept beside the raw one rather than
  // replacing it: the GPX keeps every point, so tomorrow's rules can be re-tuned against a real
  // run instead of against a run already filtered by today's guesses.
  const session = useRef<TrackState>(EMPTY);
  const [filtered, setFiltered] = useState<TrackState>(EMPTY);
  // The first consumer of the Settings row. Everything above stays in metres — this is the only
  // line in the file that knows the hero might read miles.
  const distanceUnit = useSettingsStore((state) => state.distanceUnit);

  const say = (line: string) => append(setLog, line);

  useEffect(() => {
    const subs = [
      addListener("onLocation", (fix) => {
        if (firstFixMs.current === null && startedAt.current !== null) {
          firstFixMs.current = Date.now() - startedAt.current;
          append(setLog, `FIRST FIX after ${(firstFixMs.current / 1000).toFixed(1)} s`);
        }
        recorded.current.push(fix);
        distance.current += fix.distFromPrev;
        setFixes(recorded.current.length);
        setDistanceM(distance.current);
        session.current = accept(session.current, fix);
        setFiltered(session.current);
        setLast(fix);
        if (startedAt.current !== null)
          setElapsedS(Math.round((Date.now() - startedAt.current) / 1000));
        // Written during the run, not at the end: the run is when the app can be killed.
        if (file.current && recorded.current.length % FLUSH_EVERY === 0) {
          flushTrack(file.current, recorded.current, distance.current);
        }
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
          <Text fontSize="$5" fontWeight="700" color="$text">
            raw {formatDistance(distanceM, distanceUnit)} · {Math.floor(elapsedS / 60)}:
            {String(elapsedS % 60).padStart(2, "0")}
          </Text>
          <Text fontSize="$5" fontWeight="700" color={filtered.paused ? "$textSecondary" : "$text"}>
            filtered {formatDistance(filtered.distanceM, distanceUnit)} ·{" "}
            {Math.floor(filtered.movingMs / 60000)}:
            {String(Math.floor(filtered.movingMs / 1000) % 60).padStart(2, "0")} ·{" "}
            {formatPace(filtered.distanceM, filtered.movingMs, distanceUnit)}
            {filtered.paused ? " · PAUSED" : ""}
          </Text>
          <Paragraph fontSize="$2" color="$textSecondary">
            {filtered.startedAt === null
              ? "start gate closed — waiting for accuracy under 10 m for 3 s"
              : `${filtered.points} points · ${filtered.segments} segment(s)`}
          </Paragraph>
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
              recorded.current = [];
              distance.current = 0;
              session.current = EMPTY;
              setFiltered(EMPTY);
              file.current = trackFileFor(startedAt.current);
              setTrack(file.current);
              setFixes(0);
              setDistanceM(0);
              setElapsedS(0);
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
              if (file.current) {
                flushTrack(file.current, recorded.current, distance.current);
                say(`stop() — ${recorded.current.length} fixes written to ${file.current.name}`);
              } else {
                say("stop()");
              }
            }}
          >
            Stop
          </AppButton>
          <Text fontSize="$2" color="$textSecondary">
            {running ? "service should be running — check the notification" : "stopped"}
          </Text>
          {track ? (
            <AppButton
              variant="secondary"
              onPress={() => {
                if (!file.current) return;
                flushTrack(file.current, recorded.current, distance.current);
                shareTrack(file.current).catch((e: unknown) => say(`share failed ${String(e)}`));
              }}
            >
              Share the GPX
            </AppButton>
          ) : null}
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
