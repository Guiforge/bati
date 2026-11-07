# Device-to-device sync: the spec

Written on 2026-11-07, before the code. Issue [#232](https://github.com/Guiforge/bati/issues/232).

Guillaume's decisions of 07/11:
- The database goes device to device.
- It follows Syncthing.
- It is private throughout: no Nostr profile, no signer.
- The same Wi-Fi comes first; the internet route is Phase 2.

After two persona audit rounds he also decided:
- Nostr ships with Phase 2, not in v1.
- Pairing has a text fallback for those who cannot scan.
- A swap without a backup folder requires a copy saved elsewhere first.

Later on 07/11 he chose the whole feature's shape: both devices open at the same time, never a mailbox or a
background job, and Nostr only as the meeting point for Phase 2. [PLAN.md](PLAN.md) lists every situation, every
setting and every test of both phases; this spec is Phase 1.

Everything stays behind `P2P_SYNC_ENABLED` (`src/p2p/flag.ts`, a literal read of `EXPO_PUBLIC_P2P_SYNC`, like
`src/multiplayer/flag.ts`). Without the flag there is no screen, no listener and no NSD announcement, and the
existing sync accounts work exactly as they do today.

**v1 never leaves the Wi-Fi.** It has no internet destination: no relay, no server, no request beyond the local
network. The three network destinations the app has today stay three.

## 0. The model, borrowed from Syncthing

| Syncthing | Here |
| --- | --- |
| Device ID = hash of the certificate, accepted by hand on both sides | Device ID = SHA-256 of a self-signed certificate, exchanged by QR, pinned on both sides, confirmed on A |
| Mutual TLS over TCP | Mutual TLS over TCP, platform JSSE, TLS 1.3 (1.2 ECDHE-GCM below Android 10) |
| Local discovery, UDP broadcast | Last known address first, then Android NSD (mDNS) with an opaque name rotating every hour |
| Global discovery server, relays | Phase 2 (§7) |
| 128 KiB blocks, SHA-256 each, temp file, atomic rename, resume | Same, for one file |
| Conflict copy, never a silent overwrite | The `-kept-` copy and `mergePeer`, unchanged, plus a copy saved off the device before any swap |

What Syncthing leaks by its own docs, and what we do instead:
- **It puts the device ID in clear on the LAN.** Here the NSD name is an HMAC that rotates every hour.
- **Its certificate is recognisable.** Here the CN is neutral, and the certificates are encrypted under TLS 1.3.

Left out:
- version vectors and index exchange, since there is one file and two peers;
- the folder watcher;
- block reuse between snapshots, and compression: a `.batb` is resealed with a fresh nonce, so nothing repeats or
  compresses.

## 1. The rules, as testable sentences

Each rule has a number that a test reuses. The file is `__tests__/p2p-*.test.ts` unless another is named.

**Link (pairing)**

- **L1.** A link joins two devices of the same hero.
  - It is never a `pairs` row and never a companion.
  - It is never in a backup: it lives in SecureStore (`bati.p2p.link`), so a restore onto another device brings no
    link with it.
- **L2.** At most one link in v1, stored as `{ v: 1, links: [link] }` so a later build can hold more without a new
  format. Pairing a third device replaces the link, after a confirmation that names the device being dropped.
- **L3.** The pairing code carries:
  - the format version;
  - `expiresAt` (10 minutes);
  - a 32-byte one-time token;
  - A's installId, device ID and device name (at most 32 bytes of UTF-8);
  - A's LAN addresses;
  - the route list `[lan]`.

  B reads it from the camera, or from a code typed or pasted into a field inside the app under "Can't scan?".
  It is never read from a link or a shared image, exactly like the multiplayer kind 2.
- **L4.** First connection:
  1. B pins A's device ID from the code before sending anything.
  2. A refuses any token that is expired, already used or unknown.
  3. A shows "Link {name of B}?" with one button. Nothing is pinned until the hero confirms on A. Someone who
     photographed the code and connected first shows up there under a name the hero does not know.
  4. On confirmation A pins B's device ID.
  5. Each side sends 32 fresh random bytes inside the channel. Both store the link secret
     `HKDF-SHA256(rA ‖ rB, salt = idA ‖ idB, info = "bati/p2p/link/v1")`.

  Nothing in the code enters that secret, so someone who saw the code cannot name the NSD service.
- **L4b.** B gets the vault the way a new device gets it today. B's first sync sees A's file as `locked` and asks
  for A's password or recovery words (`joinPeer`, `src/deviceSync.ts:70`). The key never travels in the channel.
- **L5.** A token works once. After a successful pairing, or after 10 minutes, the same code fails with
  `codeExpired`.
- **L6.** An unknown code version shows "Update Bati on the other device". An unknown route is skipped. A code with
  no route this build knows behaves like an unknown version.
- **L7.** "Forget this device":
  - deletes the link and its pinned ID;
  - deletes its counter (`STORE_COUNTERS`) and its verdicts, through `forgetPeer`;
  - deletes the peer's received file.

  The lost-device copy says to change the password, since the other device still holds the vault key.
- **L8.** The device key is a P-256 key in Android Keystore, non-exportable, created on the first pairing.
  - Its self-signed certificate is valid for 100 years. No date in it is ever checked: only its ID counts.
  - A reinstall loses the key, and the hero pairs again.
  - The screen says so when the other device presents an unknown ID (`unknownDevice`, §4).
- **L9.** Pairing needs sync encryption on, as every sync account does (`prepareSyncAtLaunch`,
  `src/deviceSync.ts:401`). With it off, "My other device" goes through the same password step first, before any
  code is shown.

**Discovery**

- **D1.** Discovery runs only while the sync sheet is open, on both devices. Nothing runs in the background, at
  launch, or after the sheet closes. The NSD registration and the listener are closed in the sheet's cleanup.
- **D2.** NSD announces and browses `_bati._tcp`.
  - The instance name is the first 16 bytes, in hex, of `HMAC-SHA256(linkSecret, "bati/p2p/nsd" ‖ hour)`, where
    `hour = floor(unix / 3600)`.
  - Each side browses for the current hour and the hours on either side.
  - TXT records hold nothing.
- **D3.** Connection order:
  1. the addresses where the peer was last reached (kept in the link);
  2. then NSD results, in arrival order.

  The first address that passes the TLS pin wins. An address that fails is not retried in the same session.
- **D4.** Each announcement carries a random instance id, drawn at each sheet opening. A known peer seen with a new
  instance id has restarted: the current connection is dropped and a new one is made.

**Connection**

- **C1.** The listener:
  - is open only while the sheet is open;
  - takes one connection at a time;
  - has a 5 s handshake deadline;
  - reads at most 1 KB before the pin is verified;
  - closes on the first failure.
- **C2.** Mutual TLS with no CA.
  - Each side accepts only the pinned device ID, and on the first exchange only the ID from the code.
  - The lowest version is TLS 1.2, with ECDHE and AES-GCM or ChaCha20 only.
  - The certificate CN is `device`.
- **C3.** Version negotiation:
  - The first byte each side sends inside the channel is the highest protocol version it speaks (`1`).
  - Both use the lower of the two.
  - If that is below what one side still supports, the link closes with `versionMismatch`, shown as "Update Bati
    on the other device".
  - This byte is the only version on the wire: frames carry none.
- **C4.** Keepalive every 10 s. 30 s of silence means the link is dead.
- **C5.** Frames are a 4-byte length plus a 1-byte type. Any frame over 256 KiB, or any file announcement over
  `MAX_SEALED_BYTES`, closes the link.

**Transfer**

- **T1.** Each device keeps an outbox: the file it last "wrote" for the peer, in `Paths.document/p2p/out/`. It is the
  local stand-in for its own file on a server. On connection each side announces its outbox: name, size, global
  SHA-256, and the SHA-256 of each 128 KiB block.
- **T2.** The receiver writes into `p2p/in/<sha256>.part` and requests only the blocks it lacks.
  - It checks every block against the announced hash.
  - A bad block is thrown away and requested again.
  - Three bad blocks close the link.
- **T3.** A `.part` is renamed to `p2p/in/<name>` only when the global SHA-256, recomputed over the bytes on disk,
  matches. A partial file is never listed.
- **T4.** A `.part` is kept 24 h. The next session resumes it if the announced global SHA-256 is unchanged.
  Otherwise, or after 24 h, it is deleted.
- **T5.** The receiver trusts no metadata from the sender:
  - it recomputes the hash itself;
  - it ignores any clock;
  - it reads the counter only from the sealed header (`openBackup`, as today).

**Sync (the `Remote` adapter, `src/p2pSync.ts`)**

- **S1.** `SyncAccount` gains `{ kind: "p2p" }` (one link, L2), and `remoteFor` gets its branch. v1 has one sync
  account at a time. Picking P2P replaces a WebDAV or folder account through the existing disconnect, and the
  reverse is also true.
- **S2.** When `list()` returns:
  - It returns only once the peer's announcement has arrived and its file is received and verified, or the peer
    announced an empty outbox.
  - There is no total deadline, since a large file takes time, but silence ends it (C4) with `interrupted`.
  - Before any peer is connected, it waits at most 30 s, then `notInSight`.

  It returns two entries: the peer file and our own outbox.
  - Both have `modified: 0`, `etag` set to their SHA-256, and `size` set.
  - With `modified: 0` on both, `mustJoin` decides by name alone, identically on both devices.
- **S2b.** A session runs `syncNow` once on connection, then once more on each side when a new file from the peer
  arrives while the sheet is open (at most 3 passes per session).
  - Each side's first pass judges the peer's old outbox, and its `write` sends the new one.
  - The second pass judges that new file.

  So one "Sync now" on both devices converges, and `holdBack` keeps exactly the meaning it has with a server.
- **S3.** `read(name, destination)` copies the verified file from `p2p/in/`. The copy happens after
  `clearPeerScratch`, because `p2p/in/` is not in the scratch.
- **S4.** `write(file, name)` replaces the outbox atomically.
  - If a peer is connected, it sends the file and returns the SHA-256 as the etag, but only once the peer has
    acknowledged it.
  - If no peer is connected, or the acknowledgement does not come within 60 s, it throws `peerGone`, and
    `STORE_UPLOADED` is not set.
- **S5.** A name that is not the pinned peer's `bati-<installId>.batb` is refused at the announcement and never
  written. Neither the `-kept-` name nor a second installId ever comes from the peer.
- **S6.** Before a swap, `keepThisDeviceOnServer` on P2P puts the `-kept-` copy where it lasts:
  - into the automatic backup folder when one is set;
  - otherwise the swap confirmation has one more step, "Save a copy of this device first" (Android "Save as").
    The swap only goes ahead once that save has succeeded. A copy that would live only on the device being
    replaced does not count;
  - the copy also stays in `Paths.document/p2p/kept/` (the last 3), listed in Settings under "Copies kept before a
    swap", with "Save as", "Restore" and "Delete". With none, the list says "No copy kept.";
  - `p2p/in/` is emptied once a received file is read, and a `.part` is deleted after 24 h or when the source sha
    changes, so `p2p/` never holds more than the outbox, one incoming file and 3 kept copies;
  - if any of this fails, the swap does not happen.

  `write` is never called with a `-kept-` name (S5).
- **S7.** `syncNow` on a P2P account outside an open session returns `notNow` and does nothing. Launch sync
  (`prepareSyncAtLaunch`) tries P2P quietly for 30 s, listener and NSD open, nothing shown; with no peer it returns
  `notNow` in silence.
- **S7b.** Nothing syncs on a device while a session, an outing or a timer runs on it: no launch try, and "Sync now"
  says "Finish your session first." The existing prompts already wait (`components/SyncPrompt.tsx:275`).
- **S8.** The "Protect your hero" card counts a P2P sync in the last 7 days exactly like a device sync
  (data-safety.md). A P2P sync counts as successful only when the peer acknowledged our file (S4). `peerGone`
  and `interrupted` never count.

**Privacy**

- **P1.** Nothing leaves the local network. The LAN sees only the hourly HMAC name, an address, a port and a TLS
  channel. The listener and the announcement exist only while the sheet is open.
- **P2.** `privacy.md` gets a section, "Syncing two of your devices", in both languages:
  - EN: "When you sync two of your devices, they find each other on your Wi-Fi and talk directly, encrypted. Other
    devices on the same Wi-Fi can see that two devices are syncing, not who you are or what they send. Nothing goes
    to the internet, and it only happens while the sync screen is open on both."
  - FR: "Quand tu synchronises deux de tes appareils, ils se trouvent sur ton Wi-Fi et se parlent directement,
    chiffré. Les autres appareils du même Wi-Fi peuvent voir que deux appareils se synchronisent, pas qui tu es ni
    ce qu'ils s'envoient. Rien ne part sur internet, et seulement pendant que l'écran de synchro est ouvert sur les
    deux."

  This section ships in the commit that turns the flag on for a release, together with the Play and F-Droid listing
  lines on sync and Play's data safety. Before that, the build does not do it, so the listings must not say it.

**User**

- **U1.** Pairing is three screens, once: "Show code" on A, "Scan" on B, and "Syncing, keep both screens open".
  Every sync after that is one tap on each device: Settings › Sync › "Sync now" opens the sync sheet, and it starts
  by itself once the other device has it open too. No scan again.
- **U2.** While the sheet is open the screen stays on (`expo-keep-awake`, already a dependency).
- **U3.** Every way a session ends maps to one of the messages in §4, each with an action. A technical layer is
  never shown.
- **U4.** The end of a sync says what came across, with the same strings as a device sync ("Up to date", "Merged",
  "Took its version").

## 2. The bytes

**Pairing code v1.** Binary, written as base64url text with `toBase64Url`, like the multiplayer QR
(`src/multiplayer/link.ts`):

`version 1 ‖ expiresAt u32 (unix s) ‖ token 32 ‖ installId 16 (the UUID's bytes) ‖ deviceId 32 ‖ name len u8 ‖ UTF-8 ≤ 32 ‖ routes u8 count, then per route: type u8 (1 = lan) ‖ len u8 ‖ data`

The lan data is `port u16 ‖ n × (family u8 ‖ 4 or 16 bytes)`.

The text fallback shows the same string in groups of 4 characters, each followed by one check character, groups
separated by spaces. The check character is the base64url character of `SHA-256(group index u8 ‖ the 4 characters)[0]
mod 64`, so a typo names its group (`codeTypo`). The field strips whitespace only before decoding: `-` is a
base64url character. The QR carries the string without check characters. Frozen in `code-v1.json` (`grouped`).

**Frames** (inside TLS): `len u32 ‖ type u8 ‖ body`, where `len` counts the type byte and the body, big-endian like
every integer here.

| Type | Frame | Body |
| --- | --- | --- |
| 1 | hello | instanceId 16, name len u8 ‖ UTF-8 ≤ 32 (sent after the version byte of C3) |
| 2 | announce | name, size u64, sha 32, blockCount u32, block shas |
| 3 | want | block indexes |
| 4 | block | index u32, bytes |
| 5 | ack | sha 32 |
| 6 | ping | none |
| 7 | bye | reason u8 |

Frozen vectors in `__tests__/fixtures/p2p/`:
- `code-v1.json`: codes, their text form, and refused codes (expired, unknown version, unknown route, oversize name);
- `names-v1.json`: the link secret from given `rA`/`rB`, and the NSD name over 3 hours;
- `frames-v1.json`: each frame type, and the block list of a 300 KiB file.

They are written by an independent encoder (`scripts/p2p-vectors.py`) and read back by a Kotlin test
(`P2pVectorTest.kt`) and by JS.

## 3. What is stored

| What | Where | In a backup? |
| --- | --- | --- |
| Device key | Android Keystore, alias `bati.p2p.device` | no |
| Link: peer ID, peer installId, secret, name, last addresses | SecureStore `bati.p2p.link` | no |
| Outbox, received files, `.part`, kept copies | `Paths.document/p2p/` | no (outside the three backed-up files) |

No migration.

## 4. Screens and exact copy

Settings › Sync gains a third choice beside the server and the folder: **"My other device"**. Before any link it
reads "My other device: sync with your other phone or tablet, on the same Wi-Fi." The word "device" goes into
`docs/product/glossary.md` with its one-line explanation.

- **Choosing it with a server or folder account on:** "This replaces sync with {server}. Your history stays on this
  device. From now on, sync happens when Bati is open on both devices." with "Replace" and "Keep {server}" as a text
  link.
- **Linking while already linked (L2):** "This replaces the link with {old name}." with "Replace". The same installId
  after a reinstall only asks "Link {name} again?".

The sheet is the one the current sync uses (`SyncSetupSheet`, `SyncStatusSheet`). No new component except the code
view, which is the multiplayer `QrCode`.

**Pairing, once.**

- **A, show code:** "Open Bati on your other device, on the same Wi-Fi, and scan this code."
  - The QR has the accessible name "Pairing code, works once for 10 minutes".
  - Under it: "This code works once, for 10 minutes."
  - Then a text link, "Can't scan? Show the code as text". It shows the code in groups of 4 characters, readable by
    TalkBack, with "Copy".
- **A, waiting:** the code stays until it is used. At 10 minutes it is replaced by "This code expired." and "Show a
  new code".
- **B, scan:** the multiplayer camera, titled "Scan the code on your other device".
  - Under it is the text link "Can't scan? Type the code". It opens a field: "Type or paste the code shown on your
    other device."
  - If the camera is refused: "Bati needs the camera to read the code. Nothing is recorded." with "Allow the camera"
    and the same "Type the code" link.
- **A, confirm:** "Link {name of B} ({last 4 characters of its device ID})?" with "Link" (the only button) and "Not this one" as a text link.
- **Both, linked:** "Linked with {name}." Then the first sync starts by itself.

**Settings › Sync, once linked.** The row reads "{name}, last synced {when}". Under it are "Sync now" and "Forget
this device".

**Each sync.**
- Settings › Sync › "Sync now" opens the sheet: "Open Bati on {name} too. Sync starts by itself."
- Connected: "Syncing with {name}. Keep both screens open." A progress line, "{x} of {y} MB", and "Cancel". Cancel
  closes the link, the `.part` is kept (T4) and nothing is written.
- Done: the result line of U4.

**How a session ends, and what the hero reads.**

| Cause | Message | Action |
| --- | --- | --- |
| No peer after 30 s | `notInSight`: "{name} isn't in sight. Open Bati on it, on the same Wi-Fi." | "Try again" |
| Peer announced on NSD, TCP unreachable | `blocked`: "This Wi-Fi keeps devices from reaching each other (a guest network, a VPN). Try another network, or your phone's hotspot." | "Try again" |
| Expired, used or unknown token (L5) | `codeExpired`: "This code doesn't work anymore. Show a new one on the other device." When the clock is the cause (L3): "Check the date and time on both devices." | "Show a new code" |
| A check character does not match (text code) | `codeTypo`: "There's a typo in group {n}. Check it and try again." | none, the field stays filled |
| No network at all (airplane mode, Wi-Fi off) | `offline`: "This device isn't on a network. Turn on Wi-Fi and try again." | "Try again" |
| Peer presents an unknown ID (L8, reinstall) | `unknownDevice`: "{name} doesn't know this device anymore. It was reinstalled, or it forgot this one. Link them again." | "Link again" |
| `versionMismatch` (C3, L6) | "Update Bati on the other device, then try again." | none |
| Silence (C4), `peerGone` (S4), 3 bad blocks (T2), cancel on the other side | `interrupted`: "The sync stopped halfway. Nothing was lost. Try again." | "Try again" |
| Receiver's storage cannot hold the file (checked before the first block, and on a write failure) | `noSpace`: "Not enough space on this device to receive your history. Free some space and try again." | "Try again" |

`notNow` (S7) is never shown: it is what a launch sync returns, silently.

**Forget.** "Forget this device". The confirmation reads "{name} won't sync with this one anymore. If you lost it,
change your password too."

**After 14 days without a sync.** The existing sync card on Home says once: "Last synced with {name} 14 days ago.
Open Bati on both to catch up." No red, no counter, and it does not come back once dismissed until a sync succeeds.

**Swap without a backup folder.** One more step in the confirmation: "Save a copy of this device first, in case you
want it back." The only button is "Save a copy". The swap button appears only after the save has succeeded.

**States Inès asked for.**
- The sheet is one column.
- At 130 % and 200 % on 360×640, and on a landscape tablet, the primary button stays visible without scrolling, and
  the QR shrinks to 60 % of the width before any text is cut.
- With reduced motion there is no animation on the progress line.
- Each button has an accessible name.
- The QR keeps a 4-module quiet zone on the dark background (`uqr`, `border: 0` plus padding).

All copy goes in `locales/*.json`, all six languages, under the rules of `docs/product/writing.md` (no em dash,
`tu` in French).

## 5. Permissions and privacy

- `INTERNET` is already present. NSD needs no permission. `CHANGE_WIFI_MULTICAST_STATE` is added only if a phone test
  shows that discovery fails without the multicast lock, with its justification written in
  `__tests__/android-permissions.test.ts`.
- The sockets are in Kotlin (`modules/bati-p2p`), which `noJsNetwork.grit` cannot see. The module's header says
  so, and says it only ever opens a LAN listener and LAN connections. `__tests__/p2p-native-surface.test.ts` reads
  the Kotlin source and fails on any `URL(`, `HttpURLConnection` or host name.
- The privacy text is in P2. The count of network destinations in the roadmap and `privacy.md:6` does not change.

## 6. Fini quand

- Every rule above has a test that fails before its code.
- Every Phase 1 row of [PLAN.md](PLAN.md) §2 (tables A, B and D) has the test it names, and the device passes D1 to
  D4 and D6 are written down.
- Node stage: `test/node/p2p/`, with two harness devices over Node `tls` and `net`, and toxiproxy. The scenarios:
  - random convergence over a replayable seed;
  - a reset at 40 % that resumes;
  - a corrupted block;
  - a stranger with no pinned certificate;
  - a code with a swapped ID;
  - TLS 1.1 refused;
  - a silent connection cut at 30 s;
  - a 4 GB length;
  - a foreign name;
  - two vaults that give the same decision on both sides;
  - a counter rollback.
- Privacy test: every byte the double puts on the LAN is recorded. It holds no installId, no name and no device ID
  outside TLS.
- Two emulators, then two phones in release:
  - normal Wi-Fi, guest Wi-Fi and a VPN on;
  - Maestro asserts on B the number of sessions added on A;
  - forget, then the old code refused.
- With the flag off: `rg` finds no reachable call, and the Settings test sees no third choice.
- From the first audit round:
  - someone holding only the code cannot find the NSD name (L4);
  - `list()` does not return before the peer's file is received and verified (S2);
  - pairing with encryption off goes through the password step first (L9);
  - `write` is never called with a `-kept-` name (S5, S6);
  - every cause in the §4 table shows its message, in a UI test;
  - a phone pass at 130 % and 200 %, with TalkBack (pairing by text code included), the camera refused, and a
    landscape tablet;
  - guest Wi-Fi with client isolation shows `blocked`;
  - LineageOS without Google and a tablet are in the device pass, and NSD is tried with and without the multicast
    lock;
  - TLS 1.2 on an Android 9 emulator, with ECDHE-GCM chosen;
  - APK size before and after, written in the report;
  - `privacy.md`, the listings and Play's data safety ship with the release that turns the flag on.
- From the second audit round:
  - one "Sync now" on both devices converges: each sees the other's newest session (S2b);
  - a vault left behind (`oldKey`) with `modified: 0` on both sides still converges, never a standstill. If the test
    shows a standstill, S2 sends the sender's outbox time for this comparison only;
  - with no backup folder, a swap without a successful "Save a copy" is refused (S6), and the last 3 kept copies stay
    in `p2p/kept/`;
  - nothing is pinned on A before "Link {name}?" is confirmed (L4);
  - `{name}` comes from the code and from `hello`, and is shown in every message;
  - S8 counts a sync only after an ack;
  - `Paths.document/p2p/` is outside Google backup and device transfer (`dataExtractionRules`), checked on a phone;
  - the QR on its dark background is read by 3 phones, including at 60 % width at 200 %;
  - the text code typed with spaces or line breaks decodes, and a mistyped one says `codeExpired`, never a crash.

## 7. Out of this lot

- **Phase 2, the internet route, with Nostr as the meeting point (decided 07/11).**
  - Shape decided later the same day: both devices open, Nostr carries only a sealed note with the LAN and global
    IPv6 addresses, then the same TLS channel connects directly. No mailbox, no background job. A failure says
    `unreachable` and points to the same Wi-Fi or a hotspot. Tor or Wi-Fi Direct are decided on the D5 numbers.
    Situations, settings and tests: [PLAN.md](PLAN.md) §1 to §3, table C.
  - The audited draft for Nostr discovery, kept for that phase:
    - kind 21059, ephemeral;
    - a fresh secp256k1 key per event, Schnorr per BIP-340;
    - one `#x` tag, `HMAC(linkSecret, "bati/p2p/rdv" ‖ hour)` truncated to 16 bytes;
    - `created_at` rounded to the minute;
    - content `nonce 12 ‖ AES-GCM ‖ tag 16` under an HKDF of the link secret (info `bati/p2p/offer/v1`), with AAD = tag ‖ kind ‖
      created_at and a plaintext padded to 256 bytes;
    - 3 constant relays and an off-by-default switch, "Find each other through the internet", asked once after
      linking;
    - `src/nostrRelay.ts`, the only allowed module in `noJsNetwork.grit`, shared with multiplayer lot 1 bis;
    - a 4th network destination, with its privacy text and listings.

    Nostr only helps devices find each other. Whether they then connect depends on the networks (IPv6 reachable or
    not), and the copy must never promise more.
- A Nostr profile, an npub, a signer (NIP-46 or NIP-55): dropped on 07/11, against P1.
- More than two devices, background sync, a foreground service.
- P2P and a server account at the same time.
