import { WAVE_LOOK, TIER_SCALE } from '../config/waveLook';
import { fragmentShaderBody } from '../shaders/unifiedFragment';

// ══════════════════════════════════════════════════════════════
// 统一 Shader 构建器
// 合并 waveShaderBuilder + GlassCubeScene 的 shader 构建逻辑
// ══════════════════════════════════════════════════════════════

/** 将数字格式化为 GLSL 浮点数字符串 */
function glslFloat(value) {
  const trimmed = Number(value).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return trimmed.includes('.') ? trimmed : `${trimmed}.0`;
}

/** 将 [r, g, b] 数组格式化为 GLSL vec3 */
function glslVec3(values) {
  return `vec3(${values.map(glslFloat).join(', ')})`;
}

const bg = WAVE_LOOK.background;
const st = WAVE_LOOK.studio;
const sp = WAVE_LOOK.spike;

// 配置 → GLSL #define 映射
const LOOK_MAP = [
  // ── background ──
  ['BG_ENV_BASE_MIX',       bg.envBaseMix],
  ['BG_FOCUS_SPEED',        bg.focusSpeed],
  ['BG_FOCUS_PHASE_OFFSET', bg.focusPhaseOffset],
  ['BG_FOCUS_X_MIN',        bg.focusXRange[0]],
  ['BG_FOCUS_X_MAX',        bg.focusXRange[1]],
  ['BG_FOCUS_Y_MIN',        bg.focusYRange[0]],
  ['BG_FOCUS_Y_MAX',        bg.focusYRange[1]],
  ['BG_FOCUS_GAIN_MIN',     bg.focusGainRange[0]],
  ['BG_FOCUS_GAIN_MAX',     bg.focusGainRange[1]],
  ['BG_FOCUS_SCALE_X',      bg.focusScale[0]],
  ['BG_FOCUS_SCALE_Y',      bg.focusScale[1]],
  ['BG_FOCUS_COLOR',        bg.focusColor,  'v3'],
  ['BG_SWEEP_SPEED',        bg.sweepSpeed],
  ['BG_SWEEP_PHASE_OFFSET', bg.sweepPhaseOffset],
  ['BG_SWEEP_X_MIN',        bg.sweepXRange[0]],
  ['BG_SWEEP_X_MAX',        bg.sweepXRange[1]],
  ['BG_SWEEP_Y',            bg.sweepY],
  ['BG_SWEEP_GAIN_MIN',     bg.sweepGainRange[0]],
  ['BG_SWEEP_GAIN_MAX',     bg.sweepGainRange[1]],
  ['BG_SWEEP_SCALE_X',      bg.sweepScale[0]],
  ['BG_SWEEP_SCALE_Y',      bg.sweepScale[1]],
  ['BG_SWEEP_COLOR',        bg.sweepColor,  'v3'],

  // ── studio (ENV) ──
  ['ENV_DRIFT_SPEED',         st.driftSpeed],
  ['ENV_DRIFT_X_AMP',         st.driftAmplitude[0]],
  ['ENV_DRIFT_Y_AMP',         st.driftAmplitude[1]],
  ['ENV_DRIFT_Z_AMP',         st.driftAmplitude[2]],
  ['ENV_KEY_SOFT_GAIN',       st.keyStrength[0]],
  ['ENV_KEY_HARD_GAIN',       st.keyStrength[1]],
  ['ENV_FILL_SOFT_GAIN',      st.fillStrength[0]],
  ['ENV_FILL_HARD_GAIN',      st.fillStrength[1]],
  ['ENV_RIM_SOFT_GAIN',       st.rimStrength[0]],
  ['ENV_RIM_HARD_GAIN',       st.rimStrength[1]],
  ['ENV_TOP_LIGHT_GAIN',      st.topLightStrength],
  ['ENV_BOTTOM_LIGHT_GAIN',   st.bottomLightStrength],
  ['ENV_BAND_A_SPEED',        st.bandA.speed],
  ['ENV_BAND_A_AMPLITUDE',    st.bandA.amplitude],
  ['ENV_BAND_A_INTENSITY',    st.bandA.intensity],
  ['ENV_BAND_B_SPEED',        st.bandB.speed],
  ['ENV_BAND_B_PHASE_OFFSET', st.bandB.phaseOffset],
  ['ENV_BAND_B_AMPLITUDE',    st.bandB.amplitude],
  ['ENV_BAND_B_INTENSITY',    st.bandB.intensity],
  ['ENV_SWEEP_A_SPEED',       st.sweepA.speed],
  ['ENV_SWEEP_A_AMPLITUDE',   st.sweepA.amplitude],
  ['ENV_SWEEP_A_CENTER_X',    st.sweepA.centerX],
  ['ENV_SWEEP_A_CENTER_Y',    st.sweepA.centerY],
  ['ENV_SWEEP_A_INTENSITY',   st.sweepA.intensity],
  ['ENV_SWEEP_B_SPEED',       st.sweepB.speed],
  ['ENV_SWEEP_B_PHASE_OFFSET',st.sweepB.phaseOffset],
  ['ENV_SWEEP_B_AMPLITUDE',   st.sweepB.amplitude],
  ['ENV_SWEEP_B_CENTER_X',    st.sweepB.centerX],
  ['ENV_SWEEP_B_CENTER_Y',    st.sweepB.centerY],
  ['ENV_SWEEP_B_INTENSITY',   st.sweepB.intensity],

  // ── spike 材质参数 ──
  ['SPIKE_METAL_REFLECT_BOOST',        sp.metalReflectBoost],
  ['SPIKE_METAL_SPEC_BOOST',           sp.metalSpecBoost],
  ['SPIKE_METAL_LIFT_MIN',             sp.metalEdgeLift[0]],
  ['SPIKE_METAL_LIFT_MAX',             sp.metalEdgeLift[1]],
  ['SPIKE_CRYSTAL_IOR',                sp.crystalIor],
  ['SPIKE_CRYSTAL_REFLECT_BOOST',      sp.crystalReflectBoost],
  ['SPIKE_CRYSTAL_TRANSMISSION_BOOST', sp.crystalTransmissionBoost],
  ['SPIKE_CRYSTAL_THICKNESS_MIN',      sp.crystalThickness[0]],
  ['SPIKE_CRYSTAL_THICKNESS_MAX',      sp.crystalThickness[1]],
  ['SPIKE_CRYSTAL_ABSORPTION',         sp.crystalAbsorption,       'v3'],
  ['SPIKE_CRYSTAL_EDGE_TINT',          sp.crystalEdgeTint,         'v3'],
  ['SPIKE_CRYSTAL_EDGE_TINT_BOOST',    sp.crystalEdgeTintBoost],
  ['SPIKE_CRYSTAL_SPEC_BOOST',         sp.crystalSpecBoost],
  ['SPIKE_CRYSTAL_LIFT_MIN',           sp.crystalLift[0]],
  ['SPIKE_CRYSTAL_LIFT_MAX',           sp.crystalLift[1]],
  ['SPIKE_IRIDESCENT_BASE_TINT',       sp.iridescentBaseTint,      'v3'],
  ['SPIKE_IRIDESCENT_FILM_A',          sp.iridescentFilmColorA,    'v3'],
  ['SPIKE_IRIDESCENT_FILM_B',          sp.iridescentFilmColorB,    'v3'],
  ['SPIKE_IRIDESCENT_CORE_LIFT',       sp.iridescentCoreLift],
  ['SPIKE_IRIDESCENT_EDGE_LIFT',       sp.iridescentEdgeLift],
  ['SPIKE_IRIDESCENT_FILM_STRENGTH',   sp.iridescentFilmStrength],
  ['SPIKE_IRIDESCENT_BAND_SCALE',      sp.iridescentBandScale],
  ['SPIKE_IRIDESCENT_SWEEP_SCALE',     sp.iridescentSweepScale],
  ['SPIKE_IRIDESCENT_SPEC_BOOST',      sp.iridescentSpecBoost],
  ['SPIKE_PEARL_BASE_COLOR',           sp.pearlBaseColor,          'v3'],
  ['SPIKE_PEARL_SHADOW_TINT',          sp.pearlShadowTint,         'v3'],
  ['SPIKE_PEARL_SHEEN_COLOR',          sp.pearlSheenColor,         'v3'],
  ['SPIKE_PEARL_REFLECT_MIX',          sp.pearlReflectMix],
  ['SPIKE_PEARL_CORE_LIFT',            sp.pearlCoreLift],
  ['SPIKE_PEARL_EDGE_LIFT',            sp.pearlEdgeLift],
  ['SPIKE_PEARL_SPEC_BOOST',           sp.pearlSpecBoost],
  ['SPIKE_PEARL_SHEEN_BOOST',          sp.pearlSheenBoost],
  ['GLASS_IOR',                        sp.glassIor],
  ['GLASS_ABSORPTION',                 sp.glassAbsorption,         'v3'],
  ['GLASS_SPEC_BOOST',                 sp.glassSpecBoost],
  ['GLASS_REFLECT_MIX',                sp.glassReflectMix],
  ['GLASS_EDGE_GLOW',                  sp.glassEdgeGlow,           'v3'],
  ['GLASS_EDGE_GLOW_BOOST',            sp.glassEdgeGlowBoost],
  ['CAMERA_REFRACT_SCALE',             sp.cameraRefractScale],
  ['CAMERA_REFLECT_MIX',               sp.cameraReflectMix],
  ['CAMERA_TRANSMIT_DIM',              sp.cameraTransmitDim],
];

