import type { HealthPort, HealthRecord } from "../../src/healthExport/port";

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
 * a write with the same id replaces unless its version is lower (an equal one replaces too, as the
 * contract check measured on API 35), deleting an id it lacks is fine, a write without the
 * permission it needs is a SecurityException for the whole call, and a record refused for what it
 * holds is answered for that record alone (`upsertMany` in BatiHealthModule.kt).
 */
export function fakeHealthConnect() {
  const records = new Map<string, HealthRecord>();
  const distances = new Map<string, FakeDistance>();
  /** Every record that landed, by client id, in order. `calls.upsert` counts calls. */
  const writes: string[] = [];
  const calls = { upsert: 0, remove: 0, permission: 0, routeRequest: 0, forbidden: 0 };
  const state = {
    present: true,
    permitted: true,
    routePermitted: false,
    /** What `requestRoutePermission` answers. */
    routeGrant: true,
    /** The next N calls fail for the moment (a quota, Health Connect busy). */
    failWrites: 0,
    /** The Nth call (1-based, counted over the fake's life) fails for the moment. */
    failOnCall: 0,
    /** Client ids Health Connect refuses for what they hold. */
    refused: new Set<string>(),
    /** Once this many records landed, the permission is taken back in Android. */
    revokeAfterWrites: Number.POSITIVE_INFINITY,
    /** Once this many records landed, the call never answers: the process killed mid-batch. */
    hangAfterWrites: Number.POSITIVE_INFINITY,
    removeThrows: false,
    onUpsert: (_record: HealthRecord): Promise<void> | undefined => undefined,
  };

  const securityException = (what: string) => {
    calls.forbidden++;
    return Promise.reject(new Error(`SecurityException: ${what}`));
  };

  /** Rejects the whole call the way Health Connect would, before anything lands. */
  const check = (batch: HealthRecord[]): Promise<void> => {
    if (!state.permitted) return securityException("WRITE_EXERCISE");
    if (batch.some((r) => r.route !== null) && !state.routePermitted) {
      return securityException("WRITE_EXERCISE_ROUTE");
    }
    if (state.failOnCall === calls.upsert) {
      return Promise.reject(new Error("API call quota exceeded"));
    }
    if (state.failWrites > 0) {
      state.failWrites--;
      return Promise.reject(new Error("Health Connect said no"));
    }
    return Promise.resolve();
  };

  const land = (record: HealthRecord) => {
    const held = records.get(record.id);
    if (!held || held.version <= record.version) {
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
    upsertMany: async (batch) => {
      calls.upsert++;
      for (const record of batch) await state.onUpsert(record);
      await check(batch);
      const answers = batch.map((record) => {
        if (state.refused.has(record.id)) return "segment outside the session";
        land(record);
        return null;
      });
      if (writes.length >= state.revokeAfterWrites) state.permitted = false;
      // Landed in Health Connect, never marked in the ledger: the worst moment to be killed.
      if (writes.length >= state.hangAfterWrites) await new Promise<never>(() => {});
      return answers;
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
