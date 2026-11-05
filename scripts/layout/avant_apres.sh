#!/usr/bin/env bash
# Side by side of two renders (left before, right after), tiers given: avant_apres.sh DOSSIER NOM T [T...]  (DOSSIER holds b<T>/ and a<T>/ render folders)
cd "$(dirname "$0")/../.."
D="$1"; NOM="$2"; shift 2
for T in "$@"; do
  magick "$D"/b"$T"/*.png "$D"/a"$T"/*.png -resize 540x +append -quality 82 "docs/designs/village/layout/img/$NOM-t$T.jpg"
done
