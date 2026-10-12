#!/usr/bin/env python3
"""
/blog/time-manager-part-2 的全部静态图（matplotlib，论文风格）。

用法（在仓库根目录）：
    uv venv .venv-fig && uv pip install --python .venv-fig/bin/python matplotlib numpy
    .venv-fig/bin/python scripts/figures/time_manager_part_2.py           # 输出 SVG 到 src/assets/blog/time-manager-part-2/
    .venv-fig/bin/python scripts/figures/time_manager_part_2.py --png     # 额外输出 PNG 预览到 --out 目录

图中所有数据均由文中描述的算法（锚点公式、CatchUp 合并、priority 分层、
fire-and-forget 派发）直接生成，不是手绘示意。
"""
from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Rectangle

matplotlib.use("Agg")

# ---------- 统一视觉（论文风） ----------
# 蓝 = 虚拟时间，红 = 真实时间，绿 = 通过/执行。整套图只用这三种有彩色。
BLUE = "#1f4e9c"
RED = "#b2382a"
GREEN = "#2e7d4f"
INK = "#1a1a1a"
GRAY = "#6b6b6b"
LIGHT = "#d9d9d9"
FILL_BLUE = "#dbe5f5"
FILL_RED = "#f3ddd9"
FILL_GRAY = "#ececec"

plt.rcParams.update(
    {
        "font.family": "serif",
        "font.serif": ["STIXGeneral", "STIX Two Text", "Times New Roman", "DejaVu Serif"],
        "mathtext.fontset": "stix",
        "font.size": 9,
        "axes.titlesize": 9.5,
        "axes.labelsize": 9,
        "xtick.labelsize": 8,
        "ytick.labelsize": 8,
        "legend.fontsize": 8,
        "axes.linewidth": 0.7,
        "xtick.major.width": 0.6,
        "ytick.major.width": 0.6,
        "axes.edgecolor": INK,
        "axes.labelcolor": INK,
        "xtick.color": INK,
        "ytick.color": INK,
        "text.color": INK,
        "legend.frameon": False,
        "svg.fonttype": "path",  # 文字转路径：浏览器端无需安装字体
        "figure.dpi": 100,
        "savefig.dpi": 200,
    }
)

W1 = 7.2  # 单栏图宽（英寸）。文章内展示宽度 ≈ 820px。
MONO = {"family": "monospace", "size": 7.6}


def panel_label(ax, s: str):
    ax.text(-0.02, 1.06, s, transform=ax.transAxes, fontsize=10, fontweight="bold", va="bottom", ha="right")


def clean(ax, top=False, right=False):
    ax.spines["top"].set_visible(top)
    ax.spines["right"].set_visible(right)


def box(ax, xy, w, h, text, fc="white", ec=INK, lw=0.8, fs=8.2, mono=False, ls="-"):
    x, y = xy
    p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=0.12", fc=fc, ec=ec, lw=lw, ls=ls)
    ax.add_patch(p)
    fd = {"family": "monospace"} if mono else {}
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, linespacing=1.35, **fd)
    return p


def arrow(ax, a, b, text=None, color=INK, lw=0.8, style="-|>", ls="-", tpos=0.5, toff=(0, 0.16), fs=7.4):
    ax.add_patch(FancyArrowPatch(a, b, arrowstyle=style, mutation_scale=9, color=color, lw=lw, ls=ls, shrinkA=0, shrinkB=0))
    if text:
        x = a[0] + (b[0] - a[0]) * tpos + toff[0]
        y = a[1] + (b[1] - a[1]) * tpos + toff[1]
        ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=color, family="monospace",
                bbox=dict(fc="white", ec="none", pad=1.2))


