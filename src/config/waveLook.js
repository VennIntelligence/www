import * as THREE from 'three';

// ══════════════════════════════════════════════════════════════
// WaveCanvas 全局配置
// 调参改这里即可，不用翻 shader 或组件代码
// ══════════════════════════════════════════════════════════════

// --- GPU 分档 ---
// 各 GPU 档位对应的渲染分辨率缩放比例。默认 high=0.75, medium=0.5, low=0.35。
// 调大画面更清晰但更吃 GPU；调小画面模糊但更流畅。
export const TIER_SCALE = { high: 0.75, medium: 0.5, low: 0.35 };
// 启动时使用的 GPU 档位。默认 'low'，首帧用低配渲染以减少白屏时间。
export const BOOT_TIER = 'low';
// 启动阶段的额外低分辨率缩放。默认 0.38。调小首帧更快但更模糊。
export const BOOT_SCALE = 0.38;
// 启动阶段最短持续毫秒数。默认 900ms。低于此时间不会切换到正式档位。
export const BOOT_MIN_MS = 900;

// --- 相机 ---
// 相机 Z 轴位置（离场景的距离）。默认 12。调大视角更远、物体更小；调小更近更大。
export const CAMERA_Z = 12;
// 相机视场角系数（负值）。默认 -3.9。绝对值越大视角越窄（长焦），越小越广（广角）。
export const CAMERA_FOV = -3.9;
export const CAMERA_FOV_ABS = Math.abs(CAMERA_FOV);
// 视图水平偏移。默认 -0.22（整体画面左移）。正值右移，负值左移。
export const VIEW_SHIFT_X = -0.22;
// 视图垂直偏移。默认 0.02（整体画面微微上移）。正值上移，负值下移。
export const VIEW_SHIFT_Y = 0.02;

// --- 液滴 ---
// 三颗液滴的半径 [大, 中, 小]。默认 [0.85, 0.58, 0.2]。调大液滴更大，调小更小。
export const DROP_RADII = [0.85, 0.58, 0.2];
// 液滴被推离后弹回原位的弹簧刚度。默认 5.2。越大回弹越快越硬。
// 调低至 0.8 以贴合用户“非常慢”的需求，产生一种漂浮感。
export const DROP_RETURN_STIFFNESS = 0.8;
// 液滴运动阻尼。默认 2.8。越大减速越快、运动越黏稠。
// 配合低刚度，调至 2.2 使其运动更轻盈一点。
export const DROP_DAMPING = 2.2;
// 鼠标/触摸捕获液滴的半径倍数。默认 2.2。实际捕获距离 = 该液滴半径 × 此倍数。
// 大液滴自然更容易抓住，小液滴需要更精准。调大全部更容易抓；调小需要更靠近。
export const DROP_DRAG_CATCH_MULT = 2.2;
// 液滴跟随指针的弹簧刚度。默认 8.5。越大跟随越快越利落，越小越懒散。
// 对比立方体是直接跟随（无弹簧），液滴用弹簧实现稍慢半拍的手感。
export const DROP_DRAG_STIFFNESS = 8.5;
// 液滴被松手抛出时的速度增益。默认 0.35。越大松手后飞得越远。
export const DROP_DRAG_RELEASE_BOOST = 0.35;
// 页面滚动时液滴受到的下坠力。默认 6.0（原 20.5）。越大滚动时液滴往下偏移越明显。
// 调低此值避免滚动时液滴被齐刷刷地拉到下方。
export const DROP_SCROLL_GRAVITY = 6.0;
// 立方体经过时对液滴的推力增益。默认 5.8。越大立方体经过时液滴被推得越远。
export const DROP_CUBE_SWAT_GAIN = 5.8;
// 液滴偏离轨道基准位的最大允许距离。默认 2.8。拖拽或被推离时不会超过此距离。
export const DROP_MAX_OFFSET = 2.8;
// 底部边界缓冲区宽度（世界坐标单位）。默认 0.5。
// 从边界上方此距离开始减速。调大 → 更早开始减速更柔和；调小 → 更硬更突然。
export const DROP_BOUNDARY_CUSHION = 0.5;
// 缓冲区内最大弹簧推力刚度。默认 12.0（旧值 40.0 太硬导致乒乓弹跳）。
// 调大 → 边界更硬弹跳更明显；调小 → 更柔软但可能穿越边界。
export const DROP_BOUNDARY_STIFFNESS = 12.0;
// 接近底部边界时对向下速度的额外阻尼。默认 8.0。
// 只阻尼向下分量，不影响离开边界的速度。调大 → 沉降更快；调小 → 弹跳更明显。
export const DROP_BOUNDARY_DAMPING = 8.0;

