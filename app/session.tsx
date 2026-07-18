import { useKeepAwake } from "expo-keep-awake";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { BackHandler } from "react-native";
import { YStack } from "tamagui";
import { ActiveExerciseView } from "@/components/session/ActiveExerciseView";
import { BossTauntOverlay } from "@/components/session/BossTauntOverlay";
import { CountdownView } from "@/components/session/CountdownView";
import { PausedOverlay } from "@/components/session/PausedOverlay";
import { RestView } from "@/components/session/RestView";
import { VictoryView } from "@/components/session/VictoryView";
import { useSessionStore } from "@/stores/session";

export default function SessionScreen() {
  // Prevent screen from dimming during workout
  useKeepAwake();

  const status = useSessionStore((s) => s.status);
  const prePauseStatus = useSessionStore((s) => s.prePauseStatus);
  const quest = useSessionStore((s) => s.quest);
  const pauseSession = useSessionStore((s) => s.pauseSession);

  // Handle Android Hardware Back Button
  useEffect(() => {
    const onBackPress = () => {
      if (status === "countdown" || status === "running" || status === "resting") {
        pauseSession();
        return true; // Prevent default behavior (exit)
      }
      // If already paused or finished, allow back button to work (or let the overlay handle navigation)
      return false;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [status, pauseSession]);

  // Safety check: Redirect if no active quest (e.g. user navigated here manually or reload)
  // We allow "finished" status to stay so the Victory screen persists.
  if (!quest && status !== "finished") {
    return <Redirect href="/" />;
  }

  // Determine what to show underneath the overlay if paused
  const displayStatus = status === "paused" ? prePauseStatus : status;

  return (
    <YStack flex={1} bg="$background">
      <BossTauntOverlay />
      {displayStatus === "countdown" && <CountdownView />}
      {displayStatus === "running" && <ActiveExerciseView />}
      {displayStatus === "resting" && <RestView />}
      {status === "finished" && <VictoryView />}

      {/* Overlay sits on top of the active view when paused */}
      <PausedOverlay />
    </YStack>
  );
}
