import { type AudioPlayer, type AudioSource, createAudioPlayer } from "expo-audio";
import { useEffect, useRef } from "react";
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
    } catch (_error) {}
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
