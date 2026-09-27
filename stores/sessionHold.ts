import type { SessionStatus } from "./session";

/**
 * Whether a session holds today's reminder: on screen, or won and not saved yet (the victory screen
 * waits for an answer, and the session is only in the journal once it has one). A victory already
 * saved no longer holds anything.
 */
export function isSessionHeld(status: SessionStatus, savedSessionId: number | null): boolean {
  if (status === "idle") return false;
  return status !== "finished" || savedSessionId === null;
}
