---
title: Backups, encryption and device sync
type: technical
status: active
updated: 2026-09-25
related: [README.md, ../planning/roadmap.md, ../legal/privacy.md]
---

# Backups, encryption and device sync

> Four ways a hero's history leaves the running database, the one key that seals them, and how
> two devices become one hero.

## The four copies

| Copy | Who makes it | Where it goes | Code |
| --- | --- | --- | --- |
| Android's own backup | the system, nightly, and on a phone-to-phone transfer | Google (end-to-end with the screen lock) or Seedvault | `plugins/withAndroidBackupRules.js` |
| Save a file (and a small link, send to another app) | the hero, from Settings | Android's "Save as" (`modules/bati-save`), or the share sheet | `src/backupFiles.ts` (`saveBackupAs`, `exportBackup`) |
| Automatic backup | the app, once a day at launch and before migrations | a folder picked once (SAF tree) | `src/autoBackup.ts` |
| Device sync | the app, at launch and on demand | the hero's own WebDAV server, `Bati/` | `src/deviceSync.ts`, `src/cloudSync.ts` |

Every one of them is a `VACUUM INTO` snapshot of the whole database, so a restore of any of them
goes through one road (`restoreStaged` in `hooks/useBackup.ts`): decrypt if sealed, `validateBackup`,
`keepDeviceSettings`, the copies no swap may go ahead without, then `commitRestore`. The picker,
onboarding and taking another device's version are three doors to that road, and one import runs
at a time in the whole app, not per screen: they all stage into the same file. Once the swap is
done the provider reloads the JS runtime (`reloadAppAsync` from `expo`): every cache, store and the
database singleton go with the old runtime, as on a cold start, and the hero never has to close
the app. The old "close and reopen" notice stays as the way out if the host cannot reload.

**Two devices can share a backup folder.** Dated copies are named
`bati-export-<first 8 hex of the install id>-v<N>-<day>.<ext>`, and each device keeps its own five
and never prunes another's. Before the tag both wrote `bati-export-v<N>-<day>`: the second overwrote
the first's copy of the day and the prune kept five files across both. Copies from before the tag
are left alone once the device writes tagged names, because whose they are cannot be told, and the
copies of an install id that no longer exists (a restore onto a new phone gives a new one) stay too:
they are the hero's files, and deleting them is not housekeeping. The id lives with its counter in
one SecureStore item (`bati.sync.identity`, `src/installId.ts`), adopted from the item the previous
build wrote so no device renames itself on update.

**Android's backup carries three files and nothing else**: `bati.v<N>.db` and its `-wal` and `-shm` sidecars (the database is in WAL mode, so there is no `-journal`). The
same directory holds decrypted imports, another device's history opened for comparison, the
pre-restore `.bak`; naming the three keeps all of those out of Google's copy and under the 25 MB
quota past which Android backs up nothing at all. The `.gpx` files in `gps-tracks/` stay out too:
they are exports, rebuilt from `gps_points` whenever a recap shares one.

**The folder picker does not reach the classic clouds.** Google Drive, OneDrive and Proton never
appear in `ACTION_OPEN_DOCUMENT_TREE`, Dropbox's provider is partial, and Nextcloud's serves a stale
copy of what another device wrote. Automatic backup is for the device itself, or a folder Syncthing
keeps in sync. Clouds are reached by `src/cloudSync.ts`.

## Encryption

This section describes format 2, which every phone before this release wrote and which is
still read forever. Every vault made now is format 3 (Argon2id, twelve words), described under
"Format 3" below.

`src/backupCipher.ts`. One random 256-bit master key seals every snapshot with AES-256-GCM, as
`.batb`. Each file's header carries the master key wrapped twice: by the hero's password
(PBKDF2-HMAC-SHA256 over the UTF-8 of its NFC form, 600,000 iterations written in the slot) and by
a recovery key shown once (format 3: twelve words; format 2: 64 hex digits, still opened). The header is the AAD, it ends with a check value that says
in one call whether a key opens the file, and a header outside what this version writes (an
unknown slot, iterations outside 100,000 to 10,000,000) is not a backup at all.

