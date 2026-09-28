# Design : les rappels (roadmap 4.2)

Conçu le 27/09/2026 (spec v3), écrit contre le commit `68ce4dd` (v2.6.0).
Status: IMPLEMENTED (PR #137 à #140, en attente de merge et de la checklist appareil)
Code : PR 1 (logique) : `db/reminders.ts`, `db/homeOffer.ts`, `restSuggestionAt` dans
`db/restSuggestions.ts`, `oathWeekStart` dans `db/oaths.ts`, `reminders.*` dans `locales/*.json`.
PR 2 (natif) : `modules/bati-reminders`, `src/reminders.ts` (`replanReminders`,
`keepRemindersInStep`). PR 3 (interface) : `components/settings/ReminderSection.tsx`, `components/home/ReminderCard.tsx`,
`app/oath.tsx` (`OathReminderLine`), `src/reminderReport.ts`. PR 4 (ménage) : `hooks/useReminderPace.ts`
(`adventureWeeksLabel`), kicker « Ton jour » dans `components/home/useSmartAction.ts`, clés `goals.*` et
`scheduling.*` supprimées.

*27/09/2026. Code lu au commit `68ce4dd` (v2.6.0).*
*Versions précédentes gardées : v1 `claude/rappels-conception.md` (23/09), v2 `claude/rappels-rythme-v2.md` (27/09).*
*La v2 est passée à 3 audits (spec vs code, UX, cohérence Bati + freemium). La v3 ajoute les actions sur la notif et un contrat anti-agacement, puis une 4e relecture complète.*

## La règle, en une phrase

**Tu choisis tes jours et ton heure. Bati te rappelle une fois ces jours-là, sauf si ta séance est faite ou s'il te conseille du repos. Tu peux le repousser d'une heure ou le mettre en pause.**

Cette phrase est affichée sous l'interrupteur. Si un comportement n'y rentre pas, c'est un bug de la spec.

Ce que ça répond :
- la demande reçue : « I really need to be able to set reminders, to remind myself to work out (eg 8pm) » ;
- la roadmap 4.2 (P1) et l'audit business du 26/09 (priorité n°2, avant d'acheter du trafic).

## Le contrat anti-agacement

Six promesses. Chaque règle de la spec en sert une, et chacune a son test.

| # | Promesse | Comment |
|---|---|---|
| 1 | **Rien si tu n'as rien demandé** | éteint par défaut, permission demandée seulement quand tu allumes |
| 2 | **Une fois par jour, tes jours seulement** | un rappel max par jour choisi, un seul report d'1 h possible |
| 3 | **Jamais pour rien** | silence si ta séance est faite, si Bati conseille du repos, pendant une séance, en pause |
| 4 | **Jamais de culpabilité** | on parle de ce qui avance, jamais de ce qu'on perd |
| 5 | **Facile à calmer** | « Dans 1 h » et « Pause 7 jours » sur la notif, sans ouvrir l'app |
| 6 | **Il sait se taire** | silence après 14 jours sans ouvrir l'app, et une question si tu ignores 3 rappels de suite (jours finis, sans tap ni séance) |

## Ce qu'on peut en attendre, honnêtement

- **Un rappel fait ouvrir l'app le jour même.** Essai micro-randomisé (Bell et al. 2023, app Drink Less) : une notif multiplie par **3,5** la chance d'ouvrir l'app dans l'heure, et l'effet ne s'use pas sur 30 jours.
- **Aucune preuve que ça retient ceux qui décrochent.** Même essai : pas de différence sur le moment où les gens arrêtent. Mais pas plus de départs non plus.
- **Effet attendu** : plus de séances les jours choisis, chez ceux qui veulent déjà s'entraîner. C'est exactement la demande.

**Mesurer sans télémétrie** :
- Play Console : cohortes « installateurs conservés » J7 / J30, avant et après la version. Petits nombres, à lire avec prudence.
- Écran de debug : « Rappels postés : 12 · séances dans les 2 h : 7 · reportés : 2 · pauses : 0 ». Un testeur la colle s'il veut. Rien ne part tout seul.
- Aux testeurs, après 2 semaines, une seule question : « Tu l'as coupé ? Pourquoi ? ».

## Décisions prises

Les 5 points ouverts de la v2 sont tranchés sur la reco. Chacun reste réversible avant la PR concernée.

