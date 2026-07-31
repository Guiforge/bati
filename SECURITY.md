# Security

## Reporting

Email **feedback.bati@proton.me**. Please do not open a public issue for a security problem.

There is no bounty and no formal SLA — this is a personal project — but a report will be read and
answered.

## What the app does with your data

Nothing leaves the device. Bati has no backend, no analytics, no crash-reporting service and no
network calls of its own. Training history, preferences and the crash log all live in a local
SQLite database, and uninstalling the app destroys them.

The one path that sends anything anywhere is the feedback row in Settings, which opens a `mailto:`
draft in your own mail client, pre-filled and fully editable. Nothing is transmitted unless you
press send yourself.

That is the property most worth protecting in a report: if you find a way for this app to send
data off the device without the user deliberately doing it, that is a bug worth telling me about.
