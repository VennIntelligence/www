import { useLanguage } from '../../../../context/useLanguage';
import Mermaid from '../../../../components/common/Mermaid';
import HybridStateDiagram from './components/HybridStateDiagram';
import * as charts from './charts';

function CodeBlock({ children, lang }) {
  return (
    <pre className={`language-${lang} p-4 rounded-xl bg-black/50 border border-white/10 overflow-x-auto my-6 text-sm`}>
      <code>{children}</code>
    </pre>
  );
}

function EnglishContent() {
  return (
    <>
      <h2 className="blog-h2">When Backtest Time Meets the Real World: The Dual-Mode Evolution of TimeManager</h2>
      
      <p className="blog-p">
        Many trading systems start their story with lines like this:
      </p>

      <CodeBlock lang="python">
{`while True:
    await do_something()
    await asyncio.sleep(60)`}
      </CodeBlock>

      <p className="blog-p">
        In our previous article, we used this as a starting point to explain how a quantitative trading system's "time kernel"—the <code>TimeManager</code>—was built from scratch. We discussed unifying the time source, discrete ticks, min-heap scheduling, and how backtesting and live trading philosophies were merged into a single set of interfaces.
      </p>
      
      <p className="blog-p">
        But we soon encountered an interesting problem: <strong>What happens when virtual backtest time encounters an operation that requires real waiting (like a 3-minute LLM call)?</strong>
      </p>

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">A "Perfect" Time Manager Meets an Imperfect Reality</h3>
      <p className="blog-p">
        Let's quickly recall the core architecture of TimeManager:
      </p>

      <Mermaid chart={charts.chart_core} />

      <p className="blog-p">
        In this design, <code>BacktestTimeSource</code> acts like an omnipotent fast-forward remote. It jumps instantly to the future, making backtesting extremely fast. However, in 2025, we introduced LLMs into our trading system. A single trigger driven by an LLM might take 3~5 minutes of real time for reasoning, calling APIs, and returning results.
      </p>

      <p className="blog-p">
        During these 3 minutes, what should happen to our virtual time? If it continues, the backtest results become non-deterministic. If it stops... well, we found our first issue.
      </p>

      <h3 className="blog-h3">Time Freezing: An Unexpected Space-Time Rift</h3>
      <p className="blog-p">
        In the old design, virtual time was completely frozen. Let's trace a full execution cycle:
      </p>

      <Mermaid chart={charts.chart_frozen} />

      <p className="blog-p">
        During those 3 minutes of LLM execution, <strong>nothing happens in the virtual world.</strong> 
        The market engine freezes. The LLM can't see the latest K-lines because the clock is stubbornly stuck at 10:01. Trading engines stall, delay events, and orders get timestamped incorrectly. It's like pressing pause on a DVD player—the entire universe stops.
      </p>

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">The First Idea: A Background "Pump"</h3>
      <p className="blog-p">
        Since the main loop is blocked, our first instinct was to open a background coroutine to continuously scan the schedule heap and execute overdue handlers while the barrier is active. This was our v1 "Pump" strategy.
      </p>

      <Mermaid chart={charts.chart_pump1} />

      <p className="blog-p">
        We wrote the design documents and started coding, but upon active review, we found three fatal flaws:
      </p>

      <ol className="list-decimal pl-6 text-gray-300 space-y-4 mb-6">
        <li><strong>Pump cannot fetch future ticks:</strong> The heap only stores the next schedule. After the main loop pops 10:01, 10:02 simply doesn't exist yet!</li>
        <li><strong>Dual execution contention:</strong> Two entities popping and pushing the same heap leads to massive race conditions that locks couldn't cleanly solve.</li>
        <li><strong>Semantic drift:</strong> Replaying multiple past minutes using the <em>current</em> market price makes no sense mathematically.</li>
      </ol>

      <Mermaid chart={charts.chart_pump2} />

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">Stepping Back: Coalesce-to-Latest</h3>
      <p className="blog-p">
        Instead of actively making the pump to execute during the barrier, we reasoned: Why not just let time flow naturally during the barrier, and <strong>passively catch up and coalesce</strong> to the latest state when the barrier ends?
      </p>

      <HybridStateDiagram lang="en" />

      <p className="blog-p">
        This entirely changed the paradigm. During the LLM execution (Realtime mode), <code>now()</code> advances naturally based on monotonic tracking, giving the LLM fresh data. When it finishes (CatchUp mode), the engine batches all overdue events and executes only the latest one.
      </p>

      <Mermaid chart={charts.chart_hybrid_seq} />

      <p className="blog-p">
        A comparison of the old vs. new design makes it crystal clear:
      </p>
      
      <Mermaid chart={charts.chart_compare} />

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">Phase 1: Bringing now() to Life</h3>
      <p className="blog-p">
        The elegant part of this setup is that the TimeSource tracks real time passing with <code>time.monotonic()</code> while perfectly anchoring against the frozen virtual anchor. All triggers share the same anchor, and if a user hits the PAUSE button, our <strong>Pause Accounting</strong> logic flawlessly suspends time measurements.
      </p>

      <h3 className="blog-h3">Phase 2: CatchUp and Last Schedule Alignments</h3>
      <p className="blog-p">
        When the CatchUp loop picks up the pieces, it doesn't replay linearly. Replaying 3 minutes with market data from the 3rd minute is contradictory. Instead, it aggregates. We separated <code>_current_time</code> into <code>_last_schedule_time</code> (grid-aligned) and dynamic <code>now()</code>, keeping boundaries crisp.
      </p>

      <h3 className="blog-h3">Conclusion: The Global Architecture</h3>
      
      <Mermaid chart={charts.chart_overall} />

      <p className="blog-p">
        <strong>The most intuitive solution is often the most dangerous.</strong> We successfully avoided an architectural mess by realizing what the business actually needed was state reconciliation (coalescing), not blind mechanical replay. This allowed us to absorb the entire complexity with less than 110 lines of code changed in our lowest-level kernel.
      </p>
    </>
  );
}

