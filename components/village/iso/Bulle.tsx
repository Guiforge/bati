// The comic bubble (bulle BD) of the iso scene (docs/design/components/village-bulle.md, T14): one
// shell for everything tapped on the map. A villager gets the parchment frame with an inked tail
// aimed at it, placed by `placerBulle`. A building gets the parchment panel docked on an edge of
// the screen in place of the title, with a warm halo on the building (direction C). Above 130 %
// text, in landscape, or with no room, the same content in the bottom sheet. Closed by a tap
// outside (which also stands for any pan or pinch: the map gets no touch while it shows), by Back,
// or by tapping the same element again.

import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AccessibilityInfo,
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewInstance,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTokens, Sheet, Text, Theme, XStack, YStack } from "tamagui";

import { Skeleton } from "@/components/common/Skeleton";
import { DATE_OPTIONS, type Extra, loadExtra } from "@/components/village/detailExtra";
import { feedsLine, levelText, nameOf } from "@/components/village/rows";
import { Silhouette } from "@/components/village/Silhouette";
import { BuildingFacts, BuildingLevel } from "@/components/village/VillageDetailSheet";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { CONTENT_MAX_WIDTH } from "@/constants/layout";
import { rawColors } from "@/constants/rawColors";
import type { RecentFeeds } from "@/db/milestone";
import type { BuildingCode } from "@/db/schema";
import type { VillageBuilding } from "@/db/village";
import type { VillageYearsView } from "@/db/villageYears";
import { reportError } from "@/src/reportError";
import type { AppLanguage } from "@/stores/settings";
import {
  cleCible,
  coteDuPanneau,
  etatBulle,
  HAUTEUR_BARRE,
  hauteurMaxBulle,
  hauteurMaxPanneau,
  largeurBulle,
  type Ouverture,
  type Placement,
  QUEUE_BULLE,
} from "./bulle";
import { useMouvementReduit } from "./fige";
import { indiceReplique, MOMENT_REPLIQUE } from "./habitants";
import { LueurDouce } from "./LueurDouce";
import { Marteau } from "./Marteau";
import type { Role } from "./marcheurs";

const OUVERTURE_MS = 150;
const ECHELLE_DEPART = 0.96;
/** A touch of the backdrop that travels further than this is a drag: it closes, it opens nothing. */
const GLISSE_DP = 10;

type Mesure = { pour: Ouverture; fenetre: string; w: number; h: number };

type Contenu = (o: Ouverture, nom: RefObject<ViewInstance | null>) => ReactNode;

/** Calls `contenu` as a component: handing a ref to a function inside the render is what the compiler refuses. */
function Rendu({
  contenu,
  o,
  nom,
}: {
  contenu: Contenu;
  o: Ouverture;
  nom: RefObject<ViewInstance | null>;
}) {
  return contenu(o, nom);
}

/** Where the frame is held: by its top below the anchor, by its bottom above it (it grows upwards). */
function caleDe(
  placee: Extract<Placement, { mode: "bulle" }> | null,
  taille: Mesure | null,
  hauteur: number,
): { left: number; top: number } | { left: number; bottom: number } | null {
  if (!placee || !taille) return null;
  return placee.cote === "haut"
    ? { left: placee.x, bottom: hauteur - placee.y - taille.h }
    : { left: placee.x, top: placee.y };
}

/** The edge a building's panel docks to; a list's opening has no anchor, so the bottom. */
function coteDe(
  ouverte: Ouverture,
  w: number,
  h: number,
  insets: { top: number; bottom: number; left: number; right: number },
): "haut" | "bas" {
  return ouverte.sansAncre
    ? "bas"
    : coteDuPanneau(ouverte.ancre, hauteurMaxPanneau(h), { w, h }, insets);
}

