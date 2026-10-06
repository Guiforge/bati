# Bati design system: how to build with it

Bati is a dark-fantasy fitness RPG drawn like a Franco-Belgian comic (BD): a cold ink night, bone text, one warm light. Dark mode only. These are the app's real React Native + Tamagui components, compiled for the web.

## Setup

Wrap everything in `BatiProvider`. It mounts the Tamagui config and the dark theme; without it no token resolves and components render unstyled.

```tsx
const { BatiProvider, YStack, Text, Card, AppButton, Recitatif } = window.BatiDS;

<BatiProvider>
  <YStack bg="$bgDark" p="$4" gap="$3">…</YStack>
</BatiProvider>
```

Paint your own ground: put screens on a `YStack bg="$bgDark"`; the provider does not colour the page.

## Styling idiom: Tamagui props with `$` tokens, no CSS classes

Layout with `YStack`, `XStack` and `Text` from the bundle, styled by props: `bg`, `p`, `px`, `py`, `gap`, `rounded`, `borderWidth`, `borderColor`, `color`, `fontSize`, `fontWeight`, `fontFamily`, `width`, `items`, `justify`.

- Grounds: `$bgDark` (page), `$surface` (cards), `$surface2` (raised, tracks). Frame: `$borderStrong`.
- Text: `$text` (bone), `$textSecondary` (ash, metadata).
- Roles. Braise is action: `$primary` (fills, with `$onPrimary` text), `$primaryText` (braise as text or icon). Gold is earned: `$resourceGold`, track `$gold800` (XP, levels, records, rewards). `$success`, `$error`. Metadata is never braise.
- Type: `fontFamily="$heading"` (Alegreya, weight 700) for titles and names of things in the world; the default body font (Noto Sans) for everything else. Alegreya never sets a digit: timers, HP, XP and counts stay in the body font.
- Radii: `$1` (3) tags, `$3` (7) cards, buttons, chips, inputs; full circles for round icon buttons.
- Panels, not shadows: a 1 px `$borderStrong` frame, 1.5 px on the screen's one hero card. No drop shadows, no gradients as decoration, no emoji (use `GameIcon`).

## Components and where the truth lives

Read each component's `.prompt.md` and `.d.ts` before using it. The core: `AppButton` (the seal; one primary per screen, `variant="outline"` for the rest, `borderColor="$error"` for destructive), `AppIconButton`, `Card`, `Recitatif` (a title in an ink cartouche pinned over art), `SectionLabel` (section headers), `InkGauge` (`progress` 0..1; braise for HP, gold for levels), `ProgressBar` (`progress` 0..100), `Tag` and `Chip` (`tone`, `textColor`), `Stepper`, `GameIcon` (20 inked glyphs).

## A screen, idiomatically

```tsx
<BatiProvider>
  <YStack bg="$bgDark" p="$4" gap="$4">
    <Card borderWidth={1.5} gap="$3">
      <SectionLabel>Today</SectionLabel>
      <Text fontFamily="$heading" fontWeight="700" fontSize={24} color="$text">Chop Wood</Text>
      <XStack gap="$2"><Tag label="3 rounds" /><Tag label="up to +140 XP" textColor="$resourceGold" /></XStack>
      <InkGauge progress={0.68} fill="$resourceGold" track="$gold800" figure="1,363 / 2,000 XP" figureColor="$resourceGold" testIDPrefix="level" />
    </Card>
    <AppButton>Start the quest</AppButton>
  </YStack>
</BatiProvider>
```
