import { normaliseServer, parseListing } from "@/src/cloudSync";

/**
 * Captured from a real Nextcloud 34 (podman, 2026-09-25) after one upload into the sync folder:
 * the folder itself comes first, and the etags arrive wrapped in escaped quotes.
 */
const NEXTCLOUD_34 = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:s="http://sabredav.org/ns" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns"><d:response><d:href>/remote.php/dav/files/hero/Bati/</d:href><d:propstat><d:prop><d:getetag>&quot;6ab6cb45969dd&quot;</d:getetag></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response><d:response><d:href>/remote.php/dav/files/hero/Bati/bati-0190a000-0000-7000-8000-000000000001.batb</d:href><d:propstat><d:prop><d:getetag>&quot;d3551e403d2c690971ab11794e4961e4&quot;</d:getetag></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>`;

test("a real Nextcloud listing yields the files, not the folder, with bare etags", () => {
  expect(parseListing(NEXTCLOUD_34)).toEqual([
    {
      name: "bati-0190a000-0000-7000-8000-000000000001.batb",
      etag: "d3551e403d2c690971ab11794e4961e4",
    },
  ]);
});

test("an empty folder is an empty list, not an error", () => {
  const onlyFolder = NEXTCLOUD_34.replace(
    /<d:response><d:href>[^<]*\.batb[\s\S]*?<\/d:response>/,
    "",
  );
  expect(parseListing(onlyFolder)).toEqual([]);
});

test.each([
  ["cloud.example.org", "https://cloud.example.org"],
  ["https://cloud.example.org/", "https://cloud.example.org"],
  ["  http://10.0.2.2:8090// ", "http://10.0.2.2:8090"],
])("the server %p is read as %p", (input, expected) => {
  expect(normaliseServer(input)).toBe(expected);
});
