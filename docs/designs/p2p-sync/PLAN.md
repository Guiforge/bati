# Device-to-device sync: the plan to a complete feature

Written on 2026-11-07. Guillaume's choice of that day: the hero accepts one limit, **both devices open at the same
time**, and gets in exchange a direct sync with nothing stored on any server. Nostr is only the meeting point.
[SPEC.md](SPEC.md) holds the rules and the bytes; this page holds every situation, every setting and every test.

## Why this shape: what was compared

**Syncthing does not sync two devices that are never online together.** Its relays only bridge a live connection,
and nothing is kept in transit. Its answer is a third device that is always on (a NAS, a VPS). On Android,
Syncthing-Fork runs a permanent foreground service; the official app was discontinued at the end of 2024.

| Option | Works when the devices never overlap | Privacy | Setup for the hero | F-Droid | Cost | Main failure |
| --- | --- | --- | --- | --- | --- | --- |
| Live LAN TLS (SPEC.md) | no | best: never leaves the Wi-Fi | one QR | good | none | both screens must be open |
| **Mailbox: Blossom blobs + Nostr pointer** | **yes** | good: sealed, rotating keys; servers see IP, time, size | **none beyond the QR** | good: HTTPS + keys, `@noble` already in | cheap, HTTPS only | free servers cap size (nostr.build: 20 MiB free) and promise no retention |
| WebDAV / Nextcloud (exists) | yes | good: sealed | a server account | good | none | the hero needs storage |
| Syncthing folder mode (exists) | only if Syncthing runs on both | good | a second app | good | a foreground service | overlap still needed |
| Tor onion | no, unless a device is always on | strongest: no IP seen | none | good: tor-android from source, arm64 aligned to 16 KB | about 7 to 8 MB per ABI, 20 to 60 s bootstrap | slow, battery, a poor fit for a 15 min job |
| WebRTC | no | medium: STUN sees IPs | none | poor: F-Droid only has prebuilt libwebrtc | heavy | needs overlap, fails behind some mobile NATs without TURN |
| Email (Delta Chat style) | yes | medium | a mail account | good | small | attachment caps around 20 MB |

**Decision (07/11):** live only, like Syncthing: same Wi-Fi first, then the internet with Nostr as the meeting
point. The store-and-forward mailbox and the background job are in "Maybe later".

What this covers in #232:

| What #232 asks | Covered? | Why |
| --- | --- | --- |
| Sync settings and records | yes | |
| No central server | yes | |
| Backup | partly | A second device holds a full copy. A one-phone hero keeps the backup folder or WebDAV. |
| Nostr profile, data as events, signer | no, on purpose | Relays cap at 128 KB to 1 MB, events stay public, and a lost key loses everything. |

So the PR says "Part of #232". A reply to the issue is drafted, then posted only when Guillaume says so.

**Wi-Fi Direct: later, maybe.**
- On Android 7 to 12 it needs the precise location permission.
- The vendor's dialog differs from phone to phone.
- Some phones drop their Wi-Fi while it is on.

It only helps when there is no shared network, and "your phone's hotspot" already covers that. It is decided on the numbers from device pass D5.

**Existing behaviour this plan relies on**, read on 07/11:
- peer verdicts `level | behind | unreadable | oldKey | newerVersion | replayed` (`deviceSync.ts:109`);
- a joining device that `needsSecret` learns the other's password and never invents a second vault (`:1117`);
- `syncWifiOnly` (`:200`);
- the health record for "failing for days" (`STORE_HEALTH`);
- prompts held during a session (`components/SyncPrompt.tsx:76,275`);
- `MAX_SEALED_BYTES` gives `unreadable` (`:908`).

P2P reuses all of them as they are.

## 1. Settings the hero can touch

| Setting | Where | Default | Effect | Test |
| --- | --- | --- | --- | --- |
| Sync with "My other device" | Settings › Sync, third choice beside server and folder | off | Pairing flow. If a server or folder account exists, a confirmation first: "This replaces sync with {server}. Your history stays on this device." | UI U1, U2 |
| Find each other through the internet | Asked once after linking, then a switch on the device row | off | Allows the Nostr meeting and the IPv6 listener. Each device has its own switch, and a meeting needs both on. | UI U6, unit N8 |
| Wait for Wi-Fi (existing `syncWifiOnly`) | Settings › Sync, unchanged | as today | On mobile data the internet route is not tried. A hotspot counts as the phone's own mobile data. | unit S10, UI U9 |
| Sync now | the device row | | Opens the session sheet | UI U7 |
| Forget this device | the device row | | Confirmation, then the link, the counters and `p2p/` are removed, and the Keystore key stays | unit S12, node X9 |
| Encryption password (existing) | Settings › Security | | Pairing requires it on (L9). A change on one device follows the existing `needsSecret` road on the other. | unit S13, node X12 |

