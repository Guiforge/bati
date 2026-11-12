# Play Console: Health Connect declaration and Data safety (W-04)

Ready to paste. Nothing here is submitted by the repository; Guillaume fills the Play Console by
hand, **before** the tag that ships W-04 reaches the `play` job (a build that requests Health
Connect permissions without an approved declaration is rejected at review).

What the app does, in one sentence (the same meaning as `docs/legal/privacy.md`, the listings and
the in-app lines): *Off by default, Bati writes the sessions and outings finished on the phone to
Health Connect, with an outing's distance and, only if the hero turns it on, its GPS route; past
sessions only when the hero asks; it reads nothing from Health Connect.*

Source of truth for the permissions: `modules/bati-health/android/src/main/AndroidManifest.xml`,
guarded by `__tests__/android-permissions.test.ts` (exactly these three, any other health
permission fails the build).

## 1. App content > Health apps

**Does your app have health features?** Yes.

**Categories** (tick only this one): *Activity and fitness*.

Do **not** tick anything medical: the listing says *not a medical device*, and nothing in Bati
diagnoses, treats or monitors a condition.

## 2. App content > Health Connect permissions

One row per permission. Access: **write** for all three, no read.

| Permission | Data type | Why Bati needs it (paste) |
|---|---|---|
| `android.permission.health.WRITE_EXERCISE` | Exercise | Bati is a bodyweight training app. When the user turns on "Send my sessions to Health Connect" in Settings, each workout or outing they finish in the app is written as one exercise session (name, start and end time, repetitions per movement), so their other health apps can show it. Corrected or deleted in Bati, it is updated or deleted in Health Connect. |
| `android.permission.health.WRITE_DISTANCE` | Distance | For an outing (walk, run or ride) recorded with the phone's GPS, Bati writes its distance next to the exercise session, over the same times. Asked together with the exercise permission, by the same switch. |
| `android.permission.health.WRITE_EXERCISE_ROUTE` | Exercise route | Only if the user turns on a second, separate option, "With the GPS route" (off by default), Bati adds the route of each outing sent from then on. Asked at that moment and never otherwise. |

**Does your app read any health data?** No.

**Is any Health Connect data transferred off the device, used for advertising, sold, or used to
train models?** No. Bati has no server, no account, no analytics and no ads. The data is written
to Health Connect on the phone, between two apps.

**Privacy policy URL:** the one already on the listing (the published `docs/legal/privacy.md`),
section *Health Connect, write exercise sessions, distance and route*.

**Rationale screen:** Health Connect's "privacy policy" link and Android 14's permission usage
screen both open Bati's own privacy screen (`HealthRationaleActivity`, declared in the module's
manifest). Reviewers can reach it from Health Connect > App permissions > Bati.

**Video or steps for the reviewer** (if asked):

1. Open Bati, finish onboarding, Settings > Devices and health data.
2. Turn on "Send my sessions to Health Connect"; Health Connect asks for Exercise and Distance.
3. Play any quest to the end, or record a short walk. Open Health Connect > Data: the session is
   there, with its distance for the walk.
4. Back in Bati, turn on "With the GPS route"; Health Connect asks for Exercise routes.
5. Optional: "Send my past sessions" sends what was already in the journal.

## 3. App content > Data safety

Health Connect writes stay on the device. The Data safety form counts data **collected** (sent off
the device to the developer) and data **shared** (transferred to a third party).

- **Does your app collect or share any of the required user data types?** Health and fitness and
  Location (the route) are the two that apply. Collected: **No** for both: nothing leaves the
  phone, Bati has no server.
- **Shared:** **To confirm by Guillaume.** Writing to Health Connect is a transfer to another app
  on the device. Google's Data safety guidance exempts a transfer "based on a specific
  user-initiated action, where the user reasonably expects the data to be shared": here the user
  turns the switch on themselves, the screen says where the data goes, and the route needs a
  second switch. Our reading is that it is exempt, so **Shared: No**. If the Console's wording at
  submission time says otherwise, declare instead:
  - Health and fitness > *Fitness info*: shared, optional, purpose *App functionality*.
  - Location > *Precise location*: shared, optional, purpose *App functionality* (the route only).
- **Is all of the user data encrypted in transit?** Not applicable (no transit). If the form
  insists on an answer, *Yes*: nothing is transmitted unencrypted because nothing is transmitted.
- **Do you provide a way for users to request that their data is deleted?** Yes: deleting a
  session in Bati deletes its record in Health Connect, and everything Bati wrote can be deleted
  from Health Connect itself.

Unchanged from before W-04, for completeness: device sync and backups are end-to-end encrypted to
a destination the user picks, and are not collection by the developer either.

## 4. Store listing

The listing sentence lives in `fastlane/metadata/android/*/full_description.txt`, shared by
F-Droid and Play (the Play overlay `fastlane/play/android` is empty). Nothing to paste by hand.

## 5. After approval

Promote past the internal track by hand, as usual (the `play` job uploads to internal only).
