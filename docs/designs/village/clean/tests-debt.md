# Test debt, CLEAN track (04/11/2026)

Full run under Node 24.22.2 (`jest --coverage=false`), after the cleanup that removed 137 files and the mask passes on the building sprites.

## Settled

- `past-session-sheet`, "another day unfolds the seven days": the test matched the month names `October|September` in the day chips, so it went red once the real date reached November. Cause: it read the real clock. Fix: the test pins its clock to 20 October 2026, like its neighbours.
- `iso-dev-screen`, "image and pattern nodes at tiers 1 and 12": 112 images at tier 12 became 111 depending on the calendar day, because `useMarcheurs` draws the villagers' day from `Date.now()` and the local day. It was green only on the days the count was measured (reproduced with `TZ=UTC` and `TZ=America/Los_Angeles`, where it was still 3 November at midnight CET). It was not the cleanup: the same 111 shows at 81770a6d, the commit that wrote the 112. Fix: the test pins `Date.now` to 3 November 2026, the assertion is unchanged.
- `fdroid-scanignore`: green, it needs an installed `node_modules` in the checkout.

## Left

Nothing red in the suite. Watch: any other test whose figures come from `useMarcheurs` or from a month name will drift the same way; pin the clock when one does.
