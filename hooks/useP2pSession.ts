import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Network from "expo-network";
import { useEffect, useRef, useState } from "react";

import { connectP2p } from "@/src/deviceSync";
import { openSession, type Role, type Session, type SessionView } from "@/src/p2p/session";
import { reportError } from "@/src/reportError";
import { useExpeditionStore } from "@/stores/expedition";
import { isSessionLive, useSessionStore } from "@/stores/session";
import { useSyncStore } from "@/stores/sync";

const KEEP_AWAKE_TAG = "p2p-session";

/** What stops a session before it opens (rule S7b, B23). */
export type P2pNotice = "offline" | "busy";

/**
 * The lifecycle of one device-to-device session behind the sheet: the screen stays on while the
 * sheet is open (rule U2), closing it or unmounting cancels the session, and the callbacks of a
 * session that was replaced or cancelled are ignored. No `useCallback`: the React Compiler
 * memoises what this returns.
 */
export function useP2pSession(open: boolean, onLinked?: () => void) {
  const [view, setView] = useState<SessionView | null>(null);
  const [notice, setNotice] = useState<P2pNotice | null>(null);
  const [linked, setLinked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const current = useRef<Session | null>(null);
  // Bumped at every start and stop: a late callback from an older session finds it changed.
  const generation = useRef(0);

  const reset = () => {
    generation.current += 1;
    current.current?.cancel();
    current.current = null;
    setView(null);
    setNotice(null);
    setLinked(null);
    setDone(false);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reset` only touches refs and setters; opening is the trigger.
  useEffect(() => {
    if (!open) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch((e) => reportError("p2p.keepAwake", e));
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch((e) => reportError("p2p.keepAwake", e));
      reset();
    };
  }, [open]);

  return {
    view,
    notice,
    linked,
    done,
    stop: reset,
    /** A's yes or no to "Link {name}?". */
    confirm: (yes: boolean) => current.current?.confirm(yes),
    /** Opens a session, unless this device cannot take part right now. */
    begin: async (role: Role) => {
      reset();
      const mine = generation.current;
      // S7b, S5b: a workout, an outing tracking GPS, or a timer running keeps sync away.
      if (
        isSessionLive(useSessionStore.getState().status) ||
        useExpeditionStore.getState().sessionUuid !== null
      ) {
        setNotice("busy");
        return;
      }
      // A device with no network at all can find nobody; a Wi-Fi without internet is fine (LAN only).
      const network = await Network.getNetworkStateAsync().catch(() => null);
      if (generation.current !== mine) return;
      if (network !== null && network.isConnected === false) {
        setNotice("offline");
        return;
      }
      setView({ step: "waiting" });
      let passes: Promise<void> = Promise.resolve();
      current.current = openSession(role, {
        onChange: (next) => {
          if (generation.current === mine) setView(next);
        },
        onLinked: async (link) => {
          await connectP2p(link);
          if (generation.current !== mine) return;
          setLinked(link.name);
          onLinked?.();
        },
        // S2b: a pass per file that arrives, one after the other. The store drops a run asked for
        // while one is going, and the second file arrives while the first pass waits for its ack.
        onPeerFile: () => {
          passes = passes
            .then(() => useSyncStore.getState().run({ snapshotFirst: true, force: true }))
            .then(() => {
              if (generation.current === mine && useSyncStore.getState().failure === null)
                setDone(true);
            })
            .catch((e) => reportError("p2p.run", e));
        },
      });
    },
  };
}
