// The map's small painted creatures, drawn (creatures.ts is the pure side). Each is a sheet of
// frames side by side (assets/images/village/iso/creatures/*_bande*.webp, baked day and night as the
// mice and props before them): one node moves it, one slides the sheet by whole frames from the
// ambient clock, no React render per frame. Under reduced motion (or without a clock) each is a
// plain still image in its rest pose. Never a tap target, never read aloud. The village goes quiet
// while an upgrade is revealed (RevelationContext): nothing is mounted then.

import { Image } from "expo-image";
import { useContext } from "react";
import { View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";
import type { BuildingCode } from "@/db/schema";
import {
  chatLe,
  chatSurMur,
  type Espece,
  marche,
  type Pas,
  type Pt,
  perchoirDe,
  souffle,
  surLeMur,
  TAILLES,
  tronconDuChat,
  visite,
  visiteLe,
} from "./creatures";
import { useMouvementReduit } from "./fige";
import { HorlogeContext } from "./horloge";
import { troncons } from "./isoLayout";
import { type Ambiance, type Stade, vieDe } from "./isoSpec";
import { OmbreContact } from "./OmbreContact";
import { RevelationContext } from "./revelation";
import { useJour } from "./useMarcheurs";

const DOSSIER = {
  souris: {
    jour: require("@/assets/images/village/iso/creatures/mouse_bande.webp"),
    nuit: require("@/assets/images/village/iso/creatures/mouse_bande.nuit.webp"),
  },
  chat: {
    jour: require("@/assets/images/village/iso/creatures/cat_bande.webp"),
    nuit: require("@/assets/images/village/iso/creatures/cat_bande.nuit.webp"),
  },
  oiseau: {
    jour: require("@/assets/images/village/iso/creatures/bird_bande.webp"),
    nuit: require("@/assets/images/village/iso/creatures/bird_bande.nuit.webp"),
  },
  dragon: {
    jour: require("@/assets/images/village/iso/creatures/dragon_sleep.webp"),
    nuit: require("@/assets/images/village/iso/creatures/dragon_sleep.nuit.webp"),
  },
} as const;

/** Frames of a sheet: the dragon is one image. */
const IMAGES: Record<Espece, number> = { souris: 3, chat: 3, oiseau: 3, dragon: 1 };
/** Width of the contact oval under its feet, dp (none for a bird: it flies). */
const OMBRE: Record<Espece, number> = { souris: 11, chat: 14, oiseau: 0, dragon: 44 };

const source = (espece: Espece, lumiere: Ambiance) =>
  DOSSIER[espece][lumiere === "nuit" ? "nuit" : "jour"];

const posee = (x: number, y: number, l: number, h: number) =>
  ({ position: "absolute", left: x - l / 2, top: y - h, width: l, height: h }) as const;

/** A creature at rest: a still image of its sheet's frame `image`, feet at (x, y). */
function Immobile({
  espece,
  lumiere,
  pied,
  image,
  sens = 1,
  testID,
}: {
  espece: Espece;
  lumiere: Ambiance;
  pied: Pt;
  image: number;
  sens?: 1 | -1;
  testID: string;
}) {
  const { l, h } = TAILLES[espece];
  return (
    <View
      pointerEvents="none"
      testID={testID}
      style={[posee(pied[0], pied[1], l, h), { transform: [{ scaleX: sens }] }]}
    >
      <OmbreContact x={l / 2} y={h} largeur={OMBRE[espece]} />
      <View style={{ width: l, height: h, overflow: "hidden" }}>
        <Image
          source={source(espece, lumiere)}
          contentFit="fill"
          style={{
            width: l * IMAGES[espece],
            height: h,
            transform: [{ translateX: -l * image }],
          }}
        />
      </View>
    </View>
  );
}

/** A creature that moves with the clock: `pas` (a worklet of creatures.ts) says where and which frame. */
function Vivante({
  espece,
  lumiere,
  horloge,
  pas,
  testID,
}: {
  espece: Espece;
  lumiere: Ambiance;
  horloge: SharedValue<number>;
  pas: (c: number) => Pas;
  testID: string;
}) {
  const { l, h } = TAILLES[espece];
  const p = useDerivedValue(() => pas(horloge.get()));
  const place = useAnimatedStyle(() => {
    const v = p.get();
    return {
      opacity: v.opacite,
      transform: [{ translateX: v.x - l / 2 }, { translateY: v.y - h }, { scaleX: v.sens }],
    };
  });
  const bande = useAnimatedStyle(() => ({ transform: [{ translateX: -l * p.get().image }] }));
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[{ position: "absolute", left: 0, top: 0, width: l, height: h }, place]}
    >
      <OmbreContact x={l / 2} y={h} largeur={OMBRE[espece]} />
      <View style={{ width: l, height: h, overflow: "hidden" }}>
        <Animated.View
          testID={`${testID}-bande`}
          style={[{ width: l * IMAGES[espece], height: h }, bande]}
        >
          <Image
            source={source(espece, lumiere)}
            contentFit="fill"
            style={{ width: l * IMAGES[espece], height: h }}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** A mouse of a station: it walks between its waypoints and pauses. */
export function Souris({
  id,
  sel,
  pts,
  present,
  lumiere = "nuit",
}: {
  id: string;
  sel: number;
  pts: readonly Pt[];
  present: boolean;
  lumiere?: Ambiance;
}) {
  const horloge = useContext(HorlogeContext);
  const reduit = useMouvementReduit();
  const jour = useJour();
  if (useContext(RevelationContext)) return null;
  const testID = `iso-creature-souris-${id}`;
  const premier = pts[0];
  if (!premier) return null;
  if (reduit || !horloge)
    return present ? (
      <Immobile espece="souris" lumiere={lumiere} pied={premier} image={2} testID={testID} />
    ) : null;
  return (
    <Vivante
      espece="souris"
      lumiere={lumiere}
      horloge={horloge}
      pas={(c) => {
        "worklet";
        const m = marche(c, jour, sel, pts);
        return present ? m : { ...m, opacite: 0 };
      }}
      testID={testID}
    />
  );
}

/** The cat of the day, on the top of the stretch of wall it lives on (rendered right after the wall in the depth order). */
export function ChatRempart({
  troncon,
  cases,
  stade,
  lumiere = "nuit",
}: {
  troncon: number;
  cases: readonly (readonly [number, number])[];
  stade: Stade;
  lumiere?: Ambiance;
}) {
  const horloge = useContext(HorlogeContext);
  const reduit = useMouvementReduit();
  const jour = useJour();
  if (useContext(RevelationContext)) return null;
  if (cases.length < 2 || !chatSurMur(stade) || tronconDuChat(jour, troncons.length) !== troncon)
    return null;
  const pts = surLeMur(cases);
  const premier = pts[0];
  if (!premier) return null;
  const testID = "iso-creature-chat-rempart";
  const present = chatLe(jour);
  if (reduit || !horloge)
    return present ? (
      <Immobile espece="chat" lumiere={lumiere} pied={premier} image={2} testID={testID} />
    ) : null;
  return (
    <Vivante
      espece="chat"
      lumiere={lumiere}
      horloge={horloge}
      pas={(c) => {
        "worklet";
        const m = marche(c, jour, 4, pts);
        return present ? m : { ...m, opacite: 0 };
      }}
      testID={testID}
    />
  );
}

/**
 * A bird of a roof (creatures.ts `visite`): it comes in from the sky, stays, goes. By day only
 * (isoSpec.json `oiseaux`). Hidden with its building while a growth plays. Under reduced motion it
 * sits on the roof for the days that have a visit.
 */
export function OiseauToit({
  code,
  stade,
  masque = false,
  ambiance = "nuit",
  lumiere = "nuit",
}: {
  code: BuildingCode;
  stade: Stade;
  masque?: boolean;
  ambiance?: Ambiance;
  lumiere?: Ambiance;
}) {
  const horloge = useContext(HorlogeContext);
  const reduit = useMouvementReduit();
  const jour = useJour();
  if (useContext(RevelationContext)) return null;
  const perche = vieDe(lumiere).oiseaux ? perchoirDe(code, stade, ambiance) : null;
  if (!perche || masque) return null;
  const sel = 10 + code.charCodeAt(0);
  const testID = `iso-creature-oiseau-${code}`;
  if (reduit || !horloge)
    return visiteLe(jour, sel, 0) ? (
      <Immobile
        espece="oiseau"
        lumiere={lumiere}
        pied={perche}
        image={2}
        sens={visite(0, jour, sel, perche).sens}
        testID={testID}
      />
    ) : null;
  return (
    <Vivante
      espece="oiseau"
      lumiere={lumiere}
      horloge={horloge}
      pas={(c) => {
        "worklet";
        return visite(c, jour, sel, perche);
      }}
      testID={testID}
    />
  );
}

/** The sleeping dragon of the mythic lair: still, but for its slow breath (+3 %, pivot at its feet). */
export function DragonEndormi({ pied, lumiere = "nuit" }: { pied: Pt; lumiere?: Ambiance }) {
  const horloge = useContext(HorlogeContext);
  const reduit = useMouvementReduit();
  const { l, h } = TAILLES.dragon;
  const respire = useAnimatedStyle(() => {
    const s = horloge ? souffle(horloge.get()) : 1;
    // Scaled about its feet: up to the middle, scale, back down.
    return { transform: [{ translateY: h / 2 }, { scale: s }, { translateY: -h / 2 }] };
  });
  if (useContext(RevelationContext)) return null;
  const testID = "iso-creature-dragon";
  if (reduit || !horloge)
    return <Immobile espece="dragon" lumiere={lumiere} pied={pied} image={0} testID={testID} />;
  return (
    <View pointerEvents="none" style={posee(pied[0], pied[1], l, h)}>
      <OmbreContact x={l / 2} y={h} largeur={OMBRE.dragon} />
      <Animated.View testID={testID} style={[{ width: l, height: h }, respire]}>
        <Image
          source={source("dragon", lumiere)}
          contentFit="fill"
          style={{ width: l, height: h }}
        />
      </Animated.View>
    </View>
  );
}
