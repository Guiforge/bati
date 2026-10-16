---
title: Glossary
type: reference
status: draft
updated: 2026-10-29
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
and its listing ends on the same warning. Its catalogue (quests, movements, adventures) was written
by a model too, in migration `0080`, from the English with the French beside it and against the
vocabulary of `ru.json` (`кор` for the core, `задание` for a quest, `клятва` for an oath). It has no
column on this page yet.

Chinese ships too, with its column on this page, and the same shape of debt as Russian: a model
translated `zh.json` from this page and from `en.json` (French as a second source), no fluent
speaker has read it, so the flag is up and the `zh-CN` listing ends on the same warning. Its
catalogue is in English for the same reason: no column in the database yet. Chinese adds no
machine-held rule of its own: it has no grammatical gender and no noun case, so neither the
Spanish adjective check nor `inSentence()` has anything to hold there. What it does have is the
`never` column below, because the training words (次/组/轮, 锻炼/训练/户外训练) collide the way
*séance* and *entraînement* do.

## Register

| | en | fr | de | es | zh |
|---|---|---|---|---|---|
| The game talking to the hero | you | `tu` | `du` | `tú` (Spain, never `vosotros`) | 你 |
| The privacy policy and the safety notice | you | `vous` | `Sie` | `usted` | 您 |

`writing.md` rule 5 holds the allowlist of surfaces allowed the document register.

Two rules per language that a machine holds. Spanish never gives the hero a grammatical gender:
*bienvenido* and *cansado* assume one, so the copy says *¡Te damos la bienvenida!* and builds
the sentence around the action instead (`locale-style.test.ts` rejects the common adjectives). German nouns keep their capital
mid-sentence, so a label is never lowercased into a sentence (`inSentence()` in
`src/i18n/localized.ts`).

## Training

| Term | Means | en | fr | fr never | de | es | zh | zh never |
|---|---|---|---|---|---|---|---|---|
| quest | A workout template in the gallery, and the moment one is won | quest | quête | séance (a quest is picked, a séance is logged) | Quest | misión | 任务 | 训练 (a quest is picked, a 训练 is logged) |
| session | One logged thing, a workout or an outing | session | séance | session, entraînement | Einheit | sesión | 训练 | 锻炼, 户外训练 |
| workout | A logged session that is not an outing. Only where the count runs through `isWorkout()` | workout | entraînement | séance | Training | entrenamiento | 锻炼 | 训练, 户外训练 |
| Forge | A place: the village building a chest session raises, and the page where the hero makes quests, adventures and exercises and imports a file. One word, one place | Forge | Forge | forge (the building and its page are the same Forge) | Schmiede | Forja |  |  |
| exercise | One entry in the catalogue | exercise | exercice | mouvement (kept for a movement family: push, pull, hinge) | Übung | ejercicio | 动作 | 运动 (a sport, and what the policy calls the activity) |
| rep | One repetition | rep | rép, répétition |  | Wdh., Wiederholung | rep., repetición | 次 | 组, 遍 |
| set | The reps done in one go on one movement | set | série | flamme | Satz | serie | 组 | 次, 轮 |
| round | One pass through every movement of a quest | round | tour | manche (a round of a match) | Runde | ronda | 轮 | 组, 回合 (a turn of a fight) |
| rest | The pause between movements or rounds | rest | repos |  | Pause | descanso | 休息 | 间歇 |
| warm-up | The optional block before the first movement | warm-up | échauffement |  | Aufwärmen | calentamiento | 热身 | 准备活动 |
| hold | A movement measured in seconds, not reps | hold | tenue |  | Halten | mantener | 保持 | 支撑 |
| target | The number to reach: a set's, an outing's, an oath's | target (goal for an outing) | objectif | cible | Ziel | objetivo | 目标 | 指标 |
| difficulty | Easy, Medium, Hard, chosen per quest | Easy / Medium / Hard | Facile / Moyen / Difficile |  | Leicht / Mittel / Schwer | Fácil / Media / Difícil | 简单 / 中等 / 困难 |  |
| written for | Who a quest was written for, the tag on its card | Beginner / Regular / Advanced | Débutant / Régulier / Confirmé |  | Einsteiger / Regelmäßig / Fortgeschritten | Principiante / Habitual / Avanzado | 新手 / 常规 / 进阶 | 初级 (a rung's level, not the hero's) |
| chronicle | The year's recap, a picture to share, offered in December and January | chronicle | chronique | bilan (a bilan is a report, the chronicle is the year told) | Chronik | crónica | 年度回顾 | 编年史 |
| light week | A week offered after two sessions in a row under the target (more than half of a session's strength sets missed; mobility and neutral sets do not count), or five weeks at four sessions or more: one round fewer, same variations (the ladder and tonight's target are frozen while it runs, and only the sessions whose rounds were actually lightened are stored `ladderNeutral`, so the ladder, the +1 and the cap series resume where they were; a quest the hero wrote, one whose rounds the hero set by hand, and a one-round quest are left alone and judged normally). Refusable, and a no silences the offer for 14 days. An accepted week lasts 7 days (`db/lightWeek.ts`) | light week | semaine légère | semaine de repos (it is a lighter week, not a rest) | leichte Woche | semana ligera |  |  |
| hard set | Every logged set of a workout movement whose pattern is not mobility, missed sets included; a hero's own movement with no pattern is out. The Stats count them per movement pattern over seven days | hard set | série dure | série (a set that was warm-up or a stretch is not hard) | harter Satz | serie dura |  |  |