The primitives are the platform's own `javax.crypto`, behind a local Expo module
(`modules/bati-crypto`), PBKDF2 included, computed over bytes rather than through a `char[]`.
Decryption writes beside the target and renames only once every tag verified.

**The body is sealed in 1 MiB segments (format 2).** Android's AES-GCM (Conscrypt) buffers a
whole message until `doFinal`, so the first format, one GCM over the file, asked the heap for the
file's size at once: on a 2 GB emulator with a 192 MB heap, a 128 MB database failed to seal and
every encrypted backup and sync of it stopped. Segmented, a 192 MB database seals and a 172 MB
peer opens with the Java heap under 80 MB (measured 2026-09-26). Each segment's AAD is the header,
its index and a last flag, so reordering, dropping or cutting at a boundary fails like any
altered byte. Raw GPS is what grows a database: 78 bytes a point at 1 Hz, about 0.28 MB an hour
outdoors; five hours a week is some 73 MB a year. Tests run the real
format against a Node double of the module (`__tests__/helpers/nodeBatiCrypto.ts`).

**The key lives in SecureStore; the wish lives in the database.** SecureStore is excluded from
Android's backup, so a restore can never change the key. The `backupEncryption` preference does
travel: a database Android restored onto a new phone reads as **locked**, and nothing is written,
in plaintext or otherwise, until the password is given again.

**Opening is not joining.** A file opened with its password hands back `join`: as primary, its key
becomes this phone's (what a device joining another does); otherwise it is only remembered in the
keyring for reading. An import asks the hero before the primary case; a file someone else handed
over must never silently make every later backup open with their secret.

**A new password is a new key**, with new words shown straight after. The old key moves
to the keyring so this phone still opens what it sealed; other devices ask for the new password
once. Re-wrapping the same key would have left future files open to anyone holding the old
password and one old file.

The fingerprint unlocks no key. It guards the recovery key kept in SecureStore with
`requireAuthentication`, so the hero can see it again (`USE_BIOMETRIC` and `USE_FINGERPRINT`, from
androidx.biometric, are justified in `__tests__/android-permissions.test.ts` for that alone).

### Format 3

Written by `BatiCryptoV3.kt`, read by the same file and nowhere else: the JavaScript never parses a
v3 header, the module hands it over already read. Format 2 files are on phones, in folders and on
servers, and `BatiCryptoCore.kt` opens them exactly as it always did.

```
file    = "BATB" | 3 | install id 16 | counter u64 | sealed_at u64 ms | slot count u8
          | slot x n | file salt 32 | nonce prefix 7 | check 32 | segment x n
slot    = kind u8 | length u16 | gen u32 | body
  kind 3, password (Argon2id): m_kib u32 | t u8 | p u8 | salt 16 | wrapped
  kind 4, twelve words:        salt 16 | wrapped
  wrapped = nonce 12 | master key 32 | tag 16
segment = ciphertext | tag 16        at most 1 MiB of plaintext; the nonce is not written
  nonce = prefix 7 | index u32 | last u8        aad = the whole header
```

- **A key per file.** The body key is `HKDF(master, file salt, "bati/v3/body")`. With the master key
  itself under every file, a random 96-bit nonce per segment is a birthday problem that grows with
  every backup ever made; with a key per file the nonces only have to differ within one file, and a
  counter in the nonce guarantees it. The header is built fresh at every sealing (new salt, new
  prefix): reusing one stored header would have reused nonces.
- **The check** is an HMAC of the header under `HKDF(master, file salt, "bati/v3/check")`, verified in
  constant time before the first segment, so a wrong key costs one HMAC and not a pass over a database.
- **The password** goes through Argon2id (RFC 9106; Bouncy Castle, since the platform has none), 64 MiB,
  3 passes, 1 lane when written. A reader accepts 19 to 128 MiB, 2 to 4 passes, 1 to 4 lanes and at
  most four slots of 128 bytes, and refuses anything else **before** allocating or computing: the file
  is untrusted input. A heap too small for the pass is refused up front (`LOW_MEMORY`), and the hero is
  told to close other apps, not that the password is wrong.