# ============================================================
# Fig. 1 — 时间内核架构
# ============================================================
def fig01(out):
    fig, ax = plt.subplots(figsize=(W1, 3.5))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6.4)
    ax.axis("off")

    # TimeSource 抽象基类 + 两个实现
    box(ax, (0.2, 4.55), 3.9, 1.25, "TimeSource (ABC)\nnow · sleep_until · needs_barrier\nenter_barrier · exit_barrier", fc=FILL_GRAY, fs=7.6)
    box(ax, (0.2, 2.45), 1.85, 1.55, "LiveTimeSource\nnow() = wall clock\nsleep = real sleep\nbarrier = no-op", fc="white", fs=6.6)
    box(ax, (2.25, 2.45), 1.85, 1.55, "BacktestTimeSource\nnow() = virtual\nsleep = jump\nbarrier = refcount", fc=FILL_BLUE, ec=BLUE, fs=6.6)
    arrow(ax, (1.12, 4.0), (1.12, 4.55), style="-|>", lw=0.7)
    arrow(ax, (3.17, 4.0), (3.17, 4.55), style="-|>", lw=0.7)

    # TimeManager 内核
    box(ax, (5.0, 1.3), 3.4, 4.5, "", fc="white", ec=INK, lw=1.0)
    ax.text(6.7, 5.5, "TimeManager (kernel)", ha="center", va="center", fontsize=8.8, fontweight="bold")
    box(ax, (5.25, 4.05), 2.9, 1.05, "_schedule: min-heap\n(next_time, seq, sched)", fc=FILL_GRAY, fs=6.8, mono=True)
    box(ax, (5.25, 2.75), 2.9, 1.05, "main loop\npop → sleep_until → execute\n→ reschedule from scheduled time", fc="white", fs=7.0)
    box(ax, (5.25, 1.5), 2.9, 1.0, "_last_schedule_time\n(grid-aligned only)", fc="white", fs=7.4, mono=True)
    arrow(ax, (4.1, 3.25), (5.0, 3.25), lw=0.8)
    ax.text(4.55, 4.08, "now()\nsleep_until()", ha="center", va="bottom", fontsize=5.8, family="monospace", color=GRAY)

    # 消费者
    ys = [4.75, 3.55, 2.35, 1.15]
    names = [
        ("Strategy / Trigger", "@on_interval\nenter/exit_barrier"),
        ("LocalBackend", "_on_1m_tick\nmatching · SL/TP"),
        ("Web API", "/api/time/now"),
        ("Logging", "timestamps"),
    ]
    for y, (n, d) in zip(ys, names):
        box(ax, (9.2, y - 0.05), 2.5, 1.0, f"{n}\n{d}", fc="white", fs=7.0)
        arrow(ax, (8.4, y + 0.45), (9.2, y + 0.45), lw=0.7)
    ax.text(8.8, 6.0, "Tick(interval, ts, seq)", ha="center", fontsize=7.0, family="monospace", color=GRAY)
    ax.text(10.45, 0.55, "consumers: zero lines changed", ha="center", fontsize=7.4, color=GRAY, style="italic")
    ax.text(2.0, 0.55, "exactly one source of time per process", ha="center", fontsize=7.4, color=GRAY, style="italic")
    fig.savefig(out / "fig-01.svg", bbox_inches="tight")
    return fig


# ============================================================
# Fig. 2 — FastForward 与「从调度时间重排」
# ============================================================
def fig02(out):
    fig, (a, b) = plt.subplots(1, 2, figsize=(W1, 2.7), gridspec_kw={"wspace": 0.32})
    # (a) 1440 次虚拟跳跃 vs 真实耗时
    n = 1440
    real = np.arange(n + 1) * 1e-3  # 每次跳跃 ≈ 1 ms 协作让出
    virt = np.arange(n + 1)  # 分钟
    a.step(real, virt / 60, where="post", color=BLUE, lw=1.1)
    a.set_xlabel("real time elapsed (s)")
    a.set_ylabel("virtual time advanced (h)")
    a.set_xlim(0, 1.5)
    a.set_ylim(0, 24)
    a.set_yticks([0, 6, 12, 18, 24])
    a.annotate("1,440 one-minute ticks\n≈ 1.4 s wall-clock", xy=(1.44, 24), xytext=(0.55, 17),
               fontsize=7.6, arrowprops=dict(arrowstyle="-|>", lw=0.6, color=INK))
    # 放大：一次跳跃
    ins = a.inset_axes([0.55, 0.12, 0.4, 0.36])
    ins.step([0, 1, 1, 2, 2, 3], [0, 0, 1, 1, 2, 2], where="post", color=BLUE, lw=1)
    ins.set_xticks([])
    ins.set_yticks([])
    ins.set_title("one jump = one boundary", fontsize=6.4, pad=2)
    clean(ins)
    clean(a)
    panel_label(a, "(a)")

    # (b) reschedule 基准：调度时间 vs now()
    ticks = np.arange(0, 61)
    handler = 0.4  # 400 ms handler
    from_scheduled = ticks * 60.0
    from_now = ticks * (60.0 + handler)
    b.plot(ticks, from_now - from_scheduled, color=RED, lw=1.1, label="reschedule from now()")
    b.plot(ticks, np.zeros_like(ticks), color=BLUE, lw=1.1, label="reschedule from scheduled time")
    b.set_xlabel("tick index (1 m interval, 400 ms handler)")
    b.set_ylabel("drift from grid (s)")
    b.set_ylim(-2, 26)
    b.legend(loc="upper left", fontsize=7)
    b.annotate("+24 s after one hour", xy=(60, 24), xytext=(30, 20.5), fontsize=7.4,
               arrowprops=dict(arrowstyle="-|>", lw=0.6, color=INK))
    clean(b)
    panel_label(b, "(b)")
    fig.savefig(out / "fig-02.svg", bbox_inches="tight")
    return fig


