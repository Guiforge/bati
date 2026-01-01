import { Audio } from "expo-av";
import { useEffect, useState } from "react";
import { useSettingsStore } from "@/stores/settings";

export function useSound() {
  const { soundEnabled } = useSettingsStore();
  const [sound, setSound] = useState<Audio.Sound>();

  async function playSound(soundFile: unknown) {
    if (!soundEnabled || !soundFile) return;

    try {
      // Unload previous sound if any
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(soundFile);
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.log("Error playing sound", error);
    }
  }

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  return { playSound };
}
