# Audit de la copie française, 10 septembre 2026

Suite de l'audit du 31 août ([`docs/product/writing.md`](docs/product/writing.md)). Celui-là avait
nettoyé `locales/*.json` : villageois, tirets cadratins, apostrophes, vouvoiement. Il n'avait pas
touché à la copie qui vit **dans la base de données**, et c'est là que se trouvait presque tout ce
qui sonnait faux.

Méthode : les 51 migrations rejouées dans un SQLite en mémoire, puis les 1331 chaînes françaises
lues à la main, puis trois relectures adversaires indépendantes (oreille francophone, conformité
aux règles du dépôt, correction de la migration). Les trois ont trouvé des choses que la première
passe avait ratées, dont deux qu'elle avait elle-même introduites. Le détail est plus bas.

---

## Le constat

**Le catalogue d'exercices et les villageois sont écrits en français. Les quêtes et les aventures
d'origine étaient traduites de l'anglais.** Les deux voix cohabitaient dans la même galerie.

> Suspends-toi à une barre bras complètement tendus et épaules relâchées, puis tire jusqu'à ce que
> le menton dépasse la barre. Reviens en suspension complète à chaque répétition : la suspension
> fait partie du mouvement, pas de la pause. *(Tractions, réécrit par 0047)*

> Cette épreuve brise les faibles, forge des légendes des résilients. Prouve ta volonté de fer.
> *(Défi du Gantelet de Fer, 0006, jamais relu)*

`forge des légendes des résilients` n'est pas du français. C'est `forges legends from the
resilient` passé dans une machine.

---

## Ce qui a été fait

### `drizzle/0057_the_translated_half.sql`, 36 `UPDATE`

Une migration, jamais une édition de `0006` : ces lignes sont déjà dans chaque installation.

1. **17 descriptions réécrites** (quêtes 3 et 10 à 19, aventures 2, 3, 5, 6, 7, 8), **français et
   anglais**. L'anglais aussi, parce que c'est la source dont le français était calqué : le
   laisser en place, c'est reproduire le problème à la prochaine traduction.
2. **12 titres perdent leur Title Case anglais**, sous deux règles sans exception : un titre sans
   article initial ne capitalise rien après le premier mot (8 cas), et aucune convention ne
   capitalise un verbe ni un adjectif postposé (4 cas). Les 19 titres du type « article, nom,
   préposition, Nom » (*Le Chemin du Druide*) restent : la convention *Les Trois Mousquetaires*
   les défend, ils sont cohérents entre eux, et n'en corriger que la moitié serait le seul
   résultat pire que de tous les laisser.
3. **11 narrations d'étape reprennent une autre forme.** Le pool était à 92 % de « constat. ordre
   court. », dans les deux langues, quarante fois de suite.
4. **9 réécritures de plus pour la forme des deux autres pools** (voir « Ce que les relectures ont
   trouvé », point 1).
5. **`Ranger` devient `rôdeur`**, seul mot anglais restant dans un titre français.
6. **Les 4 derniers tirets cadratins qu'un lecteur voyait** disparaissent. Leurs migrations restent
   dans `SEED_DEBT` : cette liste garde les *fichiers*, et les rééditer ne changerait rien à une
   base installée.
7. **Le dernier vouvoiement de la base** (`ce corps est le vôtre`, quête 28).

### `locales/fr.json` et `locales/en.json`, 33 chaînes

Six bugs, le reste des calques. Les plus nets :

| Clé | Ce qui n'allait pas |
| :--- | :--- |
| `xp.movement_body` | contenait le mot anglais **`price`**, non traduit |
| `settings.map_tiles_note` | participe féminin qui pend sur un sujet masculin (« Allumée, le récap ») |
| `village.detail_prereq_locked` | disait « Elle » de bâtiments masculins et pluriels |
| `village.home_card_subtitle` | « Chaque muscle entraîné **l'élève** » se lit comme un nom |
| `xp.summary`, `xp.kept_body` | XP au féminin, masculin partout ailleurs |
| `journal.pr_most_xp` | « Plus **de** XP » contre « Plus **d'**XP » deux écrans plus loin |

### Deux cliquets

- **[`__tests__/seed-copy-shape.test.ts`](__tests__/seed-copy-shape.test.ts)** applique le plafond
  de 75 % des villageois aux trois pools de la base, dans les deux langues. Il échoue sur l'état
  d'avant (92 %) et sur celui du premier jet de cette migration (86 % et 100 %).
- **[`__tests__/db-migrate.test.ts`](__tests__/db-migrate.test.ts)** vérifie que le `when` du
  journal est strictement croissant. C'est le seul champ qui décide si une migration doit encore
  tourner, il est tapé à la main, et deux entrées au même `when` veulent dire que la seconde ne
  s'appliquera jamais sur un appareil qui a déjà la première. En silence, et seulement sur le
  terrain.

### Documentation

`writing.md` § 6 dit maintenant jusqu'où la règle de casse va dans les titres et pourquoi aucun
test ne la tient ; son tableau « Where each rule is checked » est à jour.
`docs/content/content-generation.md` est daté comme périmé pour les quêtes et les aventures :
c'est une source de génération, et régénérer depuis cette page réintroduit exactement ce que 0057
retire.

