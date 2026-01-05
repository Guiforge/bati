#!/bin/bash
# Generate all BATI images using Mistral AI
# Usage: ./scripts/generate_all.sh

# Don't use set -e - we want to continue on errors

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STYLE_FILE="$PROJECT_ROOT/docs/prompt.image.md"

# Create output directories
mkdir -p "$PROJECT_ROOT/assets/images/exercises"
mkdir -p "$PROJECT_ROOT/assets/images/quests"
mkdir -p "$PROJECT_ROOT/assets/images/bosses"
mkdir -p "$PROJECT_ROOT/assets/images/adventures"

echo "🎨 BATI Image Generation Script"
echo "================================"

# Helper function
generate() {
    local output="$1"
    local prompt="$2"

    if [ -f "$PROJECT_ROOT/$output" ]; then
        echo "⏭️  Skipping (exists): $output"
        return 0
    fi

    echo "🖼️  Generating: $output"
    if uv run "$SCRIPT_DIR/generate_image_mistral.py" "$prompt" -o "$PROJECT_ROOT/$output" --style-file "$STYLE_FILE"; then
        echo "✅ Done: $output"
    else
        echo "⚠️  Failed or skipped: $output (continuing...)"
    fi
    echo ""
}

# Common style suffix for all exercises
# Note: We use a specific template for exercises now, so this base is less used but kept for reference if needed.
STYLE_BASE="Franco-Belgian comic book style, thick black outlines, cel-shaded rendering, athletic warrior physique, practical battle armor, focused determined expression, non-sexualized, dark obsidian blue background, isolated character."

# ============================================
# EXERCISES (20 exercises x 1 main image with ghost outline)
# ============================================
echo ""
echo "📋 EXERCISES (20 exercises, Sport/Movement Focus)"
echo "---------------------------------------------------------"

# Template:
# **A dynamic comic-book style illustration of a [EXERCISE]. The character is in the [PHASE], but a semi-transparent "ghost" outline shows the [OTHER PHASE] to demonstrate the range of motion.
# Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple [COLOR] speed lines indicate the [DIRECTION] movement.
# Character: A [GENDER] athlete in dark tactical sportswear (hoodie sleeveless). Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**

# --- 1. GOBLIN SQUAT (Goblet Squat) ---
generate "assets/images/exercises/goblin_squat.png" \
    "**A dynamic comic-book style illustration of a Goblet Squat. The character is in the deep squat position, holding a kettlebell at chest level, but a semi-transparent 'ghost' outline shows the standing position to demonstrate the range of motion. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple electric blue speed lines indicate the downward and upward movement. Character: A female athlete in dark tactical sportswear (hoodie sleeveless). Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 2. DRAGON PUSH-UP (Standard Push-up) ---
generate "assets/images/exercises/dragon_pushup.png" \
    "**A dynamic comic-book style illustration of a Push-up. The character is in the 'up' plank position, but a semi-transparent 'ghost' outline shows the 'down' chest-to-floor position to demonstrate the range of motion. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple fiery orange speed lines indicate the pushing movement. Character: A male athlete in dark tactical sportswear (compression shirt). Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 3. IRON GRIP PULL-UP ---
generate "assets/images/exercises/iron_grip_pullup.png" \
    "**A dynamic comic-book style illustration of a Pull-up. The character is in the top position with chin over the bar, but a semi-transparent 'ghost' outline shows the dead-hang starting position to demonstrate the range of motion. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple silver-white speed lines indicate the vertical pulling movement. Character: A female athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 4. STONE GUARDIAN PLANK ---
generate "assets/images/exercises/stone_guardian_plank.png" \
    "**A dynamic comic-book style illustration of a Forearm Plank. The character is holding a perfect rigid plank position. A semi-transparent 'ghost' outline shows the knees-down setup position to demonstrate the entry into the hold. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple golden stability lines radiate from the core to indicate isometric tension. Character: A male athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 5. SHADOW STEP LUNGE ---
generate "assets/images/exercises/shadow_step_lunge.png" \
    "**A dynamic comic-book style illustration of a Forward Lunge. The character is in the deep lunge position with knee near ground, but a semi-transparent 'ghost' outline shows the standing starting position to demonstrate the step distance. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple purple speed lines indicate the forward stepping movement. Character: A female athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 6. BERSERKER BURPEE ---
generate "assets/images/exercises/berserker_burpee.png" \
    "**A dynamic comic-book style illustration of a Burpee. The character is in the explosive jump phase, arms overhead, but a semi-transparent 'ghost' outline shows the bottom push-up position to demonstrate the full range of the movement. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple red explosive speed lines indicate the vertical power. Character: A male athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 7. MONK MOUNTAIN CLIMBER ---
