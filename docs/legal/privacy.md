---
layout: default
prose: true
title: Privacy Policy
head_title: "Privacy policy — Bati"
description: Bati collects nothing. No account, no server, no analytics, no network requests at all.
type: legal
status: active
updated: 2026-08-24
permalink: /privacy/
related: [../planning/roadmap.md]
---

<div lang="en" markdown="1">

# Privacy Policy — Bati

**Last updated: 24 August 2026**

Bati is an offline training app. It has no account, no server, and no analytics. This page
exists because both app stores require a privacy policy URL, and because the short version
deserves to be said plainly:

> **Bati collects nothing. Nothing you do in the app leaves your phone unless you send it
> yourself, deliberately, by email.**

## What is stored, and where

Everything Bati records — your workouts, sets, reps, hold times, quests, adventures, village,
achievements, streak, oath, avatar and settings — is written to a **SQLite database inside the
app's private storage on your device**.

- It is never uploaded, synced, backed up to us, or shared with anyone.
- We cannot read it. There is no server to read it from.
- Deleting the app deletes all of it, and there is no copy anywhere else unless you exported one
  yourself — see below.

## Backups you make

Settings offers three ways to write that database to a file. **Share my backup** hands it to your
system's share sheet. **Save a file** writes it into a folder you choose on the device.
**Automatic backup** writes it into a folder you choose once, and then again on its own before
each app update. Where any of those files goes from there is entirely your choice: the app sends
it nowhere and has no way to.

- **The file is not encrypted.** Anyone who opens it can read your training history. Keep it the
  way you would keep a personal photo — and think about it before putting it somewhere shared.
- **Restoring replaces everything.** Importing a backup swaps the app's contents for the file you
  supply. The database you had is kept on the device as a recovery copy, in the same private
  storage, until the next restore overwrites it.
- **Automatic backup is off until you turn it on**, and turning it on means picking the folder
  yourself — the app cannot write anywhere you have not pointed it at. It writes only before an
  update, only into that folder, and keeps the five most recent files there, deleting older ones
  it wrote itself and nothing else. Settings shows which folder it is using, and switching it off
  is one tap; the files already written stay where they are, because they are yours.
- If the folder you chose becomes unavailable — a card removed, a folder deleted, a permission
  withdrawn — Bati stops and the Settings row goes back to **Off**, rather than quietly failing
  while claiming to work.
