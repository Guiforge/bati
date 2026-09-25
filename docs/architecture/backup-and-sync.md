---
title: Backups, encryption and device sync
type: technical
status: active
updated: 2026-09-25
related: [README.md, ../planning/roadmap.md, ../legal/privacy.md]
---

# Backups, encryption and device sync

> Four ways a hero's history leaves the running database, and the one key that seals them.

## The four copies

| Copy | Who makes it | Where it goes | Code |
| --- | --- | --- | --- |
| Android's own backup | the system, nightly, and on a phone-to-phone transfer | Google (end-to-end with the screen lock) or Seedvault | `plugins/withAndroidBackupRules.js` |
| Share / save a file | the hero, from Settings | the share sheet, or a folder they pick | `src/backupFiles.ts` |
| Automatic backup | the app, once a day at launch and before migrations | a folder picked once (SAF tree) | `src/autoBackup.ts` |
| Device sync | the app, at launch and on demand | the hero's own Nextcloud, `Bati/` | `src/deviceSync.ts`, `src/cloudSync.ts` |

Every one of them is a `VACUUM INTO` snapshot of the whole database, so a restore of any of them
goes through the same gate: `validateBackup` (db/backup.ts), then `keepDeviceSettings`, then the
swap in `commitRestore`.

**The folder picker does not reach the classic clouds.** Google Drive, OneDrive and Proton never
appear in `ACTION_OPEN_DOCUMENT_TREE`, Dropbox's provider is partial, and Nextcloud's serves a stale
copy of what another device wrote. Automatic backup is for the device itself, or a folder Syncthing
keeps in sync. Classic clouds are reached by `src/cloudSync.ts`.

## Encryption

`src/backupCipher.ts`. One random 256-bit master key seals every snapshot with AES-256-GCM, as
`.batb`. Each file's header carries the master key wrapped twice: by the hero's password
(PBKDF2-HMAC-SHA256, 600,000 iterations, the iteration count written in the slot) and by a
64-hex-digit recovery key shown once. The header is the AAD, so editing a slot fails decryption,
and it ends with a check value that says in one call whether a key this phone holds opens the file.

The primitives are the platform's own `javax.crypto`, behind a local Expo module
(`modules/bati-crypto`). Not a library: react-native-quick-crypto and react-native-libsodium ship
prebuilt binaries F-Droid would have to rebuild, and a pure-JS KDF on Hermes takes tens of
seconds. Tests run the real format against a Node double of the module
(`__tests__/helpers/nodeBatiCrypto.ts`).

**Everything lives in SecureStore, nothing in the database.** A restore therefore cannot turn
encryption off or swap the key. SecureStore is excluded from Android's backup, so a new phone
starts with encryption off and joins by opening any encrypted file with the password: that file's
key and header become the phone's (`adoptKey`).

The fingerprint unlocks no key. It guards the recovery key kept in SecureStore with
`requireAuthentication`, so the hero can see it again; a new fingerprint invalidates that copy,
which costs a view, never data.

## Device sync

- **One file per device**, `bati-<install id>.batb`, written only by that device. No lock, no
  shared file, and nothing deletes another device's file. The install id lives in SecureStore, so
  a restored database never makes two devices share one name.
- **Session uuids are the version vector** (`compareWithPeer`). A superset is "ahead" and offered
  as a hand-off, two partial sets are "diverged" and the hero picks. No device clock is read.
  Taking another version is `runAdopt` in `hooks/useBackup.ts`, the same road as a restore.
- **Encrypted or nothing**: `syncNow` and `writeSyncSnapshot` both refuse with encryption off.
- **When**: the snapshot is sealed at launch, next to the automatic backup, because `VACUUM INTO`
  cannot run behind the statements a finished session leaves in flight. The upload and the
  comparison run once the app is up (`stores/sync.ts`, once per process), and from Settings.
- **An empty or failing listing is an error, never "everything was deleted"**: the Joplin lesson
  (#961, #6864).

## Device-local preferences

`DEVICE_LOCAL_PREFERENCES` in db/backup.ts: `deviceId`, `backupFolderUri`, `lastAutoBackupDay`,
`customAvatarUri`, `crashLog`, `errorLog`. A restore keeps this device's values for them. Add a
key here when it names something that exists only on one phone: a file path, a granted
permission, an identifier.

## What is not there yet

- Dropbox, OneDrive and Google Drive connectors. Dropbox needs an app registered to this project
  (PKCE, no secret, app folder); Drive needs brand verification and a second signing certificate
  for the F-Droid build.
- Row-level merge (roadmap 4.18 phase 4). A divergence is a choice today, not a merge.
