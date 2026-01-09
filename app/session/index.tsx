import { Redirect } from "expo-router";
import { useSessionStore } from "@/src/stores/session";

export default function SessionIndex() {
  const status = useSessionStore((s) => s.status);

  if (status === "idle") return <Redirect href="/(tabs)" />;
  if (status === "countdown") return <Redirect href="/session/countdown" />;
  if (status === "resting") return <Redirect href="/session/rest" />;
  if (status === "finished") return <Redirect href="/session/victory" />;

  // running / paused
  return <Redirect href="/session/exercise" />;
}
