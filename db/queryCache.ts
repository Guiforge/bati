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
