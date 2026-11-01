# Village iso V1 : ce qui reste (état du 31/10 au soir, fin de session du chef)

Guillaume, 31/10 : « Je vais relancer un claude, fini met tout à jour ». La session suivante reprend ici. Lis d'abord ce fichier, puis plan/README.md, plan/FINITION.md et les dernières entrées de LOG.md. Rien ne tourne, en dehors de la relecture de T45 tour 1 (§ 0).

## 0. À reprendre tout de suite
- [ ] **T45 tour 1 (la page Village devient le village)** est commité avec FIN-CAR tour 1. Sa relecture neuve est **pass**, avec trois points importants à corriger en premier :
  1. `.maestro/audit.yaml` (l. 173-185) : drapeau allumé, le tap optionnel sur `village-building-row` ne trouve rien, puis le `back` quitte l'onglet et la capture 16 est fausse. Il faut copier le `runFlow` conditionnel sur `village-drawer-open` de village-sheet-check.yaml.
  2. `VillageScene.tsx` (l. 863-869) : `openFromList` ferme le tiroir et ouvre la fiche dans le même rendu. Deux Sheet Tamagui sont alors en transition, et on retombe sur le piège connu (feuille fantôme, tap perdu). À tester sur l'émulateur en release. Si le défaut se voit, ouvrir la fiche à la fin de la fermeture.
  3. `village-scene.test.tsx` (vers la l. 690) : le test vérifie que la fiche s'ouvre, pas que le tiroir se ferme. Il faut affirmer l'état du tiroir.
  Points mineurs : retirer le `useCallback` de `closeDrawer` (et celui de `closeDetail`) ; drapeau allumé, la carte dorée ne joue plus pour personne, donc il faudra décider d'une annonce de séance au tour 2 ; le bandeau de 56 dp tronque son texte à 200 % (l'étiquette d'accessibilité reste complète).
- [ ] **qa sur l'émulateur, qui tourne (bati-bench démarré par le chef à la demande de Guillaume)**, dans une seule passe :
  1. A/B de perf selon le protocole de reports/perf-regression-audit3.md : liens `bati://dev-iso?ech=0.5&flaques=0&bornes=0`, 8 vagues mesurées par variante, mémoire sur 40 vagues. Au palier 12, la carte variait de 0,2 à 7,8 % d'images lentes selon la vague ; PSS de 494 Mo après 25 min, sans fuite JS trouvée.
  2. La révélation v2 filmée (5 révélations, planche de 12 images, gfxinfo ; elle était à 1,6 à 2,45 %). Juger si la légende se lit en 1,5 s, et TalkBack sur la légende.
  3. FIN-CAR tour 1 : le losange se devine-t-il encore au zoom 0,6 ? Raccord des champs et de la forêt, sorties de rue.
  4. T45 tour 1 : la page avec le drapeau `INTEGRATION` allumé (dev), le bandeau, le tiroir, 130 et 200 % de texte, le paysage.
- [ ] **Avant chaque commit d'iso** : lancer aussi `village-copy reduced-motion locale built language`. La sous-suite `iso- village-scene` ne les voit pas, et deux commits sont arrivés rouges sur HEAD le 31/10 (corrigés depuis).
- [ ] Remettre la branche à jour avec `main` (2.13.1 sur la branche, 2.13.3 sur main) : prévu en T35.

## 1. Décisions de Guillaume en attente
- [ ] **observatory_rough c0** : le chef recommande de l'accepter. Réponse attendue : « observatoire ok ». L'observatoire est de toute façon à redessiner (FIN-BAT, 3/10).
- [ ] Écouter `assets/sounds/village/night.ogg` et les 4 autres sons.
- [ ] Budget FLUX : 20,20 $ dépensés sur 40 $. Il reste à payer FIN-MAG (effets peints, environ 8,5 $), FIN-CAR tours 2 et 3 (environ 10 $), la peinture des quartiers de T44, et la repeinture des bâtiments faibles de FIN-BAT. Ça dépasse 40 $ : montrer le total à Guillaume avant de lancer la peinture.
- [ ] Ferme du tour 2 de peinture de T41 : relancée après le point d'arrêt des 20 $, sans nouvelles de l'artiste depuis. Arène, tente et tour du mage sont peintes (planches dans evidence/T41/peinture2/) et pas encore jugées par un regard neuf.

