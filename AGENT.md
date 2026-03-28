# Vennai Project — Agent Instructions

请使用英文做内部思考，任何做输出的地方都使用中文。

> **⚠️ This file is kept in sync with `AGENT.md` and `CLAUDE.md`.**
> If you modify ANY of these three files, you MUST update the other two to match.

---

## 1. Meta Rules

1. **Triple-file sync**: `AGENT.md`, `GEMINI.md`, `CLAUDE.md` contain identical principles. Any edit to one MUST be propagated to the other two in the same operation.
2. **No browser verification**: After making changes, run `npx vite build` to confirm compilation. Do NOT launch browsers, screenshot, or visually verify. The user will verify visually.
3. **Compile-only validation**: If the build passes, stop. If it fails, fix the error. That's it.

---

## 2. Code Philosophy — Write Less, Mean More

### 2.1 Craftsmanship Over Volume

- Code should become **shorter and more elegant** over time, never longer and messier.
- Every new feature is an opportunity to **extract, refactor, and simplify** existing code.
- Before writing new code, ask: _"Does a pattern already exist here that I can reuse or generalize?"_
- Prefer **one well-designed abstraction** over three copy-pasted variants.

### 2.2 Pattern Extraction

- When you see **two or more similar blocks**, extract a shared utility, hook, or component.
- Common patterns to watch for:
  - Repeated Tailwind class groups → extract with `@apply` or shared component
  - Similar event handler logic → extract custom hook
  - Duplicated section layout → extract layout component
  - Repeated config objects → centralize in `src/config/`

### 2.3 No Dead Code

- Never leave unused imports, commented-out code blocks, or orphaned files.
- If you replace a file, delete the old one. If you extract a function, remove the inline version.

### 2.4 Localization (i18n)

- **Never hardcode UI text** in components or pages.
- Provide both English and Chinese translations out of the box.
- All display texts must be extracted to `src/config/i18n.js`. Use the `t()` function to map texts dynamically.

---

## 3. Data Flow & Lifecycle Discipline

### 3.1 Track Every Resource's Birth and Death

Every resource you create must have a clear cleanup path:

| Resource                     | Creation                                   | Cleanup                           |
| ---------------------------- | ------------------------------------------ | --------------------------------- |
| `requestAnimationFrame`      | `animId = requestAnimationFrame(fn)`       | `cancelAnimationFrame(animId)`    |
| `addEventListener`           | `el.addEventListener(evt, fn)`             | `el.removeEventListener(evt, fn)` |
| `setInterval` / `setTimeout` | `id = setInterval(fn, ms)`                 | `clearInterval(id)`               |
| `IntersectionObserver`       | `observer = new IntersectionObserver(...)` | `observer.disconnect()`           |
| `ResizeObserver`             | `observer = new ResizeObserver(...)`       | `observer.disconnect()`           |
| WebSocket                    | `ws = new WebSocket(url)`                  | `ws.close()`                      |
| Canvas context state         | `ctx.save()`                               | `ctx.restore()`                   |

### 3.2 React useEffect Cleanup

- **Every `useEffect` that creates a side effect MUST return a cleanup function.**
- Group related setup/teardown together; don't scatter listeners across multiple effects.
- Use `AbortController` for fetch requests that may outlive the component.

### 3.3 Prevent Memory Leaks

- Never capture component references in closures that outlive the component (e.g., global event handlers without cleanup).
- Avoid appending to arrays indefinitely (e.g., particle systems) — always cap size and prune old entries.
- `Float32Array` / `TypedArray` buffers should be reused, not reallocated per frame.

---

## 4. Performance & Rendering

### 4.1 Animation & Canvas Rules

- **One `requestAnimationFrame` loop** per canvas. Never stack multiple loops.
- Avoid allocating objects inside the animation loop. Pre-allocate buffers in `resize()` or initialization.
- Use `Float32Array` for numerical buffers — it's faster and communicates intent.
- Batch canvas operations: set `ctx.font` once, not per character.
- Consider frame-skipping for complex simulations on low-power devices.

### 4.2 React Rendering

- Avoid inline object/array literals in JSX props — they cause unnecessary re-renders.
- Use `React.memo` for pure presentational components that receive stable props.
- Never put heavy computation in render. Use `useMemo` / `useCallback` where appropriate, but don't over-optimize — measure first.
- Tailwind utility classes over inline `style={{}}` objects. Inline styles only for truly dynamic values (e.g., `transform`, `perspective`).

### 4.3 CSS Performance

