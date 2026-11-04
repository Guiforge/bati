// The buildings engine's layers around one building (PROMPT.md §6, §9.4): add-ons, the site
// teaser, the gag slot, light points, the night-only sprite, the clan mark and the keeper, drawn at
// the rank the building stands at. The building's own image comes in as `sprite`. The growth moment
// is not here: it plays on the map's real path (IsoCroissance, moment.ts).
//
// Everything is in map coordinates, like the sprite it draws over: `corps` is the sprite's
// rectangle on the map, the data's points are canvas px (`taille`), `corps.w / taille[0]` dp a px.
// Z-order, back to front: add-ons `behind`, the body (the sprite, the add-ons `sousAiles` and the
// map's own `couches`), then in front the add-ons, teaser, gag, night sprite, keeper, clan mark and
// lights, then `reclame`. Pieces are sized in dp, not in canvas px. With `masque` the building is
// hidden under a growth layer: nothing stands in front.
//
// Nothing here is tappable: every layer is `pointerEvents="none"`, lights are not targets, and the
// map's touch and "ready" lists (tapBatiment.ts, reclame.ts) do not know this file. With `actif`
// off (BATIMENT_MOTEUR, the default) this renders the sprite, `couches` and `reclame` in the map's
// own order and nothing else.
//
// shortcut: every `sprite` of the data is drawn as a flat placeholder piece, and the clan mark as an
// empty slot until its sprite is in IMAGES. When a building's paintings land, their path-to-require
// entries go there and the placeholders stay as the fallback (the mark never falls back on a
// vector). Lights breathe on the map's clock and stand still without it or with reduced motion.

import { Image } from "expo-image";
import { createContext, Fragment, type ReactNode, useContext, useEffect, useState } from "react";
import { View } from "react-native";
import type { AddOn, BuildingData, LightAnchor, Point } from "@/constants/buildingData";
import { buildingStageFor, type StageRule, type VisualStage } from "@/constants/buildingStages";
import { rawColors } from "@/constants/rawColors";
import { BATIMENT_MOTEUR, etatBatiment, type Marque } from "./batiment";
import type { Rect } from "./carteDemo";
import { LueurDouce } from "./LueurDouce";
import { MagieCiel, MagieSol } from "./MagieBld";
import { MouvementBld } from "./MouvementBld";
import { MOUVEMENTS } from "./motion";
import { RAYON_LUEUR } from "./mouvement";
import { PEINTS } from "./peints";

/** Placeholder sizes, dp: add-ons 10 or more, teasers 16 or more, figures 14 or more. */
const TAILLE = {
  addOn: 12,
  teaser: 18,
  gag: 16,
  gardien: 14,
  nuit: 20,
};

/** The clan mark's slot by form, dp, until its sprite is painted. */
const TAILLE_MARQUE: Record<Marque, readonly [w: number, h: number]> = {
  fanion: [8, 6],
  banniere: [6, 10],
  blasonSculpte: [7, 11],
  blasonLumineux: [7, 11],
};

/** The painted sprites by data path; empty until a building's art lands. */
const IMAGES: Readonly<Record<string, number>> = {};

/** What a piece needs to draw a painted element: the building, its light, dp per canvas px. */
const ElementsContext = createContext<{
  code: BuildingData["code"];
  nuit: boolean;
  k: number;
} | null>(null);

/** The style of a flat square centred on a map point. */
const forme = (at: Point, taille: number, couleur: string) =>
  ({
    position: "absolute",
    left: at[0] - taille / 2,
    top: at[1] - taille / 2,
    width: taille,
    height: taille,
    backgroundColor: couleur,
  }) as const;

/** A flat piece centred on a map point. */
function Piece({
  testID,
  at,
  taille,
  couleur,
  sprite,
}: {
  testID: string;
  at: Point;
  taille: number;
  couleur: string;
  /** The data's sprite path: drawn when it is painted, else the flat placeholder. */
  sprite?: string | null;
}) {
  const ctx = useContext(ElementsContext);
  const e = sprite && ctx ? PEINTS[ctx.code]?.elements[sprite] : undefined;
  if (e && ctx) {
    const [w, h] = [e.size[0] * ctx.k, e.size[1] * ctx.k];
    return (
      <Image
        pointerEvents="none"
        testID={testID}
        source={ctx.nuit ? e.nuit : e.jour}
        style={{ position: "absolute", left: at[0] - w / 2, top: at[1] - h, width: w, height: h }}
        contentFit="contain"
      />
    );
  }
  return <View pointerEvents="none" testID={testID} style={forme(at, taille, couleur)} />;
}

