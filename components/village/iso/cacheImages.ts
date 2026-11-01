import { Image } from "expo-image";
import * as SecureStore from "expo-secure-store";

import { EMPREINTE_SPRITES } from "./empreinteSprites";

const CLE = "village.empreinteSprites";

/**
 * Glide keys a bundled image on its numeric resource id plus the version code, and expo-image's
 * `cacheKey` only reaches http(s) sources (SourceMap.kt: a `res:` uri takes UriModelProvider, which
 * drops it). So `install -r` of a same-version build with new pixels served the old sprites. The
 * fingerprint of the images is the key instead: when it differs from the last one seen, both Glide
 * caches are emptied before the village draws.
 */
export async function viderCacheSiSpritesChanges(empreinte: string = EMPREINTE_SPRITES) {
  if ((await SecureStore.getItemAsync(CLE)) === empreinte) return false;
  await Image.clearMemoryCache();
  await Image.clearDiskCache();
  await SecureStore.setItemAsync(CLE, empreinte);
  return true;
}
