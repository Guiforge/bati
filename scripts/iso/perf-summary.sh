#!/usr/bin/env bash
# Village iso V1: turn the raw dumps written by scripts/iso/perf.sh into summary.md (medians of 3).
# Reads files only, never touches a device: safe anywhere.
#
#   scripts/iso/perf-summary.sh <dir>
#
# Raw layout (one name per measurement, k = 1..3):
#   <phase>-pass<k>-gfxinfo.txt   gfxinfo after a scroll or pan pass (reset before the pass)
#   <phase>-pass<k>-meminfo.txt   meminfo right after that pass
#   <phase>-idle-gfxinfo.txt      gfxinfo after 10 s without touching
#   <phase>-coldstart.txt         `am start -W` output
#   iso-carte-mem-<step>.txt      meminfo at one zoom step (depart, x7, x9, retour, retour-30s, trim)
set -euo pipefail
dir=${1:-}
[ -d "$dir" ] || { echo "usage: $0 <dir with the raw dumps>" >&2; exit 64; }

# first number after a label in a gfxinfo / meminfo dump
num() { # file regex
  [ -f "$1" ] || { echo "-"; return; }
  local r
  r=$(grep -E "$2" "$1" | sed -n 1p | sed 's/^[^:]*://' | grep -oE '[0-9]+(\.[0-9]+)?' | sed -n 1p || true)
  echo "${r:--}"
}
med() { # three numbers, "-" ignored: median
  { printf '%s\n' "$@" | grep -E '^[0-9.]+$' || true; } | sort -n | awk '{a[NR]=$1} END{ if(NR==0) print "-"; else print a[int((NR+1)/2)] }'
}
frames() { num "$1" 'Total frames rendered'; }
janky() { num "$1" 'Janky frames:'; }
p90() { num "$1" '90th percentile'; }
p99() { num "$1" '99th percentile'; }
missed() { num "$1" 'Number Frame deadline missed:'; }
native() { [ -f "$1" ] && awk '/App Summary/{s=1} s&&/Native Heap:/{print $3; exit}' "$1" || echo "-"; }
gfx() { [ -f "$1" ] && awk '/App Summary/{s=1} s&&/Graphics:/{print $2; exit}' "$1" || echo "-"; }
pss() { [ -f "$1" ] && awk '/TOTAL PSS:/{print $3; exit}' "$1" || echo "-"; }
kb() { if [ "$1" = "-" ]; then echo "-"; else awk -v k="$1" 'BEGIN{printf "%.1f", k/1024}'; fi; }

out="$dir/summary.md"
{
  echo "# Mesures (medianes de 3 passes), $(basename "$dir")"
  if [ -f "$dir/device.txt" ]; then echo; sed 's/^/    /' "$dir/device.txt"; fi
  echo
  echo "## Passes (gfxinfo)"
  echo
  echo "| phase | images | janky | janky % | p90 ms | p99 ms | deadline manquee | Native Heap Mo | Graphics Mo | TOTAL PSS Mo |"
  echo "|---|---|---|---|---|---|---|---|---|---|"
  for ph in $(ls "$dir" | sed -nE 's/^(.*)-pass1-gfxinfo\.txt$/\1/p'); do
    f=(); j=(); a=(); b=(); m=(); n=(); g=(); t=()
    for k in 1 2 3; do
      G="$dir/$ph-pass$k-gfxinfo.txt"; M="$dir/$ph-pass$k-meminfo.txt"
      f+=("$(frames "$G")"); j+=("$(janky "$G")"); a+=("$(p90 "$G")"); b+=("$(p99 "$G")"); m+=("$(missed "$G")")
      n+=("$(native "$M")"); g+=("$(gfx "$M")"); t+=("$(pss "$M")")
    done
    mf=$(med "${f[@]}"); mj=$(med "${j[@]}")
    pct=$(awk -v j="$mj" -v f="$mf" 'BEGIN{ if (f+0>0 && j!="-") printf "%.2f", 100*j/f; else print "-" }')
    lab=$ph
    if [ "$mf" != "-" ] && [ "$mf" -lt 30 ]; then lab="$ph (non significatif : moins de 30 images)"; fi
    echo "| $lab | $mf | $mj | $pct | $(med "${a[@]}") | $(med "${b[@]}") | $(med "${m[@]}") | $(kb "$(med "${n[@]}")") | $(kb "$(med "${g[@]}")") | $(kb "$(med "${t[@]}")") |"
  done
  echo
  echo "## Repos 10 s (images rendues, 0 attendu)"
  echo
  echo "| phase | images | janky | deadline manquee |"
  echo "|---|---|---|---|"
  for f in "$dir"/*-idle-gfxinfo.txt; do
    [ -f "$f" ] || continue
    ph=$(basename "$f" -idle-gfxinfo.txt)
    echo "| $ph | $(frames "$f") | $(janky "$f") | $(missed "$f") |"
  done
  echo
  echo "## Demarrage a froid (am start -W)"
  echo
  for f in "$dir"/*-coldstart.txt; do
    [ -f "$f" ] || continue
    echo "- $(basename "$f" -coldstart.txt): $(grep -E 'TotalTime|WaitTime' "$f" | tr -d '\r' | tr '\n' ' ')"
  done
  echo
  echo "## Memoire de la carte iso (palier 12) par etape (trim = RUNNING_CRITICAL)"
  echo
  echo "| etape | Native Heap Mo | Graphics Mo | TOTAL PSS Mo | sonde forge |"
  echo "|---|---|---|---|---|"
  for step in depart x7 x9 retour z06 retour-30s trim; do
    M="$dir/iso-carte-mem-$step.txt"
    [ -f "$M" ] || continue
    probe=$({ grep -oE 'forge [0-9]+x[0-9]+ n=[0-9]+' "$dir/iso-carte-probe-$step.txt" 2>/dev/null || true; } | sed -n 1p)
    echo "| $step | $(kb "$(native "$M")") | $(kb "$(gfx "$M")") | $(kb "$(pss "$M")") | ${probe:--} |"
  done
  if [ -f "$dir/iso-carte-mem-ret-1.txt" ]; then
    echo
    echo "## Allers-retours (zoom max puis Cadrer), Native Heap Mo"
    echo
    echo "| tour | au zoom max | apres Cadrer |"
    echo "|---|---|---|"
    for r in 1 2 3; do
      echo "| $r | $(kb "$(native "$dir/iso-carte-mem-max-$r.txt")") | $(kb "$(native "$dir/iso-carte-mem-ret-$r.txt")") |"
    done
    r1=$(native "$dir/iso-carte-mem-ret-1.txt"); r2=$(native "$dir/iso-carte-mem-ret-2.txt"); r3=$(native "$dir/iso-carte-mem-ret-3.txt")
    echo
    awk -v a="$r1" -v b="$r2" -v c="$r3" 'BEGIN{ if (a+0>0 && b+0>0 && c+0>0) { d=(c-b)/1024; printf "Apres Cadrer : tour 1 -> 3 %+.1f Mo, tour 2 -> 3 %+.1f Mo. Verdict (tour 2 -> 3, seuil +3 Mo) : **%s**.\n", (c-a)/1024, d, (d>3 ? "hausse" : "plateau") } else print "Allers-retours illisibles." }'
  fi
  if [ -f "$dir/iso-carte-trim-refused.txt" ]; then
    echo
    echo "**$(cat "$dir/iso-carte-trim-refused.txt")**"
  fi
} > "$out"
cat "$out"
