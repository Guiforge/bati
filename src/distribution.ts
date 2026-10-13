/**
 * Which build this is. The one place that reads `EXPO_PUBLIC_DISTRIBUTION`: everything that
 * behaves differently by channel imports a flag from here instead of asking the environment again.
 *
 * - `fdroid`: built and signed by f-droid.org, whose recipe writes the variable to `.env`.
 * - `github`: the APK on GitHub Releases, which our own F-Droid repository also serves. Signed
 *   with our key. Also what a dev build and any local build are, since nothing sets the variable.
 * - `play`: the AAB sent to Google Play, same key (Play App Signing uses our exported one).
 *
 * `.github/workflows/release.yml` builds `github` and `play` from one tag, see docs/fdroid.md
 * § Three distributions.
 */
const DISTRIBUTIONS = ["fdroid", "github", "play"] as const;

function parse(value: string): (typeof DISTRIBUTIONS)[number] {
  const known = DISTRIBUTIONS.find((d) => d === value);
  // Thrown at import, so a recipe or a workflow with a typo dies in the first test or the first
  // frame instead of quietly shipping as some other channel.
  if (!known) {
    throw new Error(
      `EXPO_PUBLIC_DISTRIBUTION is "${value}", expected one of ${DISTRIBUTIONS.join(", ")}`,
    );
  }
  return known;
}

// A literal read: Babel inlines it at build time, a dynamic one would be `undefined`.
export const DISTRIBUTION = parse(process.env.EXPO_PUBLIC_DISTRIBUTION ?? "github");

/**
 * Only the hand-installed APK needs telling about a new version, and only it can follow the card:
 *
 * - f-droid.org signs with its own key, so the GitHub APK cannot install over its build, and
 *   uninstalling first deletes the hero (docs/fdroid.md § The signing key).
 * - Play updates the app itself, and a card that walks a Play user to an APK outside the store is
 *   a risk against its policies for nothing.
 */
export const UPDATE_CHECK_OFFERED = DISTRIBUTION === "github";
