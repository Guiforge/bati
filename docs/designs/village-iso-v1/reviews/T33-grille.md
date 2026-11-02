# T33 : grille « village vivant »

Source : la fiche de Guillaume « Bati : audit du village vivant » (https://claude.ai/artifact/RKERTUXzAs4f9fp7HcTVLc), plus les règles de la roadmap du village (https://claude.ai/artifact/4kesL29VDvFVXveZw7pCq4). Une ligne par case ; « Mesure » dit comment on la juge ici. **B** = bloquante. **HF** = mesurée par Guillaume au Fairphone à la porte finale. Bati+ : hors V1 (Guillaume, 31/10), non jugé.

Colonnes à remplir à chaque tour : `T1`, `T2`, `T3` = pass, fail (avec raison) ou n/a.

## Règles Bati (bloquantes)
| # | Case | Mesure | T1 | T2 | T3 |
| --- | --- | --- | --- | --- | --- |
| B1 | Le plafond d'animations tient | iso-ciel : pire mesuré ≤ 64 (63 au 31/10) | | | |
| B2 | 8 éléments animés au plus par écran, 12 points tapables au plus | compte qa par capture (familles T16 ; testID tapables) + test à écrire si absent | | | |
| B3 | Mémoire au palier 12 | CRITÈRES n° 7 (Village actuel + 80 Mo) : émulateur en T06, **HF** au Fairphone | | | |
| B4 | Le hasard ne touche que la vie, jamais ce qui est construit | lecture du code + test : même journal et même graine, mêmes bâtiments à tout jour | | | |
| B5 | Test doré : même journal, même graine, même village | golden-hero et un test iso de la carte à graine fixe | | | |
| B6 | Rien ne recule, rien ne disparaît | test : aucun bâtiment ni stade retiré après une absence ou une correction du journal | | | |
| B7 | Cibles de 48 dp, une seule bulle à la fois | test du tap au masque + test de bulle unique | | | |
| B8 | Aucune pastille, badge ni notification | lecture du code et captures | | | |
| B9 | Aucun emplacement vide | captures aux paliers 1, 6, 12 | | | |
| B10 | Rien pendant une séance ou une sortie GPS | iso-regle-seance | | | |

## La DA voulue par Guillaume (31/10)
« effet majique whou fantastique RPG mediaval Fantaisy , sympa on veut sentir l'evolution dans les batiment un coté sympa et fier de voir son village grandir »
| # | Case | Mesure | T1 | T2 | T3 |
| --- | --- | --- | --- | --- | --- |
| F1 | Magie fantasy médiévale visible, un « whou » | regard neuf sur films de vague et de révélation | | | |
| F2 | On sent l'évolution de chaque bâtiment d'un stade à l'autre | planches des trois stades (T41) | | | |
| F3 | Sympa et chaleureux, pas austère | regard neuf + persona | | | |
| F4 | Fier de voir son village grandir | captures paliers 1, 6, 12 côte à côte + persona | | | |

## Ambiance générale
| # | Case | Mesure | T1 | T2 | T3 |
| --- | --- | --- | --- | --- | --- |
| A1 | Jamais plus de 2 vrais mouvements à la fois | film de vague, compte image par image | | | |
| A2 | Les animations ne volent pas la vedette aux bâtiments tapables | regard neuf d'écran | | | |
| A3 | Le calme domine | film de 3 minutes, part du temps sans vague | | | |
| A4 | Un petit moment « oh c'est mignon » par session | test des 3 minutes (regard neuf et persona) | | | |
| A5 | Même trait, mêmes couleurs, même lumière que les bâtiments | regard neuf d'écran (REVUE-UI-PROMPT) | | | |
| A6 | Lisible à 2 ans d'usage, village plein | capture palier 12, zoom mini | | | |

## Animaux et villageois
| # | Case | Mesure | T1 | T2 | T3 |
| --- | --- | --- | --- | --- | --- |
| V1 | Chaque animal a ses comportements et sa personnalité | vieAnimaux.ts + film | | | |
| V2 | Durées variables | iso-vie-animaux | | | |
| V3 | Transitions, jamais de téléportation | iso-vie-animaux + film | | | |
| V4 | Un comportement finit avant le repos | iso-vie-animaux | | | |
| V5 | Le grand geste est dans les comportements, pas le repos | lecture de la table | | | |
| V6 | Décalage au lancement | iso-vie-animaux | | | |
| V7 | Vitesses différentes (± 10 %) | iso-vie-animaux | | | |
| V8 | Départ à gauche ou à droite | limite connue (une seule case libre) : n/a ou fail argumenté | | | |
| V9 | Le rare tombe environ une session sur dix | calcul sur la table et la graine ; limite connue (T31) | | | |

## Décor qui vit
| # | Case | Mesure | T1 | T2 | T3 |
| --- | --- | --- | --- | --- | --- |
| D1 | Feux, eau qui coule, moulin, fumée | film de vague | | | |
| D2 | Petits détails variés (lucioles, oiseaux, effets de métier) | film de vague | | | |
| D3 | Les petites maisons ne bougent pas | n/a en V1 (pas de remplissage de maisons) | | | |
| D4 | Le décor qui bouge reste lent et petit | regard neuf sur film | | | |
| D5 | Boucles de longueurs différentes, jamais synchro | lecture des durées (horloge, feux, reflets) | | | |
| D6 | Le décor change avec la prospérité sans rien déplacer | captures paliers 1, 6, 12 (rues, clairière) | | | |

## Le temps qui passe
| # | Case | Mesure | T1 | T2 | T3 |
| --- | --- | --- | --- | --- | --- |
| H1 | Lumières : fenêtres et lanternes la nuit, rien de chaud le jour | captures jour et nuit (T15, T38) | | | |
| H2 | La nuit reste lisible | capture nuit, palier 12, zoom mini | | | |
| H3 | Comportements selon l'heure, saisons | n/a en V1 (lot 2a) | | | |

## Qualité des animations
| # | Case | Mesure | T1 | T2 | T3 |
| --- | --- | --- | --- | --- | --- |
| Q1 | Pas de saut au redémarrage d'une boucle | film image par image | | | |
| Q2 | Anticipation | film de la révélation (creux avant le ressort) | | | |
| Q3 | Suivi | n/a sans clips peints (T36 lot G) | | | |
| Q4 | Rien ne démarre ni ne s'arrête sec | film | | | |
| Q5 | Passages fondus d'un clip à l'autre | film des animaux | | | |
| Q6 | Trait et couleurs des animaux comme les bâtiments | regard neuf d'art (après T36) | | | |
| Q7 | Pas d'image déformée à aucun zoom | captures zoom mini et maxi | | | |
| Q8 | Animaux lisibles au zoom mini | capture zoom mini | | | |

## Son
| # | Case | Mesure | T1 | T2 | T3 |
| --- | --- | --- | --- | --- | --- |
| S1 | Fond doux qui ne boucle pas de façon audible | écoute de Guillaume | | | |
| S2 | Sons d'animaux selon le comportement | n/a en V1 (hors T32) | | | |
| S3 | Le son d'un bâtiment monte au zoom | iso-son-village ; appareil non mesurable par adb | | | |
| S4 | Pas deux fois le même bruit d'affilée | n/a en V1 (un seul one-shot, le marteau) | | | |
| S5 | Tout se coupe en un geste | réglage « Sons » (qa-3110c) ; mode silencieux : limite acceptée | | | |
| S6 | Licences compatibles open source et Play | CREDITS.md, CC0 vérifié | | | |

## Toucher
| # | Case | Mesure | T1 | T2 | T3 |
| --- | --- | --- | --- | --- | --- |
| T1 | Un animal qui réagit compte dans les 12 tapables | n/a (aucun animal tapable en V1) | | | |
| T2 | Réaction courte, ne bloque rien | villageois touché : 180 ms puis bulle (T26) | | | |
| T3 | Un tap sur un animal ou un villageois ne donne rien au jeu | lecture du code | | | |
| T4 | Rien qui bouge ne gêne le tap d'un bâtiment | test du tap pendant une vague + regard sur film | | | |

## Perf, batterie, accessibilité, tests
| # | Case | Mesure | T1 | T2 | T3 |
| --- | --- | --- | --- | --- | --- |
| P1 | Ce qui n'est pas à l'écran ne s'anime pas | lecture du code (montage par vue) | | | |
| P2 | Pause en arrière-plan et au changement d'onglet | iso-regle-seance + qa | | | |
| P3 | Fluide au zoom et au glissé | **HF** (perf.sh au Fairphone) | | | |
| P4 | « Réduire les animations » respecté | qa-3110b (échelles à 0) | | | |
| P5 | Images : une feuille par animal, petites tailles | inventaire des images (T06) | | | |
| P6 | Mode test figé | iso-fige, Maestro | | | |
| P7 | Hasard fixé en test | graine (jour, vague) partout | | | |

## Test des 3 minutes (jour et nuit, paliers 1 et 12)
| # | Case | Mesure | T1 | T2 | T3 |
| --- | --- | --- | --- | --- | --- |
| M1 | Jamais « ah, ça recommence » | regard neuf sur film de 3 min | | | |
| M2 | Apaisant, pas fatigant | regard neuf + persona | | | |
| M3 | Au moins un moment mignon | regard neuf + persona | | | |
| M4 | On sait toujours où taper pour faire évoluer | regard neuf + persona | | | |
| M5 | Un persona l'a fait (joueur RPG, sportif du dimanche) | `anthropic-skills:audit-personas-bati` sur les films | | | |
