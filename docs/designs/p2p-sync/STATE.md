# Device-to-device sync: where it stands

Issue [#232](https://github.com/Guiforge/bati/issues/232). Branch `feat/p2p-sync`, cut from `main` at
`84dd55749`. Spec: [SPEC.md](SPEC.md).

## Decisions

- **07/11.** The database goes device to device. The design follows Syncthing. It stays fully private: no Nostr
  profile and no signer. The same Wi-Fi comes first.
- **07/11.** TLS over TCP, like Syncthing, on the platform's stack. QUIC is a Phase 2 candidate: on a LAN it brings
  nothing, and on Android every library is either LGPL, prebuilt, or a native `.so`.
- **07/11, after two audit rounds:**
  - Nostr moves to Phase 2;
  - pairing gets a text fallback, behind A's confirmation;
  - a swap with no backup folder requires a copy saved off the device.
- **07/11, the whole feature ([PLAN.md](PLAN.md)):** both devices open at the same time, no mailbox, no background
  job. Phase 2 uses Nostr only as the meeting point, then a direct connection over IPv6. Wi-Fi Direct and Tor wait
  for the D5 numbers. #232 is covered for sync, partly for backup, and not for the profile and signer, on purpose.
- **07/11, after the audit of the full plan:** the internet question ships only at 70 % success in D5, else Tor
  first. One link in v1, linking another replaces it. The copy says "link", never "pair" (`pairs` are multiplayer
  companions). The internet route has its own flag.

## Steps

| Step | Status |
| --- | --- |
| 0. Worktree `../bati-p2p-sync`, `npm ci` | done |
| 1. Spec | done |
| 2. Persona audit, 2 rounds by fresh agents | done. Round 1: 15 fixes. Round 2: 12 fixes and 3 decisions, all applied |
| 3. Frozen vectors, red first | done: `scripts/p2p-vectors.py` (stdlib only), code, names, frames; 34 tests in `__tests__/p2p-{code,names,frames}.test.ts`. Kotlin read-back comes with the module (step 6) |
| 3b. Full plan: every situation, setting and test ([PLAN.md](PLAN.md)), SPEC §4, §6, §7 aligned | done |
| 3c. Persona audit of the updated SPEC and PLAN, one round by a fresh agent | done: passes with fixes, all applied. A10 was wording (`holdBack` already listens first), now held by test S1b. Text code gets a check character per group (`codeTypo`); vectors to regenerate in step 4 |
| 4. Unit tests, then code | to do |
| 5. Node stage `test/node/p2p/` | to do |
| 6. Native module, screens, locales, privacy | to do |
| 7. Emulators, then two phones in release | to do |
| 8. Phase 2: Nostr meeting, IPv6 listener, PLAN.md table C | after the merge |
| 9. D5 measured apart, then Tor or Wi-Fi Direct decided | after Phase 2 |
| 10. Reply on #232, drafted and shown to Guillaume first | to do |