**Not settings, on purpose:**
- the peer's name (it comes from the device, and the hero renames the phone in Android);
- the relay list (constants, phase 4 maybe);
- more than one linked device (one link in v1, with "Forget {name} first" for a third);
- P2P and a server account at the same time.

## 2. Every situation, what the hero sees, and the test that holds it

Test levels:
- **unit** and **UI**: jest and RNTL;
- **node**: the node stage, `test/node/p2p/`, with two harness devices over Node `tls`/`net`, toxiproxy and a relay double on `ws`;
- **kt**: Kotlin unit test;
- **D**: device pass, numbered in §3.

All copy goes in `locales/*.json`, six languages, following `docs/product/writing.md`.

### A. Pairing (once, side by side)

| # | Situation | What the hero sees | Test |
| --- | --- | --- | --- |
| A1 | Normal: A shows the QR, B scans, A confirms | "Link {name}?", then "Linked with {name}." Then the internet question, then the first sync | UI U3, node X1, D1 |
| A2 | No camera, or camera refused | "Can't scan? Type the code", with the text code in groups of 4 and "Copy" | UI U4, unit (done), D2 TalkBack |
| A3 | Code typed with spaces, line breaks or a typo | Spaces and line breaks decode. A typo gives `codeExpired`, never a crash. | unit (done), UI U4 |
| A4 | Code expired (10 min) or already used | "This code expired." with "Show a new code" (A). `codeExpired` (B). | unit P1, node X2 |
| A5 | Someone else scans the code (a photo, a screen behind) | A sees "Link {their name}?" and taps "Not this one". Nothing is pinned. | unit P2, node X3 |
| A6 | Code carries a swapped device ID (forged) | TLS fails, then `codeExpired` | node X4 |
| A7 | The two devices are on different Wi-Fis at pairing | `notInSight` or `blocked` after 30 s. Pairing is LAN-only by design, so a code sent from far away never pairs. | node X5, D3 |
| A8 | Guest Wi-Fi with client isolation | `blocked`, which suggests the hotspot | D3 |
| A9 | Encryption off on A or B | The existing password step first (L9) | UI U5 |
| A10 | B is a fresh install (new phone, empty history) | After linking, B takes A's history through the restore road, with no merge question | unit S1, node X6, D1 |
| A11 | Both have a history, one vault | The existing merge prompt | unit S2, node X7 |
| A12 | Both have a history, different passwords | B is asked A's password (`needsSecret`) and never makes a second vault | unit S13, node X12 |
| A13 | One side has a newer app (format) | "Update Bati on the other device, then try again." (`newerVersion`, C3) | unit P3, node X8 |
| A14 | App killed or screen off during pairing | Nothing pinned, the token is dead, start again | unit P4, D4 |
| A15 | Already linked to another device | "Forget {name} first, then pair this one." | UI U2 |
| A16 | Android 7 to 9 (TLS 1.2) | Works, ECDHE-GCM chosen | node X10, D6 (API 28 emulator) |

### B. Each sync, same Wi-Fi

| # | Situation | What the hero sees | Test |
| --- | --- | --- | --- |
| B1 | Both open, launch sync | Nothing, then the result line (U4) | unit S3, node X1, D1 |
| B2 | Only one open, launch sync | Nothing at all (`notNow`, S7) | unit S4 |
| B3 | "Sync now", the other is closed | "Open Bati on {name} too. Sync starts by itself." After 30 s, `notInSight` with "Try again" | UI U7, node X5 |
| B4 | Both tap "Sync now" together | One session, converges in one tap each (S2b) | node X11 |
| B5 | Both edited since last time | The existing merge, through the prompt | unit S2, node X7 |
| B6 | Hero leaves the app, or the screen goes off mid-transfer | `interrupted`: "Nothing was lost. Try again." The `.part` is kept, and the next session resumes. The screen is kept awake while the sheet is open. | node X13, D4 |
| B7 | Wi-Fi drops, or the phone moves to 4G mid-transfer | `interrupted`, resumes later | node X13 (toxiproxy reset at 40 %) |
| B8 | Cancel on either side | The sheet closes, nothing written, `.part` kept | UI U8, node X14 |
| B9 | A corrupted block | Asked again. Three bad ones give `interrupted`. | node X15 |
| B10 | A session is running on one device | The prompts wait until it ends (`SyncPrompt.tsx:275`), and the transfer may still happen | unit S5 |
| B11 | Receiver storage full | `noSpace`, new: "Not enough space on this device to receive your history. Free some space and try again." | unit S6, node X16 |
| B12 | History over `MAX_SEALED_BYTES` (256 MiB) | The existing `unreadable` text on the receiving side. Never sent: the sender checks the size first. | unit S7 |
| B13 | Big but allowed (photos, 100 MB) | "{x} of {y} MB" progress, no timeout while blocks flow | node X17 |
| B14 | One device restored from an old backup file | The existing counter rule (counters in SecureStore survive a restore), with no rollback accepted | unit S8, node X18 |
| B15 | A replayed or older file from the peer | Refused silently (`replayed`) | node X18 |
| B16 | The other device was reinstalled | `unknownDevice`: "Pair them again." | node X19, D4 |
| B17 | Battery saver or Doze on one device | Works while open. A closed app does nothing, as promised. | D4 |
| B18 | VPN on one device | `blocked` or works, and the outcome is written down | D3 |
| B19 | Router blocks mDNS, devices can reach each other | Found through the last known address. If that fails and the internet switch is on, found through Nostr. If it fails and the switch is off, `notInSight` with a hint to turn it on. | node X20, D3 |
| B20 | Swap ("take its version") without a backup folder | "Save a copy of this device first" is the only button (S6) | unit S9, UI U10 |
| B21 | Kill during the final rename or the merge | The old history is intact, and the next launch is consistent (atomic rename, existing merge guard) | node X21 |
| B22 | Clocks months apart | No effect: counters decide, and the code accepts 60 s skew | unit (done), node X22 |

