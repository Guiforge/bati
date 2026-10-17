# Vérification des développeurs Android, note du 17 octobre 2026 (C6)

**Ce n'est pas un avis juridique et cette note ne conclut rien.** Elle consigne ce que disent les
sources publiques à la date indiquée, pour que la décision se prenne sur des faits datés. Les pages
changent : relire les sources avant d'agir. Origine : point C6 de
[l'audit L-01](2026-10-16-legal-audit.md).

## Ce que dit Google

Source : https://developer.android.com/developer-verification (lue le 17/10/2026).

- Les développeurs doivent être vérifiés pour distribuer des applications sur les appareils Android
  certifiés. Deux voies : l'Android Developer Console (distribution hors Play uniquement) et la
  Play Console (Play et hors Play). La page dit que Play enregistre automatiquement 99 % des
  applications.
- Calendrier cité par la page : « Effective September 30, 2026 », protections pour les
  installations depuis des magasins participants au Brésil, en Indonésie, à Singapour et en
  Thaïlande (appareils certifiés sous Android 7 et plus). En août 2026 : API pour développeurs,
  comptes à distribution limitée et « advanced flow » pour les utilisateurs avancés. Extension
  mondiale annoncée pour 2027 (« expand globally for all apps on certified Android devices in
  2027 »).
- Comptes à distribution limitée : étudiants, enseignants et amateurs peuvent partager une
  application avec 20 appareils au plus, sans pièce d'identité officielle ni frais d'inscription.
- « Advanced flow » : un parcours prévu pour que des utilisateurs avancés installent des
  applications non vérifiées. La page n'en détaille pas les règles ; elle renvoie à un billet de
  blog et à une vidéo.
- Les frais éventuels et les règles complètes sont renvoyés aux guides et à la FAQ de Google, pas
  énoncés sur la page.

## Ce que dit F-Droid

Source : https://f-droid.org/2025/09/29/google-developer-registration-decree.html (publié le
29/09/2025).

- F-Droid s'oppose à l'enregistrement central des développeurs (frais, pièce d'identité, liste des
  identifiants d'applications).
- Il dit ne pas pouvoir imposer cet enregistrement aux auteurs, et ne pas vouloir réclamer les
  identifiants des applications libres qu'il distribue.
- Il affirme que la mesure mettrait fin à F-Droid et aux autres sources libres telles qu'elles
  existent. C'est sa position, pas un constat sur la mise en œuvre réelle.

## Ce que cela touche dans Bati

Faits du dépôt, sans interprétation :

- Trois distributions (`AGENTS.md` § Releases) : `fdroid` (compilé par f-droid.org), `github` (APK
  des Releases et dépôt F-Droid maison) et `play` (AAB, vérifié via la Play Console).
- Identifiant d'application : `com.guiforge.bati`. Clé de signature : voir
  `plugins/withAndroidReleaseSigning.js`.
- Aucune des sources lues ne dit si l'APK `github` ou la version compilée par F-Droid seront
  traités comme « vérifiés », ni si l'enregistrement de l'identifiant par son auteur sera exigé
  pour elles.

## À vérifier à la main, plus tard

1. Relire la page officielle et la FAQ avant le 30/09/2026 puis avant 2027 : la date mondiale
   exacte, les frais, le sort des installations hors magasin participant.
2. Ouvrir la Console développeurs et voir ce qu'il faudrait déclarer pour `com.guiforge.bati`
   (compte, identité) et à quelles conditions.
3. Regarder la réponse de F-Droid à ce sujet (billets ultérieurs) : c'est elle qui dit si la
   distribution `fdroid` change.
4. Tester l'« advanced flow » sur un appareil certifié quand il existe, avec l'APK `github`.

Reste un point pour l'avocat, déjà dans l'audit : C6.