/**
 * The clan mark's slot: its sprite by form when there is one, else nothing visible. Never a
 * vector stand-in, so a form with no art shows no mark rather than a wrong one.
 */
function MarqueClan({ marque, sprite, at }: { marque: Marque; sprite: string | null; at: Point }) {
  const [w, h] = TAILLE_MARQUE[marque];
  const image = sprite ? IMAGES[sprite] : undefined;
  return (
    <View
      pointerEvents="none"
      testID={`batiment-marque-${marque}`}
      style={{ position: "absolute", left: at[0] - w / 2, top: at[1], width: w, height: h }}
    >
      {image === undefined ? null : (
        <Image source={image} style={{ width: w, height: h }} contentFit="contain" />
      )}
    </View>
  );
}

function Lueur({ kind, at }: { kind: LightAnchor["kind"]; at: Point }) {
  // The still light of a building with no motion file: a warm pool, soft to its edge (a building with one draws it in MouvementBld).
  return <LueurDouce kind={kind} at={at} rayon={RAYON_LUEUR[kind]} />;
}

export type PropsBatiment = {
  data: BuildingData;
  rank: number;
  /** The rank of the building an upgrade extends (rule B). */
  baseRank?: number;
  nuit?: boolean;
  rule?: StageRule;
  /** The sprite's rectangle on the map, dp. */
  corps: Rect;
  /** The sprite's canvas, px: the data's points are in it. */
  taille: Point;
  /** The anchor on the ground in the canvas, px. */
  ancre: Point;
  actif?: boolean;
  /** Hidden under a growth layer: nothing stands in front. */
  masque?: boolean;
  /** The building's image at a stage; . */
  sprite: (stade: VisualStage) => ReactNode;
  /** The map's own layers over the sprite (shadow, sails, fires, effects) at the stage the body wears. */
  couches?: (stade: VisualStage, rang: number, base: number) => ReactNode;
  /** The ready-to-rise mark: the last thing drawn. */
  reclame?: ReactNode;
};

export function BatimentMoteur({ actif = BATIMENT_MOTEUR, ...p }: PropsBatiment) {
  if (!actif) {
    const stade = buildingStageFor(p.data.code, p.rank, p.baseRank ?? 0, p.rule);
    return (
      <>
        {p.sprite(stade)}
        {p.couches?.(stade, p.rank, p.baseRank ?? 0)}
        {p.reclame}
      </>
    );
  }
  return <Moteur {...p} />;
}

type Etat = ReturnType<typeof etatBatiment>;
type Geo = { px: (o: Point) => Point; ancre: Point };
type Boite = { w: number; h: number };

const enBoite = (b: Boite) =>
  ({ position: "absolute", left: 0, top: 0, width: b.w, height: b.h }) as const;

/** The flat pieces in front: add-ons, teaser, the gag slot and the night sprite. */
function Devant({ etat, geo }: { etat: Etat; geo: Geo }) {
  const { px, ancre } = geo;
  const decale = (o: Point) => px([ancre[0] + o[0], ancre[1] + o[1]]);
  const { teaser, gag, gagSlot, nightSprite } = etat;
  const ouGag = gag?.at ?? gagSlot;
  return (
    <>
      {teaser ? (
        <Piece
          testID="batiment-teaser"
          at={decale(teaser.anchorOffset)}
          taille={TAILLE.teaser}
          couleur={rawColors.isoVocationBois}
          sprite={teaser.sprite}
        />
      ) : null}
      {ouGag && gag ? (
        <Piece
          testID={`batiment-gag-${gag.rank}`}
          at={px(ouGag)}
          taille={TAILLE.gag}
          couleur={rawColors.isoPierreChaudeMoyen}
          sprite={gag.sprite}
        />
      ) : null}
      {nightSprite ? (
        <Piece
          testID="batiment-nuit"
          at={decale(nightSprite.anchorOffset)}
          taille={TAILLE.nuit}
          couleur={rawColors.isoEclat}
        />
      ) : null}
    </>
  );
}

function Gardien({ at }: { at: Point }) {
  return (
    <View
      pointerEvents="none"
      testID="batiment-gardien"
      style={forme(at, TAILLE.gardien, rawColors.isoFanion)}
    />
  );
}

