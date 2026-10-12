/**
 * getCappedDPR — 全站统一的 devicePixelRatio 封顶
 *
 * 高 DPR 屏（如 3x 手机）上像素量随 DPR 平方增长，重 shader 成本失控。
 * 全屏 shader 本身已按 renderScale（约 0.5）降采样渲染，
 * 在这种缓冲上封顶 DPR 视觉上几乎无损。
 *
 * 可调参数：
 *   DPR_CAP_DESKTOP — 桌面端 DPR 上限。默认标准值 2。
 *     调大 → 高分屏更锐利，但像素量平方增长、GPU 负载显著上升；
 *     调小 → 更省 GPU，但文字边缘附近的 shader 图形可能出现轻微模糊。
 *   DPR_CAP_MOBILE — 移动端（视口宽 < 768px）DPR 上限。默认标准值 1.5。
 *     调大 → 手机上更清晰但明显更耗电掉帧；调小 → 更流畅但更糊。
 */
const DPR_CAP_DESKTOP = 2;
const DPR_CAP_MOBILE = 1.5;

export function getCappedDPR() {
  const cap = window.innerWidth < 768 ? DPR_CAP_MOBILE : DPR_CAP_DESKTOP;
  return Math.min(window.devicePixelRatio || 1, cap);
}
