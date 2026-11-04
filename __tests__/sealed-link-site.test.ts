import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { encode } from "uqr";

import { qrPath } from "../src/multiplayer/qrPath";
import vectors from "./fixtures/multiplayer/envelope-v1.json";

/**
 * The sealed link's half on getbati.app. Jekyll drops a dot folder it was not told about, with no
 * error, and App Links then quietly never verify. And the page's whole promise is that it sends
 * nothing, so that is what is checked, on the file that ships.
 */
const LEGAL = path.join(__dirname, "..", "docs", "legal");
const read = (...parts: string[]) => fs.readFileSync(path.join(LEGAL, ...parts), "utf8");

test("assetlinks.json is published and names every signing key in Android's own format", () => {
  expect(read("_config.yml")).toMatch(/include:\s*\n\s*- \.well-known/);
  const [statement] = JSON.parse(read(".well-known", "assetlinks.json"));
  expect(statement.target.package_name).toBe("com.guiforge.bati");
  expect(statement.relation).toEqual(["delegate_permission/common.handle_all_urls"]);
  for (const print of statement.target.sha256_cert_fingerprints) {
    expect(print).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  }
});

describe("the fallback page", () => {
  const page = read("d.html");
  const script = /<script>(.*)<\/script>/.exec(page)?.[1] ?? "";

  /** The button's address once the script has run on a page opened at `hash`. */
  const openHref = (hash: string) => {
    const open = { href: "bati://" };
    vm.runInNewContext(script, {
      location: { hash },
      document: { getElementById: (id: string) => (id === "open" ? open : null) },
    });
    return open.href;
  };

  test("answers on /d, and loads nothing", () => {
    expect(page).toContain("permalink: /d");
    expect(page).not.toMatch(/onclick=|onload=|<img|<link|src=/i);
    expect(page).toContain("default-src 'none'");
    expect(page).toContain('name="referrer" content="no-referrer"');
  });

  test("one script, the one the policy names, and it reaches for nothing but the button", () => {
    expect(page.match(/<script/g)).toHaveLength(1);
    const hash = createHash("sha256").update(script).digest("base64");
    expect(page).toContain(`script-src 'sha256-${hash}'`);
    expect(script).not.toMatch(
      /fetch|XMLHttp|sendBeacon|WebSocket|Storage|cookie|import|src|navigator/i,
    );
  });

  test("the button carries the link; with no script or no fragment it opens Bati empty", () => {
    expect(openHref("#AQIDBA")).toBe("bati://d#AQIDBA");
    expect(openHref("")).toBe("bati://");
    expect(page).toContain('<a id="open" href="bati://">');
  });
});

test("a link's code stays a comfortable size, and the path draws each dark module once", () => {
  const { data, size } = encode(vectors.invite.link, { ecc: "M", border: 0 });
  // Version 7 is 45 modules: an ordinary code, easy for any phone's camera at arm's length.
  expect(size).toBeLessThanOrEqual(45);
  const dark = data.flat().filter(Boolean).length;
  expect(qrPath(data).match(/M/g)).toHaveLength(dark);
});
