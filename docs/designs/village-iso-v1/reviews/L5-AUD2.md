# Audit du lot 5 bis (iso-tech-auditor, modèle du chef, 30/10)

Plage 5f54856f..HEAD (b1836c12, 64be6b47, 9882cab7).

VERDICT : PASS. Aucun bloquant. Trois importants à solder avant de fermer L5-AUD2.

Lancé par l'auditeur : jest ciblé (33 suites, 379 tests verts), tsc exit 0, `react-compiler-coverage` et `reduced-motion` verts, biome `--error-on-warnings` propre sur les 42 fichiers.

## IMPORTANTS

I1. Suite jest complète non relancée depuis ces trois commits (dernier run complet : L5-AUD-fix, 437 suites). Le critère 9 ne compte qu'un run complet sous Node 24. Correction : `nvm exec 24`, suite complète par heavy.sh, ligne `Test Suites:` lue par `rtk proxy`, recopiée dans LOG.

I2. La garde des worklets ne voit pas l'envol du corbeau : `__tests__/iso-worklets.test.tsx:105-123` ne fait jamais de toucher proche, donc `Envol` (`CorbeauxToits.tsx:141`) n'est pas monté ; les callbacks de geste (`useCameraIso.ts:149-161`, qui appellent `carteDepuisEcran`) ne passent pas par la garde. Vérifié à la main aujourd'hui (`corbeaux.ts:47,53,65`, `navigation.ts:82`, `marcheurs.ts`, `scheduleOnRN` dans `CorbeauxToits.tsx:71-72`), mais rien ne le verrouille. Correction : `pan.begin({x,y})` sur le toit de la ferme (calcul de `iso-corbeaux.test.tsx:279`) dans le test IsoVillage.

I3. Pire cas de 57 = somme de constantes (`iso-ciel.test.tsx:286-291`, `51 + 4 + 2`), pas une mesure. Recalcul de l'auditeur : repos 47, croissances 2 → 51, veilleuses 2 + 2 → 55, 2 corbeaux → 57, animaux 0 ; aucune autre source trouvée. Un test qui rend 4 croissances sans feu + veilleuses + deux touchers sur les toits et compte les nœuds le prouverait.

Toujours ouverts depuis L5-AUD : I2 (plafond 64 relevé par le chef, à Guillaume), I5 (critères 6 et 7 non mesurés), I7 (critère 8).

## MINEURS
- `useMarcheurs.ts:124-133` : veille et bêtes s'éteignent à `cibleVague(c0)` d'origine ; une vague prolongée ne les rejoue pas ; non commenté.
- `IsoCarteDemo.tsx:897-912` : un animal qui finit vers la gauche reste en miroir jusqu'à la remise à zéro (200 ms après la vague), puis bascule d'un coup ; une boucle sur deux.
- `CorbeauxToits.tsx:61-74` : réaction rattachée à chaque rendu, rattrapée par la garde de 2,6 s ; correct, pas voulu.
- Corbeau parti en mouvement réduit : ne revient qu'au remontage (`horloge.ts:106`).
- `CorbeauxToits.tsx:102` : sens selon `code.length`.
- `veilleuses.ts:92-97` : 3 clignotements par cycle, 9 à 12 allumages par vague ; risque de guirlande.
- `VeillesDessinees.tsx:20` : `DEMI_PORTE = 46` en px de sprite, taille en dp variable selon le sprite.
- `toits` indexé par `code_stade` seulement (`isoLayout.json:85-91`), test de masque sur le sprite par défaut (`iso-corbeaux.test.tsx:70-79`) ; critère 10 demande un masque de toit exporté.
- Textes périmés : `carteDemo.ts:276` « never walking (lot 5) » ; `_doc` d'`isoLayout.json` cite `iso-corbeaux.test.ts` (fichier en `.tsx`) ; STATE « Prochaine action » (corrigé depuis).

## Solide
Drapeau `INTEGRATION` éteint (`constants/isoPoc.ts:29`), production inchangée ; rien au repos, après vague, en mouvement réduit ni hors focus ; graines `jour:numero:code` et `jour:numero:betes` testées ; « same tree » de B1 vert ; collisions des animaux testées ; corbeaux par vrai `pan.begin`, point de toit vérifié sur le masque, corbeau masqué pendant la croissance ; règles du dépôt tenues ; FLUX 0 $ ce lot (V1 2,008 $) ; 17 reflets chacun dans sa couche.

## À regarder sur appareil (en release)
1. Couches de reflets par-dessus ferme, moulin, grange, arène ; reflet 2-9 retiré ; coût des 5 vues plein cadre (gfxinfo).
2. Fenêtres et porte : placement (pente 30°, taille), guirlande ou maison qui vit, lueur par-dessus le villageois devant la porte.
3. Animaux : sortie et retour, sens du regard, bascule en fin de vague.
4. Corbeaux : lisibilité à 14 × 10 dp sur ferme et forge (fumée), envol à moins de 56 dp aux zooms 0,6 et 1,0, retour d'un coup.
5. Images par seconde sur la vague la plus chargée (2 croissances, 4 veilleuses, 2 envols), 0 image 10 s après, mouvement réduit immobile.

Non vérifié : suite complète, Maestro, deadcode, appareil.

# Revue des corrections de L5-AUD2 (iso-code-reviewer, neuf, 30/10)

VERDICT : PASS (relecture statique, jest non lancé). Aucun bloquant, aucun important.
- I2 (`iso-worklets.test.tsx:130-146`) : vrai `begin({x,y})` sur le perchoir de la ferme, `iso-corbeau-envol-farm` monté avant `defauts()` ; la garde parcourt récursivement les fermetures passées aux hooks. Mutation rouge sur `envolCorbeau` annoncée, non rejouée.
- I3 (`iso-ciel.test.tsx:306-327`) : pire cas rendu et compté (vague avec veilleuses, deux `toucherToit`), `=== 57` et `<= PLAFOND-7` ; 47, 51, 55, 57 viennent de rendus.
- Mineurs sans effet ailleurs (commentaires, `_doc`, `jourDe` déjà utilisé par `useMarcheurs.ts:80`).
MINEURS : calcul écran → carte du doigt copié dans 3 tests ; `configure({ defaultIncludeHiddenElements: true })` au niveau du module (`iso-worklets.test.tsx:109`) ; `hasard(jour, 11 + code.length)` même graine pour deux codes de même longueur (farm et forge diffèrent aujourd'hui).
