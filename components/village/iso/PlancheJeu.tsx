// FIN-MAG tour 0: plays a painted sprite sheet (planche.ts) in one animated node. A view that clips
// and, inside it, one expo-image the size of the whole sheet slid by translate from drawing to
// drawing. The only node Reanimated sees is that image: a transform, nothing else, so a frame
// that keeps the same drawing commits nothing. The layout size is one constant (the sheet's), the
// fade is painted in the drawings, no opacity on a parent view.
// Time: `t` (ms, a shared value the caller owns, as the reveal's) or, without one, the map's
// ambient clock modulo `boucle`. Nothing shows at rest (the sheet slides out of the clip). In
// reduced motion and in the frozen mode: no animated node, the sheet's one still drawing.

import { Image, type ImageSource } from "expo-image";
import { useContext } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useMouvementReduit } from "./fige";
import { HorlogeContext } from "./horloge";
import { decalage, dessinA, type Planche } from "./planche";

const AnimatedImage = Animated.createAnimatedComponent(Image);

export function PlancheJeu({
  source,
  planche,
  w,
  h,
  t,
  boucle,
  depart = 0,
  teinte,
  style,
  testID,
}: {
  source: ImageSource | number;
  planche: Planche;
  /** One drawing's size, dp. */
  w: number;
  h: number;
  /** Ms into the clip. Absent: the ambient clock, taken modulo `boucle`. */
  t?: SharedValue<number>;
  boucle?: number;
  /** The clip starts this many ms into `t` (the reveal's burst leaves when the new stage lands). */
  depart?: number;
  teinte?: string;
  style?: StyleProp<ViewStyle>;
  testID: string;
}) {
  const horloge = useContext(HorlogeContext);
  const reduit = useMouvementReduit();
  const temps = t ?? horloge;
  const anime = useAnimatedStyle(() => {
    const ms = temps ? temps.get() - depart : -1;
    const d = dessinA(boucle && ms >= 0 ? ms % boucle : ms, planche);
    const o = decalage(d, planche, w, h);
    return { transform: [{ translateX: o.x }, { translateY: o.y }] };
  });
  const taille = { width: planche.colonnes * w, height: planche.lignes * h } as const;
  const fixe = decalage(planche.fixe, planche, w, h);
  return (
    <View
      pointerEvents="none"
      testID={testID}
      style={[{ width: w, height: h, overflow: "hidden" }, style]}
    >
      {reduit ? (
        <Image
          source={source}
          tintColor={teinte}
          style={[taille, { transform: [{ translateX: fixe.x }, { translateY: fixe.y }] }]}
          testID={`${testID}-image`}
        />
      ) : (
        <AnimatedImage
          source={source}
          tintColor={teinte}
          style={[taille, anime]}
          testID={`${testID}-image`}
        />
      )}
    </View>
  );
}