# ============================================================
# Fig. 3 — 冻结事故
# ============================================================
def fig03(out):
    fig, (a, b) = plt.subplots(2, 1, figsize=(W1, 3.6), sharex=True, gridspec_kw={"height_ratios": [1.6, 1], "hspace": 0.12})
    t = np.linspace(0, 5, 501)  # 真实分钟，从 10:01 弹出开始
    frozen = np.full_like(t, 1.0)  # now() == 10:01 常量
    frozen[t >= 3] = 4.0  # barrier 释放后被强推到「下一次调度」

    a.plot(t, t + 1, color=RED, lw=1.0, ls="--", label="wall clock (what really elapsed)")
    a.step(t, frozen, where="post", color=BLUE, lw=1.3, label="now() returned by the old engine")
    a.axvspan(0, 3, color=FILL_RED, alpha=0.55, lw=0)
    a.text(1.5, 4.55, "barrier held · LLM thinking (3 real minutes)", ha="center", fontsize=7.6, color=RED)
    a.set_yticks([1, 2, 3, 4, 5])
    a.set_yticklabels(["10:01", "10:02", "10:03", "10:04", "10:05"])
    a.set_ylabel("virtual time")
    a.set_ylim(0.6, 5.2)
    a.legend(loc="lower right", fontsize=6.8)
    a.annotate("P1  now() stale for 3 min", xy=(2.6, 1.0), xytext=(1.05, 2.15), fontsize=7.2,
               arrowprops=dict(arrowstyle="-|>", lw=0.6))
    clean(a)
    panel_label(a, "(a)")

    # (b) 事件：期望 vs 实际
    exp_t = [0, 1, 2, 3]
    b.scatter(exp_t, [1] * 4, marker="|", s=140, color=INK, lw=1.2, zorder=3)
    b.scatter([0, 3.0], [0, 0], marker="|", s=140, color=BLUE, lw=1.4, zorder=3)
    b.scatter([1, 2], [0, 0], marker="x", s=30, color=RED, lw=1.0, zorder=3)
    b.annotate("", xy=(3.0, 0.02), xytext=(2.0, 0.02), arrowprops=dict(arrowstyle="-|>", color=RED, lw=0.7))
    b.text(2.5, 0.28, "P3  10:02 / 10:03 ticks never popped", ha="center", fontsize=7.0, color=RED)
    b.text(0.55, -0.32, "P2  backend idle, orders unmatched", ha="left", fontsize=7.0, color=GRAY)
    b.set_yticks([0, 1])
    b.set_yticklabels(["executed", "expected"])
    b.set_ylim(-0.6, 1.55)
    b.set_xlabel("real minutes since the 10:01 tick was popped")
    b.set_xlim(-0.2, 5)
    b.set_xticks([0, 1, 2, 3, 4, 5])
    clean(b)
    panel_label(b, "(b)")
    fig.savefig(out / "fig-03.svg", bbox_inches="tight")
    return fig


