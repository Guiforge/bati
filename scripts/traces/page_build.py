#!/usr/bin/env python3
"""Inlines scratch/page/img into scripts/traces/page.html: scratch/page/bati-traces.html, one file to publish."""
import base64
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
S = ROOT / "docs/designs/village/traces/scratch/page"
t = (ROOT / "scripts/traces/page.html").read_text()
images = {f.stem: "data:image/jpeg;base64," + base64.b64encode(f.read_bytes()).decode() for f in sorted((S / "img").glob("*.jpg"))}
html = t.replace("/*IMAGES*/{}", json.dumps(images))
assert html != t
(S / "bati-traces.html").write_text(html)
print(round(len(html) / 1e6, 1), "MB", len(images), "images")
