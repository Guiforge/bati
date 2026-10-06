---
category: Gauges
---
# InkGauge

The one inked gauge: 10 dp tall, `$bgDark` track, 1.5 px `$borderStrong` frame, the figure beside it in Noto Sans tabular. Boss HP uses a braise fill (with an optional fainter damage `trail`); the hero's level uses `fill="$resourceGold"` on `track="$gold800"` with a gold figure.

- `progress` and `from` are 0..1. With `from`, the fill sweeps once from there on mount (skipped under reduced motion).
- Gold means earned (XP, levels, records). Braise means the fight or the action.
- `testIDPrefix` is required.