- **This is still local.** A folder you pick may belong to a cloud app (Drive, Dropbox, Nextcloud,
  and others appear in Android's folder picker), and if you pick one, that app syncs the file
  under its own privacy policy. Bati never learns which folder you chose beyond writing to it, and
  makes no network request of its own — it has no permission to.

## What Bati never does

- No user account, no sign-up, no email address required to use the app.
- No analytics, no telemetry, no crash-reporting SDK, no advertising, no tracking identifiers.
- No third-party SDK that collects data.
- No network requests at all. The app makes none, at any point.

## Permissions, and why

**Photos (optional).** If you choose a photo as your hero avatar, the app reads that one image
from your library. It is stored on your device like the rest of your data, and never uploaded.
Decline the permission and the app works normally with the built-in avatars.

**Notifications (optional).** Only ever asked for when you deliberately turn a reminder on.
Reminders are scheduled locally by your device's operating system — there are no push
notifications, so there is no server that knows your device.

**Home-screen widget (Android, optional).** The training-streak widget reads your streak from
the same on-device database.

## Crash reports

If Bati crashes, it writes the error and its stack trace **to your device only**. When a
feature fails without crashing — a backup that could not be written, say — the error message is
kept the same way; that message may include the name of a folder or file you chose.

Nothing is transmitted automatically. If you want to help fix a crash, Settings has a
"Report a bug" action that opens **your own email app** with the report filled in. You can read
it, edit it, or delete it before sending — and if you never send it, it never leaves your phone.
Reports you do send are used only to fix the bug and are not shared onward.

## Children

Bati is a general-audience fitness app and is not directed at children under 13. It collects no
personal data from anyone, of any age.

## Your rights

Because Bati holds no data about you, there is nothing for us to export, correct or delete on
your behalf. You hold all of it: either backup row in Settings hands you the whole database as a
file, and uninstalling the app erases every record it ever made.

## Changes

If this policy changes, the updated version will be published at this URL with a new date. As
long as the app collects nothing, changes here will be clarifications rather than new practices.

## Contact

Questions about this policy — and anything else: a bug, an idea, a feature you wish existed:
**feedback.bati@proton.me**

</div>

<div lang="fr" markdown="1">

# Politique de confidentialité — Bati

**Dernière mise à jour : 24 août 2026**

Bati est une application d'entraînement hors-ligne. Pas de compte, pas de serveur, pas
d'analytics. Cette page existe parce que les deux stores exigent une URL de politique de
confidentialité, et parce que la version courte mérite d'être dite simplement :

> **Bati ne collecte rien. Rien de ce que vous faites dans l'application ne quitte votre
> téléphone, sauf si vous l'envoyez vous-même, délibérément, par e-mail.**

## Ce qui est stocké, et où

Tout ce que Bati enregistre — séances, séries, répétitions, temps de gainage, quêtes,
aventures, village, hauts faits, flamme, serment, avatar et réglages — est écrit dans une
**base SQLite située dans le stockage privé de l'application, sur votre appareil**.

- Rien n'est envoyé, synchronisé, sauvegardé chez nous ni partagé avec qui que ce soit.
- Nous ne pouvons pas le lire. Il n'existe aucun serveur pour le lire.
- Désinstaller l'application supprime l'ensemble, et il n'en existe aucune copie ailleurs — sauf
  si vous en avez exporté une vous-même, voir ci-dessous.

## Les sauvegardes que vous faites

Les réglages proposent trois façons d'écrire cette base dans un fichier. **Partager ma sauvegarde**
la remet au partage de votre système. **Enregistrer un fichier** l'écrit dans un dossier que vous
choisissez sur l'appareil. **Sauvegarde automatique** l'écrit dans un dossier que vous choisissez
une fois, puis de nouveau toute seule avant chaque mise à jour de l'application. Ce que ces
fichiers deviennent ensuite ne dépend que de vous : l'application ne les envoie nulle part, et
n'en a aucun moyen.

- **Ce fichier n'est pas chiffré.** Quiconque l'ouvre lit votre historique d'entraînement.
  Rangez-le comme vous rangeriez une photo personnelle — et réfléchissez-y à deux fois avant de
  le déposer dans un espace partagé.
- **Restaurer remplace tout.** Importer une sauvegarde échange le contenu de l'application contre
  le fichier que vous fournissez. La base que vous aviez est conservée sur l'appareil comme copie
  de secours, dans le même stockage privé, jusqu'à la restauration suivante.
- **La sauvegarde automatique est désactivée tant que vous ne l'activez pas**, et l'activer, c'est
  choisir le dossier vous-même — l'application ne peut écrire nulle part où vous ne l'avez pas
  envoyée. Elle n'écrit qu'avant une mise à jour, uniquement dans ce dossier, et n'y conserve que
  les cinq fichiers les plus récents, en supprimant les plus anciens qu'elle a elle-même écrits et
  rien d'autre. Les réglages affichent le dossier utilisé, et l'arrêter tient en une pression ;
  les fichiers déjà écrits restent où ils sont, ils sont à vous.
- Si le dossier choisi devient indisponible — carte retirée, dossier supprimé, autorisation
  révoquée — Bati s'arrête et la ligne des réglages repasse sur **Désactivée**, plutôt que
  d'échouer en silence en prétendant fonctionner.
- **Cela reste local.** Le dossier que vous choisissez peut appartenir à une application de cloud
  (Drive, Dropbox, Nextcloud et d'autres apparaissent dans le sélecteur de dossier d'Android) ;
  si vous en choisissez un, cette application synchronise le fichier sous sa propre politique de
  confidentialité. Bati n'apprend rien du dossier choisi au-delà d'y écrire, et ne fait aucune
  requête réseau — elle n'en a pas l'autorisation.

## Ce que Bati ne fait jamais

- Aucun compte utilisateur, aucune inscription, aucune adresse e-mail requise.
- Aucune analytics, aucune télémétrie, aucun SDK de rapport de crash, aucune publicité, aucun
  identifiant de suivi.
- Aucun SDK tiers collectant des données.
- Aucune requête réseau, à aucun moment.

## Permissions, et pourquoi

**Photos (facultatif).** Si vous choisissez une photo comme avatar, l'application lit cette
image dans votre galerie. Elle est stockée sur votre appareil comme le reste, et jamais
envoyée. Vous pouvez refuser : l'application fonctionne normalement avec les avatars intégrés.

**Notifications (facultatif).** Demandées uniquement lorsque vous activez délibérément un
rappel. Les rappels sont programmés localement par le système de votre appareil — il n'y a
aucune notification push, donc aucun serveur ne connaît votre appareil.

**Widget d'écran d'accueil (Android, facultatif).** Le widget de flamme lit votre régularité
dans la même base locale.

## Rapports de crash

En cas de plantage, Bati écrit l'erreur et sa trace **uniquement sur votre appareil**. Quand
une fonction échoue sans plantage — une sauvegarde impossible à écrire, par exemple — le message
d'erreur est conservé de la même façon ; ce message peut contenir le nom d'un dossier ou d'un
fichier que vous avez choisi.

Rien n'est transmis automatiquement. Si vous souhaitez aider à corriger un bug, les Réglages
proposent « Signaler un bug », qui ouvre **votre propre application e-mail** avec le rapport
pré-rempli. Vous pouvez le lire, le modifier ou le supprimer avant envoi — et si vous ne
l'envoyez jamais, il ne quitte jamais votre téléphone. Les rapports envoyés servent uniquement
à corriger le bug et ne sont transmis à personne.

## Enfants

Bati est une application de sport tout public, non destinée aux enfants de moins de 13 ans.
Elle ne collecte aucune donnée personnelle, quel que soit l'âge.

## Vos droits

Comme Bati ne détient aucune donnée vous concernant, nous n'avons rien à exporter, corriger ou
supprimer pour vous. Vous détenez l'intégralité : l'une ou l'autre ligne de sauvegarde, dans les
réglages, vous remet la base entière sous forme de fichier, et désinstaller l'application efface
chaque enregistrement qu'elle a produit.

## Modifications

Si cette politique change, la version à jour sera publiée à cette URL avec une nouvelle date.
Tant que l'application ne collecte rien, les modifications seront des clarifications plutôt que
de nouvelles pratiques.

## Contact

Questions sur cette politique — et tout le reste : un bug, une idée, une fonctionnalité qui
vous manque : **feedback.bati@proton.me**

</div>
