---
title: Glossary
type: reference
status: draft
updated: 2026-10-17
related: [writing.md, ../design/audits/2026-09-10-french-copy.md]
---

# Glossary

The words Bati's game is made of, what each one means in Bati, and the term every language uses
for it. It exists because of what the French audits found in September 2026: nearly every error
was one English word with two senses, translated once in the wrong one and copied everywhere
(*step* became a stair, *round* a round of a match, *gauntlet* a winter glove, *streak* a set of
reps). A translation, by a person or a model, starts from this page and not from the English.

**Where the words are.** All of them are in `locales/<language>.json`; [writing.md](writing.md) § *Where copy lives* lists the few that are not, and why. That file
has no room for a comment, so what a translator needs to know about a term is written here.

**How to read a row.** *Means* is the thing in the game, independent of any language. *Never* lists
the tempting word that already means something else in that language. An empty cell in `de` or
`es` is a term not chosen yet, not a term that does not need choosing.

**Status: draft.** English, French, German and Spanish all ship. German and Spanish were
translated from this page, with French as a second source, and no native speaker has read them
yet. The app and the Play listing say so: `MACHINE_TRANSLATED` in `src/i18n/deviceLanguage.ts`
shows a note under the language row in Settings, and the `de-DE` and `es-ES` descriptions end on
the same warning. Set the flag to `false` and delete that paragraph once a fluent speaker has read
the language. Two naming questions are still open, listed at the end.

Russian ships too and has no column on this page yet. Most of `ru.json` came from a contributor
(PR #174); a model wrote the blocks that were tables in the code at the time (bosses, badges,
labels, rest messages), the keys added since, and the `ru-RU` listing, which is why its flag is up
and its listing ends on the same warning. Its catalogue (quests, movements, adventures) is in
English: it has no column in the database, see
[`adding-a-language.md`](../architecture/adding-a-language.md) step 4.

## Register

| | en | fr | de | es |
|---|---|---|---|---|
| The game talking to the hero | you | `tu` | `du` | `tú` (Spain, never `vosotros`) |
| The privacy policy and the safety notice | you | `vous` | `Sie` | `usted` |

`writing.md` rule 5 holds the allowlist of surfaces allowed the document register.

Two rules per language that a machine holds. Spanish never gives the hero a grammatical gender:
*bienvenido* and *cansado* assume one, so the copy says *¡Te damos la bienvenida!* and builds
the sentence around the action instead (`locale-style.test.ts` rejects the common adjectives). German nouns keep their capital
mid-sentence, so a label is never lowercased into a sentence (`inSentence()` in
`src/i18n/localized.ts`).

## Training

