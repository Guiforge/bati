import { blockedLicenses } from "@/scripts/license-lib";

const verdict = (licenses: string | string[]) =>
  blockedLicenses({ "x@1": { licenses } }).length > 0;

test.each([
  "GPL-2.0",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "AGPL-3.0-only",
  "LGPL-3.0-or-later",
  "SSPL-1.0",
  "BUSL-1.1",
  "UNLICENSED",
  "GPLv3",
  "MIT AND GPL-3.0-only",
  "(MIT OR GPL-2.0) AND LGPL-3.0-only",
  "GPL-2.0 OR GPL-3.0",
])("%s is blocked", (license) => {
  expect(verdict(license)).toBe(true);
});

test.each([
  "MIT",
  "Unlicense",
  "MPL-2.0",
  "CC-BY-4.0",
  "MIT AND OFL-1.1",
  "UNKNOWN",
  // node-forge, in the shipped tree: we take the BSD arm.
  "(BSD-3-Clause OR GPL-2.0)",
])("%s passes", (license) => {
  expect(verdict(license)).toBe(false);
});

test("a package listing several licences is blocked by any one of them", () => {
  expect(verdict(["MIT", "GPL-3.0-only"])).toBe(true);
});

test("a package with no licence field is not this gate's call", () => {
  expect(blockedLicenses({ "x@1": {} })).toEqual([]);
});

test("the report names the package and the licence", () => {
  expect(blockedLicenses({ "x@1": { licenses: "GPL-3.0-only" } })).toEqual(["x@1: GPL-3.0-only"]);
});
