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
| Sync with "My other device" | Settings › Sync, third choice beside server and folder | off | Pairing flow. If a server or folder account exists, a confirmation first: "This replaces sync with {server}. Your history stays on this device. From now on, sync happens when Bati is open on both devices." | UI U1, U2 |
| Find each other through the internet (Phase 2) | Asked once after linking, then a switch on the device row | off | Allows the Nostr meeting and the IPv6 listener. Each device has its own switch, and a meeting needs both on. The question: "Also sync when you're not on the same Wi-Fi?", then "Bati then uses public Nostr relays to find your other device. They can't read anything, but they see this device's IP address for an hour." with "Yes" and "Not now", and "Learn what they see" opening the privacy section | UI U6, unit N8 |
| Wait for Wi-Fi (existing `syncWifiOnly`) | Settings › Sync, unchanged | as today | On mobile data the internet route is not tried. A hotspot counts as the phone's own mobile data. | unit S10, UI U9 |
| Sync now | the device row | | Opens the session sheet | UI U7 |
| Forget this device | the device row | | Confirmation, then the link, the counters and `p2p/` are removed, and the Keystore key stays | unit S12, node X9 |
| Encryption password (existing) | Settings › Security | | Pairing requires it on (rule L9). A change on one device follows the existing `needsSecret` road on the other. | unit S13, node X12 |

**Not settings, on purpose:**
- the peer's name (it comes from the device, and the hero renames the phone in Android);
- the relay list (constants, phase 4 maybe);
- more than one linked device (one link in v1; linking another replaces it, rule L2). A phone, a tablet and a new phone at once is a visible limit, said in the help line of "My other device";
- P2P and a server account at the same time.

## 2. Every situation, what the hero sees, and the test that holds it

Test levels:
- **unit** and **UI**: jest and RNTL;
- **node**: the node stage, `test/node/p2p/`, with two harness devices over Node `tls`/`net`, toxiproxy and a relay double on `ws`;
- **kt**: Kotlin unit test;
- **D**: device pass, numbered in §3.

IDs: situations are A1 to E6, tests P, S, N, F, U, X, K and D are this page's own. Rules of SPEC.md are always written "rule S7", so the two never collide.

All copy goes in `locales/*.json`, six languages, following `docs/product/writing.md`.

### A. Pairing (once, side by side)

| # | Situation | What the hero sees | Test |
| --- | --- | --- | --- |
| A1 | Normal: A shows the QR, B scans, A confirms | "Link {name}?", then "Linked with {name}." Then the internet question, then the first sync | UI U3, node X1, D1 |
| A2 | No camera, or camera refused | "Can't scan? Type the code", with the text code in groups of 4 and "Copy" | UI U4, unit (done), D2 TalkBack |
| A3 | Code typed with spaces, line breaks or a typo | Spaces and line breaks decode. Each group of the text form carries a check character, so a typo says `codeTypo`: "There's a typo in group {n}. Check it and try again." Never a crash, never `codeExpired` | unit (done), unit P5 (one typo per group), UI U4 |
| A4 | Code expired (10 min) or already used | "This code expired." with "Show a new code" (A). `codeExpired` (B). | unit P1, node X2 |
| A5 | Someone else scans the code (a photo, a screen behind) | A sees "Link {their name} ({last 4 of its ID})?" and taps "Not this one". Nothing is pinned. | unit P2, node X3 |
| A5b | Two devices with the same name ("Pixel 7") | The last 4 characters of the device ID follow the name in the confirmation and in Settings | UI U3 |
| A6 | Code carries a swapped device ID (forged) | TLS fails, then `codeExpired` | node X4 |
| A7 | The two devices are on different Wi-Fis at pairing | `notInSight` or `blocked` after 30 s. Pairing is LAN-only by design, so a code sent from far away never pairs. | node X5, D3 |
| A8 | Guest Wi-Fi with client isolation | `blocked`, which suggests the hotspot | D3 |
| A9 | Encryption off on A or B | The existing password step first (rule L9) | UI U5 |
| A10 | B is a new phone (onboarding done, maybe a session already) | Exactly as a new device joining a server today: B listens before it sends (`holdBack`, first contact, `deviceSync.ts:780`), then the existing prompt asks to take {name}'s history or merge. Nothing on B is dropped without that answer | unit S1, S1b (B with 1 session keeps it after a merge), node X6, D1 |
| A11 | Both have a history, one vault | The existing merge prompt | unit S2, node X7 |
| A12 | Both have a history, different passwords | B is asked A's password (`needsSecret`) and never makes a second vault | unit S13, node X12 |
| A13 | One side has a newer app (format) | "Update Bati on the other device, then try again." (`newerVersion`, rule C3) | unit P3, node X8 |
| A14 | App killed or screen off during pairing | Nothing pinned, the token is dead, start again | unit P4, D4 |
| A15 | Already linked to another device, or to the same one after a reinstall | Rule L2: the new link replaces the old one, after "This replaces the link with {old name}." Same installId: "Link {name} again?" only | UI U2, U2b |
| A16 | Android 7 to 9 (TLS 1.2) | Works, ECDHE-GCM chosen | node X10, D6 (API 28 emulator) |

