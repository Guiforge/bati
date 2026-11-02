# T27 point 1 : regard neuf sur les planches (31/10)

Regard neuf (iso-art-reviewer, Sonnet, REVUE-PROMPT.md tel quel, type « Bâtiment (série de stades) ») sur les 15 planches qui ont une image de l'app (reports/T27-paires.md). Les 6 autres (archery_range, farm, forge, quarry, well, windmill) n'ont pas d'image de l'app à comparer.

Lecture du chef : les échecs « grand absent » (items 10 à 12) de armory, barn, castle_wall, watchtower, fountain, observatory ne comptent pas : `isoSpec.json` leur donne deux stades (`rough`, `solid`), par conception. Le prompt figé ne fait pas juger la ressemblance avec l'image de l'app ; seuls les items de la grille le sont.

## Ce qui échoue vraiment
- **Palette trop saturée pour la nuit (item 9)** : armory (toit rouge vif, dalle bleu clair), heroes_hall (même chose), tent (dalle bleue claire, toile bleu-vert), watchtower (toit bleu vif au rough, rouge vif au solid), wizard_tower (murs violacés et toit rouge au grand), druid_grove (dalle lavande au grand). C'est la dérive vers le bleu saturé déjà notée (DECISIONS, L6-T01).
- **Stades restés en maquette (items 10, 11, 24)** : dragon_lair rough, druid_grove rough, fountain rough, observatory rough, high_road solid (et archery_range rough, sans image de l'app). Les 6 stades connus.
- **Lisibilité** : training_dummy trop petit pour se reconnaître, croissance à peine visible entre solid et grand ; high_road, saut mal lisible du rough au grand.
- Passent sans réserve : campfire, champion_arena ; barn et castle_wall passent hors items de stade.

Ces lignes vont sur la page de décision de T36.