// --- 立方体（spike）---
// 立方体的半径大小。默认 0.3。调大立方体更大，调小更小。
export const SPIKE_SIZE = 0.3;
// 立方体可拖拽区域的放大系数。调大后桌面端/移动端都更容易抓住。
export const SPIKE_HANDLE_SCALE = 3.4;
// 立方体可拖拽区域的最小像素尺寸。调大后移动端更容易按中。
export const SPIKE_HANDLE_MIN_SIZE = 132;
// 桌面端容器级几何命中的额外像素补偿。用于兜底"点到了 cube 但没点中隐形层"。
export const SPIKE_MOUSE_PICK_PADDING = 20;
// 弹球初始速度。默认 0.65。调大飞得更快，调小更慢。
export const SPIKE_INIT_SPEED = 0.65;
// 弹球反弹时速度保留比例。默认 0.92。1.0=完全弹性碰撞，<1.0=每次反弹减速。
export const SPIKE_BOUNCE_RESTITUTION = 0.92;
// 弹球反弹后的随机角度扰动（弧度）。默认 0.15。防止立方体进入死角反复弹同一条线。
export const SPIKE_BOUNCE_JITTER = 0.15;
// 弹球运动阻尼。默认 0.3。越大越快减速。此值较低保持长时间弹射。
export const SPIKE_FREE_DAMPING = 0.3;
// 弹球最低速度。当速度低于此值时重新加速到初始速度。默认 0.25。
export const SPIKE_MIN_SPEED = 0.25;
// 弹球边界（世界坐标）。立方体不能超出此范围。
// [左, 右, 下, 上]。默认 [-2.6, 2.6, -1.45, 1.35]。
export const SPIKE_BOUNDS = [-2.6, 2.6, -1.45, 1.35];
// 弹球 Z 轴范围 [最小, 最大]。默认 [0.1, 0.8]。
export const SPIKE_Z_RANGE = [0.1, 0.8];
// 立方体被鼠标拖拽抛出时的速度增益。默认 0.22。越大抛出速度越快。
export const SPIKE_THROW_GAIN = 0.22;
// 松手后给予的最小速度。默认 0.5。确保松手后立方体至少以此速度飞出。
export const SPIKE_RELEASE_MIN_SPEED = 0.5;

// --- About 阶段立方体 ---
// About 阶段立方体固定位置 (SDF 空间)。Desktop: 稍偏上居中。Mobile: 居上。
export const ABOUT_CUBE_POS_DESKTOP = new THREE.Vector3(0, 0.35, 0);
export const ABOUT_CUBE_POS_MOBILE = new THREE.Vector3(0, 0.55, 0);
// About 阶段立方体缩放倍数（相对 Hero 阶段）。默认 1.83。让 About 的方块更大。
export const ABOUT_CUBE_SCALE = 1.83;
// 手动被冻结到 About 位置后整个方块变大时用的 GLSL 半边长。默认 0.55。
export const ABOUT_CUBE_SIZE_GLSL = 0.55;
// About 阶段空闲自转速度 [x, y, z] 弧度/秒。默认 [0.15, 0.25, 0.08]。
export const ABOUT_IDLE_SPIN = [0.15, 0.25, 0.08];
// About 阶段 Arcball 旋转 slerp 追随系数（越大越灵敏）。默认 0.28。
export const ABOUT_DRAG_SLERP = 0.28;
// About 阶段空闲自转 slerp 系数。默认 0.06。
export const ABOUT_IDLE_SLERP = 0.06;