## Progression

| Term | Means | en | fr | fr never | de | es | zh | zh never |
|---|---|---|---|---|---|---|---|---|
| path | A ladder of movements from easiest to hardest | path | voie | chemin (taken by quest titles) | Pfad (not in quest titles: Weg) | senda | 进阶路径 | 道路 |
| rung | One movement on a path | rung | étape | marche (a stair), échelon, cran | Stufe (not Schritt) | etapa (not escalón, a stair) | 阶 | 级, 台阶 |
| climbed | Every rung of a path owned | climbed | gravie |  | erklommen | coronada | 已通关 |  |
| record | A result beaten on one movement, in its own unit | record | record | a session's best | Rekord | récord | 纪录 | 最佳 (a session's) |
| mark | A session's best: longest, most XP, longest outing | best | marque | record | Bestwert | mejor marca | 最佳 | 纪录 (a movement's) |
| badge on an old row | A best whose kind the row did not keep | PR | exploit |  | Bestwert | Marca (not Hazaña, the deed family) | 最佳 | 成就 |
| ghost | What the hero did on this movement last time, shown during the set (a set; for a route see route ghost) | last time / best | la dernière fois / record |  | letztes Mal / Rekord | la última vez / récord | 上次 / 最佳 | 幽灵 |
| route ghost | The pale line of the hero's last outing on the same route, on the outing map and its recap | route ghost | fantôme de parcours | trace fantôme | Streckengeist (not Geist alone) | fantasma de recorrido |  |  |
| XP | Experience, one rep is one | XP | XP |  | XP | XP | XP | 经验值 (too wide for a chip) |
| level | The hero's level, from XP | level | niveau |  | Level | nivel | 等级 | 品阶 (a building's) |
| starting point | The hero's answer to "where are you at", which sets where a quest never played starts | starting point | point de départ | niveau (the hero's, from XP) | Ausgangspunkt | punto de partida | 起点 | 等级 |
| rank | The title a level carries | Apprentice … Divine | Apprenti … Divin | Entraîné (says "trained") | Lehrling … Göttlich | Aprendiz … Divino | 学徒 …… 神圣者 |  |

## Flame and oath

| Term | Means | en | fr | fr never | de | es | zh | zh never |
|---|---|---|---|---|---|---|---|---|
| flame | The streak: days of consistency against a weekly quota | flame | flamme | série | Flamme | llama | 火焰 | 连续 (a streak of days, said as a count) |
| flame tiers | Five stages of a long flame | Spark / Ember / Blaze / Inferno / Eternal | Étincelle / Braise / Brasier / Fournaise / Éternelle | Enfer (Hell) | Funke / Glut / Lohe / Feuersbrunst / Ewig (not Inferno) | Chispa / Brasa / Llamarada / Incendio / Eterna (not Infierno, and not Hoguera: the campfire is Fogata) | 星火 / 余烬 / 烈焰 / 燎原 / 永恒 | 地狱 (Inferno is not Hell) |
| weekly quota | Sessions a week that keep the flame lit | sessions a week | séances par semaine |  | Einheiten pro Woche | sesiones por semana | 每周目标 |  |
| oath | The one goal a hero swears, fulfilled or abandoned | oath | serment |  | Schwur | juramento | 誓言 | 承诺 |
| swear | Taking an oath | swear | prêter serment, jurer |  | schwören | jurar | 立誓 | 发誓 |
| fulfilled | An oath reached | fulfilled | accompli |  | erfüllt | cumplido | 已达成 | 完成 |

