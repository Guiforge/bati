---
category: Actions
---
# AppButton

The seal: Bati's one button family. `variant="primary"` (default) is a braise fill with a 3 px darker bottom edge and an Alegreya label; it is the screen's main action. `variant="outline"` is the secondary action, framed in ink.

- One primary per screen. Everything else is outline or a text link.
- Destructive action: `variant="outline"` with `borderColor="$error"` (Discard, Remove, Quit quest).
- Past-target state (the set's target is met): `backgroundColor="$success"`; the label turns ink and the seal edge goes.
- `disabled` reads as a button that waits: `$surface2` fill, ash label, no edge.
- Never restyle it with `pressStyle`, `rounded` or `bg`: the seal is the component's job.

```tsx
<AppButton>Start the quest</AppButton>
<AppButton variant="outline" borderColor="$error">Discard this session</AppButton>
```
