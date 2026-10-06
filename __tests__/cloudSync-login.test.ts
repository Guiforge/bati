/**
 * What reaches the network, and the phone, from a server's answer. The server names the login
 * page to open and the endpoint to poll; a hostile or broken one must not steer the phone to
 * another app or another host, and must not rename the account the hero typed.
 */
import assert from "node:assert/strict";

const mockOpened: string[] = [];
jest.mock("react-native", () => ({
  Linking: {
    openURL: (url: string) =>
      Promise.resolve().then(() => {
        mockOpened.push(url);
      }),
  },
}));

import {
  isOnThisDevice,
  loginToNextcloud,
  nextcloudTarget,
  revokeNextcloudAppPassword,
} from "@/src/cloudSync";

function serverAnswers(login: string, done: object) {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ login, poll: { token: "t", endpoint: "https://cloud.test/poll" } }),
    })
    .mockResolvedValue({ ok: true, json: () => Promise.resolve(done) }) as unknown as typeof fetch;
}

beforeEach(() => {
  mockOpened.length = 0;
});

test("a login page that is not a web address on the server is never opened", async () => {
  serverAnswers("intent://evil#Intent;end", {});
  await expect(loginToNextcloud("http://cloud.test", () => false)).rejects.toThrow("outside");
  expect(mockOpened).toEqual([]);
});

test("the account keeps the address the hero typed, not the one the server reports", async () => {
  jest.useFakeTimers();
  serverAnswers("https://cloud.test/login", {
    server: "https://elsewhere.test",
    loginName: "hero",
    appPassword: "p",
  });
  const account = loginToNextcloud("cloud.test", () => false);
  await jest.advanceTimersByTimeAsync(2_500);
  expect((await account)?.server).toBe("https://cloud.test");
  expect(mockOpened).toEqual(["https://cloud.test/login"]);
  jest.useRealTimers();
});

test("files go under the user id, which is not the login name for an email sign-in", async () => {
  jest.useFakeTimers();
  const done = { server: "https://cloud.test", loginName: "hero@mail.test", appPassword: "p" };
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          login: "https://cloud.test/login",
          poll: { token: "t", endpoint: "https://cloud.test/poll" },
        }),
    })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(done) })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ocs: { data: { id: "hero42" } } }),
    }) as unknown as typeof fetch;
  const account = loginToNextcloud("cloud.test", () => false);
  await jest.advanceTimersByTimeAsync(2_500);
  const signedIn = await account;
  assert(signedIn);
  expect(nextcloudTarget(signedIn).folderUrl).toBe(
    "https://cloud.test/remote.php/dav/files/hero42/Bati",
  );
  // Still signs in with the login name: that is what the app password belongs to.
  expect(nextcloudTarget(signedIn).user).toBe("hero@mail.test");
  jest.useRealTimers();
});

test("an approval that lands after cancel does not connect", async () => {
  jest.useFakeTimers();
  serverAnswers("https://cloud.test/login", { loginName: "hero", appPassword: "p" });
  let cancelled = false;
  const account = loginToNextcloud("cloud.test", () => cancelled);
  await jest.advanceTimersByTimeAsync(1_000);
  cancelled = true;
  await jest.advanceTimersByTimeAsync(2_000);
  expect(await account).toBeNull();
  jest.useRealTimers();
});

test.each([
  ["http://127.0.0.1:8080", true],
  ["http://localhost/dav", true],
  ["http://nas.local", false],
  ["http://127.0.0.1.evil.test", false],
])("%s is on this phone: %p", (url, expected) => {
  expect(isOnThisDevice(url)).toBe(expected);
});

const flowStart = {
  ok: true,
  json: () =>
    Promise.resolve({
      login: "https://cloud.test/login",
      poll: { token: "t", endpoint: "https://cloud.test/poll" },
    }),
};
const approved = {
  ok: true,
  json: () =>
    Promise.resolve({ server: "https://cloud.test", loginName: "hero", appPassword: "p" }),
};

test("a server that refuses to start the login flow is an error, and no page is opened", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
  await expect(loginToNextcloud("cloud.test", () => false)).rejects.toThrow(
    "Login flow refused: HTTP 503",
  );
  expect(mockOpened).toEqual([]);
});

test("a poll the server answers 404 (not yet) or drops is retried, and the next approval connects", async () => {
  jest.useFakeTimers();
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(flowStart)
    .mockResolvedValueOnce({ ok: false, status: 404 })
    .mockRejectedValueOnce(new Error("Network request failed"))
    .mockResolvedValueOnce(approved)
    // No answer on the user id: the account stays without one.
    .mockResolvedValueOnce({ ok: false, status: 404 }) as unknown as typeof fetch;
  const account = loginToNextcloud("cloud.test", () => false);
  await jest.advanceTimersByTimeAsync(7_000);
  const signedIn = await account;
  assert(signedIn);
  expect(signedIn.userId).toBeUndefined();
  expect(nextcloudTarget(signedIn).folderUrl).toBe("https://cloud.test/remote.php/webdav/Bati");
  jest.useRealTimers();
});

test("the app password is revoked when the server says ok, and not when it refuses or is unreachable", async () => {
  const account = { server: "https://cloud.test", loginName: "hero", appPassword: "p" };
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  expect(await revokeNextcloudAppPassword(account)).toBe(true);
  global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
  expect(await revokeNextcloudAppPassword(account)).toBe(false);
  global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
  expect(await revokeNextcloudAppPassword(account)).toBe(false);
});
