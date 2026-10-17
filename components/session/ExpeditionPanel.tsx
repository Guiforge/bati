import { useEffect, useState } from "react";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { screenStaysOn } from "@/src/gps/liveFigures";
import { useExpeditionStore } from "@/stores/expedition";
import { recordedDurationSeconds, useSessionStore } from "@/stores/session";
import { ExpeditionPanelView } from "./ExpeditionPanelView";

/**
 * What a hero sees while they are out.
 *
 * Numbers, under the map `LiveMap` draws in the slot the movement's picture takes on every other
 * set. The screen is off by default on an outing: it dominates the power draw of a session far
 * more than the GPS chip does, so the map only costs while the hero is looking. A hero can keep it
 * on for an activity (Settings, "Affichage des sorties"), see `screenStaysOn`. See
 * docs/designs/map-immersion.md § The live map.
 *
 * Everything here reads the live store rather than the fixes: `stores/expedition` folds each
 * fix through the reducer as it lands, and a second derivation on this screen would be a second
 * answer to "how far have I gone".
 */
export function ExpeditionPanel() {
  const track = useExpeditionStore((state) => state.track);
  const error = useExpeditionStore((state) => state.error);
  const lastFix = useExpeditionStore((state) => state.lastFix);
  const recentSpeedMps = useExpeditionStore((state) => state.recentSpeedMps);
  const goalReached = useExpeditionStore((state) => state.goalReached);
  const goal = useSessionStore((state) => state.goal);
  /**
   * What this outing shows, frozen when it began (`beginTrackingIfOuting`). Its `locomotion` is
   * the activity really done, the one the hero's tab was picked from: `view.rate` is that tab's
   * pace or speed for the whole outing, a ride leg of a walk-and-ride quest included. The victory
   * and the recap read the same choice (`useRateKind`).
   */
  const view = useExpeditionStore((state) => state.view);
  const lapFromMs = useExpeditionStore((state) => state.lap.fromMs);
  const quest = useSessionStore((state) => state.quest);

  /**
   * How long the session will be *recorded* as, which is not what the session timer reads.
   *
   * `useSessionTimer` is only the pulse here. Its value restarts at zero after a resume, because
   * `useSessionRecovery` pushes `timerStartTimestamp` forward by the whole dead time, so a hero
   * who came back to a 45-minute walk would watch the panel say `0:12` while the victory screen
   * and the journal both said 45 min. `recordedDurationSeconds()` reads the trace, and it is the
   * one rule those two already read. One rule, three readers.
   *
   * Frozen while the auto-pause holds: `credited` counts elapsed time from the last fix, and a
   * standing hero still gets fixes, so without this the big figure keeps climbing under the words
   * "Standing still" and cancels them.
   */
  const { elapsedSeconds } = useSessionTimer();
  const [recorded, setRecorded] = useState(recordedDurationSeconds);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the timer is the pulse, not the value, so the body deliberately never reads it
  useEffect(() => {
    if (!track.paused) setRecorded(recordedDurationSeconds());
  }, [elapsedSeconds, track.paused]);

  return (
    <ExpeditionPanelView
      view={view}
      track={track}
      error={error}
      lastFix={lastFix}
      recentSpeedMps={recentSpeedMps}
      goal={goal}
      goalReached={goalReached}
      recordedSeconds={recorded}
      lapFromMs={lapFromMs}
      showPocketHint={quest === null || !screenStaysOn(quest, view)}
    />
  );
}
