#!/bin/bash
# Convert selected jev-drive rollout GIFs / mp4s into small looping mp4 clips + webp posters
# for the /drive page wall and the home Drive section mosaic (public/video/drive/<id>.{mp4,webp}).
#
# Requires: ffmpeg (brew install ffmpeg), cwebp (brew install webp).
# Clip ids must match src/config/driveClips.js and the captions in src/config/i18n.js.
# Re-run after replacing a source file; outputs are overwritten. Stale outputs are removed at the end.
#
# Source GIFs run at 4-10 fps and look choppy. Every clip is sped up by SPEED (1.5x by default)
# and motion-interpolated to FPS (30 by default) so the loop plays smoothly.
#
# Real-scene sources (REAL below) are AlpaSim Physical AI AV (PAI) rollouts of our own driver on the Tokyo box
# (ssh ujs@100.108.238.8): NRE neural reconstructions of real recorded drives, 900x1000 @ 10 fps, 20 s, BEV + metrics
# on top and the front-wide 120 deg camera below. They are not in git; fetch them first with scp, e.g.
#   P=/data/runs/onpol_long/pai281; mkdir -p ~/mycode/jev-drive/tmp/real-clips
#   scp ujs@100.108.238.8:$P/<arm>/runs/<chunk>/sim/rollouts/clipgt-<scene>/<rollout>/<file>.mp4 \
#       ~/mycode/jev-drive/tmp/real-clips/<name>.mp4
# with these <arm>/runs/<chunk>/sim/rollouts/clipgt-<scene>/<rollout> (file = clipgt-<scene>_<rollout>_camera_front_wide_120fov_default.mp4):
#   pai-night-roundabout.mp4        ys1/runs/ys-l18-s1_c002/.../clipgt-00fabf60-8aa0-48b3-b7c8-eb3d7e8df1e3/d130425a-c60c-11f1-914c-8da56de74de0
#   pai-underpass-cyclist.mp4       ybase/runs/yr10m10-f-s0_c001/.../clipgt-c7956ed6-0be6-44f2-8066-da068a6352b4/1d51c9ea-c5c4-11f1-9d9a-1b3679f7c183
#   pai-crosswalk-intersection.mp4  ybase/runs/yr10m10-f-s0_c000/.../clipgt-6250146a-7f9f-4508-851e-e25b7d9dc36a/01d25a06-c5c2-11f1-bd06-6ba2358d5127
#   pai-city-street-pedestrians.mp4 ybase/runs/yr10m10-f-s0_c001/.../clipgt-b661da67-eb54-47d7-8d7b-1d1f8ca1f1e0/7bf29ec2-c5c2-11f1-9d9a-1b3679f7c183
#   pai-dusk-traffic.mp4            ybase/runs/yr10m10-f-s0_c003/.../clipgt-903731dd-809b-4bae-9ebd-a53e5d49dbbd/9540cbc0-c5c6-11f1-9683-57763f09df25
#   pai-boulevard-truck.mp4         ybase/runs/yr10m10-f-s0_c003/.../clipgt-7d16a9a9-e4c6-4cc1-be75-507c64b0bb90/0c4787b4-c5c6-11f1-9683-57763f09df25
# (".../" = "sim/rollouts/"). On the box, ~/Desktop/pai_videos/<scene8>_<arm>_<score>_<kind>.mp4 symlinks to the same files.
# Each is cropped to the camera panel and trimmed to the first seconds, before the reconstruction degrades.
set -euo pipefail

SPEED="${SPEED:-1.5}"
FPS="${FPS:-30}"

JEV="${JEV_DRIVE_DIR:-$HOME/mycode/jev-drive}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/video/drive"
TMP="$(mktemp -d)"
mkdir -p "$OUT"
KEEP=()

convert() { # id source [prefilter, e.g. crop / trim]
  local id="$1" src="$2" pre="${3:+$3,}"
  KEEP+=("$id")
  # Never upscale: wide CARLA clips are 600 px, dashboards 960 px; cap at 640.
  ffmpeg -y -loglevel error -i "$src" -movflags +faststart -pix_fmt yuv420p \
    -vf "${pre}setpts=PTS/$SPEED,minterpolate=fps=$FPS:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,scale='min(640,iw)':-2:flags=lanczos" \
    -c:v libx264 -crf 28 -preset slow -an "$OUT/$id.mp4"
  ffmpeg -y -loglevel error -i "$src" -vframes 1 -vf "${pre}scale='min(640,iw)':-2:flags=lanczos" "$TMP/$id.png"
  cwebp -quiet -q 70 "$TMP/$id.png" -o "$OUT/$id.webp"
  printf "%-26s %6sK %6sK\n" "$id" "$(du -k "$OUT/$id.mp4" | cut -f1)" "$(du -k "$OUT/$id.webp" | cut -f1)"
}

LB="$JEV/experiments/leaderboard_audit/figs/loss_budget_examples"
OP="$JEV/experiments/op_closed_loop/figs"
AS="$JEV/experiments/alpasim/figs/collisions"
REAL="${REAL_CLIPS_DIR:-$JEV/tmp/real-clips}"
# Camera panel of the PAI rollout video (x 30-870, y 517-990), inset 2 px to drop the frame line
CAM="crop=836:470:32:519"
cam() { echo "$CAM,trim=0:$1,setpts=PTS-STARTPTS"; } # seconds kept from the start

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

# Real-scene closed-loop replays (Tokyo box): AlpaSim PAI, our driver, all six scored 1.00
convert real-pai-night-roundabout   "$REAL/pai-night-roundabout.mp4"        "$(cam 15)"
convert real-pai-underpass-cyclist  "$REAL/pai-underpass-cyclist.mp4"       "$(cam 12)"
convert real-pai-crosswalk          "$REAL/pai-crosswalk-intersection.mp4"  "$(cam 13)"
convert real-pai-city-pedestrians   "$REAL/pai-city-street-pedestrians.mp4" "$(cam 12)"
convert real-pai-dusk-traffic       "$REAL/pai-dusk-traffic.mp4"            "$(cam 17)"
convert real-pai-boulevard-truck    "$REAL/pai-boulevard-truck.mp4"         "$(cam 18)"

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
