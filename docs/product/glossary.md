---
title: Glossary
type: reference
status: draft
updated: 2026-09-14
related: [writing.md, ../design/audits/2026-09-10-french-copy.md]
---

# Glossary

The words Bati's game is made of, what each one means in Bati, and the term every language uses
for it. It exists because of what the French audits found in September 2026: nearly every error
was one English word with two senses, translated once in the wrong one and copied everywhere
(*step* became a stair, *round* a round of a match, *gauntlet* a winter glove, *streak* a set of
reps). A translation, by a person or a model, starts from this page and not from the English.

**How to read a row.** *Means* is the thing in the game, independent of any language. *Never* lists
the tempting word that already means something else in that language. An empty cell in `de` or
`es` is a term not chosen yet, not a term that does not need choosing.

**Status: draft.** English and French are what ships today. Two naming questions are still open,
listed at the end.

## Register

| | en | fr | de | es |
|---|---|---|---|---|
| The game talking to the hero | you | `tu` | | |
| The privacy policy and the safety notice | you | `vous` | | |

`writing.md` rule 5 holds the allowlist of surfaces allowed the document register.

## Training

| Term | Means | en | fr | fr never | de | es |
|---|---|---|---|---|---|---|
| quest | A workout template in the gallery, and the moment one is won | quest | quête | séance (a quest is picked, a séance is logged) | | |
| session | One logged thing, a workout or an outing | session | séance | session, entraînement | | |
| workout | A logged session that is not an outing. Only where the count runs through `isWorkout()` | workout | entraînement | séance | | |
| exercise | One entry in the catalogue | exercise | exercice | mouvement (kept for a movement family: push, pull, hinge) | | |
| rep | One repetition | rep | rép, répétition | | | |
| set | The reps done in one go on one movement | set | série | flamme | | |
| round | One pass through every movement of a quest | round | tour | manche (a round of a match) | | |
| rest | The pause between movements or rounds | rest | repos | | | |
| warm-up | The optional block before the first movement | warm-up | échauffement | | | |
| hold | A movement measured in seconds, not reps | hold | tenue | | | |
| target | The number to reach: a set's, an outing's, an oath's | target (goal for an outing) | objectif | cible | | |
| difficulty | Easy, Medium, Hard, chosen per quest | Easy / Medium / Hard | Facile / Moyen / Difficile | | | |
| training level | What the hero said at onboarding | Beginner / Regular / Advanced | Débutant / Régulier / Confirmé | | | |

## Progression

| Term | Means | en | fr | fr never | de | es |
|---|---|---|---|---|---|---|
| path | A ladder of movements from easiest to hardest | path | voie | chemin (taken by quest titles) | | |
| rung | One movement on a path | rung | étape | marche (a stair), échelon, cran | | |
| climbed | Every rung of a path owned | climbed | gravie | | | |
| record | A result beaten on one movement, in its own unit | record | record | a session's best | | |
| mark | A session's best: longest, most XP, longest outing | best | marque | record | | |
| badge on an old row | A best whose kind the row did not keep | PR | exploit | | | |
| ghost | What the hero did on this movement last time, shown during the set | last time / best | la dernière fois / record | | | |
| XP | Experience, one rep is one | XP | XP | | | |
| level | The hero's level, from XP | level | niveau | | | |
| rank | The title a level carries | Apprentice … Divine | Apprenti … Divin | Entraîné (says "trained") | | |

## Flame and oath

| Term | Means | en | fr | fr never | de | es |
|---|---|---|---|---|---|---|
| flame | The streak: days of consistency against a weekly quota | flame | flamme | série | | |
| flame tiers | Five stages of a long flame | Spark / Ember / Blaze / Inferno / Eternal | Étincelle / Braise / Brasier / Fournaise / Éternelle | Enfer (Hell) | | |
| weekly quota | Sessions a week that keep the flame lit | sessions a week | séances par semaine | | | |
| oath | The one goal a hero swears, fulfilled or abandoned | oath | serment | | | |
| swear | Taking an oath | swear | prêter serment, jurer | | | |
| fulfilled | An oath reached | fulfilled | accompli | | | |