- Prefer `transform` and `opacity` for animations (GPU-composited, no layout thrashing).
- Avoid animating `width`, `height`, `top`, `left` (trigger layout recalculation).
- Use `will-change` sparingly and only on elements that actually animate.
- Use CSS custom properties (variables) for theming — change one variable, update everywhere.

### 4.4 Heavy Asset Management（重型资产冻结与画质自适应）

项目提供两个公共 hook，**任何包含 WebGL / Three.js / 视频 / 高成本动画循环的组件必须接入**：

#### `useSectionFreeze(containerRef, options?)`

位置：`src/hooks/useSectionFreeze.js`

用途：判断容器是否在视口内且页面处于前台。返回 `{ shouldAnimate }`。

接入规范：

- 组件必须通过 `shouldAnimate` 控制 RAF 循环的启停。
- 冻结时**保留**所有资源（renderer / scene / material / texture），**仅停止渲染循环**。
- 冻结时必须释放交互状态（拖拽、captured pointer 等）。
- 唤醒时必须做**时间补偿**（`startTime += now - freezeStart`），避免 `uTime` 跳变。
- 可选 `onFreeze` / `onThaw` 回调用于暂停/恢复视频等副作用。

```js
const { shouldAnimate } = useSectionFreeze(containerRef, {
  activeThreshold: 0.15,   // 可见比例阈值
  onFreeze: () => video.pause(),
  onThaw:  () => video.play(),
});
```

#### `useAdaptiveQuality(options?)`

位置：`src/hooks/useAdaptiveQuality.js`

用途：GPU 自适应画质，30 帧采样窗口自动调节渲染分辨率。返回 `ref`，命令式 API。

接入规范：

- 在 `useEffect` 内部设置 `quality.onQualityChange` 回调（在闭包内访问 renderer/material）。
- 每帧末尾调用 `quality.adaptFrame()`。
- 初始化后调用 `quality.start()` 启动升级调度。
- 清理时调用 `quality.dispose()`。

```js
const qualityRef = useAdaptiveQuality({ bootTier: 'low', bootScale: 0.38 });
useEffect(() => {
  const quality = qualityRef.current;
  quality.onQualityChange = ({ tier, scale }) => { /* 更新 renderer */ };
  quality.start();
  return () => quality.dispose();
}, [qualityRef]);
```

#### 非首屏资源加载约定

- 非首屏图片必须使用 `loading="lazy"`，禁止 `fetchPriority="high"`。
- 非首屏视频必须延迟到首次可见时才设置 `src` 并调用 `load()`。
- 冻结 ≠ 卸载：**禁止**在离开视口时 `dispose()` 或 React unmount 重型组件。

#### 4.5 GPU Debug Panel（GPU 调参面板）

位置：`src/components/GPUDebugPanel.jsx` + `src/utils/gpuDebugBus.js`

用途：开发模式浮动面板，实时调节渲染画质参数并监控性能。通过 `npm run dev:gpu` 启动。

**所有包含 WebGL / Three.js / 自定义 shader 的重型组件，必须将画质相关参数注册到 GPU Debug Panel 系统中。** 具体要求：

1. **参数注册**：组件的核心画质参数（光线行进步数、渲染分辨率缩放、采样精度等）必须在 `gpuDebugBus.js` 的 `DEFAULT_TIER_PARAMS` 中声明，并提供中文注释（含默认值、范围、调大调小效果）。
2. **重建监听**：组件必须监听 `window` 上的 `gpu-debug-rebuild` 自定义事件，收到后用 `event.detail.params` 重建 shader 或更新渲染参数。
3. **指标上报**：组件的 RAF 循环尾部必须检查 `window.__GPU_DEBUG__`，若存在则调用 `reportFrame()` 和 `reportMetrics(tier, scale)` 上报性能数据。
4. **自适应跳过**：当 `window.__GPU_DEBUG__?.forcedTier` 不为 null 时，跳过自动画质调节（`adaptQuality`），由面板完全控制。
5. **Shader builder 签名**：shader 构建函数必须接受可选的 `tierOverrides` 参数（如 `buildUnifiedShader(tier, tierOverrides = null)`），以支持面板实时覆盖编译参数。

```js
// 渲染器集成示例（在 tick() 尾部）：
const debugBus = window.__GPU_DEBUG__;
if (debugBus) {
  debugBus.reportFrame();
  debugBus.reportMetrics(activeTier, scale);
}

// 监听 shader 重建（在 useEffect 内）：
const onDebugRebuild = (e) => {
  const { tier, params } = e.detail;
  material.fragmentShader = buildShader(tier, params);
  material.needsUpdate = true;
};
window.addEventListener('gpu-debug-rebuild', onDebugRebuild);
// cleanup: window.removeEventListener(...)
```

