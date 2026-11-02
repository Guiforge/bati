# T42 : inventaire bâtiment, rôles, poses

Rôles avec sprite de villageois (`spriteMarcheur`, marcheurs.ts `ROLES`) : smith, farmer, herbalist, watcher, sage, minstrel, champion. Pas d'archer, pas de mage distinct (le sage, robe de l'observatoire, sert de mage).
Poses de repos (reposTable.ts) : balaie, assis_tonneau, porte_panier, lit, joue_chat, dort, discutent, range_caisses (farm, barn), puise (well), regarde_loin (porte). Elles ne dépendent pas du rôle : seulement du lieu et du palier.

| Bâtiment | Rôle porté (T42) | Activités existantes | Manque |
| --- | --- | --- | --- |
| forge, armory | smith | balaie, lit, dort (bâtiment) | forgeron qui tape sur l'enclume |
| farm, barn, windmill | farmer | range_caisses (farm, barn), porte_panier | fermier à la houe, meunier |
| druid_grove | herbalist | balaie, lit, dort | cueille / pile des herbes |
| watchtower, castle_wall | watcher (garde) | regarde_loin (porte seulement), dort | garde debout, lance au pied de la tour ou du mur |
| observatory, wizard_tower | sage (mage) | balaie, lit, dort | mage qui lit / lance un sort |
| campfire | minstrel | assis_tonneau, discutent | joueur qui joue |
| champion_arena, heroes_hall | champion | balaie, lit, dort | entraînement |
| archery_range | aucun (générique) | balaie, lit, dort | archer ET sprite de rôle archer, pose qui tire |
| well | générique | puise | - |
| quarry, tent, training_dummy, fountain, dragon_lair, high_road | générique | poses de bâtiment | tailleur de pierre (quarry) |

Priorité des poses à peindre (sans les peindre ici) : forgeron qui frappe, mage qui lit, fermier à la houe, archer qui tire (avec son sprite), garde en faction.