| Sujet | Décision | Pourquoi |
|---|---|---|
| Nom | section **« Rappel »**, pastilles **« Tes jours »** (en « Your days », de « Deine Tage », es « Tus días ») | « Jours de quête » se confond avec une quête (= une séance) et « quête du jour » (bonus d'XP) |
| Une promenade GPS coupe le rappel ? | **non**, filtre `isWorkout` | la demande dit « work out ». `countsAsSession` reste pour la flamme |
| Pause | **dès la v1 de la fonction** | c'est ce qui évite de tout couper et d'oublier de rallumer |
| Lien sur le Home | **après la 1re séance enregistrée** | celui qui veut un rappel ne pense pas à fouiller les Réglages |
| Actions sur la notif | **« Dans 1 h » + « Pause 7 jours »** | voir la section dédiée |

**⚠️ Décision de la roadmap renversée.** La roadmap §4.2 dit « Decided: the days say when, the quota says whether ». On la renverse exprès :
1. **Le quota qui coupe surprend.** Lun/mer/ven choisis, quota 2 : vendredi ne sonne pas, le joueur croit à un bug.
2. **Deux « cette semaine » dans le code.** La flamme compte sur 7 jours glissants (`db/streaks.ts:341`), le serment en semaine calendaire figée (`db/oaths.ts:332`). Le rappel finirait par contredire un écran.
3. **`setWindow` (prévu en §4.2) ne sonne pas en Doze.** Seules `setAndAllowWhileIdle` ou une alarme exacte passent.
4. **Un vrai planning a déjà été retiré** (commit `79960596`, 18/07 : goals, plans de 4 semaines, calendrier). Leçon : le Home dit QUOI, tes jours disent QUAND.

→ La §4.2 de la roadmap est réécrite **dans la PR 1**.

## Le modèle, en trois briques

```
Tes jours       (jours + heure)                 -> QUAND   (nouveau, à toi, synchronisé)
Home            (la même fonction de choix)     -> QUOI    (existe : aventure > serment > muscles faibles)
Flamme/serment  (quota)                         -> COMBIEN (existe, inchangé)
```

- tes jours **ne changent pas** le quota de la flamme ;
- le quota **ne coupe pas** un rappel ;
- le rappel **ne choisit pas** la séance : il reprend exactement ce que le Home propose.

## Les règles

### Quand ça sonne

Un rappel par jour choisi, à l'heure choisie, **sauf si** :

1. **Une séance d'entraînement (`isWorkout`) est déjà enregistrée ce jour-là.**
2. **Bati te conseille du repos ce jour-là**, pour une raison aiguë : `consecutive_days`, `high_volume`, `overtraining`. Pas `deload`, qui dit « vas-y doucement », pas « reste chez toi ». Évalué pour chaque jour de l'horizon, ces raisons peuvent durer plusieurs jours.
3. **Une séance est en cours** au moment du calcul.
4. **Tes rappels sont en pause.**

Pas de rattrapage : un rappel qui arriverait plus d'une heure en retard (téléphone éteint, redémarrage) est jeté.

**Un jour déjà rappelé ne re-sonne jamais**, même si l'app redémarre ou si tu changes l'heure après le rappel. Seul le report « Dans 1 h » peut suivre.

### Ce que ça ne fait pas, exprès

- Pas de « t'as rien fait depuis 3 jours ».
- Pas de rappel un jour non choisi.
- Pas de rappel la veille au soir pour une séance du matin (cocher la veille casserait la règle « séance faite », qui regarde le mauvais jour).
- Pas de relance sans fin.

### L'horizon : 14 jours, et on le dit

Bati programme 14 jours de rappels, comptés à partir de la fin de la pause s'il y en a une. Sans ouverture de l'app pendant ce temps, il se tait. S'entraîner demande d'ouvrir l'app, donc ça ne touche que quelqu'un qui a décroché.

Le **dernier rappel vraiment posté** garde son texte du jour et ajoute une 2e ligne, sans culpabiliser :
> FR : « Bati se tait pour l'instant. Le village t'attend, sans compter les jours. »
> EN : « Bati goes quiet for now. The village waits, and counts nothing. »

### Limites connues (écrites dans l'aide)

- **Téléphone + tablette** : une séance faite sur la tablette n'arrive sur le téléphone qu'à la prochaine fusion, donc le téléphone peut sonner quand même. D'où la ligne « Garde le rappel sur un seul appareil » (voir Réglages).
- **Arrêt forcé de l'app** ou **tueur de batterie** (Xiaomi, Huawei, certains Samsung) : Android efface les alarmes jusqu'à la prochaine ouverture.

## Les actions sur la notif

Deux, pas plus. Chacune fait ce que ni le tap ni le balayage ne font.

| Action | FR / EN / DE / ES | Ce qui se passe |
|---|---|---|
| **Dans 1 h** | « Dans 1 h » · « In 1 hour » · « In 1 Std. » · « En 1 h » | la notif disparaît et revient dans 1 h, **une seule fois**. La 2e n'a plus ce bouton. Absent si la notif est postée après 23:00. Si tu le tapes trop tard (le report passerait minuit) ou le lendemain, la notif disparaît juste |
| **Pause 7 jours** | « Pause 7 jours » · « Pause 7 days » · « 7 Tage Pause » · « Pausa 7 días » | la notif disparaît, plus aucun rappel jusqu'à la reprise (aujourd'hui + 7 jours), qui est automatique |

- **Tap sur la notif** : ouvre le Home et son bouton principal (Commencer, ou Voir la quête / Choisir une quête selon le cas). La notif s'efface.
- **Notif oubliée dans le volet** : elle s'efface toute seule à minuit.
- **Balayer** : rien d'autre. Il n'y a qu'un rappel par jour, donc balayer veut déjà dire « pas aujourd'hui ».
- **Report + séance faite entre-temps** : le rappel reporté ne sonne pas (voir Technique, `dueToday`).
- **Pause tapée par erreur** : les Réglages montrent « En pause · reprise lundi 5 » avec **Reprendre**. Pas de notif de confirmation, ce serait justement ce qui énerve.

**Refusées :**
- **« Commencer »** : le tap le fait déjà, et lancer une séance sans voir laquelle est une mauvaise surprise.
- **« Pas aujourd'hui »** : balayer le fait déjà.
- **« J'ai fait ma séance »** (façon Loop) : dans Bati, une séance se joue, elle ne se coche pas. Cocher créerait une fausse séance, avec XP, dégâts au boss et flamme.

## Les rappels ignorés

