/**
 * sceneReplay — pure helpers for the real-scene replay canvas (components/SceneReplayStage.jsx)
 *
 * Input: one scene JSON from public/data/drive/<id>.json (schema in public/data/drive/README.md).
 * Output: flat typed arrays so the render loop can sample, cull and draw without allocating.
 *
 * Frame: local, x forward / y left, metres, headings CCW from +x. No DOM access here.
 */

const TWO_PI = Math.PI * 2;

/* Agent type codes stored in `agentType`. */
export const AGENT_VEHICLE = 0;
export const AGENT_BICYCLE = 1;
export const AGENT_PEDESTRIAN = 2;
const TYPE_CODE = { vehicle: AGENT_VEHICLE, bicycle: AGENT_BICYCLE, pedestrian: AGENT_PEDESTRIAN };

/**
 * Flatten a list of shapes into one layer. Each shape is a list of rings, each ring a list of [x, y].
 *   pts       Float32Array  x0, y0, x1, y1, ...
 *   ringStart Uint32Array   point offset of every ring (+ terminal entry)
 *   shapeStart Uint32Array  ring offset of every shape (+ terminal entry)
 *   bbox      Float32Array  minX, minY, maxX, maxY per shape (over all its rings)
 */
function buildLayer(shapes) {
  let nRings = 0;
  let nPts = 0;
  for (const rings of shapes) {
    nRings += rings.length;
    for (const ring of rings) nPts += ring.length;
  }
  const pts = new Float32Array(nPts * 2);
  const ringStart = new Uint32Array(nRings + 1);
  const shapeStart = new Uint32Array(shapes.length + 1);
  const bbox = new Float32Array(shapes.length * 4);
  let p = 0;
  let r = 0;
  shapes.forEach((rings, s) => {
    shapeStart[s] = r;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const ring of rings) {
      ringStart[r++] = p;
      for (const [x, y] of ring) {
        pts[p * 2] = x;
        pts[p * 2 + 1] = y;
        p++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    bbox[s * 4] = minX;
    bbox[s * 4 + 1] = minY;
    bbox[s * 4 + 2] = maxX;
    bbox[s * 4 + 3] = maxY;
  });
  ringStart[r] = p;
  shapeStart[shapes.length] = r;
  return { count: shapes.length, pts, ringStart, shapeStart, bbox };
}

/* Polylines are single-ring shapes. */
const lines = (list) => buildLayer(list.map((pts) => [pts]));

/**
 * Parse one scene JSON into typed arrays.
 * @param {object} json  scene as loaded from /data/drive/<id>.json
 * @returns {object}     parsed scene (see fields below)
 */
export function parseScene(json) {
  const n = json.ego.length;
  const ego = new Float32Array(n * 3);
  json.ego.forEach(([x, y, h], i) => {
    ego[i * 3] = x;
    ego[i * 3 + 1] = y;
    ego[i * 3 + 2] = h;
  });

  const agents = json.agents;
  const nAgents = agents.length;
  const agentType = new Uint8Array(nAgents);
  const agentLen = new Float32Array(nAgents);
  const agentWid = new Float32Array(nAgents);
  const agentPose = new Float32Array(nAgents * n * 3);
  const agentSeen = new Uint8Array(nAgents * n);
  agents.forEach((a, k) => {
    agentType[k] = TYPE_CODE[a.type] ?? AGENT_VEHICLE;
    agentLen[k] = a.length;
    agentWid[k] = a.width;
    a.track.forEach((pose, i) => {
      if (!pose) return;
      const o = (k * n + i) * 3;
      agentPose[o] = pose[0];
      agentPose[o + 1] = pose[1];
      agentPose[o + 2] = pose[2];
      agentSeen[k * n + i] = 1;
    });
  });

  const m = json.map;
  const connectors = m.connector_centerlines;
  const connIndex = new Map(connectors.map((c, i) => [c.id, i]));
  // Red state per frame and connector: 1 = red light controls this connector at that frame.
  const connRed = new Uint8Array(n * connectors.length);
  json.traffic_lights.forEach((list, i) => {
    for (const [id, red] of list) {
      const c = connIndex.get(id);
      if (c !== undefined && red) connRed[i * connectors.length + c] = 1;
    }
  });

  return {
    id: json.meta?.id ?? '',
    n,
    fps: json.fps,
    dt: json.dt,
    currentFrame: json.current_frame,
    egoLen: json.ego_size.length,
    egoWid: json.ego_size.width,
    ego,
    nAgents,
    agentType,
    agentLen,
    agentWid,
    agentPose,
    agentSeen,
    connRed,
    map: {
      drivable: buildLayer(m.drivable),
      walkways: buildLayer(m.walkways),
      intersections: buildLayer(m.intersections),
      crosswalks: buildLayer(m.crosswalks),
      stopLines: buildLayer(m.stop_lines),
      roadEdges: lines(m.road_edges),
      laneBoundaries: lines(m.lane_boundaries),
      laneCenterlines: lines(m.lane_centerlines),
      connectors: lines(connectors.map((c) => c.pts)),
    },
  };
}

/* Shortest signed difference b - a, wrapped to (-pi, pi]. */
function angleDelta(a, b) {
  let d = (b - a) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  else if (d <= -Math.PI) d += TWO_PI;
  return d;
}

/* Exponential approach for angles along the shortest arc. */
export function approachAngle(a, b, k) {
  return a + angleDelta(a, b) * k;
}

/**
 * Sample a pose track (stride 3) at fractional frame f: linear position, shortest-arc heading.
 * @param {Float32Array} arr  pose buffer
 * @param {number} base       index of frame 0 in `arr` (in poses, not floats)
 * @param {number} n          frame count
 * @param {number} f          fractional frame, clamped to [0, n - 1]
 * @param {Float32Array} out  receives x, y, heading
 */
export function samplePose(arr, base, n, f, out) {
  const fc = f < 0 ? 0 : f > n - 1 ? n - 1 : f;
  const i0 = Math.floor(fc);
  const i1 = i0 < n - 1 ? i0 + 1 : i0;
  const a = fc - i0;
  const o0 = (base + i0) * 3;
  const o1 = (base + i1) * 3;
  out[0] = arr[o0] + (arr[o1] - arr[o0]) * a;
  out[1] = arr[o0 + 1] + (arr[o1 + 1] - arr[o0 + 1]) * a;
  out[2] = arr[o0 + 2] + angleDelta(arr[o0 + 2], arr[o1 + 2]) * a;
}

/**
 * Sample agent k at fractional frame f. Returns false when it is not observed at floor(f);
 * when the next keyframe is missing the agent holds its last observed pose.
 */
export function sampleAgent(scene, k, f, out) {
  const n = scene.n;
  const i0 = Math.floor(f);
  if (i0 < 0 || i0 >= n || !scene.agentSeen[k * n + i0]) return false;
  if (i0 + 1 < n && scene.agentSeen[k * n + i0 + 1]) {
    samplePose(scene.agentPose, k * n, n, f, out);
  } else {
    const o = (k * n + i0) * 3;
    out[0] = scene.agentPose[o];
    out[1] = scene.agentPose[o + 1];
    out[2] = scene.agentPose[o + 2];
  }
  return true;
}

/* True when shape s of a layer overlaps the view box [minX, minY, maxX, maxY] (view is Float32Array(4)). */
export function shapeVisible(layer, s, view) {
  const b = layer.bbox;
  const o = s * 4;
  return b[o + 2] >= view[0] && b[o] <= view[2] && b[o + 3] >= view[1] && b[o + 1] <= view[3];
}

/* True when a point with radius r overlaps the view box. */
export function pointVisible(x, y, r, view) {
  return x + r >= view[0] && x - r <= view[2] && y + r >= view[1] && y - r <= view[3];
}
