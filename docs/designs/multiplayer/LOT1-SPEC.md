# Lot 1 : le défi à deux, la spec

Écrite le 05/11/2026 avant le code. Décisions de Guillaume du 03 au 05/11, rappelées dans le brief du lot et dans
l'audit produit (« Décisions du 03/11 », « Lot 1 »). Format des octets : [envelope.md](envelope.md).

Tout reste derrière `MULTIPLAYER_ENABLED` (`src/multiplayer/flag.ts`) jusqu'à l'essai de Guillaume sur son téléphone.
Sans le drapeau : aucune carte, aucune ligne sur la victoire, et un lien `/d` ouvre l'accueil, comme aujourd'hui.

## 1. Les règles, en phrases testables

Chaque règle porte un numéro repris par un test (`__tests__/duo-week.test.ts` sauf mention).

**Coups**

Un « coup », dans le défi à deux, est une séance comptée. Le mot sert aussi aux dégâts d'un boss de campagne : le
glossaire les sépare (« coup (défi à deux) »), et l'écran ne l'emploie que dans « Envoyer mes coups », le libellé choisi
par Guillaume.

- **F1.** Une séance porte un coup si `countsForPlay` (la règle R1 du lot 0) la compte. Une sortie aussi : plus de deux
  minutes et au moins un kilomètre, sauvée normalement ou reprise après un kill de l'app, puisque R1 lit la ligne écrite. Rien d'autre ne porte de coup : ni une séance saisie à la main,
  ni une séance arrêtée avant toute série (elle n'a pas de ligne), ni un 2e arrêt pour douleur dans une semaine
  glissante.
- **F2.** Au plus un coup par jour local. Deux séances comptées le même jour font un coup.
- **F3.** Le jour d'un coup est le jour local de la séance, lu sur sa ligne (`performedAt` + `tzOffsetMin`), pas le
  jour de l'envoi. Une sortie faite hors réseau le dimanche et envoyée le lundi compte pour la semaine du dimanche.
- **F4.** Une séance datée après l'instant présent ne porte pas de coup. Une enveloppe reçue dont le `stamp` dépasse l'horloge
  du téléphone de plus de 24 h est refusée (« pas encore »), sinon elle gagnerait toutes les fusions suivantes. Un jour
  de l'autre postérieur à demain, sur l'horloge du téléphone qui lit, ne compte pas. Une horloge avancée n'invente donc
  aucun coup chez l'autre et ne bloque pas la semaine.
- **F5.** Un 2e arrêt pour douleur ne porte pas de coup et n'est jamais dit comme un échec : aucun écran du duo ne parle d'une
  séance qui n'a pas compté. La carte ne montre que des coups portés, jamais des coups manqués.

**Objectif**

- **O1.** L'objectif de chacun est `weeklyGoal` (le quota de la flamme, ou le chiffre du serment hebdo), figé au moment
  où la paire est écrite sur ce téléphone, ramené entre 2 et 4 (les bornes de `WEEKLY_TARGETS`). Il ne bouge plus
  ensuite, même si le serment change. Un objectif à 1 ferait tomber un boss par semaine sans effort.
- **O2.** L'autre lit mon objectif dans mon enveloppe (champ `goal`), ramené entre 2 et 4 à la lecture aussi : un
  autre build ne fait pas tomber un boss avec un objectif à 1. Jamais des reps, jamais un volume.
- **O3.** « Ma semaine est tenue » : mes coups de la semaine ISO ≥ mon objectif. Pareil pour l'autre, sur sa dernière
  enveloppe de cette semaine.

**La semaine**

Le résultat d'une semaine ISO pour une paire est une fonction pure (`duoWeek`, `src/multiplayer/duoWeek.ts`) de : mes
jours de coups, la dernière enveloppe de l'autre pour cette semaine, les deux objectifs, mes pauses, la semaine et
l'instant présent. Cinq résultats :

| Résultat | Quand |
| --- | --- |
| `fallen` | ma semaine est tenue et la sienne aussi, selon sa dernière enveloppe. Ou la semaine est déjà notée tombée |
| `frozen` | pas `fallen`, et une pause a touché la semaine, chez moi ou chez lui (bit `paused`) |
| `inProgress` | la semaine n'est pas finie (avant lundi 00:00 local suivant) |
| `waiting` | la semaine est finie, et aucune enveloppe de l'autre écrite après sa fin n'est arrivée, depuis moins de 7 jours |
| `fled` | la semaine est finie, et soit son enveloppe d'après la fin est là, soit 7 jours sont passés |

« Après la fin » veut dire au moins 14 h après le lundi 00:00 du téléphone qui lit : le `stamp` est un instant, et
l'autre peut vivre jusqu'à 14 h derrière. Une enveloppe écrite son dimanche soir ne passe donc pas pour son dernier mot.

- **S1.** Le boss tombe si nous tenons tous les deux notre semaine. Rien d'autre ne le fait tomber.
- **S2.** Une semaine tombée le reste : `fallenAt` est écrit une fois et ne s'efface jamais, même si une enveloppe plus
  récente de l'autre montre moins (elle ne peut pas, mais un bug de l'autre build ne doit rien reprendre).