- **The twelve words** are sixteen bytes of BIP-39 (`src/backupWords.ts`), run through
  `HKDF(entropy, slot salt, "bati/v3/recovery")`. 128 bits is the strength of AES-128. Typing is
  forgiving (capitals, accents, spacing; four letters suffice because no list shares four), and a phrase
  that is valid in more than one list (a hundred words are in both English and French) is tried against
  the slot once per list.
- **Copying the words** (`src/sensitiveClipboard.ts`, `BatiSave.copySensitive`). The copy is flagged
  `EXTRA_IS_SENSITIVE` on Android 13+, so the system's clipboard preview and keyboards that honour the
  flag do not show it (older Android gets a plain copy). It stays a minute: a timer clears it, and so
  does the app's next return to the foreground when the minute passed while Android had the app
  suspended (a timer does not fire then, and only the app in front may read the clipboard). Something
  copied in between is left alone.
- **Identity.** The header carries the writing install's id and a counter (`src/installId.ts`),
  reserved in SecureStore before the file is written, under a lock: a crash spends a number and never
  reuses one. Sync uses them to refuse a file older than the last it saw from a peer.
- **Slot generations.** Each slot has a `gen`, bumped when it is re-wrapped, which lets two devices that
  re-wrapped different slots of the same key at the same time keep both.

Three implementations agree on it, and tests hold that: the Kotlin on the JVM against RFC 9106 and
RFC 5869 (`BatiCryptoV3Test.kt`), a Node implementation written from this description on
`crypto.argon2Sync` (`__tests__/helpers/nodeBatiCryptoV3.ts`), and the file Kotlin froze in
`__tests__/fixtures/backup` that Node reads and writes byte for byte.

**What a build does with it.** Every vault made now is v3 (password of at least 15 characters, twelve
words shown once and checked by typing two back). A v2 vault is updated from Settings, which asks for a
new password: that is a new key, the old one stays in the keyring so nothing already written is lost,
and "I do not remember it" keeps the same key (`rewrapPassword`, `rewrapWords`). A vault never goes back to an older format: a v2 file opened with its password
on a v3 vault is only remembered in the keyring, and a v2 vault that joins a v3 one becomes it with its
own key kept. A file of a version after 3 is its own answer (`newerVersion`, "update Bati"), at import,
in sync, and when connecting to a server, where starting a vault of one's own would be a second one.

**Sync and formats.** A peer is judged by its vault's format. A higher one is joined whatever the dates
say; at the same format the file written last wins, then the larger file name, so two devices never both
wait. A lower one is never joined and never waited for (`oldKey`), and neither is a file that opens only
with a key this phone keeps for reading: that is a vault this phone has left, and merging it would let an
old key steer the history of a hero who moved on. Verdicts are kept with `CIPHER_READS`, so teaching a
build a format makes them be asked again.

### How a file is written

Every sealed file (format 2 and 3) is written to `<name>.part` in the same directory, synced, checked
(bytes written against what the file system holds) and renamed over the old one: a kill or a full
disk leaves the previous file or nothing, never a truncated backup under its final name, and a seal
that fails does not delete the file it was replacing. `BatiCryptoCore.writeAtomically`. A
`content://` target cannot be renamed, so those are written by copying a finished file in:
`BatiSaveModule.writeTo` (Save as) checks the size and deletes what it could not finish, and the
copies into the automatic backup's folder go through expo-file-system's `copy`, which does neither.
That last one is the known ceiling: a kill mid-copy can leave a short dated copy in that folder,
and the five newest copies are what keep one good file behind it.

### How the encryption fits together

```
  mot de passe (15+ car.)          12 mots (BIP-39)
          |                               |
     Argon2id                          HKDF
          |                               |
          v                               v
   +-------------+                 +-------------+
   | slot 3      |                 | slot 4      |      Chaque slot contient la MEME
   | clé maîtresse|                | clé maîtresse|      clé maîtresse, enveloppée
   | enveloppée  |                 | enveloppée  |      par un secret différent.
   +------+------+                 +------+------+
          \________________  ______________/
                           \/
                    CLÉ MAÎTRESSE (32 octets, aléatoire, vit dans SecureStore)
                           |
                 HKDF(maître, sel du fichier)       un sel neuf à chaque fichier
                           |
                           v
                   clé du fichier  --> AES-256-GCM, segments de 1 Mio
                                       nonce = préfixe | n° de segment | dernier?
```

