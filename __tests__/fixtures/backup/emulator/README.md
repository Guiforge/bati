# Fixtures captured from emulators

Written once by `test/bench/capture_fixtures.py` on real emulators running real release builds, then
frozen. **Never regenerate.** A diff here is the signal to stop: a hero's old file might not open any more.

| file | made by | secrets (test values) |
|---|---|---|
| f1-v2-2.9.batb | the 2.9 candidate (format 2) | password with accents, 64-hex key, in manifest.json |
| f2-v3.batb | this branch (format 3) | password with accents, twelve words |
| f2-v3-three-segments.batb | this branch | same vault, a database over 2 MiB |
| f3-v3-joined.batb | a second phone that joined F2's vault | same secrets, another install id, both phones' sessions |

Everything here is throwaway test data: the passwords and words protect nothing. Read by
`__tests__/backup-emulator-fixtures.test.ts` and `EmulatorFixturesTest.kt`, which open every file with
its secrets and compare what is inside with the manifest.
