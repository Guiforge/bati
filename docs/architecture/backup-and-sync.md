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
at a time in the whole app, not per screen: they all stage into the same file. Once the swap is
done the provider reloads the JS runtime (`reloadAppAsync` from `expo`): every cache, store and the
database singleton go with the old runtime, as on a cold start, and the hero never has to close
the app. The old "close and reopen" notice stays as the way out if the host cannot reload.

**Android's backup carries three files and nothing else**: `bati.v<N>.db` and its journal. The
same directory holds decrypted imports, another device's history opened for comparison, the
pre-restore `.bak`; naming the three keeps all of those out of Google's copy and under the 25 MB
quota past which Android backs up nothing at all. The `.gpx` files in `gps-tracks/` stay out too:
they are exports, rebuilt from `gps_points` whenever a recap shares one.

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
  over 256 MB is not. A file goes up as `….batb.part` and a `MOVE` puts it in place, so a cut-off
  upload never leaves a truncated file under a name devices read (a server without `MOVE` gets
  the direct `PUT`).
- **One vault.** A device connecting to a server that already holds sealed files asks for the
  password of the most recently written one and joins it as primary, instead of inventing a key of
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
  village name, avatar, level, equipment, oath). Derived caches are ignored, and so are favourites
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
  automatic backup's folder is offered first when there is one). Under them, "My cloud is not
  here (Google Drive, Proton, iCloud…)" leads to the two ways that work for those clouds, written
  out: moving once through the backup file, and staying in step through Round Sync. An earlier
  version listed ten services as chips, half of them leading to "not yet".
- Dropbox, OneDrive and Google Drive by their own APIs. Dropbox needs an app registered to this
  project (PKCE, no secret, app folder); Drive needs brand verification and a second signing
  certificate for the F-Droid build. Round Sync covers them through WebDAV meanwhile.
- Merging campaigns, boss fights, quest configs and favourites, and hero content deleted on one
  device coming back from the other (roadmap 4.18, item 4).
- Joining by scanning a QR code from the other device (the audit's scout: four typed fields
  become one gesture). expo-camera's scanner is Play Services' code scanner and ML Kit, both
  proprietary, which F-Droid refuses; it needs a ZXing-based scanner module of our own.
- Certificates from the hero's own authority. The release build trusts system authorities only;
  a user CA is a security decision to take on purpose, per host, not a default. Such a server gets
  "Android does not trust this server's certificate", and Round Sync is the way around.