### C. Over the internet (switch on)

| # | Situation | What the hero sees | Test |
| --- | --- | --- | --- |
| C1 | Different networks, IPv6 on both, reachable | "Last synced ... over the internet" | node X23, D5 |
| C2 | Carrier NAT, IPv4 only | `unreachable`, new: "Found {name}, but couldn't connect over the internet. Try on the same Wi-Fi, or your phone's hotspot." | node X24, D5 (counted) |
| C3 | Switch off on the other device | `notInSight` plus "Check 'Find each other through the internet' is on on both." | UI U11, node X25 |
| C4 | All relays down | `notInSight`, and the hero never reads "relay" | node X26 |
| C5 | 2 of 3 relays down, or one drops or reorders events | Works | node X26 |
| C6 | `syncWifiOnly` on and on 4G | `wifiOnly`, new: "You're on mobile data, and sync waits for Wi-Fi." with "Change in Settings" | unit S10, UI U9 |
| C7 | Meeting note replayed, old, forged, oversize, wrong hour | Ignored, and it never connects anywhere | unit N1 to N6, node X27 |
| C8 | Hour boundary during the meeting | Found (hour ±1) | unit N1 |
| C9 | A stranger at the published address (port scan) | The listener only runs while the sheet is open or during the launch sync, and drops anyone without the pinned certificate in under 5 s and 1 KB | node X28, kt K2 |
| C10 | Switch turned off mid-session | The current transfer ends, and no new note is published | unit N7 |
| C11 | Privacy | The relay gets no installId, no name, no device ID and no readable address. Key and tag change every hour, and notes have a constant size. | node X29 (capture) |

### D. Long term

| # | Situation | What the hero sees | Test |
| --- | --- | --- | --- |
| E1 | 14 days without a sync | The existing sync card, once: "Last synced with {name} 14 days ago. Open Bati on both to catch up." No red, no guilt. | UI U12 |
| E2 | Phone lost | "Forget this device", with "If you lost it, change your password too." | UI U13 |
| E3 | Hero moves to a new phone and gives the old one away | Pair, sync (A10), then forget on the new one. Forgetting wipes `p2p/` and the link. | node X9, D1 |
| E4 | App update on one side only, same format | Works. The protocol version is checked before the file format. | node X8 |
| E5 | Flag off (F-Droid and Play alike until turned on) | No third choice, no network, no listener | UI U1, unit F1 |
| E6 | Google backup or device transfer | `p2p/` and the link are not carried (`dataExtractionRules`) | unit F2, D6 |

## 3. Tests, by level

**Unit (jest).** Each one is red before its code.
- **P1 to P4, pairing:** expiry, single use, nothing pinned before confirm, newer version, kill mid-pairing.
- **S1 to S13, `p2pSync.ts` and `deviceSync` additions:**
  - `list` holds our own file at `modified: 0`;
  - a fresh device adopts;
  - same decision on both sides;
  - `notNow` is silent;
  - prompts are held in a session;
  - `noSpace`;
  - the size cap is checked before sending;
  - a restore cannot roll back;
  - a swap without a saved copy is refused;
  - `wifiOnly`;
  - `write` throws without an ack;
  - forget removes the link, the counters and `p2p/`;
  - `needsSecret` across two passwords.
- **N1 to N8, `nostrRelay.ts`** against a `ws` double:
  - the hour boundary ±1;
  - replayed, old, forged and oversize notes;
  - no key reused;
  - constant length;
  - switch off sends 0 bytes;
  - turning the switch off stops publishing.
- **F1, F2:** flag off means no reachable network call; the extraction rules exclude `p2p/`.
- **Frozen vectors:** code, names and frames (done), plus `meeting-v1.json`.
- **`p2p-native-surface.test.ts`:** the Kotlin source opens no URL and no host name.

