import { type AuditReport, unlistedAdvisories } from "@/scripts/audit-lib";

const adv = (name: string, severity: string, id: string) => ({
  name,
  severity,
  url: `https://github.com/advisories/${id}`,
  title: "t",
});
const report: AuditReport = {
  vulnerabilities: {
    a: { via: [adv("a", "high", "GHSA-1"), "b"] },
    b: { via: [adv("b", "moderate", "GHSA-2"), adv("b", "critical", "GHSA-3")] },
    c: { via: [adv("a", "high", "GHSA-1")] },
  },
};

test("only high and critical advisories count, once each, and the allowlist silences by id (G2)", () => {
  expect(unlistedAdvisories(report, []).map((a) => a.id)).toEqual(["GHSA-1", "GHSA-3"]);
  expect(unlistedAdvisories(report, [{ id: "GHSA-1", reason: "x" }]).map((a) => a.id)).toEqual([
    "GHSA-3",
  ]);
});
