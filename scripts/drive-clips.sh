#!/bin/bash
# Convert selected jev-drive rollout GIFs into small looping mp4 clips + webp posters
# for the /drive page wall and the home Drive section mosaic (public/video/drive/<id>.{mp4,webp}).
#
# Requires: ffmpeg (brew install ffmpeg), cwebp (brew install webp).
# Clip ids must match src/config/driveClips.js and the captions in src/config/i18n.js.
# Re-run after replacing a source GIF; outputs are overwritten. Stale outputs are removed at the end.
set -euo pipefail

JEV="${JEV_DRIVE_DIR:-$HOME/mycode/jev-drive}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/video/drive"
TMP="$(mktemp -d)"
mkdir -p "$OUT"
KEEP=()

convert() { # id source.gif
  local id="$1" src="$2"
  KEEP+=("$id")
  # Never upscale: wide CARLA clips are 600 px, dashboards 960 px; cap at 640.
  ffmpeg -y -loglevel error -i "$src" -movflags +faststart -pix_fmt yuv420p \
    -vf "scale='min(640,iw)':-2:flags=lanczos" -c:v libx264 -crf 28 -preset slow -an "$OUT/$id.mp4"
  ffmpeg -y -loglevel error -i "$src" -vframes 1 -vf "scale='min(640,iw)':-2:flags=lanczos" "$TMP/$id.png"
  cwebp -quiet -q 70 "$TMP/$id.png" -o "$OUT/$id.webp"
  printf "%-26s %6sK %6sK\n" "$id" "$(du -k "$OUT/$id.mp4" | cut -f1)" "$(du -k "$OUT/$id.webp" | cut -f1)"
}

LB="$JEV/experiments/leaderboard_audit/figs/loss_budget_examples"
OP="$JEV/experiments/op_closed_loop/figs"
AS="$JEV/experiments/alpasim/figs/collisions"

# CARLA (Bench2Drive): third-person view + the model's own road / wide inputs
convert carla-night-blocked     "$LB/b2d_blocked_drive_19324_s0.gif"
convert carla-blocked-drive     "$LB/b2d_blocked_drive_9196_s0.gif"
convert carla-blocked-merge     "$LB/b2d_blocked_vmerge2_15612_s1.gif"
convert carla-bypass            "$LB/b2d_byp_pbyp2ng_19832_s0.gif"
convert carla-bypass-b          "$LB/b2d_byp_pbyp2ng_2520_s0.gif"
convert carla-bypass-merge      "$LB/b2d_byp_vmerge2_19832_s1.gif"
convert carla-collision         "$LB/b2d_coll_drive_27043_s0.gif"
convert carla-collision-merge   "$LB/b2d_coll_vmerge2_27043_s0.gif"
convert carla-red-light         "$LB/b2d_red_vred_24944_s0.gif"
convert carla-red-light-b       "$LB/b2d_red_drive_24944_s0.gif"
convert carla-red-light-c       "$LB/b2d_red_vred_16390_s0.gif"
convert carla-red-light-d       "$LB/b2d_red_vred_27297_s0.gif"
convert carla-stop-merge        "$LB/b2d_stop_vmerge2_17280_s2.gif"
convert carla-tight-curve       "$OP/D_24944_tight_curve.gif"
convert carla-sharp-turn        "$OP/spec_shipped_28180_sharp_turn.gif"

# nuPlan camera scenes (navhard stage two), with the reactive BEV in one quadrant
convert navhard-collision       "$LB/navhard_collisions_1cdb5f8486a6e3a2b.gif"
convert navhard-road-edge       "$LB/navhard_road_edge_wide_7516958eab299d94d.gif"
convert navhard-stopped-slow    "$LB/navhard_stopped_slow_1b3fd5e7993de38c0.gif"
convert navhard-wrong-direction "$LB/navhard_wrong_direction_3e0e15540dab7a9e5.gif"

# Two forensic dashboards (white background) for the page wall only
convert nuplan-turn-neighbour   "$AS/n07.gif"
convert pai-pedestrian          "$AS/pai_p11_pedestrian_8f3902f9.gif"

# Remove outputs that are no longer in the list
for f in "$OUT"/*.mp4; do
  id="$(basename "$f" .mp4)"
  if [[ ! " ${KEEP[*]} " =~ " $id " ]]; then rm -f "$OUT/$id.mp4" "$OUT/$id.webp"; echo "removed $id"; fi
done

rm -rf "$TMP"
du -sh "$OUT"
