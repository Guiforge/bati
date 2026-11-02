#!/usr/bin/env bash
# The capture list of one building (PROMPT.md 9.5): writes the spec scripts/iso/loupe_capture.sh reads
# ([{name, query, video?}]). It starts no device and no app; run the spec yourself, on the emulator
# only, when no other session uses it:
#
#   scripts/bld/capture.sh <building> [spec.json]      (default: stdout)
#   scripts/iso/loupe_capture.sh <out-dir> <spec.json>
#
# Each query is a bati://dev-iso link (components/village/iso/etatBld.ts):
#   bld=<code>&rang=N[&base=B]       the building alone at rank N (an upgrade: own rank, base rank)
#   show=stade|rang&avant=M          the tap show from rank M (stage change), or the short rank beat
#   &avantbase=B                     with base: the base rank the show rises from (rule B upgrades)
#   semaine=1&palier=T               the first week: village at tier T, buildings at rank T
# Stills are frozen (fige=1); shows and idle loops are not, and carry "video" (seconds) for the
# contact sheet. loupe_capture.sh finds no sprite dump for these links and reports one per entry:
# the PNG is taken anyway, ignore that line.
# The ladders mirror constants/buildingStages.ts: stage-opening ranks (the show), the ranks between
# (the beat). Upgrades run under rule B: rank 3 with a base building at rank 7 (legendary) and 10.
set -euo pipefail

code=${1:?usage: capture.sh <building> [spec.json]}
out=${2:-/dev/stdout}
case "$code" in
  dragon_lair | heroes_hall | champion_arena) opens="1 3 4 5"; between="2"; max=5; bases="" ;;
  armory | fountain | observatory | watchtower | barn | castle_wall) opens="1 2 3"; between=""; max=3; bases="7 10" ;;
  campfire | tent | training_dummy | archery_range | quarry | forge | well | windmill | farm | wizard_tower | druid_grove | high_road)
    opens="1 3 5 7 10"; between="2 4 6 8 9"; max=10; bases="" ;;
  *) echo "capture.sh: unknown building '$code'." >&2; exit 1 ;;
esac

{
  for r in $(seq 1 "$max"); do
    jq -n --arg n "$code-r$r-jour" --arg q "bld=$code&rang=$r&ambiance=jour&fige=1" '{name: $n, query: $q}'
  done
  for b in $bases; do
    jq -n --arg n "$code-r$max-base$b-jour" --arg q "bld=$code&rang=$max&base=$b&ambiance=jour&fige=1" '{name: $n, query: $q}'
  done
  for r in $opens; do # one night image per stage
    jq -n --arg n "$code-r$r-nuit" --arg q "bld=$code&rang=$r&ambiance=nuit&fige=1" '{name: $n, query: $q}'
  done
  for r in $opens; do # idle loop per stage: 10 s, animations running
    jq -n --arg n "$code-r$r-repos" --arg q "bld=$code&rang=$r&ambiance=jour" '{name: $n, query: $q, video: 10}'
  done
  for r in $opens; do # the full show at each stage change, day and night (rank 1 rises from nothing)
    for amb in jour nuit; do
      jq -n --arg n "$code-r$r-show-$amb" --arg q "bld=$code&rang=$r&avant=$((r - 1))&show=stade&ambiance=$amb" '{name: $n, query: $q, video: 12}'
    done
  done
  for b in $bases; do # an upgrade's look changes when its base building rises (rule B), own rank 3
    for amb in jour nuit; do
      jq -n --arg n "$code-r$max-base$b-show-$amb" --arg q "bld=$code&rang=$max&avant=$max&base=$b&avantbase=$((b - 1))&show=stade&ambiance=$amb" '{name: $n, query: $q, video: 12}'
    done
  done
  for r in $between; do # the beat of the first rank inside a stage
    jq -n --arg n "$code-r$r-beat" --arg q "bld=$code&rang=$r&avant=$((r - 1))&show=rang&ambiance=jour" '{name: $n, query: $q, video: 6}'
    break
  done
  for t in 1 2 3; do # first week: tier t, rank t
    [ "$t" -le "$max" ] || continue
    jq -n --arg n "$code-semaine-$t" --arg q "bld=$code&rang=$t&semaine=1&palier=$t&ambiance=jour&fige=1" '{name: $n, query: $q}'
  done
} | jq -s '.' >"$out" # the engine is on in a dev or .perf build (BATIMENT_MOTEUR), no link parameter
[ "$out" = /dev/stdout ] || echo "capture.sh: $(jq length "$out") entries in $out" >&2
