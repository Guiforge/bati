import type { ColorTokens } from "tamagui";
import type { DifficultyCode } from "@/db/schema";

/**
 * The palette, as plain strings. Every colour in the app is defined here exactly once.
 *
 * `tamagui.config.ts` builds its tokens from this object, so product UI keeps using tokens
 * (`bg="primary"`) and never sees a hex. The reason the raw values need a home of their own is
 * that three things cannot take a Tamagui token and need a real string: `expo-linear-gradient`,
 * `react-native-gifted-charts`, and React Native's `textShadowColor`.
 *
 * Those call sites used to hand-copy hex, and it drifted: the onboarding faded to `#101323`
 * while the surface token read `#101322`, and the journal invented its own green and red for the
 * difficulties the progression chart already drew from `success` and `error`. A lint rule
 * (`.biome/plugins/noRawHexColor.grit`) now rejects raw hex everywhere but this file — which is
 * only enforceable because there is nothing left outside it.
 */

// The braise as text: one value, three roles. Fire is the brand's light, and a caution in amber
// was indistinguishable from the gold under deuteranopia (spec 2026-10-05, rule table).
const BRAISE_LIGHT = "#F08A4B";

export const rawColors = {
  // --- Core ---
  // The braise: the warm light every illustration already has (an axe in a sunbeam, a window,
  // a forge), on the cold ink night around it. A fill colour; text on it is `onPrimary`.
  primary: "#C2410C",
  /**
   * The braise light enough to read as text or an icon on any of our dark surfaces (6.5:1 at
   * worst, on surface2). `primary` itself is a fill: 3.75:1 on bgDark, fine for a shape, never
   * for a sentence.
   */
  primaryText: BRAISE_LIGHT,
  primaryHover: "#D4501A",
  primaryPress: "#9A3412",
  /** The seal button's bottom edge: the fill in shadow. */
  primaryEdge: "#7A2905",
  /** The label on a `primary` fill: 4.77:1. */
  onPrimary: "#FFF4E6",
  success: "#6DB57A",
  warning: BRAISE_LIGHT,
  /** `warning` at 0.45, for the edge glow before a side switch (components/session/SwitchGlow.tsx).
   *  0.35 was measured too faint on the emulator to catch from the corner of an eye. */
  warningGlow: "rgba(240, 138, 75, 0.45)",
  error: "#F0595D",

  // --- Immersive backgrounds ---
  // Ink, barely cool: measured on the art (quest #373637, Ombre-Lovée #282A35) and the logo
  // (#3B4D5E). A warm or saturated ground makes the paintings look dirty or imported.
  bgDark: "#0C0D11", // The Void
  bgOverlay: "rgba(12, 13, 17, 0.92)",
  // Lighter than the one above, for what has to sit on artwork and still let it through: the
  // scrim that keeps the status bar readable over the village painting.
  bgOverlaySoft: "rgba(12, 13, 17, 0.72)",
  // Behind a bottom sheet that asks something (components/common/FormSheet.tsx).
  sheetScrim: "rgba(0, 0, 0, 0.5)",

  // --- Surfaces ---
  surface: "#15171C",
  surface2: "#1D2027",

  // --- Glass ---
  glassBg: "rgba(21, 23, 28, 0.65)",
  glassBorder: "rgba(236, 228, 212, 0.14)",
  // `resourceGold` at a fifth: the hairline that marks the oath strip as progression on Home
  // without a full gold rule competing with the XP bar.
  goldHairline: "rgba(226, 181, 74, 0.22)",

  // --- Text ---
  text: "#ECE4D4", // Bone
  textSecondary: "#A89C88", // Ash
  // Icons and tints only (widget, recap trace, village rows): 4.08:1 on bgDark, under body AA.
  muted: "#6B707B",

  // --- Effects ---
  borderStrong: "#363A44",
  shadowColor: "#000000",

  // --- Boss phases ---
  // The room the fight happens in, darkening and reddening as the boss loses. Phase 1 uses
  // `bgDark`; these are its wounded, critical and enraged siblings.
  bossPhase2: "#170F1D",
  bossPhase3: "#1F0E18",
  bossPhase4: "#280B12",

  // --- The recap map ---
  /** Water must read as depth against `bgDark`, never as the blue every mapping app uses. */
  mapWater: "#0E1730",
  /** Wood and park, one wash: a texture at recap zoom, not a status. */
  mapWood: "#101E1B",

  // --- The iso village POC (branch poc/village-iso only) ---
  // Pipetted on the night ground of the tier paintings, the source written beside each. The
  // shadow tones sit one notch darker, at least ΔL 4 off bgDark so a shadow never reads as a hole.
  /** Grass in moonlight: tier_3 lawn between the cottages, #223B40 to #2C454A. */
  isoGrass: "#284043",
  /** The second cel tone of the grass, for the alternating cells. */
  isoGrassAlt: "#223A3D",
  /** Grass in a cast shadow: tier_3 lawn under the fence, #0C1217 lifted to clear bgDark. */
  isoGrassShadow: "#16252A",
  /** The dirt path: tier_3 path to the gate, #445159 to #505D64. */
  isoPath: "#4A565D",
  isoPathShadow: "#262F35",
  /** Grass variants (solVarie.ts, isoSpec.json biomes.*.variantes): a deeper, a lighter and a mossier tone of the moonlit lawn. */
  isoGrassDeep: "#243A3E",
  isoGrassLight: "#2D4649",
  isoGrassMoss: "#2A403B",
  /** Path variants: a paler and a darker packed earth. */
  isoPathLight: "#4F5C63",
  isoPathDark: "#444F56",
  /** Plot earth variants, around isoPlot. */
  isoPlotAlt: "#605145",
  isoPlotDark: "#54473C",
  /** Decals, all dark at night: grass tufts, a flower, pebbles (also the path's border), a fallen leaf. */
  isoGrassTuft: "#1B2F32",
  isoFlower: "#5A4A78",
  isoPebble: "#5C6469",
  isoLeaf: "#6A5A3A",
  /** The island's earth cliff, lit and shadow faces: tier_3 path edge darkened, bluish. */
  isoCliff: "#2E3236",
  isoCliffShadow: "#1C1F23",
  /** A window's light pool on the ground: tier_3 square, pale amber in flat panes. */
  isoAmberPool: "#B59C68",
  /** Ink on the ground: tier_3 outlines. */
  isoInk: "#0F1518",
  // The next seven are set by eye for the demo map (app/dev-iso.tsx), not pipetted yet: lot 2
  // pipettes water, decor and foam on the tier paintings when it paints them.
  /** The canal at night. */
  isoWater: "#1E3046",
  /** The canal in a cast shadow, one notch darker, still clear of bgDark. */
  isoWaterShadow: "#142233",
  /** A cast shadow over a water image (opaque, so not redrawn in shadow tones): black at 28 %, isoWater under it reads isoWaterShadow. */
  isoShadowVeil: "rgba(0, 0, 0, 0.28)",
  /** A building's own shadow on its socle's top, over the painted stone (drawn translucent, one path, no group opacity): cool black at 40 %. */
  isoSocleShadow: "rgba(8, 12, 22, 0.22)",
  // T30 contact shadow: one opaque ground-dark tone, the opacity is set per ellipse.
  isoOmbreContactSol: "rgb(14, 18, 10)",
  /** The waterfall's foam where it leaves the island. */
  isoFoam: "#6E8496",
  /** Tree crowns and the grove. */
  isoTree: "#1B2B23",
  /** Rocks on the grass: the stone's lit tone in isoSpec.json. */
  isoRock: "#4A4F52",
  /** A building's plot on the demo map: the plaster's lit tone in isoSpec.json. */
  isoPlot: "#6A5A4C",
  /** The inked flame of a hearth: the braise (`primary`) lifted a notch to read on stone at night. */
  isoFlamme: "#C9693A",
  /** The flame's core, the one pale warm tongue (amber: gold is for what is earned). */
  isoFlammeCoeur: "#E6BB7E",
  /** A chimney's or a campfire's smoke: a cold blue-grey, pale so it reads on the ground at the framing. */
  isoFumee: "#7F8EA2",
  /** The dragon's breath (T41): a warm ash, pale, so it reads on the lair's blue-grey rock and in its black mouth. */
  isoCendreClaire: "#E4DCCB",
  /** The ink outline of the little puffs of dust (petitsDetails.tsx). */
  isoPoussiereEncre: "#1A1511",
  /** AUDIT-DA 39: the warm stone laid over a painted block that came out saturated blue (Retouches.tsx), lit, mid and shaded face. */
  isoPierreChaudeClair: "#8C7A66",
  isoPierreChaudeMoyen: "#7A6855",
  isoPierreChaudeSombre: "#584A3E",
  /**
   * FIN-DIS, castle_wall's wall sections drawn by the app (rempart.ts) until their sprites are
   * painted: the stone pipetted on the gatehouse's night sprite (castle_wall/solid.nuit.webp, its
   * lit +gy face #506189 and shaded +gx face #1F273D, the top a notch over the lit face), and the
   * palisade's stakes in the bible's wood (#6B4A2E) with their shade and their pale cut tips.
   */
  isoRempartPierreHaut: "#5E7398",
  isoRempartPierreClair: "#506189",
  isoRempartPierreSombre: "#1F273D",
  isoRempartBoisCoupe: "#9A7650",
  isoRempartBoisClair: "#6B4A2E",
  isoRempartBoisSombre: "#3A281A",
  isoRempartBoisNuitCoupe: "#6A5238",
  isoRempartBoisNuitClair: "#4A3322",
  isoRempartBoisNuitSombre: "#281B12",
  /** The fireflies: a clear cold cyan-blue, no warm light (the windows and the fire are the only warm ones). */
  isoLuciole: "#6EC9E8",
  /** T27 point 4, the building effects of a wave (effets.ts): the wizard's runes, a cold violet; the druids' motes, a green no fire mixes into. */
  isoRune: "#A58CE0",
  isoLucioleVerte: "#DDE6A4",

  // --- The coloured night of the iso map (L6-T11, Guillaume: "tout est tres gris"). The biome reads
  // these; the older grey tones above stay for scripts/iso, which composes its blockout pages with them. ---
  /** The night over the world around the island (Monde.tsx, T23): a deep blue veil fixed to the frame's edges, faded to nothing towards its middle. */
  isoNuitVoile: "rgba(15, 42, 107, 0.42)",
  isoNuitVoileNul: "rgba(15, 42, 107, 0)",
  /** The late-afternoon day over the whole map (AmbianceCarte.tsx, lumiere.ts): a flat warm veil of 18 % (the colour of isoJourLavis), and a warm dark olive-brown vignette (18 %) that fades to nothing towards the map's middle. The cold #2E3552 is the night's only (iter-01 H1-04). */
  isoJourVoile: "rgba(242, 226, 180, 0.18)",
  isoJourVignette: "rgba(60, 45, 25, 0.18)",
  isoJourVignetteNul: "rgba(60, 45, 25, 0)",
  /** The day's slanting light bands from the left (AmbianceCarte.tsx, M4-10): isoJourLavis at 10 % at the heart of a band, 0 at its edges. */
  isoRaisJour: "rgba(242, 226, 180, 0.1)",
  isoRaisJourNul: "rgba(242, 226, 180, 0)",
  /** The night floor over the whole map (AmbianceCarte.tsx): #2E3552 at 35 %, so a lawn never reads green on green. */
  isoNuitSol: "rgba(46, 53, 82, 0.35)",
  /** The night veil under the painted layers (A6): they carry their own baked night (famille_jour.nuit), so the veil is left only for the vector bits beneath (paths, square). */
  isoNuitSolPeint: "rgba(46, 53, 82, 0.18)",
  /** The vector ground at night (A6, isoSpec.ts `biomes.defautNuit`): each `<token>Nuit` is the day token with its saturation and value scaled so the lawn, plots, paths and paving sit within iso-sol-encre's tolerances of the buildings' night (isoSpritesReference). The day tokens are unchanged. */
  isoPreProfondNuit: "#18261D",
  isoPreAltNuit: "#1D2B21",
  isoPreNuit: "#213023",
  isoPreMousseNuit: "#293523",
  isoPreClairNuit: "#2B3B2D",
  isoPreSaugeNuit: "#344237",
  isoPreSecNuit: "#3F442B",
  isoTerreNuit: "#463B30",
  isoTerreAltNuit: "#3F352B",
  isoTerreSombreNuit: "#352C24",
  isoCheminSombreNuit: "#3B3228",
  isoCheminNuit: "#483E32",
  isoCheminClairNuit: "#53473A",
  isoRuePaveNuit: "#514837",
  isoPaveClairNuit: "#5F5643",
  isoPaveSombreNuit: "#302B22",
  isoRueEmpierreeNuit: "#524231",
  /** The night's pools of light, a soft radial gradient UNDER the sprites (AmbianceCarte.tsx, in IsoCarte), in #F0A848 (isoLueur): a lit house or lantern, then a hearth or the forge, hotter. Each token is a stop: its heart, then its body; the edge is the same colour at opacity 0. */
  isoFlaqueNuit: "rgba(240, 168, 72, 0.22)",
  isoFlaqueNuitCoeur: "rgba(240, 168, 72, 0.30)",
  isoFlaqueFoyer: "rgba(255, 150, 50, 0.28)",
  isoFlaqueFoyerCoeur: "rgba(255, 166, 56, 0.35)",
  /** The day wash over the land, the water and the forest (lumiere.ts): lighter, less saturated, warm. */
  isoJourLavis: "#F2E2B4",
  /** An unlit window painted over the night sprite's lit one by day (VeillesDessinees.tsx, T38): dark glass, no warm light. */
  isoFenetreEteinte: "#2A2420",
  /** Lawn under the moon, dark to light (solVarie.ts): a living green, no longer a blue-grey. */
  isoPreProfond: "#25402F",
  isoPreAlt: "#2C4A34",
  isoPre: "#335238",
  isoPreMousse: "#435A36",
  isoPreClair: "#456448",
  isoPreSauge: "#55705A",
  isoPreSec: "#6A7442",
  isoPreOmbre: "#162A21",
  /** The path and the plots: warm ochre earth. */
  isoChemin: "#60482C",
  isoCheminClair: "#6E5434",
  isoCheminSombre: "#4E3A22",
  isoCheminOmbre: "#4C3D2B",
  /** Warm dark veil laid inside the street textures (MotifsSol): lowers their value and the ink contrast of the stones. */
  isoRueVoile: "#4A3018",
  /** Streets by rank (L6-T18): beaten earth is isoChemin; stones further in; paving by the square. */
  isoRueEmpierree: "#6A5640",
  isoRuePave: "#6A5E48",
  isoTerre: "#7A5A38",
  isoTerreAlt: "#6E5032",
  isoTerreSombre: "#5C4228",
  /** Ground decals: tufts, a pale flower, warm stones, an autumn leaf, a bush, taller grass, a rock pile. */
  isoTouffe: "#1B3320",
  isoFleur: "#D9584A",
  isoCaillou: "#8C8A80",
  isoFeuille: "#B5742F",
  isoBuisson: "#244A2C",
  isoHerbeHaute: "#4C7A3E",
  isoRocaille: "#6F716E",
  /** Paving stones of the square (pave.ts, AUDIT-DA 8): a lighter and a darker stone laid over isoRuePave. */
  isoPaveClair: "#7C7058",
  isoPaveSombre: "#3E382C",
  /** Dev colour blocks of the small buildings (quartiers.ts), one per family; the sides take the shade. No violet. */
  isoQuartierArtisans: "#C98B3A",
  isoQuartierEntrainement: "#B5523B",
  isoQuartierCalme: "#6E9A52",
  isoQuartierRempart: "#8A8F94",
  isoQuartierCote: "rgba(20, 16, 10, 0.32)",
  /** The canal, lively blue, its shadow and its foam. */
  isoEauVive: "#2A6BB5",
  isoEauVivOmbre: "#1C4A84",
  isoEcumeVive: "#A8D4F5",
  /** The night stream (T22 round 3): deep and cold, far from the road's slate; its shadow, its heart and its glints. */
  isoEauNuit: "#16406A",
  isoEauNuitOmbre: "#10283A",
  isoEauNuitCoeur: "#2A6590",
  isoEcumeNuit: "#7FA6BD",
  /** A window's or a fire's glow: a warm amber, the warmest light of the night. */
  isoLueur: "#F0A848",
  /** A last stage's banner (fierte.ts): an oxblood cloth, trimmed in `resourceGold`, what was earned. */
  isoBanniere: "#7A2A36",
  /** The run vocation's cloth: its pennants and its banners (vocation.ts), the bible's oxblood a shade brighter. */
  isoFanion: "#8A2432",
  /** The vocation's grounds on the square (vocation.ts, G3): sunlit beaten earth (bible ocre), its night, and the bible's wood. */
  isoVocationTerre: "#C2944E",
  isoVocationTerreNuit: "#6E5A3C",
  isoVocationBois: "#6B4A2E",
  /** The glint on a legendary banner's finial: gold at its brightest. */
  isoEclat: "#FFF0C4",
  /** The water glints (motion files `miroitement`): a soft slate-blue, never white, by day and by night. */
  isoEclatEau: "#8FA8C8",
  /** The two cloud shadows crossing the map (bible §5, E5): the bible's shadow, drawn at 18 %. */
  isoOmbreNuage: "#2E3552",
  /** The forest floor, from the frame's top to its bottom. */
  isoForetLoin: "#1B4A44",
  isoForetSol: "#243A30",
  /** The floor round the painted terrain (alentours, flag `sol`): the median of its faded edge, so its box never shows. */
  isoSolPeintFond: "#504C3F",
  /** A cast shadow on the painted terrain (alentours, flag `sol`): #2E3552 at 40 %, the bible's mix, over the painting. */
  isoOmbrePeinte: "rgba(46, 53, 82, 0.4)",
  /** The bible's slate, #2E3552, as a bare colour (loupe BC): the forest masses' ground shadows (Alentours.tsx), given its opacity by its gradient stops. */
  isoArdoise: "#2E3552",
  /** The cart's cast shadow (loupe BC r4): a plain slate, greener than isoArdoise, which read violet on the road. */
  isoArdoiseNeutre: "#303B4D",
  /** The day veil on the surroundings (AmbianceCarte.tsx): a deep olive, so it darkens the ground and forest without greying them as the slate did (BC round 2, saturation 65 to 35). */
  isoVoileJour: "#2A2C18",
  /** FIN-CAR: the fields round the village (champs.ts): two greens and a dark ochre, close to the rim's dusk; the hedge between them. */
  isoChampA: "#2B4631",
  isoChampB: "#36533A",
  isoChampOcre: "#4A4228",
  isoHaie: "#1F3A26",
  /** The fields and the hedge by night (A7, H4-01): the day tints with their value pulled down and a cold lean, the lawn's own night ramp (isoPreClairNuit). */
  isoChampANuit: "#1C2B2C",
  isoChampBNuit: "#223331",
  isoChampOcreNuit: "#302C29",
  isoHaieNuit: "#17251F",
  /** The cold veil over the street textures by night (A7, H4-01): #2E3552, in place of the warm isoRueVoile. */
  isoRueVoileNuit: "#2E3552",
  /** Three tree species: round broadleaf, blue-green conifer, light birch; the trunk, and boulders. */
  isoArbreRond: "#2F7A3C",
  isoArbreConifere: "#1C5A44",
  isoArbreClair: "#5E9B3E",
  isoTronc: "#4A3320",
  /** The totem statue's wood and bronze washes (statue.ts); stone is the painting, gold is `resourceGold`. */
  isoStatueBois: "#9A6A3A",
  isoStatueBronze: "#B0703C",
  /** The four cloth washes of the standing inhabitants (habitants.ts): a role's sprite recoloured, its lines kept. */
  isoRocheMonde: "#6C7078",

  // --- Legacy mapping (safety net) ---
  bgLight: "#15171C",
  pastelBlue: "#18202A",
  pastelPink: "#2A1719", // an error tint since the magenta left
  pastelGreen: "#16261B",
  pastelYellow: "#2A2413",
  pastelOrange: "#2B1B12",

  // --- Resources ---
  // Only the two that are drawn. The other resources are white game-icons glyphs, like inked
  // vignettes; their five colours had no consumer and were removed (2026-10).
  resourceGold: "#E2B54A", // patinated gold: progression, XP, rewards
  resourceFire: BRAISE_LIGHT,

  // --- The animals of the crest ---
  // Fills for a shape, never for text; the animal is drawn over them in `bgDark` ink. Contrast of
  // that ink on the fill, then of the fill against bgDark / surface / surface2. The bear is ocre
  // and not russet: a russet bear touched the braise and the stag under deuteranopia.
  /** Strength. 3.75 ink; 3.46 / 3.15 on the surfaces (3.75 against bgDark). */
  animalBear: "#8A672C",
  /** Calisthenics. 12.01 ink; 11.09 / 10.08 on the surfaces (12.01 against bgDark). */
  animalErmine: "#5EDBFA",
  /** Yoga. 10.72 ink; 9.90 / 9.00 on the surfaces (10.72 against bgDark). */
  animalSalmon: "#FFAAAB",
  /** Run and cardio. 4.32 ink; 3.99 / 3.63 on the surfaces (4.32 against bgDark). */
  animalStag: "#178485",
  /** Ride. 6.61 ink; 6.10 / 5.55 on the surfaces (6.61 against bgDark). */
  animalHorse: "#599AE2",

  white: "#FFFFFF",
  black: "#000000",

  // --- The Journal's ramps ---
  // The Journal is drawn with Nocturne's structure (Inter, borderless surfaces, fading rules,
  // one accent) on Bati's own colours. Five steps of its gold, two inks for empty marks.
  gold100: "#F7ECCF",
  gold300: "#EDCB76",
  gold600: "#B08A2E",
  gold700: "#5E4A1E",
  gold800: "#362C15",
  gold900: "#211B0E",
  ink800: "#262A33",
  /** The phylactère's paper, a step under bone so a speech bubble never outshines the screen's action; ink text 12.6:1, ink800 name 9.3:1. */
  parchment: "#D9CFBC",
  ink900: "#101217",
  /** `glassBorder` at nothing: the ends of a fading rule. Transparent black would grey it. */
  glassBorderClear: "rgba(236, 228, 212, 0)",
  /** `bgDark` at nothing: where a painting's fade starts. */
  bgDarkClear: "rgba(12, 13, 17, 0)",
} as const;

/**
 * A palette colour (`#rrggbb`) at `alpha`, for the few consumers that need a string rather than
 * a token: gradients and React Native text shadows. One source per value: a hand-typed rgba of
 * the ground is how the old fades kept the 2025 blue after the palette moved.
 */
export function fade(
  hex: `#${string}`,
  alpha: number,
): `rgba(${number}, ${number}, ${number}, ${number})` {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})` as const;
}

/**
 * Difficulty has one colour per level, everywhere: easy success, medium the braise, hard error.
 *
 * The progression chart used `success`/`primary`/`error`; the journal's stats used `#22C55E`
 * and `#EF4444` — a different green and a different red for the same three words, on two screens
 * a tab apart.
 */
export const DIFFICULTY_COLORS: Record<DifficultyCode, string> = {
  easy: rawColors.success,
  medium: rawColors.primary,
  hard: rawColors.error,
};

/**
 * The same three levels as Tamagui tokens, for *text*. Medium reads `primaryText`, not `primary`:
 * the braise is a fill (3.75:1 on bgDark) and its lightened twin is the one legible as words.
 */
export const DIFFICULTY_TEXT_TOKENS: Record<DifficultyCode, ColorTokens> = {
  easy: "success",
  medium: "primaryText",
  hard: "error",
};
