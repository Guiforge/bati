---
layout: default
prose: true
title: Privacy Policy
head_title: "Privacy policy for Bati"
description: "Bati collects nothing about you. No account, no server of ours, no analytics. Offline first, with three exceptions, all off by default: the map, which tells a tile host roughly where you go, a daily question to GitHub about a newer version, and device sync, which sends your history encrypted to a server you choose."
type: legal
status: active
updated: 2026-09-25
permalink: /privacy/
related: [../planning/roadmap.md]
---

<div lang="de" markdown="1">

**Diese Datenschutzerklärung gibt es nur auf Englisch und Französisch.** Unten steht die englische
Fassung, sie ist maßgeblich. Die App selbst ist auf Deutsch verfügbar, von einer KI übersetzt und
noch nicht von Muttersprachlern geprüft. Fragen beantworte ich gern auf Englisch oder Französisch:
**feedback.bati@proton.me**

</div>

<div lang="es" markdown="1">

**Esta política de privacidad solo existe en inglés y en francés.** Debajo figura la versión en
inglés, que es la que hace fe. La app está disponible en español, traducida por una IA y todavía
sin revisar por hablantes nativos. Puede escribirme con cualquier pregunta, en inglés o en
francés: **feedback.bati@proton.me**

</div>

<div lang="en" markdown="1">

# Privacy Policy for Bati

**Last updated: 25 September 2026**

Bati is an offline-first training app. It has no account, no server of its own, and no analytics.
This page exists because both app stores require a privacy policy URL, and because the short
version deserves to be said plainly:

> **Bati collects nothing about you. Nothing you record in the app leaves your phone unless you
> send it yourself. Three exceptions, all off by default: the map behind an outing, which tells a
> map host roughly where you go; a daily question to GitHub about a newer version of the app; and
> device sync, which sends your history encrypted on the phone to a server you name, where it
> cannot be read.**

