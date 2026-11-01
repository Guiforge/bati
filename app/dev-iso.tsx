// The iso village demo, for the team and for qa's captures: the master grid at a chosen village
// tier, pan, pinch or the zoom buttons to look around (an emulator cannot pinch, L0-T14). Dev-only
// copy, no i18n. Opens with bati://dev-iso in a dev build and in the `.perf` release build
// (constants/isoPoc.ts); anywhere else it sends the hero home.

import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useContext, useEffect, useState } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { PremierPlanSiPeint } from "@/components/village/iso/Alentours";
import { AlentoursContext, alentoursDe, cadreSerre } from "@/components/village/iso/alentours";
import {
  CRAN,
  cadrage,
  etatCarte,
  PLACE,
  spriteDe,
  stadeDemo,
  vueFoyer,
  vueSur,
  ZOOM_CAPTURE,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomer,
} from "@/components/village/iso/carteDemo";
import { croissanceDemo } from "@/components/village/iso/croissanceDemo";
import { PalierContext, SondeContext } from "@/components/village/iso/detail";
import { EFFETS, EffetForceContext } from "@/components/village/iso/effets";
import { SANS_BANNIERE } from "@/components/village/iso/fierte";
import { FigeContext } from "@/components/village/iso/fige";
import { useHorloge } from "@/components/village/iso/horloge";
import { IsoCarteDemo } from "@/components/village/iso/IsoCarteDemo";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import type { Ambiance } from "@/components/village/iso/isoSpec";
import { ambianceForcee } from "@/components/village/iso/lumiere";
import { Monde } from "@/components/village/iso/Monde";
import { Oiseaux } from "@/components/village/iso/petitsDetails";
import { QuartiersContext } from "@/components/village/iso/quartiers";
import { revelation } from "@/components/village/iso/revelation";
import { type BlasonCrest, blasonFactice, NOM_STATUE } from "@/components/village/iso/statue";
import { useCameraIso } from "@/components/village/iso/useCameraIso";
import { estDefaut, VariantesContext, variantesDe } from "@/components/village/iso/variantes";
import { RatForceContext } from "@/components/village/iso/vivant";
import { animalDeVocation } from "@/components/village/iso/vocation";
import { ISO_POC } from "@/constants/isoPoc";
import { type BuildingCode, buildingCodes } from "@/db/schema";
import type { VillageTier } from "@/db/village";
import { playHit } from "@/src/sounds";

/** The buildings that have an effect, in the order the dev button steps through them. */
const BATIMENTS_EFFET = Object.keys(EFFETS) as BuildingCode[];

/** The statue's name of the animal a `?vocation=` link forces, for `blasonFactice`. */
const vocationAnimal = (v: string | undefined) => {
  const a = animalDeVocation(v);
  return a ? NOM_STATUE[a] : undefined;
};

/** How long `?jouer=1` waits before it claims the ready building. */
const DELAI_JOUER_MS = 1500;

const PALIERS: readonly VillageTier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** The tier a `?palier=` link names, 12 when absent or not one of the twelve. */
const palierDe = (v: string | undefined): VillageTier => PALIERS.find((p) => String(p) === v) ?? 12;