export function Bulle({
  ouverte,
  onClose,
  onDehors,
  contenu,
  zone,
}: {
  ouverte: Ouverture | null;
  onClose: () => void;
  /** A tap outside the bubble, at a window point: the owner replaces or closes it (`apresTap`). */
  onDehors?: (x: number, y: number) => void;
  /** What the bubble says about `o`; `nom` goes on the name, which takes the screen reader's focus. */
  contenu: Contenu;
  /** The map's area, which a building's panel leaves open to taps (its backdrop covers just this). */
  zone?: { w: number; h: number };
}) {
  const ecran = useWindowDimensions();
  const sys = useSafeAreaInsets();
  // The tab bar (app/(tabs)/_layout.tsx: 60 dp over the inset) is kept clear of too.
  const insets = { ...sys, bottom: sys.bottom + HAUTEUR_BARRE };
  const nom = useRef<ViewInstance>(null);
  // The bubble's size, measured hidden on its first layout for this opening, then placed once:
  // the deeds that load later grow it away from its tail, never move it nor turn it into the sheet.
  const [mesure, setMesure] = useState<Mesure | null>(null);
  // A turn of the window changes the room (the frame's tallest height too): measured again, or the
  // old size, placed in the new window, leaves the frame past its edge.
  const fenetre = `${ecran.width}x${ecran.height}`;
  const taille = mesure && mesure.pour === ouverte && mesure.fenetre === fenetre ? mesure : null;
  // Read live (decision of 30/10): turning the text up while it shows moves it into the sheet.
  const { feuille, placee, panneau } = etatBulle(
    ouverte,
    taille,
    { w: ecran.width, h: ecran.height, fontScale: ecran.fontScale },
    insets,
  );
  // The sheet's subject, held past the close so its content does not blank out as it slides shut.
  const [enFeuille, setEnFeuille] = useState<Ouverture | null>(null);
  if (feuille && ouverte !== enFeuille) setEnFeuille(ouverte);
  if (ouverte && !feuille && enFeuille) setEnFeuille(null);
  // Above its anchor the bubble hangs from its bottom edge (the tail's), so it grows upwards.
  const cale = caleDe(placee, taille, ecran.height);

  // As in VillageDetailSheet: registered while open, so the router never sees the press.
  useEffect(() => {
    if (!ouverte) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [ouverte, onClose]);
  useEffect(() => {
    if (feuille && nom.current) AccessibilityInfo.sendAccessibilityEvent(nom.current, "focus");
  }, [feuille]);

  const tape = (x: number, y: number) => (onDehors ? onDehors(x, y) : onClose());

  return (
    <>
      {ouverte && panneau ? (
        <CouchePanneau
          ouverte={ouverte}
          zone={zone ?? { w: ecran.width, h: ecran.height }}
          cote={coteDe(ouverte, ecran.width, ecran.height, insets)}
          hauteurMax={hauteurMaxPanneau(ecran.height)}
          haut={sys.top}
          nom={nom}
          onDehors={tape}
          onClose={onClose}
          contenu={contenu}
        />
      ) : null}
      {ouverte && !feuille && !panneau ? (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={onClose}
        >
          <CadreBulle
            // A new opening remounts the frame: its first layout is what measures it, and a
            // bubble of the same size as the last one would get none.
            key={`${cleCible(ouverte.cible)}-${ouverte.ancre.join(",")}-${fenetre}`}
            largeur={largeurBulle(ecran.width)}
            hauteurMax={hauteurMaxBulle(ecran.height, insets)}
            placee={placee}
            cale={cale}
            nom={nom}
            onDehors={tape}
            onClose={onClose}
            onTaille={(w, h) => {
              if (!taille) setMesure({ pour: ouverte, fenetre, w, h });
            }}
          >
            <Rendu contenu={contenu} o={ouverte} nom={nom} />
          </CadreBulle>
        </Modal>
      ) : null}
      <FeuilleBulle ouverte={feuille} onClose={onClose} basInset={sys.bottom}>
        {enFeuille && (feuille || !ouverte) ? (
          <Rendu contenu={contenu} o={enFeuille} nom={nom} />
        ) : null}
      </FeuilleBulle>
    </>
  );
}

/** The parchment frame over a tap-swallowing backdrop, hidden until placed, then opening. */
function CadreBulle({
  largeur,
  hauteurMax,
  placee,
  cale,
  nom,
  onDehors,
  onClose,
  onTaille,
  children,
}: {
  largeur: number;
  /** The frame's tallest height: the content scrolls beyond it. */
  hauteurMax: number;
  placee: Extract<Placement, { mode: "bulle" }> | null;
  /** Where the frame is held: by its top below the anchor, by its bottom above it. */
  cale: { left: number; top: number } | { left: number; bottom: number } | null;
  nom: RefObject<ViewInstance | null>;
  /** A tap outside, at its window point: the owner may open what lies there. */
  onDehors: (x: number, y: number) => void;
  /** A drag on the backdrop: it only closes, whatever lies under the finger at the end. */
  onClose: () => void;
  onTaille: (w: number, h: number) => void;
  children: ReactNode;
}) {
  const reduit = useMouvementReduit();
  const p = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ scale: ECHELLE_DEPART + (1 - ECHELLE_DEPART) * p.get() }],
  }));
  const estPlacee = placee !== null;
  useEffect(() => {
    if (!estPlacee) return;
    p.set(reduit ? 1 : withTiming(1, { duration: OUVERTURE_MS }));
    if (nom.current) AccessibilityInfo.sendAccessibilityEvent(nom.current, "focus");
  }, [estPlacee, reduit, p, nom]);
  return (
    <>
      <Fond onDehors={onDehors} onClose={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View
        testID="iso-bulle"
        accessibilityViewIsModal
        onLayout={(e) => onTaille(e.nativeEvent.layout.width, e.nativeEvent.layout.height)}
        style={[{ position: "absolute", ...(cale ?? { left: 0, top: 0 }), width: largeur }, style]}
      >
        <YStack
          bg="parchment"
          rounded="1"
          borderWidth={1.5}
          borderColor="bgDark"
          overflow="hidden"
          style={{ maxHeight: hauteurMax }}
        >
          <ScrollView
            contentContainerStyle={{
              padding: getTokens().space["3"].val,
              gap: getTokens().space["2"].val,
            }}
          >
            {children}
          </ScrollView>
        </YStack>
        {placee ? <Queue cote={placee.cote} x={placee.queueX} /> : null}
      </Animated.View>
    </>
  );
}

