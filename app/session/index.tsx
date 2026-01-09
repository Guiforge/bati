import { Redirect } from "expo-router";
import { useSessionStore } from "@/src/stores/session";

/**
 * Session Router - Single source of truth for session navigation
 *
 * This component reads the session status and redirects to the appropriate screen.
 * All session screens should redirect back here when status changes,
 * rather than navigating directly to other screens.
 */
export default function SessionIndex() {
  const status = useSessionStore((s) => s.status);
  const prePauseStatus = useSessionStore((s) => s.prePauseStatus);

  // No active session
  if (status === "idle") {
    return <Redirect href="/(tabs)" />;
  }

  // Session finished
  if (status === "finished") {
    return <Redirect href="/session/victory" />;
  }

  // Paused - redirect to the screen that was active before pause
  if (status === "paused") {
    if (prePauseStatus === "countdown") {
      return <Redirect href="/session/countdown" />;
    }
    if (prePauseStatus === "resting") {
      return <Redirect href="/session/rest" />;
    }
    // Default to exercise for running or unknown
    return <Redirect href="/session/exercise" />;
  }

  // Active states
  if (status === "countdown") {
    return <Redirect href="/session/countdown" />;
  }

  if (status === "resting") {
    return <Redirect href="/session/rest" />;
  }

  // Running
  return <Redirect href="/session/exercise" />;
}