// --- Hero→About 过渡 ---
// 过渡开始的滚动进度。默认 0.15。当 scrollProgress 超过此值时开始过渡。
// scrollProgress: 0 = Hero 完全可见, 1 = About 完全可见。
// 调小 → 更早开始过渡；调大 → 滑更远才开始变化。
export const TRANSITION_START = 0.15;
// 过渡完成的滚动进度。默认 0.92。
// 调小 → 过渡更快完成；调大 → 过渡拖得更长。
export const TRANSITION_END = 0.92;
// 过渡缓动曲线阻尼系数（Desktop）。默认 5.0。
// 控制软弹跳的衰减速度：越大弹性越小越柔和，越小弹性越明显。
// 3.0 = 轻微可见弹性，5.0 = 极柔软几乎无弹跳，8.0 = 纯缓动无弹性。
export const TRANSITION_DAMPING_DESKTOP = 5.0;
// 过渡缓动曲线阻尼系数（Mobile）。默认 6.0。移动端用稍高值减少弹性。
export const TRANSITION_DAMPING_MOBILE = 6.0;
// 立方体追随目标位置的速度。默认 3.5。
// 越大追随越快（立方体更快到位），越小惯性感越强（立方体缓慢飘过去）。
// 1.5 = 很慢很懒散，3.5 = 自然柔和，8.0 = 几乎即时跟随。
export const TRANSITION_FOLLOW_SPEED = 3.5;
// 视频渐显开始的滚动进度。默认 0.5。在方块到达目标位置后才开始显示视频。
// 调小 → 视频更早出现；调大 → 视频更晚出现。
export const VIDEO_FADE_START = 0.5;
// 视频渐显结束的滚动进度。默认 0.95。
// 调小 → 视频更早完全显示；调大 → 渐显持续更久。
export const VIDEO_FADE_END = 0.95;

// --- 立方体消失 ---
// 立方体开始淡出的滚动进度（相对于 About section 底部离开视口的进度）。默认 0.6。
// 当 aboutBottomProgress 超过此值时，立方体开始淡出。
// 调小 → 更早开始消失；调大 → 更晚才开始消失。
export const CUBE_FADEOUT_START = 0.6;
// 立方体完全消失的滚动进度。默认 0.95。
// 调小 → 消失更快；调大 → 消失更慢。
export const CUBE_FADEOUT_END = 0.95;

// --- 视频纹理路径 ---
export const DEMO_VIDEO_PATH = '/video/demo-fallback.mp4';