| Term | Means | en | fr | fr never | de | es |
|---|---|---|---|---|---|---|
| quest | A workout template in the gallery, and the moment one is won | quest | quête | séance (a quest is picked, a séance is logged) | Quest | misión |
| session | One logged thing, a workout or an outing | session | séance | session, entraînement | Einheit | sesión |
| workout | A logged session that is not an outing. Only where the count runs through `isWorkout()` | workout | entraînement | séance | Training | entrenamiento |
| exercise | One entry in the catalogue | exercise | exercice | mouvement (kept for a movement family: push, pull, hinge) | Übung | ejercicio |
| rep | One repetition | rep | rép, répétition |  | Wdh., Wiederholung | rep., repetición |
| set | The reps done in one go on one movement | set | série | flamme | Satz | serie |
| round | One pass through every movement of a quest | round | tour | manche (a round of a match) | Runde | ronda |
| rest | The pause between movements or rounds | rest | repos |  | Pause | descanso |
| warm-up | The optional block before the first movement | warm-up | échauffement |  | Aufwärmen | calentamiento |
| hold | A movement measured in seconds, not reps | hold | tenue |  | Halten | mantener |
| target | The number to reach: a set's, an outing's, an oath's | target (goal for an outing) | objectif | cible | Ziel | objetivo |
| difficulty | Easy, Medium, Hard, chosen per quest | Easy / Medium / Hard | Facile / Moyen / Difficile |  | Leicht / Mittel / Schwer | Fácil / Media / Difícil |
| written for | Who a quest was written for, the tag on its card | Beginner / Regular / Advanced | Débutant / Régulier / Confirmé |  | Einsteiger / Regelmäßig / Fortgeschritten | Principiante / Habitual / Avanzado |
| chronicle | The year's recap, a picture to share, offered in December and January | chronicle | chronique | bilan (a bilan is a report, the chronicle is the year told) | Chronik | crónica |
| light week | A week offered after two sessions in a row under the target (more than half of a session's strength sets missed; mobility and neutral sets do not count), or five weeks at four sessions or more: one round fewer, same variations (the ladder and tonight's target are frozen while it runs, and only the sessions whose rounds were actually lightened are stored `ladderNeutral`, so the ladder, the +1 and the cap series resume where they were; a quest the hero wrote, one whose rounds the hero set by hand, and a one-round quest are left alone and judged normally). Refusable, and a no silences the offer for 14 days. An accepted week lasts 7 days (`db/lightWeek.ts`) | light week | semaine légère | semaine de repos (it is a lighter week, not a rest) | leichte Woche | semana ligera |
| hard set | Every logged set of a workout movement whose pattern is not mobility, missed sets included; a hero's own movement with no pattern is out. The Stats count them per movement pattern over seven days | hard set | série dure | série (a set that was warm-up or a stretch is not hard) | harter Satz | serie dura |

## Progression

| Term | Means | en | fr | fr never | de | es |
|---|---|---|---|---|---|---|
| path | A ladder of movements from easiest to hardest | path | voie | chemin (taken by quest titles) | Pfad (not in quest titles: Weg) | senda |
| rung | One movement on a path | rung | étape | marche (a stair), échelon, cran | Stufe (not Schritt) | etapa (not escalón, a stair) |
| climbed | Every rung of a path owned | climbed | gravie |  | erklommen | coronada |
| record | A result beaten on one movement, in its own unit | record | record | a session's best | Rekord | récord |
| mark | A session's best: longest, most XP, longest outing | best | marque | record | Bestwert | mejor marca |
| badge on an old row | A best whose kind the row did not keep | PR | exploit |  | Bestwert | Marca (not Hazaña, the deed family) |
| ghost | What the hero did on this movement last time, shown during the set (a set; for a route see route ghost) | last time / best | la dernière fois / record |  | letztes Mal / Rekord | la última vez / récord |
| route ghost | The pale line of the hero's last outing on the same route, on the outing map and its recap | route ghost | fantôme de parcours | trace fantôme | Streckengeist (not Geist alone) | fantasma de recorrido |
| XP | Experience, one rep is one | XP | XP |  | XP | XP |
| level | The hero's level, from XP | level | niveau |  | Level | nivel |
| starting point | The hero's answer to "where are you at", which sets where a quest never played starts | starting point | point de départ | niveau (the hero's, from XP) | Ausgangspunkt | punto de partida |
| rank | The title a level carries | Apprentice … Divine | Apprenti … Divin | Entraîné (says "trained") | Lehrling … Göttlich | Aprendiz … Divino |

## Flame and oath

| Term | Means | en | fr | fr never | de | es |
|---|---|---|---|---|---|---|
| flame | The streak: days of consistency against a weekly quota | flame | flamme | série | Flamme | llama |
| flame tiers | Five stages of a long flame | Spark / Ember / Blaze / Inferno / Eternal | Étincelle / Braise / Brasier / Fournaise / Éternelle | Enfer (Hell) | Funke / Glut / Lohe / Feuersbrunst / Ewig (not Inferno) | Chispa / Brasa / Llamarada / Incendio / Eterna (not Infierno, and not Hoguera: the campfire is Fogata) |
| weekly quota | Sessions a week that keep the flame lit | sessions a week | séances par semaine |  | Einheiten pro Woche | sesiones por semana |
| oath | The one goal a hero swears, fulfilled or abandoned | oath | serment |  | Schwur | juramento |
| swear | Taking an oath | swear | prêter serment, jurer |  | schwören | jurar |
| fulfilled | An oath reached | fulfilled | accompli |  | erfüllt | cumplido |