/** A transparent layer that swallows the tap: nothing under it is selected by the touch that closes the bubble or the panel. */
function Fond({
  onDehors,
  onClose,
  style,
}: {
  /** A tap, at its press-in window point: the owner may open what lies there. */
  onDehors: (x: number, y: number) => void;
  /** A drag: it only closes, whatever lies under the finger at the end. */
  onClose: () => void;
  style: ViewStyle;
}) {
  const { t } = useTranslation();
  const appui = useRef<readonly [number, number]>([0, 0]);
  return (
    <Pressable
      testID="iso-bulle-dehors"
      style={style}
      onPressIn={(e) => {
        appui.current = [e.nativeEvent.pageX, e.nativeEvent.pageY];
      }}
      onPress={(e) => {
        const { pageX, pageY } = e.nativeEvent;
        const [x0, y0] = appui.current;
        if (Math.hypot(pageX - x0, pageY - y0) > GLISSE_DP) onClose();
        else onDehors(x0, y0);
      }}
      accessibilityRole="button"
      accessibilityLabel={t("village.close")}
    />
  );
}

/**
 * A layer of the screen, not a Modal: a pushed screen covers it and on return it still shows, and
 * the tab bar stays usable. The backdrop covers the map only; the halo marks the building.
 */
function CouchePanneau({
  ouverte,
  zone,
  cote,
  hauteurMax,
  haut,
  nom,
  onDehors,
  onClose,
  contenu,
}: {
  ouverte: Ouverture;
  zone: { w: number; h: number };
  cote: "haut" | "bas";
  hauteurMax: number;
  haut: number;
  nom: RefObject<ViewInstance | null>;
  onDehors: (x: number, y: number) => void;
  onClose: () => void;
  contenu: Contenu;
}) {
  return (
    <>
      <Fond
        onDehors={onDehors}
        onClose={onClose}
        style={{ position: "absolute", top: 0, left: 0, width: zone.w, height: zone.h }}
      />
      {ouverte.sansAncre ? null : <Halo ancre={ouverte.ancre} />}
      <PanneauBulle
        cle={cleCible(ouverte.cible)}
        cote={cote}
        hauteurMax={hauteurMax}
        haut={haut}
        nom={nom}
      >
        <Rendu contenu={contenu} o={ouverte} nom={nom} />
      </PanneauBulle>
    </>
  );
}

