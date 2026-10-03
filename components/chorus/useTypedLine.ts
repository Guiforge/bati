import { useEffect, useState } from "react";

import { MOMENT_CAST, TYPE_MS_PER_CHAR } from "@/constants/villagers";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { Cameo } from "@/stores/chorus";

/**
 * How much of a villager's line is visible, shared by the Village's figure and `VillagerLine`.
 *
 * Guides and events type themselves out; ambient never does (a villager glanced at between two
 * sets must not be something the hero has to finish reading), and reduced motion switches the
 * typewriter off, a typewriter being motion. Callers render `shown` opaque and `rest`
 * transparent, so the line is its final size from the first character.
 */
export function useTypedLine(current: Cameo | null): {
  shown: string;
  rest: string;
  done: boolean;
} {
  const reducedMotion = useReducedMotion();
  const line = current?.line ?? "";
  const types = !!current && MOMENT_CAST[current.moment].priority !== "ambient" && !reducedMotion;
  // Keyed on the cameo: a count left over from the previous line is not this line's, or a new guide
  // would be drawn for one frame with as many characters as the last line had, then blanked.
  const [typed, setTyped] = useState({ id: -1, count: 0 });

  useEffect(() => {
    if (!(current && types)) return;

    // A local counter rather than a functional update that clears its own interval: a state
    // updater that has a side effect in it runs twice under StrictMode and types at double speed.
    let count = 0;
    const typing = setInterval(() => {
      count += 1;
      setTyped({ id: current.id, count });
      if (count >= line.length) clearInterval(typing);
    }, TYPE_MS_PER_CHAR);

    return () => clearInterval(typing);
  }, [current, types, line]);

  const revealed = !types ? line.length : typed.id === current?.id ? typed.count : 0;

  return {
    shown: line.slice(0, revealed),
    rest: line.slice(revealed),
    done: revealed >= line.length,
  };
}
