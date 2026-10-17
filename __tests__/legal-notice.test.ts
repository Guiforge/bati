import fs from "node:fs";

// F2: the LCEN (art. 6-III) notice. Its unknown fields are placeholders the publisher fills in,
// so this does not fail on them; it holds that the page exists, names the three parties and is
// linked from every page of the site.
test("the legal notice names publisher, host and contact, and the footer links it", () => {
  const page = fs.readFileSync("docs/legal/mentions-legales.md", "utf8");
  expect(page).toContain("permalink: /mentions-legales/");
  for (const needle of [
    "## Éditeur",
    "## Hébergeur du site",
    "GitHub Pages",
    "contact@getbati.app",
  ]) {
    expect(page).toContain(needle);
  }
  expect(fs.readFileSync("docs/legal/_layouts/default.html", "utf8")).toContain(
    'href="/mentions-legales/"',
  );
});