generate "assets/images/exercises/monk_mountain_climber.png" \
    "**A dynamic comic-book style illustration of Mountain Climbers. The character is in a high plank with right knee driven forward, but a semi-transparent 'ghost' outline shows the left knee driven forward (alternating) to demonstrate the rapid switching motion. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple cyan speed lines indicate the rapid leg drive. Character: A female athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 8. TITAN'S DIP ---
generate "assets/images/exercises/titan_dip.png" \
    "**A dynamic comic-book style illustration of a Tricep Dip. The character is in the top locked-out position on parallel bars, but a semi-transparent 'ghost' outline shows the bottom dipped position to demonstrate the range of motion. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple bronze speed lines indicate the pressing movement. Character: A male athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 9. ARCHER'S PIKE PUSH-UP ---
generate "assets/images/exercises/archer_pike_pushup.png" \
    "**A dynamic comic-book style illustration of a Pike Push-up. The character is in the inverted V 'pike' position with head lowered near ground, but a semi-transparent 'ghost' outline shows the starting pike position with arms straight to demonstrate the pressing range. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple teal speed lines indicate the vertical press. Character: A female athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 10. WALL SENTINEL HOLD ---
generate "assets/images/exercises/wall_sentinel_hold.png" \
    "**A dynamic comic-book style illustration of a Wall Sit. The character is sitting against a wall with thighs parallel to ground. A semi-transparent 'ghost' outline shows the standing position leaning against the wall to demonstrate the setup. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple grey stability lines indicate the isometric hold. Character: A male athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 11. THUNDER JUMPING JACK ---
generate "assets/images/exercises/thunder_jumping_jack.png" \
    "**A dynamic comic-book style illustration of a Jumping Jack. The character is in the 'open' position (legs wide, arms overhead), but a semi-transparent 'ghost' outline shows the 'closed' standing position to demonstrate the movement. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple yellow electric speed lines indicate the jumping arc. Character: A female athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 12. PALADIN'S HIGH KNEE ---
generate "assets/images/exercises/paladin_high_knee.png" \
    "**A dynamic comic-book style illustration of High Knees running. The character has the left knee driven high, but a semi-transparent 'ghost' outline shows the right knee driven high to demonstrate the alternating running action. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple gold speed lines indicate the upward knee drive. Character: A male athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 13. WIZARD'S BICYCLE CRUNCH ---
generate "assets/images/exercises/wizard_bicycle_crunch.png" \
    "**A dynamic comic-book style illustration of a Bicycle Crunch. The character is twisting right elbow to left knee, but a semi-transparent 'ghost' outline shows the opposite twist (left elbow to right knee) to demonstrate the alternating rotation. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple violet speed lines indicate the rotational movement. Character: A female athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 14. KNIGHT'S DIAMOND PUSH-UP ---
generate "assets/images/exercises/knight_diamond_pushup.png" \
    "**A dynamic comic-book style illustration of a Diamond Push-up. The character is in the bottom position with chest near diamond-shaped hands, but a semi-transparent 'ghost' outline shows the top plank position to demonstrate the range of motion. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple crystal blue speed lines indicate the pushing movement. Character: A male athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 15. RANGER'S SINGLE LEG DEADLIFT ---
generate "assets/images/exercises/ranger_single_leg_deadlift.png" \
    "**A dynamic comic-book style illustration of a Single-Leg Deadlift. The character is in the horizontal 'T' position (hinged forward), but a semi-transparent 'ghost' outline shows the upright standing position to demonstrate the hip hinge movement. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple forest green speed lines indicate the hinging arc. Character: A female athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 16. DRUID'S COBRA STRETCH ---
generate "assets/images/exercises/druid_cobra_stretch.png" \
    "**A dynamic comic-book style illustration of a Cobra Stretch. The character is in the lifted chest position, but a semi-transparent 'ghost' outline shows the prone face-down position to demonstrate the back extension. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple emerald green speed lines indicate the lifting movement. Character: A male athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 17. SAMURAI'S WARRIOR POSE ---
generate "assets/images/exercises/samurai_warrior_pose.png" \
    "**A dynamic comic-book style illustration of Warrior II Pose. The character is in the deep lunge stance with arms extended. A semi-transparent 'ghost' outline shows the standing feet-together position to demonstrate the step into the pose. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple wind-blue stability lines indicate the grounded strength. Character: A female athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 18. ROGUE'S SKATER HOP ---