// The guard sits outside the screen so no hook runs conditionally (React Compiler). `?fige=1`
// freezes every animation of the map, both modes, for Maestro (T16, iso/fige.ts).
export default function DevIsoRoute() {
  const {
    fige,
    ambiance,
    animal,
    stade,
    ech,
    flaques,
    bornes,
    vocation,
    nu,
    palier,
    mode,
    peint,
    jouer,
    foyer,
    zoom,
  } = useLocalSearchParams<{
    /** `?foyer=<building code>`: opens framed close on that building, if the tier shows it (capture folders). */
    foyer?: string;
    /** `?zoom=1.6` with `foyer`: the closeness, in demo units. */
    zoom?: string;
    /** `?jouer=1` with `mode=pret`: the ready building is claimed 1.5 s in, for a capture no finger plays (H3-01). */
    jouer?: string;
    /** `?peint=sol,foret,decor,animaux,plan` or `?peint=tout`: the painted surroundings' layers on (alentours.ts), whatever constants/isoPoc.ts ALENTOURS says. */
    peint?: string;
    /** `?nu=1`: hides the dev controls above the map, which then fills the screen (loop captures). */
    nu?: string;
    /** `?palier=1..12`: the tier the map opens on (the buttons stay the way to change it). */
    palier?: string;
    /** `?mode=pret`: opens the ready-to-evolve demo. */
    mode?: string;

    /** `?vocation=course|callisthenie|force|yoga|velo`: forces the dominant practice (as its animal). */
    vocation?: string;
    ech?: string;
    flaques?: string;
    bornes?: string;
    fige?: string;
    ambiance?: string;
    animal?: string;
    stade?: string;
  }>();
  if (!ISO_POC) return <Redirect href="/" />;
  return (
    <FigeContext.Provider value={fige === "1"}>
      {/* Perf A/B (reports/perf-regression-audit3.md): `?ech=0.5&flaques=0&bornes=0`, the default when absent. */}
      <VariantesContext.Provider value={variantesDe({ ech, flaques, bornes })}>
        <AlentoursContext.Provider value={alentoursDe(peint)}>
          <DevIso
            lumiere={ambianceForcee(ambiance) ?? "nuit"}
            nu={nu === "1"}
            depart={{ palier: palierDe(palier), mode: mode === "pret" ? "pret" : "carte" }}
            jouer={jouer === "1"}
            foyer={buildingCodes.find((c) => c === foyer)}
            zoomFoyer={Number(zoom) > 0 ? Number(zoom) : 1.6}
            crest={blasonFactice(vocationAnimal(vocation) ?? animal, stade)}
          />
        </AlentoursContext.Provider>
      </VariantesContext.Provider>
    </FigeContext.Provider>
  );
}

// The village tab with the iso map whatever the flag says: qa tests it in the `.perf` build with
// the production flag left off. Required on render so the tab's modules (the database among them)
// load only when asked.
function VillageIso() {
  const { VillageScene } = require("@/components/village/VillageScene") as {
    VillageScene: (props: { iso?: boolean }) => React.JSX.Element;
  };
  return <VillageScene iso />;
}

// L3-T06 tour 4: the size two sprites really loaded at (expo-image `onLoad`: Android reports the
// decoded drawable's intrinsic size, GlideRequestListener.kt:69), for qa to read by uiautomator.
// `n` counts the loads: a level change that does not reload leaves it at 1. Dev route only.
const SONDES = ["forge", "windmill"] as const;
function Sonde({
  palier,
  actif,
  children,
}: {
  palier: VillageTier;
  /** Off by default: the text covers the top of the screen. */
  actif: boolean;
  children: ReactNode;
}) {
  const [vus, setVus] = useState<
    Record<string, { w: number; h: number; n: number; demande: string; charge: string }>
  >({});
  return (
    <SondeContext.Provider
      value={(id, w, h, demande, charge) =>
        setVus((v) => ({ ...v, [id]: { w, h, n: (v[id]?.n ?? 0) + 1, demande, charge } }))
      }
    >
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, zIndex: 10 }}>
        {(actif ? SONDES : []).map((code) => {
          const v = vus[`iso-maquette-${code}`];
          const src = spriteDe(code, stadeDemo(code, palier))?.size;
          return (
            <Text key={code} testID={`iso-charge-${code}`} fontSize="2" color="text">
              {`${code} ${v ? `${v.w}x${v.h} n=${v.n} ask ${v.demande} got ${v.charge}` : "-"} src ${src?.join("x")}`}
            </Text>
          );
        })}
      </View>
      {children}
    </SondeContext.Provider>
  );
}

/**
 * PretDemo's ready building and the level it rises from. "Neuf" (T02b): from nothing, so the site
 * shows its heap of stones; nothing holds its claimed level then (a claimed 0 takes it off the map).
 */
function etatPret(palier: VillageTier, essai: number, neuf: boolean, banniere: boolean) {
  const batiments = etatCarte(palier, false).montres.map((code) => ({ code, level: 9 }));
  // "Bannière" (T03): the ready building is one that flies a banner on its last stage, so the
  // scene rises into it and qa sees the banner come in with the fade.
  const candidats = banniere ? batiments.filter((b) => !SANS_BANNIERE.has(b.code)) : batiments;
  const [code, trouve] = (croissanceDemo(candidats, essai) ?? "").split(":");
  return {
    batiments,
    pret: code ? (code as BuildingCode) : undefined,
    ancien: neuf ? 0 : Number(trouve),
  };
}