## 2. Où en est chaque chantier (détail dans plan/FINITION.md et plan/status.json)
- **T41** (magie, évolution, fierté) : la révélation v2 et les effets de dernier stade sont faits. Il reste la peinture du tour 2 (jugement des 3 planches, puis la ferme) et le point 4 de la fierté.
- **T42** (villageois du métier de leur voisin) : fait. Il manque les poses de métier (forgeron, mage, fermier, garde, archer) et les 7 dos à peindre (`villageois_*_dos`, cités dans le `shortcut:` de marcheurs.ts).
- **T43** (Mara et Théo) : le tour 1 est noté 4/5/3 et 4/4/3, et ses correctifs rapides sont faits. Les tours 2 à 4 restent, sur captures fraîches.
- **T44** (quartiers à la Civilization) : tour 1 en blocs de couleur (interrupteur de dev). Restent la vocation (à calculer dans db/village.ts) et les sprites, avec une seule taille d'image pour toute la famille (le cliquet des tailles est à 19 sur 20).
- **T45** (page Village) : tour 1 commité, relecture à refaire (§ 0). Tour 2 : retirer l'ancienne scène, ses images et le drapeau. Tour 3 : poser les trophées comme objets dans le village. Avant d'allumer le drapeau pour les joueurs : sortir les 96 maquettes du bundle et faire la mesure Fairphone.
- **FIN-BAT** : classement des 21 bâtiments dans reviews/FIN-BAT-tour1.md. Les pires : grand-route, observatoire, mannequin (3/10), bosquet des druides (4/10). Salle des héros à réduire d'environ 15 %.
- **FIN-ECH** : hiérarchie en trois rangs. Décision de Guillaume : la taille peut grandir avec le stade. Le bosquet est au rang « bâtiment » et grandit jusqu'au monument.
- **FIN-CAR** : tour 1 fait (bord simplifié, mer retirée, champs, chemins). Tours 2 et 3, peints, d'après reviews/FIN-CAR-brief.md.
- **FIN-MAG** : tours 0 et 1 faits (lecteur de planche, effets encrés, révélation v2). Planche factice de 36 Ko encore dans l'APK (shortcut dans Revelation.tsx). Le faisceau de l'observatoire est presque invisible, les lucioles du druide sont décalées.
- **FIN-VIL, FIN-ANI, FIN-LUM, FIN-BLE, FIN-DIS, FIN-DEC, FIN-ROU, FIN-MAN, FIN-SON, FIN-VOC** : voir FINITION.md. Les oiseaux de jour sont toujours à refaire (FIN-ANI).

## 3. Défauts connus, code (hérités, toujours ouverts)
- [ ] T39 : ombres du palier 1 en parallélogrammes, échelle des rochers et des villageois du palier 1, voile de cadre `LinearGradient` dans Monde.tsx, valeur de référence des sprites codée en dur dans iso-sol-encre.
- [ ] T40 : la profondeur de la paire est prise sur la case du premier.
- [ ] T31 : le comportement rare tombe nettement moins d'une session sur dix.
- [x] Fenêtres de jour : un pixel blanc isolé sur observatory_solid ; test_couvre_fenetres.py saute en silence les stades sans `couvre`. F2 : famille repeinte de jour, couvertures de jour retirées avec leur script.
- [ ] Budget d'animation à 63 sur 64 au pire : le Fairphone tranchera (HF).
- [ ] La caméra a sauté une fois environ 6 s après un toucher (qa-audit1). Ce n'est plus reproduit en qa-audit2, et la cause reste inexpliquée.

## 4. Fait dans la session du 31/10 (voir LOG pour le détail)
Effets de dernier stade ancrés ; fumée lente et désynchronisée ; villageois opaques ; routes plus sombres ; forêt en anneaux ; arbres nets ; caméra qui garde la terre à l'écran ; ombre de l'île sans coupure ; correctifs rapides de T43 ; T42 ; T44 tour 1 ; révélation v2 avec légendes en 5 langues ; oiseaux coupés la nuit ; plus aucun villageois de maquette ; FIN-CAR tour 1 ; T45 tour 1.

## 5. Le plan après ça (plan/INDEX.md)
FINITION (boucles par élément), T43 tours 2 à 4, T44 et T45 tours suivants, puis T33, T09, T05, T06, T34 second passage, AUD, T35, HF.

## Budget au 31/10 au soir
FLUX : 20,20 $ sur 40 $ au registre (`python3 scripts/iso/iso_loop.py budget`). Point d'arrêt des 20 $ levé par le chef pour la ferme du tour 2 de T41.
