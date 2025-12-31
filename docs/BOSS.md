# Boss Adventures

A **Boss** is currently an adventure with `kind = "boss"`.

## What makes it a boss?

Right now, “boss” is primarily:

- a different label/badge in the UI
- different wording for the primary call-to-action (e.g. “Fight Boss”)

Under the hood, it is still the same campaign/run system:

- it has multiple steps (`adventure_steps`)
- starting it creates a run (`adventure_runs` + `adventure_run_steps`)
- completing steps advances progress

## Future boss mechanics (optional)

If/when you want deeper boss gameplay, typical extensions could include:

- boss HP / phases tied to completed steps
- special rewards on completion
- unique visuals/animations per phase

Those would likely require extra columns/tables and UI changes on the adventure detail + completion flow.
