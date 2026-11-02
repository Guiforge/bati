# qa-3110c-fix : trois défauts vus sur l'appareil

## 1. Libellé du son
`settings.sound` devient « Sons » (en « Sounds », de « Töne », es « Sonidos », ru « Звуки »), avec une ligne d'aide `settings.sound_hint` (bips de séance et ambiance du village) affichée sous le libellé : `SettingRow` prend une prop optionnelle `hint`. Les libellés `session.sound_on/off` du bouton de la pause suivent (le test paused-overlay exige qu'ils commencent par le nom du réglage). Un seul réglage, `soundEnabled`.

## 2. Éclat de l'observatoire
Cause : la forme, pas l'ancre. L'étoile partageait les 3 grains `PARTICULES` répartis sur toute la boîte de 40 dp (étoiles de 2 à 5 dp), qui montait de 26 dp : des points épars. Maintenant `PARTICULES_ETOILE` : une seule étoile d'environ 9 dp de rayon, en bas de la boîte posée sur le sommet du masque (or au dernier stade). Ancre `sommetDp` vérifiée : milieu de la rangée la plus haute du masque, comme pour la tour du mage vue bonne. Bosquet : même ancre, mais ses lucioles étaient à 0,7 de la taille (1 à 3 dp de rayon, vert sur fond sombre) : facteur retiré. Non vu sur appareil, à confirmer par qa.

## 3. Moment de la vibration
Cause trouvée dans `app/dev-iso.tsx` (chemin Prêt mesuré) : `revelerPret` faisait un `require("@/stores/settings")` paresseux, dont le premier chargement (base de données) prend environ 1 s en release et bloque le fil JS dans le rappel : vibration tardive en mouvement réduit (+1,2 s), et en normal le rappel du minuteur bloquait le rendu du nouveau stade. Corrections : le store est chargé au montage de l'écran (`reglagesPret()` dans un `useEffect`) ; dans `IsoVillage.tsx`, `reveler()` part d'un effet après le commit de l'étape 2 (le calque du nouveau stade est monté) et non plus dans le minuteur. Test : `iso-dev-screen` prouve le chargement au montage (compteur de la fabrique du mock) ; `iso-village` (Prêt, normal et réduit) et `iso-revelation` gardent l'annonce unique au moment du nouveau stade. Limite : je n'ai pas mesuré sur appareil ; la décode d'image du calque peut encore ajouter quelques dizaines de ms.

## Commandes
- `rtk proxy npx jest iso- village-scene settings locale paused-overlay --testPathIgnorePatterns=/node_modules/` : `Test Suites: 76 passed, 76 total`, `Tests: 840 passed`.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : propre.
- `npx biome check --write` sur mes fichiers et les 5 locales : propre (1 fichier reformaté).