## Fight

| Term | Means | en | fr | fr never | de | es |
|---|---|---|---|---|---|---|
| adventure | A chain of quests that ends on a boss | adventure (campaign in a heading) | aventure (campagne in a heading) |  | Abenteuer (Kampagne in a heading) | aventura (campaña in a heading) |
| step | One quest inside an adventure | step | étape | marche | Etappe | etapa |
| playthrough | One go at an adventure, from its first step to its end, or until the hero leaves it | playthrough (not run: an outing is "a walk, a run or a ride") | partie | course (an outing's word), campagne (the adventure's heading word), abandon | Durchgang (not Lauf, a jog) | partida (not carrera, a race) |
| boss | The monster at the end of an adventure | boss | boss |  | Boss | jefe |
| HP | The boss's health pool for the campaign | HP | PV |  | LP | PV |
| weakness / resistance | A muscle that deals 50% more, or half, the damage | weakness / resistance | faiblesse / résistance |  | Schwäche / Resistenz | debilidad / resistencia |
| critical hit | One or two reps past the prescribed target, striking harder. Never a hold | critical hit | coup critique |  | kritischer Treffer | golpe crítico |
| enraged | The boss's last phase | enraged | enragé |  | rasend | enfurecido |
| threat | How dangerous a boss is, 1 to 4 | threat level | niveau de menace |  | Bedrohungsstufe | nivel de amenaza |
| loot | The victory screen's rewards | loot | butin |  | Beute | botín |
| gauntlet | The armoured glove, in titles and lore | gauntlet | gantelet | gant (a winter glove) | Panzerhandschuh | guantelete |

## Village

| Term | Means | en | fr | fr never | de | es |
|---|---|---|---|---|---|---|
| village | What training builds | village | village |  | Dorf | aldea |
| building | One structure, raised by a muscle, a style or a deed | building | bâtiment |  | Gebäude | edificio |
| rises | A building gaining a level | rises | monte (not nourrit: a building is raised, not fed) |  | wächst | sube |
| ceiling | A building's last level | ceiling | plafond |  | Maximum (the app says "Am Maximum") | tope |
| starter | The buildings the village begins with | starter | fondations | départ (a departure) | Fundament | cimientos |
| upgrade | A building that follows its base building | upgrade | amélioration |  | Ausbau | mejora |
| deed | First wins, rematches, routes and leagues, as a building family | deed | haut fait |  | Heldentat | hazaña |
| first win | A boss beaten for the first time, what raises the Dragon Lair | first win | première victoire |  | erster Sieg | primera victoria |
| rematch | A beaten boss campaign finished again, what raises the Champion Arena | rematch | revanche |  | Revanche | revancha |
| route | A finished adventure that is not a boss, what raises the Hall of Heroes | route | route | chemin (taken by quest titles) | Route | ruta |
| crest | The shield of the village: the hero's animal, flame and rings | crest | écu | blason | Wappen | escudo |
| feast | A thing the village celebrates after a session: small (line), medium (card), large (full screen) | feast | fête (grande fête for the full screen) |  | not shown | not shown |
| tonight | The list of what a session changed | Tonight | Ce soir |  | Heute Abend | Esta noche |
| milestone | Sessions or outings until a building rises | milestone | jalon |  | not shown (the line says "Rang 2 in etwa 3 Einheiten") | not shown |
| achievement | An unlockable trophy | achievement | succès |  | Erfolg | logro |
| building rank | How far a building has risen, 1 to 10 (3 for an upgrade, 5 for the Lair, the Hall and the Arena), shown as "rank 3" | rank | rang | niveau (the hero's) | Rang | grado (not rango, the village's tier) |
| tier | One of the village's twelve stages, one painting each, raised by the hero's level | tier | palier | niveau (the hero's and a building's) | Ausbaustufe (not Stufe, a rung) | rango (not etapa, a rung) |
| village tiers | The village's size names | Hamlet … Eternal Capital | Hameau … Capitale éternelle |  | Weiler … Ewige Hauptstadt | Caserío … Capital eterna |
| training dummy | A starter building. Its name sits on a building card, so it must wrap at a space | Training Dummy | Mannequin de bois | Mannequin d'entraînement (wider than the card: it breaks mid-word at large font sizes) | Übungspuppe | Muñeco de madera |

