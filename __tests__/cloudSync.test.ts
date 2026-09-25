import { nextcloudTarget, normaliseServer, parseListing, webdavTarget } from "@/src/cloudSync";

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
      // This capture carries no `getlastmodified`: 0, which sorts it last and breaks nothing.
      modified: 0,
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

/**
 * Captured from Apache mod_dav (bytemark/webdav in podman, 2026-09-25): `D:` and `lp1:` prefixes,
 * the folder marked by `<D:collection/>`, and a 404 propstat for the folder's missing length.
 */
const APACHE = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:ns0="DAV:">
<D:response xmlns:lp1="DAV:" xmlns:lp2="http://apache.org/dav/props/" xmlns:g0="DAV:">
<D:href>/Bati/</D:href>
<D:propstat>
<D:prop>
<lp1:getetag>"5c-65c54d08e4063"</lp1:getetag>
<lp1:getlastmodified>Fri, 25 Sep 2026 20:46:46 GMT</lp1:getlastmodified>
<lp1:resourcetype><D:collection/></lp1:resourcetype>
</D:prop>
<D:status>HTTP/1.1 200 OK</D:status>
</D:propstat>
<D:propstat>
<D:prop>
<g0:getcontentlength/>
</D:prop>
<D:status>HTTP/1.1 404 Not Found</D:status>
</D:propstat>
</D:response>
<D:response xmlns:lp1="DAV:" xmlns:lp2="http://apache.org/dav/props/">
<D:href>/Bati/bati-0190a000-0000-7000-8000-000000000001.batb</D:href>
<D:propstat>
<D:prop>
<lp1:getetag>"1-65c54d08e4063"</lp1:getetag>
<lp1:getlastmodified>Fri, 25 Sep 2026 20:46:46 GMT</lp1:getlastmodified>
<lp1:getcontentlength>1</lp1:getcontentlength>
<lp1:resourcetype/>
</D:prop>
<D:status>HTTP/1.1 200 OK</D:status>
</D:propstat>
</D:response>
</D:multistatus>`;

test("an Apache listing is read whatever its namespace prefixes", () => {
  expect(parseListing(APACHE)).toEqual([
    {
      name: "bati-0190a000-0000-7000-8000-000000000001.batb",
      etag: "1-65c54d08e4063",
      modified: Date.parse("Fri, 25 Sep 2026 20:46:46 GMT"),
    },
  ]);
});

test("a server with no etag is versioned by modification time and size", () => {
  const noEtag = APACHE.replace(/<lp1:getetag>[^<]*<\/lp1:getetag>/g, "");
  expect(parseListing(noEtag)).toEqual([
    {
      name: "bati-0190a000-0000-7000-8000-000000000001.batb",
      etag: "Fri, 25 Sep 2026 20:46:46 GMT|1",
      modified: Date.parse("Fri, 25 Sep 2026 20:46:46 GMT"),
    },
  ]);
});

test("a sub-folder without a trailing slash is still skipped by its resource type", () => {
  const folder = APACHE.replace("<D:href>/Bati/</D:href>", "<D:href>/Bati</D:href>");
  expect(parseListing(folder).map((f) => f.name)).toEqual([
    "bati-0190a000-0000-7000-8000-000000000001.batb",
  ]);
});

test("Nextcloud keeps its files under the user's root; any other server under its address", () => {
  expect(
    nextcloudTarget({ server: "https://cloud.test", loginName: "hé ro", appPassword: "p" }),
  ).toEqual({
    folderUrl: "https://cloud.test/remote.php/dav/files/h%C3%A9%20ro/Bati",
    user: "hé ro",
    password: "p",
  });
  expect(webdavTarget("https://app.koofr.net/dav/Koofr/", "hero", "p").folderUrl).toBe(
    "https://app.koofr.net/dav/Koofr/Bati",
  );
  expect(webdavTarget("http://127.0.0.1:8080", "hero", "p").folderUrl).toBe(
    "http://127.0.0.1:8080/Bati",
  );
});
