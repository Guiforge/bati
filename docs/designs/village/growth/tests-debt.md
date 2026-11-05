# Dette de tests de GROWTH

G15 (forêt du sud par palier, pied de la route, camp du palier 1), `components/village/iso/alentours.ts`. Aucun test lancé (consigne), ce qui suit est lu sur le code :

- `__tests__/iso-lisiere-sud.test.ts` : « the same masses at every tier » casse (la lisière du sud est calculée par bande, avant et après le coin, et la terre du sud ajoute des masses aux paliers 1 à 3) ; « no mass box ... covers a cell of the south road down to its last » casse (les cases de la route au-delà de gx + gy = 78, non peintes, sont libres pour fermer la découpe carrée).
- `__tests__/iso-alentours.test.tsx`, `iso-bord-nord-r5.test.ts`, `iso-bc-r2.test.ts` : lisent les masses de forêt, à relire (comptes et croisements avec les cases de la route) ; l'accessoire du camp aussi (quatre accessoires de plus au palier 1 : `caisses_2`, `sacs_de_grain_2`, `tonneaux_1`, `tas_de_bois_2`).
