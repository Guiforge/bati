# SUITE-ROUGE : six suites rouges, cause et correction

Aucune règle affaiblie. Sauf mention, la cause est dans le code ou la fixture.

1. reduced-motion : le test cherche `reducedMotion` ou `useAnimationProps`; l'iso passe par `useMouvementReduit` (fige.ts, T16), qui enveloppe `useReducedMotion`. Test : `useMouvementReduit` ajouté aux jetons reconnus (ASKS). Code : Bulle lit déjà le hook; `Poussiere` (Chantier.tsx) et `Marcheur` (IsoCarteDemo.tsx) animaient sans le lire (seul le parent les gardait), ils le lisent maintenant (pas de poussière, pas de coup de marteau en mouvement réduit).
2. react-compiler-coverage : rouge aussi sur HEAD, quatre fichiers non compilés (donc non mémoïsés en release). Corrigés dans le code, aucune entrée ALLOWED ajoutée.
   - useMarcheurs.ts : `finsRef.current = fins` dans un effet placé avant la déclaration de `fins`; l'effet est déplacé après.
   - IsoVillage.tsx : `camera` et `touchables` utilisés avant déclaration (ouvertureEn, onTap) : onTap reçoit désormais `vue` (useCameraIso.ts), ouvertureEn prend `vue`, le bloc est placé après `passer`; l'écriture de la prop `viseur.current` passe par `brancher()` hors du composant.
   - Bulle.tsx : `contenu(o, nom)` appelé en rendu avec une ref; appelé via le composant `Rendu`.
   - VillageScene.tsx : le Pan du titre lisait `scrollRef` dans un rappel construit en rendu; extrait en hook `useTitlePan(scrollRef, scrollY)`.
3. village-copy-forbidden-words : `village.iso.statue` et `statue_nu` contenaient « totem » (mot interdit) en fr, en, de, es. Copie réécrite (statue de l'animal, socle de la statue, etc.). Le russe garde « тотем » : la suite ne le contrôle pas, à voir avec la relecture ru.
4. villager-figure-village-only : le test attendait `<VillagerCameo>` après `testID="village-hero"` dans le texte; depuis T21 le cameo est dans le fragment `heroLayers` construit plus haut puis placé dans le tableau. Test réécrit pour exiger : cameo dans `heroLayers`, `{heroLayers}` placé dans le hero, avant `<VillageTier`. Aussi strict.
5. db-restSuggestions (deload) : dépend de l'heure et du changement d'heure du 25/10. Les séances sont à minuit local, le test les met à J-6; à 23h33 avec le décalage d'une heure, J-6 tombe à plus de 7x24 h et glisse dans la semaine précédente. Fixture décalée (1, 2, 3, 5), la règle de production est inchangée.
6. db-muscleBalance (stale_quest) : `now - 9 * 86400` s est lu comme 8 jours calendaires (le code compte `differenceInCalendarDays`) quand un changement d'heure s'intercale. Fixture en jours calendaires (`setDate`).

## Commandes
- `npx jest` sur les 6 suites + `__tests__/iso-` : 60 suites, 611 tests verts.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` et la suite complète : voir ci-dessous.
