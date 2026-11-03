// The map's image and its shadow, apart from IsoCarteDemo so the layers that draw an image
// (Chantier, IsoCroissance) do not import the map that mounts them.
import { Image } from "expo-image";
import { useContext } from "react";
import { Image as ImageRN, PixelRatio } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { BuildingCode } from "@/db/schema";
import type { Rect } from "./carteDemo";
import { PalierContext, palierPour, SondeContext, tailleDecode } from "./detail";
import { entreePlanche, useDump } from "./dumpSprites";
import { type Biome, biomes, type SpriteIso } from "./isoSpec";
import { couleur, MASQUE, MIROIR, place } from "./styleCarte";

/**
 * A bundled image as its uri alone: without the asset's width and height, expo-image sets no
 * Glide `override` and Glide decodes at the view's size (see the header). Under jest, where an
 * image is not an asset id, the image itself.
 */
function aLaVue(image: number, taille: { width: number; height: number }) {
  const uri = ImageRN.resolveAssetSource(image)?.uri;
  // The decode size as width and height: expo-image turns them into Glide's `override` (see the
  // header), the size the camera's level needs (detail.ts).
  return uri ? { uri, ...taille } : image;
}

/** One image of the map: placed when `rect` is set, otherwise hidden with no source. */
export function Planche({
  s,
  rect,
  miroir = false,
  invisible = false,
  opacite,
  plafond = Infinity,
  echelle = 1,
  reduit = 1,
  ancre,
  teinte,
  onCharge,
  testID,
}: {
  s: SpriteIso | undefined;
  rect: Rect | null;
  miroir?: boolean;
  /** Drawn at opacity 0 (the growth layer plays over it); the image stays loaded. */
  invisible?: boolean;
  /** A fixed opacity below 1 (the lisiere fading into the sky); never animated. */
  opacite?: number;
  /** The highest detail level it is decoded at (the faded lisiere stays at the lowest, L4-T08a). */
  plafond?: number;
  /** A share of the decode size asked for (the lisiere: half, it is far and faded). */
  echelle?: number;
  /** Drawn at this share of its size, about its anchor, by a transform (a rock, T39): the view keeps its size. */
  reduit?: number;
  /** Where the sprite sits on the map when `rect` is local to a parent (the growth layer): the zone test uses it. */
  ancre?: Rect;
  /** A flat colour in the image's own silhouette (tintColor), used under an opacity to darken it. */
  teinte?: string;
  /** Called once the image has decoded (the lone building's opening waits for it). */
  onCharge?: () => void;
  testID: string;
}) {
  const detail = useContext(PalierContext);
  const sonde = useContext(SondeContext);
  // Dev-iso `?dump=`: tells the sprite dump where this image stands; a null context does nothing.
  useDump(() => entreePlanche({ s, rect, ancre, miroir, reduit, invisible, testID }));
  // Nothing to show, nothing mounted: a hidden image is still a native view (L4-T02).
  if (rect === null || s === undefined) return null;
  const niveau = Math.min(palierPour(detail.palier, detail.zone, ancre ?? rect), plafond);
  const taille = tailleDecode(niveau, rect.w, rect.h, s.size, PixelRatio.get() * echelle);
  // expo-image (Android) compares the Glide model, which holds the uri alone: a source whose only
  // change is `width`/`height` is not loaded again (ExpoImageViewWrapper.kt:582). `svgVariables`
  // changes with the level: its setter raises `shouldRerender` (l.133-142), in the same batch of
  // props as the source, and `rerenderIfNeeded` runs once all are set (OnViewDidUpdateProps), so the
  // request is built with the new size. No imperative `reloadAsync`: it raced the props (tour 6).
  // Webp ignores the variable. Nothing changes at mount, hidden, at the same level or at a stage swap.
  // Kept over `useImage(source, { maxWidth, maxHeight }, [niveau])` (L4-T03): that hook loads
  // asynchronously, so each of ~100 sprites would be blank at mount and hold a JS-owned ImageRef
  // (a hook cannot sit after the early return above without loading hidden sprites). This stays the
  // documented price: an expo-image that keys the model on the size, or stops rerendering for a
  // variable on a non-SVG source, breaks it silently. Recheck on each expo-image bump with the dev
  // probe (`iso-charge-*` at max zoom).
  const variables = { "--detail": niveau };
  const source = aLaVue(s.image, taille);
  return (
    <Image
      svgVariables={variables}
      source={source}
      // No cross-fade: expo-image keeps the drawn bitmap until the new decode arrives.
      transition={0}
      style={[
        place(rect),
        miroir ? MIROIR : null,
        reduit === 1
          ? null
          : {
              transformOrigin: [
                (s.anchor[0] * rect.w) / s.size[0],
                (s.anchor[1] * rect.h) / s.size[1],
                0,
              ],
              transform: [{ scale: reduit }],
            },
        invisible ? MASQUE : null,
        opacite === undefined ? null : { opacity: opacite },
      ]}
      contentFit="contain"
      tintColor={teinte}
      // expo-image's Android default, written out: Glide skips its memory cache, so a stage left
      // behind goes to the bitmap pool (one screen, about 10 MB) or to the GC, never to a 20 MB
      // cache of past tiers (L1-T17).
      cachePolicy="disk"
      testID={testID}
      onLoad={
        sonde || onCharge
          ? (e) => {
              onCharge?.();
              sonde?.(
                testID,
                e.source.width,
                e.source.height,
                typeof source === "object" && "uri" in source ? source.uri : String(source),
                e.source.url,
              );
            }
          : undefined
      }
    />
  );
}

/**
 * A painted building's own shadow on its socle's top, right above its sprite (L3-T01): one flat
 * path in the biome's socle shadow colour (a translucent paint, not a group opacity), over the
 * socle only (ombres.ts `ombreSocle` cuts it to the socle and leaves out what the walls hide).
 * Always mounted, hidden when empty, like the veils.
 */
export function OmbreSocle({
  code,
  socle,
  testID,
  biome = "defaut",
}: {
  code: BuildingCode;
  socle: { d: string; rect: Rect } | null;
  testID?: string;
  biome?: Biome;
}) {
  if (!socle) return null;
  const r = socle.rect;
  return (
    <Svg
      width={r.w}
      height={r.h}
      viewBox={`${r.x} ${r.y} ${r.w} ${r.h}`}
      style={place(r)}
      pointerEvents="none"
      testID={testID ?? `iso-socle-${code}`}
    >
      <Path d={socle.d} fill={couleur(biomes[biome].sol.socleOmbre)} />
    </Svg>
  );
}
