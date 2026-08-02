#!/usr/bin/env python3
"""Remove Firebase Cloud Messaging from expo-notifications, in place, under node_modules.

  python3 scripts/fdroid-strip-firebase.py

F-Droid's inclusion policy forbids Google Play Services and Firebase outright. `expo-notifications`
pulls `com.google.firebase:firebase-messaging` unconditionally, which is the single thing keeping
this app out of the official catalogue — and the app never uses it. `src/notifications.ts` schedules
exactly one local reminder: a channel, a permission prompt, `scheduleNotificationAsync` and
`cancelAllScheduledNotificationsAsync`. No push token is ever requested, no topic subscribed.

A Gradle `exclude` does not work. Fourteen files reference FCM, one of them is a `<service>`
declared in the library's manifest, and three of the fourteen are also on the *local* code path —
delete those and the local notifications go with them. So this is surgical: the push-only files are
removed, and the three shared ones are edited to drop their FCM branch and keep the rest.

Run from the fdroiddata recipe's `prebuild:` step, after `npm ci` and before `expo prebuild`. It is
idempotent — running it twice is a no-op, so a rebuilt working tree does not need a clean checkout.

**This changes what the app can do.** After stripping, remote push is gone. That is a non-event
here because nothing calls it, but if push is ever added, this script and the F-Droid build both
have to be revisited rather than silently shipping a build where notifications half-exist.
"""

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PKG = ROOT / "node_modules" / "expo-notifications"
JAVA = PKG / "android" / "src" / "main" / "java" / "expo" / "modules" / "notifications"

# Push-only. Nothing on the local path reaches these.
DELETE = [
    "service/ExpoFirebaseMessagingService.kt",
    "service/delegates/FirebaseMessagingDelegate.kt",
    "service/interfaces/FirebaseMessagingDelegate.kt",
    "tokens/PushTokenModule.kt",
    "tokens/interfaces/FirebaseTokenListener.kt",
    "topics/TopicSubscriptionModule.kt",
    "notifications/model/triggers/FirebaseNotificationTrigger.kt",
    "notifications/model/RemoteNotificationContent.kt",
    "notifications/RemoteMessageSerializer.java",
    "notifications/background/BackgroundRemoteNotificationTaskConsumer.kt",
    # Registers TaskManager consumers for *remote* notifications, and is the only caller of the
    # consumer above. Nothing local reaches it.
    "notifications/background/ExpoBackgroundNotificationTasksModule.kt",
]

# Registered natively; removing the classes without removing these leaves a dangling registration.
DROP_MODULES = {
    "expo.modules.notifications.tokens.PushTokenModule",
    "expo.modules.notifications.topics.TopicSubscriptionModule",
    "expo.modules.notifications.notifications.background.ExpoBackgroundNotificationTasksModule",
}

changed = []


def edit(path: pathlib.Path, fn) -> None:
    """Apply fn to a file's text, recording whether anything moved."""
    before = path.read_text(encoding="utf-8")
    after = fn(before)
    if after != before:
        path.write_text(after, encoding="utf-8")
        changed.append(str(path.relative_to(ROOT)))


def main() -> int:
    if not PKG.is_dir():
        sys.exit(f"expo-notifications not found at {PKG} — run npm ci first")

    for rel in DELETE:
        p = JAVA / rel
        if p.exists():
            p.unlink()
            changed.append(str(p.relative_to(ROOT)))

    # 1. The Gradle dependency itself, and the ShortcutBadger aar it sits next to.
    edit(
        PKG / "android" / "build.gradle",
        lambda s: "\n".join(
            l for l in s.splitlines() if "firebase-messaging" not in l
        ) + "\n",
    )

    # 2. The manifest <service> that binds the app to com.google.firebase.MESSAGING_EVENT.
    edit(
        PKG / "android" / "src" / "main" / "AndroidManifest.xml",
        lambda s: re.sub(
            r"\n\s*<service\b(?:(?!</service>).)*?ExpoFirebaseMessagingService(?:(?!</service>).)*?</service>",
            "",
            s,
            flags=re.S,
        ),
    )

    # 3. Native module registration.
    def strip_modules(s: str) -> str:
        cfg = json.loads(s)
        cfg["android"]["modules"] = [
            m for m in cfg["android"]["modules"] if m not in DROP_MODULES
        ]
        return json.dumps(cfg, indent=2) + "\n"

    edit(PKG / "expo-module.config.json", strip_modules)

    # 4. ExpoHandlingDelegate also serves local notifications; only its FCM call goes.
    edit(
        JAVA / "service" / "delegates" / "ExpoHandlingDelegate.kt",
        lambda s: re.sub(
            r"\n\s*FirebaseMessagingDelegate\.runTaskManagerTasks\((?:[^()]|\([^()]*\))*\)",
            "",
            s,
        ),
    )

    # 5. NotificationSerializer is on the scheduling path. Drop the remote-message branch and let
    #    the local triggers fall through to the branch that already follows it.
    def strip_serializer(s: str) -> str:
        s = re.sub(r"^import com\.google\.firebase\.messaging\.RemoteMessage;\n", "", s, flags=re.M)
        s = re.sub(r"^import .*FirebaseNotificationTrigger;\n", "", s, flags=re.M)
        s = re.sub(
            r"if \(requestTrigger instanceof FirebaseNotificationTrigger trigger\) \{.*?\n      \} else if\(",
            "if (",
            s,
            flags=re.S,
        )
        return s

    edit(JAVA / "notifications" / "NotificationSerializer.java", strip_serializer)

    # 6. DebugLogging's remote overload is dead once the callers above are gone.
    def strip_debug(s: str) -> str:
        s = re.sub(r"^import com\.google\.firebase\.messaging\.RemoteMessage\n", "", s, flags=re.M)
        return re.sub(
            r"\n\s*fun logRemoteMessage\((?:[^{]*)\{(?:[^{}]|\{[^{}]*\})*\}", "", s
        )

    edit(JAVA / "notifications" / "debug" / "DebugLogging.kt", strip_debug)

    # 7. NotificationsHandler presents *local* notifications too, so it stays. Its one push concern
    #    is an early return for data-only remote messages, which can no longer occur.
    def strip_handler(s: str) -> str:
        s = re.sub(r"^import .*\.model\.RemoteNotificationContent\n", "", s, flags=re.M)
        return re.sub(
            r"\n\s*if \(content is RemoteNotificationContent && content\.isDataOnly\) \{"
            r"(?:[^{}]|\{[^{}]*\})*\}",
            "",
            s,
        )

    edit(JAVA / "notifications" / "handling" / "NotificationsHandler.kt", strip_handler)

    residue = sorted(
        p.relative_to(ROOT).as_posix()
        for p in (PKG / "android").rglob("*")
        if p.is_file()
        and p.suffix in (".kt", ".java", ".xml", ".gradle")
        and re.search(r"com\.google\.firebase|FirebaseMessaging", p.read_text(encoding="utf-8", errors="ignore"))
    )

    if not changed:
        print("already stripped, nothing to do")
    else:
        print(f"stripped Firebase from expo-notifications ({len(changed)} files)")
        for c in changed:
            print(f"  - {c}")

    if residue:
        print("\nFirebase still referenced in:", file=sys.stderr)
        for r in residue:
            print(f"  ! {r}", file=sys.stderr)
        return 1
    print("\nno Firebase references remain")
    return 0


if __name__ == "__main__":
    sys.exit(main())