**Ignoré** = un jour **terminé** (avant aujourd'hui) où le rappel a été posté (report compris, compté une fois), sans tap sur la notif, sans séance `isWorkout`, et sans pause demandée. Un rappel jamais posté (alarme tuée par le téléphone) ne compte pas.

Après **3 jours ignorés de suite**, à la prochaine ouverture de l'app, un lien discret sur le Home (même famille que les autres : un lien, une croix) :
> « Tes rappels tombent bien ? »

Il ouvre une petite feuille avec 3 choix : **Changer mes jours** (ouvre les Réglages) · **Couper** · **Ils me vont**. La croix vaut « Ils me vont ».

- Jamais en notif, jamais pendant une séance.
- **Au plus une fois tous les 30 jours.** Le compteur repart à zéro à chaque séance un jour de rappel, et à chaque changement de réglage.
- Pas de baisse automatique en douce : la règle en une phrase doit rester vraie.
- Calcul en JS à l'ouverture : journal natif des jours rappelés + séances. Deux préférences par appareil : `reminderAskedAt` (dernière question) et `reminderStreakFrom` (date du dernier changement de réglage, avant laquelle on ne compte pas).

## Ce que dit la notif

Voix des locales : courte, sèche, bienveillante. Calculée au moment du plan, dans la langue de l'app.

**Une seule source** : on sort de `useSmartAction` (`components/home/useSmartAction.ts`) une fonction pure « que propose le Home ? ». Le Home et la notif l'appellent tous les deux, dans le même ordre.

**Des variantes, pour ne pas lasser.** Chaque cas a 2 à 4 phrases. Chaque rappel du plan prend la variante suivante de celle d'avant, et le premier du plan part de la dernière postée (lue dans le journal natif). Deux rappels d'affilée ne disent jamais la même chose.

| Cas (ordre du Home) | Variantes FR | EN (1re variante) |
|---|---|---|
| Aventure en cours | « L'étape {{n}} de {{aventure}} t'attend. » · « {{aventure}}, étape {{n}}. Tu reprends où tu t'es arrêté. » · « Étape {{n}} sur {{total}}. La route continue. » | « Step {{n}} of {{adventure}} awaits. » |
| … dont un boss entamé | « {{boss}} vacille. {{pv}} PV, pas un de plus. » · « {{boss}} t'attend. {{pv}} PV à prendre. » | « {{boss}} staggers. {{hp}} HP left. » |
| Serment d'exercice | « Vers ton serment : étape {{n}} sur {{total}}. {{quête}} t'attend. » · « Une étape de plus vers ton serment : {{quête}}. » | « Toward your oath: rung {{n}} of {{total}}. {{quest}} awaits. » |
| Serment en lieues | « {{fait}} lieues sur {{total}}. La route t'attend. » · « Une sortie de plus vers tes {{total}} lieues. » | « {{done}} of {{total}} leagues. The road awaits. » |
| Muscles à rattraper | « {{quête}} t'attend. Au menu : {{muscles}}. » · « Ton jour. {{muscles}} ont du retard, {{quête}} s'en charge. » | « {{quest}} awaits. On the menu: {{muscles}}. » |
| Premier jour | « Ton jour. {{quête}}, ≈ {{durée}}. Le premier bâtiment attend. » | « Your day. {{quest}}, about {{duration}}. The first building is waiting. » |
| Galerie (aucune quête proposée) | « Ton jour. Choisis ta quête, la porte est ouverte. » | « Your day. Pick your quest, the gate is open. » |
| Autre | « Ton jour. {{quête}} t'attend, la porte est ouverte. » · « Le village s'allume. {{quête}}, quand tu veux. » · « Aujourd'hui : {{quête}}, ≈ {{durée}}. » · « Les pierres attendent tes mains. {{quête}}. » | « Your day. {{quest}} is waiting, the gate is open. » |

« Autre » ne sert que si la fonction du Home renvoie un cas qu'on n'a pas prévu, par sécurité. « ≈ {{durée}} » n'est jamais utilisé pour une sortie, dont le joueur choisit la durée.

Les traductions EN / DE / ES des variantes se font dans la PR 3, avec la même relecture que les autres textes.

**Ligne en plus pour un serment hebdo**, seulement pour **la semaine en cours** du serment et seulement si c'est encore atteignable :
- « Encore 2 séances et le serment tient cette semaine. » / « Two more and the oath holds this week. »
- Quota déjà atteint : « Semaine du serment gagnée. Une de plus, pour le plaisir ? »
- Plus atteignable, ou semaine suivante : pas de chiffre.

À ne jamais écrire : « ta flamme va s'éteindre », « tu vas perdre », « X jours sans toi ».

Le texte « Bati se tait » (dernier rappel) est une 2e ligne : il ne compte pas dans la rotation des variantes.

## Le lien avec la flamme et le serment

Léger, et seulement là où ça aide :

| Moment | Ce qui se passe |
|---|---|
| **Premier allumage** | jours pré-cochés depuis **tes vraies séances** des 4 dernières semaines (jours où tu t'es entraîné au moins 2 fois). Sans historique : le quota de ton serment hebdo, sinon lun + mer + ven |
| **Moins de jours que le serment** | ligne grise sous les pastilles : « Ton serment en demande 3 par semaine, t'as choisi 2 jours. » |
| **Moins de jours que la flamme** (1 jour, quota 2) | ligne grise : « La flamme se nourrit de 2 séances par semaine. » |
| **On jure un serment hebdo** | une ligne « Bati te rappelle tes jours ? » qui ouvre le réglage |

Ces lignes ne bloquent rien, ne sont jamais en popup, et disparaissent dès que ce n'est plus vrai. Le rappel n'affiche **jamais** les chiffres de la flamme.

Pré-cochage depuis un quota, dans l'ordre de la semaine : 1 = mer · 2 = mar + jeu · 3 = lun + mer + ven · 4 = lun + mar + jeu + ven · 5 = lun à ven · 6 = tout sauf dim · 7 = tous.

## Réglages

Section **Rappel** dans `app/settings.tsx`, au-dessus de la sauvegarde. L'interrupteur en premier :

```
RAPPEL
Me rappeler de m'entraîner          [on]    <- allumer = permission + pré-remplissage
Tu choisis tes jours et ton heure. Bati te rappelle une fois ces jours-là, sauf si ta séance
est faite ou s'il te conseille du repos. Tu peux le repousser d'une heure ou le mettre en pause.
Tes jours      [Tous les jours]
[L] [M] [M] [J] [V] [S] [D]
  Ton serment en demande 3 par semaine, t'as choisi 2 jours.     <- gris, seulement si vrai
Heure                               20:00
Mettre en pause                     1 sem. · 2 sem.
Prochain rappel : jeudi à 20:00
Dernier rappel : mardi à 20:04
  Garde le rappel sur un seul appareil.                          <- gris, seulement si synchro
  Son et vibration : réglables dans les notifications Android.   <- gris, lien vers le canal
```

- **Interrupteur off** : l'aperçu dit « Coupé sur cet appareil », jamais « Prochain rappel ». Pastilles visibles mais grisées.
- **Heure proposée** au premier allumage : médiane circulaire (23:30 et 00:30 font minuit) des 10 dernières séances `isWorkout`, **moins 30 min**, arrondie au quart d'heure. Sinon 18:00. On rappelle avant l'habitude.
- **Au moins un jour** : quand l'interrupteur est on, la dernière pastille ne se décoche pas (petite vibration + « Garde un jour, ou coupe le rappel »).
- **L'aperçu dit toujours pourquoi** : « Prochain rappel : samedi à 20:00 (ce soir sauté, séance faite) » · « Pas de rappel demain, Bati te conseille du repos » · « En pause · reprise lundi 20 · Reprendre ».
- **« Dernier rappel »** prouve que ça marche. Si un rappel prévu n'a pas été posté, la ligne devient « Ton téléphone a peut-être bloqué le rappel » + un bouton vers **les réglages batterie de l'app** et un lien dontkillmyapp.com (ouvert dans le navigateur). Jamais `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, restreinte par Play.
- **« Garde le rappel sur un seul appareil »** : affichée seulement si une synchro est configurée (`syncAccount()` non nul).
- **Son** : canal en importance normale (son + vibration, c'est un rappel demandé). Le joueur règle le reste dans Android, la ligne y mène.

### Accessibilité et langues

- Chaque pastille est une case à cocher lue en entier : « Mardi, choisi ».
- Heure au format de la langue et du réglage 24 h d'Android (en : 8:00 PM, fr/de/es : 20:00). Sélecteur natif.
- Ordre des pastilles : `getWeekStart(langue)` (`constants/dateFormatters.ts`), en commence le dimanche. Le texte du serment utilise le `weekStartsOn` figé du serment.
- Boutons d'action de la notif : libellés courts, lus tels quels par TalkBack.

### La permission

- Demandée **quand on allume**, jamais au lancement.
- Refusée : l'interrupteur revient à off, une phrase, un bouton vers les réglages Android.
- Retirée plus tard, ou canal coupé : au retour dans l'app, on vérifie `areNotificationsEnabled()` **et** l'importance du canal. Si c'est coupé, l'interrupteur passe à off et l'aperçu dit pourquoi.

### Où on le propose (3 endroits)

1. **Réglages**, toujours.
2. **Au serment hebdo**, une ligne.
3. **Sur le Home, après la 1re séance enregistrée**, une seule fois : un **lien texte** sous la scène (famille `UpdateCard` / `WhatsNewCard` : un lien, une croix), jamais un bouton plein à côté de Commencer. Pas si tes jours sont déjà réglés.

**Une seule carte de ce genre sur le Home à la fois**, dans cet ordre : carte de mise à jour, puis question des rappels ignorés, puis proposition de rappel. Jamais dans l'onboarding, jamais pendant une séance, jamais sur l'écran de victoire.

## Synchro et sauvegarde

| Donnée | Où | Synchronisée ? |
|---|---|---|
| Tes jours + ton heure (`reminderDays`, `{ jour: "HH:mm" }`) | `user_preferences`, ajoutée à `MERGED_PREFERENCES` (`db/backup.ts:238`) | **oui**, c'est ton rythme |
| Interrupteur, pause, report du jour, journal des 10 derniers jours rappelés | `SharedPreferences` du module natif | **non**, par appareil |
| Lien Home fermé, `reminderAskedAt` | `DEVICE_LOCAL_PREFERENCES` | **non** |

- Le format `{ jour: "HH:mm" }` permet de passer un jour à une heure par jour sans migration.
- Les `SharedPreferences` ne sont prises ni par la sauvegarde Bati ni par la sauvegarde Android (`plugins/withAndroidBackupRules.js` n'inclut aucune shared preference). Un téléphone neuf ne revient donc jamais avec un interrupteur « on » sans permission.
- Le journal garde les **10 derniers jours rappelés** : `{ date, variante, reporté, ouvert (tap), pause demandée }`. Il reste sur le téléphone. Ce n'est pas de la télémétrie, et `privacy.md` le dit.

## Bati+ et freemium

**Tout est gratuit, partout (F-Droid, Play gratuit, Bati+).** Actions et pause comprises.

- Le rappel sert à s'entraîner plus souvent. C'est l'entonnoir : un joueur Play gratuit qui revient est celui qui arrivera un jour à la « forge pleine ».
- Loop Habit Tracker, la référence libre, le donne. Le vendre serait lu comme « Bati fait payer une notif ».
- Google demande à un abonnement une valeur continue : les quotas et l'éditeur de programmes la donnent déjà.

| Idée | Verdict |
|---|---|
| Une heure par jour | gratuit, plus tard (le stockage le permet déjà) |
| Plusieurs rappels par jour | refusé partout, contredit la promesse 2 |
| Textes ou voix de notif perso | seul candidat cosmétique légitime, valeur quasi nulle. Pas maintenant |

- **Futur éditeur de programmes (Bati+)** : les aventures avancent à la séance faite, pas à la date. L'éditeur n'aura pas de calendrier, il affichera sa durée **à ton rythme**, comme les aventures gratuites.
- Ligne à ajouter au tableau « Ce que contient Bati+ » de l'étude v2 : *Rappels et jours : ✓ gratuit · ✓ Bati+ · ✓ F-Droid*.
- **La notif de renouvellement Bati+ n'est pas dans ce module.** La lib Billing ne donne pas la date d'expiration sans serveur, l'essai et la période de grâce la faussent, et l'horizon de 14 jours la ferait sauter. → Spec Bati+, probablement une date affichée dans Réglages > Bati+. **L'étude v2 est à corriger sur ce point.**

## Petits gains de cohérence (PR 4)

- **Estimation des aventures** : `adventureWeeks()` (`db/estimate.ts:46`) suppose 3 séances par semaine et aucun appelant ne passe autre chose. Avec des jours réglés : « ≈ 4 semaines à ton rythme ». Les jours ne comptent qu'une fois l'interrupteur allumé au moins une fois.
- **Home, un de tes jours** : le kicker dit « Ton jour ». Un autre jour, rien ne change.
- **Traductions mortes** : `goals.*` (36 clés) et `scheduling.*` (7 clés) sont orphelines depuis `79960596`. On les supprime.
- **Bug à côté** : `getRestSuggestion` fait `new Date("yyyy-MM-dd")` (`db/restSuggestions.ts:109` et `:123`), lu en UTC, ce qui décale d'un jour les fuseaux à l'ouest de UTC (Amériques). Corrigé par la version pure, test à UTC-5.

## Technique

### Un module maison, pas `expo-notifications`

`expo-notifications` ramène Firebase et une vingtaine de permissions (retiré en `c7246643`). Module local `modules/bati-reminders` en Kotlin, sur le modèle de `bati-location`. Compter **400 à 500 lignes** avec les actions (`bati-location` en fait 769).

Il stocke et il poste, il ne réfléchit pas.

**API JS → natif :**
- `setPlan({ entries, dueToday, quietText, channelName, actionLabels })`
  - `entries` : **date locale `yyyy-MM-dd` + heure `HH:mm`** + titre + texte + id de variante. Jamais un epoch : si on change de fuseau, 20:00 reste 20:00 là où tu es. Kotlin calcule l'epoch à chaque armement avec `LocalDateTime.atZone(ZoneId.systemDefault())` (gère aussi le trou de l'heure d'été).
  - JS envoie **21 jours** d'entrées : les 14 de l'horizon, plus 7 de marge pour une pause tapée sur la notif sans rouvrir l'app. Le natif ne poste que les 14 premiers jours hors pause.
  - `dueToday` : `"yes"` (aujourd'hui peut encore sonner), `"hold"` (séance en cours : le report est suspendu, pas effacé), `"no"` (séance faite ou repos : le report est annulé).
  - `quietText` : la 2e ligne « Bati se tait ». Le natif l'ajoute au dernier rappel qu'il postera vraiment.
- `setEnabled(bool)`, `pause(resumeDate)` (date locale de reprise, annule aussi un report en attente), `resume()`, `getState()` (interrupteur, `resumeDate`, `snoozedUntil`, journal des 10 derniers jours), `areEnabled()` (permission + canal), `clear()`.

**Receivers :**
1. **Alarme** : si ce jour est déjà dans le journal et que ce n'est pas le report, ne fait rien. Sinon poste la notif du jour (avec les 2 actions, `setAutoCancel`, `setTimeoutAfter` jusqu'à minuit, la date du jour en extra), la note dans le journal, arme la suivante.
2. **Action « Dans 1 h »** : annule la notif. Si la date en extra n'est pas aujourd'hui, ou si maintenant + 60 min passe minuit, s'arrête là. Sinon enregistre un report `{ date: aujourd'hui, heure: maintenant + 60 min }` et arme l'alarme si c'est la plus proche. Le report posté n'a que l'action « Pause 7 jours ».
3. **Action « Pause 7 jours »** : annule la notif, `resumeDate` = aujourd'hui + 7 (date locale), annule un report en attente, marque le jour « pause demandée » dans le journal. JS lit la pause via `getState()` au prochain plan.
4. **Réarmement** sur `BOOT_COMPLETED`, `MY_PACKAGE_REPLACED`, `TIMEZONE_CHANGED`, `TIME_SET`. Les entrées passées de plus d'1 h sont jetées.

### Détails Android

- **Alarme** : `setAndAllowWhileIdle`, inexacte, passe en Doze. Ses limites (~une fois toutes les 9 min en Doze, buckets App Standby) ne gênent pas à 1 ou 2 alarmes par jour. Pas d'alarme exacte : `SCHEDULE_EXACT_ALARM` est refusée par défaut depuis Android 14, `USE_EXACT_ALARM` est réservée aux réveils et agendas.
- **Canal** `bati-reminders`, importance normale, nom traduit passé depuis JS, créé au `setPlan` et dans le receiver. `bati-location` a déjà son canal.
- **Tap** : `PendingIntent.getActivity` direct vers `MainActivity` (deep link `bati:///`, avec la date du rappel en extra pour marquer le jour « ouvert »), `FLAG_IMMUTABLE`. Jamais via un receiver : les « trampolines » sont interdits depuis Android 12.
- **Actions** : `PendingIntent.getBroadcast` vers le receiver du module, `FLAG_IMMUTABLE`, request codes distincts. Le receiver annule la notif lui-même (une action ne le fait pas toute seule). Travail instantané, pas besoin de `goAsync`. Autorisé : la règle Android 12 interdit seulement d'ouvrir un écran depuis un receiver. Les actions se voient quand la notif est dépliée (Android déplie en général la plus récente).
- **ID de notif fixe par jour** : un report ou un réarmement ne double jamais.
- **`POST_NOTIFICATIONS` redéclarée** dans le manifeste de `bati-reminders`. Aujourd'hui elle ne vient que de `bati-location`, et sa justification (`__tests__/android-permissions.test.ts:128`) ne parle que du GPS.
- **`RECEIVE_BOOT_COMPLETED`** : sortir de `blockedPermissions` (`app.json:13`), justifier dans le test, mettre à jour `fdroid/expected-permissions.txt` (sinon le contrôle de `release.yml` échoue). Ça réveille aussi le receiver de boot de WorkManager (tiré par le widget), sans danger.
- **CI** : `.github/workflows/kotlin.yml` et `scripts/ktlint.sh:23` ne visent que `bati-location`. Ajouter `bati-reminders`.

### La logique : `planReminders()`, fonction pure

`db/reminders.ts`. Entrée : jours + heure, état natif (pause, dernier posté), séances récentes, état de la séance, ce que propose le Home, serment, maintenant, langue. Sortie : `entries` sur 21 jours (voir API) + `dueToday` + `quietText`. Aujourd'hui n'est jamais inclus si le journal l'a déjà.

- **Repos par jour** : `restSuggestionAt(sessions, now)`, version pure sortie de `getRestSuggestion()`, évaluée pour chaque jour.
- **Séance en cours** : si `useSessionStore.status` n'est pas `idle`, écran de victoire compris jusqu'à ce qu'on le quitte, `dueToday` vaut `"hold"`. Le natif garde ce hold **en mémoire seulement** (`ReminderScheduler.held`) et l'entrée du jour reste dans le plan : l'alarme sonne, `onAlarm` la retient tant que le processus vit. App tuée en pleine séance, le hold part avec le processus et le rappel sonne quand même (audit final du 28/09 : l'entrée retirée du plan faisait taire le jour pour de bon, et les Réglages accusaient le téléphone). Pas jusqu'à `savedSessionId` : il est posé à la première écriture de la sauvegarde, avant l'aventure, le boss et le serment, et un plan fait à ce moment les lisait d'avant la séance.
- **Variantes de texte** : rotation depuis la dernière variante postée.
- **Rappels ignorés** : `ignoredStreak(posted, sessions)`, pure aussi, appelée à l'ouverture.

### Quand on recalcule

1. **Démarrage à froid**, après `prepareSyncAtLaunch()` (`components/DatabaseProvider.tsx:110`). Couvre aussi la fusion et la restauration, qui finissent par `reloadAppAsync`.
2. **Passage en arrière-plan**, filtré par `getChangeVersion()` (`db/changeVersion.ts:19`). Couvre toute modification faite dans l'app.
3. **Séances** : le subscriber de `stores/session.ts` (~l. 1964) à l'entrée et à la sortie d'un état actif, **et** après la fin de `saveSession` et du retrait d'une séance. Pourquoi les deux : la séance n'est en base qu'une fois l'écran de victoire répondu, bien après le passage à `finished`. Une séance abandonnée à 19:55 rend le rappel de 20:00, une séance enregistrée à 20:30 annule le report de 21:00.

## Textes publics

- `docs/legal/privacy.md` (EN l. 218, FR l. 491) : démarrage du téléphone (`RECEIVE_BOOT_COMPLETED`) et journal local des notifs.
- Fiche store (4 langues) : une puce « Rappels les jours que tu choisis, programmés sur le téléphone, sans serveur ».
- `docs/gameplay/oaths.md` : réécrire « There is no reminder, and that is deliberate ».
- `docs/gameplay/coach-planning.md` : « scheduling, notifications » sort des non-goals. Tes jours ne sont pas un planning.
- Roadmap §4.2 : réécrite en PR 1.

## Tests

**Unitaires (Jest) :**
- `planReminders()` : heure d'été (les deux sens), changement de fuseau, semaine dim / lun, séance faite à 17h pour 20h, promenade GPS (ne coupe pas), repos aigu sur plusieurs jours vs deload, séance en cours puis abandonnée, pause (jour de reprise inclus, horizon décalé), horizon et dernier rappel (2e ligne sur le dernier posté), jour déjà rappelé jamais repris (redémarrage, heure changée après coup), `dueToday` yes / hold / no, serment (semaine en cours / atteint / plus atteignable / semaine suivante), langue.
- Variantes : jamais deux fois la même d'affilée, reprise depuis la dernière postée.
- `ignoredStreak()` : 3 d'affilée, aujourd'hui jamais compté, tap sur la notif qui sort le jour, séance qui remet à zéro, report compté une fois, pause qui ne compte pas, changement de réglage qui remet à zéro, 30 jours entre deux questions.
- Pré-cochage (historique, quotas 1 à 7), heure médiane circulaire.
- Fusion : `reminderDays` synchronisé, interrupteur jamais.
- `restSuggestionAt` à UTC-5.

**À la main sur le Fairphone** (pas de mock Jest, faux vert garanti) : Doze forcé (`adb shell dumpsys deviceidle force-idle`), redémarrage, mise à jour de l'app, changement de fuseau, canal coupé, permission retirée, « Dans 1 h » puis séance faite (report annulé sans quitter l'app), « Dans 1 h » tapé à 23:40 et le lendemain (rien ne sonne), « Pause 7 jours » tapée sans rouvrir l'app (reprise qui sonne), puis Reprendre, redémarrage de l'app juste après un rappel (pas de doublon).

## Découpage

Effort **M+, 5 à 6 jours**, en 4 PR :

1. `db/reminders.ts` (plan, variantes, rappels ignorés) + `restSuggestionAt` + fonction « que propose le Home » + `reminderDays` + fusion + tests + **roadmap §4.2**. Rien de visible.
2. `modules/bati-reminders` : receivers, actions, report, pause, canal, manifeste, permissions, CI Kotlin, test Fairphone.
3. Réglages, lien Home, question des rappels ignorés, ligne au serment, textes et variantes en 4 langues, privacy, fiche store, `oaths.md`, `coach-planning.md`.
4. Ménage et bonus : `adventureWeeks` à ton rythme, kicker « Ton jour », clés `goals.*` et `scheduling.*`.

## Hors périmètre (et pourquoi)

| Idée | Pourquoi pas |
|---|---|
| Rappel « t'as rien fait depuis X jours » | culpabilise, c'est l'ancien rappel retiré |
| Mode sans jours (dernier jour utile) | règle impossible à dire en une phrase |
| Rappel la veille au soir | casse la règle « séance faite » |
| Baisse automatique après rappels ignorés | la règle ne serait plus prévisible, on demande à la place |
| Heure par jour | plus tard, gratuit, le stockage est prêt |
| Plusieurs rappels par jour | contredit la promesse 2 |
| Alarme exacte | permission refusée par défaut, précision que personne n'a demandée |
| `expo-notifications` | Firebase et une vingtaine de permissions |

## Corrections après l'audit du code (27/09, v3.1)

Un audit indépendant a confronté chaque référence au code de `HEAD` (= `68ce4dd`, rien n'a bougé
depuis). Fichiers et numéros de ligne sont justes. Ce qui suit corrige ou précise la spec, et
**prime sur le texte au-dessus** quand les deux divergent.

**Logique (PR 1)**

- **« Fonction pure » du Home** : impossible telle quelle, `decideAction` (`useSmartAction.ts:59`)
  lit la base huit fois. On en sort `decideHomeOffer(language)`, **async**, qui rend un descripteur
  de données (`kind` + paramètres, sans `t` ni `router`). Le hook le traduit en bouton, le plan en
  texte. Le plan est une photo : les 14 jours reprennent le cas calculé au moment du plan.
- **Boss** : le cas « aventure » ne lit aucun boss aujourd'hui. Le descripteur ajoute les PV du boss
  entamé de l'aventure (`getBossFightByAdventure`, `db/bossFights.ts:401`), pour garder une seule
  source.
- **`isWorkout` en JS** : c'est un fragment SQL. Le plan utilise le prédicat de ligne
  `outing === null` (comme `db/achievements.ts:778`), et un test vérifie que les deux disent pareil.
- **`restSuggestionAt(sessions, now)`** : prend **35 jours** de séances `isWorkout` (7 jours + les 5
  semaines du deload). Le rappel filtre sur `reason` (`consecutive_days`, `high_volume`,
  `overtraining`), jamais sur `shouldRest`, qui est vrai aussi pour `deload`. `getRestSuggestion()`
  devient une lecture + un appel à la version pure, pour qu'il n'y ait qu'une règle.
- **Bug UTC** : plus étroit qu'annoncé. À l'ouest de UTC, un dernier entraînement **hier** est lu
  avant-hier, la garde « aujourd'hui ou hier » échoue et `consecutive_days` tombe à 0. Le test à
  UTC-5 couvre ce cas précis.
- **Séance en cours** : `dueToday = "hold"` tant que `status !== "idle"`, victoire comprise jusqu'à ce
  qu'on la quitte (audit final du 28/09 : `savedSessionId` libérait le plan avant la fin de la sauvegarde).
- **Serment, ligne de la semaine** : nouvelle fonction `oathWeekCount(oath, sessions, now)` (séances
  `countsAsSession` de la semaine calendaire du serment, `weekStartsOn` figé). « Encore atteignable »
  = séances manquantes ≤ jours restants dans la semaine, aujourd'hui compris.
- **Retrait d'une séance** = `forgetSession` (`stores/session.ts:1936`).
- **Rappels ignorés, « de suite »** : un tap ou une pause répond au rappel, donc la série repart
  après ce jour (pas seulement « sort le jour »). Toute séance `isWorkout` la remet aussi à zéro,
  même un jour choisi où rien n'a sonné parce que la séance était déjà faite.
- **Marge de 21 jours** : elle couvre entièrement une pause tapée le jour du plan. Tapée 5 jours
  plus tard sans rouvrir l'app, le natif n'a plus que 9 jours après la reprise. Plafond assumé
  (`ponytail:` dans `db/reminders.ts`).
- **`at()` et heure d'été** : l'heure d'un jour est construite depuis ses parties, pas par
  `setMinutes` sur son minuit (faux là où l'heure d'été commence à minuit).

**Recalcul**

- **Démarrage à froid** : ancré sur `handleDatabaseReady` (`app/_layout.tsx:104`), là où les widgets
  sont déjà redessinés. Une fusion réseau qui change quelque chose finit en `reloadAppAsync`, donc
  repasse par là.
- **Arrière-plan** : il n'existe **aucun** écouteur `AppState` dans l'app. On en ajoute un, filtré
  par `getChangeVersion()`.

**Préférences et synchro**

- `reminderStreakFrom` rejoint `reminderAskedAt` et `reminderOfferDismissed` dans
  `DEVICE_LOCAL_PREFERENCES`. Nuance : la sauvegarde Android copie toute la base, donc ces clés
  peuvent revenir sur un téléphone neuf restauré par Android. Sans danger : aucune n'allume rien.
- `reminderDays` dans `MERGED_PREFERENCES` entre aussi dans l'empreinte de synchro : changer ses
  jours sur un appareil déclenche une fusion sur l'autre. Voulu, c'est une donnée du héros.
- **Ligne grise de la flamme** : quand un serment hebdo est juré, la flamme **prend son quota**
  (`getWeeklyQuota`, `db/streaks.ts:85`). La ligne de la flamme ne s'affiche donc que **sans**
  serment hebdo, sinon les deux lignes répètent le même chiffre.

**Natif (PR 2)**

- **« Ouvert » (tap)** : l'app n'a aucun gestionnaire de deep link. Le natif lit lui-même l'extra
  de l'intent de `MainActivity` (au démarrage et sur `OnNewIntent`) et marque le jour « ouvert »
  dans le journal. Aucun paramètre d'URL.
- **Permission de notification** : on réutilise `requestNotificationPermission` de `bati-location`
  plutôt qu'un troisième demandeur. Le rappel lit la réponse, l'expédition continue de l'ignorer.
- **`RECEIVE_BOOT_COMPLETED`** : en plus de `app.json` et du test, régénérer et commiter `android/`
  (le manifeste commité porte `tools:node="remove"`, le diff de prébuild de la CI échouerait),
  mettre à jour le commentaire d'en-tête du test, ajouter la ligne à `fdroid/expected-permissions.txt`.
- **CI** : `android-lint.yml` ne se déclenche pas sur `modules/**`. On l'ajoute, sinon le lint
  Android (PendingIntent, alarmes) ne voit jamais le module.
- **Taille** : 400 à 500 lignes de Kotlin, **plus ~200 lignes** d'enveloppe JS (`index.ts`).

**Interface et textes (PR 3)**

- **Variantes dans `locales/*.json`**, pas dans un `.ts` : les contrôles de `locale-style.test.ts`
  (tiret cadratin, apostrophe, `tu`) les couvrent d'office.
- **Écran de debug** : `app/dev.tsx` n'existe qu'en `__DEV__`, un testeur ne le voit jamais. Les
  compteurs (« Rappels postés · séances dans les 2 h · reportés · pauses ») vont dans le corps du
  mail de rapport de bug (`buildBugReportMailto`, `src/crashLog.ts:235`), que le joueur envoie
  lui-même.
- **Une carte à la fois** : le Home empile déjà `SessionRecoveryBanner`, `UpdateCard`, `SyncCard`,
  `WhatsNewCard` sans arbitre. On n'en crée pas un : les deux cartes du rappel (question des rappels
  ignorés, puis proposition) s'excluent entre elles et se taisent tant qu'une carte de mise à jour
  ou de nouveautés est visible.
