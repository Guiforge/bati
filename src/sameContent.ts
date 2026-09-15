/**
 * The previous value when the next one holds the same content, the next one otherwise: for a
 * `setState` fed a fresh `Map`, `Set` or object on every focus.
 *
 * A new identity with the same content still invalidates everything the compiler memoized on it,
 * which rebuilt the quest gallery's 37 cards on every return to the tab (perf audit, 2026-09-15).
 * JSON is enough for what goes through here: small, plain, and read from the database.
 */
export function keepIfSame<T extends object | null>(previous: T, next: T): T {
  const json = (value: T) =>
    JSON.stringify(value instanceof Map || value instanceof Set ? [...value] : value);
  return json(previous) === json(next) ? previous : next;
}
