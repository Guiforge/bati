import { SparedLegsNote } from "@/components/quests/SparedLegsNote";
import { useLivePanelProps } from "@/hooks/useLivePanelProps";
import { ExpeditionPanelView } from "./ExpeditionPanelView";

/**
 * `bigOnMap`: the big figure floats on the map (`MapBigFigure`), so the panel leaves it out and the
 * map takes the slack. Both read `useLivePanelProps`, one source for two readers. Each mounts its
 * own `useSessionTimer` (one tick a second apiece), accepted rather than lifting state a level.
 */
export function ExpeditionPanel({ bigOnMap = false }: { bigOnMap?: boolean }) {
  const props = useLivePanelProps();
  // A tile starts a run in one tap, so the run says it too, not only the optional goal sheet.
  return (
    <ExpeditionPanelView
      {...props}
      hideBig={bigOnMap}
      note={<SparedLegsNote locomotion={props.view.locomotion} />}
    />
  );
}
