/**
 * The native key derivation (Argon2id) needs tens of MiB at once and refuses, rather than take the
 * app down, when the phone cannot give it. The module raises a coded error for that, and older
 * builds of it only put the word in the message: both are the same answer, and it is the one
 * failure a hero can fix themselves (close other apps, try again), so it gets its own sentence.
 */
export const LOW_MEMORY = "LOW_MEMORY";

export function isLowMemory(error: unknown): boolean {
  return (
    (error as { code?: unknown } | null)?.code === LOW_MEMORY || String(error).includes(LOW_MEMORY)
  );
}
