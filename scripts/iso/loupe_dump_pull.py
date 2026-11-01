#!/usr/bin/env python3
"""Rebuilds a sprite dump from logcat (dev-iso `?dump=<name>`, components/village/iso/dumpSprites.ts).

    scripts/iso/team/emu-adb.sh logcat -d -s ReactNativeJS:E | scripts/iso/loupe_dump_pull.py <name> > <name>.json

The app prints `ISO_DUMP <name> <k>/<n> <chunk>` lines with console.error, the one console call a release
build keeps, so plain adb reads them from a build that is not debuggable (no run-as). Takes the last
complete set of chunks for <name>. Exit 1 and a message on stderr when there is none or it is not JSON.
"""

import json
import re
import sys

LIGNE = re.compile(r"ISO_DUMP (\S+) (\d+)/(\d+) ([^'\s]*)'?\s*$")


def rebuild(text, name):
    """The dump object of the last complete chunk set named `name` in a logcat text, or None."""
    sets = {}  # n -> {k: chunk}, the set being filled; a new "1/n" starts over
    last = None
    for ligne in text.splitlines():
        m = LIGNE.search(ligne)
        if not m or m.group(1) != name:
            continue
        k, n, chunk = int(m.group(2)), int(m.group(3)), m.group(4)
        if k == 1:
            sets[n] = {}
        sets.setdefault(n, {})[k] = chunk
        if len(sets[n]) == n:
            last = "".join(sets[n][i] for i in range(1, n + 1))
    return None if last is None else json.loads(last)


def main(argv):
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    try:
        dump = rebuild(sys.stdin.read(), argv[1])
    except ValueError as e:
        print(f"loupe_dump_pull.py: the chunks of {argv[1]} are not JSON: {e}", file=sys.stderr)
        return 1
    if dump is None:
        print(f"loupe_dump_pull.py: no complete dump named {argv[1]} in the log.", file=sys.stderr)
        return 1
    json.dump(dump, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
