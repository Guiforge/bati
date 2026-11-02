#!/usr/bin/env python3
"""Check the loupes art lock before every merge (PROMPT.md section 4). Read only: it never writes.

    python3 scripts/bld/lock_check.py

Reads ~/.cache/bati-loupes-lock/sha256.txt, then compares every listed file with its copy in the lock
folder AND with the original in the loupes folder of the iso worktree. Prints LOCK_OK, or one MISMATCH
line per file and LOCK_FAILED n (exit 1). BATI_LOCK_SRC and BATI_LOCK_DST point it elsewhere (tests).
"""
import hashlib
import os
import pathlib
import sys

SRC = pathlib.Path(os.environ.get(
    "BATI_LOCK_SRC", "/home/guiforge/Documents/code/bati/.claude/worktrees/iso/docs/designs/village-loop/loupes"))
DST = pathlib.Path(os.environ.get("BATI_LOCK_DST", pathlib.Path.home() / ".cache/bati-loupes-lock"))


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def check(src=SRC, dst=DST):
    """The list of mismatches, empty when the lock holds."""
    listing = dst / "sha256.txt"
    if not listing.exists():
        return [f"MISSING {listing}"]
    bad = []
    for line in listing.read_text().splitlines():
        h, rel = line.split("  ", 1)
        for root in (src, dst):
            if not (root / rel).exists() or sha(root / rel) != h:
                bad.append(f"MISMATCH {root} {rel}")
    return bad


if __name__ == "__main__":
    problems = check()
    print("\n".join(problems))
    print("LOCK_OK" if not problems else f"LOCK_FAILED {len(problems)}")
    sys.exit(bool(problems))