## Fight

| Term | Means | en | fr | fr never | de | es | zh | zh never |
|---|---|---|---|---|---|---|---|---|
| adventure | A chain of quests that ends on a boss | adventure (campaign in a heading) | aventure (campagne in a heading) |  | Abenteuer (Kampagne in a heading) | aventura (campaña in a heading) | 冒险 (heading: 战役) |  |
| step | One quest inside an adventure | step | étape | marche | Etappe | etapa | 章节 | 阶段 |
| playthrough | One go at an adventure, from its first step to its end, or until the hero leaves it | playthrough (not run: an outing is "a walk, a run or a ride") | partie | course (an outing's word), campagne (the adventure's heading word), abandon | Durchgang (not Lauf, a jog) | partida (not carrera, a race) |  |  |
| boss | The monster at the end of an adventure | boss | boss |  | Boss | jefe | Boss | 首领 (the game says Boss) |
| HP | The boss's health pool for the campaign | HP | PV |  | LP | PV | 生命值 | 血 (too short to read as a pool) |
| weakness / resistance | A muscle that deals 50% more, or half, the damage | weakness / resistance | faiblesse / résistance |  | Schwäche / Resistenz | debilidad / resistencia | 弱点 / 抗性 |  |
| critical hit | One or two reps past the prescribed target, striking harder. Never a hold | critical hit | coup critique |  | kritischer Treffer | golpe crítico | 暴击 |  |
| enraged | The boss's last phase | enraged | enragé |  | rasend | enfurecido | 狂暴 | 愤怒 |
| threat | How dangerous a boss is, 1 to 4 | threat level | niveau de menace |  | Bedrohungsstufe | nivel de amenaza | 威胁等级 |  |
| loot | The victory screen's rewards | loot | butin |  | Beute | botín | 战利品 |  |
| gauntlet | The armoured glove, in titles and lore | gauntlet | gantelet | gant (a winter glove) | Panzerhandschuh | guantelete | 臂铠 | 手套 |

## Village

