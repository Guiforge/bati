import { Image } from "expo-image";
import { useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import type { ArtSource } from "@/constants/assetMap";
import { getExerciseLoop } from "@/constants/assetMap";
import type { ExerciseLoop as ExerciseLoopData } from "@/constants/exerciseFrames";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The movement as a hard-cut loop, or its still when it has none.
 *
 * Every frame stays mounted and the shown one is the only opaque one: swapping a single image's
 * source decodes on the JS side and flashes on Android, flipping opacity does not. Reduced motion
 * and a screen that is not focused (tabs stay mounted) get the still and no timer.
 */
type Props = {
  imagePath: string;
  still: ArtSource;
  /** Square side in dp. */
  side: number;
  radius?: number;
  transition?: number;
};

function Still({ still, side, radius = 0, transition }: Props) {
  return (
    <Image
      source={still}
      style={{ width: side, height: side, borderRadius: radius }}
      contentFit="cover"
      transition={transition}
    />
  );
}

export function ExerciseLoop(props: Props) {
  const loop = getExerciseLoop(props.imagePath);
  const reducedMotion = useReducedMotion();
  // Split so the focus hook only runs for a movement that has a loop to play.
  return loop && !reducedMotion ? <Playing {...props} loop={loop} /> : <Still {...props} />;
}

function Playing({ side, radius = 0, loop, ...rest }: Props & { loop: ExerciseLoopData }) {
  const focused = useIsFocused();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!focused) return;
    const ms = loop.steps[step]?.[1] ?? 500;
    const id = setTimeout(() => setStep((s) => (s + 1) % loop.steps.length), ms);
    return () => clearTimeout(id);
  }, [focused, loop, step]);

  if (!focused) return <Still {...rest} side={side} radius={radius} />;
  const shown = loop.steps[step]?.[0] ?? 0;
  return (
    <View
      testID="exercise-loop"
      style={{ width: side, height: side, borderRadius: radius, overflow: "hidden" }}
    >
      {loop.frames.map((frame, i) => (
        <Image
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of frames, never reordered
          key={i}
          source={frame}
          style={{ position: "absolute", width: side, height: side, opacity: i === shown ? 1 : 0 }}
          contentFit="cover"
        />
      ))}
    </View>
  );
}
