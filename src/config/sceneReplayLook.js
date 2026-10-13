/**
 * sceneReplayLook — 真实场景回放画布（components/SceneReplayStage.jsx）的可调参数
 *
 * 数据是 nuPlan / NAVSIM 的真实日志（public/data/drive/*.json），2 Hz 关键帧，每段 33 帧 = 16 s；
 * 画布在关键帧之间做插值（位置线性、朝向走最短弧），所以看起来是连续的实时回放。
 * 单位：米 / 秒 / 像素。每项注释都写明默认标准值与调大调小的效果。
 * 播放顺序（场景 id 列表）在 config/driveClips.js → DRIVE_REPLAY_SCENES。
 */
export const SCENE_REPLAY_LOOK = {
  /* 数据目录（public 下，不经打包），文件名为 <id>.json。默认标准值：'/data/drive/'。 */
  dataBase: '/data/drive/',

  /* 画面比例：每米多少像素。默认标准值：桌面 9、手机 5.5（视口宽 < 768px）。
     调大 → 车和路更大、视野更窄；调小 → 看到更大的路口，但车变小。 */
  pxPerMDesktop: 9,
  pxPerMMobile: 5.5,

  /* 相机朝向模式。默认标准值：'heading-up'（跟随本车朝向旋转，前方永远朝上）。
     'fixed' → 画面不旋转，保持场景第 0 帧本车朝向朝上（地图固定，车在图上转弯）。 */
  cameraMode: 'heading-up',
  /* 本车在画布中的纵向锚点（0 = 顶，1 = 底）。默认标准值：heading-up 0.62、fixed 0.5。
     调大 → 本车更靠下、前方视野更长；调小 → 身后看得更多。 */
  egoAnchorY: 0.62,
  fixedAnchorY: 0.5,
  /* 相机位置 / 朝向跟随的时间常数（s，指数平滑）。默认标准值：0.25 / 0.8。
     调大 → 镜头更稳更"拖"，转弯时画面旋转更柔和；调小 → 跟得更紧，2 Hz 插值的折角更明显。 */
  camPosTau: 0.25,
  camHeadingTau: 0.8,

  /* 播放速度倍率。默认标准值：1.0（真实时间；数据只有 2 Hz，中间帧全是插值）。
     调大 → 快放（1.5 = 1.5 倍速）；调小 → 慢放。 */
  playbackSpeed: 1.0,
  /* 场景切换：开头淡入 / 结尾停留 / 淡出时长（s，真实时间，不受倍率影响）。默认标准值：0.8 / 1.2 / 0.9。
     调大停留 → 最后一帧看得更久；调大淡入淡出 → 切换更柔和但更慢。 */
  fadeInSeconds: 0.8,
  holdSeconds: 1.2,
  fadeOutSeconds: 0.9,

  /* 本车"计划线"：画出未来多少秒的日志轨迹（亮蓝折线 + 每个 0.5 s 关键帧一个圆点）。默认标准值：4 s。
     调大 → 计划线更长；调小 → 只看眼前。 */
  planSeconds: 4,
  /* 本车已驶过的轨迹保留多少秒。默认标准值：6 s。调大 → 尾迹更长。 */
  trailSeconds: 6,
  /* 计划线关键帧圆点半径（px）。默认标准值：2.6。 */
  planDotPx: 2.6,

  /* 线宽（px，不随缩放变化）。默认标准值：
     道路外缘 1.1、车道线 0.8、车道中心线 0.7、路口连接线 0.8、红灯连接线 1.6、人行横道描边 0.8、
     计划线 2.4、尾迹 2.2、他车描边 0.8、本车描边 1.2。调大 → 线条更醒目；调小 → 更素。 */
  lineWidthPx: {
    roadEdge: 1.1,
    laneBoundary: 0.8,
    laneCenterline: 0.7,
    connector: 0.8,
    connectorRed: 1.6,
    crosswalk: 0.8,
    plan: 2.4,
    trail: 2.2,
    agentStroke: 0.8,
    egoStroke: 1.2,
  },
  /* 车道中心线虚线（px：实段 / 空段）；设为 null 则不画中心线。默认标准值：[3, 6]。调大空段 → 更稀疏。 */
  centerlineDashPx: [3, 6],

  /* 本车后轴到车身中心的距离（m），日志位姿是后轴（nuPlan 约定）。默认标准值：1.46（Chrysler Pacifica）。 */
  egoRearAxleToCenter: 1.46,
  /* 行人圆点半径（m）。默认标准值：0.45。调大 → 行人更显眼。 */
  pedestrianRadius: 0.45,
  /* 自行车框最小宽度（m），防止数据里过窄的框缩成一条线。默认标准值：0.6。 */
  bicycleMinWidth: 0.6,

  /* 单帧最大积分步长（s），防止切回标签页或卡顿后跳帧。默认标准值：0.05。 */
  maxDt: 0.05,
};
