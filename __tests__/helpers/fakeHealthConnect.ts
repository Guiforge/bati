import { type HealthPort, type HealthRecord, HealthRefused } from "../../src/healthExport/port";

export type FakeDistance = {
  id: string;
  version: number;
  meters: number;
  start: number;
  end: number;
};

/**
 * Health Connect as it behaves (connect-client 1.1.0, "write data", checked on an API 35 emulator
 * in W-04 PR 1 and by `scripts/health-connect-contract.sh`): one record per client id and class,
 * a write with the same id replaces only when its version is higher, deleting an id it lacks is
 * fine, and a write without the permission it needs is a SecurityException.
 */
export function fakeHealthConnect() {
  const records = new Map<string, HealthRecord>();
  const distances = new Map<string, FakeDistance>();
  /** Every upsert that landed, by client id, in order. */
  const writes: string[] = [];
  const calls = { upsert: 0, remove: 0, permission: 0, routeRequest: 0, forbidden: 0 };
  const state = {
    present: true,
    permitted: true,
    routePermitted: false,
    /** What `requestRoutePermission` answers. */
    routeGrant: true,
    /** Transient failures for the next N writes. */
    failWrites: 0,
    /** The Nth upsert call (1-based, counted over the fake's life) fails transiently. */
    failOnCall: 0,
    /** Client ids Health Connect refuses for what they hold. */
    refused: new Set<string>(),
    /** After this many landed writes, the permission is taken back in Android. */
    revokeAfterWrites: Number.POSITIVE_INFINITY,
    removeThrows: false,
    onUpsert: (_record: HealthRecord): Promise<void> | undefined => undefined,
  };

  const securityException = (what: string) => {
    calls.forbidden++;
    return Promise.reject(new Error(`SecurityException: ${what}`));
  };

  /** Rejects the way Health Connect would, before anything lands. */
  const check = (record: HealthRecord): Promise<void> => {
    if (!state.permitted) return securityException("WRITE_EXERCISE");
    if (record.route !== null && !state.routePermitted) {
      return securityException("WRITE_EXERCISE_ROUTE");
    }
    if (state.refused.has(record.id)) {
      return Promise.reject(new HealthRefused("segment outside the session"));
    }
    if (state.failOnCall === calls.upsert) {
      return Promise.reject(new Error("Rate limited request quota"));
    }
    if (state.failWrites > 0) {
      state.failWrites--;
      return Promise.reject(new Error("Health Connect said no"));
    }
    return Promise.resolve();
  };

  const port: HealthPort = {
    available: () => state.present,
    hasPermission: () => {
      calls.permission++;
      return Promise.resolve(state.permitted);
    },
    requestPermission: () => Promise.resolve(state.permitted),
    hasRoutePermission: () => Promise.resolve(state.routePermitted),
    requestRoutePermission: () => {
      calls.routeRequest++;
      state.routePermitted = state.routeGrant;
      return Promise.resolve(state.routeGrant);
    },
    upsert: async (record) => {
      calls.upsert++;
      await state.onUpsert(record);
      await check(record);
      const held = records.get(record.id);
      if (!held || held.version < record.version) {
        records.set(record.id, record);
        if (record.distance) {
          distances.set(record.distance.id, {
            ...record.distance,
            version: record.version,
            start: record.start,
            end: record.end,
          });
        }
      }
      if (!record.distance) distances.delete(`${record.id}-distance`);
      writes.push(record.id);
      if (writes.length >= state.revokeAfterWrites) state.permitted = false;
    },
    remove: (ids) => {
      calls.remove++;
      if (state.removeThrows) return Promise.reject(new Error("Health Connect busy"));
      for (const id of ids) {
        records.delete(id);
        distances.delete(id);
      }
      return Promise.resolve();
    },
    openSettings: () => {},
  };
  return { records, distances, writes, calls, state, port };
}

export type FakeHealthConnect = ReturnType<typeof fakeHealthConnect>;