Le mot de passe et les 12 mots ne chiffrent jamais les données: ils ouvrent la clé
maîtresse. Changer de mot de passe, c'est re-envelopper la clé (ou en créer une
nouvelle, voir plus bas), pas re-chiffrer l'historique.

### One file, from the outside in

```
 "BATB" | version | appareil | compteur | date | slots... | sel | check | segments...
    ^        ^                                                  ^
    |        |                                                  +-- HMAC: la bonne clé? (avant tout
    |        +-- le seul octet qui dit quelle règle lire              déchiffrement, temps constant)
    +-- c'est un fichier Bati chiffré
```

### The rule when versions mix

Cinq règles, dans cet ordre de priorité. Elles ne changent pas quand on ajoute un format.

```
 1. LIRE tout ce qu'on connaît      un build lit toutes les versions <= la sienne, pour toujours.
 2. ÉCRIRE dans le format du coffre le coffre n'écrit que dans son format.
 3. UN COFFRE NE RECULE JAMAIS      v3 ne redevient pas v2, même si un vieil appareil le voudrait.
 4. LES VIEILLES CLÉS RESTENT       toute clé remplacée va au trousseau: ce qu'elle a scellé
                                    reste lisible sur ce téléphone.
 5. PLUS NEUF QUE MOI = "METS À JOUR" un fichier d'une version inconnue n'est ni corrompu ni
                                    "mauvais mot de passe": c'est `newerVersion`, rien n'est
                                    touché, on dit de mettre Bati à jour.
```

Ce que ça donne quand deux appareils n'ont pas la même version (synchro):

```
   Téléphone A (build neuf, coffre v3)          Tablette B (vieux build, coffre v2)

   A voit le fichier de B (v2)  ---------->  jugé "oldKey": lu pour information, JAMAIS fusionné,
                                             et A n'attend jamais B.
   B voit le fichier de A (v3)  ---------->  "illisible / mets à jour": B continue seule,
                                             rien n'est perdu ni écrasé.
   B met Bati à jour, tape le nouveau mot de passe  ---->  B rejoint le coffre v3 de A.
                                             Sa vieille clé v2 reste au trousseau.
```

Entre deux versions, le plus haut gagne; à version égale, le fichier le plus récent
puis le plus grand nom de fichier, donc deux appareils ne s'attendent jamais.

### Recipe: adding format 4 (algorithm or layout change)

```
  [ ] 1. Kotlin  : un BatiCryptoV4.kt à côté de V3. On ne modifie JAMAIS V2 ni V3.
  [ ] 2. Kotlin  : V3 reconnaît déjà version > 3 comme `NewerVersion` (déjà en place).
                   V4 doit, lui, lire 2, 3 et 4.
  [ ] 3. Figer   : un fichier v4 réel dans __tests__/fixtures/backup (comme kotlin-golden-v3.bin).
  [ ] 4. JS      : `vaultFormat()` sait dire 4; `joinKey` classe 4 au-dessus de 3 (règle 3).
  [ ] 5. JS      : monter `CIPHER_READS` (3 -> 4): les verdicts de synchro déjà mis en cache sont
                   redemandés, parce que des fichiers jugés "illisibles" ne le sont plus.
  [ ] 6. UI      : un coffre v3 propose "Mettre à jour la protection" (nouveau mot de passe, la
                   clé v3 va au trousseau). Nouveaux coffres directement en v4.
  [ ] 7. Tests   : les fixtures v2 et v3 s'ouvrent toujours; un v4 rejoint par un v3 ne recule pas;
                   un build v3 voit `newerVersion` sur un fichier v4 (le test existe pour v2 -> v3).
  [ ] 8. Sortir  : release en DEUX temps si possible. D'abord un build qui LIT v4 (sans l'écrire),
                   puis, quelques versions plus tard, celui qui l'écrit. Les appareils en retard
                   ont ainsi déjà de quoi comprendre ce qu'ils recevront.
```