/** The add-ons of one layer, flat. */
function Ajouts({ layer, etat, geo }: { layer: AddOn["layer"]; etat: Etat; geo: Geo }) {
  const { px, ancre } = geo;
  const couleur =
    layer === "behind" ? rawColors.isoPierreChaudeSombre : rawColors.isoPierreChaudeClair;
  return (
    <>
      {etat.addOns
        .filter((a) => a.layer === layer)
        .map((a) => (
          <Piece
            key={a.rank}
            testID={`batiment-addon-${a.rank}`}
            at={px([ancre[0] + a.anchorOffset[0], ancre[1] + a.anchorOffset[1]])}
            taille={TAILLE.addOn}
            couleur={couleur}
            sprite={a.sprite}
          />
        ))}
    </>
  );
}

/** Everything that stands in front of the body. */
function Avant({
  etat,
  geo,
  rang,
  base,
  mouvement,
}: {
  etat: Etat;
  geo: Geo;
  rang: number;
  base: number;
  /** The building's motion file draws its lights (the painted building it was measured on). */
  mouvement: boolean;
}) {
  const { px } = geo;
  const ctx = useContext(ElementsContext);
  return (
    <>
      <Ajouts layer="front" etat={etat} geo={geo} />
      <Devant etat={etat} geo={geo} />
      {etat.gardien ? <Gardien at={px(etat.gardien.pose)} /> : null}
      {etat.marque && etat.marqueAt ? (
        <MarqueClan marque={etat.marque} sprite={etat.marqueSprite} at={px(etat.marqueAt)} />
      ) : null}
      {ctx && mouvement ? (
        <MouvementBld
          code={ctx.code}
          stade={etat.stage}
          rank={rang}
          base={base}
          nuit={ctx.nuit}
          px={px}
          k={ctx.k}
        />
      ) : (
        etat.lights.map((l) => (
          <Lueur key={`${l.kind}-${l.at.join()}`} kind={l.kind} at={px(l.at)} />
        ))
      )}
    </>
  );
}

function Moteur({
  data,
  rank,
  baseRank = 0,
  nuit = false,
  rule,
  corps,
  taille,
  ancre,
  masque = false,
  sprite,
  couches,
  reclame,
}: Omit<PropsBatiment, "actif">) {
  const etat = etatBatiment(data, rank, { baseRank, nuit, rule });
  const [vu, setVu] = useState(etat.stage);
  const [avant, setAvant] = useState<typeof etat.stage | null>(null);
  if (vu !== etat.stage) {
    setAvant(vu);
    setVu(etat.stage);
  }
  useEffect(() => {
    if (!avant) return;
    const id = setTimeout(() => setAvant(null), 700);
    return () => clearTimeout(id);
  }, [avant]);
  const k = corps.w / taille[0];
  const px = (o: Point): Point => [corps.x + o[0] * k, corps.y + o[1] * k];
  const geo: Geo = { px, ancre };
  const boite = { w: corps.x + corps.w, h: corps.y + corps.h };
  return (
    <ElementsContext.Provider value={{ code: data.code, nuit, k }}>
      {masque || !etat.magie ? null : <MagieSol magie={etat.magie} px={px} />}
      <Ajouts layer="behind" etat={etat} geo={geo} />
      <View pointerEvents="none" testID="batiment-corps" style={enBoite(boite)}>
        {/* The stage left stays under the new one while its image decodes: never a frame without the building. Same key as when it was the current one: the same view, not a new one that would decode again (blank). */}
        {avant ? <Fragment key={avant}>{sprite(avant)}</Fragment> : null}
        <Fragment key={etat.stage}>{sprite(etat.stage)}</Fragment>
        <Ajouts layer="sousAiles" etat={etat} geo={geo} />
        {couches?.(etat.stage, rank, baseRank)}
      </View>
      {masque ? null : (
        <View pointerEvents="none" testID="batiment-avant" style={enBoite(boite)}>
          {etat.magie ? <MagieCiel magie={etat.magie} px={px} nuit={nuit} boite={boite} /> : null}
          <Avant
            etat={etat}
            geo={geo}
            rang={rank}
            base={baseRank}
            mouvement={!!MOUVEMENTS[data.code] && PEINTS[data.code]?.donnees === data}
          />
        </View>
      )}
      {reclame}
    </ElementsContext.Provider>
  );
}