// ══════════════════════════════════════════════════════════════
// 视觉外观配置（shader 注入参数）
// `spikeMaterialMode`:
//   'cut-metal'    稳定的冷金属立方体，推荐默认用这个
//   'crystal-lite' 轻量假玻璃，便宜，但真实感上限明显
//   'pearl-ceramic' 柔和珍珠陶瓷，奶白底+轻微冷暖珠光
//   'thin-film-iridescent' 暗底薄膜虹彩，边缘会有蓝绿偏色
//   'glass-real'   真正的透明玻璃，光线穿透立方体能看到背后的水滴
// ══════════════════════════════════════════════════════════════
export const WAVE_LOOK = {
  spikeMaterialMode: 'glass-real',
  background: {
    // 背景环境底亮度。大了整个背景会一起抬亮。
    // 参考: 0.10 ~ 0.24
    envBaseMix: 0.05,
    // 远焦主光的移动速度。越大移动越明显。
    // 参考: 0.02 ~ 0.07
    focusSpeed: 0.028,
    // 远焦主光的起始相位。一般只在想换节奏时改。
    // 参考: 0.0 ~ 1.0
    focusPhaseOffset: 0.0,
    // 远焦主光横向活动包围范围 [最左, 最右]。
    // 数值差越大，横向摆幅越明显。现在会用于椭圆/扰动轨迹，不再是直线扫动。
    // 参考: [0.65, -0.05] 到 [0.45, 0.18]
    focusXRange: [0.6, -0.6],
    // 远焦主光纵向活动包围范围 [最低, 最高]。
    // 参考: [-0.12, 0.18]
    focusYRange: [-0.18, 0.14],
    // 远焦主光强弱范围 [最暗, 最亮]。
    // 这是背景"呼吸感"最直接的参数之一。
    // 参考: [0.08, 0.22] ~ [0.12, 0.42]
    focusGainRange: [0.0, 0.2],
    // 远焦主光的扩散大小 [横向, 纵向]。
    // 越小越聚焦，越大越柔和。
    // 参考: [2.4, 1.6] ~ [4.2, 2.5]
    focusScale: [3.2, 2.9],
    // 远焦主光颜色。当前是克制冷蓝。
    // 每项通常保持在 0.08 ~ 0.5
    focusColor: [0.2, 0.29, 0.34],
    // 第二束背景扫光速度。
    // 参考: 0.015 ~ 0.05
    sweepSpeed: 0.1,
    // 第二束背景扫光相位。
    // 参考: 0.0 ~ 1.0
    sweepPhaseOffset: 0.84,
    // 第二束背景扫光横向活动包围范围 [最左, 最右]。
    // 现在会作为较大椭圆/弧形轨迹的边界，不再是纯直线来回扫。
    // 参考: [-0.7, 0.45] ~ [-0.45, 0.2]
    sweepXRange: [-0.99, 0.99],
    // 第二束扫光的基准 Y 位置。
    // 实际轨迹会围绕这个值做小幅上下漂移。
    // 参考: -0.3 ~ 0.0
    sweepY: -0.18,
    // 第二束扫光强弱范围 [最暗, 最亮]。
    // 想让背景动感更容易看到，就优先抬高这里。
    // 参考: [0.04, 0.12] ~ [0.08, 0.22]
    sweepGainRange: [0.01, 0.3],
    // 第二束扫光扩散大小 [横向, 纵向]。
    // 参考: [2.2, 1.6] ~ [3.6, 2.4]
    sweepScale: [2.8, 2.0],
    // 第二束扫光颜色。
    sweepColor: [0.1, 0.16, 0.29],
  },
  studio: {
    // 反射环境里几束主光整体漂移速度。
    // 改大后，球和立方体表面的反射会更明显地缓动。
    // 参考: 0.10 ~ 0.3
    driftSpeed: 0.18,
    // 反射环境灯位漂移幅度 [X, Y, Z]。
    // 想让物体表面的反射更"活"，优先改 X 和 Z。
    // 参考: [0.02, 0.01, 0.02] ~ [0.08, 0.03, 0.08]
    driftAmplitude: [0.04, 0.018, 0.04],
    // 主 key light 的强度 [软高光, 硬高光]。
    // 第二项越大，亮点越"爆"。
    // 参考: [0.7, 3.5] ~ [1.2, 6.0]
    keyStrength: [0.9, 4.5],
    // 辅助 fill light 的强度 [软高光, 硬高光]。
    // 参考: [0.2, 1.0] ~ [0.5, 2.4]
    fillStrength: [0.35, 1.8],
    // 轮廓 rim light 的强度 [软高光, 硬高光]。
    // 参考: [0.3, 2.0] ~ [0.8, 4.5]
    rimStrength: [0.6, 3.5],
    // 顶部环境光强度。抬高会让上半部更亮。
    // 参考: 0.06 ~ 0.16
    topLightStrength: 0.02,
    // 底部环境光强度。抬高会减少底部的压暗感。
    // 参考: 0.01 ~ 0.06
    bottomLightStrength: 0.02,
    bandA: {
      // 第一条明暗带的移动速度。
      // 参考: 0.12 ~ 0.3
      speed: 0.21,
      // 第一条明暗带的摆动幅度。
      // 参考: 0.02 ~ 0.06
      amplitude: 0.035,
      // 第一条明暗带的亮度。
      // 参考: 0.08 ~ 0.24
      intensity: 0.16,
    },
    bandB: {
      // 第二条明暗带速度。
      // 参考: 0.1 ~ 0.24
      speed: 0.17,
      // 第二条明暗带起始相位。
      // 参考: 0.0 ~ 3.14
      phaseOffset: 1.2,
      // 第二条明暗带摆动幅度。
      // 参考: 0.02 ~ 0.07
      amplitude: 0.045,
      // 第二条明暗带亮度。
      // 参考: 0.06 ~ 0.18
      intensity: 0.11,
    },
    sweepA: {
      // 第一束横向扫光速度。
      // 参考: 0.08 ~ 0.18
      speed: 0.12,
      // 第一束横向扫光的左右位移幅度。
      // 这个值越大，越容易看见"扫过去"。
      // 参考: 0.04 ~ 0.16
      amplitude: 0.08,
      // 第一束横向扫光的中心 X。
      // 参考: 0.1 ~ 0.35
      centerX: 0.24,
      // 第一束横向扫光的中心 Y。
      // 参考: -0.05 ~ 0.18
      centerY: 0.08,
      // 第一束横向扫光亮度。
      // 想让背景更明显，先加这个。
      // 参考: 0.06 ~ 0.16
      intensity: 0.09,
    },
    sweepB: {
      // 第二束横向扫光速度。
      // 参考: 0.06 ~ 0.16
      speed: 0.09,
      // 第二束横向扫光起始相位。
      // 参考: 0.0 ~ 3.14
      phaseOffset: 1.3,
      // 第二束横向扫光位移幅度。
      // 参考: 0.03 ~ 0.12
      amplitude: 0.06,
      // 第二束横向扫光中心 X。
      // 参考: -0.5 ~ -0.15
      centerX: -0.34,
      // 第二束横向扫光中心 Y。
      // 参考: -0.28 ~ -0.05
      centerY: -0.16,
      // 第二束横向扫光亮度。
      // 参考: 0.04 ~ 0.14
      intensity: 0.07,
    },
  },
  spike: {
    // 金属反射增益。更高会更亮、更像镜面金属。
    // 参考: 1.0 ~ 1.18
    metalReflectBoost: 1.0,
    // 金属高光增益。更高会更"透亮"，但也更容易刺眼。
    // 参考: 0.4 ~ 0.9
    metalSpecBoost: 0.2,
    // 金属边缘亮度范围 [正面, 边缘]。
    // 第二项越高，边缘越提亮。
    // 参考: [0.45, 1.0] ~ [0.6, 1.08]
    metalEdgeLift: [0.5, 1.02],
    // 假晶体折射率。真实玻璃约 1.5。
    // 参考: 1.05 ~ 1.55
    crystalIor: 1.45,
    // 假晶体反射增益。降低一点保持通透。
    crystalReflectBoost: 0.8,
    // 假晶体透射增益。
    crystalTransmissionBoost: 1.0,
    // 假晶体厚度范围 [正面, 边缘]。调薄以显得清透，减轻抗锯齿压力。
    crystalThickness: [0.05, 0.3],
    // 假晶体吸收颜色强度。非常低，保持全透，带极其微弱的冷色偏色。
    crystalAbsorption: [0.1, 0.15, 0.05],
    // 假晶体边缘染色。全透明玻璃边缘由于全反射往往有微弱环境色。
    crystalEdgeTint: [0.9, 0.95, 1.0],
    // 假晶体边缘染色强度。调弱。
    crystalEdgeTintBoost: 0.15,
    // 假晶体高光强度。玻璃高光非常锐利明亮，能极大增强质感。
    crystalSpecBoost: 1.4,
    // 假晶体整体亮度范围 [正面, 边缘]。不强加亮度。
    crystalLift: [0.95, 1.0],
    // 薄膜虹彩的基底颜色。偏冷灰银更容易稳住高级感。
    iridescentBaseTint: [0.72, 0.76, 0.84],
    // 薄膜虹彩两端色。这里先压在蓝青范围，不做夸张彩虹。
    iridescentFilmColorA: [0.16, 0.72, 0.98],
    iridescentFilmColorB: [0.38, 0.98, 0.8],
    // 正面亮度。越低中心越暗、更像镀膜金属。
    iridescentCoreLift: 0.32,
    // 边缘亮度。越高 grazing angle 的虹彩越明显。
    iridescentEdgeLift: 1.18,
    // 薄膜颜色叠加强度。
    iridescentFilmStrength: 0.82,
    // 条纹密度。越大越像薄膜干涉。
    iridescentBandScale: 20.0,
    // 反射/法线对条纹走向的影响。
    iridescentSweepScale: 6.5,
    // 薄膜高光强度。
    iridescentSpecBoost: 0.72,
    // 珍珠陶瓷主底色。偏暖白能避免死灰。
    pearlBaseColor: [0.92, 0.91, 0.88],
    // 陶瓷背光/暗部颜色。轻微偏冷，让体积更干净。
    pearlShadowTint: [0.62, 0.66, 0.72],
    // 珠光 sheen 颜色。只做很轻的蓝粉偏色。
    pearlSheenColor: [0.84, 0.9, 0.98],
    // 环境反射参与度。越高越像釉面，越低越像粉陶。
    pearlReflectMix: 0.16,
    // 正面与边缘亮度。
    pearlCoreLift: 0.92,
    pearlEdgeLift: 1.08,
    // 陶瓷高光强度。
    pearlSpecBoost: 0.88,
    // 珠光层强度。
    pearlSheenBoost: 0.18,
    // === 真透明玻璃参数 (glass-real) ===
    // 折射率。1.0=空气，1.5=标准玻璃，1.7=重玻璃。
    glassIor: 1.5,
    // 玻璃内部吸收颜色。控制光穿过后的色偏。值越大吸收越重。
    // 轻微偏冷蓝 = 真实白玻璃的典型表现。
    glassAbsorption: [0.3, 0.15, 0.05],
    // 边缘高光强度。玻璃边缘的锐利反射。
    glassSpecBoost: 1.6,
    // 反射强度缩放。越大越像镜面，越小越透明。
    glassReflectMix: 1.0,
    // 边缘 Fresnel 光辉颜色。
    glassEdgeGlow: [0.7, 0.85, 1.0],
    // 边缘 Fresnel 光辉强度。
    glassEdgeGlowBoost: 0.12,
    // === 摄像头环境映射参数 (About 页玻璃方块专用) ===
    // 折射偏移缩放。调大透镜畸变更夸张，调小更微弱。
    // 参考: 0.15（微弱） ~ 0.6（强烈），默认 0.35
    cameraRefractScale: 0.2,
    // 反射中摄像头画面的混合比例。
    // 0.0 = 反射完全用程序化环境光，1.0 = 完全用摄像头。
    // 参考: 0.05 ~ 0.25，默认 0.10
    cameraReflectMix: 0.90,
    // 穿过方块的摄像头画面亮度衰减。
    // 1.0 = 原始亮度（太亮），0.3 = 很暗。
    // 参考: 0.35 ~ 0.7，默认 0.55
    cameraTransmitDim: 0.25,
  },
};
