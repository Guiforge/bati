/**
 * What reaches the network, and the phone, from a server's answer. The server names the login
 * page to open and the endpoint to poll; a hostile or broken one must not steer the phone to
 * another app or another host, and must not rename the account the hero typed.
 */
const mockOpened: string[] = [];
jest.mock("react-native", () => ({
  Linking: {
    openURL: (url: string) =>
      Promise.resolve().then(() => {
        mockOpened.push(url);
      }),
  },
}));

import { isOnThisDevice, loginToNextcloud } from "@/src/cloudSync";

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

test.each([
  ["http://127.0.0.1:8080", true],
  ["http://localhost/dav", true],
  ["http://nas.local", false],
  ["http://127.0.0.1.evil.test", false],
])("%s is on this phone: %p", (url, expected) => {
  expect(isOnThisDevice(url)).toBe(expected);
});