## Outside the walls

| Term | Means | en | fr | fr never | de | es |
|---|---|---|---|---|---|---|
| outing | A session recorded by GPS, a walk, a run or a ride | outing | sortie | expédition (the code's word, `expedition`, never a reader's) | Tour | salida |
| league | Bati's distance unit, one kilometre | league | lieue |  | Wegstunde | legua |
| ground covered | The distance of an outing, as a label | distance | distance | terrain (a field) | Strecke | distancia |
| moving time | Seconds the GPS saw the hero move | moving | en mouvement |  | in Bewegung | en marcha (en movimiento wraps under its column) |
| pace | Time per kilometre or mile | pace | allure |  | Tempo | ritmo |
| climb | Height gained | climb | dénivelé |  | Höhenmeter | desnivel |
| trace | The drawn line of an outing | trace | tracé | trace (only the exported file) | Spur | trazado |
| recap | The screen after an outing | recap | récap |  | Rückblick | resumen |
| beyond the walls | Outside, in the world's own words | beyond the walls | hors des murs |  | jenseits der Mauern | más allá de las murallas |
| High Road | The building leagues raise | High Road | Grand Chemin |  | Hohe Straße | Camino Real |

## Open

Decisions nobody has taken yet.

1. **Title case in achievement titles.** French achievement titles are in Title Case
   ("Premiers Pas"), which `writing.md` rule 6 calls wrong French. Changing some and not the
   others would be worse than both.
2. **Rank titles.** *Ascendant* reads as "ancestor" in French, *Dévoué* as devoted to someone.
   Names, so the owner's call.

## Settled on 2026-09-14

- **Exercise**, not movement, in both languages. *Movement* survives only as a movement family.
- **Objectif** is what the app asks tonight (the big number on a set, the progressive target);
  **à battre** is the number that beats the record (`toBeat`, the wall's rule). Two numbers, two
  words: the first moves with the last session, the second with the record.
- **Objectif** for every number to reach, in French. English keeps *target* for a set and an oath
  and *goal* for an outing: both are plain English and neither collides with another term.
- **Outing** / **sortie** wherever a reader looks, the privacy policy and the legal page included.
  `expedition` stays the code's word.
- **English follows French**: *flame* for the streak, *workout* only for a count that leaves
  outings out, *session* otherwise, *record* for an exercise and *best* for a session.
- **Palier** for the village's tier, in French. It was *niveau*, the same word as the hero's level
  and a building's, so the Village's own header put two numbers called *niveau* side by side.

## Settled on 2026-10-04

- **Mot de passe des sauvegardes** / *backup password*, the one name for what protects a backup.
  Never "secret" or "passphrase" in front of a hero.
- **Les douze mots** / *the twelve words* for the recovery key of a new vault; *clé de récupération*
  survives only for a format 2 vault, which shows 64 characters.
- **Mon héros à l'abri** / *My hero, safe* for the single place where the daily copy and device sync
  are chosen. **Enregistrer un fichier** / *Save a file* for Android's Save as, **Envoyer à une autre
  app** / *Send to another app* for the share sheet.

## Settled on 2026-10-17

- **Partie** / *playthrough* / *Durchgang* / *partida* / ru *прохождение*, D-34. The hero *leaves* a
  playthrough ("Laisser la partie"), never abandons or fails it, and a left playthrough is shown
  nowhere. The code keeps its word, `adventure_runs`/`run`.

## Related

- [writing.md](writing.md): the sentence rules, and rule 7, the one-word-one-meaning table this
  page extends to every term.
- [../design/audits/2026-09-10-french-copy.md](../design/audits/2026-09-10-french-copy.md): the
  audit that found the collisions.
