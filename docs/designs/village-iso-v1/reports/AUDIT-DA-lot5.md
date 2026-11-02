# AUDIT-DA lot 5 (28, 29, 30)

- 29: Bulle.tsx, all content on parchment. The ink box is gone; the figures sit in `<Theme name="parchment">` (new `dark_parchment` theme in tamagui.config.ts, outside the iso list: ink text 12.6:1, gold700 for the gold, light paper for the bar track). Frame height capped (`hauteurMaxBulle`), content scrolls inside; the tab bar (`HAUTEUR_BARRE` 60 dp + inset) is kept clear.
- 30: cause: `placerBulle` sent any bubble taller than 70 % of the window to the sheet; the figures block plus the deeds list measured taller, so the sheet came out at full text. Rule removed; the frame is held to 45 % of the free height so one side of the anchor always fits. Sheet only beyond 130 % text or with no room (landscape). Test added in iso-bulle.test.ts.
- 28: VillageScene.tsx bottom scrim, `iso` only: stops [0, 0.8, 1] instead of [0, 0.66, 0.94].
- Checks: `npx jest iso- village-scene`: 610 pass, 1 fail (iso-marcheurs-vue "walker's shadow ... lifted", another lot's file, not touched); `heavy.sh npx tsc --noEmit` clean; biome clean on my 5 files.
- Not checked on a device: parchment readability of ProgressBar/pips/links, scroll feel. qa to film a bubble on a deed-rich building.