const DECALAGE_PANNEAU = 10;
/** The halo's reach, dp, and how far under the anchor (the sprite's top) its heart lies. */
const RAYON_HALO = 76;
const CENTRE_HALO = 44;
const RESPIRATION_MS = 1500;

/**
 * A building's panel (direction C): the parchment docked on an edge of the screen, in place of the
 * title. The ink edge is the side facing the map, no tail. It fits its content up to 35 % of the
 * window; beyond, the content scrolls and a fade at the cut end says so. Kept mounted from one
 * building to the next, so the content changes in place.
 */
function PanneauBulle({
  cle,
  cote,
  hauteurMax,
  haut,
  nom,
  children,
}: {
  /** The subject's key: a new one scrolls back to the top and takes the screen reader's focus. */
  cle: string;
  cote: "haut" | "bas";
  hauteurMax: number;
  /** The top safe-area inset, for the top dock. */
  haut: number;
  nom: RefObject<ViewInstance | null>;
  children: ReactNode;
}) {
  const reduit = useMouvementReduit();
  const p = useSharedValue(0);
  const sens = cote === "bas" ? 1 : -1;
  const style = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ translateY: (1 - p.get()) * DECALAGE_PANNEAU * sens }],
  }));
  useEffect(() => {
    p.set(reduit ? 1 : withTiming(1, { duration: OUVERTURE_MS }));
  }, [reduit, p]);
  const defile = useRef<ScrollViewInstance>(null);
  // The cut end is told only while there is more below: sizes and the end of the scroll.
  const [vue, setVue] = useState(0);
  const [contenu, setContenu] = useState(0);
  const [fin, setFin] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `cle` stands for the subject
  useEffect(() => {
    defile.current?.scrollTo({ y: 0, animated: false });
    setFin(false);
    if (nom.current) AccessibilityInfo.sendAccessibilityEvent(nom.current, "focus");
  }, [cle, nom]);
  const coupe = contenu > vue + 1 && !fin;
  return (
    <Animated.View
      testID="iso-panneau"
      style={[
        { position: "absolute", left: 0, right: 0 },
        cote === "bas" ? { bottom: 0 } : { top: haut },
        style,
      ]}
    >
      <YStack
        bg="parchment"
        borderColor="bgDark"
        {...(cote === "bas" ? { borderTopWidth: 2 } : { borderBottomWidth: 2 })}
      >
        <ScrollView
          ref={defile}
          style={{ maxHeight: hauteurMax }}
          contentContainerStyle={{
            padding: getTokens().space["3"].val,
            gap: getTokens().space["2"].val,
          }}
          onLayout={(e) => setVue(e.nativeEvent.layout.height)}
          onContentSizeChange={(_, h) => setContenu(h)}
          onScroll={(e) => {
            const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
            setFin(contentOffset.y + layoutMeasurement.height >= contentSize.height - 4);
          }}
          scrollEventThrottle={64}
        >
          {children}
        </ScrollView>
        {coupe ? (
          <LinearGradient
            testID="iso-panneau-fondu"
            pointerEvents="none"
            colors={[rawColors.parchmentClair, rawColors.parchment]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 28 }}
          />
        ) : null}
      </YStack>
    </Animated.View>
  );
}

/**
 * The warm halo on the tapped building, in place of a tail: a soft radial glow under the panel that
 * breathes by opacity on the UI thread (still under reduced motion). Never tappable, never spoken.
 */