function buildLookDefines() {
  return LOOK_MAP.map(([name, val, type]) =>
    `#define ${name} ${type === 'v3' ? glslVec3(val) : glslFloat(val)}`
  );
}

// spike 材质模式 → #define
const MATERIAL_DEFINE_MAP = {
  'glass-real': '#define SPIKE_MATERIAL_GLASS',
  'crystal-lite': '#define SPIKE_MATERIAL_CRYSTAL',
  'pearl-ceramic': '#define SPIKE_MATERIAL_PEARL',
  'thin-film-iridescent': '#define SPIKE_MATERIAL_IRIDESCENT',
};

function getSpikeMaterialDefine() {
  return MATERIAL_DEFINE_MAP[WAVE_LOOK.spikeMaterialMode] || '#define SPIKE_MATERIAL_METAL';
}

// 每个 GPU 档位的独有 define
const TIER_DEFINES = {
  high: [
    '#define MAX_STEPS 40',
    '#define SURF_DIST 0.002',
    '#define NORMAL_EPS 0.004',
    '#define GLASS_INTERIOR_STEPS 12',
    '#define QUALITY_HIGH',
    '#define SPIKE_ENABLED',
  ],
  medium: [
    '#define MAX_STEPS 36',
    '#define SURF_DIST 0.003',
    '#define NORMAL_EPS 0.003',
    '#define GLASS_INTERIOR_STEPS 10',
    '#define QUALITY_MEDIUM',
    '#define SPIKE_ENABLED',
  ],
  low: [
    '#define MAX_STEPS 24',
    '#define SURF_DIST 0.006',
    '#define NORMAL_EPS 0.004',
    '#define GLASS_INTERIOR_STEPS 8',
    '#define QUALITY_LOW',
    '#define SPIKE_ENABLED',
  ],
};