La règle 8 est celle qui coûte le moins cher: c'est ce qu'on a fait pour passer de v2 à v3
(le lot de lecture est la release B, la création des coffres v3 la release C).

## A phone that lost its key

`encryptionStatus() === "locked"`: Android restored the database onto a new phone, the database says
the hero turned encryption on, and this phone holds no key. The Settings row says "To enter again"
and opens the sheet's `unlock` mode, not `enable`.

- **Why no new key by default**: a new password makes a second vault, and every older copy (backup
  folder, other devices, the server) stays closed to it. The hero almost always still has the password
  or the twelve words, so that is the first door ("I already have a password").
- **Three sources** (`src/vaultUnlock.ts`): `server` (a device of theirs or the sync folder, offered
  only when an account exists), `folder` (the newest sealed copies in the backup folder, offered
  only when there are some) and `file` (a file they choose, always offered). One text field takes the
  password or the twelve words as typed; the cipher tells them apart. Opening any of them makes its
  key this phone's, and the row refreshes to "Yes".
- **The second door**: "Create a new password" runs the unchanged `enable` flow, after one screen:
  "Your older copies will stay closed by the old password."
- Guarded by `__tests__/BackupSecurityRows.test.tsx` (a locked row opens `unlock`, never `enable`) and
  `__tests__/EncryptionSheetUnlock.test.tsx`.

## Device sync

- **Transport**: WebDAV. Nextcloud signs in through the browser (Login Flow v2, a revocable app
  password; the page and poll endpoint must be on the server or on https, and the account keeps the
  address the hero typed). Any other server, behind presets (kDrive, Koofr, Round Sync for rclone),
  takes an address, a user and an app password. Either is remembered only once it created and
  listed the folder; a refusal leaves it as the `candidate` the connection test asks about, and
  nothing stored (a Nextcloud account used to be saved first, and a 400 on the first listing left
  one that failed at every launch). The folder path uses the account's id, from OCS, never the
  login name: an email resolves on a recent Nextcloud and is a 404 on an old one; with no id the
  path is `/remote.php/webdav`, the signed-in user's own root. Plain HTTP is refused except to this phone, which is also all that
  `plugins/withAndroidNetworkSecurity.js` lets through in a release build.
- **Or a folder** (`src/folderSync.ts`): a Storage Access Framework tree picked once, which
  Syncthing (Syncthing-Fork on Android) or any folder-syncing app keeps in step with the other
  devices. Bati makes no network request for it. Both transports sit behind one `Remote` (list,
  read, write) in `src/deviceSync.ts`, so vaults, verdicts and the merge are the same. The folder
  has no etag (time and size stand in) and no server clock: the vault tie-break reads the
  writer's modification time there. A write is a plain copy over the device's previous file:
  expo-file-system refuses `rename` on a content URI, Syncthing waits about ten seconds of quiet
  before it reads a file, and a truncated one would fail its segments and read as unreadable
  until the next write. Syncthing's own `.tmp` and `.sync-conflict-` files do not match the peer
  pattern.
- **One file per device**, `bati-<random install id>.batb`, written only by that device. No lock,
  no shared file, nothing deletes another device's file. At most 16 peers are read, and a file
  over 256 MB is not. A file goes up as `….batb.upload` (Nextcloud refuses `.part` with a 400) and a `MOVE` puts it in place, so a cut-off
  upload never leaves a truncated file under a name devices read (a server without `MOVE` gets
  the direct `PUT`).
- **One vault.** A device connecting to a server that already holds sealed files asks for the
  password of the newest one (highest format first, then the server's date, then the larger name; a format lower than the phone's own is refused) and joins it as primary, instead of inventing a key of
  its own (a file left by a phone reset long ago must not win); a device later seen under another
  password (`locked`) prompts the same question. Walking away from that question, or from turning
  encryption on for a server waiting on it, disconnects.