# ============================================================
# Fig. 4 — 后台泵为什么不成立
# ============================================================
def fig04(out):
    fig, (a, b) = plt.subplots(1, 2, figsize=(W1, 2.6), gridspec_kw={"wspace": 0.35, "width_ratios": [1.35, 1]})
    # (a) 堆内条目占用：每 interval 恰好一条；pop 后为空，直到 handler 返回才 _schedule_next
    a.set_xlim(-0.9, 4.6)
    a.set_ylim(-0.6, 2.4)
    a.add_patch(Rectangle((-0.85, 1.3), 0.8, 0.5, fc=FILL_BLUE, ec=BLUE, lw=0.7))
    a.text(-0.45, 1.55, "1m@10:01", ha="center", va="center", fontsize=5.8, family="monospace")
    a.add_patch(Rectangle((3.05, 1.3), 0.9, 0.5, fc=FILL_BLUE, ec=BLUE, lw=0.7))
    a.text(3.5, 1.55, "1m@10:02", ha="center", va="center", fontsize=5.8, family="monospace")
    a.text(3.5, 1.98, "created by _schedule_next\nonly when the handler returns", ha="center", va="center", fontsize=5.6, color=GRAY)
    a.text(1.5, 1.55, "heap slot for 1m: EMPTY", ha="center", va="center", fontsize=7.2, color=RED, style="italic")
    a.add_patch(Rectangle((0, 0.4), 3.0, 0.5, fc=FILL_RED, ec=RED, lw=0.7))
    a.text(1.5, 0.65, "handler executing (barrier)", ha="center", va="center", fontsize=7.0, color=RED)
    for x in [0.6, 1.2, 1.8, 2.4]:
        a.annotate("", xy=(x, 1.3), xytext=(x, 0.0), arrowprops=dict(arrowstyle="-|>", lw=0.6, color=GRAY, ls=":"))
    a.text(1.5, -0.35, "pump scans: nothing due — the future ticks do not exist yet", ha="center", fontsize=6.6, color=GRAY)
    a.set_yticks([0.65, 1.55])
    a.set_yticklabels(["executor", "heap (1m)"])
    a.set_xticks([0, 1, 2, 3])
    a.set_xticklabels(["pop", "+1 min", "+2 min", "return"])
    a.set_xlabel("real time")
    clean(a)
    panel_label(a, "(a)")

    # (b) 语义撕裂：标签 vs 数据时间戳
    labels = ["tick label", "data read via\ntm.now()"]
    vals = [1.0, 3.28]  # 10:01 vs 10:03:17
    bars = b.barh(labels, vals, color=[FILL_BLUE, FILL_RED], edgecolor=[BLUE, RED], lw=0.8, height=0.5)
    b.set_xlim(0, 4.2)
    b.set_xticks([1, 2, 3, 4])
    b.set_xticklabels(["10:01", "10:02", "10:03", "10:04"])
    b.text(1.05, 0, "  10:01:00", va="center", fontsize=7.2, family="monospace")
    b.text(3.33, 1, "  10:03:17", va="center", fontsize=7.2, family="monospace")
    b.annotate("", xy=(3.28, 0.5), xytext=(1.0, 0.5), arrowprops=dict(arrowstyle="<->", lw=0.7, color=INK))
    b.text(2.15, 0.62, "2 min 17 s apart", ha="center", fontsize=6.8)
    b.set_title("one \"10:01 tick\" executed by the pump", fontsize=8, pad=4)
    b.invert_yaxis()
    clean(b)
    panel_label(b, "(b)")
    fig.savefig(out / "fig-04.svg", bbox_inches="tight")
    return fig