// What the tab does at the reveal (VillageScene), read from the settings when it fires: the store
// pulls the database in, which the map's tests must not load.
function reglagesPret() {
  const { useSettingsStore } = require("@/stores/settings") as typeof import("@/stores/settings");
  return useSettingsStore.getState();
}

// The first require opens the database, about a second on the phone: done at the screen's mount,
// not in the reveal, or the buzz fires late and holds the JS thread while the new stage draws (T37).
function revelerPret() {
  const { hapticsEnabled, soundEnabled } = reglagesPret();
  revelation(
    { hapticsEnabled, soundEnabled },
    {
      vibrer: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
      marteau: playHit,
    },
  );
}

// L6-T20: a building "ready to evolve" (hammer, glow, then the scene on a tap) without the database
// or VillageScene: the real IsoVillage with the props the tab gives it. A tap on the building plays
// the scene as the tab does after the sheet's button; when it ends the building is claimed.
export function PretDemo({
  palier,
  lumiere = "nuit",
  nu = false,
  jouer = false,
  onRevelation,
}: {
  /** Claims the ready building 1.5 s in, as the tap on it does (dev route only: in the tab the player's touch is the only door). */
  jouer?: boolean;
  palier: VillageTier;
  /** The light of the map (`?ambiance=`): the buildings wear its sprites (F2), the pieces stay the night's. */
  lumiere?: Ambiance;
  /** No Neuf, Bannière and Rejouer buttons over the map (`?nu=1`). */
  nu?: boolean;
  onRevelation?: () => void;
}) {
  const [aire, setAire] = useState({ w: 0, h: 0 });
  const [essai, setEssai] = useState(0);
  const [jouee, setJouee] = useState<string | undefined>(undefined);
  const [fini, setFini] = useState(-1);
  const [neuf, setNeuf] = useState(false);
  const [banniere, setBanniere] = useState(false);
  const { batiments, pret, ancien } = etatPret(palier, essai, neuf, banniere);
  const reclame = pret && fini !== essai;
  // As the tab: a claim in play is no longer ready, and the new level is already the shown one.
  const enJeu = jouee === `demo:${essai}`;
  // The tap's own door (onOpen below sets the same state): no coordinates, for a film.
  useEffect(() => {
    if (!jouer) return;
    const t = setTimeout(() => setJouee((j) => j ?? "demo:0"), DELAI_JOUER_MS);
    return () => clearTimeout(t);
  }, [jouer]);
  const rejouer = () => {
    setJouee(undefined);
    setEssai(essai + 1);
  };
  return (
    <View
      testID="iso-pret-aire"
      style={{ flex: 1, overflow: "hidden" }}
      onLayout={(e: LayoutChangeEvent) =>
        setAire({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
      }
    >
      {aire.w > 0 ? (
        <IsoVillage
          tier={palier}
          buildings={batiments}
          width={aire.w}
          height={aire.h}
          lumiere={lumiere}
          reclamables={reclame && !enJeu && pret ? [pret] : []}
          niveauxReclames={pret && !neuf ? { [pret]: reclame && !enJeu ? ancien : 9 } : undefined}
          onOpen={(b) => {
            if (reclame && b.code === pret) setJouee(`demo:${essai}`);
          }}
          croissance={
            jouee && pret && jouee === `demo:${essai}`
              ? { cle: jouee, items: [{ code: pret, oldLevel: ancien }] }
              : undefined
          }
          onRevelation={onRevelation}
          onCroissanceFinie={() => {
            // As the tab does: the growth is dropped once played, so the map stops holding for it.
            setFini(essai);
            setJouee(undefined);
          }}
        />
      ) : null}
      <BarrePret
        nu={nu}
        neuf={neuf}
        banniere={banniere}
        onNeuf={() => {
          setNeuf(!neuf);
          rejouer();
        }}
        onBanniere={() => {
          setBanniere(!banniere);
          rejouer();
        }}
        onRejouer={rejouer}
      />
    </View>
  );
}

/** The three buttons over the ready demo; nothing at all in a bare capture (`?nu=1`). */
function BarrePret({
  nu,
  neuf,
  banniere,
  onNeuf,
  onBanniere,
  onRejouer,
}: {
  nu: boolean;
  neuf: boolean;
  banniere: boolean;
  onNeuf: () => void;
  onBanniere: () => void;
  onRejouer: () => void;
}) {
  if (nu) return null;
  return (
    <View style={{ position: "absolute", top: 4, right: 8, flexDirection: "row", gap: 8 }}>
      <BoutonPret nom="neuf" actif={neuf} onPress={onNeuf} texte="Neuf" />
      <BoutonPret nom="banniere" actif={banniere} onPress={onBanniere} texte="Bannière" />
      <BoutonPret nom="rejouer" actif={false} onPress={onRejouer} texte="Rejouer" />
    </View>
  );
}

function BoutonPret({
  nom,
  actif,
  onPress,
  texte,
}: {
  nom: string;
  actif: boolean;
  onPress: () => void;
  texte: string;
}) {
  return (
    <AppButton
      testID={`iso-pret-${nom}`}
      fullWidth={false}
      size="2"
      variant={actif ? "primary" : "outline"}
      onPress={onPress}
    >
      {texte}
    </AppButton>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the dev screen is a row of toggles, each one a branch
function DevIso({
  lumiere,
  crest,
  nu,
  depart,
  jouer,
  foyer,
  zoomFoyer,
}: {
  foyer?: BuildingCode;
  zoomFoyer: number;
  jouer: boolean;
  lumiere: Ambiance;
  crest: BlasonCrest | null;
  /** The controls above the map are not drawn (`?nu=1`). */
  nu: boolean;
  depart: { palier: VillageTier; mode: "carte" | "pret" };
}) {
  const insets = useSafeAreaInsets();
  const [palier, setPalier] = useState<VillageTier>(depart.palier);
  useEffect(() => {
    reglagesPret();
  }, []);
  const [tousDebout, setTousDebout] = useState(false);
  const [mode, setMode] = useState<"carte" | "village" | "pret">(depart.mode);
  const router = useRouter();
  const [rejeux, setRejeux] = useState(0);
  const [ratForce, setRatForce] = useState(false);
  const [effetForce, setEffetForce] = useState<BuildingCode | null>(null);
  const variantes = useContext(VariantesContext);
  // T26: each press is a new "session": the next wave of the map is the party (once per press).
  const [fete, setFete] = useState(0);
  const [sondes, setSondes] = useState(false);
  const [blocs, setBlocs] = useState(false);
  const [aire, setAire] = useState({ w: 0, h: 0 });
  const { montres } = etatCarte(palier, tousDebout);

  const { visible } = etatCarte(palier, tousDebout);
  const horloge = useHorloge();
  const {
    poser,
    vue,
    gestes,
    style: transformation,
    fond,
    zmin,
    detail,
    suivi,
  } = useCameraIso({
    visible,
    w: aire.w,
    h: aire.h,
    zmin: ZOOM_MIN,
    zmax: ZOOM_MAX,
    onToucher: horloge.touche,
  });
  // Every change of what is on the island frames it again, centred in the area under the header.
  const serre = cadreSerre(useContext(AlentoursContext));
  const cadrer = (p: VillageTier, tous: boolean, { w, h } = aire) =>
    poser(cadrage(etatCarte(p, tous).visible, w, h, serre));
  const mesurer = (e: LayoutChangeEvent) => {
    const mesure = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
    setAire(mesure);
    cadrer(palier, tousDebout, mesure);
  };

  // After the camera's own layout effects (they re-frame on a resize), so the close view wins.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the area is what re-asks for the view
  useEffect(() => {
    if (foyer && aire.w > 0 && montres.includes(foyer))
      poser(vueFoyer(foyer, palier, lumiere, aire.w, aire.h, zoomFoyer));
  }, [aire.w, aire.h]);

  if (mode === "pret") {
    return (
      <YStack flex={1} bg="background" pt={nu ? 0 : insets.top} pb={nu ? 0 : insets.bottom}>
        {nu ? null : (
          <XStack px="4" py="2">
            <AppButton
              testID="iso-pret-carte"
              fullWidth={false}
              size="2"
              variant="outline"
              onPress={() => setMode("carte")}
            >
              Carte seule
            </AppButton>
          </XStack>
        )}
        <PretDemo
          palier={palier}
          lumiere={lumiere}
          nu={nu}
          jouer={jouer}
          onRevelation={revelerPret}
        />
      </YStack>
    );
  }

  if (mode === "village") {
    return (
      <YStack flex={1} bg="background" pb={insets.bottom}>
        <XStack px="4" pt={insets.top} items="center" gap="3">
          <AppButton
            testID="iso-mode-carte"
            fullWidth={false}
            size="2"
            variant="outline"
            onPress={() => setMode("carte")}
          >
            Carte seule
          </AppButton>
          <AppButton
            testID="iso-grandir"
            fullWidth={false}
            size="2"
            variant="outline"
            // The tab reads `grown` from this route's params. The string names a building of the
            // hero's whose stage really changes (croissanceDemo) plus a replay suffix, so each
            // press plays again with the ranks unchanged. Read on press: the database loads then.
            onPress={async () => {
              const { getVillageBuildings } =
                require("@/db/village") as typeof import("@/db/village");
              const grown = croissanceDemo(await getVillageBuildings(), rejeux);
              setRejeux(rejeux + 1);
              if (grown) router.setParams({ grown });
            }}
          >
            Grandir
          </AppButton>
          <AppButton
            testID="iso-vider-cache"
            fullWidth={false}
            size="2"
            variant="outline"
            // Glide keys a resource on its numeric id and the version code; ids move between two
            // builds of one version, so a disk cache kept over `install -r` can serve another image.
            onPress={async () => {
              await Image.clearMemoryCache();
              await Image.clearDiskCache();
            }}
          >
            Vider cache images
          </AppButton>
        </XStack>
        <Sonde palier={palier} actif={sondes}>
          <VillageIso />
        </Sonde>
      </YStack>
    );
  }

  return (
    <YStack flex={1} bg="background" pt={nu ? 0 : insets.top} pb={nu ? 0 : insets.bottom}>
      {nu ? null : (
        <>
          <XStack px="4" py="3" items="center" gap="3">
            <ScreenBackButton />
            <Text fontSize={20} fontWeight="700" color="text">
              Village iso
            </Text>
            <AppButton
              testID="iso-mode-village"
              fullWidth={false}
              size="2"
              variant="outline"
              onPress={() => setMode("village")}
            >
              Onglet Village
            </AppButton>
            <AppButton
              testID="iso-mode-pret"
              fullWidth={false}
              size="2"
              variant="outline"
              onPress={() => setMode("pret")}
            >
              Prêt
            </AppButton>
          </XStack>
          <XStack px="4" gap="2" flexWrap="wrap">
            {PALIERS.map((p) => (
              <AppButton
                key={p}
                testID={`iso-palier-${p}`}
                fullWidth={false}
                size="2"
                variant={p === palier ? "primary" : "outline"}
                onPress={() => {
                  setPalier(p);
                  cadrer(p, tousDebout);
                }}
              >
                {String(p)}
              </AppButton>
            ))}
          </XStack>
          <XStack px="4" py="2" gap="3" items="center">
            <AppButton
              testID="iso-tous-debout"
              fullWidth={false}
              size="2"
              variant={tousDebout ? "primary" : "outline"}
              onPress={() => {
                setTousDebout(!tousDebout);
                cadrer(palier, !tousDebout);
              }}
            >
              {tousDebout ? "Tous debout : oui" : "Tous debout : non"}
            </AppButton>
            <Text testID="iso-compte" fontSize="3" color="textSecondary">
              {`Palier ${palier}, ${montres.length} terrains sur l'île${
                estDefaut(variantes)
                  ? ""
                  : ` | ech ${variantes.echelleDecode} flaques ${+variantes.flaques} bornes ${+variantes.bornes}`
              }`}
            </Text>
          </XStack>
          <XStack px="4" pb="2" gap="2" flexWrap="wrap">
            <AppButton
              testID="iso-zoom-moins"
              fullWidth={false}
              size="2"
              variant="outline"
              onPress={() => poser(zoomer(vue(), 1 / CRAN))}
            >
              -
            </AppButton>
            <AppButton
              testID="iso-zoom-plus"
              fullWidth={false}
              size="2"
              variant="outline"
              onPress={() => poser(zoomer(vue(), CRAN))}
            >
              +
            </AppButton>
            <AppButton
              testID="iso-zoom-cadrer"
              fullWidth={false}
              size="2"
              variant="outline"
              onPress={() => cadrer(palier, tousDebout)}
            >
              Cadrer
            </AppButton>
            <AppButton
              testID="iso-zoom-06"
              fullWidth={false}
              size="2"
              variant="outline"
              onPress={() => poser(vueSur(PLACE, ZOOM_CAPTURE))}
            >
              0,6
            </AppButton>
            <AppButton
              testID="iso-rat-force"
              fullWidth={false}
              size="2"
              variant={ratForce ? "primary" : "outline"}
              // Dev only: the rat runs in every wave, 1.5 to 3 s after the touch that starts it.
              onPress={() => setRatForce(!ratForce)}
            >
              {ratForce ? "Rat : forcé" : "Rat : auto"}
            </AppButton>
            <AppButton
              testID="iso-effet-force"
              fullWidth={false}
              size="2"
              variant={effetForce ? "primary" : "outline"}
              // Dev only: steps through the buildings with an effect; the next wave plays that one
              // alone (instead of the day's draw) and one press already starts it on a map at rest.
              // The effect shows in the first 5 s of the wave (the building signal seat; the druids'
              // motes in the next 5 s). Writes nothing: no ratchet, no setting.
              onPress={() => {
                const i = effetForce ? BATIMENTS_EFFET.indexOf(effetForce) : -1;
                const suivant = BATIMENTS_EFFET[i + 1] ?? null;
                setEffetForce(suivant);
                if (suivant) horloge.touche();
              }}
            >
              {`Effet : ${effetForce ?? "auto"}`}
            </AppButton>
            <AppButton
              testID="iso-fete"
              fullWidth={false}
              size="2"
              variant={fete > 0 ? "primary" : "outline"}
              // Dev only: a new session key; touch the map, the villagers present gather on the square.
              onPress={() => setFete(fete + 1)}
            >
              {fete > 0 ? `Fête ${fete}` : "Fête"}
            </AppButton>
            <AppButton
              testID="iso-sondes"
              fullWidth={false}
              size="2"
              variant={sondes ? "primary" : "outline"}
              // qa reads the load sizes by uiautomator: it turns this on first.
              onPress={() => setSondes(!sondes)}
            >
              {sondes ? "Sondes : oui" : "Sondes : non"}
            </AppButton>
            <AppButton
              testID="iso-quartiers"
              fullWidth={false}
              size="2"
              variant={blocs ? "primary" : "outline"}
              onPress={() => setBlocs(!blocs)}
            >
              {blocs ? "Quartiers : blocs" : "Quartiers : off"}
            </AppButton>
          </XStack>
        </>
      )}
      <View testID="iso-aire" style={{ flex: 1, overflow: "hidden" }} onLayout={mesurer}>
        <Sonde palier={palier} actif={sondes}>
          {/* The world around the island, as in the tab (the forest and sea follow the camera). */}
          {aire.w > 0 ? (
            <Monde
              biome="defaut"
              width={aire.w}
              height={aire.h}
              fond={fond}
              zoomMin={zmin}
              visible={visible}
              lumiere={lumiere}
            />
          ) : null}
          <GestureDetector gesture={gestes}>
            <Animated.View style={[{ flex: 1, alignItems: "center", justifyContent: "center" }]}>
              <Animated.View testID="iso-camera" style={transformation}>
                <PalierContext.Provider value={detail}>
                  <RatForceContext.Provider value={ratForce}>
                    <QuartiersContext.Provider value={blocs}>
                      <EffetForceContext.Provider value={effetForce}>
                        <IsoCarteDemo
                          palier={palier}
                          tousDebout={tousDebout}
                          horloge={horloge}
                          lumiere={lumiere}
                          blason={crest ? { crest, onPress: () => undefined } : undefined}
                          fete={fete > 0 ? `dev-${fete}` : undefined}
                        />
                      </EffetForceContext.Provider>
                    </QuartiersContext.Provider>
                  </RatForceContext.Provider>
                </PalierContext.Provider>
              </Animated.View>
            </Animated.View>
          </GestureDetector>
          {/* The crows fly over the forest, above the map as in the tab (H2-05). */}
          <Oiseaux
            ambiance={lumiere}
            width={aire.w}
            height={aire.h}
            horloge={horloge.c}
            depart={horloge.depart}
          />
          <PremierPlanSiPeint width={aire.w} height={aire.h} lumiere={lumiere} suivi={suivi} />
        </Sonde>
      </View>
    </YStack>
  );
}
