---
title: Audit, backup and device sync journeys
type: design
status: active
updated: 2026-09-26
related: [../audit-protocol.md, ../../architecture/backup-and-sync.md, ../../planning/roadmap.md]
---

# Audit: backup, encryption and device sync, 2026-09-26

> Branch `feat/encrypted-sync`, 31 shots taken by hand on the emulator (the Maestro audit flows do
> not reach these sheets), two journeys: an existing hero in Settings, and a fresh tablet finding
> its hero from onboarding. Two personas for this audit, not the usual five, because the question
> was who can use it at all: **Claire** (non-technical, afraid of losing two years) and **Karim**
> (self-hosts Nextcloud and Syncthing, reads privacy policies). The scout looked at Signal,
> WhatsApp, Aegis, 1Password, Obsidian, Joplin and Syncthing. Claims were checked against the
> shots, the copy and the code before being kept.

**Can Claire move her hero to a tablet without help today? No.** She stops at "Where to sync":
none of the chips is a cloud she knows. With a friend's help, she stops again at the password
sheet (which password?), and even the right one landed her back on the first onboarding screen.

**Would Karim use it with his setup? Only through Nextcloud with a public certificate.** His LAN
box on http or with his own CA is refused or misreported, and Syncthing is not a transport.

## Where each finding stands (same day)

| Finding | Status |
|---|---|
| B1 onboarding after a merge | Fixed (`302d2e03`) |
| B2 silent stop | Fixed: a lost sync is detected whatever removed it and said on Home; walking away from a join pauses; the unexplained stop's cause is still unknown, and the next one leaves a `sync.lost` trail (`83c670be`) |
| B3 which password | Fixed: copy, "Use this password", forgot hint (`5910cd48`) |
| B4 entry by service name | Fixed: first question by service, hand-off written out (`8ab81d5a`) |
| B5 network calls count | Fixed (`302d2e03`) |
| B6 home server | Partly: certificate errors named, copy names 127.0.0.1 and localhost; a user CA stays a deliberate decision, not a default |
| F1 busy state | Fixed (`5910cd48`) |
| F2 reload lands elsewhere | Fixed: back to the route, Home card until closed, merge log in the sheet (`83c670be`) |
| F3 locked alert | Fixed: when that device wrote, the join words (`5910cd48`) |
| F4 recovery key | Fixed: says where it is, copy with a one-minute clipboard (`83c670be`) |
| F5, F8 copy | Fixed (`5910cd48`) |
| F6 sync state | Fixed: sync sheet (`83c670be`) |
| F7 failures by layer | Fixed (`83c670be`) |
| F9 app password on Stop | Fixed: said, and revoked on Nextcloud (`83c670be`) |
| Polish: Wi-Fi only, "this device", folder shown, off-and-stop label, recovery stakes | Fixed (`83c670be`, `5910cd48`) |
| Scout 2 "found your hero" | Fixed (`8ab81d5a`) |
| Scout 1 scan to join | Not done: needs a ZXing scanner module, expo-camera's is ML Kit, which F-Droid refuses |
| Scout 3, 4, 7 | Done through the sheet, the Home card and pause-not-disconnect |
| Scout 5, 6, 8 | Not done: password check-ins, recovery kit PDF, vault words |
| Syncthing | Done: folder transport (`c5c641b7`) |

## Blockers

| # | Who | Finding | Outcome |
|---|---|---|---|
| B1 | both | A fresh tablet that found its hero from onboarding came back on the first onboarding screen: the merge brought 16 sessions but not `hasFinishedOnboarding`. The next obvious tap starts a new hero. | **Bug, fixed**: the merge carries the flag, one way only (test in `db-peer-merge.test.ts`). Verified by setting it by hand: Home shows the hero. Recapture shot 24 after the fix. |
| B2 | both | Sync was found "Off" with nobody touching it, and nothing says when or why. Every key `disconnectSync` deletes was gone. Cause not found: the merge-and-reload path was checked and keeps the account. Also, by design, walking away from the join question disconnects. | **Redesign**: never drop the account silently. Walking away pauses ("Waiting for your password") instead of disconnecting; any stop the hero did not ask for leaves a dated reason on Home until acknowledged. Trace every disconnect's caller until the cause is found. |
| B3 | Claire | The join sheet asks for "the password of the backups your other device sends". One screen after typing her cloud password, she types it again, gets "That does not open this backup", and has no way forward. | **Fix (copy)**: say where the password was born ("the one you chose in Bati on your other device, under Encrypt my backups; not your cloud's"), and under a wrong entry say where the recovery key is. |
| B4 | Claire | Every door is named for infrastructure: Nextcloud, kDrive, Koofr, Round Sync, Other WebDAV; Google and Proton only appear inside the Round Sync text, iCloud nowhere. "Find my hero on my cloud" promised her cloud and asks for a server. | **Redesign**: first question "Where is Bati on your other device?", by the names she knows; services with no WebDAV route to the file hand-off (Share my backup → I already have a backup) with the steps written out. See the scout's QR pairing below. |
| B5 | Karim | The map note, shown above the sync rows, said the app makes "two network calls" while the policy lists three destinations. A reader who checks stops trusting every other claim. | **Bug, fixed** in all four languages. |
| B6 | Karim | A home server is unreachable: plain http on the LAN is refused (by design), a certificate from his own CA is ignored (no user trust anchor in the release network config), and the TLS failure is reported as "did not answer as a WebDAV server". "Except for a server on this phone" is only `localhost` and `127.0.0.1`. | **Fix**: a certificate error of its own, "127.0.0.1 or localhost" in the copy; user CAs as an opt-in is a security decision to take on purpose, not by default. |

