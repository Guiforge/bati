import { type AudioPlayer, type AudioSource, createAudioPlayer } from "expo-audio";
import { useEffect, useRef } from "react";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

export function useSound() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const playerRef = useRef<AudioPlayer | null>(null);

  function playSound(soundFile: AudioSource | null | undefined) {
    if (!soundEnabled || !soundFile) return;

    try {
      // Release previous player if any
      if (playerRef.current) {
        playerRef.current.release();
      }

      const player = createAudioPlayer(soundFile);
      playerRef.current = player;
      player.play();
    } catch (error) {
      // A sound that will not decode must never take the session down with it — but it should
      // not vanish either, or "the app went quiet" has nowhere to start.
      reportError("sound.play", error);
    }
  }

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.release();
      }
    };
  }, []);

  return { playSound };
}