- **Kicker « Ton jour » (PR 4)** : seulement si le Home n'a pas déjà un kicker (« Aventure »,
  « Premier jour »).
- **Jours et interrupteur coupé (PR 4)** : les jours survivent à l'interrupteur coupé et arrivent
  d'un autre appareil par la synchro. « Ton jour » et « ≈ 6 semaines à ton rythme » continuent donc
  de les lire : ce sont les jours du héros, pas un réglage du téléphone. En en, de, es, le mot évite
  « pace », « Tempo », « ritmo », réservés à l'allure de course par le glossaire.
- **Politique de confidentialité** : `privacy.md` (l. 218 EN, l. 491 FR) parle **déjà** des rappels
  alors qu'ils n'existent pas. On la rend exacte, on met à jour « Last updated » (l. 36) **et** la
  version dans l'app, `privacy.permissions_body` dans les 4 locales.
- **`coach-planning.md`** : deux endroits, l. 26 **et** l. 113-114.
- **Commentaires morts** : `src/widget.tsx:250` (`rescheduleOathReminder()`) et
  `components/oath/useOathText.ts:7` parlent de l'ancien rappel. On les corrige.

## Limites connues à l'implémentation (27/09)

Relevées par l'audit final des quatre PR, assumées pour la v1 de la fonction :