---

## Ce que les relectures adversaires ont trouvé

Elles ont tourné sur le diff réel, pas sur le plan.

**1. Le premier jet cassait la règle qu'il invoquait.** En réécrivant 17 descriptions d'un coup,
elles avaient toutes pris le même moule. Mesuré après : quêtes **62 % → 86 %**, aventures
**38 % → 100 %**, huit lignes sur huit. C'est la faute des villageois reproduite à l'identique, par
la migration qui cite la règle des villageois pour se justifier. Corrigé : 70 % et 63 %, et le
cliquet ci-dessus tient désormais les trois pools plutôt que celui auquel je pensais.

**2. Le tiret cadratin était remplacé, pas retiré.** 7 des 17 réécritures articulaient leur seconde
phrase sur un deux-points, contre 3 des 20 lignes non touchées. `writing.md` prévoit ce cas en
toutes lettres (*« Dash density once the dash is gone : nothing checks it »*). Ramené au niveau
d'avant.

**3. Un vouvoiement que mon propre scan ne pouvait pas voir.** `ce corps est le vôtre`, quête 28.
Mon expression régulière cherchait `votre` ; `vôtre` prend un accent circonflexe. Tous les scans
écrits depuis 0029 ont le même angle mort. Mon tableau disait « vouvoiement dans la base : 0 » : il
avait tort, et c'est la mesure elle-même qui était fausse, pas la copie.

**4. Une quinzaine de fautes de langue dans les réécritures elles-mêmes**, dont : `Étire` sans
pronom (le verbe est transitif), `personne ne relaie` (transitif aussi), `à la force` sans
complément, `au champ` pour `aux champs`, `couper le vent à quelqu'un` qui n'existe pas, `la porte
n'a que toi` calqué de *the gate has only you*, et une journée qui « part du bon pied » alors
qu'une journée n'a pas de pieds. Toutes corrigées.

