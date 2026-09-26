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

import { isOnThisDevice, loginToNextcloud, nextcloudTarget } from "@/src/cloudSync";

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