- **S3.** Une semaine `fled` peut devenir `fallen` si une enveloppe arrive plus tard qui montre les deux semaines tenues,
  ou si ma propre séance arrive par la synchro de mon autre appareil.
- **S4.** Seule la dernière enveloppe de l'autre pour cette semaine compte : état complet, dernier écrit gagnant
  (`mergeWeek`). Un doublon ou une vieille enveloppe ne change rien.
- **S5.** La pause gèle : si une pause a touché la semaine, d'un côté ou de l'autre, et que la semaine n'est pas tombée,
  le résultat est `frozen`, jamais `fled`. Une semaine tenue par les deux pendant une pause tombe quand même (S1 passe
  avant : on ne refuse jamais une victoire).
- **S6.** Le bit `paused` d'une enveloppe de semaine veut dire « une pause a touché cette semaine », posé par
  l'expéditeur. Même octet, même place : seul son sens est précisé, aucun vecteur ne bouge.
- **S7.** Aucun écran ne dit qui n'a pas porté ses coups, ni qui est en pause, ni pourquoi. Le résultat `fled` ou `frozen` est le
  même texte sur les deux téléphones, sans nom.
- **S8.** La première semaine d'une paire est la semaine ISO où elle a été écrite sur ce téléphone. Mes coups de
  cette semaine faites avant comptent, l'objectif est déjà figé.
- **S11.** La fin d'une semaine se lit sur l'horloge et le fuseau du téléphone qui calcule. Deux téléphones dans deux
  fuseaux peuvent passer de `inProgress` à `waiting` à quelques heures d'écart ; ils ne divergent jamais sur `fallen`,
  qui ne dépend que des coups, et `fallenAt` fait foi une fois écrit.
- **S9.** Le décompte « boss tombés ensemble » ne baisse jamais : ni par une enveloppe, ni par un délier, ni par une
  restauration d'une copie en clair (qui le garde), ni par la synchro. Restaurer une copie plus ancienne rend la base
  de cette copie, décompte compris, comme pour tout le journal. Il compte les semaines notées tombées, toutes paires confondues.

