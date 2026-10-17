import fs from "node:fs";

import { MINIMUM_AGE } from "@/src/minimumAge";

const read = (p: string) => fs.readFileSync(p, "utf8");

test("the minimum age is 16, and every place that states it agrees (E4)", () => {
  expect(MINIMUM_AGE).toBe(16);
  const policy = read("docs/legal/privacy.md");
  expect(policy).toContain(`aged ${MINIMUM_AGE} and over`);
  expect(policy).toContain(`${MINIMUM_AGE} ans et plus`);
  expect(policy).not.toMatch(/under 13|moins de 13 ans/);
  for (const f of ["README.md", "PRODUCT.md", "docs/product/positioning.md"]) {
    expect(read(f)).toContain(`aged ${MINIMUM_AGE} and over`);
  }
});

test("every locale's children copy takes the age as a parameter", () => {
  for (const lang of ["en", "fr", "de", "es", "ru"]) {
    const copy = JSON.parse(read(`locales/${lang}.json`)) as { privacy: { children_body: string } };
    expect(copy.privacy.children_body).toContain("{{age}}");
  }
});
