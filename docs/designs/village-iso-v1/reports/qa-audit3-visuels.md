# qa-audit3 visuels : oiseaux la nuit, lucioles, dos de maquette

## Causes et corrections
1. **Oiseaux la nuit.** Deux sources. (a) `Oiseaux` (petitsDetails.tsx) avait `ambiance = "jour"` par défaut : les appelants qui l'omettent (dev-iso.tsx, qui n'est pas à moi) affichaient les mouettes la nuit. Défaut passé à `"nuit"` (`oiseaux: false`). (b) Les corbeaux des toits s'envolaient au toucher en V blanc, la nuit comme le jour. `corbeaux.ts` gagne `peutEnvoler(lumiere)` (faux la nuit), lu par `CorbeauToit` (nouvelle prop `lumiere`, déjà passée par `commun` dans IsoCarteDemo). La nuit le corbeau reste posé. Le jour : inchangé.
   - Note pour le chef d'équipe : dev-iso devrait passer `ambiance={lumiere}` à `<Oiseaux>` (fichier de l'autre).
2. **Lucioles** : `Grain` de Effets.tsx avec `FORMES_GRAIN.lucioles` (goutte irrégulière), contour `isoInk` (trait 0.6), à la place des cercles. Même nombre de nœuds (un seul groupe animé).
3. **Dos de maquette** : le choix est dans `orientation()` (marcheurs.ts), lu par `Marcheur` (IsoCarteDemo). `dos` vaut toujours `false` : le marcheur qui s'éloigne montre sa face peinte, en miroir (`miroir` inchangé). habitants.ts non touché, IsoCarteDemo non touché.
   - Dos à peindre (reprise d'art), `assets/images/village/iso/blockout/pieces/` : `villageois_{champion,farmer,herbalist,minstrel,sage,smith,watcher}_dos`. Puis lever le `shortcut` d'`orientation()`.

## Tests
- Ajoutés : crows (`peutEnvoler`, aucun envol la nuit), `no bird at night` (iso-petits-details : pas de volée par défaut, lucioles en tracés contournés, plus de cercle), `orientation` ajusté (iso-marcheurs).
- Adaptés car ils supposaient un vol de nuit : iso-corbeaux (hôte en `jour`), iso-ciel (pire cas : 0 envol la nuit), iso-worklets (`lumiere="jour"`), iso-familles (pire cas sans la famille `oiseaux`). `iso-perf-compteur` non modifié, vert.

## Commandes
- `heavy.sh rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : un premier passage a eu des OOM de workers ; en `-w 2`, tout vert sauf un délai de 15 s sous charge (iso-habitants-vue), vert seul (10/10).
- Ciblés après correction (ciel, worklets, familles, fuite, perf, corbeaux, petits, marcheurs) : verts.
- `heavy.sh npx tsc --noEmit` : propre. `biome check --write` sur mes fichiers : propre.
