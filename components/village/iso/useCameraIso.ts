// The iso map's camera: pan, pinch, double-tap and tap on shared values, so a gesture re-renders
// nothing. Nothing runs at rest: the only animations are the finger-lift decay and the re-frame
// timing, both of which end by themselves (and neither runs with reduced motion).

import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  type NativeGesture,
  useExclusiveGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from "react-native-gesture-handler";
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AlentoursContext, cadreSerre } from "./alentours";
import {
  CROISSANCE_CAMERA_MS,
  cadrage,
  cadrageComplet,
  emprise,
  HAUTEUR,
  LARGEUR,
  type Vue,
} from "./carteDemo";
import { cleDetail, type Detail, detailDe, palierDe } from "./detail";
import { useMouvementReduit } from "./fige";
import {
  bornesPan,
  carteDepuisEcran,
  limitesDe,
  ramener,
  vueApresRedimension,
  zoomerAutour,
} from "./navigation";
import { GLISSE_MS, SECOUSSE_MS, SECOUSSE_PX } from "./revelation";

/** What a camera leaves behind on unmount, so the map remounted elsewhere (a rotation) looks where it did. */
export type MemoireCamera = { ile: string; cadre: Vue; vue: Vue };

/** The camera must rest this long before the sprites are re-decoded. */
const DETAIL_REPOS_MS = 150;
const INERTIE = 0.985;
const RECADRAGE_MS = 220;
/** dp a finger travels before the pan takes over, so a tap is never read as a drag. */
const SEUIL_PAN = 8;