**5. Deux régressions de la première passe sur `locales/fr.json`** : `rien d'autre ne **le** fait
bouger` s'accrochait à « ton corps » plutôt qu'à « l'XP », et `la régularité vaut mieux que le cran
du dessus` était la négation contrastive comprimée au lieu d'être supprimée, exactement l'exemple
que `writing.md` § 3 donne de ce qu'il faut refuser.

**6. Sur la migration elle-même, rien.** Les 36 `UPDATE` touchent chacun exactement une ligne
(vérifié via `changes()`), l'échappement est correct, la migration est idempotente, aucune ligne
écrite par un héros n'est atteinte (vérifié en insérant deux quêtes-leurres nommées comme des
quêtes seedées), et une aventure en cours n'est pas corrompue : `adventure_run_steps` ne stocke
aucun texte, il lit le template en direct.

---

## Ce qui reste, et pourquoi

- **`updatedAt` est écrit en millisecondes dans une colonne déclarée en secondes.** Vrai des 144
  occurrences de tout `drizzle/`, pas introduit ici, et inerte : rien ne lit `updatedAt` sur ces
  trois tables. À corriger partout ou nulle part, jamais dans un fichier seul.
- **L'écran XP concentre 5 des 6 figures contrastives de `fr.json`** (« comptent du terrain, pas de
  l'effort », « Sortir a un taux, pas une difficulté », …). Chacune se défend seule ; c'est leur
  densité qui s'entend. C'est de la voix d'auteur, pas une correction mécanique.
- **`common.error` + `errors.generic` + `errors.something_went_wrong`** restent trois formulations.
  Mon premier tableau les rangeait sous « une seule source par valeur » : c'était une erreur de ma
  part. Ce sont trois rôles distincts (titre d'alerte, écran d'erreur plein, corps de toast) et les
  fusionner demanderait de toucher au code appelant, pas à la copie.
- **`docs/designs/expeditions.md` et trois commentaires de code** citent encore
  `La Parole Doit Passer` avec son ancienne casse. Cosmétique, aucun test ne le lit.

---

## Les villageois

L'audit d'août avait corrigé leur **uniformité** : aucun pool ne peut plus être à plus de trois
quarts d'une même forme de phrase. Il n'avait pas rendu les sept voix différentes les unes des
autres, et c'est ce qui restait à entendre.

`constants/villagers.ts` donne à chaque villageois une forme : le forgeron est bref, le sage tient
en un souffle, le fermier ne s'arrête jamais au milieu, le champion rend un verdict. Mesuré contre
leur propre ligne de table, les cinq villageois dont la forme est jugeable par machine étaient
entre **22 % et 50 %**. La table décrivait une intention, pas les lignes.

**Ce qui a été fait.** Le fermier et le ménestrel, les deux plus éloignés et les plus audibles :
32 % → 52 % et 34 % → 62 %, dans les deux langues, avec les corrections de langue relevées en
chemin (un « y » sans antécédent, un « Il » qui saute par-dessus son référent, une causalité
inversée, « Franchement ? » calqué de *Honestly?*, « Bon retour » qui se dit à qui part). Les cinq
autres restent à réécrire, et les chiffres ci-dessus disent où ils en sont.

**Ce qui a été jeté.** J'avais écrit un cliquet qui vérifiait chaque villageois contre sa ligne de
table. Il ne survit pas à la relecture adversaire et il ne part pas avec le reste :

- il **récompensait** la copie générée : les vingt-quatre lignes du champion remplacées par six
  chaînes distinctes répétées obtenaient 100 % et la suite restait verte ;
- deux prédicats sur cinq classaient un autre villageois devant leur propriétaire ;
- celui du champion mesurait l'inverse de sa ligne (« sans commentaire » : dix des dix lignes
  françaises qui passaient portaient un commentaire) ;
- il contredisait le cliquet d'à côté : écrire les huit records du champion en huit verdicts
  nominaux, exactement ce que la table demande, fait rougir le plafond de 75 %.

Un test qui a ces quatre propriétés est pire que pas de test : c'est un feu vert qui affirme que
les voix sont distinctes quand elles ne le sont pas. La règle et sa mesure sont écrites dans
`writing.md` § 4 à la place, avec la raison du rejet.

**Ce qui reste en place.** Ce que la mutation exposait vraiment : rien nulle part ne refusait
qu'un villageois dise deux fois la même ligne. Un test le refuse maintenant, dans les deux langues
et à travers tous les pools d'un même villageois. Vérifié en injectant un doublon : rouge, puis
fichier restauré octet pour octet.

### Deuxième tour : le test en aveugle

Les 225 lignes mélangées, sans les noms, données à lire à quelqu'un qui ne savait pas combien de
personnages il cherchait. Réponse : **quatre voix et demie, pas sept.** Deux entendues, deux
entendues en double, trois pas entendues du tout, et une masse de 59 aphorismes au présent
gnomique rattachable à personne. Le sage *est* cette masse. Le champion, lui, « n'a pas une forme
faible, il a la forme de quelqu'un d'autre » : celle de l'herboriste, sur le sujet de
l'herboriste, alors qu'il partage ses deux moments avec le forgeron et que le héros les lit sur le
même écran.

43 lignes réécrites en conséquence. Le champion tombe de 62 à **44,7 caractères** et de 10,9 à
**7,5 mots** en moyenne, contre 57 à 78 pour les six autres : l'écart avec le forgeron passe de
6 % à 22 %, et la paire disparaît de la liste des plus proches. Le trio sage / herboriste /
ménestrel reste à 1 à 3 % d'écart de longueur, et c'est le prochain chantier.

Corrigé au passage : un accord sur le héros que le cliquet ne voyait pas (« Tu n'es pas obligé »),
deux contresens (`repousser la porte` veut dire la refermer ; `ne va nulle part` dit l'inverse de
*isn't going anywhere*), sept calques francs, deux vannes dupliquées entre deux villageois, et
deux mots qui n'existent pas dans cet univers (plomberie, Statistiquement). Le cliquet d'accord a
été étendu : `être` + participe en -é s'accorde toujours, donc la règle est exacte sans liste de
mots. Ma première version ne matchait rien, parce qu'en JavaScript `\b` ne tombe jamais après un
accent.

### Ce qui attend une décision

Un audit lexical sur les deux corpus remonte **17 divergences** et **6 collisions**, au-delà des
deux corrigées ici. Trois collisions font lire un chiffre pour un autre : `série` désigne la
flamme et un groupe de répétitions ; `Record` désigne le PR d'exercice et la plus longue flamme,
sur deux cartes voisines du Journal ; `Niveau` désigne six choses, dont deux nombres différents
dans la même fiche de bâtiment. Et `séance` / `entraînement` / `session` / `jeu` nomment la même
chose, dont trois fois sur le seul onglet Stats.

Trois choix de mot en soldent la moitié : **flamme** partout (tue `série` et `Record`), **exercice**
partout (tue `mouvement`), **séance** partout. Ce sont des décisions d'identité de produit, pas des
fautes, donc rien n'a été appliqué.

---

## Vérifications

```
36 UPDATE, chacun touche exactement 1 ligne
522 chaînes en base : 0 tiret cadratin, 0 vouvoiement (accents compris), 0 apostrophe courbe
forme, base       : narrations 92 % → 68 %, quêtes 62 % → 70 %, aventures 38 % → 63 %  (plafond 75 %)
forme, villageois : fermier 32 % → 52 %, ménestrel 34 % → 62 %  (les cinq autres inchangés)
tsc --noEmit : propre    biome check : propre
```

## Ce que je referais autrement

Deux fois dans cette session j'ai corrigé le compteur plutôt que la chose : les tirets cadratins
remplacés par des deux-points, puis les points du fermier remplacés par « , et » sans toucher à la
structure, si bien que sa seconde proposition continuait de gloser au lieu d'avancer et que sa voix
est devenue celle du sage. Les deux fois, la mesure montait et la copie empirait, et les deux fois
c'est une relecture extérieure qui l'a vu, pas moi. Quand une règle de copie a un proxy mesurable,
il faut relire le résultat à voix haute avant de croire le chiffre.