One sentence of that used to be shorter. Until outings landed, the app made no network request
of any kind, and that was enforced by refusing itself the `INTERNET` permission. Drawing a map
behind a walk needs the map, so the permission is now in the build, and the honest version of the
promise is one line longer rather than gone: the map is a setting, off until you switch it on, and
until then the app still makes no request of any kind. A second switch joined it on 20 September
2026, for the copies that no store updates, and a third on 25 September 2026, for heroes with more
than one device: see [the map](#the-map-and-the-one-host),
[the version check](#the-version-check-and-the-second-host) and
[device sync](#syncing-your-devices-and-the-host-you-choose) below.

## What is stored, and where

Everything Bati records (your workouts, sets, reps, hold times, quests, adventures, village,
achievements, flame, oath, avatar, settings, and the GPS points of an outing) is written to a
**SQLite database inside the app's private storage on your device**.

- It is never uploaded, synced, backed up to us, or shared with anyone.
- We cannot read it. There is no server to read it from.
- **Your phone's own backup carries it.** Android backs up app data by itself (Google's backup on
  most phones, Seedvault on LineageOS, /e/OS and GrapheneOS, or a cable or wireless transfer to a
  new phone), and Bati lets it take this database, so a new phone gets your hero back without you
  doing anything. That copy is made and kept by your phone's system under its own terms, not by
  Bati: Google's is end-to-end encrypted with your screen lock on Android 9 and later. You can turn
  it off in your phone's settings, under Backup.
- Deleting the app deletes all of it from the phone. What remains is that system backup, if it is
  on, and any file you exported yourself, as described below.

## Backups you make

Settings offers three ways to write that database to a file. **Share my backup** hands it to your
system's share sheet. **Save a file** writes it into a folder you choose on the device.
**Automatic backup** writes it into a folder you choose once, and then again on its own once a
day and before each app update. Where any of those files goes from there is entirely your choice: the app sends
it nowhere and has no way to.

- **The file is not encrypted unless you ask.** Without encryption, anyone who opens it can read
  your training history: keep it the way you would keep a personal photo. **Encrypt my backups**
  seals every backup the app writes from then on (AES-256-GCM) with a key that opens only with a
  password you choose or with a recovery key the app shows you once. The key stays on your phone,
  inside Android's protected storage, and is left out of your phone's own backup. Without the
  password or the recovery key nobody can open those files, and nobody can recover them for you:
  there is no copy of either anywhere but with you. On a phone with a fingerprint set up, the
  recovery key is also kept behind it, so it can be shown again.
- **Restoring replaces everything.** Importing a backup swaps the app's contents for the file you
  supply. The database you had is kept on the device as a recovery copy, in the same private
  storage, until the next restore overwrites it.
- **Automatic backup is off until you turn it on**, and turning it on means picking the folder
  yourself: the app cannot write anywhere you have not pointed it at. It writes at most once a day
  when the app opens and before an update, only into that folder, and keeps the five most recent files there, deleting older ones
  it wrote itself and nothing else. Settings shows which folder it is using, and switching it off
  is one tap; the files already written stay where they are, because they are yours.
- If the folder you chose becomes unavailable (a card removed, a folder deleted, a permission
  withdrawn), Bati stops and the Settings row goes back to **Off**, rather than quietly failing
  while claiming to work.
- **This is still local.** A folder you pick may belong to a cloud app (Nextcloud appears in
  Android's folder picker, and a folder that Syncthing keeps in sync is an ordinary folder), and if
  you pick one, that app syncs the file under its own privacy policy. Bati never learns which
  folder you chose beyond writing to it, and never sends these files anywhere itself. Its only
  upload is device sync, described below, and only of files sealed on the phone.

## What Bati never does

- No user account, no sign-up, no email address required to use the app.
- No analytics, no telemetry, no crash-reporting SDK, no advertising, no tracking identifiers.
- No third-party SDK that collects data.
- No upload of your data to us, ever, and no upload anyone else can read. The one upload the app
  can make is device sync, sealed on your phone before it leaves, to a server you choose. The
  network requests the app can make are described below, with what each one reveals, and each
  waits for its own switch in Settings.

## The map, and the one host

An outing (a walk, a run, a ride) records where you went, so it can tell you how far you
travelled. Those points stay in the database on your phone, like everything else.

Drawing them on a map needs a map, and **the map is off by default**. A fresh install draws the
route as a line on the app's own dark background, and requests nothing. Settings has one switch for
the map; turn it on and Bati asks **`tiles.openfreemap.org`** for tiles, the square images a map
is made of, and that is the first of the app's three network destinations.
[OpenFreeMap](https://openfreemap.org) serves OpenStreetMap data, free, with no key and no
registration.

- **What that request reveals:** the map is drawn twice, under you while an outing is running and
  under the whole route on its recap. The tiles asked for are the ones around you as you move, then
  the ones covering the outing, so the requests tell that host roughly where you are as you go,
  along with your device's IP address and the time of day. That is approximate location
  information leaving your phone, during the outing and not only after it, and it is why the app
  names the host here rather than leaving you to find it in a packet capture.
- **What it does not reveal:** the route to the metre, your pace, your training, or anything else
  in the database. The host learns the area and roughly when you crossed it, never the line you
  drew through it, and nothing in the database is ever sent up.
- **What keeps the list this short:** a lint rule in the repository
  ([`.biome/plugins/noJsNetwork.grit`](https://github.com/Guiforge/bati/blob/main/.biome/plugins/noJsNetwork.grit))
  rejects every network call written in the app's own code (`fetch`, `XMLHttpRequest`,
  `WebSocket`, `EventSource`, `sendBeacon`, and the native file transfers) outside the two modules
  that run the version check and device sync below, so the build fails before another destination
  can be added quietly. The map library does its fetching natively, below that line.
- **Until you switch the map on,** no tile is ever requested and the app touches the network not
  at all, outing or no outing. Switch it off again and both maps go back to the plain
  background; the switch is one tap either way.

## The version check, and the second host

F-Droid and the Play Store both notice a new version of an app and tell you about it. A copy
installed by hand from an APK has nobody to tell it anything, and can sit a year behind without
knowing. So Settings has a second switch, **Check for updates**, and it is **off by default** too.

Switched on, Bati asks **`api.github.com`** once a day whether a newer version has been published,
and puts a card on the home screen when the answer is yes.

- **What that request reveals:** your device's IP address and the time, which is what GitHub
  learns from anyone who opens the release page in a browser. It carries no account, no
  identifier, no device name, and nothing from the database.
- **What it does not do:** download anything, install anything, or run anything. The card opens
  the release page in your own browser, and everything after that is yours.
- **Turning it off** stops it at once. Left off, the request is never made.

## Syncing your devices, and the host you choose

A phone and a tablet, or an old phone and a new one, can share one hero. Settings has a third
switch, **Sync my devices**, and it is **off by default**. It only works with **Encrypt my
backups** on, and refuses to start otherwise.

Switched on, you choose **a server of your own that speaks WebDAV**. With **Nextcloud**, you type
its address and sign in on that server's own page, in your browser: Bati never sees your Nextcloud
password, the server hands it a separate app password you can revoke there at any time (Nextcloud,
Settings, Security). With **any other WebDAV server** (kDrive, Koofr, a NAS, or Round Sync serving
another cloud from your phone), you type its address, a user and an app password. Then, each time
the app
opens and whenever you ask, each of your devices sends its whole history to a `Bati` folder on
that server, and reads the others' to tell you if one of them is ahead.

- **What leaves the phone:** one file per device, encrypted on the phone with your backup key
  (AES-256-GCM) before it is sent. The server stores bytes it cannot read. Its name says only
  that it is a Bati file and which install wrote it, with a random identifier.
- **What the server learns:** your IP address; when each device opens the app and reads the
  others' files; how many devices you sync and the size of each file; and, on Nextcloud, a
  connected app named "Bati (Android)". Like any file you would put there yourself. It learns
  nothing from inside the files.
- **Where the sign-in lives:** the app password, Nextcloud's or another server's, is kept in
  Android's protected storage on that device only, never in the database and never in a backup.
- **Who the server is:** yours, or the provider you chose. We run none, and the file goes nowhere
  else.
- **Plain HTTP only to your phone itself.** Every server is reached over HTTPS, except one on the
  phone (`localhost`), such as Round Sync, where the traffic never leaves the device.
- **Turning it off** on a device stops it at once and forgets the app password on that device.
  The files already on your server are yours, and stay there until you delete them.

## Permissions, and why

**Location, precise and approximate (optional).** Used by one thing: measuring the ground an
outing covers. The app reads your position while an outing is running and stops the moment the
session ends. The points are written to the local database and never sent anywhere. Decline it, or
never start an outing, and the rest of the app is unaffected. Android requires the approximate
permission to be requested alongside the precise one; only the precise one is actually read,
because approximate location cannot measure a run.

**Running with the screen off (Android).** An outing keeps a foreground service and a wake
lock alive so the trace does not stop when your phone sleeps in a pocket. That is what the
permanent notification during an outing is for: an app watching your position should say so, on
screen, the whole time.

**Notifications (optional).** Asked for when you turn a reminder on, and used for the outing
notification above. Reminders are scheduled locally by your device's operating system: there are
no push notifications, so there is no server that knows your device.

**Internet.** For the map, the version check and device sync, each only while its own switch is on
in Settings. What each request reveals is in its section above.

**Network state.** Whether you are online, and over what kind of connection. The map library asks so
it can stop requesting tiles when there is nothing to request them over. It reports no identity, no
network name and no location, and it is only meaningful at all because of the permission above it.
Bati deliberately does *not* take the neighbouring Wi-Fi permission, which would name the networks
around you, and a network name is a location by another route.

**Photos (optional).** If you choose a photo as your hero avatar, the app reads that one image
from your library. It is stored on your device like the rest of your data, and never uploaded.
Decline the permission and the app works normally with the built-in avatars.

**Home-screen widget (Android, optional).** The flame widget reads your flame from
the same on-device database.

**Biometrics (optional).** Used for one thing: showing your backup recovery key again, behind your
fingerprint. Android runs the check; Bati never sees your fingerprint, only whether it matched.
Nothing else in the app asks for it, and every backup opens with its password without it.

## Crash reports

If Bati crashes, it writes the error and its stack trace **to your device only**. When a
feature fails without crashing (a backup that could not be written, say), the error message is
kept the same way; that message may include the name of a folder or file you chose, or the
address of your sync server.

Nothing is transmitted automatically. If you want to help fix a crash, Settings has a
"Report a bug" action that opens **your own email app** with the report filled in. You can read
it, edit it, or delete it before sending, and if you never send it, it never leaves your phone.
Reports you do send are used only to fix the bug and are not shared onward.

## Children

Bati is a general-audience fitness app and is not directed at children under 13. It collects no
personal data from anyone, of any age.

## Your rights

Because Bati holds no data about you, there is nothing for us to export, correct or delete on
your behalf. You hold all of it: either backup row in Settings hands you the whole database as a
file, and uninstalling the app erases every record it made on the phone. Copies you asked for
stay where you put them: your phone's own backup, files you saved, and the sync folder on
your server, each of which you delete there.

## Changes

If this policy changes, the updated version will be published at this URL with a new date. The
one change that would matter is a new network destination. The second one arrived on 20 September
2026 and the third on 25 September 2026, each with its own section above, in plain words rather
than folded into a list, which is how any other would arrive too.

## Contact

Questions about this policy, and anything else (a bug, an idea, a feature you wish existed):
**feedback.bati@proton.me**

</div>

<div lang="fr" markdown="1">

# Politique de confidentialité de Bati

**Dernière mise à jour : 25 septembre 2026**

Bati est une application d'entraînement hors ligne d'abord. Pas de compte, pas de serveur à nous,
pas d'analytics. Cette page existe parce que les deux stores exigent une URL de politique de
confidentialité, et parce que la version courte mérite d'être dite simplement :

> **Bati ne collecte rien sur vous. Rien de ce que vous enregistrez dans l'application ne quitte
> votre téléphone, sauf si vous l'envoyez vous-même. Trois exceptions, toutes désactivées par
> défaut : la carte derrière une sortie, qui dit à un hôte de cartes à peu près où vous allez ; une
> question quotidienne à GitHub sur une version plus récente ; et la synchronisation des
> appareils, qui envoie votre historique chiffré sur le téléphone vers un serveur que vous
> désignez, où il ne peut pas être lu.**

Une phrase de tout cela était plus courte avant. Jusqu'aux sorties, l'application ne faisait
aucune requête réseau, et c'était garanti par le refus de la permission `INTERNET` elle-même.
Dessiner une carte derrière une marche demande la carte : la permission est donc désormais dans la
compilation, et la version honnête de la promesse est une ligne plus longue plutôt que disparue :
la carte est un réglage, désactivé tant que vous ne l'activez pas, et jusque-là l'application ne
fait toujours aucune requête. Un second interrupteur l'a rejointe le 20 septembre 2026, pour les
copies qu'aucun store ne met à jour, et un troisième le 25 septembre 2026, pour qui a plus d'un
appareil. Voir « La carte, et l'hôte unique », « La vérification de version, et le second hôte » et
« Synchroniser vos appareils, et l'hôte que vous choisissez » plus bas.

## Ce qui est stocké, et où

Tout ce que Bati enregistre (séances, séries, répétitions, temps de gainage, quêtes,
aventures, village, hauts faits, flamme, serment, avatar, réglages et les points GPS d'une
sortie) est écrit dans une **base SQLite située dans le stockage privé de l'application, sur
votre appareil**.

- Rien n'est envoyé, synchronisé, sauvegardé chez nous ni partagé avec qui que ce soit.
- Nous ne pouvons pas le lire. Il n'existe aucun serveur pour le lire.
- **La sauvegarde de votre téléphone l'emporte.** Android sauvegarde de lui-même les données des
  applications (la sauvegarde Google sur la plupart des téléphones, Seedvault sur LineageOS, /e/OS
  et GrapheneOS, ou un transfert par câble ou sans fil vers un nouveau téléphone), et Bati le
  laisse prendre cette base : un nouveau téléphone retrouve votre héros sans que vous ayez rien à
  faire. Cette copie est faite et gardée par le système de votre téléphone, selon ses propres
  conditions, pas par Bati : celle de Google est chiffrée de bout en bout avec votre verrouillage
  d'écran depuis Android 9. Vous pouvez la désactiver dans les réglages du téléphone, rubrique
  Sauvegarde.
- Désinstaller l'application supprime l'ensemble du téléphone. Il reste cette sauvegarde du
  système, si elle est activée, et les fichiers que vous avez exportés vous-même, voir ci-dessous.

## Les sauvegardes que vous faites

Les réglages proposent trois façons d'écrire cette base dans un fichier. **Partager ma sauvegarde**
la remet au partage de votre système. **Enregistrer un fichier** l'écrit dans un dossier que vous
choisissez sur l'appareil. **Sauvegarde automatique** l'écrit dans un dossier que vous choisissez
une fois, puis de nouveau toute seule une fois par jour et avant chaque mise à jour de
l'application. Ce que ces
fichiers deviennent ensuite ne dépend que de vous : l'application ne les envoie nulle part, et
n'en a aucun moyen.

- **Ce fichier n'est pas chiffré, sauf si vous le demandez.** Sans chiffrement, quiconque l'ouvre
  lit votre historique d'entraînement : rangez-le comme une photo personnelle. **Chiffrer mes
  sauvegardes** scelle chaque sauvegarde écrite ensuite par l'application (AES-256-GCM) avec une
  clé qui ne s'ouvre qu'avec un mot de passe que vous choisissez ou avec une clé de récupération
  que l'application vous montre une fois. La clé reste sur votre téléphone, dans le stockage
  protégé d'Android, et n'entre pas dans la sauvegarde du téléphone. Sans le mot de passe ni la
  clé de récupération, personne ne peut ouvrir ces fichiers ni les récupérer pour vous : il n'en
  existe aucune copie ailleurs que chez vous. Sur un téléphone où une empreinte est configurée,
  la clé de récupération est aussi gardée derrière elle, pour pouvoir la revoir.
- **Restaurer remplace tout.** Importer une sauvegarde échange le contenu de l'application contre
  le fichier que vous fournissez. La base que vous aviez est conservée sur l'appareil comme copie
  de secours, dans le même stockage privé, jusqu'à la restauration suivante.
- **La sauvegarde automatique est désactivée tant que vous ne l'activez pas**, et l'activer, c'est
  choisir le dossier vous-même : l'application ne peut écrire nulle part où vous ne l'avez pas
  envoyée. Elle écrit au plus une fois par jour à l'ouverture et avant une mise à jour, uniquement
  dans ce dossier, et n'y conserve que
  les cinq fichiers les plus récents, en supprimant les plus anciens qu'elle a elle-même écrits et
  rien d'autre. Les réglages affichent le dossier utilisé, et l'arrêter tient en une pression ;
  les fichiers déjà écrits restent où ils sont, ils sont à vous.
- Si le dossier choisi devient indisponible (carte retirée, dossier supprimé, autorisation
  révoquée), Bati s'arrête et la ligne des réglages repasse sur **Désactivée**, plutôt que
  d'échouer en silence en prétendant fonctionner.
- **Cela reste local.** Le dossier que vous choisissez peut appartenir à une application de cloud
  (Nextcloud apparaît dans le sélecteur de dossier d'Android, et un dossier que Syncthing garde
  synchronisé est un dossier ordinaire) ;
  si vous en choisissez un, cette application synchronise le fichier sous sa propre politique de
  confidentialité. Bati n'apprend rien du dossier choisi au-delà d'y écrire, et n'envoie jamais
  ces fichiers elle-même. Son seul envoi est la synchronisation des appareils, décrite plus bas, et
  seulement de fichiers scellés sur le téléphone.

## Ce que Bati ne fait jamais

- Aucun compte utilisateur, aucune inscription, aucune adresse e-mail requise.
- Aucune analytics, aucune télémétrie, aucun SDK de rapport de crash, aucune publicité, aucun
  identifiant de suivi.
- Aucun SDK tiers collectant des données.
- Aucun envoi de vos données chez nous, jamais, et aucun envoi que quelqu'un d'autre puisse lire.
  Le seul envoi possible est la synchronisation des appareils, scellée sur votre téléphone avant
  de partir, vers un serveur que vous choisissez. Les requêtes réseau que l'application peut faire
  sont décrites ci-dessous, avec ce que chacune révèle, et chacune attend son propre interrupteur
  dans les réglages.

## La carte, et l'hôte unique

Une sortie (marche, course, vélo) enregistre le terrain parcouru pour pouvoir vous dire la
distance. Ces points restent dans la base de données de votre téléphone, comme le reste.

Les dessiner sur une carte demande une carte, et **la carte est désactivée par défaut**. Une
installation neuve dessine le trajet comme un trait sur le fond sombre de l'application, et ne
demande rien. Les réglages ont un interrupteur pour la carte ; activez-le et Bati demande à
**`tiles.openfreemap.org`** des tuiles, les carrés d'image qui composent une carte, et c'est la
première des trois destinations réseau de l'application.
[OpenFreeMap](https://openfreemap.org) sert des données OpenStreetMap, gratuitement, sans clé et
sans inscription.

- **Ce que cette demande révèle :** la carte est dessinée deux fois, sous vous pendant qu'une
  sortie est en cours et sous le trajet entier sur son récap. Les tuiles demandées sont celles
  autour de vous au fil du trajet, puis celles qui couvrent la sortie, donc les demandes disent à
  cet hôte à peu près où vous êtes pendant que vous avancez, avec l'adresse IP de votre appareil et
  l'heure. C'est une information de localisation approximative qui sort de votre téléphone,
  pendant la sortie et pas seulement après, et c'est pourquoi l'application nomme l'hôte ici plutôt
  que de vous laisser le découvrir dans une capture réseau.
- **Ce qu'elle ne révèle pas :** le tracé au mètre près, votre allure, votre entraînement, ni quoi
  que ce soit d'autre dans la base. L'hôte apprend la zone et à peu près quand vous l'avez
  traversée, jamais la ligne que vous y avez tracée, et rien de la base n'est jamais envoyé.
- **Ce qui garde la liste aussi courte :** une règle de lint dans le dépôt
  ([`.biome/plugins/noJsNetwork.grit`](https://github.com/Guiforge/bati/blob/main/.biome/plugins/noJsNetwork.grit))
  rejette tout appel réseau écrit dans le code de l'application (`fetch`, `XMLHttpRequest`,
  `WebSocket`, `EventSource`, `sendBeacon`, et les transferts de fichiers natifs) en dehors des
  deux modules qui font la vérification de version et la synchronisation décrites plus bas, de
  sorte que la compilation échoue avant qu'une autre destination puisse être ajoutée discrètement. La bibliothèque de carte fait ses requêtes nativement, sous
  cette ligne.
- **Tant que vous n'activez pas la carte,** aucune tuile n'est demandée et l'application ne
  touche pas du tout au réseau, sortie ou non. Désactivez-la et les deux cartes reviennent au
  fond uni ; dans les deux sens, c'est une pression.

## La vérification de version, et le second hôte

F-Droid et le Play Store remarquent tous les deux la sortie d'une nouvelle version et vous le
disent. Une copie installée à la main depuis un APK n'a personne pour l'en informer, et peut
rester un an en arrière sans le savoir. Les réglages ont donc un second interrupteur,
**Chercher les mises à jour**, lui aussi **désactivé par défaut**.

Activé, Bati demande une fois par jour à **`api.github.com`** si une version plus récente est
parue, et pose une carte sur l'accueil quand la réponse est oui.

- **Ce que cette demande révèle :** l'adresse IP de votre appareil et l'heure, soit ce que GitHub
  apprend de quiconque ouvre la page des versions dans un navigateur. Elle ne porte aucun compte,
  aucun identifiant, aucun nom d'appareil, et rien de la base de données.
- **Ce qu'elle ne fait pas :** télécharger quoi que ce soit, installer quoi que ce soit, exécuter
  quoi que ce soit. La carte ouvre la page des versions dans votre propre navigateur, et la suite
  vous appartient.
- **La désactiver** l'arrête aussitôt. Laissée désactivée, aucune requête n'est jamais faite.

## Synchroniser vos appareils, et l'hôte que vous choisissez

Un téléphone et une tablette, ou un ancien téléphone et un nouveau, peuvent partager un même
héros. Les réglages ont un troisième interrupteur, **Synchroniser mes appareils**, **désactivé par
défaut**. Il ne fonctionne qu'avec **Chiffrer mes sauvegardes** activé, et refuse de démarrer
sinon.

Activé, vous choisissez **un serveur à vous qui parle WebDAV**. Avec **Nextcloud**, vous saisissez
son adresse et vous vous connectez sur la page de ce serveur, dans votre navigateur : Bati ne voit
jamais votre mot de passe Nextcloud, le serveur lui remet un mot de passe d'application distinct,
révocable à tout moment (Nextcloud, Paramètres, Sécurité). Avec **tout autre serveur WebDAV**
(kDrive, Koofr, un NAS, ou Round Sync qui sert un autre cloud depuis votre téléphone), vous
saisissez son adresse, un identifiant et un mot de passe d'application. Ensuite, à chaque ouverture de l'application et quand vous le demandez,
chacun de vos appareils envoie son historique complet dans un dossier `Bati` de ce serveur, et lit
celui des autres pour vous dire si l'un d'eux est en avance.

- **Ce qui quitte le téléphone :** un fichier par appareil, chiffré sur le téléphone avec votre clé
  de sauvegarde (AES-256-GCM) avant l'envoi. Le serveur stocke des octets qu'il ne peut pas lire.
  Son nom dit seulement que c'est un fichier Bati et quelle installation l'a écrit, par un
  identifiant aléatoire.
- **Ce que le serveur apprend :** votre adresse IP ; le moment où chaque appareil ouvre
  l'application et lit les fichiers des autres ; combien d'appareils vous synchronisez et la taille
  de chaque fichier ; et, sur Nextcloud, une application connectée nommée « Bati (Android) ». Comme
  pour tout fichier que vous y déposeriez vous-même. Rien du contenu des fichiers.
- **Où vit la connexion :** le mot de passe d'application, de Nextcloud ou d'un autre serveur, est
  gardé dans le stockage protégé d'Android sur cet appareil seulement, jamais dans la base ni dans
  une sauvegarde.
- **Qui est ce serveur :** le vôtre, ou celui du prestataire que vous avez choisi. Nous n'en
  exploitons aucun, et le fichier ne va nulle part ailleurs.
- **Du HTTP non chiffré uniquement vers le téléphone lui-même.** Tout serveur est joint en HTTPS,
  sauf un serveur sur le téléphone (`localhost`), comme Round Sync, dont le trafic ne quitte
  jamais l'appareil.
- **Le désactiver** sur un appareil l'arrête aussitôt et oublie le mot de passe d'application sur
  cet appareil. Les fichiers déjà sur votre serveur sont à vous, et y restent jusqu'à ce que vous
  les supprimiez.

## Permissions, et pourquoi

**Position, précise et approximative (facultatif).** Utilisée pour une seule chose : mesurer le
terrain parcouru pendant une sortie. L'application lit votre position tant que la sortie dure
et s'arrête à la fin de la séance. Les points sont écrits dans la base locale et ne sont envoyés
nulle part. Refusez-la, ou ne partez jamais en sortie, et le reste de l'application ne change
pas. Android exige que la permission approximative soit demandée avec la précise ; seule la précise
est réellement lue, parce qu'une position approximative ne mesure pas une course.

**Fonctionner écran éteint (Android).** Une sortie maintient un service de premier plan et un
wake lock pour que la trace ne s'arrête pas quand le téléphone s'endort dans une poche. C'est à
cela que sert la notification permanente pendant une sortie : une application qui suit votre
position doit le dire, à l'écran, du début à la fin.

**Notifications (facultatif).** Demandées quand vous activez un rappel, et utilisées pour la
notification de sortie ci-dessus. Les rappels sont programmés localement par le système de votre
appareil : il n'y a aucune notification push, donc aucun serveur ne connaît votre appareil.

**Internet.** Pour la carte, la vérification de version et la synchronisation des appareils,
chacune seulement tant que son interrupteur est activé dans les réglages. Ce que chaque demande
révèle est dans sa section plus haut.

**État du réseau.** Si vous êtes connecté, et par quel type de lien. La bibliothèque de carte le
demande pour cesser de réclamer des tuiles quand il n'y a rien pour les transporter. Elle n'en tire
aucune identité, aucun nom de réseau et aucune position, et cela n'a de sens que grâce à la
permission ci-dessus. Bati refuse délibérément la permission Wi-Fi voisine, qui nommerait les
réseaux autour de vous : un nom de réseau est une position par un autre chemin.

**Photos (facultatif).** Si vous choisissez une photo comme avatar, l'application lit cette
image dans votre galerie. Elle est stockée sur votre appareil comme le reste, et jamais
envoyée. Vous pouvez refuser : l'application fonctionne normalement avec les avatars intégrés.

**Widget d'écran d'accueil (Android, facultatif).** Le widget de flamme lit votre régularité
dans la même base locale.

**Biométrie (facultatif).** Pour une seule chose : réafficher votre clé de récupération de
sauvegarde, derrière votre empreinte. Android fait la vérification ; Bati ne voit jamais votre
empreinte, seulement si elle correspond. Rien d'autre dans l'application ne la demande, et chaque
sauvegarde s'ouvre avec son mot de passe sans elle.

## Rapports de crash

En cas de plantage, Bati écrit l'erreur et sa trace **uniquement sur votre appareil**. Quand
une fonction échoue sans plantage (une sauvegarde impossible à écrire, par exemple), le message
d'erreur est conservé de la même façon ; ce message peut contenir le nom d'un dossier ou d'un
fichier que vous avez choisi, ou l'adresse de votre serveur de synchronisation.

Rien n'est transmis automatiquement. Si vous souhaitez aider à corriger un bug, les Réglages
proposent « Signaler un bug », qui ouvre **votre propre application e-mail** avec le rapport
pré-rempli. Vous pouvez le lire, le modifier ou le supprimer avant envoi, et si vous ne
l'envoyez jamais, il ne quitte jamais votre téléphone. Les rapports envoyés servent uniquement
à corriger le bug et ne sont transmis à personne.

## Enfants

Bati est une application de sport tout public, non destinée aux enfants de moins de 13 ans.
Elle ne collecte aucune donnée personnelle, quel que soit l'âge.

## Vos droits

Comme Bati ne détient aucune donnée vous concernant, nous n'avons rien à exporter, corriger ou
supprimer pour vous. Vous détenez l'intégralité : l'une ou l'autre ligne de sauvegarde, dans les
réglages, vous remet la base entière sous forme de fichier, et désinstaller l'application efface
du téléphone chaque enregistrement qu'elle a produit. Les copies que vous avez demandées restent
où vous les avez mises : la sauvegarde de votre téléphone, les fichiers enregistrés, et le dossier
de synchronisation sur votre serveur, que vous supprimez chacun à sa place.

## Modifications

Si cette politique change, la version à jour sera publiée à cette URL avec une nouvelle date. Le
seul changement qui compterait serait une nouvelle destination réseau. La deuxième est arrivée le
20 septembre 2026 et la troisième le 25 septembre 2026, chacune avec sa propre section plus haut,
en toutes lettres plutôt que glissée dans une liste, et toute autre arriverait de la même façon.

## Contact

Questions sur cette politique, et tout le reste (un bug, une idée, une fonctionnalité qui
vous manque) : **feedback.bati@proton.me**

</div>