**面板本身是纯开发工具**，通过 `import.meta.env.VITE_GPU_DEBUG` + `lazy()` 动态加载，生产构建中完全被 tree-shaking 排除，零运行时开销。

---

## 5. Architecture & File Organization

### 5.1 Current Project Structure

```
src/
├── components/          # Global shared components (Navbar, Footer, WaveCanvas)
├── hooks/               # Shared React hooks (useSectionFreeze, useAdaptiveQuality)
├── pages/
│   ├── HomePage.jsx     # Landing page assembler
│   ├── NotFound.jsx     # 404
│   ├── home/            # Landing page sections (HeroSection, AboutSection, etc.)
│   └── product/         # Product sub-routes
│       └── components/  # Product-page-specific components
├── styles/
│   ├── index.css        # Global reset & design tokens
│   ├── components/      # Styles for global components
│   ├── sections/        # Styles for landing page sections
│   └── product/         # Styles for product pages
├── utils/               # Pure utility functions (noise.js, rippleSimulation.js)
├── config/              # Configuration objects (heroConfig.js)
├── context/             # React Contexts (LanguageContext)
├── shaders/             # GLSL shader modules
├── App.jsx              # Pure router — NO page content here
├── main.jsx             # Entry point
└── index.css            # Global styles & CSS custom properties
```

### 5.2 Placement Rules

| What                       | Where                        | Why                              |
| -------------------------- | ---------------------------- | -------------------------------- |
| Used by ≥2 pages           | `components/`                | Shared globally                  |
| Used only within one page  | `pages/<page>/components/`   | Co-located, not polluting global |
| Pure computation, no React | `utils/`                     | Reusable, testable               |
| Shared React hooks         | `hooks/`                     | Reusable lifecycle logic         |
| Tunable parameters         | `config/`                    | Centralized, easy to adjust      |
| Page-level assembler       | `pages/<Name>.jsx`           | Composes sections + layout       |
| Section of a page          | `pages/<page>/<Section>.jsx` | Focused, single-responsibility   |

### 5.3 Naming Conventions

- Components: `PascalCase.jsx` (e.g., `HeroSection.jsx`)
- Utilities: `camelCase.js` (e.g., `rippleSimulation.js`)
- CSS: `kebab-case.css` only for `@keyframes`, pseudo-elements, and things Tailwind can't inline
- Config files: `camelCase.js` (e.g., `heroConfig.js`)

---

## 6. CSS & Styling Rules

- **Tailwind CSS v4** is the primary styling system. Use utility classes inline in JSX.
- Inline `style={{}}` only for truly dynamic values (e.g., `perspective`, `transform`, `transformOrigin`).
- `@keyframes`, `::before/::after` pseudo-elements, and complex animations go in companion `.css` files under `styles/`.
- Use CSS custom properties defined in `index.css` for design tokens (colors, fonts).
- Design tokens (`:root` variables) are the **single source of truth** for theming.
- 任何“抽离出来给人调”的参数，无论写成 CSS 自定义属性还是 config 对象，都必须加中文注释，并且必须在注释里写清楚“默认标准值”。注释必须明确说明：这个参数控制什么、当前默认是多少、往大或往小调会发生什么。不要只给变量名，不要只写英文，不要省略默认值。
- Responsive: use Tailwind breakpoint prefixes (`max-md:`, `max-lg:`, `sm:`, `md:`, `lg:`).

---

## 7. Code Review Checklist (Before Every Commit)

- [ ] Every `useEffect` has proper cleanup
- [ ] No unused imports or dead code
- [ ] No inline style objects (use Tailwind classes; `style={}` only for dynamic values)
- [ ] TypedArrays reused, not reallocated in loops
- [ ] Event listeners paired with removal
- [ ] Animation frames cancelled on unmount
- [ ] Common patterns extracted, not duplicated
- [ ] UI text is NOT hardcoded (added to `i18n.js` instead)
- [ ] Heavy components use `useSectionFreeze` + `useAdaptiveQuality` hooks
- [ ] Non-first-screen images use `loading="lazy"`, no `fetchPriority="high"`
- [ ] Non-first-screen videos defer loading until first visible
- [ ] New heavy components register quality params in `gpuDebugBus.js` and listen for `gpu-debug-rebuild`
- [ ] Build passes: `npx vite build`
