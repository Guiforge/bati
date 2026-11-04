#!/usr/bin/env bash
# usage: mouvement_capture.sh setup | still <code> | run   (emulator-5556 only)
set -uo pipefail
cd "$(dirname "$0")/../.."
S=emulator-5556
A="adb -s $S"
OUT=docs/designs/village/life/scratch/m-planches
RAW=$HOME/.cache/bati-life-mouv; mkdir -p "$OUT" "$RAW"
CROP=${CROP:-1080:1080:0:340}   # w:h:x:y of the building on the screen
link() { $A shell am start -W -a android.intent.action.VIEW -d "'$1'" com.guiforge.bati.dev >/dev/null; }
rank() { case $1 in dragon_lair|heroes_hall|champion_arena) echo 5;; armory|fountain|observatory|watchtower|barn|castle_wall) echo 3;; *) echo 10;; esac; }
ALL="archery_range armory barn campfire castle_wall champion_arena dragon_lair druid_grove farm forge fountain heroes_hall high_road observatory quarry tent training_dummy watchtower well windmill wizard_tower"

setup() {
  [ "$(scripts/emu.sh claim)" = $S ] || { echo "claim != $S"; exit 1; }
  old=$(cat ~/.cache/bati-life-metro.pid 2>/dev/null)
  if [ -n "$old" ]; then pkill -P "$old"; kill "$old"; fi
  sleep 3
  nohup npx expo start --dev-client --port 8082 > ~/.cache/bati-life-metro.log 2>&1 &
  echo $! > ~/.cache/bati-life-metro.pid
  $A reverse tcp:8082 tcp:8082; $A reverse tcp:8081 tcp:8082
  sleep 25
  $A shell am start -a android.intent.action.VIEW -d "bati://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8082" com.guiforge.bati.dev
  for i in $(seq 60); do [ "$(grep -c 'Android Bundled' ~/.cache/bati-life-metro.log)" -ge 1 ] && break; sleep 10; done
  echo "bundled: $(grep -c 'Android Bundled' ~/.cache/bati-life-metro.log)"
}

still() { link "bati://dev-iso?bld=$1&rang=$(rank $1)&base=10&ambiance=jour"; sleep 12; $A exec-out screencap -p > "$RAW/still-$1.png"; }

run() {
  echo "building,ambiance,mean_diff,frames,p99_std,p99_9_std" > "$OUT/mouvement.csv"
  for c in $ALL; do for a in jour nuit; do
    f="$OUT/$c-$a.mp4"; rm -f "$f"
    link "bati://dev-iso?bld=$c&rang=$(rank $c)&base=10&ambiance=$a"; sleep 12; $A shell input tap 540 1650; sleep 2
    $A shell screencap -p /sdcard/s.png; $A pull /sdcard/s.png "$RAW/$c-$a-proof.png" >/dev/null
    $A shell screenrecord --time-limit 8 /sdcard/m.mp4; $A pull /sdcard/m.mp4 "$f" >/dev/null
    d="$RAW/$c-$a"; rm -rf "$d"; mkdir -p "$d"
    ffmpeg -loglevel error -i "$f" -vf "fps=4,crop=$CROP" "$d/f%03d.png"
    ffmpeg -loglevel error -y -i "$f" -vf "fps=6/8,crop=$CROP,scale=360:-1,tile=6x1" -frames:v 1 "$OUT/$c-$a-strip.png"
    python3 -I - "$d" "$c" "$a" >> "$OUT/mouvement.csv" <<'PY'
import sys,glob
from PIL import Image, ImageChops, ImageStat
d,c,a=sys.argv[1:]
fs=sorted(glob.glob(d+"/f*.png")); v=[]
for x,y in zip(fs,fs[1:]):
    df=ImageChops.difference(Image.open(x).convert("L"),Image.open(y).convert("L"))
    v.append(ImageStat.Stat(df).mean[0])
# p99_std: 99th percentile over pixels of the std dev in time. The whole-frame mean above drowns a
# 12 dp halo in the 1080 px frame; the top 1 % of pixels is where a halo, a flame or a glint moves.
# Frames are shrunk 3x (box filter keeps a small glow's change) so pure Python stays fast.
p99=0.0
if len(fs)>1:
    ims=[Image.open(f).convert("L").reduce(3).tobytes() for f in fs]
    n=len(ims); sd=[]
    for px in zip(*ims):
        m=sum(px)/n
        sd.append((sum((q-m)**2 for q in px)/n)**0.5)
    sd.sort(); p99=sd[min(len(sd)-1,int(len(sd)*0.99))]
    # A 30 px halo is 0.06 % of the 1080 px frame, under the top 1 %: p99_9 is the one that sees it.
    p999=sd[min(len(sd)-1,int(len(sd)*0.999))]
else: p999=0.0
print(f"{c},{a},{sum(v)/len(v) if v else 0:.3f},{len(fs)},{p99:.3f},{p999:.3f}")
PY
  done; done
  for p in windmill-nuit forge-nuit fountain-jour; do mkdir -p "$OUT/$p-4fps"; ffmpeg -loglevel error -i "$OUT/$p.mp4" -vf fps=4 "$OUT/$p-4fps/f%03d.png"; done
  python3 -I - "$OUT" <<'PY'
import sys
from PIL import Image, ImageDraw
out=sys.argv[1]
codes="archery_range armory barn campfire castle_wall champion_arena dragon_lair druid_grove farm forge fountain heroes_hall high_road observatory quarry tent training_dummy watchtower well windmill wizard_tower".split()
for amb in("jour","nuit"):
    for n,grp in enumerate((codes[:11],codes[11:]),1):
        ims=[Image.open(f"{out}/{c}-{amb}-strip.png").convert("RGB") for c in grp]
        W=max(i.width for i in ims); H=sum(i.height+16 for i in ims)
        P=Image.new("RGB",(W,H),"black"); y=0
        for c,i in zip(grp,ims):
            ImageDraw.Draw(P).text((4,y+2),c,fill="white"); P.paste(i,(0,y+16)); y+=i.height+16
        if W>1600: P=P.resize((1600,int(H*1600/W)))
        P.save(f"{out}/planche-{amb}-{n}.png")
PY
  echo DONE
}
"$@"
