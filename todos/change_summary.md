# UnifiedStage 用户反馈修复总结（第二轮）

## 修改概览

| 问题 | 修复方案 | 涉及文件 |
|---|---|---|
| ① 液滴轨迹太呆板 | 恢复多频螺旋叠加 + 保持不同象限分离 | unifiedPhysics |
| ② 第二屏 arcball 旋转失效 | dragHandle 提升为 fixed z-index:50 | UnifiedStage |
| ③ 过渡太生硬（上轮） | 棉花球软弹跳 + 弹簧追随 | unifiedPhysics, waveLook |
| ④ Footer 被遮挡（上轮） | hidden 阶段隐藏渲染层 | UnifiedStage |

---

## ① 液滴轨迹：灵动螺旋 + 分散

**之前**：轨迹函数过于简单，只有单频率正弦，运动不够灵巧。

**现在**：恢复了多层频率叠加的螺旋结构（3-4 层 sin/cos），类似双螺旋 DNA + 高频扰动，同时每颗液滴偏向不同象限：

| 液滴 | 轨道中心 | 风格 |
|---|---|---|
| A（最大） | 左上 (-0.7, 0.3) | 双螺旋 + 高频微扰 |
| B（中等） | 右下 (0.8, -0.25) | 反向螺旋 + 葡萄藤形 |
| C（最小） | 左下 (-0.2, -0.5) | 快速蛇形 + 搓衣板式震荡 |

---

## ② Arcball 旋转修复

**问题根因**：`dragHandle` 之前是 `position: absolute` 在 container（z-index: 0）内部，被 About section 的 `.about-content`（z-index: 10）完全遮挡，所有触摸/点击事件无法到达。

**修复**：
- `dragHandle` 提升为独立的 `position: fixed` 元素
- z-index 设为 50（高于 About content 的 10，低于 Navbar 的 100）
- 默认 `pointerEvents: 'none'`，在 hero/about 阶段动态设为 `'auto'`
- 在 dragHandle 上也注册了 `touchstart` 事件（`passive: false`）以阻止浏览器滚动

> [!IMPORTANT]
> dragHandle 不再是 container 的子元素，改用 `Fragment (<>)` 包裹两个兄弟元素。renderer canvas 改用 `appendChild` 插入。

---

## 文件变更清单

render_diffs(file:///Users/kounarushi/mycode/Vennai/src/utils/unifiedPhysics.js)

render_diffs(file:///Users/kounarushi/mycode/Vennai/src/components/UnifiedStage.jsx)

render_diffs(file:///Users/kounarushi/mycode/Vennai/src/config/waveLook.js)