- **S10.** Une pause doit pouvoir partir sans séance. Quand une pause a touché la semaine en cours et que je n'ai rien
  envoyé depuis, la carte le dit (« Ta pause n'est pas encore partie. Envoie-la pour que le boss attende. ») et
  « Envoyer mes coups » marche à zéro coup : l'enveloppe part avec le bit `paused`. Sans cela, l'autre verrait le boss
  fuir pendant ma pause. La pause vit sur ce téléphone seulement (`db/pause.ts`) : c'est le téléphone en pause qui
  l'envoie.

**Le duel**

- **D1.** Éteint par défaut. Un interrupteur local par paire, « Comparer nos semaines », jamais envoyé. Il vit dans
  l'écran Compagnons, sur la ligne du compagnon, pas sur la carte.
- **D2.** Allumé, la carte montre « 67 % de ta semaine » de chaque côté, plafonné à 100 %, au lieu de « 2 sur 3 ».
  Jamais deux nombres bruts mis côte à côte pour comparer.
- **D3.** À 100 % tous les deux, la carte dit « Vous avez tenu tous les deux », la même chose que le boss tombé. Aucun
  gagnant, aucun perdant, aucun classement.

**Récompense**

- **R1.** Cosmétique seulement : le décompte « boss tombés ensemble ». Aucune XP, aucun effet sur la flamme ni sur les
  serments. Jouer à deux ne rapporte jamais plus que jouer seul.

**Envoi et réception**

- **E1.** La ligne de la victoire n'apparaît qu'après une séance comptée (F1), et seulement s'il existe au moins un
  compagnon. Sur la carte, « Envoyer mes coups » est toujours là, à zéro coup compris (S10).
- **E2.** Ce qui part : un paquet (kind 5) avec, pour une paire, l'enveloppe de la semaine en cours et celle de la
  semaine précédente si la paire existait déjà. Ma propre semaine en état complet, jamais un delta.
- **E3.** Chez B, tant que A n'a pas reçu la réponse d'appairage, elle part dans le même paquet. B la garde jusqu'à ce
  qu'une semaine de A arrive, qui prouve que A l'a eue.
- **E4.** Un lien par compagnon : la feuille de partage choisit une conversation, pas plusieurs. Avec plusieurs
  compagnons, la ligne de la victoire reste une seule ligne ; le tap la déplie sur place en un bouton par compagnon.
- **E7.** Chez B, tant que `reply` n'est pas vide, la carte dit « Léo n'a pas encore ta réponse. » et garde
  « Prévenir maintenant ». Si B ne s'entraîne pas, A n'attend pas sans que rien ne le dise.
- **E5.** Recevoir un lien ou un QR montre ce qu'il contient, puis met la carte à jour. Rien ne change sans qu'un écran
  le dise. Une enveloppe qui ne change rien le dit aussi (« Rien de nouveau »).
- **E6.** Tous les anciens vecteurs restent valides : kinds 1 à 4 sont lus seuls, comme avant.

## 2. Le paquet, kind 5

Un lien porte un seul code. Pour qu'un « Envoyer mes coups » emporte deux semaines et, chez B, la réponse d'appairage,
un nouveau kind enveloppe des enveloppes déjà définies, sans rien sceller lui-même :

`version 1 ‖ kind 5 ‖ nombre n (1 octet, 1 à 3) ‖ n fois (longueur 1 octet ‖ enveloppe)`

- Chaque enveloppe intérieure est un kind 1 ou un kind 4, intacte, et s'authentifie seule. Le paquet n'ajoute aucun
  secret et n'en a pas besoin : changer un octet du paquet fait refuser l'enveloppe touchée, pas les autres.
- Un paquet ne contient jamais un kind 2, 3 ou 5.
- Taille au plus : 3 + 93 + 70 + 70 + 3 = 239 octets, sous les 600 du lecteur ; 319 caractères base64url, 341 avec le
  préfixe. Le QR reste lisible à l'écran (version 11 environ).
- Vecteurs figés : `__tests__/fixtures/multiplayer/envelope-v1-bundle.json`, bâtis à la main à partir des vecteurs déjà
  figés des kinds 1 et 4, sans les régénérer.

## 3. Ce qui est stocké

- **`pairs`** gagne `goal` (mon objectif figé, entier), `duel` (0 ou 1) et `reply` (la réponse d'appairage de B,
  octets, vide une fois prouvée reçue). Synchronisés avec la paire, jamais dans un fichier en clair.
- **`duo_weeks`** (nouvelle table) : `pairId`, `isoYear`, `isoWeek`, la dernière enveloppe de l'autre pour cette
  semaine (`stamp`, `goal`, `paused`, `days`), `fallenAt`. Clé (`pairId`, `isoYear`, `isoWeek`).
  - Synchro : fusion par clé, l'état de l'autre par la règle de `mergeWeek`, `fallenAt` le plus ancien des deux
    non nuls. Une ligne ne disparaît jamais par la synchro.
  - Sauvegarde en clair : la ligne reste, pour que le décompte survive (S9). Elle ne porte ni secret ni nom : le pair
    id est aléatoire et le nom vit sur `pairs`, retiré de toute copie en clair. Elle porte en revanche les jours de
    coups, l'objectif et le bit de pause de l'autre, qui sont à lui : `scrubPairs` les vide dans toute copie en clair
    (`stamp`, `goal`, `paused`, `days` à NULL), et ne garde que la paire, la semaine et `fallenAt`. Restaurer une telle copie
    efface les compagnons (comme au lot 0) et garde le décompte : la carte montre l'état « Aucun compagnon » avec
    « Boss tombés ensemble : 4 » en pied.
  - Délier une paire garde ses semaines pour le décompte, mais vide les mêmes colonnes : les jours d'un ancien
    compagnon ne restent pas sur le téléphone.
- Ma propre semaine n'est pas stockée : elle se relit dans le journal à chaque calcul.
- Migration `0085`, la suivante libre, ajout seul (pas de `destructive-ok`). `feat/village-iso` s'arrête à `0081` :
  la branche qui fusionne en second renumérote.

## 4. Le boss de la semaine

- Le boss de la semaine est de l'ambiance, pas une mécanique : il n'a ni PV ni force, et aucun texte ne le prétend.
- Tiré d'une graine : SHA-256 de `pairId ‖ année ISO ‖ semaine ISO`. Le premier octet choisit le boss parmi les six de
  `BOSS_ASSETS`, le deuxième l'affixe. Les deux téléphones voient le même boss la même semaine.
- Les affixes ne changent que le texte d'ambiance, jamais la règle : « rapide », « cuirassé », « affamé », « rusé »,
  « ancien », « furieux ».
- Aucune image nouvelle : l'art existant des boss, `getBossAsset`, en état normal, `defeated` une fois tombé.

## 5. Les écrans

Toujours en mode sombre, jetons Tamagui, composants de `components/journal/nocturne` (direction BD du Journal). Cibles
de 48 dp au moins. Chaque état est vérifié à 100 %, 130 % et 200 % de taille de police : rien n'est coupé, le texte
passe à la ligne, les boutons s'empilent en colonne sous 360 dp.

### 5.1 Où vit le duo

L'onglet des boss n'existe pas comme onglet : c'est l'écran « Boss » du Journal (`app/(tabs)/journal/bosses.tsx`),
atteint depuis les statistiques. La carte du duo y est en tête, au-dessus des boss tombés. Voir « À trancher » dans
STATE.md.

Rien sur l'accueil. Aucune notification dans ce lot.

### 5.2 La carte, une par compagnon

Hiérarchie, de haut en bas :

1. Le surtitre (`NKicker`) : « Boss de la semaine ».
2. Une rangée : l'image du boss (56 dp, ronde) à gauche ; à droite le nom du boss et son affixe (« Le Golem de pierre,
   cuirassé »), puis la ligne d'état.
