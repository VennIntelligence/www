/**
 * content.js — /blog/time-manager-part-2 全部正文（中英双语，单一来源）。
 *
 * 文章采用技术报告 / 系统分析论文的结构：
 *   FRONT      — 报告标签、摘要、关键词
 *   SECTIONS   — 编号章节 { no, id, title, blocks }
 *
 * blocks type：
 *   p        段落                      { en, zh }
 *   h3       小节标题                  { en, zh }
 *   figure   图（编号自动）            { src, caption:{en,zh}, alt:{en,zh} }
 *   table    表（编号自动，罗马数字）  { caption:{en,zh}, headers:{en,zh}, rows:{en,zh} }
 *   listing  代码（编号自动）          { caption:{en,zh}, code }
 *   ol / ul  列表                      { en:[], zh:[] }
 *   def      定义 / 原则框             { term:{en,zh}, en, zh }
 *
 * 行内标记：`code` → <code>，**text** → <strong>。
 * Fig. n / Table n / Listing n 在正文中直接书写，与自动编号一致。
 */

export const UI = {
  report: { en: 'Technical Report · Venn AI · core/time_manager.py', zh: '技术报告 · Venn AI · core/time_manager.py' },
  abstract: { en: 'Abstract', zh: '摘要' },
  keywords: { en: 'Index Terms', zh: '关键词' },
  fig: { en: 'Fig.', zh: '图' },
  table: { en: 'TABLE', zh: '表' },
  listing: { en: 'Listing', zh: '代码清单' },
  abridged: { en: 'abridged from core/time_manager.py', zh: '节选自 core/time_manager.py' },
};

export const FRONT = {
  abstract: {
    en: 'Discrete-event backtest engines assume that a strategy decides in zero time: virtual time is a static value that jumps between scheduling boundaries. This assumption fails when the strategy is an LLM agent whose single decision takes minutes of wall-clock time. We describe the failure observed in a production time kernel (a frozen clock, a stalled matching engine and lost interval events), analyse and reject the intuitive remedy of a second executor, and present a hybrid clock with three states — FastForward, Realtime and CatchUp — in which virtual time flows at 1:1 behind a reference-counted barrier and missed boundaries are coalesced to the latest state instead of replayed. We further describe priority layering with revision-checked cancellation, and a dispatch asymmetry that keeps the live-mode loop non-blocking. The kernel changed by about 110 lines; no consumer changed. Thirty-one unit tests pin the stated properties.',
    zh: '离散事件回测引擎假设策略在零时间内完成决策：虚拟时间是一个静态值，只在调度边界之间跳跃。当策略是一个单次决策需要数分钟物理时间的 LLM agent 时，这一假设不再成立。本文记录生产时间内核中观察到的失效（时钟冻结、撮合引擎停摆、间隔事件丢失），分析并否决「再加一个执行体」这一直觉方案，提出具有 FastForward、Realtime、CatchUp 三个状态的混合时钟：在带引用计数的 barrier 之后虚拟时间以 1:1 流动，错过的边界被合并到最新状态而非逐个回放。文中还描述了带 revision 校验取消语义的 priority 分层，以及使 live 模式主循环不阻塞的派发不对称。内核改动约 110 行，消费者零改动；31 个单元测试钉住所述性质。',
  },
  keywords: {
    en: ['backtesting', 'discrete-event simulation', 'virtual time', 'LLM agents', 'asyncio scheduling', 'coalescing'],
    zh: ['回测', '离散事件仿真', '虚拟时间', 'LLM agent', 'asyncio 调度', '事件合并'],
  },
};