## Friction

| # | Who | Finding | Outcome |
|---|---|---|---|
| F1 | Claire | After "Open" on the password sheet nothing moves: no busy state, the old error stays; a join that throws closes the sheet silently. | Fix |
| F2 | both | The merge reload drops the hero on Home (they were in Settings), through a "Building your village…" frame that reads as a reset, and the only receipt is a toast that fades. Karim wants to know what was replaced, and that a kept copy exists. | Fix: return to the route; keep the notice until tapped; a merge log in the sync sheet |
| F3 | both | "Another device uses another password" names neither device nor password; the CTA "Open" replaces this device's key, which only the onboarding copy says. | Fix (copy): name the file and its date, "Use this password", one line on what changes |
| F4 | both | On a device that joined, the encryption sheet says "This phone" and silently lacks "Show the recovery key"; where it exists the key has no copy action. | Fix |
| F5 | Claire | "Change the password" explains keys, not consequences ("your phone will ask for it once"). | Fix (copy) |
| F6 | both | Sync state lives in a native alert: server address as the row value, an absolute timestamp, "Stop" as loud as "Sync now", no list of devices. | Redesign: a sync sheet with "On · 2 min ago", one line per device (last wrote, state), the folder, Sync now / Stop |
| F7 | Karim | Every failure after setup says "could not reach your server": a revoked app password, a full quota, a certificate change and a merge error read the same. | Fix: carry the error kind (offline, credentials, HTTP n, storage full, certificate, unreadable file) |
| F8 | Claire | The http refusal says what is refused, not what to do next (ui-checklist: errors say the next step). | Fix (copy) |
| F9 | Karim | "Stop" leaves the app password valid on the server, and does not say so. | Fix: say it; for Nextcloud, revoke it on Stop |

## Polish

- Turning encryption off also stops sync, but it is the last sentence and the button says "Turn off".
- The recovery key screen says what the key does, not what is lost without it.
- The sheet never says where files go (`<url>/Bati/`, one file per device).
- No Wi-Fi-only switch; the whole history goes up when it changed (GPS: about 73 MB a year for a regular walker).
- "This phone" on a tablet, in several strings.

## The scout: mechanics worth taking

1. **Scan to join** (1Password setup code, Pixel transfer): the phone shows a QR, behind a
   fingerprint, carrying the account and the vault key; the tablet scans it from "Find my hero".
   Four things typed by hand become one gesture. M.
2. **Say what was found before taking it** (Obsidian): "Found: Aldric, level 3, 16 sessions, last
   trained Tuesday. [This is my hero]". `compareWithPeer` already reads the other database. S.
3. **Sync you can see** (Obsidian's check, Syncthing's "last seen"): "2 min ago" as the row value,
   a device list. S.
4. **A loud banner when protection lapses** (Aegis): sync or backup stopped or failing for N days
   shows on Home. Answers B2. S.
5. **Password check-ins** (Signal PIN reminders), skippable, spaced. S.
6. **A recovery kit you keep** (1Password Emergency Kit): key as text and QR, server address, a line
   to write the password. M.
7. **Paused, not disconnected** (Joplin's persistent "needs password"). Answers B2. S.
8. **The same short code on both screens** (Signal transfer): three dark-fantasy words naming the
   vault, so the hero sees both devices joined the same one. S.

## Syncthing

Not a transport today: the automatic backup can write its daily sealed file into a folder Syncthing
replicates, which is a backup, not sync (nothing reads the other devices' files). Making it sync
reuses everything above the transport:

- **The folder contract already fits.** One sealed file per device, `bati-<id>.batb`, written only
  by its device, nothing deleted: Syncthing never sees two writers on one name, so no
  `.sync-conflict-` file, and one would not match `PEER_FILE` anyway. Its own temporary files
  (`.syncthing.*.tmp`) do not match either.
- **Access goes through the folder picker (SAF)**, as the automatic backup does. Syncthing-Fork
  (the maintained Android app, on F-Droid) reads the same files by path. The picker refuses the
  storage root, `Download` and `Android/data`, so the folder is a subfolder such as
  `Syncthing/Bati`.
- **What changes**: the upload must stage as `.syncthing.bati-<id>.batb.tmp` and rename (Syncthing
  skips that prefix; a `.part` would be synced as noise); SAF rename is missing on some providers.
  There is no etag, only a modification time, and no server clock: the vault tie-break reads the
  server's dates today and would need a timestamp inside the sealed header instead. Bati cannot
  know whether Syncthing has finished, so "last synced" becomes "last seen from each device".
- **Effort**: a `Remote` with list/read/write over a SAF tree beside the WebDAV one (the same
  seam the Dropbox plan needs), the staging rename, the header timestamp, and a third door in
  the setup sheet. M. Suggest Syncthing's Simple or Trash Can versioning in the help: an off-device
  history for free.