generate "assets/images/exercises/rogue_skater_hop.png" \
    "**A dynamic comic-book style illustration of a Skater Hop. The character is landing on the right foot, but a semi-transparent 'ghost' outline shows the push-off from the left foot to demonstrate the lateral leap. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple shadow purple speed lines indicate the lateral trajectory. Character: A male athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 19. BARBARIAN'S OVERHEAD PRESS ---
generate "assets/images/exercises/barbarian_overhead_press.png" \
    "**A dynamic comic-book style illustration of an Overhead Press. The character is with weights fully overhead, but a semi-transparent 'ghost' outline shows the weights at shoulder level to demonstrate the pressing range. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple orange speed lines indicate the vertical lift. Character: A female athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# --- 20. ALCHEMIST'S HOLLOW BODY HOLD ---
generate "assets/images/exercises/alchemist_hollow_body.png" \
    "**A dynamic comic-book style illustration of a Hollow Body Hold. The character is in the 'banana' hold position (arms and legs lifted), but a semi-transparent 'ghost' outline shows the flat lying position to demonstrate the lift. Visual Style: Cel-shaded, thick contours, high contrast. Details: Simple magenta stability lines indicate the core tension. Character: A male athlete in dark tactical sportswear. Background: Minimalist Dark Blue (#0B0F19). Focus is entirely on the movement mechanics. --ar 1:1 --v 6.0 --no text**"

# ============================================
# QUESTS (10 JPG Images)
# ============================================
echo ""
echo "🗡️ QUESTS (10 images, RPG Focus)"
echo "---------------------"

generate "assets/images/quests/escape_collapsing_mine.jpg" \
    "**Epic Dark Fantasy Concept Art of a collapsing mine tunnel. Massive rocks falling, dust clouds, wooden beams cracking. Cinematic lighting, highly detailed, atmospheric. Deep obsidian blue shadows, brown rocks, orange torch light. Wide 16:9 format, no characters.**"

generate "assets/images/quests/guard_fortress_gate.jpg" \
    "**Epic Dark Fantasy Concept Art of a massive medieval fortress gate. Heavy iron and stone, battlements, torch sconces. Stormy sky, looming shadows of enemies. Cinematic lighting, highly detailed. Deep blue-black night, grey stone, orange torchlight. Wide 16:9, no characters.**"

generate "assets/images/quests/forge_dragon_blade.jpg" \
    "**Epic Dark Fantasy Concept Art of an ancient blacksmith forge. Massive stone anvil, roaring fire pit, molten metal, dragon symbols. Cinematic lighting, highly detailed. Deep obsidian shadows, bright orange-red forge fire. Wide 16:9, no characters.**"

generate "assets/images/quests/climb_titan_tower.jpg" \
    "**Epic Dark Fantasy Concept Art of an impossibly tall stone tower reaching into clouds. Worn spiral stairs, crumbling edges, vertigo angle. Cinematic lighting, highly detailed. Deep blue-black base, grey weathered stone. Wide 16:9, no characters.**"

generate "assets/images/quests/arcane_gauntlet.jpg" \
    "**Epic Dark Fantasy Concept Art of a wizard's trial chamber. Floating glowing rune circles, arcane symbols, crystalline formations, energy beams. Cinematic lighting, highly detailed. Deep obsidian blue, vibrant purple-blue magic. Wide 16:9, no characters.**"

generate "assets/images/quests/druid_path.jpg" \
    "**Epic Dark Fantasy Concept Art of a serene forest path at twilight. Ancient trees, glowing emerald moss, stone path, fireflies, moonlight. Cinematic lighting, highly detailed. Deep blue-green shadows, emerald glow, silver moonlight. Wide 16:9, no characters.**"

generate "assets/images/quests/sprint_shadowlands.jpg" \
    "**Epic Dark Fantasy Concept Art of a dark cursed realm. Twisted dead trees, purple-black shadows, eerie fog, ominous shapes. Cinematic lighting, highly detailed, horror atmosphere. Deep obsidian void, dark purple shadows. Wide 16:9, no characters.**"

generate "assets/images/quests/build_stronghold.jpg" \
    "**Epic Dark Fantasy Concept Art of a fantasy construction site. Massive stone blocks, wooden scaffolding, half-built towers, tools. Cinematic lighting, highly detailed. Deep blue dusk sky, grey stone, brown wood, torch lighting. Wide 16:9, no characters.**"

generate "assets/images/quests/iron_gauntlet_challenge.jpg" \
    "**Epic Dark Fantasy Concept Art of a brutal underground arena. Black iron and stone, hanging chains, weapon racks, battle-scarred floor. Cinematic lighting, highly detailed. Deep black-blue shadows, metallic sheen, cold blue light. Wide 16:9, no characters.**"

