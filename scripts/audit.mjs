#!/usr/bin/env node
/**
 * audit.mjs — Vennai 静态代码审计工具
 *
 * 三大功能:
 *   1. 文件体量报告 (File Size Report)       → 按行数/字节数排序
 *   2. 孤立文件检测 (Orphaned File Detection) → 未被任何文件 import 的模块
 *   3. 代码相似度检测 (Similarity Detection)  → 基于结构化 token 的 Jaccard 相似度
 *
 * Usage:
 *   node scripts/audit.mjs               # 完整报告
 *   node scripts/audit.mjs --size        # 仅文件体量
 *   node scripts/audit.mjs --orphan      # 仅孤立文件
 *   node scripts/audit.mjs --similar     # 仅相似度
 *   node scripts/audit.mjs --threshold 0.6  # 相似度阈值 (默认 0.5)
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve, extname, basename } from 'node:path';

// ── Configuration ──────────────────────────────────────────────────
const SRC_DIR = resolve(import.meta.dirname, '..', 'src');
const SOURCE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.css']);
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.git', 'public']);
const ENTRY_FILES = new Set(['main.jsx', 'main.tsx', 'index.js', 'index.html']);

// ── CLI Args ───────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const showAll = args.size === 0 || args.has('--all');
const showSize = showAll || args.has('--size');
const showOrphan = showAll || args.has('--orphan');
const showSimilar = showAll || args.has('--similar');

let similarityThreshold = 0.5;
const threshIdx = process.argv.indexOf('--threshold');
if (threshIdx !== -1 && process.argv[threshIdx + 1]) {
  similarityThreshold = parseFloat(process.argv[threshIdx + 1]);
}

// ── Color helpers (ANSI) ───────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

const fmt = {
  heading: (s) => `\n${c.bold}${c.cyan}═══ ${s} ═══${c.reset}`,
  subheading: (s) => `${c.bold}${s}${c.reset}`,
  warn: (s) => `${c.yellow}⚠  ${s}${c.reset}`,
  ok: (s) => `${c.green}✓  ${s}${c.reset}`,
  err: (s) => `${c.red}✗  ${s}${c.reset}`,
  dim: (s) => `${c.dim}${s}${c.reset}`,
};

// ── Utilities ──────────────────────────────────────────────────────

/** Walk directory recursively, return array of absolute paths */
async function walk(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        results.push(...await walk(fullPath));
      }
    } else if (SOURCE_EXTS.has(extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Read file and return { path, content, lines, bytes } */
async function readFileInfo(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n').length;
  const bytes = Buffer.byteLength(content, 'utf-8');
  return { path: filePath, rel: relative(SRC_DIR, filePath), content, lines, bytes };
}

/** Format bytes to human-readable */
function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  return `${(b / 1024).toFixed(1)} KB`;
}

/** Extract all import/require references from a JS/JSX file */
function extractImports(content) {
  const imports = [];
  // ES import: import X from './path'  or  import './path'
  const esRe = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  // Dynamic import: import('./path')
  const dynRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  // CSS @import: @import url('./path') or @import './path'
  const cssRe = /@import\s+(?:url\(\s*)?['"]([^'"]+)['"]\s*\)?/g;

  for (const re of [esRe, dynRe, cssRe]) {
    let m;
    while ((m = re.exec(content)) !== null) {
      imports.push(m[1]);
    }
  }
  return imports;
}

/** Resolve a relative import to filename (without extension guessing) */
function resolveImport(importPath) {
  // strip leading ./ or ../
  // We only care about relative imports (not node_modules)
  if (!importPath.startsWith('.')) return null;
  // Get the final segment
  const parts = importPath.split('/');
  return parts[parts.length - 1];
}

// ── Tokenizer for Similarity Detection ─────────────────────────────

/**
 * Tokenize source code into structural tokens.
 * Strips comments, string literals, and whitespace to focus on code structure.
 * Returns a Set of n-gram tokens for Jaccard similarity.
 */
function tokenize(content, ext) {
  let cleaned = content;

  if (ext === '.css') {
    // Remove CSS comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  } else {
    // Remove single-line comments
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    // Remove multi-line comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove JSX comments {/* ... */}
    cleaned = cleaned.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  }

  // Remove string literals (but keep the quotes to preserve structure)
  cleaned = cleaned.replace(/(["'`])(?:(?=(\\?))\2[\s\S])*?\1/g, '""');
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Generate 3-grams of words
  const words = cleaned.split(/[\s{}();,[\]<>:=+\-*/&|!?@#$%^~`\\]+/).filter(Boolean);
  const ngrams = new Set();
  const N = 3;

  for (let i = 0; i <= words.length - N; i++) {
    ngrams.add(words.slice(i, i + N).join('|'));
  }
  // Also add individual words for small files
  for (const w of words) {
    if (w.length > 2) ngrams.add(w);
  }

  return ngrams;
}

/** Jaccard similarity between two sets */
function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

// ══════════════════════════════════════════════════════════════════
//  REPORT GENERATORS
// ══════════════════════════════════════════════════════════════════

/** 1. File Size Report */
function reportSize(files) {
  console.log(fmt.heading('📊 文件体量报告 (File Size Report)'));

  const sorted = [...files].sort((a, b) => b.lines - a.lines);
  const totalLines = files.reduce((s, f) => s + f.lines, 0);
  const totalBytes = files.reduce((s, f) => s + f.bytes, 0);

  console.log(fmt.dim(`  共 ${files.length} 个源文件, ${totalLines} 行, ${formatBytes(totalBytes)}\n`));

  // Table header
  console.log(
    `  ${'Lines'.padStart(6)}  ${'Size'.padStart(8)}  ${'%'.padStart(5)}  Path`
  );
  console.log(`  ${'─'.repeat(6)}  ${'─'.repeat(8)}  ${'─'.repeat(5)}  ${'─'.repeat(40)}`);

  for (const f of sorted) {
    const pct = ((f.lines / totalLines) * 100).toFixed(1);
    const color = f.lines > 200 ? c.red : f.lines > 100 ? c.yellow : c.green;
    console.log(
      `  ${color}${String(f.lines).padStart(6)}${c.reset}  ${formatBytes(f.bytes).padStart(8)}  ${pct.padStart(5)}%  ${f.rel}`
    );
  }

  // Category breakdown
  console.log(fmt.subheading('\n  按类型汇总:'));
  const byExt = {};
  for (const f of files) {
    const ext = extname(f.rel);
    byExt[ext] = byExt[ext] || { lines: 0, bytes: 0, count: 0 };
    byExt[ext].lines += f.lines;
    byExt[ext].bytes += f.bytes;
    byExt[ext].count++;
  }
  for (const [ext, data] of Object.entries(byExt).sort((a, b) => b[1].lines - a[1].lines)) {
    console.log(
      `  ${c.cyan}${ext.padEnd(6)}${c.reset} → ${String(data.count).padStart(3)} 个文件, ${String(data.lines).padStart(5)} 行, ${formatBytes(data.bytes).padStart(8)}`
    );
  }
}

/** 2. Orphaned File Detection */
function reportOrphans(files) {
  console.log(fmt.heading('🔍 孤立文件检测 (Orphaned File Detection)'));

  // Build a map of basenames (with extension) to files
  const filesByBase = new Map();
  for (const f of files) {
    const base = basename(f.rel);
    filesByBase.set(base, f);
    // Also without extension for JS/JSX/TS/TSX imports
    const noExt = base.replace(/\.\w+$/, '');
    if (!filesByBase.has(noExt)) {
      filesByBase.set(noExt, f);
    }
  }

  // Collect all imported references
  const importedBases = new Set();
  for (const f of files) {
    const ext = extname(f.rel);
    if (ext === '.css') {
      // CSS files don't have typical imports, but track @import
      const imports = extractImports(f.content);
      for (const imp of imports) {
        const resolved = resolveImport(imp);
        if (resolved) {
          importedBases.add(resolved);
          importedBases.add(resolved.replace(/\.\w+$/, ''));
        }
      }
    } else {
      const imports = extractImports(f.content);
      for (const imp of imports) {
        const resolved = resolveImport(imp);
        if (resolved) {
          importedBases.add(resolved);
          importedBases.add(resolved.replace(/\.\w+$/, ''));
        }
      }
    }
  }

  // Also check index.html for entry references
  try {
    // Entry files are always considered "imported"
    for (const entry of ENTRY_FILES) {
      importedBases.add(entry);
      importedBases.add(entry.replace(/\.\w+$/, ''));
    }
  } catch { /* ignore */ }

  // Find orphans
  const orphans = [];
  for (const f of files) {
    const base = basename(f.rel);
    const noExt = base.replace(/\.\w+$/, '');

    // Skip entry files
    if (ENTRY_FILES.has(base)) continue;
    // Skip index.css (global stylesheet)
    if (base === 'index.css') continue;

    const isImported = importedBases.has(base) || importedBases.has(noExt);
    if (!isImported) {
      orphans.push(f);
    }
  }

  if (orphans.length === 0) {
    console.log(fmt.ok('未发现孤立文件！所有文件都有被引用。'));
  } else {
    console.log(fmt.warn(`发现 ${orphans.length} 个可能的孤立文件:\n`));
    for (const f of orphans.sort((a, b) => b.lines - a.lines)) {
      console.log(`  ${c.yellow}●${c.reset} ${f.rel} ${c.dim}(${f.lines} 行)${c.reset}`);
    }
    console.log(fmt.dim('\n  注: 某些文件可能通过动态导入或路由懒加载引用，请人工确认。'));
  }
}

/** 3. Code Similarity Detection */
function reportSimilarity(files) {
  console.log(fmt.heading(`🔁 代码相似度检测 (Similarity ≥ ${(similarityThreshold * 100).toFixed(0)}%)`));

  // Only compare code files (not CSS vs JS)
  const codeFiles = files.filter(f => {
    const ext = extname(f.rel);
    return ext !== '.css';
  });
  const cssFiles = files.filter(f => extname(f.rel) === '.css');

  const allGroups = [
    { label: 'JS/JSX 代码文件', files: codeFiles },
    { label: 'CSS 样式文件', files: cssFiles },
  ];

  let foundAny = false;

  for (const group of allGroups) {
    if (group.files.length < 2) continue;

    // Pre-tokenize
    const tokenized = group.files.map(f => ({
      ...f,
      tokens: tokenize(f.content, extname(f.rel)),
    }));

    const pairs = [];
    for (let i = 0; i < tokenized.length; i++) {
      for (let j = i + 1; j < tokenized.length; j++) {
        const sim = jaccard(tokenized[i].tokens, tokenized[j].tokens);
        if (sim >= similarityThreshold) {
          pairs.push({
            a: tokenized[i].rel,
            b: tokenized[j].rel,
            similarity: sim,
          });
        }
      }
    }

    if (pairs.length > 0) {
      foundAny = true;
      console.log(fmt.subheading(`\n  ${group.label}:`));
      pairs.sort((a, b) => b.similarity - a.similarity);
      for (const p of pairs) {
        const pct = (p.similarity * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(p.similarity * 20)) + '░'.repeat(20 - Math.round(p.similarity * 20));
        const color = p.similarity > 0.8 ? c.red : p.similarity > 0.6 ? c.yellow : c.green;
        console.log(
          `  ${color}${pct}%${c.reset} ${c.dim}${bar}${c.reset}  ${p.a} ↔ ${p.b}`
        );
      }
    }
  }

  if (!foundAny) {
    console.log(fmt.ok('未发现高相似度的文件对。'));
  }
}

// ── Summary & Suggestions ──────────────────────────────────────────

function reportSummary(files) {
  console.log(fmt.heading('📝 审计摘要 (Audit Summary)'));

  const totalLines = files.reduce((s, f) => s + f.lines, 0);
  const bigFiles = files.filter(f => f.lines > 150);
  const tinyFiles = files.filter(f => f.lines < 10);

  const suggestions = [];

  if (bigFiles.length > 0) {
    suggestions.push(
      `${c.yellow}●${c.reset} ${bigFiles.length} 个大文件 (>150行) 建议拆分: ${bigFiles.map(f => f.rel).join(', ')}`
    );
  }

  if (tinyFiles.length > 0) {
    suggestions.push(
      `${c.cyan}●${c.reset} ${tinyFiles.length} 个极小文件 (<10行) 考虑合并: ${tinyFiles.map(f => f.rel).join(', ')}`
    );
  }

  if (suggestions.length === 0) {
    console.log(fmt.ok('代码结构良好，暂无建议。'));
  } else {
    console.log(fmt.subheading('  建议事项:\n'));
    for (const s of suggestions) {
      console.log(`  ${s}`);
    }
  }

  console.log(`\n  ${c.dim}运行时间: ${new Date().toISOString()}${c.reset}`);
  console.log(`  ${c.dim}扫描目录: ${relative(process.cwd(), SRC_DIR)}/${c.reset}`);
  console.log(`  ${c.dim}源文件数: ${files.length}, 总行数: ${totalLines}${c.reset}\n`);
}

// ══════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════

async function main() {
  console.log(`${c.bold}${c.magenta}\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║   Vennai 代码审计工具 v1.0           ║`);
  console.log(`  ╚══════════════════════════════════════╝${c.reset}\n`);

  const paths = await walk(SRC_DIR);
  const files = await Promise.all(paths.map(readFileInfo));

  if (showSize) reportSize(files);
  if (showOrphan) reportOrphans(files);
  if (showSimilar) reportSimilarity(files);

  reportSummary(files);
}

main().catch(err => {
  console.error(fmt.err(err.message));
  process.exit(1);
});