# ============================================================
# Fig. 5 — 三态时钟与锚点公式
# ============================================================
def fig05(out):
    fig = plt.figure(figsize=(W1, 3.1))
    gs = fig.add_gridspec(1, 2, width_ratios=[1, 1.45], wspace=0.22)
    a = fig.add_subplot(gs[0])
    b = fig.add_subplot(gs[1])

    # (a) 状态机
    a.set_xlim(0, 10)
    a.set_ylim(0, 10.7)
    a.axis("off")
    box(a, (0.6, 7.0), 4.2, 2.0, "FastForward\nnow() = current", fc=FILL_BLUE, ec=BLUE, fs=7.8)
    box(a, (5.2, 7.0), 4.2, 2.0, "Realtime\nnow() = anchor\n+ Δmono − paused", fc=FILL_RED, ec=RED, fs=6.8)
    box(a, (2.9, 1.2), 4.2, 2.0, "CatchUp\npop overdue · coalesce · run", fc=FILL_GRAY, ec=INK, fs=7.6)
    arrow(a, (4.8, 8.45), (5.2, 8.45), text="enter_barrier 0→1", toff=(0, 0.8), fs=6.4)
    arrow(a, (5.2, 7.55), (4.8, 7.55), text="exit_barrier 1→0", toff=(0, -0.95), fs=6.4)
    arrow(a, (7.3, 7.0), (5.6, 3.2), text="heap top overdue", toff=(1.55, 0), fs=6.4)
    arrow(a, (4.4, 3.2), (2.7, 7.0), text="drained", toff=(-1.2, 0), fs=6.4)
    a.text(7.3, 9.95, "refcount 1→2, 2→1: stay here,\nshare the anchor", ha="center", va="center", fontsize=6.0, color=RED)
    panel_label(a, "(a)")

    # (b) now(t)：真实算法
    mono = np.linspace(0, 200, 2001)
    anchor_virtual = 0.0
    pause_start, pause_end = 70, 100
    exit_t = 160
    end_clamp = 150

    paused = np.clip(mono - pause_start, 0, pause_end - pause_start)
    now = anchor_virtual + mono - paused
    now = np.minimum(now, end_clamp)
    live = mono <= exit_t
    b.plot(mono[live], now[live], color=RED, lw=1.3, label="now() while a barrier is held")
    b.plot(mono[~live], np.full((~live).sum(), min(now[live][-1], end_clamp)), color=BLUE, lw=1.3, label="settled current after exit")
    b.plot(mono, mono, color=GRAY, lw=0.7, ls=":", label="slope 1 reference")
    b.axvspan(pause_start, pause_end, color=FILL_GRAY, lw=0)
    b.axhline(end_clamp, color=INK, lw=0.6, ls="--")
    b.text(213, end_clamp + 2.5, "backtest end (min clamp)", fontsize=6.8, ha="right", va="bottom")
    b.text((pause_start + pause_end) / 2, 12, "on_pause → on_resume\n30 s not counted", ha="center", fontsize=6.6, color=GRAY)
    b.axvline(exit_t, color=BLUE, lw=0.6, ls="--")
    b.text(exit_t + 2, 60, "exit_barrier:\ncurrent = max(current,\n min(advanced, end))", fontsize=6.4, color=BLUE, family="monospace")
    b.scatter([0], [0], s=16, color=RED, zorder=4)
    b.text(3, -14, "anchor (virtual, monotonic)", fontsize=6.6, color=RED)
    b.set_xlabel("time.monotonic() − anchor_real (s)")
    b.set_ylabel("now() − anchor_virtual (s)")
    b.set_xlim(0, 215)
    b.set_ylim(-20, 200)
    b.legend(loc="upper left", fontsize=6.4)
    clean(b)
    panel_label(b, "(b)")
    fig.savefig(out / "fig-05.svg", bbox_inches="tight")
    return fig