generate "assets/images/quests/morning_champion.jpg" \
    "**Epic Dark Fantasy Concept Art of a sunrise training ground. Dawn light, open courtyard, morning mist, birds in flight. Cinematic lighting, highly detailed. Transitioning from deep night blue to warm orange-yellow sunrise. Wide 16:9, no characters.**"

# ============================================
# BOSSES (5 PNG Images)
# ============================================
echo ""
echo "🐉 BOSSES (5 images)"
echo "--------------------"

generate "assets/images/bosses/wind_wraith.png" \
    "**A dynamic comic-book style illustration of a Wind Wraith. Ethereal creature made of swirling storm clouds and lightning, humanoid shape dissolving into wind. Visual Style: Cel-shaded, thick contours, high contrast. Details: Glowing electric blue eyes, trailing wisps. Background: Deep obsidian void. --ar 1:1 --v 6.0 --no text**"

generate "assets/images/bosses/stone_golem.png" \
    "**A dynamic comic-book style illustration of a Stone Golem. Massive construct of cracked granite and moss, glowing orange-red runes. Visual Style: Cel-shaded, thick contours, high contrast. Details: Fists like boulders, imposing stance. Background: Deep obsidian void. --ar 1:1 --v 6.0 --no text**"

generate "assets/images/bosses/shadow_serpent.png" \
    "**A dynamic comic-book style illustration of a Shadow Serpent. Massive snake made of living darkness, purple-black scales. Visual Style: Cel-shaded, thick contours, high contrast. Details: Glowing violet eyes, venomous fangs. Background: Deep obsidian void. --ar 1:1 --v 6.0 --no text**"

generate "assets/images/bosses/forest_titan.png" \
    "**A dynamic comic-book style illustration of a Forest Titan. Ancient tree-like creature with bark skin, glowing green veins. Visual Style: Cel-shaded, thick contours, high contrast. Details: Antler-like branches, mossy beard. Background: Deep obsidian void. --ar 1:1 --v 6.0 --no text**"

generate "assets/images/bosses/fire_dragon.png" \
    "**A dynamic comic-book style illustration of a Fire Dragon. Massive scaled beast, molten cracks in obsidian scales. Visual Style: Cel-shaded, thick contours, high contrast. Details: Burning orange eyes, flames licking from jaws. Background: Deep obsidian void. --ar 1:1 --v 6.0 --no text**"

# ============================================
# ADVENTURES (5 JPG Images)
# ============================================
echo ""
echo "🏰 ADVENTURES (5 images, RPG Focus)"
echo "------------------------"

generate "assets/images/adventures/scout_trial.jpg" \
    "**Epic Dark Fantasy Concept Art of a sweeping landscape. Multiple terrains, forest paths, mountain trails, winding road to distant mountains. Cinematic lighting, highly detailed. Deep blue dusk sky, green-brown landscape. Wide 16:9, no characters.**"

generate "assets/images/adventures/guardian_oath.jpg" \
    "**Epic Dark Fantasy Concept Art of a massive fortress under siege. Defensive walls, torches burning, enemy forces in darkness. Cinematic lighting, highly detailed. Deep obsidian night, warm fortress lights, cold enemy shadows. Wide 16:9, no characters.**"

generate "assets/images/adventures/monk_enlightenment.jpg" \
    "**Epic Dark Fantasy Concept Art of a mystical mountain temple at dawn. Meditation stones, cherry blossoms, mist-shrouded peaks. Cinematic lighting, highly detailed. Deep blue-purple pre-dawn, warm golden lights. Wide 16:9, no characters.**"

generate "assets/images/adventures/ranger_journey.jpg" \
    "**Epic Dark Fantasy Concept Art of an epic wilderness vista. Vast forest, winding river, distant volcanic mountain, ancient path. Cinematic lighting, highly detailed. Deep blue twilight, green forest, orange distant glow. Wide 16:9, no characters.**"

generate "assets/images/adventures/iron_lord_conquest.jpg" \
    "**Epic Dark Fantasy Concept Art of a dark fortress of the Iron Lord. Massive black iron citadel, lava moat, ominous red sky. Cinematic lighting, highly detailed. Deep obsidian black, blood-red sky, molten lava. Wide 16:9, no characters.**"

# ============================================
# SUMMARY
# ============================================
echo ""
echo "================================"
echo "🎉 Image generation complete!"
echo "================================"
echo ""
echo "Generated images in:"
echo "  - assets/images/exercises/ (20 PNGs)"
echo "  - assets/images/quests/ (10 JPGs)"
echo "  - assets/images/bosses/ (5 PNGs)"
echo "  - assets/images/adventures/ (5 JPGs)"
echo ""
echo "Total: ~40 images"
echo ""