/**
 * 从 debug 面板覆盖参数构建 tier defines
 * @param {'high'|'medium'|'low'} tier
 * @param {Object} overrides - { maxSteps, surfDist, normalEps, glassInteriorSteps }
 */
function buildTierDefinesFromOverrides(tier, overrides) {
  const qualityDefine = { high: 'QUALITY_HIGH', medium: 'QUALITY_MEDIUM', low: 'QUALITY_LOW' }[tier] || 'QUALITY_MEDIUM';
  return [
    `#define MAX_STEPS ${overrides.maxSteps}`,
    `#define SURF_DIST ${glslFloat(overrides.surfDist)}`,
    `#define NORMAL_EPS ${glslFloat(overrides.normalEps)}`,
    `#define GLASS_INTERIOR_STEPS ${overrides.glassInteriorSteps}`,
    `#define ${qualityDefine}`,
    '#define SPIKE_ENABLED',
  ];
}

/**
 * 构建完整的统一 fragment shader。
 * @param {'high'|'medium'|'low'} tier - GPU 性能档位
 * @param {Object} [tierOverrides=null] - 可选的参数覆盖（来自 GPU 调参面板）
 * @returns {string} 完整的 GLSL fragment shader
 */
export function buildUnifiedShader(tier, tierOverrides = null) {
  const tierDefines = tierOverrides
    ? buildTierDefinesFromOverrides(tier, tierOverrides)
    : (TIER_DEFINES[tier] || TIER_DEFINES.medium);
  const materialDefine = getSpikeMaterialDefine();
  const lookDefines = buildLookDefines();
  return [...tierDefines, materialDefine, ...lookDefines].join('\n') + '\n' + fragmentShaderBody;
}

/** 检测 GPU 性能档位 */
export function detectGPUTier() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return 'low';
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (ext) {
    const r = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL).toLowerCase();
    if (r.includes('intel') || r.includes('swiftshader') || r.includes('llvmpipe')) return 'low';
    if (r.includes('apple') || r.includes('nvidia') || r.includes('radeon')) return 'high';
  }
  return 'medium';
}

/** 获取 GPU 档位对应的缩放比例 */
export function getTierScale(tier) {
  return TIER_SCALE[tier] || TIER_SCALE.medium;
}
