import fs from "node:fs";

// F2: the LCEN (art. 6-III) notice is kept as a draft (owner decision of 18/10): Pages does not
// build it and nothing links to it until the publisher fills in the unknown fields.
test("the legal notice is a draft that Pages skips and no page links", () => {
  const page = fs.readFileSync("docs/legal/mentions-legales.md", "utf8");
  expect(page).toContain("status: draft");
  expect(page).toContain("published: false");
  for (const needle of [
    "## Éditeur",
    "## Hébergeur du site",
    "GitHub Pages",
    "contact@getbati.app",
  ]) {
    expect(page).toContain(needle);
  }
  for (const f of [
    "docs/legal/_layouts/default.html",
    "docs/legal/index.html",
    "docs/legal/privacy.md",
  ]) {
    expect(fs.readFileSync(f, "utf8")).not.toContain("mentions-legales");
  }
});
