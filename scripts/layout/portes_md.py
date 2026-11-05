#!/usr/bin/env python3
"""Writes docs/designs/village/layout/portes-12-paliers.md from the two files of portes-tout.sh: portes_md.py DIR COMMIT"""
import pathlib
import re
import sys

d, commit = pathlib.Path(sys.argv[1]), sys.argv[2]
out = [f"# Portes de `check`, 12 paliers, jour (mesurées sur le commit `{commit}`)", "",
       "`scripts/layout/portes-tout.sh DOSSIER` (rebuild, puis `portes.sh` par défaut, puis `portes.sh haut=1`). La dernière ligne `GATE FAILED` d'un lancement SOMME les 12 paliers : les tableaux donnent le palier seul.", ""]
for nom, titre in (("defaut", "Stade par défaut de l'atelier"), ("haut", "Tous les bâtiments à leur plus haut stade (`haut=1`)")):
    t = (d / f"{nom}.txt").read_text()
    blocs = re.split(r"^== palier (\d+) ==\n", t, flags=re.M)
    lignes, detail = [], []
    somme = re.search(r"^GATE FAILED: (.*)$", t, re.M)
    for i in range(1, len(blocs), 2):
        p, b = blocs[i], blocs[i + 1]

        def n(cle):
            m = re.search(rf"^GATE {cle}: (\d+)", b, re.M)
            return m.group(1) if m else "?"
        bat = re.search(r"^GATE occlusion: \d+ of (\d+)", b, re.M)
        pire = re.search(r"^  ([a-z_]+) +([\d.]+) %", b, re.M)
        lignes.append(f"| {p} | {bat.group(1) if bat else '?'} | {n('occlusion')} | {pire.group(1) + ' ' + pire.group(2) + ' %' if pire else ''} | {n('anchors')} | {n('props')} | {n('hooks')} | {n('tap')} |")
        if p == "12":
            detail = [l.strip() for l in b.split("\n") if re.match(r"^  [a-z_0-9]+ +[\d.]+ %", l) or "covered" in l]
    out += [f"## {titre}", "", "| Palier | Bâtiments | Occlusion sous 85 % | Pire | Ancrages | Accessoires sous 50 % | Crochets couverts | Tap |", "|---|---|---|---|---|---|---|---|"] + lignes
    out += ["", f"Somme des 12 paliers : `{somme.group(1) if somme else '?'}`", ""]
    out += ["Palier 12, lignes de détail :", "", "```"] + detail + ["```", ""]
(pathlib.Path("docs/designs/village/layout/portes-12-paliers.md")).write_text("\n".join(out) + "\n")