function ChineseContent() {
  return (
    <>
      <h2 className="blog-h2">当回测时间遇上真实世界，量化交易 TimeManager 的双模式进化</h2>
      
      <p className="blog-p">
        很多交易系统的故事，都是从这样几行代码开始的：
      </p>

      <CodeBlock lang="python">
{`while True:
    await do_something()
    await asyncio.sleep(60)`}
      </CodeBlock>

      <p className="blog-p">
        在上一篇文章里，我们用这几行代码作为起点，讲述了一个量化交易系统的"时间内核"——<code>TimeManager</code>——是如何从零开始长出来的。我们谈到了统一时间源、离散 Tick、最小堆调度、<code>SafeExecutor</code>、以及回测和实盘"两种时间哲学"如何被折叠进同一套接口。
      </p>
      
      <p className="blog-p">
        但我们很快发现了一个更有趣的问题：<strong>当回测中的虚拟时间碰上了需要真实等待的操作（比如一次持续 3 分钟的 LLM 调用），时间应该怎么办？</strong>
      </p>

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">"完美"的时间管理器，遇上了不完美的现实</h3>
      <p className="blog-p">
        先快速回忆一下 TimeManager 的核心架构：
      </p>

      <Mermaid chart={charts.chart_core} />

      <p className="blog-p">
        在这套设计里，<code>BacktestTimeSource</code> 像一个万能的快进遥控器，瞬间跳到未来。但是在 2025 年，我们在交易系统里引入了 LLM。一个由 LLM 驱动的 Trigger，执行一次链路可能需要 3~5 分钟真实时间。这 3 分钟是实打实流过去的时间。
      </p>

      <h3 className="blog-h3">时间冻结：一个我们没预料到的"时空裂缝"</h3>
      <p className="blog-p">
        在旧设计里，虚拟时间完全冻结了。让我们追踪一次完整的执行链路：
      </p>

      <Mermaid chart={charts.chart_frozen} />

      <p className="blog-p">
        这 3 分钟里，<strong>什么都没有发生。</strong>
        时间停滞，交易引擎停摆，新的 1m 任务被阻塞。这就像是一台 DVD 播放器：你可以快进，也可以正常播放，但当你按下暂停键的时候，整个宇宙都凝固了。
      </p>

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">第一个念头：在 barrier 期间开一个后台 "Pump"</h3>
      <p className="blog-p">
        既然主循环被堵死了，最直觉的想法是：在 barrier 生效期间，开一个后台协程来持续扫描调度堆，主动跑过期的 handler。
      </p>

      <Mermaid chart={charts.chart_pump1} />

      <p className="blog-p">
        但这其实是一个致命的误区，有三大缺陷：
      </p>
      
      <ol className="list-decimal pl-6 text-gray-300 space-y-4 mb-6">
        <li><strong>Pump 根本拿不到未来的 tick：</strong> 堆中每个 interval 只保留一个 schedule。由于阻塞，下一个 tick 根本没被推入堆中。</li>
        <li><strong>双执行体竞争：</strong> 和主循环竞争会导致极端的竞态问题。</li>
        <li><strong>时间语义分裂：</strong> 使用当前价格数据去逐分钟回放历史 Tick（比如在 10:04 的价格上去执行 10:02 的策略），只会产生矛盾。</li>
      </ol>

      <Mermaid chart={charts.chart_pump2} />

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">新设计：三态引擎——FastForward、Realtime、CatchUp</h3>
      <p className="blog-p">
        推翻 Pump 方案后，我们退回到问题的原点：LLM 所需要的，只是真实的实时时间数据反馈，以及在决策结束后做一次最新的市场状态"对账"。于是我们引入了 <strong>Coalesce-to-Latest（合并到最新）</strong> 机制。
      </p>

      <HybridStateDiagram lang="zh" />

      <p className="blog-p">
        三个状态各司其职。一旦 LLM 开始执行并进入 Barrier（Realtime 模式），主循环等待，但引擎提供实时累加的时间返回。当其结束时（CatchUp 模式），系统批量弹出积累的过期 ticks 去合并执行最晚状态。
      </p>

      <Mermaid chart={charts.chart_hybrid_seq} />

      <p className="blog-p">
        旧设计与新设计的对比一目了然：
      </p>

      <Mermaid chart={charts.chart_compare} />

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">Phase 1: 让 now() 活起来 & Phase 2: 优雅追赶</h3>
      <p className="blog-p">
        在第一阶段，我们通过锚定虚拟时间，引入 <code>time.monotonic()</code> 实现了平滑的真实时间流逝计算，再结合 Pause Accounting 精准剔除系统级暂停时间。第二阶段，我们分离出 <code>_last_schedule_time</code> 保障调度边缘完全不受单秒级时间戳的污染。
      </p>

      <h3 className="blog-h3">全局架构</h3>
      
      <Mermaid chart={charts.chart_overall} />

      <p className="blog-p">
        <strong>最直觉的方案往往最危险。</strong> 我们成功避免了在并发时钟里加入不受控的幽灵线程，以一种完美的生命周期托管，将 LLM 等重型推理模块安全地并入了我们的核心极速回测框架。核心层仅仅只动了不到 110 行代码，所有的上层消费者就得以自动受益。
      </p>
    </>
  );
}

export default function TimeManager2Article() {
  const { lang } = useLanguage();
  return lang === 'zh' ? <ChineseContent /> : <EnglishContent />;
}