# ============================================================
# Fig. 6 — CatchUp 合并扫描
# ============================================================
def fig06(out):
    fig, (a, b) = plt.subplots(1, 2, figsize=(W1, 2.7), gridspec_kw={"wspace": 0.3, "width_ratios": [1.15, 1]})
    # (a) barrier 退出时的堆：过期条目与合并结果
    a.set_xlim(0.5, 6.5)
    a.set_ylim(-0.8, 3.6)
    intervals = {"1m": [2, 3, 4], "5m": [5], "15m": [15]}  # 相对 10:00 的分钟
    rows = {"1m": 2.4, "5m": 1.4, "15m": 0.4}
    settled = 4.3  # current 结算到 10:04:18
    a.axvline(settled, color=BLUE, lw=1.0)
    a.text(settled + 0.06, 3.4, "current = 10:04:18", fontsize=6.8, color=BLUE, family="monospace")
    for name, y in rows.items():
        for m in intervals[name]:
            if m > 6:
                continue
            overdue = m <= settled
            keep = overdue and m == max(v for v in intervals[name] if v <= settled)
            fc = FILL_RED if (overdue and not keep) else (FILL_BLUE if keep else "white")
            ec = RED if (overdue and not keep) else (BLUE if keep else GRAY)
            a.add_patch(FancyBboxPatch((m - 0.42, y - 0.28), 0.84, 0.56, boxstyle="round,pad=0,rounding_size=0.08", fc=fc, ec=ec, lw=0.8))
            a.text(m, y, f"{name}@10:{m:02d}", ha="center", va="center", fontsize=6.2, family="monospace")
    from matplotlib.patches import Patch
    a.legend(handles=[Patch(fc=FILL_RED, ec=RED, label="overdue: dropped"), Patch(fc=FILL_BLUE, ec=BLUE, label="overdue: kept (latest)"),
                      Patch(fc="white", ec=GRAY, label="future: untouched")], loc="lower left", fontsize=6.2, ncol=3, handlelength=1.2,
             columnspacing=0.8, bbox_to_anchor=(0.0, 0.0))
    a.set_yticks(list(rows.values()))
    a.set_yticklabels([f"interval {k}" for k in rows])
    a.set_xticks([2, 3, 4, 5, 6])
    a.set_xticklabels(["10:02", "10:03", "10:04", "10:05", "10:06"])
    a.set_xlabel("next_time of heap entries at barrier exit")
    a.text(3.5, 3.05, "after one _catchup pass: 1m fires once, at 10:04", ha="center", fontsize=6.6, style="italic")
    clean(a)
    panel_label(a, "(a)")

    # (b) replay vs coalesce：执行次数与所用数据
    b.set_xlim(1.4, 4.9)
    b.set_ylim(-0.4, 2.2)
    for x in [2, 3, 4]:
        b.add_patch(Rectangle((x - 0.3, 1.2), 0.6, 0.5, fc=FILL_RED, ec=RED, lw=0.8))
        b.text(x, 1.45, f"tick 10:{x:02d}", ha="center", va="center", fontsize=6.0, family="monospace")
        b.text(x, 1.0, "data 10:04", ha="center", va="center", fontsize=6.0, color=RED, family="monospace")
    b.add_patch(Rectangle((3.7, 0.15), 0.6, 0.5, fc=FILL_BLUE, ec=BLUE, lw=0.8))
    b.text(4.0, 0.4, "tick 10:04", ha="center", va="center", fontsize=6.0, family="monospace")
    b.text(4.0, -0.05, "data 10:04", ha="center", va="center", fontsize=6.0, color=BLUE, family="monospace")
    b.text(1.5, 1.9, "replay: 3 executions, identical inputs, dishonest labels", fontsize=6.6, color=RED)
    b.text(1.5, 0.74, "coalesce-to-latest: 1 execution, consistent", fontsize=6.6, color=BLUE)
    b.set_yticks([])
    b.set_xticks([2, 3, 4])
    b.set_xticklabels(["10:02", "10:03", "10:04"])
    b.set_xlabel("virtual boundary")
    clean(b)
    b.spines["left"].set_visible(False)
    panel_label(b, "(b)")
    fig.savefig(out / "fig-06.svg", bbox_inches="tight")
    return fig


