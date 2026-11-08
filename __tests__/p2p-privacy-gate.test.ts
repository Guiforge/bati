import fs from "node:fs";
import path from "node:path";

import { RELAYS } from "../src/nostrRelay";

/**
 * F3 of docs/designs/p2p-sync/PLAN.md: a release that turns device-to-device sync on must ship the
 * privacy text that describes it (SPEC.md P2), and one that turns the internet meeting on must name
 * every relay it talks to, in both languages. The flags are build-time literals (src/p2p/flag.ts), so
 * what turns them on is a build file: this reads every one of them.
 */
const ROOT = path.join(__dirname, "..");
const read = (file: string) =>
  fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file), "utf8") : "";

const buildFiles = [
  "package.json",
  "eas.json",
  "app.json",
  ...fs.readdirSync(path.join(ROOT, ".github/workflows")).map((f) => `.github/workflows/${f}`),
];
const turnsOn = (flag: string) =>
  buildFiles.some((file) => new RegExp(`${flag}["']?\\s*[:=]\\s*["']?1`).test(read(file)));

const privacy = read("docs/legal/privacy.md");
const [english = "", french = ""] = privacy.split(/\n## Ce qui est stocké/);

describe("P2P privacy gate (P2, F3)", () => {
  test("the build files are read", () => {
    expect(read("package.json")).toContain('"name"');
  });

  test("P2P on in a release means the policy says what it does, in both languages", () => {
    if (!turnsOn("EXPO_PUBLIC_P2P_SYNC")) return;
    expect(english).toContain("Syncing two of your devices");
    expect(french).toContain("deux de tes appareils");
  });

  test("the internet meeting on in a release means the policy names every relay, in both languages", () => {
    if (!turnsOn("EXPO_PUBLIC_P2P_INTERNET")) return;
    for (const relay of RELAYS) {
      const host = new URL(relay).host;
      expect(english).toContain(host);
      expect(french).toContain(host);
    }
  });
});
