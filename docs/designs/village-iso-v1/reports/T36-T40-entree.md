# T36 lots D et G, T40 : entrée des sprites peints dans l'app

Statut proposé : prêt pour revue. Auteur : engineer.

## Fait
- **7 villageois** : `evidence/T36/entree/villageois_<métier>_face.webp` copiés tels quels (octet pour octet) dans `assets/images/village/iso/pieces/villageois_<métier>_face.webp`, avec leur `.json` (copie de celui de la maquette : toile 768 x 768, ancre 384,704, canevas `villager`, `source: flux`, masque 8 px recalculé sur l'alpha). Même clé d'index que la maquette (`villageois/<métier>_face.nuit.webp`) : le peint l'emporte, la maquette `blockout/pieces/` reste sur disque, non requise. Pas de `_dos` (absent avant aussi).
- **10 poses de repos** : PNG détourés de la liste de `T40-peinture.md` (discutent : `T40pa3_c0`) convertis en WebP q90 alpha dans `assets/images/village/iso/repos/repos_<pose>.webp` + `.json` (copie du json maquette, `source: flux`). Toile 768 x 768 vérifiée par assertion ; ancres et pxScale de `reposTable.ts` inchangés, seules les 10 lignes `require` pointent sur `iso/repos/` (une ligne par pose).
- **Chat qui dort** (`chat_dort` c1) : recadré à sa boîte opaque, ramené à 115 x 95 et posé dans la vignette 142 x 107 à la boîte de l'ancienne (3, 9, 118, 104), ancre 77,80 et pxScale 2 gardés : `pieces/animal_chat_repos.webp`. C'est la pose de repos (image 0) du chat ; le comportement `dort` de `vieAnimaux.ts` (poses `[0]`) la joue donc déjà, sommeil compris. Aucun nœud ajouté, aucun code changé.
- **Provenance** : 18 entrées dans `scripts/provenance.json` (modèle, fournisseur, licence BFL, original signé + sha256, prompt, références, génération, découpe, `accepted_by: chef`, revue `reviews/T36-lotDG.md` ou `T40-peinture.md`), tirées des json des candidats du cache. `biome format` a remis le fichier à son style (diff : +805 / -11).
- Index `maquettes1..4.ts` régénéré (`UPDATE_ISO_MAQUETTES=1`) ; `__tests__/iso-maquettes.test.ts` : liste des sprites peints complétée (18 clés).
- Aucun `require` depuis `scripts/` ni `~/.cache` ; sprites de bâtiments non touchés.

## Poids ajouté à l'APK
- Sprites peints : 7 villageois 107,5 Ko, 10 poses 539,3 Ko, chat 4,7 Ko = **651,5 Ko**.
- Maquettes remplacées, plus requises donc non embarquées : 46,5 + 214 + 2 Ko. **Net : environ +390 Ko.**
- Mémoire de décodage : mêmes toiles 768 x 768 qu'avant (RGBA 2,36 Mo chacune), chat 142 x 107 ; `iso-detail` vert.

## Preuves
- `rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : `Test Suites: 70 passed, 70 total`, `Tests: 743 passed`.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : propre. `npx biome check --error-on-warnings components/village/iso __tests__/iso-maquettes.test.ts scripts/provenance.json` : 0 message.

## Vérifié
- Habitants recolorés (T26) : `HabitantVue` dessine l'alpha du sprite en `tintColor` sous le sprite à 55 %, sans lire de fichier propre : ils suivent les nouveaux sprites sans changement. À juger à l'image (corps maintenant peints en couleur).
- Boîte de toucher : 24 x 43 dp pour tous (`TOUCHE_L/H`). Largeurs opaques mesurées (dp de toile) : herboriste 28,75 (panier), smith 21,4, watcher 21,1, champion 20,4, minstrel 19, farmer 18,6, sage 14,9 ; hauteurs 31 à 34. Seul l'herboriste dépasse la boîte de 2,4 dp de chaque côté : un toucher sur le bord du panier est perdu, un voisin sur la case d'à côté (48 dp) n'est pas gêné. Je n'ai pas élargi la boîte (elle est commune) ; à décider si la qa le voit.

## Douteux
- Le masque `mask` des sidecars n'est lu que pour les bâtiments : calculé quand même.
- Le chat dort fixe toute la journée en pose de repos ; sa taille vient de la boîte de l'ancienne vignette, pas d'une mesure d'échelle à l'écran.
- Les maquettes blockout restent sur disque (utiles aux tests et au suivi) mais ne partent pas dans l'APK.

## À filmer (qa)
Build `.perf`, `bati://dev-iso`, paliers 1, 6 et 12 au repos :
1. Les 7 villageois de métier (près de leurs bâtiments) : peints, pieds posés sur leur case, pas de décalage ni de sprite rogné ; l'herboriste (panier) ne chevauche pas son voisin.
2. Habitants : recolorés (aplat teinté sous le sprite) lisibles, ombre de contact en place.
3. Les 10 poses : balaie, assis au tonneau, panier, lit, joue au chat (chat à 2 cases), dort contre un mur, discutent (paire face à face, palier 6+), range caisses, puise au puits, regarde au loin : bonne case, ancrées au sol, devant/derrière la façade correctement.
4. Toucher : villageois (surtout herboriste, bord du panier) et habitant en pose, bulle ouverte.
5. Chat : au repos, le chat dort roulé en boule à l'endroit de l'ancienne vignette, même taille ; pendant une vague il se lève (a/b maquettes) et se rendort.
6. Nœuds animés au repos inchangés (43), pire cas `iso-ciel` 63 sur 64 ; mémoire et fluidité comparées à la dernière mesure.
