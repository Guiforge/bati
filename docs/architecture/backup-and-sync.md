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
| Share / save a file | the hero, from Settings | the share sheet, or a folder they pick | `src/backupFiles.ts` |
| Automatic backup | the app, once a day at launch and before migrations | a folder picked once (SAF tree) | `src/autoBackup.ts` |
| Device sync | the app, at launch and on demand | the hero's own WebDAV server, `Bati/` | `src/deviceSync.ts`, `src/cloudSync.ts` |

Every one of them is a `VACUUM INTO` snapshot of the whole database, so a restore of any of them
goes through one road (`restoreStaged` in `hooks/useBackup.ts`): decrypt if sealed, `validateBackup`,
`keepDeviceSettings`, the copies no swap may go ahead without, then `commitRestore`. The picker,
onboarding and taking another device's version are three doors to that road, and one import runs
at a time in the whole app, not per screen: they all stage into the same file.

**Android's backup carries three files and nothing else**: `bati.v<N>.db` and its journal. The
same directory holds decrypted imports, another device's history opened for comparison, the
pre-restore `.bak`; naming the three keeps all of those out of Google's copy and under the 25 MB
quota past which Android backs up nothing at all.

**The folder picker does not reach the classic clouds.** Google Drive, OneDrive and Proton never
appear in `ACTION_OPEN_DOCUMENT_TREE`, Dropbox's provider is partial, and Nextcloud's serves a stale
copy of what another device wrote. Automatic backup is for the device itself, or a folder Syncthing
keeps in sync. Clouds are reached by `src/cloudSync.ts`.

## Encryption

`src/backupCipher.ts`. One random 256-bit master key seals every snapshot with AES-256-GCM, as
`.batb`. Each file's header carries the master key wrapped twice: by the hero's password
(PBKDF2-HMAC-SHA256 over the UTF-8 of its NFC form, 600,000 iterations written in the slot) and by
a 64-hex-digit recovery key shown once. The header is the AAD, it ends with a check value that says
in one call whether a key opens the file, and a header outside what this version writes (an
unknown slot, iterations outside 100,000 to 10,000,000) is not a backup at all.

The primitives are the platform's own `javax.crypto`, behind a local Expo module
(`modules/bati-crypto`), PBKDF2 included, computed over bytes rather than through a `char[]`.
Decryption writes beside the target and renames only once the tag verified. Tests run the real
format against a Node double of the module (`__tests__/helpers/nodeBatiCrypto.ts`).

**The key lives in SecureStore; the wish lives in the database.** SecureStore is excluded from
Android's backup, so a restore can never change the key. The `backupEncryption` preference does
travel: a database Android restored onto a new phone reads as **locked**, and nothing is written,
in plaintext or otherwise, until the password is given again.

**Opening is not joining.** A file opened with its password hands back `join`: as primary, its key
becomes this phone's (what a device joining another does); otherwise it is only remembered in the
keyring for reading. An import asks the hero before the primary case; a file someone else handed
over must never silently make every later backup open with their secret.

**A new password is a new key**, with a new recovery key shown straight after. The old key moves
to the keyring so this phone still opens what it sealed; other devices ask for the new password
once. Re-wrapping the same key would have left future files open to anyone holding the old
password and one old file.

The fingerprint unlocks no key. It guards the recovery key kept in SecureStore with
`requireAuthentication`, so the hero can see it again (`USE_BIOMETRIC` and `USE_FINGERPRINT`, from
androidx.biometric, are justified in `__tests__/android-permissions.test.ts` for that alone).

## Device sync

- **Transport**: WebDAV. Nextcloud signs in through the browser (Login Flow v2, a revocable app
  password; the page and poll endpoint must be on the server or on https, and the account keeps the
  address the hero typed). Any other server, behind presets (kDrive, Koofr, Round Sync for rclone),
  takes an address, a user and an app password, and is remembered only once it created and listed
  the folder. Plain HTTP is refused except to this phone, which is also all that
  `plugins/withAndroidNetworkSecurity.js` lets through in a release build.
- **One file per device**, `bati-<random install id>.batb`, written only by that device. No lock,
  no shared file, nothing deletes another device's file. At most 16 peers are read, and a file
  over 256 MB is not.
- **One vault.** A device connecting to a server that already holds sealed files asks for the
  password of the most recently written one and joins it as primary, instead of inventing a key of
  its own (a file left by a phone reset long ago must not win); a device later seen under another
  password (`locked`) prompts the same question. Walking away from that question, or from turning
  encryption on for a server waiting on it, disconnects.
- **What each side lacks** (`compareWithPeer`, on real SQLite): sessions by uuid, deletions by the
  `deleted_sessions` tombstones (0064), and the hero's own content (hero exercises and quests,
  village name, avatar, level, equipment, oath, favourites, quest configs). Derived caches are
  ignored. News only on the other side is a hand-off (`ahead`); news on both is `diverged`, and
  taking the other version first uploads this device's as `bati-<id>-kept-<time>.batb`, which no
  device reads as a peer. A refusal is remembered by the other device's content fingerprint, not by
  its etag, and an unchanged history is not re-uploaded unless the key changed (a vault joined, a
  new password), or the other devices would be left with a file they cannot open.
- **Listen before speaking.** Peers are judged before this device uploads. It sends nothing while
  one is `ahead` (that device already holds everything this one has), nor, on its first contact
  with a server, while one has news for it: a tablet fresh from onboarding has a village name
  newer than the phone's, and uploading first made a near-empty device look like news to all.
- **Downloads only what can change an answer.** A `level`, `behind` or `unreadable` verdict is
  remembered against the file's etag and this device's state (history, key, and the migrations
  this build knows, so an app update reads a too-new peer again). An idle launch downloads nothing.
- **Said, not swallowed.** One question at a time; an `unreadable` device is announced once, as
  "update Bati", since a newer version on it is the usual reason.
- **When**: the snapshot is sealed at launch, next to the automatic backup, because `VACUUM INTO`
  cannot run behind the statements a finished session leaves in flight, and only if the history
  moved. The network half runs once the app is up (`stores/sync.ts`, once per process) and from
  Settings. The prompt waits while a session is running: taking a version unmounts the app.
- **Onboarding** offers "Find my hero on my cloud": connect, give the password, and the prompt
  offers the hand-off to the empty new device.

## Interrupted work

A launch puts back a database a restore parked as `.bak` and never replaced (`db/client.ts`, before
SQLite opens), and deletes the plaintext a killed import or comparison left in the database
directory, once per process (`DatabaseProvider`). A plaintext snapshot left by a killed
`VACUUM INTO` is deleted before the next one, which would otherwise refuse to run. The master key
and its header are one SecureStore item: written in two, a crash between them sealed files that
nothing could open.

## Device-local preferences

A restore keeps this device's `DEVICE_LOCAL_PREFERENCES` (db/backup.ts: id, backup folder, crash
log, custom avatar path, update check, the one-per-device greetings, and whether this phone seals
its backups) and drops `savedSession`
entirely, an interrupted session on either side. Add a key there when it names something that
exists only on one phone: a file path, a granted permission, an identifier.

## What is not there yet

- Dropbox, OneDrive and Google Drive by their own APIs. Dropbox needs an app registered to this
  project (PKCE, no secret, app folder); Drive needs brand verification and a second signing
  certificate for the F-Droid build. Round Sync covers them through WebDAV meanwhile.
- Row-level merge (roadmap 4.18 phase 4). A divergence is a choice today, with a copy kept.
- A hand-off without a restart: taking a version still goes through the restore screen.