- **« Bati se tait »** s'ajoute au dernier jour que le téléphone *peut* poster. Si ce jour-là est
  jeté (téléphone éteint plus d'une heure, notification refusée), la ligne ne paraît jamais : le
  rappel précédent est déjà parti sans elle.
- **Même phrase deux fois de suite** dans deux cas rares où une seule variante est possible : un
  serment d'exercice sans échelle, une aventure dont le titre n'a pas chargé.
- **Android 7 (API 24-25)** : pas d'effacement à minuit (`setTimeoutAfter` n'existe qu'à partir
  d'Android 8). La notification reste jusqu'au balayage ou au rappel suivant.
- **Permission ou canal retirés** : l'interrupteur ne passe à off qu'à l'ouverture des Réglages.
  Entre-temps rien n'est posté, le natif vérifie avant chaque rappel.
- **Traductions DE et ES** des textes `reminders.*` et des puces de la fiche store : à relire par
  un natif avant la release (l'app les signale déjà comme traduites par machine).

## Historique

| Version | Ce qui a changé |
|---|---|
| v1 (23/09) | module maison, jours + quota qui coupe, mode sans jours |
| v2 (27/09) | quota qui ne coupe plus, `setAndAllowWhileIdle`, dates locales, synchro par appareil, une seule source pour le texte, 3 audits intégrés |
| v3 (27/09) | contrat anti-agacement · actions « Dans 1 h » et « Pause 7 jours » · question après 3 jours ignorés · variantes de texte pour tous les cas du Home · ligne « un seul appareil » · son réglable · décisions tranchées · 4e relecture : horizon décalé par la pause, jour déjà rappelé jamais repris, report vérifié au tap, `dueToday` à 3 états, recalcul après `saveSession` |
| **v3.1 (27/09)** | corrections de l'audit du code : descripteur async du Home, boss dans le descripteur, `restSuggestionAt` sur 35 jours filtré par `reason`, `hold` précis, écouteur `AppState` à créer, « ouvert » lu par le natif, variantes dans les locales, compteurs dans le mail de bug, étapes de permission et de CI manquantes |

## Sources

- Code : commits `79960596` (retrait de goals/plans/scheduling) et `c7246643` (retrait d'`expo-notifications`), `db/streaks.ts`, `db/oaths.ts`, `db/completed.ts`, `db/restSuggestions.ts`, `db/backup.ts`, `components/home/useSmartAction.ts`, `src/deviceSync.ts`, `plugins/withAndroidBackupRules.js`, roadmap §4.2, `docs/gameplay/coach-planning.md`, `docs/gameplay/oaths.md`.
- Bell et al. 2023, notifications et engagement, essai micro-randomisé : https://research-information.bris.ac.uk/en/publications/how-notifications-affect-engagement-with-a-behavior-change-app-re/
- Android, alarmes (Doze, `setAndAllowWhileIdle`, reboot, `USE_EXACT_ALARM`) : https://developer.android.com/develop/background-work/services/alarms
- Android 14, alarmes exactes refusées par défaut : https://developer.android.com/about/versions/14/changes/schedule-exact-alarms
- Android, permission de notification en contexte : https://developer.android.com/develop/ui/compose/notifications/notification-permission
- Loop Habit Tracker (rappel par habitude, action depuis la notif) : https://github.com/iSoron/uhabits
- Tueurs de batterie : https://dontkillmyapp.com
