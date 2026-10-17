/**
 * The youngest hero Bati is meant for (D-45: the French age of digital consent for health data, 16).
 * The copy that says it is `privacy.children_body`, which takes it as `{{age}}`; the published
 * policy (docs/legal/privacy.md), README.md and docs/product/positioning.md state the same number,
 * and __tests__/minimum-age.test.ts fails when one of them drifts. There is no age gate by design:
 * the app collects no personal data to check an age against.
 */
export const MINIMUM_AGE = 16;
