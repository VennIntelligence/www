# 🔬 Vennai 代码审计工具

> 零依赖的 Node.js 静态分析脚本，帮助团队持续监控代码质量。

---

## 快速开始

```bash
# 运行完整报告
npm run audit

# 等价写法
node scripts/audit.mjs
```

---

## 三大功能

### 📊 1. 文件体量报告 (`--size`)

按行数降序列出所有源文件，帮助识别过大的"上帝文件"。

```bash
npm run audit -- --size
```

**输出示例：**

```
 Lines      Size      %  Path
──────  ────────  ─────  ────────────────────────
   262    8.7 KB   16.9%  components/WaveCanvas.jsx
   259    5.6 KB   16.7%  styles/components/navbar.css
   ...
```

**颜色含义：**

| 颜色 | 行数范围 | 含义 |
|------|----------|------|
| 🟢 绿色 | ≤ 100 行 | 正常 |
| 🟡 黄色 | 101–200 行 | 关注，考虑拆分 |
| 🔴 红色 | > 200 行 | 建议拆分 |

附带**按文件类型汇总**（`.jsx` / `.js` / `.css`），方便了解代码构成比例。

---

### 🔍 2. 孤立文件检测 (`--orphan`)

通过分析 `import` / `@import` 依赖图，找出**未被任何文件引用**的源文件。

```bash
npm run audit -- --orphan
```

**检测逻辑：**

1. 扫描所有 `.js` / `.jsx` / `.css` 文件中的导入语句
2. 支持三种导入格式：
   - ES Module: `import X from './path'`
   - 动态导入: `import('./path')`
   - CSS @import: `@import './path'`
3. 对比所有文件，标记未被引用的文件

**注意事项：**

- 入口文件（`main.jsx`、`index.css`）自动排除
- 通过路由懒加载或动态拼接路径引用的文件可能被误报，需人工确认

---

### 🔁 3. 代码相似度检测 (`--similar`)

基于**结构化 n-gram Jaccard 相似度**算法，找出代码结构高度重复的文件对。

```bash
npm run audit -- --similar
```

**自定义阈值：**

```bash
# 只显示相似度 ≥ 70% 的文件对（默认 50%）
npm run audit -- --similar --threshold 0.7
```

**算法说明：**

1. **预处理**：去除注释、字符串字面量、空白符
2. **分词**：按代码结构提取单词级 3-gram
3. **对比**：JS/JSX 文件之间互比，CSS 文件之间互比
4. **Jaccard 系数** = 交集 / 并集，范围 0.0–1.0

**输出示例：**

```
  80.0% ████████████████░░░░  styles/sections/about.css ↔ styles/sections/services.css
  63.6% █████████████░░░░░░░  pages/home/AboutSection.jsx ↔ pages/home/ServicesSection.jsx
```

**如何应对高相似度：**

| 相似度 | 建议 |
|--------|------|
| > 80% | 强烈建议合并或提取公共模块 |
| 60–80% | 考虑提取公共部分为共享组件/样式 |
| 50–60% | 留意，可能有提取空间 |

---

## 组合用法

```bash
# 完整报告（默认）
npm run audit

# 只看体量 + 孤立文件
npm run audit -- --size --orphan

# 只看高相似度（≥ 70%）
npm run audit -- --similar --threshold 0.7

# 全部功能 + 宽松阈值
npm run audit -- --all --threshold 0.3
```

---

## 配置参数

脚本顶部可调整的常量：

| 常量 | 默认值 | 说明 |
|------|--------|------|
| `SOURCE_EXTS` | `.js .jsx .ts .tsx .css` | 扫描的文件扩展名 |
| `EXCLUDE_DIRS` | `node_modules dist .git public` | 排除的目录 |
| `ENTRY_FILES` | `main.jsx main.tsx index.js index.html` | 入口文件（不标记为孤立） |

---

## 典型工作流

```
1. 开发新功能后，运行 npm run audit
2. 检查是否引入了孤立文件（忘记 import）
3. 检查新代码是否与现有代码高度重复（应提取公共部分）
4. 大文件超过 200 行时，考虑拆分
```

> **建议**：在 PR Review 前运行一次 `npm run audit`，确保代码库保持精简。
