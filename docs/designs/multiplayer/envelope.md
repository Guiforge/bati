# L'enveloppe scellée v1

Une seule forme pour tous les transports (QR, lien, fichier, plus tard un relais Nostr).
Code : [`src/multiplayer/envelope.ts`](../../../src/multiplayer/envelope.ts). Vecteurs figés :
[`__tests__/fixtures/multiplayer/envelope-v1.json`](../../../__tests__/fixtures/multiplayer/envelope-v1.json),
écrits par un encodeur indépendant et relus aussi par le vrai `javax.crypto`
(`EnvelopeVectorTest.kt`). On ne les régénère jamais : un changement de format est une nouvelle
version, jamais un nouveau sens pour celle-ci.

## Octets

Entiers en gros-boutiste. Ni texte libre ni champ de longueur variable : il n'y a aucune place où
une phrase, un poids ou un pouls pourrait voyager, c'est la règle de confidentialité rendue
structurelle.

### En-tête, en clair et authentifié (29 octets)

C'est la donnée associée de l'AEAD : changer un octet fait refuser l'enveloppe.

| Décalage | Taille | Champ | Note |
| --- | --- | --- | --- |
| 0 | 1 | version | 1 |
| 1 | 1 | kind | 1 = semaine, 2 = invitation |
| 2 | 16 | pair id | aléatoire, jamais un uuid v7, qui dirait la date de l'appairage |
| 18 | 8 | sender key id | l'identifiant de l'expéditeur dans cette paire |
| 26 | 2 | année ISO | |
| 28 | 1 | semaine ISO | 1 à 53 |

### Kind 1, la semaine

`en-tête ‖ nonce 12 ‖ chiffré 13 ‖ tag 16`, soit **70 octets** et 94 caractères en base64url.

AES-256-GCM par `bati-crypto` (`seal` / `open`), clé = secret de la paire (32 octets), en-tête en
donnée associée. Le clair :

| Décalage | Taille | Champ | Note |
| --- | --- | --- | --- |
| 0 | 4 | stamp | secondes epoch, l'horloge de la fusion |
| 4 | 1 | goal | objectif figé au lancement, en séances (`weeklyGoal`), jamais des reps |
| 5 | 1 | flags | bit 0 = en pause |
| 6 | 7 | days | séances comptées par jour ISO, lundi d'abord |

**L'état complet de la semaine, jamais un delta.** Un message perdu ou répété ne casse rien.

**Fusion** (`mergeWeek`) : dernier écrit gagnant par expéditeur et par semaine, comme la synchro. Le
stamp le plus grand ; à égalité, les octets les plus grands, pour que deux téléphones concluent pareil
quel que soit l'ordre d'arrivée. Un doublon ou un vieux message rejoué ne change rien.

### Kind 2, l'invitation

`en-tête ‖ made-at u32 ‖ secret 32`, soit **65 octets**. Année et semaine à zéro.

**Non scellée, et elle ne peut pas l'être** : c'est elle qui crée la clé. Qui la lit peut lire les
messages de cette paire. D'où l'écran proche ou la messagerie du joueur, et une validité de 7 jours,
parce qu'une conversation la garde pour toujours.

## Budget

Plafond du lecteur : 600 octets (`MAX_ENVELOPE_BYTES`), refusés avant tout déchiffrement. Une semaine
en fait 70. Le lien complet tient en moins de 120 caractères et son QR reste à 45 modules au plus. Il
reste de la place pour les kinds des lots suivants.

## Refus

`openEnvelope` ne lève jamais : tout ce qui vient d'un QR ou d'un lien est non fiable.

| Résultat | Cas |
| --- | --- |
| `oldVersion` | version antérieure à toutes celles qu'on lit |
| `newerVersion` | version plus récente : mettre Bati à jour la lira |
| `notThis` | pas une enveloppe, tronquée, trop longue, kind inconnu |
| `refused` | mauvaise clé ou un octet changé ; AES-GCM ne dit pas lequel |
| `own` | son propre message qui revient, que la clé partagée authentifierait comme celui de l'autre |

## Ce qui reste visible en clair

La version, le kind, le pair id, le sender id et la semaine ISO. Celui qui voit passer deux liens sait
qu'ils concernent la même paire et quelle semaine ; rien sur leur contenu. Nécessaire pour trouver la
bonne clé sans en essayer cinq, et à garder en tête pour un relais Nostr, où ce pair id deviendrait
observable par un tiers : il faudra alors le dériver par semaine, en version 2.

## Le lien

`https://getbati.app/d#<base64url>`, et `bati://d#<base64url>` en repli. Tout est après le `#`, qu'un
navigateur n'envoie jamais. Un QR porte ce même texte. Base64url canonique seulement : deux écritures
d'un même code feraient passer un code déjà vu pour un nouveau.
