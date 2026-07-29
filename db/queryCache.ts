// Tiny in-memory cache of detail-query results, so a screen you've already opened
// can paint instantly on revisit instead of showing a loading card while SQLite
// re-runs the same query. Write-through from the getXById helpers; detail screens
// seed their initial state from a synchronous peek, then still refetch to revalidate.
//
// ponytail: unbounded Map, cleared only on app restart. A session's worth of detail
// views is a handful of entries; add an LRU cap if that ever stops being true.
const cache = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T): void {
  cache.set(key, value);
}

/** Drop every entry under a key prefix — a quest is cached once per level, so edits clear all. */
export function clearCached(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

const inflight = new Map<string, { at: number; promise: Promise<unknown> }>();

/**
 * Memoize a query promise for a few seconds. Several cards on one screen ask for the same
 * aggregate in the same mount/focus burst (streak ×3, muscle balance ×2, level info ×2 on
 * Home) — every query is a synchronous SQLite call on the JS thread, so each duplicate is
 * paid in dropped frames. A short TTL dedupes the burst without invalidation plumbing:
 * anything that changes these aggregates (finishing a session) takes minutes, not seconds.
 */
/** Drop every short-lived memo — for tests that rewrite the DB between cases. */
export function clearShortLivedQueries(): void {
  inflight.clear();
}

export function shortLivedQuery<T>(key: string, run: () => Promise<T>, ttlMs = 5000): Promise<T> {
  const hit = inflight.get(key);
  const now = Date.now();
  if (hit && now - hit.at < ttlMs) return hit.promise as Promise<T>;
  const promise = run();
  promise.catch(() => {
    // don't cache a failure - let the next caller retry
    if (inflight.get(key)?.promise === promise) inflight.delete(key);
  });
  inflight.set(key, { at: now, promise });
  return promise;
}
