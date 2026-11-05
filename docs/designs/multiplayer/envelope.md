# L'enveloppe scellée v1

Une seule forme pour tous les transports (QR, lien, fichier, plus tard un relais Nostr).
Code : [`src/multiplayer/envelope.ts`](../../../src/multiplayer/envelope.ts). Vecteurs figés :
[`__tests__/fixtures/multiplayer/envelope-v1.json`](../../../__tests__/fixtures/multiplayer/envelope-v1.json),
écrits par un encodeur indépendant et relus aussi par le vrai `javax.crypto`
(`EnvelopeVectorTest.kt`). On ne les régénère jamais : un changement de format est une nouvelle
version, jamais un nouveau sens pour celle-ci. Un nouveau kind a ses propres vecteurs :
[`envelope-v1-link.json`](../../../__tests__/fixtures/multiplayer/envelope-v1-link.json), écrits par le
`crypto` de Node (OpenSSL) à partir des clés de test publiées de la RFC 7748.

## Octets

Entiers en gros-boutiste. Ni texte libre ni champ de longueur variable : il n'y a aucune place où
une phrase, un poids ou un pouls pourrait voyager, c'est la règle de confidentialité rendue
structurelle.

### En-tête, en clair et authentifié (29 octets)

C'est la donnée associée de l'AEAD : changer un octet fait refuser l'enveloppe.

| Décalage | Taille | Champ | Note |
| --- | --- | --- | --- |
| 0 | 1 | version | 1 |
| 1 | 1 | kind | 1 = semaine, 2 = invitation en face à face, 3 = invitation par lien, 4 = réponse d'appairage, 5 = paquet (sans le reste de l'en-tête, voir plus bas) |
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
| 5 | 1 | flags | bit 0 = une pause a touché cette semaine (précisé au lot 1 : même bit, même place) |
| 6 | 7 | days | séances comptées par jour ISO, lundi d'abord |

**L'état complet de la semaine, jamais un delta.** Un message perdu ou répété ne casse rien.

**Fusion** (`mergeWeek`) : dernier écrit gagnant par expéditeur et par semaine, comme la synchro. Le
stamp le plus grand ; à égalité, les octets les plus grands, pour que deux téléphones concluent pareil
quel que soit l'ordre d'arrivée. Un doublon ou un vieux message rejoué ne change rien.

### Kind 2, l'invitation en face à face

`en-tête ‖ made-at u32 ‖ secret 32`, soit **65 octets**. Année et semaine à zéro.

**Non scellée, et elle ne peut pas l'être** : c'est elle qui crée la clé. Qui la lit peut lire les
messages de cette paire. Elle n'est donc acceptée que par la caméra, sur un écran dans la même pièce
(`readCode`), jamais par un lien, et elle est valable 7 jours.

### Kind 3, l'invitation par lien

`en-tête ‖ made-at u32 ‖ clé publique de A 32`, soit **65 octets**. Année et semaine à zéro. Aucun
secret : A garde la moitié privée dans `pair_invites` (`0084`), sur ce téléphone seulement, jusqu'à la
réponse ou 7 jours, puis la supprime. Valable 7 jours.

**La suppression vide les deux fichiers depuis le lot 1.** `secure_delete` réécrit les pages, puis
`wal_checkpoint(TRUNCATE)` vide le journal : mesuré le 05/11 sur une build de release, la clé privée d'une invitation
annulée n'est plus ni dans `bati.v3.db` ni dans `-wal` (0 octet). Au lot 0 bis, les instructions de Drizzle jamais
finalisées retenaient un lecteur et la clé restait dans le journal ; elles sont finalisées après lecture
(`db/releasingStatements.ts`). Une sauvegarde prise avant la suppression, celle du téléphone comprise, garde ce
qu'elle a copié.

### Kind 4, la réponse d'appairage

`en-tête ‖ clé publique de B 32 ‖ nonce 12 ‖ chiffré 4 ‖ tag 16`, soit **93 octets**. Le sender id de
l'en-tête est celui de B. Le clair est le moment de la réponse (u32, secondes). Ce qu'il dit compte moins
que le fait qu'il s'ouvre : c'est la preuve que B détient la clé.