**UI (RNTL), U1 to U13:**
1. the third choice is hidden with the flag off;
2. the replace-server confirmation, and "Forget {name} first";
3. QR, confirm and linked;
4. the text code and camera refused;
5. the password step first;
6. the internet question defaults off;
7. "Sync now" sheet states: waiting, progress, done;
8. cancel;
9. `wifiOnly`;
10. "Save a copy" first;
11. the both-switches hint;
12. the 14-day card, once;
13. forget.

Plus one test per error cause, each showing its exact message and action (`notInSight`, `blocked`, `codeExpired`, `unknownDevice`, `versionMismatch`, `interrupted`, `unreachable`, `noSpace`, `wifiOnly`).

**Node stage, X1 to X29** (the scenarios cited in §2):
- a replayable seed, `SYNC_RUNS=20`;
- every fault through toxiproxy or the doubles;
- X29 records every byte on the LAN and to the relay.

**Kotlin:**
- K1 `P2pVectorTest.kt` reads the code, frames and meeting vectors;
- K2: the listener drops an unauthenticated peer within 5 s and 1 KB;
- K3: the TrustManager refuses anything but the pinned ID.

**Device passes (release builds):**
1. **D1:** two emulators, with Maestro adding a session on A and asserting the session count on B (state, not navigation). Fresh B adopts, then E3.
2. **D2:** 130 % and 200 % on 360×640, TalkBack with pairing by text code, reduced motion, a landscape tablet.
3. **D3:** two phones, normal Wi-Fi, guest Wi-Fi, a VPN on, and an mDNS-blocking router (B19). LineageOS without Google.
4. **D4:** interruptions: screen off, app switch, kill mid-pairing and mid-transfer, battery saver, the other device reinstalled.
5. **D5:** apart: home Wi-Fi to 4G, 4G to 4G, two different boxes. The success and `unreachable` counts go in STATE.md.
6. **D6:** an Android 9 emulator (TLS 1.2), Google backup and device transfer excluding `p2p/`, and APK size before and after.

## 4. Steps

1. **Docs.**
   - Rewrite PLAN.md to this plan: comparison kept, mailbox and background job in "maybe later", Wi-Fi Direct noted.
   - Update SPEC.md:
     - §4 gets the settings table, the internet question, the new causes (`unreachable`, `noSpace`, `wifiOnly`), "over the internet" and the 14-day card;
     - §5 gets the IPv6 listener;
     - §6 gets this situation table.
   - Commit.
2. **Audit.** `audit-personas-bati` on the updated SPEC, one round by a fresh agent. Guillaume decides the red items.
3. **Phase 1, Wi-Fi.** In order:
   - `p2pSync.ts` with S tests;
   - the `deviceSync` wiring;
   - the Kotlin module with K tests;
   - the screens and locales with U tests;
   - node X1 to X22, X28;
   - D1 to D4 and D6.
4. **Phase 2, internet meeting.** In order:
   - `meeting-v1.json`;
   - `nostrRelay.ts` with N tests;
   - the IPv6 listener;
   - the question, the switch and the new causes;
   - node X23 to X29;
   - the privacy texts (`privacy.md` EN and FR, listings, Play data safety, roadmap destination count) in the commit that turns the flag on.
5. **Issue #232 reply draft**, shown to Guillaume and posted only on his word.
6. **D5 measured.** Guillaume then decides on Tor (about 7 to 8 MB per ABI, 20 to 60 s to connect) or Wi-Fi Direct, with the numbers.

## 5. Verification

- `npm test` and `nvm exec 24 npm test`, `npx tsc --noEmit`, `npx biome check`, `npm run deadcode`, `npm run licenses:check`.
- Node stage locally (podman, toxiproxy), `SYNC_RUNS=20`.
- `lintRelease`, `android-permissions.test.ts`, APK size.
- D1 to D6 in release.
- Flags off: no network, no screen.

## Maybe later

- **Mailbox (Blossom blobs + a Nostr pointer), with a background job.** The only way to sync two devices that are
  never open together without a server of the hero's. Dropped on 07/11: free servers cap sizes (nostr.build: 20 MiB
  free) and promise no retention, each change re-sends the whole file, and the background job overturns the rule at
  `src/deviceSync.ts:73`. A hero who needs that today has WebDAV, Nextcloud or a Syncthing folder.
- **Tor for the internet route**, if D5 shows too many `unreachable`: about 7 to 8 MB per ABI, 20 to 60 s to connect.
- **Wi-Fi Direct**, if D3 and D5 show many `blocked` with no shared network: precise location on Android 7 to 12, and
  a vendor dialog.
- **QUIC hole punching:** a native library (quiche from source), 16 KB pages, F-Droid build.