- **Two new vaults at once.** Two devices that both changed their password offline would each
  ask to join the other's and swap vaults. The file that reached the server last wins, by the
  server's own dates (a device re-uploads right after its key changes): the other device sees it
  as `locked`, asks, and sends nothing until it has joined; the winner sees the loser as
  `waiting` and says nothing.
- **What each side lacks** (`compareWithPeer`, on real SQLite): sessions by uuid, deletions by the
  `deleted_sessions` tombstones (0064), and the hero's own content (hero exercises and quests,
  village name, avatar, level, equipment, oath, reminder days). Derived caches are ignored, and so are favourites
  and quest configs, which name quest ids and are not merged: what the merge leaves out, the
  comparison must not count, or two merged devices would read as diverged forever.
- **Merged, not asked** (`db/merge.ts`). An `ahead` or `diverged` device is merged into this one:
  its sessions with their sets and GPS points, its deletions, its hero exercises and quests (the
  newer edit wins), its preferences (the newer wins; a device with nothing of its own yet takes
  them all). This device's rows keep their ids, the other's get new ones through temporary maps,
  Admin content is matched by seed name, timestamps are copied verbatim so a second comparison
  finds nothing, and one transaction rolls back whole on anything unmapped. The app then reloads
  (every cache read the old database) and says what arrived. The first merge with a device uploads
  this one's history as `bati-<id>-kept-<time>.batb`, which no device reads as a peer. Left local
  in this version: campaigns and boss fights (random crits cannot be replayed; the other device's
  campaign sessions count as training), quest configs, favourites, achievements. A device on
  another build is not merged; the hero chooses as before, and a refusal is remembered by that
  device's content fingerprint. Verified on the emulator: 14 sessions each, one unique on each
  side, became 15 on both, with the newer village name, one reload, and no second merge after.
- **Uploads**: an unchanged history is not re-uploaded unless the key changed (a vault joined, a
  new password), or the other devices would be left with a file they cannot open.
- **Listen before speaking.** Peers are judged before this device uploads. It sends nothing while
  one is `ahead` (that device already holds everything this one has), nor, on its first contact
  with a server, while one has news for it: a tablet fresh from onboarding has a village name
  newer than the phone's, and uploading first made a near-empty device look like news to all.
- **Downloads only what can change an answer.** A `level`, `behind` or `unreadable` verdict is
  remembered against the file's etag and this device's state (history, key, and the migrations
  this build knows, so an app update reads a too-new peer again). An idle launch downloads nothing.
- **Said, not swallowed.** One question at a time; an `unreadable` device is announced once per
  file it writes, not once per launch, as "update Bati", since a newer version on it is the usual
  reason.
- **Never lost in silence.** The server's label is also kept as the device-local preference
  `syncServer`, beside the account in SecureStore. Whatever removes the account (a bug, a wiped
  Keystore, a database Android restored onto a new phone), the preference stays, `lostSync` finds
  one without the other, and Home says "Sync has stopped" until the hero reconnects or forgets it.
  Only the hero's own Stop clears both. Walking away from another device's password question
  pauses sync instead of disconnecting it: nothing is sent while that vault is unknown here, the
  row says "Waiting for your password", and Home offers to ask again.
- **Failures by layer.** `failureOf` (src/cloudSync.ts) sorts a failure into offline, refused
  credentials, full storage, an untrusted certificate, a server error with its status, encryption
  off, or unknown; the toast, the Settings sheet and the Home card say that, not "could not reach".
  How the last runs went is kept (`syncHealth`), so a sync failing for three days shows on Home.
- **The sync sheet** replaced a native alert: status in plain words ("up to date, 5 min ago"), the
  folder and user, every other device with its state and when it last wrote, the last merge and
  its kept copy, and a Wi-Fi-only switch (`syncWifiOnly`, device-local; "Sync now" always runs).
  Stop says what it leaves: the files, and for any server but Nextcloud the app password, which
  keeps working; for Nextcloud, Stop revokes the app password it was given.
- **After a merge's reload** the hero is taken back to the screen they were on, told what arrived,
  and Home keeps a card about it until closed.