### B. Each sync, same Wi-Fi

| # | Situation | What the hero sees | Test |
| --- | --- | --- | --- |
| B1 | Both open, launch sync | Nothing, then the result line (rule U4) | unit S3, node X1, D1 |
| B2 | Only one open, launch sync | Nothing at all (`notNow`, rule S7) | unit S4 |
| B3 | "Sync now", the other is closed | "Open Bati on {name} too. Sync starts by itself." After 30 s, `notInSight` with "Try again" | UI U7, node X5 |
| B4 | Both tap "Sync now" together | One session, converges in one tap each (rule S2b) | node X11 |
| B5 | Both edited since last time | The existing merge, through the prompt | unit S2, node X7 |
| B6 | Hero leaves the app, or the screen goes off mid-transfer | `interrupted`: "Nothing was lost. Try again." The `.part` is kept, and the next session resumes. The screen is kept awake while the sheet is open. | node X13, D4 |
| B7 | Wi-Fi drops, or the phone moves to 4G mid-transfer | `interrupted`, resumes later | node X13 (toxiproxy reset at 40 %) |
| B8 | Cancel on either side | The sheet closes, nothing written, `.part` kept | UI U8, node X14 |
| B9 | A corrupted block | Asked again. Three bad ones give `interrupted`. | node X15 |
| B10 | A session, an outing (GPS, screen off) or a timer is running on one device | Nothing syncs on that device until it ends: no launch sync, and "Sync now" says "Finish your session first." The prompts already wait (`SyncPrompt.tsx:275`) | unit S5, S5b (outing running) |
| B11 | Receiver storage full | `noSpace`, new: "Not enough space on this device to receive your history. Free some space and try again." | unit S6, node X16 |
| B12 | History over `MAX_SEALED_BYTES` (256 MiB) | The existing `unreadable` text on the receiving side. Never sent: the sender checks the size first. | unit S7 |
| B13 | Big but allowed (photos, 100 MB) | "{x} of {y} MB" progress, no timeout while blocks flow | node X17 |
| B14 | One device restored from an old backup file | The existing counter rule (counters in SecureStore survive a restore), with no rollback accepted | unit S8, node X18 |
| B15 | A replayed or older file from the peer | Refused silently (`replayed`) | node X18 |
| B16 | The other device was reinstalled, or forgot this one | `unknownDevice`: "{name} doesn't know this device anymore. It was reinstalled, or it forgot this one. Link them again." | node X19, X19b (forgot on one side), D4 |
| B17 | Battery saver or Doze on one device | Works while open. A closed app does nothing, as promised. | D4 |
| B18 | VPN on one device | Works, or shows `blocked`. Never a crash or a cause outside the table; the outcome per VPN app is written down | D3 |
| B19 | Router blocks mDNS, devices can reach each other | Found through the last known address. If that fails and the internet switch is on, found through Nostr. If it fails and the switch is off, `notInSight` with a hint to turn it on. | node X20, D3 |
| B20 | Swap ("take its version") without a backup folder | "Save a copy of this device first" is the only button (rule S6) | unit S9, UI U10 |
| B21 | Kill during the final rename or the merge | The old history is intact, and the next launch is consistent (atomic rename, existing merge guard) | node X21 |
| B22 | Clocks months apart | The data is not affected: counters decide | node X22 |
| B22b | A clock wrong by more than an hour, or the code refused by the clock | NSD names miss (they rotate by the hour), the last known address still connects. A code from a clock over a minute behind or ten ahead is refused with "Check the date and time on both devices." | unit (done), node X22b |
| B23 | Airplane mode, or Wi-Fi off | `offline`: "This device isn't on a network. Turn on Wi-Fi and try again." | UI U14 |
| B24 | Files left in `p2p/` | `in/` is deleted once read, a `.part` after 24 h or when the source changed, kept copies keep the last 3 and each has "Delete" in "Copies kept before a swap" (empty state: "No copy kept.") | unit S14, UI U15 |

### C. Over the internet (switch on)

