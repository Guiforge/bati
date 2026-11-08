import type { Session } from "./session";

/**
 * The session the sync sheet holds open, if any: what the P2P `Remote` talks through, and what tells
 * the sync store a run has someone to talk to (rule S7). A module of its own so that store does not
 * load the transfer code, the cipher and the database just to ask.
 */
let current: Session | null = null;

export const currentSession = () => current;

export function setCurrentSession(session: Session | null): void {
  current = session;
}
