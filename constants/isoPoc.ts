// Whether the iso village demo (app/dev-iso.tsx, bati://dev-iso) may open: in dev, and in the
// `.perf` release build the team measures on. Never in a published build (F-Droid, GitHub, Play).
//
// The `.perf` build has no __DEV__ and no environment variable (scripts/iso/team/gradle-perf.sh
// only passes -PbatiLocalId=.perf, which becomes the application id suffix; see
// plugins/withAndroidLocalAppId.js). The application id is read at run time from the app's own
// files directory, /data/user/<n>/com.guiforge.bati.perf/files/, through expo-file-system, which is
// already installed. A published build is exactly com.guiforge.bati, so the test below is false.

import { Paths } from "expo-file-system";

/** A `.perf` or other local build (application id with a suffix); the published id is exactly com.guiforge.bati. */
export function estBuildLocal(uri: string): boolean {
  return /\/com\.guiforge\.bati\.[^/]+\//.test(uri);
}

function estBuildPerf(): boolean {
  try {
    return estBuildLocal(Paths.document.uri);
  } catch {
    // No files directory to read (web, a test without the native module): not the .perf build.
    return false;
  }
}

export const ISO_POC: boolean = __DEV__ || estBuildPerf();

// A local build: a dev client or a `.perf` release. Jest is __DEV__ too, so the suites keep seeing
// the shipped values: `process.env.NODE_ENV` is a literal Babel inlines ("test" under jest,
// "development" in a dev client), not a dynamic env read, and a published build has no __DEV__ and
// the bare application id.
const BUILD_LOCAL: boolean = (__DEV__ && process.env.NODE_ENV !== "test") || estBuildPerf();

// Whether the village tab draws the iso map (components/village/iso/IsoVillage.tsx) in place of the
// painted scene. On in local builds (dev, `.perf`), off in every published build (F-Droid, GitHub,
// Play) and under jest.
// shortcut: a source rule, no setting or remote switch; a published build stays off until the lot 3
// gate decides how it ships, then this becomes `true`.
export const INTEGRATION: boolean = BUILD_LOCAL;

// The buildings engine (components/village/iso/batiment.ts): on in local builds, off in every
// published one and under jest. It also carries the two things that ride with it, the upgrade rule B
// (constants/buildingStages.ts) and the pending marker on every rank (montee.ts).
export const BATIMENT_MOTEUR: boolean = BUILD_LOCAL;

// How the iso map lives (PROMPT-EQUIPE-V1.md §6). `continu` (Guillaume, 01/11): the one clock runs
// while the screen has the focus and stops 60 s after the last touch, with reduced motion, under a
// screen reader and in the frozen/E2E mode: an exception to performance.md, written there.
// `vagues`: 15 to 20 s on open and on touch, then the screen rests (the old rule).
export const MODE_VIE: "vagues" | "continu" = "continu";

/** How long the iso clock keeps running after the focus or the last touch, ms (a test shortens it: 60 s of fake time costs gigabytes). */
export const DUREE_VIE_MS = 60000;

/** The painted surroundings' layers (docs/designs/village-surroundings, stage 5), each behind its own flag. */
export const COUCHES_ALENTOURS = ["sol", "foret", "decor", "animaux"] as const;
export type Alentours = Readonly<Record<(typeof COUCHES_ALENTOURS)[number], boolean>>;

// Read in release too, like INTEGRATION, and all off until each layer is judged: `sol` the painted
// terrain under the vector paths and fields, `foret` the painted masses in groups round the island
// (in place of the vector forest tiles and the lisiere's round trees), `decor` the painted props and
// stories, `animaux` the painted mice and birds (in place of the drawn rat and crows). No
// screen-fixed foreground plane: it is gone for good (loupe BC, G03). app/dev-iso.tsx turns them on for a capture with
// `?peint=sol,foret,decor,animaux` (or `?peint=tout`).
// shortcut: source rule, like INTEGRATION: all on in local builds, all off in a published one until
// Guillaume has judged each layer; then flip that layer's value to `true` here.
export const ALENTOURS: Alentours = {
  sol: BUILD_LOCAL,
  foret: BUILD_LOCAL,
  decor: BUILD_LOCAL,
  animaux: BUILD_LOCAL,
};

// The painted buildings of the buildings track (docs/designs/village-buildings), each behind its
// own flag: its paintings, its stages, teasers, gag and anchors go through the engine. Local builds
// only, like INTEGRATION; off in every published build and under jest, so Bati looks as before.
// shortcut: source rule, one line per building the integration script (scripts/bld/integrate.py)
// has wired; a building is flipped to `true` here when Guillaume has judged it.
export const BLD_PEINTS: Readonly<Record<string, boolean>> = {
  fountain: BUILD_LOCAL,
  well: BUILD_LOCAL,
  farm: BUILD_LOCAL,
  druid_grove: BUILD_LOCAL,
  tent: BUILD_LOCAL,
  windmill: BUILD_LOCAL,
  champion_arena: BUILD_LOCAL,
  heroes_hall: BUILD_LOCAL,
  dragon_lair: BUILD_LOCAL,
  castle_wall: BUILD_LOCAL,
  quarry: BUILD_LOCAL,
  barn: BUILD_LOCAL,
  armory: BUILD_LOCAL,
  forge: BUILD_LOCAL,
  watchtower: BUILD_LOCAL,
  archery_range: BUILD_LOCAL,
  high_road: BUILD_LOCAL,
  wizard_tower: BUILD_LOCAL,
  training_dummy: BUILD_LOCAL,
  observatory: BUILD_LOCAL,
  campfire: BUILD_LOCAL,
};
