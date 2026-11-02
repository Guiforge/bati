#!/usr/bin/env python3
"""Garde des captures : une capture vient d'un build de la pointe, rien d'autre.

    build_guard.py check <fiche.json> <lastUpdateTime-appareil>   (code 0 = ok, 1 = refus + raison)
    build_guard.py selftest

La fiche est ~/.cache/bati-builds/<paquet>.json, ecrite par install-build.sh : {sha, lastUpdateTime}.
Refus si l'appareil a recu une autre installation depuis, ou si le code (hors docs/) a change
entre le sha du build et HEAD.
"""
import json
import subprocess
import sys


def verdict(rec, device_time, head, code_changed):
    """rec: la fiche. code_changed(sha, head) -> bool. Renvoie None si ok, sinon la raison."""
    if rec.get("lastUpdateTime") != device_time:
        return (f"l'appareil a ete mis a jour ({device_time}) depuis le build enregistre "
                f"({rec.get('lastUpdateTime')}): quelqu'un a installe autre chose, reinstalle avec install-build.sh")
    sha = rec.get("sha", "")
    if sha != head and code_changed(sha, head):
        return f"le build vient de {sha[:10]} mais HEAD est {head[:10]} et le code a change entre les deux: rebuild"
    return None


def _git(*a):
    return subprocess.run(["git", *a], capture_output=True, text=True)


def _code_changed(sha, head):
    return _git("diff", "--quiet", sha, head, "--", ".", ":!docs").returncode != 0


def selftest():
    rec = {"sha": "a" * 40, "lastUpdateTime": "T1"}
    head = "b" * 40
    assert verdict(rec, "T1", head, lambda *_: False) is None  # seul docs/ a change
    assert verdict(rec, "T1", "a" * 40, lambda *_: True) is None  # HEAD = build
    assert "rebuild" in verdict(rec, "T1", head, lambda *_: True)  # code change: refus
    assert "autre chose" in verdict(rec, "T2", head, lambda *_: False)  # autre installation: refus
    print("build_guard: selftest ok")


if __name__ == "__main__":
    if sys.argv[1:2] == ["selftest"]:
        selftest()
    elif sys.argv[1:2] == ["check"] and len(sys.argv) == 4:
        rec = json.load(open(sys.argv[2]))
        head = _git("rev-parse", "HEAD").stdout.strip()
        why = verdict(rec, sys.argv[3], head, _code_changed)
        if why:
            print(f"build_guard: refus, {why}", file=sys.stderr)
            sys.exit(1)
    else:
        sys.exit(__doc__)