- **When**: the snapshot is sealed at launch, next to the automatic backup, because `VACUUM INTO`
  cannot run behind the statements a finished session leaves in flight, and only if the history
  moved. The network half runs once the app is up (`stores/sync.ts`, once per process) and from
  Settings. The prompt waits while a session is running: taking a version unmounts the app.
- **Onboarding** offers "Find my hero on my cloud": connect, give the password, and a device with
  no session of its own is shown whose hero it found ("Hautecombe, 16 sessions, last trained 2
  days ago") before anything is merged; "Not mine" takes nothing and is remembered.
- **Three doors, and one line for the rest.** The setup sheet offers the three ways that really
  differ: Nextcloud (browser sign-in), a WebDAV server (address, user, app password, with the
  usual addresses of kDrive, Koofr and Round Sync written under it; the Settings row names the
  provider from the address), and a synced folder (Syncthing or any folder-syncing app; the
  automatic backup's folder is offered first when there is one). One sheet, "Where to keep your
  hero?", opens from the single Settings row "My hero, safe" and also carries the daily copy on the
  phone as its first door; with sync on, the status sheet shows that copy as an extra. Under them, "My cloud is not
  here (Google Drive, Proton, iCloud…)" leads to the two ways that work for those clouds, written
  out: moving once through the backup file, and staying in step through Round Sync. An earlier
  version listed ten services as chips, half of them leading to "not yet".
- Dropbox, OneDrive and Google Drive by their own APIs. Dropbox needs an app registered to this
  project (PKCE, no secret, app folder); Drive needs brand verification and a second signing
  certificate for the F-Droid build. Round Sync covers them through WebDAV meanwhile.
- Merging campaigns, boss fights, quest configs and favourites, and hero content deleted on one
  device coming back from the other (roadmap 4.18, item 4).
- **The two limits of the merge, as of this release** (identical to 2.9.0, and frozen by tests; the version that
  closes them is roadmap 4.18b):
  - A hero quest or movement deleted on one device **comes back** when the device that still has it is merged. A
    deleted **session** never does: it leaves a tombstone, honoured by every merge, and a campaign that has moved on
    past it is the only thing that keeps it.
  - The first copy of a session wins. What changes on a session after the other device copied it (a bonus of the
    oath or of the Triumph, the feeling on the victory screen) stays on the device where it happened. The window is
    small: the bonuses are paid inside the saving of the session, before the victory screen appears, and the
    feeling can only change while that screen is open; the other device can have copied the session in between
    only if a sync uploaded it then (a launch sync, "Sync now", or a prompt answered on the victory screen).
    Two devices can then show different XP for one session, so a different level.
- Joining by scanning a QR code from the other device (the audit's scout: four typed fields
  become one gesture). expo-camera's scanner is Play Services' code scanner and ML Kit, both
  proprietary, which F-Droid refuses; it needs a ZXing-based scanner module of our own.
- An "ignore certificate errors" switch, as Joplin has. It turns the check off for every host; the
  private-authority case it is used for is covered by trusting the hero's own authority (below).

### When it does not connect

The toast after a refusal names the layer (`failureOf`: credentials, storage, server, certificate,
offline), which is one line. **Test the connection** (`diagnoseServer` in `src/cloudSync.ts`,
`ConnectionTest` in the setup and status sheets) asks the server one thing at a time and stops at
the first it refuses: it answers, the account is known (Nextcloud), the `Bati/` folder is there, it
can be listed, a four-byte `bati-diagnostic.part` can be written and removed. Each line carries the
HTTP status and what the server said (Sabre's `<s:message>`), and the result copies as text with the
app version and no address, account or password. A refused listing keeps that message in the error
trail too, so "Send me the details" carries it.

**The hero's own authority is trusted.** The release network security config lists `system` and
`user` trust anchors (`plugins/withAndroidNetworkSecurity.js`, pinned by
`__tests__/android-network-security.test.ts`). Android 7 stopped trusting authorities a hero
installed for any app that does not ask, which left a home server behind a private authority with no
way in. The hero installs it in Android's security settings, which is their act; Bati only talks to
the server they named. What is not offered is Joplin's "ignore TLS errors".
