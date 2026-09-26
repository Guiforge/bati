import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Plain HTTP is allowed to this phone and to nothing else (plugins/withAndroidNetworkSecurity.js).
 * Pinned on the committed prebuild output: a widened release config would let a WebDAV password
 * cross a café's Wi-Fi in clear, and nothing on screen would say so.
 */
const src = join(__dirname, "..", "android", "app", "src");
const read = (...parts: string[]) => readFileSync(join(src, ...parts), "utf8");

test("the release build allows cleartext to localhost and 127.0.0.1 only", () => {
  expect(read("main", "AndroidManifest.xml")).toContain(
    'android:networkSecurityConfig="@xml/bati_network_security"',
  );

  const release = read("main", "res", "xml", "bati_network_security.xml");
  expect(release).toContain('<base-config cleartextTrafficPermitted="false" />');
  const domains = [...release.matchAll(/<domain[^>]*>([^<]+)<\/domain>/g)].map((m) => m[1]);
  expect(domains).toEqual(["localhost", "127.0.0.1"]);
});

test("only the debug build, which loads its bundle from Metro, allows cleartext everywhere", () => {
  expect(read("debug", "res", "xml", "bati_network_security.xml")).toContain(
    '<base-config cleartextTrafficPermitted="true" />',
  );
});
