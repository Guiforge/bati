import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { YStack } from "tamagui";
import { Recitatif } from "@/components/common/Recitatif";
import { Ember } from "@/components/village/VillageEmbers";
import { getVillageTierAsset } from "@/constants/assetMap";
import { chimneyAnchor, hamletHold } from "@/constants/onboarding";
import { fade, rawColors } from "@/constants/rawColors";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** How dark the hamlet sits before it has a name. Ink over the art: it darkens, never repaints. */
const VEIL = 0.6;
/** Under this height there is no plate to caption. */
const MIN_PLATE = 60;
/** The beat before the light comes, long enough for the stack transition to finish. */
const BEAT_MS = 600;
/** The same sweep the victory gauge takes. */
const LIFT_MS = 900;

/** Four motes off the one chimney, each a single climb: nothing here loops (perf audit C7). */
const MOTES = [
  { dx: 0, size: 4, duration: 4600, delay: BEAT_MS + 500 },
  { dx: 6, size: 3, duration: 5400, delay: BEAT_MS + 1300 },
  { dx: -4, size: 3, duration: 5000, delay: BEAT_MS + 2200 },
  { dx: 4, size: 4, duration: 5600, delay: BEAT_MS + 3200 },
] as const;

/**
 * The first panel of the album: the hamlet at night, and the moment it gets a name.
 *
 * Until now the first thing the app gave a new hero was the victory screen, four to eight minutes
 * in (docs/design/audits/2026-10-11-onboarding.md, I1). This is a welcome, not a reward, so it
 * carries no gold on text, no figure and no kicker: while the name is valid the ink veil lifts
 * off the painting, its own window and chimney being the one warm light, a few embers leave the
 * chimney, and the name is set on the art in the caption box Home and Victory use. An invalid
 * name lets the veil fall back, so "naming it lights the fire" is literal in the state. A hero with
 * a soft keyboard does not watch it fall: the band is folded away while the field is empty.
 *
 * It costs no time: nothing here gates the button, and a hero who taps at once just leaves.
 * Under reduced motion the first frame is the last one, and no ember is mounted.
 */
export function FirstFire({ name, lit }: { name: string; lit: boolean }) {
  const reducedMotion = useReducedMotion();
  const [band, setBand] = useState<{ width: number; height: number } | null>(null);
  const veil = useSharedValue(reducedMotion && lit ? 0 : VEIL);

  useEffect(() => {
    if (reducedMotion) {
      veil.value = lit ? 0 : VEIL;
      return;
    }
    veil.value = lit
      ? withDelay(BEAT_MS, withTiming(0, { duration: LIFT_MS }))
      : withTiming(VEIL, { duration: 300 });
  }, [lit, reducedMotion, veil]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));

  // The caption waits for the light the first time only. A name typed later lands at once: the
  // painting is already lit, and a second and a half of nothing read as a lost keystroke.
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setArrived(true), BEAT_MS + LIFT_MS);
    return () => clearTimeout(id);
  }, []);

  const heldAt = band ? hamletHold(band.width, band.height) : null;
  const anchor = band && heldAt !== null ? chimneyAnchor(band.width, band.height, heldAt) : null;

  return (
    <YStack testID="onboarding-first-fire" flex={1} minH={0}>
      <YStack
        flex={1}
        overflow="hidden"
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setBand({ width, height });
        }}
      >
        {/* Once the band is measured: where the painting is held depends on its height. */}
        {heldAt !== null ? (
          <Image
            source={getVillageTierAsset(1)}
            style={{ position: "absolute", width: "100%", height: "100%" }}
            contentFit="cover"
            contentPosition={{ top: `${heldAt * 100}%`, left: "50%" }}
          />
        ) : null}
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
            { backgroundColor: rawColors.bgDark },
            veilStyle,
          ]}
        />

        {/* The painting melts into the ink above and below it rather than ending on an edge. */}
        <LinearGradient
          pointerEvents="none"
          colors={[rawColors.bgDark, fade(rawColors.bgDark, 0)]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[fade(rawColors.bgDark, 0), rawColors.bgDark]}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 28 }}
        />

        {/* Off the chimney only, and only while it is in the band: a large font can fold it away.
            Over the ink fade, not under it: the chimney stands near the top of the band, and
            under the fade a mote was out before anyone saw it. */}
        {lit && !reducedMotion && band && anchor
          ? MOTES.map((mote) => (
              <Ember
                key={mote.delay}
                left={(anchor.x + mote.dx) / band.width}
                start={anchor.y / band.height}
                size={mote.size}
                duration={mote.duration}
                delay={mote.delay}
                heroWidth={band.width}
                heroHeight={band.height}
                peak={0.9}
              />
            ))
          : null}
      </YStack>

      {/* Not on a band the keyboard has folded away: the caption would land on the title. */}
      {lit && band && band.height >= MIN_PLATE ? (
        <Animated.View
          entering={
            reducedMotion ? undefined : FadeIn.delay(arrived ? 0 : BEAT_MS + LIFT_MS).duration(150)
          }
          // Astride the foot of the plate, outside its clip: at any length the name stays under
          // the lit window instead of over it.
          style={{ position: "absolute", left: 16, maxWidth: "80%", bottom: -6 }}
        >
          {/* One line that shrinks to fit, never two: a second line climbed over the window. The
              field below shows the same name at full scale. */}
          <Recitatif
            testID="onboarding-village-caption"
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.15}
          >
            {name}
          </Recitatif>
        </Animated.View>
      ) : null}
    </YStack>
  );
}