| Term | Means | en | fr | fr never | de | es | zh | zh never |
|---|---|---|---|---|---|---|---|---|
| village | What training builds | village | village |  | Dorf | aldea | 村庄 | 村落 (a tier's name, tier 1) |
| building | One structure, raised by a muscle, a style or a deed | building | bâtiment |  | Gebäude | edificio | 建筑 | 房子 |
| rises | A building gaining a level | rises | monte (not nourrit: a building is raised, not fed) |  | wächst | sube | 升级 | 喂养 |
| ceiling | A building's last level | ceiling | plafond |  | Maximum (the app says "Am Maximum") | tope | 上限 | 天花板 |
| starter | The buildings the village begins with | starter | fondations | départ (a departure) | Fundament | cimientos | 初始建筑 |  |
| upgrade | A building that follows its base building | upgrade | amélioration |  | Ausbau | mejora | 进阶建筑 |  |
| deed | First wins, rematches, routes and leagues, as a building family | deed | haut fait |  | Heldentat | hazaña | 功绩 | 事迹 |
| first win | A boss beaten for the first time, what raises the Dragon Lair | first win | première victoire |  | erster Sieg | primera victoria | 首胜 |  |
| rematch | A beaten boss campaign finished again, what raises the Champion Arena | rematch | revanche |  | Revanche | revancha | 复仇 | 重赛 |
| route | A finished adventure that is not a boss, what raises the Hall of Heroes | route | route | chemin (taken by quest titles) | Route | ruta | 征途 | 路线 (what a map draws) |
| crest | The shield of the village: the hero's animal, flame and rings | crest | écu | blason | Wappen | escudo | 纹章 | 盾 |
| feast | A thing the village celebrates after a session: small (line), medium (card), large (full screen) | feast | fête (grande fête for the full screen) |  | not shown | not shown | 庆典 | 宴会 |
| tonight | The list of what a session changed | Tonight | Ce soir |  | Heute Abend | Esta noche | 今晚 | 今夜 |
| milestone | Sessions or outings until a building rises | milestone | jalon |  | not shown (the line says "Rang 2 in etwa 3 Einheiten") | not shown | 里程碑 |  |
| achievement | An unlockable trophy | achievement | succès |  | Erfolg | logro | 成就 | 成绩 |
| building rank | How far a building has risen, 1 to 10 (3 for an upgrade, 5 for the Lair, the Hall and the Arena), shown as "rank 3" | rank | rang | niveau (the hero's) | Rang | grado (not rango, the village's tier) | 品阶 | 等级 (the hero's), 阶 (a rung) |
| tier | One of the village's twelve stages, one painting each, raised by the hero's level | tier | palier | niveau (the hero's and a building's) | Ausbaustufe (not Stufe, a rung) | rango (not etapa, a rung) | 阶段 | 等级, 品阶 |
| village tiers | The village's size names | Hamlet … Eternal Capital | Hameau … Capitale éternelle |  | Weiler … Ewige Hauptstadt | Caserío … Capital eterna | 村落 …… 永恒王都 | 村庄 (the label on the chronicle) |
| training dummy | A starter building. Its name sits on a building card, so it must wrap at a space | Training Dummy | Mannequin de bois | Mannequin d'entraînement (wider than the card: it breaks mid-word at large font sizes) | Übungspuppe | Muñeco de madera | 训练木人 | 假人 |

## Outside the walls

| Term | Means | en | fr | fr never | de | es | zh | zh never |
|---|---|---|---|---|---|---|---|---|
| outing | A session recorded by GPS, or by the clock when the hero goes out without it: a walk, a run or a ride | outing | sortie | expédition (the code's word, `expedition`, never a reader's) | Tour | salida | 户外训练 | 出行, 远足 |
| league | Bati's distance unit, one kilometre | league | lieue |  | Wegstunde | legua | 里 | 公里 (the settings unit) |
| ground covered | The distance of an outing, as a label | distance | distance | terrain (a field) | Strecke | distancia | 距离 |  |
| moving time | Seconds the GPS saw the hero move | moving | en mouvement |  | in Bewegung | en marcha (en movimiento wraps under its column) | 移动 | 运动中 |
| pace | Time per kilometre or mile | pace | allure |  | Tempo | ritmo | 配速 | 步伐 |
| climb | Height gained | climb | dénivelé |  | Höhenmeter | desnivel | 爬升 | 攀岩 |
| trace | The drawn line of an outing | trace | tracé | trace (only the exported file) | Spur | trazado | 轨迹 | 痕迹 |
| recap | The screen after an outing | recap | récap |  | Rückblick | resumen | 回顾 | 摘要 |
| beyond the walls | Outside, in the world's own words | beyond the walls | hors des murs |  | jenseits der Mauern | más allá de las murallas | 城墙之外 |  |
| High Road | The building leagues raise | High Road | Grand Chemin |  | Hohe Straße | Camino Real | 大道 | 高速 (a motorway) |

## Written down

| Term | Means | en | fr | de | es | zh | zh never |
|---|---|---|---|---|---|---|---|
| session elsewhere | A session the hero writes down after the fact: a gym session, a walk without the phone. Keeps the flame, counts for the oath, pays 75 XP, never touches the boss, a record, an objective or the progression | session elsewhere | séance ailleurs | Einheit woanders | sesión fuera |  |  |
| typed by hand | The one mark on every figure the hero typed rather than Bati measured, in a row, a detail, the Stats and the recap. Lower case, no icon, never gold | typed by hand | saisie à la main | von Hand eingetragen | anotada a mano |  |  |
| GPS: yes / no | The chip that says whether the next outing is measured; a switch for TalkBack | GPS: yes / no | GPS : oui / non | GPS: ja / nein | GPS: sí / no |  |  |

`séance` stays the word for anything logged, a session elsewhere included, and `entraînement` the
one for the workout type on the form (`isWorkout()`).

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

- **备份密码** / *backup password* for what protects a backup, in Chinese too. Never 密码 alone in
  front of a hero: the screen already says which password it means.
- **十二个词** / *the twelve words* for the recovery key, never 助记词 (the BIP-39 term of art,
  which says nothing to a hero).
- **户外训练** / *outing*, and only that, wherever a reader looks, the privacy policy included.
  The code's `expedition` never reaches a reader.
- **品阶** for a building's rank and **等级** for the hero's level, so the Village never shows two
  numbers called 等级 side by side, the way `palier` settled it for French.
- **次 / 组 / 轮** for rep / set / round, in that order and never swapped: 组 is the reps done in
  one go, 轮 is one pass through the quest, 次 is one repetition.

## Related

- [writing.md](writing.md): the sentence rules, and rule 7, the one-word-one-meaning table this
  page extends to every term.
- [../design/audits/2026-09-10-french-copy.md](../design/audits/2026-09-10-french-copy.md): the
  audit that found the collisions.