| # | Situation | What the hero sees | Test |
| --- | --- | --- | --- |
| C1 | Different networks, IPv6 on both, reachable | "Last synced ... over the internet" | node X23, D5 |
| C2 | Carrier NAT, IPv4 only | `unreachable`, new: "Found {name}, but couldn't connect over the internet. Try on the same Wi-Fi, or your phone's hotspot." | node X24, D5 (counted against the threshold below) |
| C3 | Switch off on the other device | `notInSight` plus "Check 'Find each other through the internet' is on on both." | UI U11, node X25 |
| C4 | All relays down | `notInSight`, and the hero never reads "relay" | node X26 |
| C5 | 2 of 3 relays down, or one drops or reorders events | Works | node X26 |
| C6 | `syncWifiOnly` on and on 4G | `wifiOnly`, new: "You're on mobile data, and sync waits for Wi-Fi." with "Change in Settings" | unit S10, UI U9 |
| C7 | Meeting note replayed, old, forged, oversize, wrong hour | Ignored, and it never connects anywhere | unit N1 to N6, node X27 |
| C8 | Hour boundary during the meeting | Found (hour ±1) | unit N1 |
| C9 | A stranger at the published address (port scan) | The listener only runs while the sheet is open or during the launch sync, and drops anyone without the pinned certificate in under 5 s and 1 KB | node X28, kt K2 |
| C10 | Switch turned off mid-session | The current transfer ends, and no new note is published | unit N7 |
| C11 | Privacy | The note holds no installId, name, device ID or readable address. Key and tag change every hour, notes have a constant size. The relay still sees the IP of each device that talks to it, and the internet question says so | node X29 (capture) |

### E. Long term

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
- **P1 to P5, pairing:** expiry, single use, nothing pinned before confirm, newer version, kill mid-pairing, one typo per group of the text code names that group.
- **S1 to S14, `p2pSync.ts` and `deviceSync` additions:**
  - `list` holds our own file at `modified: 0`;
  - a new device listens first and is asked (S1), and one with a session keeps it through a merge (S1b);
  - same decision on both sides;
  - `notNow` is silent;
  - prompts are held in a session, and nothing syncs while an outing or timer runs (S5b);
  - `noSpace`;
  - the size cap is checked before sending;
  - a restore cannot roll back;
  - a swap without a saved copy is refused;
  - `wifiOnly`;
  - `write` throws without an ack;
  - forget removes the link, the counters and `p2p/`;
  - `needsSecret` across two passwords;
  - `p2p/` cleanup: `in/` after read, `.part` after 24 h, kept copies capped at 3 (S14).
- **N1 to N8, `nostrRelay.ts`** against a `ws` double:
  - the hour boundary ±1;
  - replayed, old, forged and oversize notes;
  - no key reused;
  - constant length;
  - switch off sends 0 bytes;
  - turning the switch off stops publishing.
- **F1 to F3:** flag off means no reachable network call; the extraction rules exclude `p2p/`; the internet flag is its own literal and a test fails if it is on while `privacy.md` (EN and FR) does not name the Nostr relays.
- **Frozen vectors:** code, names and frames (done), plus `meeting-v1.json`.
- **`p2p-native-surface.test.ts`:** the Kotlin source opens no URL and no host name.

**UI (RNTL), U1 to U15:**
1. the third choice is hidden with the flag off;
2. the replace-server confirmation (with the both-open line), the replace-link confirmation, and "Link {name} again?" after a reinstall (U2b);
3. QR, confirm with the last 4 of the ID, and linked;
4. the text code and camera refused;
5. the password step first;
6. the internet question defaults off;
7. "Sync now" sheet states: waiting, progress, done;
8. cancel;
9. `wifiOnly`;
10. "Save a copy" first;
11. the both-switches hint;
12. the 14-day card, once;
13. forget;
14. `offline`;
15. "Copies kept before a swap": a copy, "Delete", and the empty state.

Plus one test per error cause, each showing its exact message and action (`notInSight`, `blocked`, `codeExpired`, `codeTypo`, `unknownDevice`, `versionMismatch`, `interrupted`, `unreachable`, `noSpace`, `wifiOnly`, `offline`).

**Node stage, X1 to X29, plus X19b and X22b** (the scenarios cited in §2):
- a replayable seed, `SYNC_RUNS=20`;
- every fault through toxiproxy or the doubles;
- X29 records every byte on the LAN and to the relay.

**Kotlin:**
- K1 `P2pVectorTest.kt` reads the code, frames and meeting vectors;
- K2: the listener drops an unauthenticated peer within 5 s and 1 KB;
- K3: the TrustManager refuses anything but the pinned ID.

**Device passes (release builds):**
1. **D1:** two emulators, with Maestro adding a session on A and asserting the session count on B (state, not navigation). Fresh B adopts, then E3.
2. **D2:** 130 % and 200 % on 360×640, in the longest language too (on the text code, `blocked` and the replace confirmations), TalkBack with pairing by text code (time it takes, written down), reduced motion, a landscape tablet.
3. **D3:** two phones, normal Wi-Fi, guest Wi-Fi, a VPN on, and an mDNS-blocking router (B19). LineageOS without Google.
4. **D4:** interruptions: screen off, app switch, kill mid-pairing and mid-transfer, and a real kill during the final rename (the node stage only simulates it), battery saver, the other device reinstalled.
5. **D5:** apart: home Wi-Fi to 4G, 4G to 4G, two different boxes. The success and `unreachable` counts go in STATE.md. The internet question only ships at 70 % success or more (Guillaume, 07/11); below that, Tor comes first.
6. **D6:** an Android 9 emulator (TLS 1.2), Google backup and device transfer excluding `p2p/` (and what happens to the SecureStore counters on a device transfer), an API 36 release build for the local network permission, and APK size before and after.

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
