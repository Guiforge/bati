#!/usr/bin/env bash
# One-shot, outside the app: build assets/sounds/village/*.ogg from the four CC0 BigSoundBank
# sources, downloaded by hand (the site makes you wait and click). Needs ffmpeg.
#   SRC=<dir holding 0097.ogg 1880.ogg 2754.ogg 3589.wav> scripts/village-sounds.sh
# Output: mono 32 kHz vorbis, 30 s loops whose last 2 s fade into the first 2 s (no click),
# plus one anvil hit for the building reveal. Credits: assets/sounds/village/CREDITS.md.
set -euo pipefail
OUT="$(dirname "$0")/../assets/sounds/village"
mkdir -p "$OUT"
L=30 # loop length, seconds
X=2  # crossfade, seconds

# loop <source> <name> <start>: cut L+X seconds, then fade the tail (seg[L..L+X]) into the head,
# so the file's end (seg[L]) flows straight into its start: a seamless loop of L seconds.
loop() {
  ffmpeg -y -loglevel error -ss "$3" -t $((L + X)) -i "$SRC/$1" -ac 1 -ar 32000 -filter_complex \
    "[0:a]asplit[h][t];[t]atrim=$L:$((L + X)),asetpts=PTS-STARTPTS[tail];[h]atrim=0:$L,asetpts=PTS-STARTPTS[head];[tail][head]acrossfade=d=$X:c1=tri:c2=tri" \
    -c:a libvorbis -q:a 1 "$OUT/$2.ogg"
}

loop 0097.ogg day 5
loop 1880.ogg night 225 # 30 s with no frog: low-band peaks flat, only crickets at ~5 kHz
loop 2754.ogg mill 20
# Forge: the clip is 32.8 s, so no room for a crossfade: cut 30 s and fade the ends by 0.3 s.
ffmpeg -y -loglevel error -t $L -i "$SRC/3589.wav" -ac 1 -ar 32000 \
  -af "afade=t=in:d=0.3,afade=t=out:st=$(echo "$L - 0.3" | bc):d=0.3" -c:a libvorbis -q:a 2 "$OUT/forge.ogg"
# One isolated hit for the reveal (T37): HIT_START / HIT_LEN pick it out of the anvil clip.
ffmpeg -y -loglevel error -ss "${HIT_START:-0}" -t "${HIT_LEN:-1.2}" -i "$SRC/3589.wav" -ac 1 -ar 32000 \
  -af "afade=t=out:st=0.9:d=0.3" -c:a libvorbis -q:a 2 "$OUT/forge-hit.ogg"