## Fight

| Term | Means | en | fr | fr never | de | es |
|---|---|---|---|---|---|---|
| adventure | A chain of quests that ends on a boss | adventure (campaign in a heading) | aventure (campagne in a heading) | | | |
| step | One quest inside an adventure | step | étape | marche | | |
| boss | The monster at the end of an adventure | boss | boss | | | |
| HP | The boss's health pool for the campaign | HP | PV | | | |
| weakness / resistance | A muscle that deals half again, or half, the damage | weakness / resistance | faiblesse / résistance | | | |
| critical hit | A rep past the target that strikes harder | critical hit | coup critique | | | |
| enraged | The boss's last phase | enraged | enragé | | | |
| threat | How dangerous a boss is, 1 to 4 | threat level | niveau de menace | | | |
| loot | The victory screen's rewards | loot | butin | | | |
| gauntlet | The armoured glove, in titles and lore | gauntlet | gantelet | gant (a winter glove) | | |

## Village

| Term | Means | en | fr | fr never | de | es |
|---|---|---|---|---|---|---|
| village | What training builds | village | village | | | |
| building | One structure, raised by a muscle, a style or a deed | building | bâtiment | | | |
| rises | A building gaining a level | rises | monte | | | |
| ceiling | A building's last level | ceiling | plafond | | | |
| starter | The buildings the village begins with | starter | fondations | départ (a departure) | | |
| upgrade | A building that follows its base building | upgrade | amélioration | | | |
| deed | Bosses, adventures and leagues, as a building family | deed | haut fait | | | |
| achievement | An unlockable trophy | achievement | succès | | | |
| village tiers | The village's size names | Hamlet … Eternal Capital | Hameau … Capitale éternelle | | | |

## Outside the walls

| Term | Means | en | fr | fr never | de | es |
|---|---|---|---|---|---|---|
| outing | A session recorded by GPS, a walk, a run or a ride | outing | sortie | expédition (the code's word, `expedition`, never a reader's) | | |
| league | Bati's distance unit, one kilometre | league | lieue | | | |
| ground covered | The distance of an outing, as a label | distance | distance | terrain (a field) | | |
| moving time | Seconds the GPS saw the hero move | moving | en mouvement | | | |
| pace | Time per kilometre or mile | pace | allure | | | |
| climb | Height gained | climb | dénivelé | | | |
| trace | The drawn line of an outing | trace | tracé | trace (only the exported file) | | |
| recap | The screen after an outing | recap | récap | | | |
| beyond the walls | Outside, in the world's own words | beyond the walls | hors des murs | | | |
| High Road | The building leagues raise | High Road | Grand Chemin | | | |

## Open

Decisions nobody has taken yet.

1. **Title case in achievement titles.** French achievement titles are in Title Case
   ("Premiers Pas"), which `writing.md` rule 6 calls wrong French. Changing some and not the
   others would be worse than both.
2. **Rank titles.** *Ascendant* reads as "ancestor" in French, *Dévoué* as devoted to someone.
   Names, so the owner's call.

## Settled on 2026-09-14

- **Exercise**, not movement, in both languages. *Movement* survives only as a movement family.
- **Objectif** for every number to reach, in French. English keeps *target* for a set and an oath
  and *goal* for an outing: both are plain English and neither collides with another term.
- **Outing** / **sortie** wherever a reader looks, the privacy policy and the legal page included.
  `expedition` stays the code's word.
- **English follows French**: *flame* for the streak, *workout* only for a count that leaves
  outings out, *session* otherwise, *record* for an exercise and *best* for a session.

## Related

- [writing.md](writing.md): the sentence rules, and rule 7, the one-word-one-meaning table this
  page extends to every term.
- [../design/audits/2026-09-10-french-copy.md](../design/audits/2026-09-10-french-copy.md): the
  audit that found the collisions.
