import fs from "node:fs";
import path from "node:path";

/**
 * The P2P sockets live in Kotlin, where noJsNetwork.grit cannot see them (SPEC.md §5). This reads
 * that source instead: it may listen on the LAN and connect to the addresses JS hands it, and
 * nothing else. Comments are stripped first, since the module's header names what it must not do.
 */
const DIR = path.join(__dirname, "../modules/bati-p2p/android/src/main/java/expo/modules/batip2p");

const code = (file: string) =>
  fs
    .readFileSync(path.join(DIR, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

describe("bati-p2p native surface (P1)", () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".kt"));

  test("the module has source to read", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test.each(files)("%s opens no URL, no HTTP connection, and names no host", (file) => {
    const source = code(file);
    expect(source).not.toMatch(/\bURL\(/);
    expect(source).not.toMatch(/HttpURLConnection|HttpsURLConnection|OkHttp/);
    // One parse is allowed: P2pCore.parseLiteral, reached only through isLiteral, so never a lookup.
    const lookups = source.replace(
      "fun parseLiteral(host: String): InetAddress = InetAddress.getByName(host)",
      "",
    );
    expect(lookups).not.toMatch(/getByName\(|getAllByName\(/);
    expect(source).not.toMatch(/"[a-z0-9-]+\.(com|org|net|io|app|fr)"/i);
  });
});