export const SECTIONS = [
  /* ── 1 ── */
  {
    no: '1',
    id: 'introduction',
    title: { en: 'Introduction', zh: '引言' },
    blocks: [
      {
        type: 'p',
        en: 'A backtest is a discrete-event simulation. The engine holds a virtual clock, pops the next scheduled boundary from a heap, sets the clock to that boundary, runs every handler subscribed to it, and repeats. The model of computation behind this loop is that handlers are instantaneous: a full trading day of one-minute ticks is 1,440 jumps and completes in about 1.4 s of wall-clock time (Fig. 2a). Nothing in the loop asks how long a handler took, because for indicator arithmetic and order placement the answer is "milliseconds", and milliseconds of real time have no virtual meaning.',
        zh: '回测是一种离散事件仿真。引擎持有一个虚拟时钟，从堆中弹出下一个调度边界，把时钟设到该边界，运行所有订阅该边界的 handler，然后重复。这一循环背后的计算模型是：handler 是瞬时的。一整个交易日的 1 分钟 tick 是 1440 次跳跃，约 1.4 秒物理时间即可完成（图 2a）。循环中没有任何地方询问 handler 花了多久，因为对指标计算和下单而言答案是「毫秒」，而毫秒级的真实时间没有虚拟意义。',
      },
      {
        type: 'p',
        en: 'In 2025 we placed an LLM-driven agent inside this loop. One `check → action` pass — model inference, tool parsing, the occasional self-repair of a malformed call — takes three to five minutes of real time. The question this report answers is narrow and, we found, surprisingly deep: **while an agent thinks for three real minutes, what should virtual time do?**',
        zh: '2025 年我们把一个 LLM 驱动的 agent 放进了这个循环。一次 `check → action` 流程 —— 模型推理、工具解析、偶尔对格式错误调用的自我修复 —— 需要三到五分钟真实时间。本报告要回答的问题很窄，但我们发现它出人意料地深：**当 agent 思考三分钟真实时间时，虚拟时间应当如何？**',
      },
      {
        type: 'p',
        en: 'Our contributions are: (i) a characterisation of how the zero-time assumption fails, with three symptoms traced to one root cause (§3); (ii) an analysis of why the intuitive fix — a background executor that drains the heap during the barrier — cannot be made correct (§4); (iii) a three-state hybrid clock whose mode switch is a single branch on data that already had to exist (§5); (iv) a coalescing catch-up pass and a semantic split between observed time and scheduling anchor (§6); (v) priority layering with revision-checked cancellation (§7) and a non-blocking live dispatch path (§8). §9 reports the change footprint and test coverage.',
        zh: '本文的贡献：(i) 刻画零时间假设如何失效，把三个症状归结到一个根因（§3）；(ii) 分析为什么直觉方案 —— barrier 期间由后台执行体排空堆 —— 无法做对（§4）；(iii) 提出三态混合时钟，其模式切换只是对「本来就必须存在的数据」做一次分支（§5）；(iv) 合并式追赶扫描，以及观察时间与调度锚点的语义拆分（§6）；(v) 带 revision 校验取消语义的 priority 分层（§7）与不阻塞的 live 派发路径（§8）。§9 报告改动范围与测试覆盖。',
      },
    ],
  },

  /* ── 2 ── */
  {
    no: '2',
    id: 'kernel',
    title: { en: 'Background: One Clock, One Heap', zh: '背景：一个时钟，一个堆' },
    blocks: [
      {
        type: 'p',
        en: 'The kernel enforces one invariant: there is exactly one source of time in the process. No component calls `datetime.now()`. Strategies, the matching backend, the web API and log timestamps all ask the `TimeManager`, which delegates to a `TimeSource` — an abstract base with five methods (Fig. 1). `LiveTimeSource` returns wall-clock time and really sleeps. `BacktestTimeSource` returns a virtual `current`; its original `sleep_until()` was a single assignment.',
        zh: '内核只强制一条不变量：进程内时间的来源有且只有一个。任何组件都不调用 `datetime.now()`。策略、撮合后端、Web API、日志时间戳全部向 `TimeManager` 索要时间，后者委托给 `TimeSource` —— 一个只有五个方法的抽象基类（图 1）。`LiveTimeSource` 返回墙钟时间并真正睡眠；`BacktestTimeSource` 返回虚拟的 `current`，它最初的 `sleep_until()` 只是一句赋值。',
      },
      {
        type: 'figure',
        src: 'fig01',
        alt: { en: 'Block diagram of the time kernel', zh: '时间内核框图' },
        caption: {
          en: 'Architecture of the time kernel. A single `TimeManager` owns the schedule heap and the main loop; two `TimeSource` implementations supply time. Consumers receive `Tick(interval, timestamp, sequence)` and never read a clock directly. The hybrid rewrite described in §5–§6 touched only the shaded components.',
          zh: '时间内核架构。单一 `TimeManager` 拥有调度堆与主循环；两个 `TimeSource` 实现提供时间。消费者接收 `Tick(interval, timestamp, sequence)`，从不直接读时钟。§5–§6 描述的混合改造只触及带底色的组件。',
        },
      },
      {
        type: 'p',
        en: 'Two details of the loop carry more weight than their line count. First, rescheduling starts **from the scheduled time, not from now**: `align(scheduled_time, next=True)`. A 400 ms handler therefore never drags the grid; boundaries are fixed points (Fig. 2b shows the alternative accumulating 24 s of drift per hour). Second, `register()` on a running engine calls `wakeup()`: the sleeping loop is interrupted, returns `SleepResult.WAKEUP`, requeues what it had popped and re-examines the heap top. A trigger registered at 10:00:59 for a one-minute interval fires at 10:01:00.',
        zh: '主循环中有两个细节的分量远超其行数。其一，重排**从调度时间而非 now() 出发**：`align(scheduled_time, next=True)`。一个耗时 400 ms 的 handler 因此拖不动网格，边界是固定点（图 2b 展示了另一种做法每小时累积 24 秒漂移）。其二，运行中调用 `register()` 会触发 `wakeup()`：沉睡的主循环被打断、返回 `SleepResult.WAKEUP`、把已弹出的批次放回并重查堆顶。10:00:59 注册的 1 分钟 trigger 在 10:01:00 触发。',
      },
      {
        type: 'figure',
        src: 'fig02',
        alt: { en: 'FastForward throughput and reschedule drift', zh: 'FastForward 吞吐与重排漂移' },
        caption: {
          en: '(a) Virtual time advanced against wall-clock time in FastForward: each boundary costs one cooperative yield of about 1 ms. (b) Drift from the boundary grid after n one-minute ticks with a 400 ms handler, rescheduling from the scheduled time (blue) versus from `now()` after the handler returns (red).',
          zh: '(a) FastForward 下虚拟时间推进量与物理时间的关系：每个边界耗费一次约 1 ms 的协作式让出。(b) 在 handler 耗时 400 ms 的情况下，n 个 1 分钟 tick 之后相对边界网格的漂移：从调度时间重排（蓝）与 handler 返回后从 `now()` 重排（红）。',
        },
      },
      {
        type: 'table',
        caption: { en: 'Design decisions of the base kernel and the alternatives considered', zh: '基础内核的设计决策与曾考虑的替代方案' },
        headers: { en: ['Decision', 'Alternative considered', 'Rejected because'], zh: ['决策', '曾考虑的替代', '否决原因'] },
        rows: {
          en: [
            ['One min-heap of schedules', 'One asyncio task per subscriber', 'N tasks drift independently; no batching at shared boundaries; shutdown becomes N-way herding'],
            ['Reschedule from scheduled time', 'From now() after handler returns', 'Handler latency accumulates into permanent grid drift (Fig. 2b)'],
            ['wakeup() preemption on register', 'Poll the heap every N ms', 'Polling burns CPU for sub-second precision; an event-interrupted sleep is exact and free'],
            ['Tick broadcast on the message bus', 'Every consumer registers a handler', 'Observers must not be able to slow the kernel'],
          ],
          zh: [
            ['一个 schedule 最小堆', '每个订阅者一个 asyncio task', 'N 个 task 各自漂移；共享边界无法批处理；停机变成 N 路围捕'],
            ['从调度时间重排', 'handler 返回后从 now() 顺延', 'handler 延迟累积成永久网格漂移（图 2b）'],
            ['register 时 wakeup() 抢占', '每 N 毫秒轮询堆', '轮询为亚秒精度白烧 CPU；事件打断的睡眠既精确又免费'],
            ['tick 在消息总线上广播', '所有消费者都注册 handler', '旁观者不应有能力拖慢内核'],
          ],
        },
      },
    ],
  },

  /* ── 3 ── */
  {
    no: '3',
    id: 'failure',
    title: { en: 'Failure Analysis: The Barrier Freeze', zh: '失效分析：barrier 冻结' },
    blocks: [
      {
        type: 'p',
        en: 'In backtest mode the loop holds a **barrier**: time must not advance until every handler of the current tick has returned, otherwise a 10:01 decision could read 10:02 data. For millisecond handlers the barrier is a formality. When an agent-driven trigger opened an LLM call inside the barrier and held it for three real minutes, the old engine behaved as shown in Fig. 3 and summarised in Table II.',
        zh: '回测模式下主循环持有一道 **barrier**：当前 tick 的全部 handler 返回之前，时间不得推进，否则 10:01 的决策可能读到 10:02 的数据。对毫秒级 handler，barrier 只是仪式。当一个 agent 驱动的 trigger 在 barrier 内发起 LLM 调用并持有三分钟真实时间时，旧引擎的行为如图 3 所示，并汇总于表 II。',
      },
      {
        type: 'figure',
        src: 'fig03',
        alt: { en: 'Virtual time and events during a three-minute barrier in the old engine', zh: '旧引擎在三分钟 barrier 期间的虚拟时间与事件' },
        caption: {
          en: 'The freeze. (a) `now()` returned by the old engine (blue) against wall-clock time (red, dashed) after the 10:01 tick was popped and an LLM call held the barrier for three real minutes. (b) Interval events expected on the one-minute grid versus events actually executed: the 10:02 and 10:03 entries were never created, because `_schedule_next` runs only after the handler returns.',
          zh: '冻结现场。(a) 10:01 tick 被弹出、LLM 调用持有 barrier 三分钟期间，旧引擎返回的 `now()`（蓝）与物理时间（红色虚线）。(b) 1 分钟网格上应发生的间隔事件与实际执行的事件：10:02 与 10:03 条目从未被创建，因为 `_schedule_next` 只在 handler 返回后运行。',
        },
      },
      {
        type: 'table',
        caption: { en: 'Symptoms observed during the barrier and their root cause', zh: 'barrier 期间观察到的症状及其根因' },
        headers: { en: ['Problem', 'Symptom', 'Root cause'], zh: ['问题', '症状', '根因'] },
        rows: {
          en: [
            ['P1 Time frozen', 'The agent reads stale candles; order timestamps stay at 10:01 while real time is 10:04', 'now() returns the static self.current'],
            ['P2 Engine stalled', 'Limit orders never match; SL/TP never trigger', 'Main loop blocked inside _execute_schedules; _schedule_next never called'],
            ['P3 Events lost', 'The 10:02 and 10:03 ticks are delayed until the barrier releases, then collapse into one', 'Exactly one schedule per interval lives in the heap; the next one does not exist yet'],
          ],
          zh: [
            ['P1 时间冻结', 'agent 读到过期 K 线；真实时间已到 10:04，订单时间戳仍是 10:01', 'now() 返回静态的 self.current'],
            ['P2 引擎停摆', '限价单永不成交；止损/止盈永不触发', '主循环阻塞在 _execute_schedules 内；_schedule_next 从未被调用'],
            ['P3 事件丢失', '10:02、10:03 的 tick 被推迟到 barrier 释放，然后坍缩成一个', '堆中每个 interval 恰好一条 schedule；下一条尚不存在'],
          ],
        },
      },
      {
        type: 'p',
        en: 'All three symptoms share one cause: the old clock had two states, fast-forward and stopped, and "stopped" froze the entire simulated world. What an agent requires is a clock with two gears — fast-forward through empty time, and 1:1 flow while a decision is being made.',
        zh: '三个症状同源：旧时钟只有两个状态，快进与停止，而「停止」冻结了整个被仿真的世界。agent 需要的是一个有两个挡位的时钟 —— 在空白时间里快进，在决策进行时以 1:1 流动。',
      },
    ],
  },

  /* ── 4 ── */
  {
    no: '4',
    id: 'pump',
    title: { en: 'A Rejected Design: The Background Pump', zh: '被否决的设计：后台泵' },
    blocks: [
      {
        type: 'p',
        en: 'The first design (v1) followed the obvious instinct: if the main loop is blocked, start a **background coroutine** — a "pump" — that scans the heap during the barrier and executes whatever falls due. The design document specified `_run_pump()`, `set_realtime_callbacks()` and a `_pump_processed` deduplication set. An audit rejected it on three grounds, each sufficient on its own (Fig. 4).',
        zh: '第一版设计（v1）遵循最直觉的思路：主循环被堵住，那就启动一个**后台协程** —— 一个「泵」—— 在 barrier 期间扫描堆并执行到期的条目。设计文档定义了 `_run_pump()`、`set_realtime_callbacks()` 和 `_pump_processed` 去重集合。一次审计以三条理由否决了它，每一条都单独成立（图 4）。',
      },
      {
        type: 'figure',
        src: 'fig04',
        alt: { en: 'Why the background pump cannot work', zh: '后台泵为什么不成立' },
        caption: {
          en: 'Autopsy of the pump. (a) Heap occupancy for the one-minute interval during a barrier: the slot is empty from the pop until the handler returns, so a pump scanning the heap finds nothing due. (b) Semantic split of a "10:01 tick" executed by the pump: the tick label says 10:01 while `tm.now()` inside the handler returns 10:03:17.',
          zh: '泵的尸检。(a) barrier 期间 1 分钟 interval 的堆占用：从弹出到 handler 返回，槽位一直为空，扫描堆的泵找不到任何到期条目。(b) 由泵执行的一个「10:01 tick」的语义撕裂：tick 标签写着 10:01，而 handler 内部的 `tm.now()` 返回 10:03:17。',
        },
      },
      {
        type: 'ol',
        en: [
          '**The pump cannot find future ticks.** The scheduling model is `pop → execute → _schedule_next`; each interval keeps exactly one entry in the heap. After the loop pops 1m@10:01, the 10:02 entry does not exist until the handler returns.',
          '**Two executors, one heap.** Forcing early rescheduling gives two owners of mutable state. Locks, deduplication and duplicate-fire checks follow, and none of them restore a single point of ownership.',
          '**Undefined semantics.** A tick labelled 10:01 executed at real 10:03 reads 10:03 data through `tm.now()`. The result is neither replay nor coalesce; it is an intermediate state with no specification.',
        ],
        zh: [
          '**泵找不到未来的 tick。**调度模型是 `pop → execute → _schedule_next`；每个 interval 在堆中恰好一条。主循环弹出 1m@10:01 之后，10:02 条目在 handler 返回之前根本不存在。',
          '**两个执行体，一个堆。**强制提前重排会让可变状态有两个主人。随之而来的是锁、去重、重复触发检查，而这些都无法恢复单一的所有权。',
          '**语义未定义。**标签为 10:01、在真实 10:03 执行的 tick 会通过 `tm.now()` 读到 10:03 的数据。结果既不是回放也不是合并，而是一种没有规格说明的中间态。',
        ],
      },
      {
        type: 'p',
        en: 'The lesson generalises. The most intuitive fix for a blocked executor is a second executor, and it is almost always wrong, because it optimises the symptom (nothing is running) rather than the invariant (exactly one thing owns the heap). After discarding the pump we restated the requirement in terms of what is actually owed during a barrier:',
        zh: '这个教训可以推广：对付「执行体被堵住」，最直觉的方案永远是「再加一个执行体」，而它几乎永远是错的，因为它优化的是症状（没有东西在跑）而不是不变量（堆的主人有且只有一个）。埋掉泵之后，我们把需求重新表述为 barrier 期间系统到底欠什么：',
      },
      {
        type: 'ol',
        en: [
          '**R1 — Fresh data.** Querying candles at real 10:03 must return data as of 10:02; hence `now()` must advance during the barrier.',
          '**R2 — Honest timestamps.** An order placed after two minutes of deliberation is a 10:03 order, not a 10:01 order.',
          '**R3 — Recovery, not real-time recovery.** The matching backend need not run during the deliberation. It must reconcile once, against the latest state, when the deliberation ends.',
        ],
        zh: [
          '**R1 — 新鲜数据。**在真实 10:03 查询 K 线必须返回截至 10:02 的数据；因此 barrier 期间 `now()` 必须推进。',
          '**R2 — 诚实的时间戳。**经过两分钟斟酌后下的单是 10:03 的单，不是 10:01 的单。',
          '**R3 — 恢复，而非实时恢复。**撮合后端不必在斟酌进行时运转；它必须在斟酌结束时，对最新状态对一次账。',
        ],
      },
      {
        type: 'def',
        term: { en: 'Principle (Coalesce-to-Latest).', zh: '原则（Coalesce-to-Latest，合并到最新）。' },
        en: 'After a long-running decision, do not replay the boundaries that were missed. Collapse them and reconcile once against the newest state. This mirrors the physical process being simulated: while a trader deliberates, the market moves on, and the trader then faces the current order book, not a frame-by-frame replay.',
        zh: '一次长耗时决策之后，不逐个回放错过的边界；把它们坍缩掉，对最新状态对一次账。这与被仿真的物理过程一致：交易者斟酌期间市场继续运行，回过神时面对的是当前盘口，而不是逐帧回放。',
      },
    ],
  },

  /* ── 5 ── */
  {
    no: '5',
    id: 'clock',
    title: { en: 'The Hybrid Clock: Three States', zh: '混合时钟：三个状态' },
    blocks: [
      {
        type: 'p',
        en: 'The final design gives `BacktestTimeSource` three states (Fig. 5a, Table III). The mode switch is a single branch on the barrier reference count, a value that `enter_barrier()` / `exit_barrier()` already maintained. While any barrier is held, `now()` is computed from an anchor rather than read from a field (Listing 1).',
        zh: '最终设计给 `BacktestTimeSource` 三个状态（图 5a，表 III）。模式切换只是对 barrier 引用计数做一次分支，而这个计数 `enter_barrier()` / `exit_barrier()` 本来就在维护。只要有任何 barrier 被持有，`now()` 就由锚点计算而非从字段读取（代码清单 1）。',
      },
      {
        type: 'figure',
        src: 'fig05',
        alt: { en: 'State machine of the hybrid clock and the now() function under a barrier', zh: '混合时钟状态机与 barrier 下的 now() 函数' },
        caption: {
          en: 'The hybrid clock. (a) State machine: the 0→1 edge of the barrier count enters Realtime and sets the anchor; the 1→0 edge settles `current`; an overdue heap top after settlement enters CatchUp. (b) `now()` as a function of monotonic time during one barrier, computed by the formula in Listing 1: slope 1 from the anchor, a plateau while paused (grey), a clamp at the backtest end, and the settled `current` after `exit_barrier()`.',
          zh: '混合时钟。(a) 状态机：barrier 计数的 0→1 边沿进入 Realtime 并落锚；1→0 边沿结算 `current`；结算后堆顶过期则进入 CatchUp。(b) 一次 barrier 期间 `now()` 关于单调时钟的函数，由代码清单 1 的公式计算：从锚点起斜率为 1，暂停期间为平台（灰色），在回测终点钳制，`exit_barrier()` 之后为结算后的 `current`。',
        },
      },
      {
        type: 'listing',
        caption: { en: '`now()`, `enter_barrier()` and `exit_barrier()` of `BacktestTimeSource`', zh: '`BacktestTimeSource` 的 `now()`、`enter_barrier()` 与 `exit_barrier()`' },
        code: `def now(self) -> datetime:
    if self._barrier_count == 0:                       # FastForward: static
        return self.current
    elapsed = time.monotonic() - self._anchor_real     # Realtime: flows at 1:1
    paused = self._paused_duration
    if self._pause_start is not None:                  # an open pause span
        paused += time.monotonic() - self._pause_start
    advanced = self._anchor_virtual + timedelta(seconds=elapsed - paused)
    return min(advanced, self.end)                     # never past the window

def enter_barrier(self) -> None:
    if self._barrier_count == 0:                       # only the 0→1 edge anchors
        self._anchor_virtual = self.current
        self._anchor_real = time.monotonic()
        self._paused_duration = 0.0
    self._barrier_count += 1

def exit_barrier(self) -> None:
    self._barrier_count -= 1
    if self._barrier_count == 0:                       # only the 1→0 edge settles
        self.current = max(self.current, min(self.now(), self.end))`,
      },
      {
        type: 'p',
        en: 'Every term in Listing 1 was argued over. **`monotonic()` rather than `time.time()`**: wall clocks are adjusted by NTP and by operators; "how much time has passed" must come from a clock that cannot move backwards. **The anchor is shared**: only the 0→1 edge sets it, so three concurrently deliberating agents observe mutually consistent timestamps by construction rather than by coordination; only the 1→0 edge writes `current`. **The exit is clamped from both sides**: `min(·, end)` keeps a marathon deliberation inside the backtest window; `max(current, ·)` makes settlement monotonic regardless of what the arithmetic produces.',
        zh: '代码清单 1 中每一项都经过争论。**用 `monotonic()` 而不是 `time.time()`**：墙钟会被 NTP 与操作者拨动，「过了多久」必须来自一个不会倒走的钟。**锚点是共享的**：只有 0→1 边沿落锚，因此三个并发斟酌的 agent 观察到的时间戳是构造上互洽的，而非协调出来的；只有 1→0 边沿写入 `current`。**退出时双向钳制**：`min(·, end)` 把马拉松式的斟酌按在回测窗口内；`max(current, ·)` 使结算无论算出什么都单调。',
      },
      {
        type: 'table',
        caption: { en: 'States of the hybrid backtest clock', zh: '混合回测时钟的状态' },
        headers: { en: ['State', 'Entered when', 'now()', 'Main loop'], zh: ['状态', '进入条件', 'now()', '主循环'] },
        rows: {
          en: [
            ['FastForward', 'Normal backtest; barrier count = 0', 'Static current', 'Jumps between boundaries'],
            ['Realtime', 'Any barrier held (an agent is deliberating)', 'anchor + real elapsed − paused, clamped to end', 'Blocked at the barrier'],
            ['CatchUp', 'Barrier just released and the heap top is overdue', 'Static (settled) current', 'Pop all overdue, coalesce per interval, execute the latest once'],
          ],
          zh: [
            ['FastForward', '正常回测；barrier 计数 = 0', '静态 current', '在边界之间跳跃'],
            ['Realtime', '任一 barrier 被持有（agent 正在斟酌）', '锚点 + 真实流逝 − 暂停，钳制到终点', '阻塞在 barrier 上'],
            ['CatchUp', 'barrier 刚释放且堆顶已过期', '静态（已结算的）current', '弹出全部过期条目，按 interval 合并，执行最新一次'],
          ],
        },
      },
      {
        type: 'h3',
        en: '5.1 Pause accounting',
        zh: '5.1 暂停记账',
      },
      {
        type: 'p',
        en: 'An operator may freeze the system mid-deliberation. Those seconds must not become virtual market time, so pause is a first-class ledger entry: `on_pause()` stamps a start, `on_resume()` settles the span into `_paused_duration`, and an open span is subtracted live inside `now()` (the plateau in Fig. 5b). The shape of the mechanism matters: **pause callbacks are explicit calls from the application layer, never a check inside `now()`**. `now()` is the hottest path in the system; pause is a human-frequency event. The bookkeeping is paid on the rare edge, not on the hot read.',
        zh: '操作者可能在斟酌进行到一半时冻结系统。这些秒数绝不能变成虚拟市场时间，因此暂停是一等公民的会计科目：`on_pause()` 盖起始戳，`on_resume()` 把时长结算进 `_paused_duration`，进行中的片段在 `now()` 内现场扣除（图 5b 的平台段）。机制的形状很重要：**暂停回调是应用层的显式调用，永远不是 `now()` 内部的检查。**`now()` 是全系统最热的路径，暂停是人类频率的事件。记账成本付在罕见的边沿上，不付在滚烫的读取上。',
      },
    ],
  },

  /* ── 6 ── */
  {
    no: '6',
    id: 'catchup',
    title: { en: 'CatchUp: The Coalesce Pass', zh: 'CatchUp：合并扫描' },
    blocks: [
      {
        type: 'p',
        en: '§5 makes `now()` honest during a barrier but leaves P2 and P3 open: the loop is still blocked. Rather than act during the barrier, the loop performs one catch-up pass after it. The main loop gains a single new branch: if the heap top is overdue relative to the settled `current`, pop every overdue entry, keep the newest per interval, and execute those once (Listing 2, Fig. 6).',
        zh: '§5 让 `now()` 在 barrier 期间变得诚实，但 P2 与 P3 仍未解决：主循环仍然阻塞。主循环不在 barrier 期间行动，而是在其后做一次追赶扫描。主循环只多了一条分支：若堆顶相对结算后的 `current` 已过期，则弹出所有过期条目，每个 interval 只留最新，执行一次（代码清单 2，图 6）。',
      },
      {
        type: 'listing',
        caption: { en: 'The `_catchup` pass of the main loop', zh: '主循环的 `_catchup` 扫描' },
        code: `def _catchup(self) -> None:
    now = self._time_source.now()
    latest: dict[str, Schedule] = {}
    while self._schedule and self._schedule[0].next_time <= now:
        s = heapq.heappop(self._schedule)               # every overdue entry
        prev = latest.get(s.interval)
        if prev is None or s.next_time > prev.next_time:
            latest[s.interval] = s                     # keep the newest per interval
    to_execute = sorted(latest.values(), key=lambda s: s.next_time)
    self._last_schedule_time = max(s.next_time for s in to_execute)  # a grid point
    self._execute_schedules(to_execute)                # once per interval
    for s in to_execute:
        self._schedule_next(s)                         # from the scheduled time`,
      },
      {
        type: 'figure',
        src: 'fig06',
        alt: { en: 'Heap contents at barrier exit and replay versus coalesce', zh: 'barrier 退出时的堆内容以及回放与合并的对比' },
        caption: {
          en: 'The coalesce pass. (a) Heap entries at barrier exit with `current` settled to 10:04:18: overdue one-minute entries are popped, only the newest is kept, future entries are untouched. (b) The alternative of replaying each missed boundary executes three times on identical inputs and labels two of them with times that contradict the data they read.',
          zh: '合并扫描。(a) barrier 退出、`current` 结算到 10:04:18 时的堆条目：过期的 1 分钟条目被弹出，只保留最新一条，未来条目不受影响。(b) 逐个回放错过边界的替代方案会对完全相同的输入执行三次，其中两次的标签时间与所读数据自相矛盾。',
        },
      },
      {
        type: 'p',
        en: 'In steady state each interval keeps exactly one entry in the heap, so after a three-minute barrier a single pass usually finds one overdue entry per interval, and the loop walks the missed boundaries in a rapid ladder of passes. The keep-newest rule earns its place when entries do pile up: re-registration after an empty interval, `WAKEUP` requeues racing a slow drain, several intervals landing due together. Coalescing collapses every such path to at most one execution per interval per pass; `test_catchup_coalesces_same_interval` pins this.',
        zh: '稳态下每个 interval 在堆中恰好一条，因此三分钟 barrier 之后单次扫描通常每个 interval 只捞到一条过期条目，主循环用一串密集的扫描快速爬完错过的边界。「只留最新」在条目真正堆积时兑现价值：空 interval 之后的重注册、`WAKEUP` 放回与缓慢排空竞速、多个 interval 同时到期。合并把所有这些路径坍缩到「每 interval 每轮至多执行一次」；`test_catchup_coalesces_same_interval` 钉住这一点。',
      },
      {
        type: 'table',
        caption: { en: 'Replaying each missed boundary versus coalescing to the latest, after a three-minute barrier', zh: '三分钟 barrier 之后，逐个回放错过边界与合并到最新的对比' },
        headers: { en: ['Dimension', 'Replay each missed tick', 'Coalesce-to-Latest'], zh: ['维度', '逐个回放错过的 tick', 'Coalesce-to-Latest'] },
        rows: {
          en: [
            ['Executions', '3 (10:02, 10:03, 10:04)', '1 (at the newest boundary)'],
            ['Price data used', 'tm.now() = current, three times — identical', 'tm.now() = current, once'],
            ['Timestamp vs. data', 'Contradictory (10:02 label, 10:04 data)', 'Consistent'],
            ['Code touched', 'Heap, backend and data layer', 'TimeManager only, about 60 lines'],
          ],
          zh: [
            ['执行次数', '3 次（10:02、10:03、10:04）', '1 次（最新边界）'],
            ['所用价格数据', '三次都是 tm.now() = current，完全相同', 'tm.now() = current，一次'],
            ['时间戳 vs. 数据', '自相矛盾（10:02 标签，10:04 数据）', '一致'],
            ['改动范围', '堆、后端、数据层', '仅 TimeManager，约 60 行'],
          ],
        },
      },
      {
        type: 'h3',
        en: '6.1 Separating observed time from the scheduling anchor',
        zh: '6.1 观察时间与调度锚点的分离',
      },
      {
        type: 'p',
        en: 'CatchUp exposed a semantic overload in one field. The old `_current_time` served as both the scheduling anchor and the observed time. Once `now()` may return 10:03:17, letting that value reach the anchor would poison the grid permanently: `align(10:03:17, 5m, next)` starts a lattice offset by 3 min 17 s. The fix is a rename with consequences. **`_last_schedule_time`** is written in exactly two places, both grid points (the normal path and the last line of Listing 2); the dynamic `now()` never touches it. A trigger registered mid-barrier still fires first on a clean candle boundary (Table V).',
        zh: 'CatchUp 暴露了一个字段上的语义过载。旧的 `_current_time` 同时充当调度锚点与观察时间。一旦 `now()` 可以返回 10:03:17，让该值进入锚点就会永久毒化网格：`align(10:03:17, 5m, next)` 会生成一条偏移 3 分 17 秒的格子。修复是一次有后果的改名：**`_last_schedule_time`** 全库只在两处写入，且都是网格点（正常路径与代码清单 2 的最后一行）；动态的 `now()` 永远碰不到它。barrier 中途注册的 trigger 的首次触发仍落在干净的 K 线边界上（表 V）。',
      },
      {
        type: 'table',
        caption: { en: 'Two quantities that used to share one field', zh: '曾经共用一个字段的两个量' },
        headers: { en: ['Quantity', 'Semantics', 'Example value'], zh: ['量', '语义', '示例值'] },
        rows: {
          en: [
            ['now()', 'Observed time', 'Dynamic under a barrier (10:03:17)'],
            ['_last_schedule_time', 'Current scheduling boundary', 'Always a grid point (10:03:00)'],
          ],
          zh: [
            ['now()', '观察时间', 'barrier 下动态（10:03:17）'],
            ['_last_schedule_time', '当前调度边界', '永远是网格点（10:03:00）'],
          ],
        },
      },
    ],
  },

  /* ── 7 ── */
  {
    no: '7',
    id: 'ordering',
    title: { en: 'Ordering Within a Tick', zh: 'tick 内的秩序' },
    blocks: [
      {
        type: 'p',
        en: 'A tick is not one handler but a crowd: risk guards, the matching backend, agents and monitors subscribe to the same boundary. Ordering is decided by the single consumer, never by which coroutine happened to await first. Within a tick, **priority layers 0–5** execute strictly sequentially and handlers inside a layer run concurrently under `asyncio.gather` (Fig. 7a); a risk guard at priority 0 completes before any priority-5 agent starts. First executions receive the same treatment: `request_immediate()` does not execute inline; it stages into `_pending_immediate`, and the loop drains the staging area, priority-sorted, at the top of its next iteration.',
        zh: '一个 tick 不是一个 handler，而是一群：风控、撮合后端、agent、监控订阅在同一个边界上。顺序由唯一的消费者决定，永远不由「哪个协程先 await 到」决定。同一 tick 内，**priority 0–5 分层**严格串行，层内 handler 在 `asyncio.gather` 下并发（图 7a）；priority 0 的风控完成后，priority 5 的 agent 才被允许启动。首次执行享受同样待遇：`request_immediate()` 不就地执行，而是暂存进 `_pending_immediate`，主循环在下一轮迭代开头按 priority 排序排空暂存区。',
      },
      {
        type: 'figure',
        src: 'fig07',
        alt: { en: 'Priority layers within a tick and the revision check', zh: 'tick 内的 priority 分层与 revision 校验' },
        caption: {
          en: 'Ordering. (a) Execution of one tick: layers run sequentially, handlers within a layer concurrently. (b) Revision-checked cancellation: a handle staged with revision 3 is compared against the subscriber counter immediately before invocation; after an `unregister` advanced the counter to 4 the stale request is dropped without locks or queue surgery.',
          zh: '秩序。(a) 一个 tick 的执行：层间串行，层内并发。(b) 带 revision 校验的取消：以 revision 3 暂存的 handle 在调用前一瞬与订阅者计数比较；`unregister` 把计数推进到 4 之后，过期请求被丢弃，无需锁或队列手术。',
        },
      },
      {
        type: 'p',
        en: 'The motivating defect is recorded in the API documentation as "the race where a stale immediate still executes after `stop()`": a trigger cancelled between staging and draining fired anyway. A flag cannot fix this; the request is already in the queue. The fix is **revisions**. Every `(name, interval)` pair carries a monotonically increasing counter; `register`, `unregister` and `cancel_handle` advance it, and a `TaskHandle(name, interval, revision)` is a snapshot. `_is_current_subscriber()` runs immediately before invocation and drops a stale revision silently — one integer comparison at the point of no return (Fig. 7b).',
        zh: '促成这一机制的缺陷记录在 API 文档中：「stop() 之后旧 immediate 仍执行的竞态」—— 在暂存与排空之间被取消的 trigger 照样开火。标志位修不了这个问题：请求已经在队列里。修复是 **revision**：每个 `(name, interval)` 组合携带一个单调递增计数；`register`、`unregister`、`cancel_handle` 都推进它，`TaskHandle(name, interval, revision)` 是一份快照。`_is_current_subscriber()` 在调用前一瞬执行，静默丢弃过期 revision —— 在不可回头的那个点上做一次整数比较（图 7b）。',
      },
    ],
  },

  /* ── 8 ── */
  {
    no: '8',
    id: 'live',
    title: { en: 'Live Mode: Dispatch Asymmetry', zh: 'Live 模式：派发不对称' },
    blocks: [
      {
        type: 'p',
        en: 'Everything above is surgery on the backtest side; `LiveTimeSource.needs_barrier()` returns `False` and the new code paths never activate in live mode. Live mode has its own incident, recorded in commit `752774d`: **five one-minute triggers fired simultaneously, each sub-agent taking about 60 s.** The loop awaited the whole batch inline, stayed blocked for the slowest handler, and every subsequent tick was pushed off the grid (Fig. 8a).',
        zh: '以上全部是回测侧的手术；`LiveTimeSource.needs_barrier()` 返回 `False`，新代码路径在 live 模式下从不激活。live 模式有它自己的事故，记录于提交 `752774d`：**五个 1 分钟 trigger 同时触发，每个 sub-agent 约耗时 60 秒。**主循环就地 await 整个批次，被最慢的 handler 阻塞，后续每个 tick 都被推离网格（图 8a）。',
      },
      {
        type: 'figure',
        src: 'fig08',
        alt: { en: 'Inline await versus fire-and-forget dispatch in live mode', zh: 'live 模式下就地 await 与 fire-and-forget 派发的对比' },
        caption: {
          en: 'Live dispatch, reproduced with five one-minute triggers whose handlers take 58–82 s. (a) Inline await: the loop is blocked for the slowest handler of each batch and later ticks cascade. (b) Fire-and-forget dispatch: the loop returns to the heap within microseconds and ticks stay on the grid; hollow markers are fires skipped by the single-flight guard because the previous run of that handler is still alive.',
          zh: 'live 派发，以五个 handler 耗时 58–82 秒的 1 分钟 trigger 复现。(a) 就地 await：主循环被每批最慢的 handler 阻塞，后续 tick 级联延迟。(b) fire-and-forget 派发：主循环在微秒内回到堆旁，tick 留在网格上；空心标记是被单飞守卫跳过的触发，因为该 handler 的上一次执行仍在运行。',
        },
      },
      {
        type: 'p',
        en: 'The fix is an asymmetry keyed on the time source. In backtest, execution is awaited inline: time must not advance past an unfinished decision, which is the purpose of the barrier. In live and paper modes, the entire priority-layered batch is wrapped in one coroutine and dispatched fire-and-forget; the loop returns to the heap in microseconds (Listing 3). Priority still holds inside the dispatched batch, background tasks are tracked and cancelled at shutdown, and a single-flight guard prevents a slow handler from being fired twice.',
        zh: '修复是以时间源为键的不对称。回测中就地 await：时间不得越过一个未完成的决策，这正是 barrier 的意义。live 与 paper 模式中，整个按 priority 分层的批次被包成一个协程并 fire-and-forget 派发；主循环在微秒内回到堆旁（代码清单 3）。priority 在被派发的批次内部依然成立，后台任务集中登记、停机统一取消，单飞守卫防止慢 handler 被二次点火。',
      },
      {
        type: 'listing',
        caption: { en: 'Dispatch asymmetry and the shielded timeout', zh: '派发不对称与 shield 超时' },
        code: `async def _run_tick(self, batch: list[Schedule]) -> None:
    if self._time_source.needs_barrier():              # backtest: await inline
        await self._execute_layers(batch)
        return
    task = asyncio.create_task(self._execute_layers(batch))   # live / paper
    self._background.add(task)                         # tracked, cancelled at stop()
    task.add_done_callback(self._background.discard)

async def _guarded(self, handler, tick, timeout: float) -> None:
    if handler in self._in_flight:                     # single-flight guard
        return
    self._in_flight.add(handler)
    task = asyncio.create_task(handler(tick))
    task.add_done_callback(lambda _: self._in_flight.discard(handler))
    try:
        await asyncio.wait_for(asyncio.shield(task), timeout)
    except asyncio.TimeoutError:                       # the wait stops; the task does not
        self._warn_rate_limited(handler, every=60.0)`,
      },
      {
        type: 'p',
        en: 'Timeouts received the same second pass (commit `e91a61c`). A naive `wait_for(task, timeout)` cancels the task on timeout — for a handler halfway through placing an order, the worst possible semantics. The engine awaits `wait_for(asyncio.shield(task), timeout)`: the scheduler stops waiting, while the task runs to completion in the background. Around the shield, the single-flight set skips the next fire while the previous run is alive, warnings are rate-limited to one per handler per 60 s, and shutdown drains the shielded leftovers.',
        zh: '超时语义经历了同样的二次打磨（提交 `e91a61c`）。朴素的 `wait_for(task, timeout)` 超时即取消任务 —— 对一个订单下到一半的 handler，这是最坏的语义。引擎 await 的是 `wait_for(asyncio.shield(task), timeout)`：调度器停止等待，任务本体在后台跑到完成。shield 周围，单飞集合在上一次执行仍在运行时跳过下一次触发，warning 限流为每 handler 每 60 秒一次，停机时显式排空 shield 的遗留任务。',
      },
    ],
  },

  /* ── 9 ── */
  {
    no: '9',
    id: 'evaluation',
    title: { en: 'Evaluation: Footprint and Evidence', zh: '评估：改动范围与证据' },
    blocks: [
      {
        type: 'p',
        en: 'The part worth examining is what did not change. `Trigger` already spoke `enter_barrier` / `exit_barrier`. Strategies only ever asked `tm.now()`. The backend\'s `_on_1m_tick` was already a plain one-minute subscriber, so CatchUp drives it without modification. About **110 lines** changed inside the kernel; **zero** lines changed in any consumer (Fig. 9a). That asymmetry is the argument for owning a time kernel at all.',
        zh: '值得审视的是没有变的部分。`Trigger` 本来就说 `enter_barrier` / `exit_barrier` 这门语言；策略从头到尾只问过 `tm.now()`；后端的 `_on_1m_tick` 本来就是普通的 1 分钟订阅者，CatchUp 无需修改即可驱动它。内核内改动约 **110 行**，所有消费者改动 **0 行**（图 9a）。这种不对称就是「为什么值得拥有一个时间内核」的全部论证。',
      },
      {
        type: 'figure',
        src: 'fig09',
        alt: { en: 'Lines changed per component and unit tests per property', zh: '各组件改动行数与各性质的单元测试数' },
        caption: {
          en: 'Change footprint and evidence. (a) Lines changed per component for the hybrid clock rewrite. (b) Unit tests per stated property: 18 in `test_time_manager_hybrid.py` (blue) and 13 in `test_time_manager_live_dispatch.py` (red).',
          zh: '改动范围与证据。(a) 混合时钟改造中各组件的改动行数。(b) 各性质的单元测试数：`test_time_manager_hybrid.py` 中 18 个（蓝）与 `test_time_manager_live_dispatch.py` 中 13 个（红）。',
        },
      },
      {
        type: 'p',
        en: 'Eighteen dedicated tests in `tests/test_time_manager_hybrid.py` pin every claim of §5–§6: `now()` advancing under a barrier, the end clamp, exit monotonicity, shared anchors, pause accounting across multiple cycles, grid-aligned dynamic registration, and coalescing keeping exactly the newest entry. Thirteen more in `tests/test_time_manager_live_dispatch.py` cover live dispatch: the loop not blocking on slow handlers, priority preserved inside a dispatched tick, single-flight and rate limits, and the mirror image — backtest still blocking exactly as it must. Table VI lists the constants that appear in the text; Table VII the risks considered and their mitigations.',
        zh: '`tests/test_time_manager_hybrid.py` 中的 18 个专属测试钉住 §5–§6 的每一条主张：barrier 下 `now()` 推进、终点钳制、退出单调性、共享锚点、跨多轮的暂停记账、动态注册的网格对齐、合并恰好保留最新。`tests/test_time_manager_live_dispatch.py` 中另有 13 个覆盖 live 派发：慢 handler 不阻塞主循环、派发的 tick 内 priority 保序、单飞与限流，以及镜像的一条 —— 回测必须依旧精确阻塞。表 VI 列出正文中出现的常量；表 VII 列出考虑过的风险及其缓解。',
      },
      {
        type: 'table',
        caption: { en: 'Constants referenced in this report', zh: '本报告涉及的常量' },
        headers: { en: ['Value', 'Meaning'], zh: ['数值', '含义'] },
        rows: {
          en: [
            ['~1 ms', 'Cooperative yield per virtual jump; a day of 1 m ticks ≈ 1,440 jumps ≈ 1.4 s'],
            ['0–5', 'Priority layers: sequential across layers, concurrent (gather) within a layer'],
            ['60 s', 'Timeout-warning rate limit per handler'],
            ['0.5 s / 0.1 s', 'Backtest start-up grace / live idle poll while the heap is empty'],
            ['1e12', 'Threshold that distinguishes millisecond from second Unix timestamps'],
            ['~110 / 0', 'Kernel lines changed / consumer lines changed'],
            ['18 + 13', 'Hybrid-clock tests + live-dispatch tests'],
          ],
          zh: [
            ['~1 ms', '每次虚拟跳跃的协作式让出；一天的 1 m tick ≈ 1440 次跳跃 ≈ 1.4 秒'],
            ['0–5', 'priority 层级：层间串行，层内 gather 并发'],
            ['60 s', '每 handler 的超时 warning 限流窗口'],
            ['0.5 s / 0.1 s', '回测启动宽限 / live 堆空时的空转轮询间隔'],
            ['1e12', '区分毫秒与秒 Unix 时间戳的阈值'],
            ['~110 / 0', '内核改动行数 / 消费者改动行数'],
            ['18 + 13', '混合时钟测试 + live 派发测试'],
          ],
        },
      },
      {
        type: 'table',
        caption: { en: 'Risks considered and their mitigations', zh: '考虑过的风险及其缓解' },
        headers: { en: ['Risk', 'Severity', 'Mitigation'], zh: ['风险', '严重度', '缓解'] },
        rows: {
          en: [
            ['CatchUp skips an important boundary', 'Medium', 'Only intermediate boundaries of the same interval are skipped; the executed one uses the latest price'],
            ['current moves backwards', 'High', 'exit_barrier settles with max(current, ·)'],
            ['Time exceeds the backtest end', 'Medium', 'now() and exit_barrier both clamp with min(·, end)'],
            ['Dynamic registration offsets the grid', 'High', '_last_schedule_time is written only with boundary times'],
            ['Pause counted as virtual time', 'Medium', 'Pause accounting subtracts the span inside now()'],
            ['Live mode affected', 'None', 'needs_barrier() = False; no new path activates'],
          ],
          zh: [
            ['CatchUp 跳过重要边界', '中', '只跳过同一 interval 的中间边界；执行的那次使用最新价格'],
            ['current 倒退', '高', 'exit_barrier 以 max(current, ·) 结算'],
            ['时间越过回测终点', '中', 'now() 与 exit_barrier 都以 min(·, end) 钳制'],
            ['动态注册偏移网格', '高', '_last_schedule_time 只以边界时间写入'],
            ['暂停被计入虚拟时间', '中', '暂停记账在 now() 内扣除该时段'],
            ['live 模式受影响', '无', 'needs_barrier() = False；没有新路径激活'],
          ],
        },
      },
    ],
  },

  /* ── 10 ── */
  {
    no: '10',
    id: 'conclusion',
    title: { en: 'Conclusion', zh: '结论' },
    blocks: [
      {
        type: 'p',
        en: 'A backtest engine used to answer one question: what would this rule have earned? For agents it must answer a harder one: what would this decision-maker have done, given honest time to think? The hybrid clock answers it without a second time system. Five disciplines summarise the design:',
        zh: '回测引擎过去回答一个问题：这条规则本可以赚多少？到了 agent 时代它必须回答一个更难的问题：给这个决策者以诚实的思考时间，它本会怎么做？混合时钟在不引入第二套时间系统的前提下回答了它。五条纪律概括了这一设计：',
      },
      {
        type: 'ol',
        en: [
          '**One clock.** A single time kernel, without exception.',
          '**Runtime gears.** New capability lives inside the backtest clock as state, never as a second time system.',
          '**Pause as a ledger entry.** Once time flows, pausing must be accounted, not assumed away.',
          '**Split the semantics.** Observed time and scheduling anchor are different quantities and now live in different fields.',
          '**Coalesce over replay.** Reconcile with the present instead of performing history that never happened.',
        ],
        zh: [
          '**一个时钟。**单一时间内核，没有例外。',
          '**运行时换挡。**新能力作为状态活在回测时钟内部，绝不另立第二套时间系统。',
          '**暂停入账。**时间一旦流动，暂停就必须被记账，而不是被假设掉。',
          '**语义拆分。**观察时间与调度锚点是两个量，如今住在两个字段里。',
          '**合并而非回放。**对着当下对账，而不是表演一段从未发生的历史。',
        ],
      },
      {
        type: 'table',
        caption: { en: 'A conventional backtest engine and the agent-era time engine', zh: '传统回测引擎与 agent 时代的时间引擎' },
        headers: { en: ['', 'Conventional backtest engine', 'Agent-era time engine'], zh: ['', '传统回测引擎', 'Agent 时代的时间引擎'] },
        rows: {
          en: [
            ['Decision cost model', 'Zero; strategies decide instantly', 'Real minutes; deliberation consumes wall-clock time'],
            ['Clock during a decision', 'Frozen', 'Flows at 1:1 behind a refcounted barrier, pause-adjusted'],
            ['Data seen mid-decision', 'Stale by construction', 'Fresh; now() advances'],
            ['Order timestamps', 'The tick that started the decision', 'The moment the decision lands'],
            ['Missed boundaries', 'Cannot exist', 'Coalesced; one reconciliation with the newest state'],
            ['Live-mode loop', 'Blocks on slow handlers', 'Fire-and-forget dispatch'],
            ['Cancellation', 'Flags', 'Revision check at the instant of invocation'],
          ],
          zh: [
            ['决策成本模型', '零；策略瞬时决策', '真实分钟；斟酌消耗物理时间'],
            ['决策期间的时钟', '冻结', '带引用计数的 barrier 后以 1:1 流动，扣除暂停'],
            ['决策中途的数据', '注定过期', '新鲜；now() 在推进'],
            ['订单时间戳', '开始决策的那个 tick', '决策真正落地的那一刻'],
            ['错过的边界', '不可能存在', '被合并；对最新状态一次对账'],
            ['live 主循环', '被慢 handler 阻塞', 'fire-and-forget 派发'],
            ['取消语义', '标志位', '调用瞬间的 revision 校验'],
          ],
        },
      },
      {
        type: 'p',
        en: 'The kernel absorbed the whole of this complexity so that no business-layer file needed to learn the words anchor, coalesce or revision. Depth belongs at the bottom of the stack; that is what keeps the top simple.',
        zh: '内核吸收了这里的全部复杂度，于是没有任何业务层文件需要认识 anchor、coalesce、revision 这些词。深度属于栈的底层；这正是上层得以简单的原因。',
      },
    ],
  },
];
