// INTEGRATION and ALENTOURS: all on in a local build (dev, .perf), all off in a published one
// (application id exactly com.guiforge.bati) and under jest.

const flags = (opts: { dev: boolean; uri: string; env: string }) => {
  const g = globalThis as { __DEV__?: boolean };
  const avant = [g.__DEV__, process.env.NODE_ENV] as const;
  g.__DEV__ = opts.dev;
  (process.env as Record<string, string>).NODE_ENV = opts.env;
  try {
    let out: typeof import("@/constants/isoPoc") | undefined;
    jest.isolateModules(() => {
      jest.doMock("expo-file-system", () => ({ Paths: { document: { uri: opts.uri } } }));
      out = require("@/constants/isoPoc");
    });
    return out;
  } finally {
    g.__DEV__ = avant[0];
    (process.env as Record<string, string | undefined>).NODE_ENV = avant[1];
  }
};

const PUBLIE = "file:///data/user/0/com.guiforge.bati/files/";
const tout = (m: NonNullable<ReturnType<typeof flags>>) => Object.values(m.ALENTOURS);

describe("the iso flags by build", () => {
  test("a published build keeps everything off", () => {
    const m = flags({ dev: false, uri: PUBLIE, env: "production" });
    expect(m?.INTEGRATION).toBe(false);
    expect(m && tout(m)).toEqual([false, false, false, false]);
  });

  test("a .perf release turns everything on", () => {
    const m = flags({
      dev: false,
      uri: "file:///data/user/0/com.guiforge.bati.perf/files/",
      env: "production",
    });
    expect(m?.INTEGRATION).toBe(true);
    expect(m && tout(m)).toEqual([true, true, true, true]);
  });

  test("a dev client turns everything on", () => {
    const m = flags({ dev: true, uri: PUBLIE, env: "development" });
    expect(m?.INTEGRATION).toBe(true);
    expect(m && tout(m)).toEqual([true, true, true, true]);
  });

  test("jest sees the shipped values although __DEV__ is true", () => {
    const m = flags({ dev: true, uri: PUBLIE, env: "test" });
    expect(m?.INTEGRATION).toBe(false);
    expect(m && tout(m)).toEqual([false, false, false, false]);
  });
});
