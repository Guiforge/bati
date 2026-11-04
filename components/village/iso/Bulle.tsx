// The comic bubble (bulle BD) of the iso scene (docs/design/components/village-bulle.md, T14): one
// shell for everything tapped on the map. A parchment frame with an inked tail aimed at the tapped
// element, placed by `placerBulle`; above 130 % text, or with no room, the same content in the
// bottom sheet. Closed by a tap outside (which also stands for any pan or pinch: the map gets no
// touch while it shows), by Back, or by tapping the same element again.

import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AccessibilityInfo,
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewInstance,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTokens, Sheet, Text, Theme, XStack, YStack } from "tamagui";

import { Skeleton } from "@/components/common/Skeleton";
import { DATE_OPTIONS, type Extra, loadExtra } from "@/components/village/detailExtra";
import { feedsLine, levelText, nameOf } from "@/components/village/rows";
import { Silhouette } from "@/components/village/Silhouette";
import { BuildingFacts, BuildingLevel } from "@/components/village/VillageDetailSheet";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { CONTENT_MAX_WIDTH } from "@/constants/layout";
import type { RecentFeeds } from "@/db/milestone";
import type { VillageBuilding } from "@/db/village";
import type { VillageYearsView } from "@/db/villageYears";
import { reportError } from "@/src/reportError";
import type { AppLanguage } from "@/stores/settings";
import {
  cleCible,
  etatBulle,
  HAUTEUR_BARRE,
  hauteurMaxBulle,
  largeurBulle,
  type Ouverture,
  type Placement,
  QUEUE_BULLE,
} from "./bulle";
import { useMouvementReduit } from "./fige";
import { indiceReplique, MOMENT_REPLIQUE } from "./habitants";
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

export function Bulle({
  ouverte,
  onClose,
  onDehors,
  contenu,
}: {
  ouverte: Ouverture | null;
  onClose: () => void;
  /** A tap outside the bubble, at a window point: the owner replaces or closes it (`apresTap`). */
  onDehors?: (x: number, y: number) => void;
  /** What the bubble says about `o`; `nom` goes on the name, which takes the screen reader's focus. */
  contenu: Contenu;
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
  const { feuille, placee } = etatBulle(
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
  const cale =
    placee && taille
      ? placee.cote === "haut"
        ? { left: placee.x, bottom: ecran.height - placee.y - taille.h }
        : { left: placee.x, top: placee.y }
      : null;

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

  return (
    <>
      {ouverte && !feuille ? (
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
            onDehors={(x, y) => (onDehors ? onDehors(x, y) : onClose())}
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
  const { t } = useTranslation();
  const reduit = useMouvementReduit();
  const p = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ scale: ECHELLE_DEPART + (1 - ECHELLE_DEPART) * p.get() }],
  }));
  const estPlacee = placee !== null;
  const appui = useRef<readonly [number, number]>([0, 0]);
  useEffect(() => {
    if (!estPlacee) return;
    p.set(reduit ? 1 : withTiming(1, { duration: OUVERTURE_MS }));
    if (nom.current) AccessibilityInfo.sendAccessibilityEvent(nom.current, "focus");
  }, [estPlacee, reduit, p, nom]);
  return (
    <>
      {/* Swallows the tap: nothing under it is selected by the touch that closes the bubble. */}
      <Pressable
        testID="iso-bulle-dehors"
        style={StyleSheet.absoluteFill}
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
    <>
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
      {/* A built follower says it once, in the driver line below (which carries the rank). */}
      {building.driver === "prereq" && building.level > 0 ? null : (
        <Text fontSize={14} color="bgDark">
          {feedsLine(building, t, language)}
        </Text>
      )}
      {/* The figures are the sheet's own writer, read in ink on the parchment (`parchment` theme). */}
      <Theme name="parchment">
        <YStack testID="iso-bulle-chiffres" gap="4">
          <XStack justify="flex-end" items="center" gap="3">
            <Silhouette building={building} baseRank={baseRank} name={nomTexte} />
            <BuildingLevel building={building} />
          </XStack>
          <BuildingFacts
            building={building}
            extra={extra ?? null}
            language={language}
            feeds={feeds}
            years={years}
            formatDate={(d) => getDateTimeFormat(language, DATE_OPTIONS).format(d)}
            onClose={onClose}
            surCarte
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
    </>
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
