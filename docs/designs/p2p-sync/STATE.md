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

## Steps

| Step | Status |
| --- | --- |
| 0. Worktree `../bati-p2p-sync`, `npm ci` | done |
| 1. Spec | done |
| 2. Persona audit, 2 rounds by fresh agents | done. Round 1: 15 fixes. Round 2: 12 fixes and 3 decisions, all applied |
| 3. Frozen vectors, red first | done: `scripts/p2p-vectors.py` (stdlib only), code, names, frames; 34 tests in `__tests__/p2p-{code,names,frames}.test.ts`. Kotlin read-back comes with the module (step 6) |
| 4. Unit tests, then code | to do |
| 5. Node stage `test/node/p2p/` | to do |
| 6. Native module, screens, locales, privacy | to do |
| 7. Emulators, then two phones in release | to do |
| 8. Phase 2 spike | after the merge |