function Halo({ ancre }: { ancre: readonly [number, number] }) {
  const reduit = useMouvementReduit();
  const p = useSharedValue(1);
  useEffect(() => {
    if (reduit) return;
    p.set(
      withRepeat(
        withSequence(
          withTiming(0.55, { duration: RESPIRATION_MS }),
          withTiming(1, { duration: RESPIRATION_MS }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(p);
  }, [reduit, p]);
  const style = useAnimatedStyle(() => ({ opacity: p.get() }));
  return (
    <Animated.View
      testID="iso-halo"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, style]}
    >
      <LueurDouce kind="fenetre" at={[ancre[0], ancre[1] + CENTRE_HALO]} rayon={RAYON_HALO} />
    </Animated.View>
  );
}

/** The same content in the bottom sheet, beyond 130 % text or with no room on the screen. */
function FeuilleBulle({
  ouverte,
  onClose,
  basInset,
  children,
}: {
  ouverte: boolean;
  onClose: () => void;
  basInset: number;
  children: ReactNode;
}) {
  const { height } = useWindowDimensions();
  const reduit = useMouvementReduit();
  return (
    <Sheet
      modal
      open={ouverte}
      onOpenChange={(next: boolean) => {
        // Tamagui also reports a change of the `open` prop through here.
        if (!next && ouverte) onClose();
      }}
      snapPointsMode="fit"
      // A drag strands the pane and lets taps through (tamagui-sheet-pane-strand): closed by the
      // outside tap and Back only.
      disableDrag
      transition={reduit ? undefined : "quick"}
      zIndex={100_000}
    >
      <Sheet.Overlay
        testID="iso-bulle-voile"
        bg="sheetScrim"
        transition={reduit ? undefined : "quick"}
        opacity="1 enter:0 exit:0"
      />
      <Sheet.Container
        overflow="hidden"
        borderTopLeftRadius="6"
        borderTopRightRadius="6"
        width="100%"
        maxW={CONTENT_MAX_WIDTH}
        self="center"
        style={{ maxHeight: Math.round(height * 0.9) }}
      >
        <Sheet.Background bg="parchment" borderTopLeftRadius="6" borderTopRightRadius="6" />
        {/* ponytail: `onMoveShouldSetResponder` as in FormSheet, Tamagui cancels the first tap of
            a button in a Sheet.ScrollView (see .biome/plugins/noBareSheetScrollView.grit). */}
        <Sheet.ScrollView px={0} onMoveShouldSetResponder={() => false}>
          <YStack
            testID="iso-bulle-feuille"
            accessibilityViewIsModal
            px="4"
            pt="4"
            pb={basInset + 16}
            gap="2"
          >
            {children}
          </YStack>
        </Sheet.ScrollView>
      </Sheet.Container>
    </Sheet>
  );
}

/** The tail: an ink triangle with a parchment one inside, on the edge facing the anchor. */
function Queue({ cote, x }: { cote: "haut" | "bas"; x: number }) {
  const triangle = (
    base: number,
    long: number,
    couleur: "bgDark" | "parchment",
    decale: number,
  ) => (
    <YStack
      position="absolute"
      l={x - base}
      {...(cote === "haut" ? { t: `100%`, mt: decale } : { b: `100%`, mb: decale })}
      width={0}
      height={0}
      borderLeftWidth={base}
      borderRightWidth={base}
      borderLeftColor="transparent"
      borderRightColor="transparent"
      {...(cote === "haut"
        ? { borderTopWidth: long, borderTopColor: couleur }
        : { borderBottomWidth: long, borderBottomColor: couleur })}
    />
  );
  return (
    <>
      {triangle(9, QUEUE_BULLE + 2, "bgDark", 0)}
      {triangle(7, QUEUE_BULLE, "parchment", -2)}
    </>
  );
}

/** A building's bubble: name, the fact, then the figures in an ink caption, and the one action. */
export function ContenuBatiment({
  building,
  pret,
  nom,
  language,
  feeds,
  years,
  baseRank = 0,
  onClose,
  onClaim,
  onSuivre,
}: {
  building: VillageBuilding;
  /** Ready to evolve: hammer, words and the braise button, never the colour alone. */
  pret: boolean;
  nom: RefObject<ViewInstance | null>;
  language: AppLanguage;
  feeds: RecentFeeds | null;
  years: VillageYearsView | null;
  /** The rank of the building an upgrade extends, for the silhouette (rule B). */
  baseRank?: number;
  onClose: () => void;
  onClaim: (building: VillageBuilding) => void;
  /** A follower's link: the panel moves to the building it follows, in place. */
  onSuivre?: (code: BuildingCode) => void;
}) {
  const { t } = useTranslation();
  // Undefined while the deed list loads: fixed blocks stand in for it.
  const [extra, setExtra] = useState<Extra | undefined>(undefined);
  useEffect(() => {
    let annule = false;
    setExtra(undefined);
    loadExtra({ kind: "building", building }, { exercises: true })
      .then((v) => {
        if (!annule) setExtra(v);
      })
      .catch((error) => {
        // The figures above already say why this level; the deeds are a bonus.
        reportError("village.bubble", error);
        if (!annule) setExtra(null);
      });
    return () => {
      annule = true;
    };
  }, [building]);
  const nomTexte = nameOf(building, language);
  return (
    <Theme name="parchment">
      {/* Name, rank and the fact on the left, the next stage's silhouette on the right (none at
          the last stage or before the first). Reading order: name, fact, figures, action. */}
      <XStack gap="3" items="flex-start">
        <YStack flex={1} minW={0} gap="1">
          <XStack gap="2" items="center">
            {pret ? <Marteau d={22} /> : null}
            <View
              ref={nom}
              testID="iso-bulle-nom"
              style={{ flex: 1 }}
              accessible
              accessibilityRole="header"
              accessibilityLabel={`${
                pret ? t("village.claim_ready_a11y", { name: nomTexte }) : nomTexte
              }, ${levelText(building, t)}`}
            >
              <Text fontFamily="heading" fontWeight="700" fontSize={20} color="bgDark">
                {nomTexte}
              </Text>
            </View>
          </XStack>
          {/* The name's label already says it to TalkBack: the line is for the eye only. */}
          {pret ? (
            <Text fontSize={14} fontWeight="700" color="bgDark" accessible={false}>
              {t("village.claim_ready")}
            </Text>
          ) : null}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <BuildingLevel building={building} aligne="flex-start" />
          </View>
          {/* A built follower says it once, as the link below (which carries the rank). */}
          {building.driver === "prereq" && building.level > 0 ? null : (
            <Text fontSize={14} color="bgDark">
              {feedsLine(building, t, language)}
            </Text>
          )}
        </YStack>
        {building.level > 0 ? (
          <Silhouette building={building} baseRank={baseRank} name={nomTexte} />
        ) : null}
      </XStack>
      {/* The figures are the sheet's own writer, read in ink on the parchment (`parchment` theme). */}
      <YStack testID="iso-bulle-chiffres" gap="4">
        <BuildingFacts
          building={building}
          extra={extra ?? null}
          language={language}
          feeds={feeds}
          years={years}
          formatDate={(d) => getDateTimeFormat(language, DATE_OPTIONS).format(d)}
          onClose={onClose}
          surCarte
          onSuivre={onSuivre}
          onClaim={
            pret
              ? () => {
                  onClose();
                  onClaim(building);
                }
              : undefined
          }
        />
        {extra === undefined ? (
          <YStack testID="iso-bulle-chargement" gap="2">
            <Skeleton height={14} />
            <Skeleton height={14} />
          </YStack>
        ) : null}
      </YStack>
    </Theme>
  );
}

/**
 * A villager's bubble (T26): its name (a generic one for an inhabitant, which wears a trade's
 * sprite), and one of that trade's existing lines, the same all day (`indiceReplique`).
 */
export function ContenuVillageois({
  id,
  role,
  habitant,
  jour,
  nom,
}: {
  id: string;
  role: Role;
  habitant: boolean;
  jour: number;
  nom: RefObject<ViewInstance | null>;
}) {
  const { t } = useTranslation();
  const pool = `villagers.${role}.${MOMENT_REPLIQUE[role]}`;
  const lignes: unknown = t(pool, { returnObjects: true });
  const i = indiceReplique(Array.isArray(lignes) ? lignes.length : 0, jour, id);
  const nomTexte = habitant ? t("village.iso.habitant") : t(`villagers.names.${role}`);
  return (
    <>
      <View
        ref={nom}
        testID="iso-bulle-nom"
        accessible
        accessibilityRole="header"
        accessibilityLabel={nomTexte}
      >
        <Text fontFamily="heading" fontWeight="700" fontSize={20} color="bgDark">
          {nomTexte}
        </Text>
      </View>
      {i >= 0 ? (
        <Text testID="iso-bulle-replique" fontSize={14} color="bgDark">
          {t(`${pool}.${i}`)}
        </Text>
      ) : null}
    </>
  );
}
