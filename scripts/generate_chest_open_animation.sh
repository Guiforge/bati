#!/bin/bash
# Generate a ~3s chest-opening animation as a sequence of PNG frames.
# Output: assets/chest/animation/frame_000.png ...
#
# Requirements:
# - MISTRAL_API_KEY must be set (see .env)
# - "uv" recommended (will fall back to python3)
#
# Usage examples:
#   bash scripts/generate_chest_open_animation.sh
#   bash scripts/generate_chest_open_animation.sh --duration 3 --fps 12
#   bash scripts/generate_chest_open_animation.sh --duration 3 --fps 8 --image-model mistral-medium-2505
#
# Notes:
# - This generates frames independently; slight flicker between frames can happen.
# - The script skips frames that already exist.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

GENERATOR="$SCRIPT_DIR/generate_image_mistral.py"
STYLE_FILE="$PROJECT_ROOT/docs/prompt.image.md"

OUT_DIR="$PROJECT_ROOT/assets/chest/animation"

DURATION_SEC=3
FPS=12
MODEL="mistral-large-latest"
IMAGE_MODEL="mistral-medium-2505"

print_help() {
	cat <<EOF
Generate chest opening animation frames.

Options:
	--duration <seconds>     Animation duration (default: ${DURATION_SEC})
	--fps <frames_per_sec>  Frames per second (default: ${FPS})
	--model <chat_model>    Prompt enhancement model (default: ${MODEL})
	--image-model <model>   Image generation model (default: ${IMAGE_MODEL})
	-h, --help              Show this help

Output folder:
	assets/chest/animation/
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--duration)
			DURATION_SEC="$2"; shift 2;;
		--fps)
			FPS="$2"; shift 2;;
		--model)
			MODEL="$2"; shift 2;;
		--image-model)
			IMAGE_MODEL="$2"; shift 2;;
		-h|--help)
			print_help; exit 0;;
		*)
			echo "❌ Unknown argument: $1" >&2
			print_help
			exit 2;;
	esac
done

if [[ ! -f "$GENERATOR" ]]; then
	echo "❌ Missing generator: $GENERATOR" >&2
	exit 1
fi

mkdir -p "$OUT_DIR"

if ! command -v python3 >/dev/null 2>&1; then
	echo "❌ python3 not found in PATH." >&2
	exit 127
fi

TOTAL_FRAMES=$(python3 - <<PY
import math
try:
	d=float("$DURATION_SEC")
	fps=float("$FPS")
	n=int(math.ceil(d*fps))
	print(max(1,n))
except Exception:
	print(36)
PY
)

echo "🧰 Chest animation generator"
echo "============================"
echo "Output:   $OUT_DIR"
echo "Duration: ${DURATION_SEC}s"
echo "FPS:      ${FPS}"
echo "Frames:   ${TOTAL_FRAMES}"
echo ""

run_gen() {
	local prompt="$1"
	local out_path="$2"

	if command -v uv >/dev/null 2>&1; then
		uv run "$GENERATOR" "$prompt" --output "$out_path" --model "$MODEL" --image-model "$IMAGE_MODEL" --style-file "$STYLE_FILE"
	else
		python3 "$GENERATOR" "$prompt" --output "$out_path" --model "$MODEL" --image-model "$IMAGE_MODEL" --style-file "$STYLE_FILE"
	fi
}

for ((i=0; i<${TOTAL_FRAMES}; i++)); do
	frame=$(printf "%03d" "$i")
	out_path="$OUT_DIR/frame_${frame}.png"

	if [[ -f "$out_path" ]]; then
		echo "⏭️  Skip existing: $(basename "$out_path")"
		continue
	fi

	progress=$(python3 - <<PY
i=$i
n=$TOTAL_FRAMES
if n <= 1:
	print("0")
else:
	print(f"{i/(n-1):.6f}")
PY
)

	angle=$(python3 - <<PY
p=float("$progress")
angle=int(round(95*p))
print(angle)
PY
)

	glow=$(python3 - <<PY
p=float("$progress")
v=p*p
print(f"{v:.3f}")
PY
)

	particles=$(python3 - <<PY
p=float("$progress")
print("many" if p>=0.66 else "few")
PY
)

	echo "🖼️  Generating frame ${frame}/${TOTAL_FRAMES} (lid ${angle}°, glow ${glow})"

	prompt=$(cat <<EOF
**A dark-fantasy / high-tech HUD style illustration of a treasure chest opening (single frame of an animation sequence).**

Scene constraints (MUST stay identical across frames):
- Same chest design every frame: a compact fantasy chest with subtle sci-fi trims, metal corners, runic engravings, slightly worn wood/metal.
- Camera is locked: centered chest, 1:1 square framing, chest on a dark obsidian-blue floor plane with faint reflections.
- Background is minimalist deep blue-black with a soft vignette; no environment props; no characters.
- Lighting is cinematic but controlled: a cool rim light + internal magical light.
- No text, no logos, no UI labels.

Frame-specific state:
- The chest lid is open at approximately ${angle} degrees (0° = closed, ~95° = fully open).
- Internal magical light intensity is ${glow} (0.0 = off, 1.0 = strong), spilling upward with volumetric rays.
- Particle/spark count: ${particles} (small glowing motes and tiny shards of light).

Visual style:
- Franco-Belgian comic / cel-shaded look, thick contours, high contrast, clean readable shapes.
- Electric blue accents + subtle purple highlights for the magic glow.
- Keep geometry consistent: same hinges, same latch position, same perspective.

--ar 1:1 --no text
EOF
)

	if run_gen "$prompt" "$out_path"; then
		echo "✅ Saved: $out_path"
	else
		echo "⚠️  Failed: $out_path (continuing...)"
	fi

	echo ""
done

echo "============================"
echo "🎉 Done"
echo "Frames in: $OUT_DIR"
Create a new script to generate a 3s chest-opening animation as PNG frames into assets/chest/animation.