# ============================================================
# Fig. 7 — priority 分层与 revision 校验
# ============================================================
def fig07(out):
    fig, (a, b) = plt.subplots(1, 2, figsize=(W1, 2.8), gridspec_kw={"wspace": 0.3, "width_ratios": [1.3, 1]})
    # (a) 一次 tick 的执行甘特：层间串行，层内 gather 并发
    rng = np.random.default_rng(7)
    layers = {0: ["risk guard"], 1: ["backend _on_1m_tick"], 2: ["data refresh", "monitor"], 5: ["agent α", "agent β", "agent γ"]}
    t0 = 0.0
    y = 0
    yt, yl = [], []
    for prio in sorted(layers):
        names = layers[prio]
        durs = rng.uniform(0.15, 0.45, len(names)) if prio < 5 else rng.uniform(1.6, 2.4, len(names))
        for n, d in zip(names, durs):
            a.barh(y, d, left=t0, height=0.62, color=FILL_BLUE if prio < 5 else FILL_RED, edgecolor=BLUE if prio < 5 else RED, lw=0.7)
            yt.append(y)
            yl.append(f"p{prio} · {n}")
            y -= 1
        t0 += durs.max()
        a.axvline(t0, color=GRAY, lw=0.5, ls=":")
    a.set_yticks(yt)
    a.set_yticklabels(yl, fontsize=6.6)
    a.set_xlabel("time within one tick (s)")
    a.annotate("layers strictly sequential →", xy=(0.45, 1.02), xycoords="axes fraction", fontsize=6.6, color=GRAY, ha="center")
    a.text(1.2, -3.52, "same layer: asyncio.gather (concurrent)", fontsize=6.4, color=RED, va="center")
    clean(a)
    panel_label(a, "(a)")

    # (b) revision 校验时间线
    b.set_xlim(0, 10)
    b.set_ylim(0, 5)
    b.axis("off")
    events = [(1.0, "register\n→ rev 3", 1), (3.2, "request_immediate\nstaged handle(rev 3)", -1), (5.4, "unregister\n→ rev 4", 1), (7.9, "drain:\ncheck revision", -1)]
    b.plot([0.5, 9.5], [2.6, 2.6], color=INK, lw=0.8)
    for x, s_, side in events:
        b.plot([x], [2.6], marker="o", ms=4, color=RED if x > 7 else INK)
        b.text(x, 2.6 + side * 0.42, s_, ha="center", va="bottom" if side > 0 else "top", fontsize=6.0, family="monospace")
    b.text(1.0, 4.0, "counter = 3", ha="center", fontsize=6.4, color=BLUE, family="monospace")
    b.text(5.4, 4.0, "counter = 4", ha="center", fontsize=6.4, color=BLUE, family="monospace")
    b.text(7.9, 0.15, "3 ≠ 4 → dropped\n(no lock, one int compare)", ha="center", va="bottom", fontsize=6.2, color=RED)
    b.text(5.0, 4.75, "TaskHandle(name, interval, revision) is a snapshot", ha="center", fontsize=6.6, style="italic")
    panel_label(b, "(b)")
    fig.savefig(out / "fig-07.svg", bbox_inches="tight")
    return fig


# ============================================================
# Fig. 8 — live 派发不对称
# ============================================================
def fig08(out):
    fig, (a, b) = plt.subplots(2, 1, figsize=(W1, 3.4), sharex=True, gridspec_kw={"hspace": 0.18})
    rng = np.random.default_rng(3)
    n_trig = 5
    durs = rng.uniform(58, 82, n_trig)  # 每个 sub-agent ≈ 60 s（有抖动）
    horizon = 300

    def draw(ax, inline: bool):
        # 主循环的「空闲/阻塞」轨 + 5 个 1m trigger 的任务轨
        tick_times = np.arange(0, horizon, 60.0)
        y_loop = n_trig + 0.6
        busy_until = np.zeros(n_trig)
        loop_free = 0.0
        for k, tk in enumerate(tick_times):
            ax.plot([tk, tk], [-0.6, y_loop + 0.5], color=GRAY, lw=0.5, ls=":")
            if inline:
                start = max(tk, loop_free)  # 主循环还在 await 上一批 → 本 tick 顺延
                batch = durs.max()
                for j in range(n_trig):
                    ax.barh(j, durs[j], left=start, height=0.55, color=FILL_RED, edgecolor=RED, lw=0.6, alpha=0.9 if k == 0 else 0.55)
                ax.barh(y_loop, batch, left=start, height=0.4, color=RED, lw=0)
                loop_free = start + batch
                if k > 0:
                    ax.annotate("", xy=(start, y_loop + 0.45), xytext=(tk, y_loop + 0.45), arrowprops=dict(arrowstyle="-|>", lw=0.6, color=RED))
            else:
                ax.barh(y_loop, 1.5, left=tk, height=0.4, color=BLUE, lw=0)
                for j in range(n_trig):
                    if busy_until[j] > tk:  # 单飞守卫：上一次还没跑完 → 跳过本次触发
                        ax.plot([tk], [j], marker="o", ms=4, mfc="white", mec=BLUE, mew=0.7)
                        continue
                    ax.barh(j, durs[j], left=tk, height=0.55, color=FILL_BLUE, edgecolor=BLUE, lw=0.6, alpha=0.9 if k == 0 else 0.55)
                    busy_until[j] = tk + durs[j]
        ax.set_yticks(list(range(n_trig)) + [y_loop])
        ax.set_yticklabels([f"trigger {i + 1}" for i in range(n_trig)] + ["main loop"], fontsize=6.6)
        ax.set_ylim(-0.7, y_loop + 1.3)
        clean(ax)

    draw(a, inline=True)
    a.text(2, 6.45, "inline await: the loop is blocked for the slowest handler; every later tick is pushed off the grid (red arrows)", fontsize=6.6, color=RED, ha="left")
    panel_label(a, "(a)")
    draw(b, inline=False)
    b.text(2, 6.45, "fire-and-forget: the loop returns to the heap in µs; ticks stay on the grid; ○ = fire skipped by the single-flight guard", fontsize=6.6, color=BLUE, ha="left")
    b.set_xlabel("wall-clock seconds (five 1 m triggers, 58–82 s per sub-agent; incident 752774d)")
    b.set_xlim(0, horizon + 70)
    panel_label(b, "(b)")
    fig.savefig(out / "fig-08.svg", bbox_inches="tight")
    return fig