export function useCameraIso({
  visible,
  w,
  h,
  zmin,
  zmax,
  bloque,
  margeBas = 0,
  onTap,
  onToucher,
  onMain,
  memoire,
  vueDepart,
  sansDouble = false,
}: {
  visible: readonly (readonly boolean[])[];
  w: number;
  h: number;
  zmin: number;
  zmax: number;
  /** The page's scroll gesture: a touch that starts on the map is the map's until its pan fails. */
  bloque?: NativeGesture;
  /** Height at the bottom the framing leaves free (a title laid over the map): the island is centred above it. */
  margeBas?: number;
  /** A single tap, in dp from the area's top left. Runs on the JS thread. */
  /** `vue` reads the view as it is now: the callback cannot name the camera it is a part of. */
  onTap?: (x: number, y: number, vue: () => Vue) => void;
  /**
   * A touch of the map begins (worklet): the ambient clock starts a wave. With the finger's place
   * on the map in dp when the touch is the pan's (a pinch has none).
   */
  onToucher?: (x?: number, y?: number) => void;
  /** A drag or a pinch took hold (not a tap: a pan activates past SEUIL_PAN): the hand has the camera. */
  onMain?: () => void;
  /** Kept by the owner across remounts: the view is restored from it, and written back on unmount. */
  memoire?: { current: MemoireCamera | undefined };
  /** The opening frame, instead of the island's own (a capture of one building alone). */
  vueDepart?: Vue;
  /** No double tap (a growth scene plays): the single tap is read at the touch-up, not 500 ms late. */
  sansDouble?: boolean;
}) {
  const serre = cadreSerre(useContext(AlentoursContext));
  const libre = cadrage(visible, w, h - margeBas, serre);
  const cadre = vueDepart ?? { ...libre, y: libre.y - margeBas / 2 };
  // The floor stays the whole-island fit, whatever the opening frame.
  const ajuste = cadrageComplet(visible, w, h - margeBas);
  // A remount (the map changes side on a rotation) is restored from `memoire` in a layout effect
  // below: at render time the old map, unmounted in the same commit, has not written it yet.
  const zoom = useSharedValue(cadre.zoom);
  const x = useSharedValue(cadre.x);
  const y = useSharedValue(cadre.y);
  const reducedMotion = useMouvementReduit();
  const pinceActif = useSharedValue(false);
  // The impact's shake, vertical px, added to the translation of the land and the island alike.
  const secousse = useSharedValue(0);
  // A `vers` is in flight: a bare touch-down must not cancel it (the scene's return, started between
  // the finger's down and up, stayed where it was); only a drag or a pinch takes the camera.
  const enVol = useSharedValue(false);

  // The sprites' level of detail (detail.ts): the UI thread compares numbers, React hears of a
  // change once the camera has stood still for DETAIL_REPOS_MS (a pan's inertia, `vers`, the growth
  // framing and a double tap move it for a while; none re-renders the map on the way).
  const [detail, setDetail] = useState<Detail>({
    palier: palierDe(cadre.zoom, 0, false),
    zone: null,
  });
  const cleUI = useSharedValue(detail.palier * 1e6);
  const minuteur = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const poserDetail = (cle: number, z: number) => {
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => setDetail(detailDe(cle, z, w, h)), DETAIL_REPOS_MS);
  };
  useEffect(() => () => clearTimeout(minuteur.current), []);
  useAnimatedReaction(
    () =>
      pinceActif.get()
        ? cleUI.get()
        : cleDetail(zoom.get(), x.get(), y.get(), w, h, cleUI.get() / 1e6),
    (cle) => {
      if (cle === cleUI.get()) return;
      cleUI.set(cle);
      scheduleOnRN(poserDetail, cle, zoom.get());
    },
  );

  const ile = emprise(visible) ?? { x0: 0, x1: 0, y0: 0, y1: 0 };
  // The zoom floor never rises above the framing, so the whole island can always be seen.
  const limites = limitesDe(
    ile,
    { largeur: LARGEUR, hauteur: HAUTEUR },
    { w, h },
    { min: zmin, max: zmax, cadre: ajuste.zoom },
  );

  const poser = (v: Vue) => {
    cancelAnimation(zoom);
    cancelAnimation(x);
    cancelAnimation(y);
    zoom.set(v.zoom);
    x.set(v.x);
    y.set(v.y);
  };

  // A new island frames again. A new area (a rotation, a title that grows) keeps the point looked at
  // and the zoom, held inside the new limits; an untouched view takes the new framing. The key is the
  // island's box, not its cell count: two islands of the same size still differ.
  const cleIle = `${ile.x0},${ile.x1},${ile.y0},${ile.y1}`;
  const cle = `${w}x${h}:${margeBas}:${cleIle}`;
  const precedent = useRef<{ ile: string; cadre: Vue } | undefined>(undefined);
  // Layout effects, both: in a commit that moves the map, React runs the old map's layout cleanup
  // (which writes `memoire`) before the new map's layout effects (which read it), all before paint.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `cle` stands for the island and the area
  useLayoutEffect(() => {
    const ici = precedent.current;
    const p = ici ?? memoire?.current;
    const v = ici ? { zoom: zoom.get(), x: x.get(), y: y.get() } : memoire?.current?.vue;
    poser(p && v && p.ile === cleIle ? vueApresRedimension(v, p.cadre, cadre, limites) : cadre);
    precedent.current = { ile: cleIle, cadre };
  }, [cle]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: written once, on unmount
  useLayoutEffect(
    () => () => {
      const p = precedent.current;
      if (memoire && p)
        memoire.current = { ...p, vue: { zoom: zoom.get(), x: x.get(), y: y.get() } };
    },
    [],
  );

  // Brings the camera to `v` (held inside the limits): a short timing, none with reduced motion.
  const vers = (v: Vue) => {
    const c = ramener(v, limites);
    cancelAnimation(zoom);
    cancelAnimation(x);
    cancelAnimation(y);
    const cfg = {
      duration: reducedMotion ? 0 : CROISSANCE_CAMERA_MS,
      easing: Easing.inOut(Easing.cubic),
    };
    enVol.set(true);
    zoom.set(withTiming(c.zoom, cfg));
    x.set(withTiming(c.x, cfg));
    // A cancelled animation says `false`: the hand that cancelled it clears the flag itself.
    y.set(
      withTiming(c.y, cfg, (fini) => {
        "worklet";
        if (fini) enVol.set(false);
      }),
    );
  };
  const prendre = () => {
    "worklet";
    enVol.set(false);
    cancelAnimation(zoom);
    cancelAnimation(x);
    cancelAnimation(y);
  };

  // The impact of a stage rising (bible §10.7): 3 px over 120 ms, then a slide toward the building
  // (ease-out, 500 ms). Neither plays with reduced motion.
  const secouer = () => {
    if (reducedMotion) return;
    secousse.set(
      withSequence(
        withTiming(SECOUSSE_PX, { duration: SECOUSSE_MS / 4 }),
        withTiming(-SECOUSSE_PX, { duration: SECOUSSE_MS / 2 }),
        withTiming(0, { duration: SECOUSSE_MS / 4 }),
      ),
    );
  };
  const glisser = (v: Vue) => {
    if (reducedMotion) return;
    const c = ramener(v, limites);
    const cfg = { duration: GLISSE_MS, easing: Easing.out(Easing.cubic) };
    zoom.set(withTiming(c.zoom, cfg));
    x.set(withTiming(c.x, cfg));
    y.set(withTiming(c.y, cfg));
  };

  const pan = usePanGesture({
    testID: "iso-geste-pan",
    minDistance: SEUIL_PAN,
    // The page's scroll waits for this pan to fail, from the first touch: a relation handled
    // natively, where a `scrollEnabled` prop write cost a Fabric commit per drag.
    block: bloque,
    onBegin: (ev) => {
      "worklet";
      // Where the finger lands on the map, for what a touch near startles (the roof crows).
      const p =
        ev && Number.isFinite(ev.x) && Number.isFinite(ev.y)
          ? carteDepuisEcran(
              [ev.x, ev.y],
              { zoom: zoom.get(), x: x.get(), y: y.get() },
              { w, h },
              { largeur: LARGEUR, hauteur: HAUTEUR },
            )
          : null;
      onToucher?.(p?.[0], p?.[1]);
      // The zoom too: a re-framing left zooming once its shift stopped slides the view off the finger.
      if (enVol.get()) return;
      cancelAnimation(zoom);
      cancelAnimation(x);
      cancelAnimation(y);
    },
    onActivate: () => {
      "worklet";
      prendre();
      if (onMain) scheduleOnRN(onMain);
    },
    onUpdate: (ev) => {
      "worklet";
      const v = ramener(
        { zoom: zoom.get(), x: x.get() + ev.changeX, y: y.get() + ev.changeY },
        limites,
      );
      x.set(v.x);
      y.set(v.y);
    },
    onDeactivate: (ev) => {
      "worklet";
      if (reducedMotion) return;
      const b = bornesPan(zoom.get(), limites);
      x.set(withDecay({ velocity: ev.velocityX, deceleration: INERTIE, clamp: [b.xMin, b.xMax] }));
      y.set(withDecay({ velocity: ev.velocityY, deceleration: INERTIE, clamp: [b.yMin, b.yMax] }));
    },
  });
  const pinch = usePinchGesture({
    testID: "iso-geste-pinch",
    onBegin: () => {
      "worklet";
      onToucher?.();
      prendre();
      if (onMain) scheduleOnRN(onMain);
      pinceActif.set(true);
    },
    onUpdate: (ev) => {
      "worklet";
      const v = zoomerAutour(
        { zoom: zoom.get(), x: x.get(), y: y.get() },
        { x: ev.focalX - w / 2, y: ev.focalY - h / 2 },
        ev.scaleChange,
        limites,
      );
      zoom.set(v.zoom);
      x.set(v.x);
      y.set(v.y);
    },
    onFinalize: () => {
      "worklet";
      pinceActif.set(false);
    },
  });
  const auToucher = useRef<Vue | undefined>(undefined);
  const duree = reducedMotion ? 0 : RECADRAGE_MS;
  const vueActuelle = (): Vue => ({ zoom: zoom.get(), x: x.get(), y: y.get() });
  const doubleTap = useTapGesture({
    testID: "iso-geste-double",
    enabled: !sansDouble,
    maxDistance: SEUIL_PAN,
    numberOfTaps: 2,
    onDeactivate: () => {
      "worklet";
      zoom.set(withTiming(cadre.zoom, { duration: duree }));
      x.set(withTiming(cadre.x, { duration: duree }));
      y.set(withTiming(cadre.y, { duration: duree }));
    },
  });
  // Waits for the double tap to fail: a single tap is read one beat late, never twice.
  const tap = useTapGesture({
    testID: "iso-geste-tap",
    maxDistance: SEUIL_PAN,
    runOnJS: true,
    // The view is kept at the touch: the tap is read one beat late, and a camera still moving (the
    // opening scene) would answer for a point the finger did not touch (T38).
    onBegin: () => {
      auToucher.current = vueActuelle();
    },
    onDeactivate: (ev) => {
      const v = auToucher.current ?? vueActuelle();
      auToucher.current = undefined;
      onTap?.(ev.x, ev.y, () => v);
    },
  });

  return {
    gestes: useSimultaneousGestures(pan, pinch, useExclusiveGestures(doubleTap, tap)),
    style: useAnimatedStyle(() => ({
      transform: [
        { translateX: x.get() },
        { translateY: y.get() + secousse.get() },
        { scale: zoom.get() },
      ],
    })),
    // The land around the island lies in map space (monde.ts): it takes the camera's own transform.
    fond: useAnimatedStyle(() => ({
      transform: [
        { translateX: x.get() },
        { translateY: y.get() + secousse.get() },
        { scale: zoom.get() },
      ],
    })),
    /** The lowest zoom the camera allows: the world is laid out to cover the frame at it. */
    zmin: limites.zmin,
    vue: vueActuelle,
    /** The shared values themselves, for a reaction on the UI thread (the village sound). */
    suivi: { zoom, x, y },
    poser,
    vers,
    secouer,
    glisser,
    cadre,
    detail,
  };
}
