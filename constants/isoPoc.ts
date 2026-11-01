// Whether the iso village demo (app/dev-iso.tsx, bati://dev-iso) may open: in dev, and in the
// `.perf` release build the team measures on. Never in a published build (F-Droid, GitHub, Play).
//
// The `.perf` build has no __DEV__ and no environment variable (scripts/iso/team/gradle-perf.sh
// only passes -PbatiLocalId=.perf, which becomes the application id suffix; see
// plugins/withAndroidLocalAppId.js). The application id is read at run time from the app's own
// files directory, /data/user/<n>/com.guiforge.bati.perf/files/, through expo-file-system, which is
// already installed. A published build is exactly com.guiforge.bati, so the test below is false.

import { Paths } from "expo-file-system";

function estBuildPerf(): boolean {
  try {
    return /\/com\.guiforge\.bati\.perf\//.test(Paths.document.uri);
  } catch {
    // No files directory to read (web, a test without the native module): not the .perf build.
    return false;
  }
}

export const ISO_POC: boolean = __DEV__ || estBuildPerf();

// Whether the village tab draws the iso map (components/village/iso/IsoVillage.tsx) in place of the
// painted scene. Read in release too (the F-Droid build included), and off by default: nothing iso
// shows until it is turned on.
// shortcut: a source constant, no setting or remote switch; turn it on by changing `false` to
// `true` here (then build the `.perf` release), and back before any tag, until the lot 3 gate
// decides how it ships.
export const INTEGRATION = false;

// How the iso map lives (PROMPT-EQUIPE-V1.md §6). `continu` (Guillaume, 01/11): the one clock runs
// while the screen has the focus and stops 60 s after the last touch, with reduced motion, under a
// screen reader and in the frozen/E2E mode: an exception to performance.md, written there.
// `vagues`: 15 to 20 s on open and on touch, then the screen rests (the old rule).
export const MODE_VIE: "vagues" | "continu" = "continu";

/** How long the iso clock keeps running after the focus or the last touch, ms (a test shortens it: 60 s of fake time costs gigabytes). */
export const DUREE_VIE_MS = 60000;

/** The painted surroundings' layers (docs/designs/village-surroundings, stage 5), each behind its own flag. */
export const COUCHES_ALENTOURS = ["sol", "foret", "decor", "animaux", "plan"] as const;
export type Alentours = Readonly<Record<(typeof COUCHES_ALENTOURS)[number], boolean>>;

// Read in release too, like INTEGRATION, and all off until each layer is judged: `sol` the painted
// terrain under the vector paths and fields, `foret` the painted masses in groups round the island
// (in place of the vector forest tiles and the lisiere's round trees), `decor` the painted props and
// stories, `animaux` the painted mice and birds (in place of the drawn rat and crows), `plan` the
// foreground leaves at the screen's bottom corners. app/dev-iso.tsx turns them on for a capture with
// `?peint=sol,foret,decor,animaux,plan` (or `?peint=tout`).
// shortcut: source constants, like INTEGRATION; turn a layer on here once Guillaume has judged it.
export const ALENTOURS: Alentours = {
  sol: false,
  foret: false,
  decor: false,
  animaux: false,
  plan: false,
};