# ============================================================
# Fig. 9 — 改动范围与测试
# ============================================================
def fig09(out):
    fig, (a, b) = plt.subplots(1, 2, figsize=(W1, 2.4), gridspec_kw={"wspace": 0.45, "width_ratios": [1.2, 1]})
    comps = ["BacktestTimeSource", "TimeManager", "app.py (adapter)", "Trigger", "Strategy / Episode", "LocalBackend", "DataService"]
    lines = [50, 60, 2, 0, 0, 0, 0]
    colors = [BLUE, BLUE, BLUE, GRAY, GRAY, GRAY, GRAY]
    a.barh(comps, lines, color=[FILL_BLUE] * 3 + [FILL_GRAY] * 4, edgecolor=colors, lw=0.8, height=0.6)
    for i, v in enumerate(lines):
        a.text(v + 1.5, i, f"{v}", va="center", fontsize=7, family="monospace")
    a.invert_yaxis()
    a.set_xlim(0, 80)
    a.set_xlabel("lines changed (hybrid clock rewrite)")
    a.text(40, 5.9, "consumers: 0 lines", fontsize=6.8, color=GRAY, style="italic")
    clean(a)
    panel_label(a, "(a)")

    cats = ["now() under barrier", "end clamp / monotonic exit", "shared anchor", "pause accounting", "grid-aligned registration", "coalesce keeps latest",
            "loop non-blocking", "priority in dispatched tick", "single-flight / rate limit", "backtest still blocks"]
    counts = [4, 3, 2, 3, 3, 3, 4, 3, 4, 2]
    groups = [BLUE] * 6 + [RED] * 4
    b.barh(cats, counts, color=[FILL_BLUE] * 6 + [FILL_RED] * 4, edgecolor=groups, lw=0.8, height=0.6)
    b.invert_yaxis()
    b.set_xlim(0, 5.5)
    b.set_xticks([0, 1, 2, 3, 4, 5])
    b.set_xlabel("unit tests (18 hybrid + 13 live dispatch)")
    b.tick_params(axis="y", labelsize=6.2)
    clean(b)
    panel_label(b, "(b)")
    fig.savefig(out / "fig-09.svg", bbox_inches="tight")
    return fig


FIGS = [fig01, fig02, fig03, fig04, fig05, fig06, fig07, fig08, fig09]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="src/assets/blog/time-manager-part-2")
    ap.add_argument("--png", action="store_true", help="同时输出 PNG 预览")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for f in FIGS:
        fig = f(out)
        if args.png:
            fig.savefig(out / f"{f.__name__.replace('fig', 'fig-')}.png", bbox_inches="tight")
        plt.close(fig)
    print(f"wrote {len(FIGS)} figures → {out}")


if __name__ == "__main__":
    main()