3. Deux lignes de progression, d'abord toi, puis le compagnon : « Toi : 2 sur 3 cette semaine », « Léo : 1 sur 2, reçu le
   4 nov. » (la date du dernier message reçu). Le compte de l'autre est demandé par Guillaume (brief du lot 1, L4) ;
   c'est ce qu'il a envoyé, jamais un manque. Une petite jauge (`InkGauge`) sous chacune, plafonnée au plein.
4. La règle en un tap : « Comment le battre ? » ouvre « Le boss tombe si vous tenez tous les deux votre semaine. »
   (`RuleDisclosure`).
5. Les actions : « Envoyer mes coups » (principal), « Montrer mon QR » (secondaire). Côte à côte au-dessus de 360 dp,
   empilées sinon et à 200 %.
6. En pied : « Boss tombés ensemble : 4 ».

L'interrupteur « Comparer nos semaines » (D1) est sur l'écran Compagnons : un `AppButton` à
`accessibilityRole="switch"`, comme le bouton des bips de l'écran de pause, libellé « Comparer nos semaines : non » ou
« … : oui ». Aucun composant nouveau.

Avec plusieurs compagnons, seule la carte de la semaine la plus avancée est ouverte ; les autres sont repliées en une
ligne (image 40 dp, « Léo · le boss est là jusqu'à dimanche »), qui s'ouvre au tap. Le décompte et « Inviter un
compagnon » sont en pied de la liste, une seule fois.

Contraste : texte principal au jeton `text`, secondaire au jeton `textSecondary` (ceux de `NText` et `NMuted`), tous deux à 4,5:1 au
moins ; la jauge à 3:1. Aucun état porté par la couleur seule : la ligne d'état dit toujours le fait.

Tablette en paysage : la carte garde une largeur maximale de 520 dp, centrée, comme les blocs du Journal.

Le conteneur de la carte n'est pas un élément accessible (il avalerait ses boutons). Le nom qui dit les faits est
porté par le bloc de texte d'en haut (image, boss, état, progression), regroupé en un seul élément : « Boss de la semaine, le Golem de pierre. Toi 2 sur 3, Léo 1 sur
2. » ; en duel : « Toi 67 %, Léo 50 % ». Chaque bouton garde son propre nom. La jauge est décorative pour TalkBack, le
texte dit déjà tout.

### 5.3 Les états de la carte, et la copie exacte

| État | Ligne d'état | Ce qui change |
| --- | --- | --- |
| Aucun compagnon | (pas de carte de boss) | Un bloc seul : « Affronte un boss à deux. Chacun tient sa propre semaine, à son rythme. » et le bouton « Inviter un compagnon » |
| Invitation en attente | (pas de carte de boss) | « Invitation envoyée le 4 nov. Elle reste valable 7 jours. » et « Annuler » |
| Compagnon rejoint, rien reçu encore | « Le boss attend vos premiers coups. » | La ligne du compagnon dit « Léo : rien reçu pour l'instant » |
| Réponse pas encore partie (chez B) | inchangée | « Léo n'a pas encore ta réponse. » et « Prévenir maintenant » (E7) |
| Pause pas encore partie | « Ta pause n'est pas encore partie. Envoie-la pour que le boss attende. » | « Envoyer mes coups » marche à zéro coup (S10) |
| Semaine en cours | « Le boss est là jusqu'à dimanche. » | — |
| Ta semaine tenue, la sienne pas encore | « Ta semaine est tenue. » | Rien sur l'autre au-delà de son « 1 sur 2 » |
| En attente de ses coups (semaine finie) | « La semaine est finie, le boss attend les derniers coups. » | Sous la carte de la nouvelle semaine, une ligne pour la précédente |
| Boss tombé | « Le boss est tombé. Vous avez tenu tous les deux. » | Image en état `defeated` ; le décompte monte d'un |
| Boss enfui | « Le boss a fui dans son antre. Il revient la semaine prochaine. » | Aucun nom, aucun « raté », rien ne recule |
| Semaine gelée | « Le boss attend, il revient la semaine prochaine. » | Aucun nom, aucune raison |
| Duel allumé | inchangée | Les lignes deviennent « Toi : 67 % de ta semaine », « Léo : 50 % de sa semaine » |
| Duel, 100 % tous les deux | « Vous avez tenu tous les deux. » | — |
| Délié | (la carte disparaît) | Le décompte reste, en pied du bloc d'invitation |

La semaine précédente s'affiche sous la carte en une ligne pendant la semaine qui suit, et plus après : une fuite ne
reste pas affichée.
« Semaine dernière : le boss est tombé. » / « … a fui dans son antre. » / « … attendait. » / « … attend les derniers
coups. »

Animation : à l'arrivée d'une semaine tombée, l'image passe en `defeated` par un fondu ; une fuite, par un glissement
hors cadre. Mouvement réduit : aucune animation, la ligne d'état suffit.

### 5.4 La victoire

Une seule ligne, sous les statistiques, au-dessus des actions collées en bas : à gauche le fait, « 2 sur 3
cette semaine » précédé de « Défi à deux : », à droite le bouton « Envoyer mes coups » (`surface2`, 48 dp). À 200 % ou sous 360 dp, le bouton passe
sous le texte. Le fait se lit dès que la séance est sauvée, sans animation.

- Un compagnon : le tap ouvre la feuille de partage avec le lien de Léo.
- Plusieurs : le tap déplie sur place un bouton par compagnon, « À Léo », « À Inès » ; chacun ouvre la feuille de
  partage avec son propre lien. Aucune feuille Tamagui, aucun écran de plus.
- Aucune ligne si la séance n'a pas compté ou s'il n'y a aucun compagnon. Rien d'autre sur la victoire.
- Partage annulé ou impossible : rien ne change, aucun message (fermer la feuille n'est pas un échec). Le bouton reste.

TalkBack : « Défi à deux, 2 sur 3 cette semaine » puis « Envoyer mes coups à Léo, ouvre le partage ».

### 5.5 Inviter, rejoindre, les compagnons

Écran « Compagnons » (`app/pairing.tsx`, réécrit), ouvert depuis la carte par « Inviter un compagnon » ou par un lien
reçu.

- **Liste** : chaque compagnon, son nom, « Délier » (un tap, sans dialogue, comme décidé au lot 0). 5 au plus ; au-delà
  le bouton « Inviter » est remplacé par « Cinq compagnons au plus. »
- **Invitations en attente** : « Invitation du 4 nov. » et « Annuler », qui efface la clé privée.
- **Inviter** : deux boutons.
  - « Face à face » : un champ « Son nom (pour toi seul) », puis le QR plein écran et « Fais scanner ce code par ton
    compagnon. Il ne sert qu'en face à face. »
  - « Par message » : ouvre la feuille de partage avec le lien. Pendant le calcul de la clé (300 ms sur un petit
    téléphone) : « Préparation de l'invitation… ».
- **Scanner** : « Scanner un code ». La caméra n'est demandée qu'ici. Refus : « Le scanner a besoin de la caméra. Un
  lien marche sans elle. »
- **Reçu, une invitation** : « Une invitation au défi à deux. » Champ « Son nom (pour toi seul) », boutons « Rejoindre »
  et « Ignorer ».
- **Après « Rejoindre » par lien** : « C'est fait. Ta réponse partira avec ton premier « Envoyer mes coups ». » et un
  bouton facultatif « Prévenir maintenant », qui envoie la réponse seule.
- **Reçu, une réponse (chez A)** : « Ton compagnon a rejoint le défi. » Champ du nom, « Garder ». Si la réponse arrive
  dans un paquet avec une semaine, la semaine est lue juste après la paire écrite.
- **Lecture d'un lien en cours** (calcul de clé, jusqu'à 300 ms) : « Lecture du message… », rien d'autre à l'écran.
- **Reçu, une semaine** : « Des coups de Léo pour la semaine du 3 nov. : 2 sur 3. » puis « Voir le boss ». Une enveloppe
  qui ne change rien : « Rien de nouveau, tu avais déjà ces coups. »
- **Refus** : « Ce n'est pas un code Bati. », « Ce code ne sert qu'en face à face. Il a circulé dans un message : ne
  t'en sers pas, fais-en un autre. », « Fait par un Bati plus récent. Mets l'appli à jour pour le lire. »,
  « Une invitation expirée, ou un compagnon qui n'est pas sur ce téléphone. », « Ce compagnon est déjà sur ce
  téléphone. », « Ce message vient d'une horloge en avance. Il sera lu plus tard. »

Les noms sont choisis par celui qui reçoit, comme un contact, et ne partent jamais. 40 caractères au plus.

### 5.6 Montrer mon QR

Depuis la carte : un écran plein, le QR du paquet de la semaine (le même contenu que le lien), « Fais scanner ce code
par Léo. ». Luminosité inchangée. À 200 % le texte passe sous le QR, le QR garde au moins 240 dp de côté et l'écran
défile. TalkBack : « Code à scanner pour Léo ».

## 6. La caméra

`CAMERA` revient dans le manifeste des builds où le drapeau est vrai, avec sa justification dans
`__tests__/android-permissions.test.ts`. Demandée seulement à l'ouverture du scanner. `docs/legal/privacy.md` et le
texte de l'app, six langues : la caméra sert au scan d'un code de compagnon, aucune image n'est gardée ni envoyée ; ce
que contient un message entre compagnons (séances comptées par jour, objectif, pause oui ou non) et que le nom d'un
compagnon reste sur le téléphone. Les fiches Play et F-Droid (`fastlane/metadata`) et la Sécurité des données de la
Play Console doivent dire la même chose avant que le drapeau tombe : listé dans le rapport pour Guillaume, la Play
Console n'étant pas dans le dépôt.

## 7. Le WAL (L5)

Après la suppression d'un secret : finaliser les instructions longues de Drizzle qui retiennent un lecteur, puis
`wal_checkpoint(TRUNCATE)`, et prouver sur une build de release, avec la mesure du lot 0 bis (octets du secret
cherchés dans `bati.v3.db-wal`), que le secret n'y est plus.

## 8. Fini quand (ajouts de l'audit)

- Test : pause sans séance, l'enveloppe part avec `paused`, l'autre lit `frozen` (S10).
- Test : fusion de `duo_weeks` entre deux appareils du même héros à des fuseaux différents, `fallenAt` le plus ancien.
- Test : restauration d'une copie en clair, compagnons partis, décompte intact, jours de l'autre vidés.
- Test : délier vide les jours de l'autre et garde le décompte.
- `docs/legal/privacy.md` : ce qu'un message contient, ce qui reste sur le téléphone, ce que vide une copie en clair.
- Test : un `goal` à 1 lu dans une enveloppe compte pour 2 (O2).
- Captures à 100 %, 130 % et 200 % sur 360×640 : carte, carte à plusieurs compagnons, victoire, QR.
- TalkBack sur la carte et sur la ligne de la victoire, essayé sur émulateur.
- Glossaire : « coup (défi à deux) » et « compagnon », avec leur phrase, dans les six langues.
- Test : une sortie sauvée porte un coup ; une semaine qui finit entre deux fuseaux (S11).
- TalkBack : le conteneur de la carte n'avale pas ses boutons.
- La confirmation de restauration d'une copie en clair dit que les compagnons partent, quand il y en a (dette du lot 0).
- Limite assumée : la ligne de la victoire revient après chaque séance comptée, même si les coups sont déjà partis
  aujourd'hui. Le lien porte l'état complet, renvoyer ne casse rien.

## 9. Hors du lot

Notifications et relances, Home, XP, plusieurs boss par semaine, duel caché en mode famille (le mode famille n'existe
pas), import de sortie, Nostr.
