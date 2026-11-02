verdict: pass

Revue neuve (iso-code-reviewer, Sonnet) des corrections de L5-AUD et de l'item 28 de la revue d'écran, non commitées, base cba2f90f. Texte du relecteur condensé par le chef.

IsoCarteDemo.tsx : +18/-10, trois zones (import Ellipse, `ambiance` passée à `Feux` en `:537`, ombre en Svg Ellipse ~826) ; aucun bloc en double, rien de perdu par rapport à cba2f90f.
BLOQUANTS : aucun.
IMPORTANTS : (1) au-delà de 2 croissances, le nouveau stade s'affiche d'un coup et la célébration est perdue (`IsoVillage.tsx:~127-132`) ; le `ponytail:` doit nommer le vrai correctif (repris par le chef : file de rejeu à la prochaine visite). (2) La garde des worklets compare les noms de la liste blanche (`iso-worklets.test.tsx:~52`) : une fonction non worklet nommée `poser` passerait.
MINEURS : JSDoc empilés à `IsoVillage.tsx:46-48` (repris par le chef) ; marche arrêtée à la profondeur 8 sans le dire ; B1 « pas de défaut de rendu » affirmé, pas mesuré ; `afterEach` de `mockReduit` dans un describe partagé.
RÉPONSES : B1 masque légitime (`planifierVague` testé déterministe, `iso-marcheurs.test.ts:157`, `:259`) ; I6 « jour » donne 0 lune, 0 étoile, 0 luciole, 0 flamme (testé), la fumée reste ; item 28 : trois aplats (`BANDES_LUEUR`), lucioles sans trait, ombre au token `isoSocleShadow` ; seul dégradé restant, le halo de la lune (`ciel.tsx`), antérieur.