AES-256-GCM par `bati-crypto`, avec `en-tête ‖ clé publique de B` en donnée associée. La clé de la paire :

```
partagé = X25519(ma clé privée, sa clé publique)
clé     = HKDF-SHA256(partagé, sel vide, "bati pair v1" ‖ pair id 16 ‖ publique de A 32 ‖ publique de B 32, 32 octets)
```

Le pair id et les deux clés publiques entrent dans la dérivation : changer l'une d'elles donne une
autre clé, et la réponse ne s'ouvre pas. Une clé publique d'ordre faible, qui ne donne aucun secret partagé,
est refusée. La première réponse valide consomme la clé privée de A : une seconde ne trouve plus rien.

Bibliothèque : `@noble/curves` (MIT, JS pur), parce que la plateforme n'a X25519 qu'à partir de l'API 31,
et `@noble/hashes` déjà livré par `@scure/bip39`. L'aléa vient de `bati-crypto`, pas de `crypto.getRandomValues`.

### Ce que lit quelqu'un qui a toute la conversation

Les deux clés publiques, le pair id, les deux sender ids, le moment de l'invitation et le fait qu'une
réponse est partie. Il ne peut dériver ni la clé ni lire la réponse : il lui manque les deux moitiés
privées, qui n'ont jamais voyagé. Une enveloppe de semaine reste scellée pour lui.

**La limite, à dire franchement.** Cela protège de quelqu'un qui lit, pas de quelqu'un qui réécrit. Sans
rien à comparer de vive voix, personne ne distingue la clé de A de celle d'un attaquant capable de
remplacer les messages dans la messagerie. Il pourrait aussi répondre avant B avec le lien, s'il l'a lu :
A se retrouve appairé avec lui, et lit « déjà un compagnon » quand la vraie réponse arrive ; B se croit appairé
et personne ne l'écoute. L'enjeu reste petit, une enveloppe ne portant que des séances comptées par jour, et le
QR en face à face n'a pas ce trou.

### Kind 5, le paquet (lot 1)

`version 1 ‖ kind 5 ‖ nombre n (1 à 3) ‖ n fois (longueur 1 octet ‖ enveloppe)`. Pas d'en-tête de 29 octets : le
paquet ne scelle rien, chaque enveloppe intérieure (kind 1 ou 4, jamais 2, 3 ou 5) s'authentifie seule. C'est ce que
porte un « Envoyer mes coups » : la semaine en cours, la précédente, et chez B la réponse d'appairage tant qu'une semaine
de A n'est pas arrivée. Au plus 239 octets, 341 caractères de lien. Vecteurs :
[`envelope-v1-bundle.json`](../../../__tests__/fixtures/multiplayer/envelope-v1-bundle.json), bâtis à la main à partir
des vecteurs figés des kinds 1 et 4. Code : [`src/multiplayer/bundle.ts`](../../../src/multiplayer/bundle.ts).

Une enveloppe de semaine dont le `stamp` dépasse de plus de 14 h l'horloge du lecteur est mise de côté (« pas
encore ») : dernier écrit gagnant, elle gagnerait toutes les fusions suivantes.

## Budget

Plafond du lecteur : 600 octets (`MAX_ENVELOPE_BYTES`), refusés avant tout déchiffrement. Une semaine
en fait 70, une réponse d'appairage 93. Le lien d'une semaine tient en moins de 120 caractères et son QR
reste à 45 modules au plus ; celui d'une réponse en fait 146. Il reste de la place pour les kinds des lots suivants.

## Refus

`openEnvelope` ne lève jamais : tout ce qui vient d'un QR ou d'un lien est non fiable.

| Résultat | Cas |
| --- | --- |
| `oldVersion` | version antérieure à toutes celles qu'on lit |
| `newerVersion` | version plus récente : mettre Bati à jour la lira |
| `notThis` | pas une enveloppe, tronquée, trop longue, kind inconnu. `openEnvelope` ne lit que le kind 1 |
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
