/**
 * five-backtest-traps 正文内容（中英双语）
 *
 * 文件位置: src/pages/blog/posts/five-backtest-traps/content.js
 *
 * 中文为原稿，英文为对照译文。渲染逻辑见同目录 index.jsx。
 *
 * 块类型：
 *   p       段落。可选 num（有序编号，用于"第一种"里的 1/2/3 条）
 *   figure  配图。src 对应 index.jsx 的 FIGURES 键；label 是原文图号（1a/3b/…）
 *   hr      分割线
 *
 * 行内标记：**加粗**、*斜体*、`等宽`
 */

/** 界面词（图注前缀） */
export const UI = {
  fig: { en: 'Figure', zh: '图' },
};

export const SECTIONS = [
  /* ── 引子（无标题） ── */
  {
    id: 'intro',
    title: null,
    blocks: [
      {
        type: 'p',
        zh: '人很难不回测自己的人生。',
        en: 'It is hard not to backtest your own life.',
      },
      {
        type: 'p',
        zh: '一段关系结束了，我们回头寻找当初选错人的迹象；一次机会错过了，我们反复推演如果当时做了另一个决定，今天会不会不同；一个人连续成功几年，便从自己的经历里总结出一套成功方法。我们把过去摊开，寻找变量、归纳规律、调整参数，然后期待下一次得到更好的结果。',
        en: 'A relationship ends and we look back for the signs that we picked the wrong person. An opportunity passes and we replay, over and over, whether a different decision back then would have made today different. Someone succeeds a few years running and distils a method for success out of their own history. We lay the past out flat, look for variables, induce rules, tune parameters — and then expect a better result next time.',
      },
      {
        type: 'p',
        zh: '所谓回测，就是拿已经发生的事，检验一种决策是否有效。它小到一笔交易，大到一次择业、一段关系、一种活法。',
        en: 'A backtest is simply this: taking what has already happened and using it to check whether a decision works. It scales from a single trade all the way up to a career, a relationship, a way of living.',
      },
      {
        type: 'p',
        zh: '一条冲破天际、马上可以买下地球的资金曲线，每个量化人都为它白白激动过。生活中也有同样的曲线，时间轴更长：房价可以上涨二十年，学历溢价可以维持一代人，一个行业的红利可以覆盖半段职业生涯。它们的周期长到超过个人的观察窗口，我们就看不出那是波动，只会把它当成规律。',
        en: 'Every quant has been thrilled, for nothing, by an equity curve that punches through the ceiling and looks ready to buy the planet. Life has the same curves, just on a longer axis: housing can rise for twenty years, an education premium can hold for a generation, an industry’s tailwind can cover half a career. Their cycles run longer than one person’s observation window, so we cannot see them as fluctuation — we read them as law.',
      },
      {
        type: 'p',
        zh: '我们从实际生产的回测研究里总结出五种常见的回测错误。前两种产生于研究流程内部：回测没有忠实复现过去，或者反复选择让研究拟合了过去。第三种是统计的边界：关系即使真实，数据也可能分不清实力和运气。第四种是时间与衰减：问题仍然相同，参数却在不断过期。第五种更深：产生数据的机制已经改变，而你还在用旧模型回答一个不再相同的问题。',
        en: 'From production backtest research we have distilled five common backtest errors. The first two arise inside the research process itself: the backtest did not faithfully reproduce the past, or repeated selection fitted the research to the past. The third is the boundary of statistics: even when a relationship is real, the data may not be able to separate skill from luck. The fourth is time and decay: the question is still the same, but the parameters keep expiring. The fifth runs deeper: the mechanism generating the data has changed, and you are still using the old model to answer a question that is no longer the same.',
      },
    ],
  },

  /* ── 第一种 ── */
  {
    id: 'trap-1',
    title: {
      zh: '第一种：它连过去都没算对',
      en: 'Trap One: It Didn’t Even Get the Past Right',
    },
    blocks: [
      {
        type: 'p',
        zh: '最浅的一层，也是最常见的一层，经典错误有：',
        en: 'The shallowest layer, and the most common one. The classic mistakes:',
      },
      {
        type: 'p',
        num: 1,
        zh: '**偷看答案。** 教科书里的数据泄露，是用收盘后才知道的数据做开盘时的决定。假设策略在 10:17 同时读取 1 分钟和 1 小时 K 线：此时，结束时间不晚于 10:17 的 1 分钟线已经是事实；但标记为 10:00 的 1 小时线要到 11:00 才完成。如果历史库用开盘时间给 K 线编号，代码再按 `open_time` 向后对齐，10:00—11:00 这根线最终的 close、high、low 和 volume 就会在 10:17 被整根塞进特征。那根 1 小时 close 不是"更粗粒度的当前价格"，而是随后 43 分钟的结局。',
        en: '**Peeking at the answer.** The textbook form of data leakage is making an open-time decision with data you only know after the close. Suppose a strategy reads 1-minute and 1-hour candles at 10:17. At that moment every 1-minute bar that closed no later than 10:17 is a fact; but the 1-hour bar stamped 10:00 does not complete until 11:00. If the historical store indexes bars by open time and the code then joins backward on `open_time`, the final close, high, low and volume of the 10:00—11:00 bar get shoved wholesale into the feature vector at 10:17. That hourly close is not “the current price at a coarser granularity” — it is the outcome of the next 43 minutes.',
      },
      {
        type: 'figure',
        src: 'fig01a',
        label: '1a',
        alt: {
          zh: '信息时间线：10:17 做决定时哪些数据真实存在。',
          en: 'Information timeline: which data actually exists at the moment of the 10:17 decision.',
        },
        caption: {
          zh: '真实数据——LABUSDT 2026-07-07 09:00—11:00（1 分钟 K 线）。10:17 做决定时，真实存在的只有已闭合的 1 分钟线、红色的 09:00—10:00 完整下跌小时线，和用闭合 1 分钟线聚合出的 partial（蓝框：当时还在涨，报 12.70）；浅绿色的 10:00—11:00 完整小时线及灰色 1 分钟线尚未发生。这根 10:00 开盘的小时线最终收在 10.78、高点 14.09——按 `open_time` 对齐，等于把一场 10:17 之后才发生的拉高砸盘整根泄漏进决策。',
          en: 'Real data — LABUSDT, 2026-07-07 09:00—11:00 (1-minute candles). At the 10:17 decision the only things that actually exist are the closed 1-minute bars, the red completed 09:00—10:00 hourly bar (down), and the partial hour aggregated from closed 1-minute bars (blue box: still rising at that moment, printing 12.70). The pale green completed 10:00—11:00 hourly bar and the grey 1-minute bars have not happened yet. That 10:00 hourly bar eventually closes at 10.78 with a high of 14.09 — joining on `open_time` leaks an entire pump-and-dump that only occurs after 10:17 straight into the decision.',
        },
      },
      {
        type: 'p',
        zh: '更容易忽视的是训练流程里的同一种错误：拿全部历史月份训练一个模型，也就是未来函数，再回头逐月"评估"。评估早期月份时，模型参数已经吸收了后面所有月份的信息。归一化系数用全窗计算、分位数边界拿全样本确定、标签分桶混入事后信息，也都属于这一类。',
        en: 'Easier to miss is the same error inside the training pipeline: train one model on every historical month — a look-ahead function — then go back and “evaluate” it month by month. When you evaluate an early month, the model parameters have already absorbed information from every later month. Normalisation coefficients computed over the full window, quantile boundaries fixed on the full sample, label buckets that mix in after-the-fact information — all belong to the same family.',
      },
      {
        type: 'p',
        num: 2,
        zh: '**把过去的 low 当成还能成交。** 跳价穿过挂单只是成交错误的一个特例，更普遍的问题是事件顺序。1 分钟 K 线把连续路径压成 open、high、low、close，却抹掉了这些价格在分钟内何时发生。假设 10:00—10:01 的 low 出现在 10:00:12；策略等到 10:01 收盘才看见这根线，并据此挂出一个限价单。若引擎随后用同一根线检查 `low <= limit <= high`，它会让刚出生的订单回到 48 秒前成交。价格确实到过，订单当时却根本不存在；下一分钟也许再没有回到那个 level。',
        en: '**Treating a past low as still fillable.** A gap through a resting order is only one special case of a fill error; the more general problem is event ordering. A 1-minute candle compresses a continuous path into open, high, low and close, and erases when inside the minute those prices occurred. Suppose the low of 10:00—10:01 happened at 10:00:12. The strategy only sees that bar when it closes at 10:01, and places a limit order on the back of it. If the engine then checks `low <= limit <= high` on that same bar, it fills a newborn order 48 seconds in the past. The price did trade there; the order simply did not exist at the time — and the next minute may never return to that level.',
      },
      {
        type: 'figure',
        src: 'fig01c',
        label: '1c',
        alt: {
          zh: '真实闪崩里的两个订单：出生前不可成交的买单，与成交价是一场赛跑的止损单。',
          en: 'Two orders inside a real flash crash: a buy that cannot fill before it exists, and a stop whose fill price is a race.',
        },
        caption: {
          zh: '真实数据——LABUSDT，2026-07-07 17:31—17:35 UTC（Binance 逐笔 aggTrades + 1 分钟 K 线），一场几分钟内 −45% 又 V 型收回的闪崩。左：锤子线收盘后才诞生的 2.90 买单，被"同 bar 检查"（low 2.879 ≤ 2.90）记成在 34 秒前成交；诚实回放里，订单存续期的最低价是 3.058，它永远不会成交。右：挂在 4.20 的止损，回测记作按 4.20 离场；tape 显示触发 10 秒后市场在 3.807（−9.4%），若引擎要等下一根 K 线开盘才反应，是 3.713（−11.6%），42 秒后 tape 摸到 2.879（−31.5%）。',
          en: 'Real data — LABUSDT, 2026-07-07 17:31—17:35 UTC (Binance tick-level aggTrades plus 1-minute candles): a flash crash of −45% and a V-shaped recovery inside a few minutes. Left: a 2.90 buy order born only after the hammer closes is booked by the same-bar check (low 2.879 ≤ 2.90) as filled 34 seconds earlier; in an honest replay the lowest price during the order’s lifetime is 3.058, and it never fills at all. Right: a stop resting at 4.20 is recorded by the backtest as an exit at 4.20; the tape shows the market at 3.807 (−9.4%) ten seconds after the trigger, at 3.713 (−11.6%) if the engine only reacts at the next bar’s open, and touching 2.879 (−31.5%) 42 seconds later.',
        },
      },
      {
        type: 'p',
        zh: '所以悲观成交首先不是"给穿价多扣一点滑点"，而是守住连续时间里的因果顺序：订单从激活时刻起，只有之后的 tick 或 K 线才有资格使它成交。只有 1 分钟数据时，同 bar 内无法证明先有信号还是先触价，就应延迟到下一根再判断，或者记为不可判定／不成交；在此之后，才轮到队列、深度、滑点和 gap 后第一笔可成交价。一个价格即使更差，只要来自订单出生前，就不叫悲观，叫时光倒流。',
        en: 'So pessimistic fills are not, first of all, about “docking a bit more slippage on gaps”. They are about preserving causal order in continuous time: from the moment an order is active, only later ticks or bars are entitled to fill it. When you only have 1-minute data you cannot prove within a bar whether the signal or the touch came first, so the judgement should be deferred to the next bar, or recorded as undecidable / unfilled. Only after that do queue position, depth, slippage and the first tradable price after a gap matter. A price can be worse and still not be conservative: if it comes from before the order was born, that is not pessimism, it is time travel.',
      },
      {
        type: 'p',
        num: 3,
        zh: '**指标把未来画进了历史。** 前两条泄漏藏在数据对齐和成交引擎里，还有一类藏得更深：藏在"指标"和"标签"的定义本身。ZigZag 一类的摆动指标，要等价格从低点反向走出 12% 才承认一个底；确认之后，它把枢轴画回最低点所在的那根 K 线。回测每次重算历史，看到的永远是确认后的版本：每个顶和底都精确落在极值上。当时盯盘的你看到的是另一样东西——那个"底"要等价格已经反弹近 20% 之后才出生，而单边下跌里的"顶"，甚至可以在五个多小时之后才被追认。',
        en: '**Indicators that draw the future into the past.** The first two leaks hide in data alignment and in the fill engine; a third kind hides deeper still — in the definition of the “indicator” and the “label” themselves. A swing indicator like ZigZag will not confirm a bottom until price has reversed 12% off the low; once confirmed, it draws the pivot back onto the bar that held the lowest price. Every time the backtest recomputes history it sees the confirmed version: every top and bottom sits exactly on an extreme. What you saw watching the screen at the time was something else — that “bottom” is not born until price has already bounced nearly 20%, and in a one-way sell-off a “top” can be awarded retroactively more than five hours later.',
      },
      {
        type: 'figure',
        src: 'fig01d',
        label: '1d',
        alt: {
          zh: '同一个指标的两个版本：回测重算出的历史，与你当时能看到的历史。',
          en: 'Two versions of the same indicator: the history the backtest recomputes, and the history you could actually see.',
        },
        caption: {
          zh: '真实数据——LABUSDT 2026-07-07 全天（1 分钟收盘价，ZigZag 12%）。上：今天重算的指标，13 个枢轴全部精确落在极值上，"买入"正好标在当日最低收盘价 3.418 上；下方色带是它顺手为机器学习生成的多空标签——每一段的颜色由这段的终点决定，而终点在未来。下：把每个枢轴改画在它第一次可知的时刻（实心点）：02:45 的顶要到 08:05 才被追认，滞后 5 小时 20 分，价格已经跌了 14.2%；17:32 的"精确底部"要等反弹 19.7% 之后才出生。13 个枢轴的确认滞后中位数 27 分钟，每个信号可知时都比它标注的位置差 12%—20%。回测里的完美抄底，在任何一个"当时"都不存在。',
          en: 'Real data — LABUSDT, full day 2026-07-07 (1-minute closes, ZigZag 12%). Top: the indicator as recomputed today — all 13 pivots land exactly on extremes, and “buy” is marked precisely on the day’s lowest close, 3.418; the colour band below is the long/short label it obligingly generates for machine learning — each segment’s colour is decided by that segment’s endpoint, and the endpoint lies in the future. Bottom: the same pivots redrawn at the moment each first became knowable (solid dots). The 02:45 top is not recognised until 08:05 — a lag of 5 hours 20 minutes, by which point price has already fallen 14.2%; the “exact bottom” at 17:32 is not born until after a 19.7% bounce. Median confirmation lag across the 13 pivots is 27 minutes, and every signal, at the moment it becomes knowable, is 12%—20% worse than the point it marks. The perfect bottom-buy in the backtest existed at no actual moment in time.',
        },
      },
      {
        type: 'p',
        zh: '凡是"确认滞后 + 回画"的定义都是同一族：centered moving average 的每个点都用了两侧的数据；双向滤波把未来滤进整条曲线；用事后确认的顶底给机器学习打标签，等于把结局直接写进训练目标。这类错误逐行审计查不出来——代码每一行都是因果的，偷看发生在定义里，回测和实盘跑的根本不是同一个信号。实盘圈给它起了专名叫 repainting，它养活了一整个卖付费指标的行当：演示图上每个买点都踩在底部，因为"底部"这个词本身就是未来定义的。',
        en: 'Every “confirmation lag plus repaint” definition belongs to the same family: each point of a centred moving average uses data from both sides; a bidirectional filter smears the future through the whole curve; labelling machine-learning targets with after-the-fact tops and bottoms writes the outcome directly into the training objective. Line-by-line audits cannot catch this class of error — every line of code is causal, the peeking happens in the definition, and the backtest and the live system are simply not running the same signal. Traders have a name for it: repainting. It supports an entire industry selling paid indicators, because in the demo chart every buy signal sits on a bottom — the word “bottom” is itself defined by the future.',
      },
      { type: 'hr' },
      {
        type: 'p',
        zh: '人生里的错误也一样。记忆不是录像，而是一份不断被重写的账本。结局会倒过来美化过程，最痛和最爽的片段会挤掉其余经历，今天的你还会替当年的自己补上从未有过的条件。我们常说"XXX 就好了"，却很少先问：我正在复盘的那段过去，真的存在吗？',
        en: 'Life makes the same mistake. Memory is not a recording; it is a ledger under constant revision. The ending retroactively flatters the process, the most painful and the most euphoric fragments crowd out everything else, and today’s you quietly supplies your former self with conditions it never had. We say “if only I had…” all the time, and rarely ask first: does the past I am reviewing actually exist?',
      },
    ],
  },

  /* ── 第二种 ── */
  {
    id: 'trap-2',
    title: {
      zh: '第二种：它从过去里挑出了想要的答案',
      en: 'Trap Two: It Picked the Answer It Wanted Out of the Past',
    },
    blocks: [
      {
        type: 'p',
        zh: '假设数据、时钟、成交、指标全部正确。第二层才是真正开始：**历史是真的，规律却是你侥幸挑出来的。**',
        en: 'Assume the data, the clock, the fills and the indicators are all correct. Only then does the second layer begin: **the history is real, but the pattern is one you were lucky enough to pick out of it.**',
      },
      {
        type: 'p',
        zh: '过拟合通常被说成"参数太多"，但更常见的是：过拟合的不是策略，是研究者。',
        en: 'Overfitting is usually described as “too many parameters”, but the more common case is this: what overfits is not the strategy, it is the researcher.',
      },
      {
        type: 'p',
        zh: '标准流程是这样的：你在一段历史上开发策略，效果很好；为了严谨，再拿一段没有碰过的数据验证。结果差一点，于是回去"修一个小问题"，再验证一次；还是差一点，再修一次。每看一眼结果再改一次，验证集的信息就漏进策略一分。',
        en: 'The standard workflow goes like this. You develop a strategy on one stretch of history and it works well. To be rigorous you validate it on a stretch you have never touched. It comes out slightly worse, so you go back and “fix one small thing”, then validate again. Still slightly worse, so you fix it again. Every time you look at the result and then change something, a little more of the validation set leaks into the strategy.',
      },
      {
        type: 'p',
        zh: '十轮以后，策略已经是训练集的一部分，而你觉得自己全程都在做样本外检验。',
        en: 'Ten rounds later the strategy is part of the training set, and you feel you have been running out-of-sample tests the whole time.',
      },
      {
        type: 'p',
        zh: '这就是 backtest on backtest：单次回测看似在检验策略，整个迭代过程却在用回测结果训练研究者。每一次修改都吸收了一点历史答案，最后过拟合的是整条研究路径。',
        en: 'This is backtest on backtest: a single run appears to be testing the strategy, while the whole iterative process is using backtest results to train the researcher. Each edit absorbs a little of history’s answer key, and what ends up overfitted is the entire research path.',
      },
      {
        type: 'p',
        zh: '一周试 16 种设计，每一种单独都用 95% 置信作为门槛，看起来很严格；把 16 次尝试放在一起，纯噪声撞线的机会已经大幅增加。零假设下若各次检验彼此独立，至少一次误过线的概率不是 5%，而是 1−(1−0.05)¹⁶ = 56%；试到 64 种时，这个概率达到 96%。',
        en: 'Try 16 designs in a week, each individually held to a 95% confidence threshold, and it looks strict. Put the 16 attempts together and the chance of pure noise crossing the line has risen sharply. Under the null, if the tests are mutually independent, the probability that at least one crosses falsely is not 5% but 1 − (1 − 0.05)¹⁶ = 56%; by 64 attempts it reaches 96%.',
      },
      {
        type: 'p',
        zh: '真实的研究很少由一组彼此独立的尝试组成。止损从 40 调到 45，窗口从 20 天改到 30 天，通常只是同一个想法的相邻版本，它们产生的结果往往一起好、一起坏。因此，名义上试了多少种设计，不等于获得了多少次独立的撞线机会。16 个高度相似的变体，带来的挑选空间可能远小于 16 个互不相干的想法；只看尝试次数，会高估前者带来的额外机会。',
        en: 'Real research is rarely composed of mutually independent attempts. Moving a stop from 40 to 45, a window from 20 days to 30, usually just produces neighbouring versions of the same idea, and their results tend to be good together and bad together. So the number of designs you nominally tried is not the number of independent chances you bought. Sixteen highly similar variants may open a far smaller selection space than sixteen unrelated ideas; counting attempts alone overstates the extra opportunity the former creates.',
      },
      {
        type: 'p',
        zh: '这也并不意味着反复尝试没有代价。偏差产生在另一个地方：你从许多结果中选出冠军，却仍把它当成一个事先指定、只检验过一次的方案。Bonferroni 校正能在不知道相关结构时给出一个稳妥的上界：64 次检验中，若要把整体误报率控制在 5%，每一项的双侧门槛要从 |z| > 1.96 提高到 |z| > 3.36；在效应大小不变、目标功效为 80% 的简化假设下，这大约需要单次检验 2.25 倍的样本。',
        en: 'That does not mean repeated attempts are free. The bias arises somewhere else: you pick the champion out of many results and still treat it as a single pre-specified design tested once. When the correlation structure is unknown, a Bonferroni correction gives a safe upper bound: across 64 tests, holding the family-wise error rate at 5% raises the two-sided threshold on each from |z| > 1.96 to |z| > 3.36; under the simplifying assumption of a fixed effect size and 80% target power, that requires roughly 2.25 times the sample of a single test.',
      },
      {
        type: 'figure',
        src: 'fig03',
        label: '3',
        alt: {
          zh: '独立尝试会推高纯噪声中的最佳结果；相同尝试次数下，相关结构决定真正的挑选空间。',
          en: 'Independent attempts raise the best result obtainable from pure noise; at the same attempt count, correlation structure decides the real selection space.',
        },
        caption: {
          zh: '上，曲线是纯噪声中最佳 |z| 的分布；若各次检验彼此独立，始终沿用单次检验的 1.96σ 门槛，族假阳性概率会从 1 次时的 5% 升到 16 次时的 56%、64 次时的 96%。蓝色短线是把整体误报率维持在 5% 的 Bonferroni 稳妥门槛；试 64 种设计时需提高到 3.36σ，在固定效应与 80% 功效假设下约需 2.25 倍样本。下，为了看清相关性的作用，把同样 16 次尝试简化成三种结构：一个结果复制 16 份、四个独立家族各复制 4 份，以及十六个独立结果。噪声撞线机会分别是 5%、19% 和 56%；真实研究通常落在这些结构之间。',
          en: 'Top: the curves are the distribution of the best |z| under pure noise. If the tests are independent and you keep applying the single-test 1.96σ threshold, the family-wise false-positive rate climbs from 5% at one test to 56% at 16 and 96% at 64. The short blue marks are the safe Bonferroni threshold that holds the family-wise error rate at 5%; at 64 designs it rises to 3.36σ, requiring about 2.25 times the sample under fixed-effect and 80%-power assumptions. Bottom: to make the role of correlation visible, the same 16 attempts are simplified into three structures — one result copied 16 times, four independent families of 4 copies each, and sixteen independent results. The chances of noise crossing the line are 5%, 19% and 56% respectively; real research usually sits somewhere between these structures.',
        },
      },
      {
        type: 'p',
        zh: '对付这种挑选有一件标准方法，叫安慰剂检验：判断一种药有没有效，不是看服药的人好没好，而是和吃糖片的对照组比。回测里的糖片是这样做的：把数据里的"答案"故意毁掉——交易标签随机打乱、日期重新洗牌——再用同一条流水线原样跑一遍。打乱后的数据里已经不可能有真信号，跑出来的成绩全是噪声挣的；重复一千次，就得到一张"纯噪声能考多少分"的分布。真实结果必须明显超出这张分布，才有资格说自己不只是运气。',
        en: 'There is a standard tool against this kind of selection: the placebo test. To judge whether a drug works you do not look at whether the people who took it got better; you compare them against a control group on sugar pills. The sugar pill in a backtest is built like this: deliberately destroy the “answer” in the data — shuffle the trade labels at random, reshuffle the dates — then run the identical pipeline over it unchanged. Shuffled data cannot contain a real signal, so whatever score comes out was earned entirely by noise. Repeat it a thousand times and you have a distribution of how well pure noise can score. The real result must clearly exceed that distribution before it is entitled to claim it is more than luck.',
      },
      {
        type: 'p',
        zh: '但安慰剂也不是免死金牌。真实结果如果连随机分布都赢不了，当然没有继续讨论的必要；但赢了，只说明它不像这一个零假设下的随机结果。我们曾拿一个日级变量在"同一天内部"打乱。这个变量在一天内本来就是常数，因此两百次置换全部原样复现实测值。',
        en: 'But a placebo test is not a get-out-of-jail card. If a real result cannot even beat the random distribution there is obviously nothing more to discuss; but beating it only shows the result is unlike random draws under that one null hypothesis. We once shuffled a daily variable *within* each day. That variable is constant within a day, so all two hundred permutations reproduced the observed value exactly.',
      },
      {
        type: 'figure',
        src: 'fig03b',
        label: '3b',
        alt: {
          zh: '安慰剂检验的三种结局：噪声、入场券、失效的糖片。',
          en: 'Three outcomes of a placebo test: noise, a ticket to the next round, and a sugar pill that did nothing.',
        },
        caption: {
          zh: '合成演示。同一条流水线在打乱后的数据上重跑，灰色是纯噪声的成绩分布，竖线是真实结果。左：真实结果落在噪声分布之内，1000 次打乱里有 403 次考得更好——这个结果不值得再讨论。中：真实结果超出全部 1000 次打乱——它至少不是这种随机能解释的，拿到入场券。右：一次失效的安慰剂——日级变量在"同一天内部"打乱，变量在天内本是常数，200 次置换全部原样复现实测值，零分布塌缩成与实测值重合的一根尖峰；p 值无从谈起，检验等于没做。',
          en: 'Synthetic illustration. The same pipeline is rerun on shuffled data; grey is the score distribution of pure noise, the vertical line is the real result. Left: the real result falls inside the noise distribution — 403 of 1,000 shuffles scored better. There is nothing left to discuss. Centre: the real result exceeds all 1,000 shuffles — at minimum it is not explained by this kind of randomness, so it earns a ticket to the next round. Right: a placebo that failed — a daily variable shuffled within each day. The variable is constant within a day, so all 200 permutations reproduce the observed value exactly and the null distribution collapses into a single spike sitting on the observation; there is no p-value to speak of, and the test was never performed.',
        },
      },
      {
        type: 'p',
        zh: '还有一个更隐蔽的坑：检验错了对象。',
        en: 'There is a subtler pit still: testing the wrong object.',
      },
      {
        type: 'p',
        zh: '你最后拿出手的策略，通常是从几十个候选里挑出来的最好的那个；而做安慰剂检验时，很容易只把这一个冠军拿去和噪声比。结果冠军经过了挑选，噪声却只被允许跑一次。正确的做法是让噪声也享受同样的挑选权：每打乱一次数据，就把当初的搜索和筛选完整重跑一遍，记下这一轮里全体候选的最好成绩。重复一千次，得到的才是"噪声加上挑选，最多能考出多少分"的分布；你的冠军要赢的是这张分布，而不是单次噪声。',
        en: 'The strategy you finally present is usually the best of dozens of candidates; when you run the placebo test it is very easy to pit only that champion against the noise. The champion has been through selection; the noise is allowed exactly one run. The correct procedure is to grant the noise the same right of selection: for every shuffle of the data, rerun the entire original search and screening, and record the best score among all candidates in that round. Repeat a thousand times and you have the distribution of how high noise *plus selection* can score. That is the distribution your champion has to beat, not a single noise run.',
      },
      {
        type: 'p',
        zh: '这样做还顺便解决了尝试之间的相关性问题。十六个只差一点参数的相邻版本，往往一起好一起坏，噪声在它们中间挑来挑去，占不到多少额外便宜；十六个互不相干的想法，撞出一个假冠军的机会就大得多。',
        en: 'This also disposes of the correlation problem for free. Sixteen neighbouring versions that differ by a parameter tick tend to be good together and bad together, so noise gains little extra by shopping among them; sixteen unrelated ideas give a false champion far more room.',
      },
      {
        type: 'p',
        zh: '如果候选根本不是一开始就摆好的，而是你看一轮结果、改一版设计，一步步试出来的，那么只重跑最后留下的参数表，仍然低估了挑选的力量。最诚实的检验，是把"看结果—修改—再试"这条路径本身也尽量重放一遍。',
        en: 'And if the candidates were not laid out in advance at all — if you got there by looking at one round of results, revising the design and stepping forward — then rerunning only the surviving parameter table still understates the power of selection. The most honest test replays the “look at results, revise, retry” path itself as faithfully as you can.',
      },
      {
        type: 'p',
        zh: '"噪声最多能长多高"这个问题，落在参数网格上看得最直观。我们曾把止损、计时器和持有上限全部摊开逐格测试。唯一能和噪声区分开的，是把持有上限从 96 小时拉到 168 小时这种粗变化；其余让曲线明显更漂亮的精调，全部落在噪声内。',
        en: 'The question of how tall noise can grow is most visible on a parameter grid. We once laid stop-loss, timer and maximum holding period out and tested every cell. The only thing that could be told apart from noise was a coarse change: pushing the holding cap from 96 hours to 168. Every fine adjustment that made the curve visibly prettier fell inside the noise.',
      },
      {
        type: 'figure',
        src: 'fig04',
        label: '4',
        alt: {
          zh: '参数网格里的孤峰与平台。',
          en: 'A lone peak and a plateau on the parameter grid.',
        },
        caption: {
          zh: '第一段历史里的全网格冠军，是噪声堆出的孤峰；换一段历史，它跌到全网格倒数 4%。真正可能稳定的是平台，不是山峰。',
          en: 'The full-grid champion on the first stretch of history is a lone peak stacked up by noise; on a different stretch it falls to the bottom 4% of the grid. What may actually be stable is the plateau, not the summit.',
        },
      },
      {
        type: 'p',
        zh: '孤峰最吸引人，因为它能做出最漂亮的展示图；平台最无聊，因为附近参数怎么改都差不多。但后者才可能踩在粗糙而真实的结构上。**选参数要选平原，不要选山峰。**',
        en: 'Lone peaks are the most seductive, because they make the prettiest presentation chart; plateaus are the most boring, because nearby parameters all behave about the same. But it is the latter that may be standing on a crude, real structure. **Choose the plain, not the peak.**',
      },
    ],
  },

  /* ── 第三种 ── */
  {
    id: 'trap-3',
    title: {
      zh: '第三种：它分不清实力和运气',
      en: 'Trap Three: It Can’t Tell Skill From Luck',
    },
    blocks: [
      {
        type: 'p',
        zh: '前两种错误都产生于研究流程内部：事实没有被正确复现，或者选择过程污染了结论。第三种又更难一步，哪怕每一步都做对，这批数据提供的信息就这么多。',
        en: 'The first two errors arise inside the research process: the facts were not reproduced correctly, or the selection process contaminated the conclusion. The third is one step harder — even if every step is done right, this batch of data only carries so much information.',
      },
      {
        type: 'p',
        zh: '我们对内部代号 Meme Long 的肥尾策略做过一次解剖。样本外共有 1303 笔交易，全部利润却由 50 笔巨赚的交易支撑。收益最高的前 5%，也就是 65 笔，贡献了总利润的 154.5%；其余 95% 的交易合计亏损 32.1 万 bp。',
        en: 'We once dissected a fat-tailed strategy known internally as Meme Long. Out of sample it made 1,303 trades, and the entire profit was carried by 50 huge winners. The top 5% by return — 65 trades — contributed 154.5% of total profit; the other 95% lost 321k bp in aggregate.',
      },
      {
        type: 'p',
        zh: '我们又换了几种方法去挑"更好的交易"：按盈亏加权、直接拟合上尾，让策略树最大化账本。为了判断这些改进是否只靠少数幸运日，我们把观察到的 320 个交易日当成一副牌，每次有放回地抽出 320 天，组成一段同样长的替代历史，再计算新方法相对原方法的差异。重复一千次后，四种设计的 99% 区间全部跨过零。最好看的设计点估计增加了 20.4 万 bp，区间却从约 −5.0 万延伸到 +65.6 万；70.6 万 bp 的跨度，比整本样本外利润 59.0 万 bp 还宽。',
        en: 'We then tried several ways to select “better trades”: weighting by P&L, fitting the upper tail directly, letting a policy tree maximise the ledger. To judge whether these improvements rested on a handful of lucky days, we treated the 320 observed trading days as a deck, drew 320 days with replacement each time to assemble an alternative history of the same length, and computed the difference between each new method and the original. After a thousand repetitions the 99% intervals of all four designs straddled zero. The best-looking design had a point estimate of +204k bp, but an interval running from about −50k to +656k; that 706k bp span is wider than the entire out-of-sample profit of 590k bp.',
      },
      {
        type: 'figure',
        src: 'fig05',
        label: '5',
        alt: {
          zh: '肥尾账本与方差墙。',
          en: 'The fat-tailed ledger and the variance wall.',
        },
        caption: {
          zh: '左，同一笔钱的来源与去向：收益前 5% 的 65 笔交易赚到 +91.1 万 bp（总利润的 154.5%）；这笔钱里有 32.1 万被其余 1238 笔交易亏掉，整本样本外账本最后只留下 59.0 万 bp——两根柱子等高，因为那是同一锅钱。右，四种重新设计相对原方法的增量：圆点是实测值，色条是按交易日聚类重抽一千次的 CI99，四条全部跨零；最下方的灰条按同一比例画出整本账本的 59.0 万 bp——单个设计的不确定跨度 70.6 万 bp，比这套策略赚过的全部钱还宽。这批数据分不清任何一种设计究竟是在改善账本，还是在伤害账本。',
          en: 'Left: where the same pot of money came from and went. The top 5% — 65 trades — earned +911k bp (154.5% of total profit); 321k of that was given back by the other 1,238 trades, leaving 590k bp in the out-of-sample ledger. The two bars are the same height because it is the same pot. Right: the increment of four redesigns over the original. Dots are measured values, coloured bars are CI99 from a thousand resamples clustered by trading day; all four straddle zero. The grey bar at the bottom draws the whole ledger’s 590k bp on the same scale — a single design’s uncertainty span of 706k bp is wider than every dollar this strategy ever made. This data cannot tell whether any of these designs is improving the ledger or damaging it.',
        },
      },
      {
        type: 'p',
        zh: '1303 笔交易听起来已经不少；但对"能不能挑出更好的交易"这个问题，真正提供信息的是那 50 次尾部事件。有效样本量因此更接近 50，而不是 1303：同一个设计在这段历史里看似改进，换一种同样可能的交易日组合，也可能变成伤害。我们把它叫作**方差墙**。四种设计全部没能越过这堵墙。这不能证明宇宙里没有信息；它只能证明，在这套特征和这点尾部样本下，我们没有能力把信息提取出来。',
        en: '1,303 trades sounds like plenty; but for the question of whether better trades can be selected, the only informative events are those 50 tail hits. The effective sample size is therefore closer to 50 than to 1,303: a design that appears to improve things over this stretch of history may turn into damage under an equally plausible combination of trading days. We call this the **variance wall**. None of the four designs cleared it. That does not prove there is no information in the universe; it only proves that with these features and this little tail sample, we lacked the ability to extract it.',
      },
      {
        type: 'p',
        zh: '这里最容易误读的一句话，是"置信区间跨零"。',
        en: 'The sentence most easily misread here is “the confidence interval straddles zero”.',
      },
      {
        type: 'p',
        zh: '跨零不等于效应为零。它准确的意思是：**在这个指标、这个样本单位和这批数据下，我们分不清它与零。** 分不清可能有三种原因：效应真的不存在；效应存在，但独立样本太少；效应曾经存在，现在已经变了。',
        en: 'Straddling zero does not mean the effect is zero. It means precisely this: **on this metric, with this sample unit, on this data, we cannot distinguish it from zero.** There are three possible reasons for that: the effect really does not exist; the effect exists but there are too few independent samples; or the effect used to exist and has since changed.',
      },
      {
        type: 'p',
        zh: '先看前两种：一个所谓"窄领导"市场信号，点估计看起来有几十个基点，日聚类区间却宽跨零，正确粒度的安慰剂 p 值也达到 0.605——这才接近"没有可用信号"。另一次确认实验，预先规定三层胜率必须严格单调，但每层只有 278 笔，胜率标准误约 2.9 个百分点；最后胜率顺序没过，账本效应却显著、同向，也通过了安慰剂。准确结论只能是"确认判据没过"，不能偷换成"效应不存在"。效应随时间变化的第三种情况，留到后两节再说。',
        en: 'Take the first two. A so-called “narrow leadership” market signal had a point estimate worth tens of basis points, but a day-clustered interval that straddled zero widely, and a placebo p-value at the correct granularity of 0.605 — that is close to “no usable signal”. Another confirmation experiment pre-specified that win rates across three tiers must be strictly monotonic, but each tier held only 278 trades, giving a win-rate standard error of about 2.9 percentage points. In the end the win-rate ordering failed, while the ledger effect was significant, in the same direction, and passed the placebo. The accurate conclusion can only be “the confirmation criterion did not pass”; it cannot be swapped for “the effect does not exist”. The third case — effects that change over time — is left to the next two sections.',
      },
      {
        type: 'p',
        zh: '还有一个常见误区：把 IC 当成钱。Spearman IC 测的是排序关系，更接近中部和名次；肥尾账本的钱却住在极少数尾部。一个变量可以把中位数排得更好，同时恰好删掉决定整本利润的大赢家。**IC 是排序的统计量，不是账本的统计量。** IC 显著不等于能赚钱，IC 跨零也不能单独证明没有交易价值。最后必须回到实际决策、实际账本和尾部留存。',
        en: 'One more common confusion: treating IC as money. Spearman IC measures a ranking relationship, which lives closer to the middle of the distribution and to ordering; the money in a fat-tailed ledger lives in a handful of tail events. A variable can rank the median better while deleting exactly the big winners that decide the whole book. **IC is a statistic about ordering, not a statistic about the ledger.** A significant IC does not mean you can make money, and an IC straddling zero cannot on its own prove there is no trading value. In the end you must come back to actual decisions, the actual ledger, and tail retention.',
      },
      {
        type: 'p',
        zh: '只看赢家，会让这堵墙彻底消失在视野里。',
        en: 'Look only at winners and the wall disappears from view entirely.',
      },
      {
        type: 'figure',
        src: 'fig06',
        label: '6',
        alt: {
          zh: '两百个零期望策略中的幸运冠军，以及它在样本外的回落。',
          en: 'The lucky champion among two hundred zero-expectancy strategies, and its collapse out of sample.',
        },
        caption: {
          zh: '200 个每天抛硬币、期望收益严格为零的"策略"跑 252 天，冠军做到 +78%、夏普 2.36。只看左半边，你分不出它和真本事。让同一批硬币按同样规则继续抛第二个 252 天（右半边灰底），这位冠军回撤 30%，在 200 个里排到第 181 名。整个实验重复 2000 次，冠军的样本外中位排名是 104/200——纯属偶然。',
          en: '200 “strategies” that flip a coin every day, with expected return strictly zero, run for 252 days; the champion posts +78% and a Sharpe of 2.36. Looking only at the left half, you cannot tell it from real skill. Let the same coins keep flipping under the same rules for a second 252 days (grey panel, right) and the champion draws down 30% and ranks 181st of 200. Repeat the whole experiment 2,000 times and the champion’s median out-of-sample rank is 104/200 — pure chance.',
        },
      },
      {
        type: 'p',
        zh: '让一百万人猜硬币，猜错就出局。二十轮以后，平均大约会剩下一位"连续猜对二十次"的大师。拿到麦克风、写回忆录、上播客的，是他；前面猜错的 999,999 人没有声音。',
        en: 'Have a million people call coin flips, eliminated on the first miss. After twenty rounds, on average about one “master” remains who has called twenty in a row. He gets the microphone, the memoir and the podcast; the 999,999 who missed earlier have no voice.',
      },
      {
        type: 'figure',
        src: 'fig07',
        label: '7',
        alt: {
          zh: '幸存者如何被误认成先知。',
          en: 'How a survivor gets mistaken for a prophet.',
        },
        caption: {
          zh: '猜错出局的 999,999 人——没有麦克风，没有回忆录；放大镜里开播客讲"我的方法论"的，是纯运气也必然会剩下的那一个。传奇不一定是假的，但你听到传奇这件事，本身经过了极强的幸存者筛选。',
          en: 'The 999,999 who guessed wrong and were eliminated — no microphone, no memoir. The one under the magnifying glass, hosting a podcast about “my methodology”, is the one pure luck was always going to leave behind. The legend is not necessarily false, but the fact that you are hearing it has itself passed through an extremely strong survivorship filter.',
        },
      },
      {
        type: 'p',
        zh: '上世纪八十年代著名的"海龟交易员"实验里，理查德·丹尼斯用两周课程把一群毫无经验的新手训练成趋势交易者，想证明交易可以传授。最出名的学员柯蒂斯·费斯，十九岁入选、账户战绩全组最佳，后来写出畅销书《海龟交易法则》。故事的下半场很少被引用：此后他再没有复现那段战绩，管理基金巨亏受罚，创业接连失败，最后破产潦倒，2023 年去世时几乎身无分文。',
        en: 'In the famous Turtle Traders experiment of the 1980s, Richard Dennis took a group of complete novices and, with a two-week course, turned them into trend followers, to prove that trading could be taught. The best-known student, Curtis Faith, was selected at nineteen and posted the best account record in the group, later writing the bestseller *Way of the Turtle*. The second half of the story is rarely quoted: he never reproduced that record again, took heavy losses managing a fund and was sanctioned, failed at one venture after another, and ended up bankrupt and destitute, dying in 2023 with almost nothing.',
      },
      {
        type: 'p',
        zh: '这个下半场比上半场更有信息量。一段真实、辉煌、甚至确有优势的实盘记录，也只证明"那套方法适合那段市场"。把时间拉得足够长，两件事几乎必然发生：一是窍门所依附的市场结构会变——那是后面第四种和第五种错误来收账；二是极小概率的坏事件总会轮到某个人头上——心态爆炸连环爆仓，轮到一次就够了。看起来无懈可击的大师，可能只是市场还没换季，或者他的那一天还没到。',
        en: 'The second half carries more information than the first. A real, brilliant, even genuinely edged live record still only proves that “that method suited that stretch of market”. Stretch the timeline far enough and two things are nearly certain: first, the market structure the edge depends on will change — that is where traps four and five come to collect; second, a very-low-probability bad event eventually lands on someone — a blown mindset and a cascade of liquidations only has to happen once. A master who looks impregnable may simply be living in a season that has not turned yet, or waiting for a day that has not arrived.',
      },
      {
        type: 'p',
        zh: '这不是说成功者没有实力，而是说实力和运气在一条已经实现的路径上很难拆开。人生的账本也由少数事件决定：选了什么专业，遇到什么人，进入哪个行业，赶上哪一轮扩张。我们总想从结果中反推出一个稳定的"我"，但那里面同时混着能力、路径和时代。',
        en: 'This is not to say successful people have no skill; it is to say that skill and luck are very hard to separate along a single realised path. A life’s ledger is decided by a handful of events too: what you studied, who you met, which industry you entered, which wave of expansion you caught. We always want to reverse-engineer a stable “me” out of the outcome, but ability, path and era are all mixed in there together.',
      },
      {
        type: 'p',
        zh: '承认运气，不是取消努力；承认统计上分不开，也不是宣布什么都不知道。它只要求我们把结论降到证据允许的强度：不知道就写不知道，看不清就写看不清，不要用一个漂亮的点估计替整个宇宙发言。',
        en: 'Acknowledging luck does not cancel effort; acknowledging that statistics cannot separate them does not declare that nothing is known. It only asks us to lower our conclusions to the strength the evidence permits: when you do not know, write that you do not know; when you cannot see clearly, write that you cannot see clearly; and do not let a pretty point estimate speak for the entire universe.',
      },
    ],
  },

  /* ── 第四种 ── */
  {
    id: 'trap-4',
    title: {
      zh: '第四种：等你看清，答案已经过期',
      en: 'Trap Four: By the Time You See Clearly, the Answer Has Expired',
    },
    blocks: [
      {
        type: 'p',
        zh: '第三种错误暂时假设关系稳定，只是样本太少、噪声太大。第四种更残忍：**你还在收集证据，待估计的关系本身已经开始移动。**',
        en: 'The third trap provisionally assumed the relationship was stable, and only the sample too small and the noise too large. The fourth is crueller: **while you are still gathering evidence, the relationship you are trying to estimate has already started to move.**',
      },
      {
        type: 'p',
        zh: '问题仍然是同一个问题，变量和机制也仍然可以辨认，只是尺度、边界和效应发生了漂移。重新估计参数后，旧框架原则上仍然可以使用。这里过期的是答案，不是问题本身。',
        en: 'The question is still the same question, and the variables and mechanism are still recognisable; only the scale, the boundaries and the effect have drifted. Re-estimate the parameters and the old framework can in principle still be used. What has expired here is the answer, not the question.',
      },
      {
        type: 'p',
        zh: '我们曾尝试求"把一个币的价格推动一定幅度需要多少钱"这样一个接近常数的量。后来测量发现两年里市场成交额中位数漂了 **14.53 倍**，单位价格路径所需的成交额也漂了 **8.10 倍**，只有价格路径本身相对稳定，漂了 1.85 倍。所谓常数，只是某段潮水里的暂时读数。',
        en: 'We once tried to pin down something like a constant for “how much money it takes to push a coin’s price by a given amount”. Later measurement showed that over two years the market’s median turnover drifted by **14.53×**, and the turnover required per unit of price path drifted by **8.10×**; only the price path itself was relatively stable, drifting 1.85×. The “constant” was just a temporary reading taken at one state of the tide.',
      },
      {
        type: 'p',
        zh: '这类问题看起来有一个简单答案：滚动调整。',
        en: 'This kind of problem seems to have an easy answer: roll the estimate forward.',
      },
      {
        type: 'p',
        zh: '可你要先知道往哪调、调多少、变化是暂时噪声还是长期漂移。判断这些仍然需要样本，而收集样本仍然需要时间。调整系统永远看着后视镜追一辆正在加速的车。',
        en: 'But first you have to know which way to adjust, by how much, and whether the change is temporary noise or lasting drift. Judging that still takes samples, and gathering samples still takes time. An adaptive system is forever chasing an accelerating car through the rear-view mirror.',
      },
      {
        type: 'p',
        zh: '要在 95% 置信度下，把一个夏普比率约为 1 的策略和纯运气区分开，大约需要三年数据；一段可用关系的稳定期却可能只有几个月。**考试还没做完，参数已经变了。** 等你终于确认策略已经失效，它可能早已亏完；等你终于确认新规律成立，新规律也可能开始衰退。',
        en: 'Distinguishing a strategy with a Sharpe of about 1 from pure luck at 95% confidence takes roughly three years of data; the stable life of a usable relationship may be only a few months. **The exam is not finished and the parameters have already changed.** By the time you finally confirm a strategy has stopped working, it may have already given everything back; by the time you finally confirm a new pattern holds, the new pattern may already be decaying.',
      },
      {
        type: 'figure',
        src: 'fig08',
        label: '8',
        alt: {
          zh: '纯运气能画出的夏普范围与真夏普 1 策略的落点，随实盘月数逐渐分开。',
          en: 'The Sharpe range pure luck can draw, and where a true Sharpe-1 strategy lands, separating as live months accumulate.',
        },
        caption: {
          zh: '灰色是纯运气能画出的成绩，蓝色是一个真夏普 1 策略的实际落点。在关系还活着的 2–6 个月里，两团几乎完全重叠——运气可以伪装出夏普 2 以上的战绩，而真策略此刻能证明自己的概率只有约 17%；平均要到 33 个月，它才爬出运气的天花板。统计并没有错，它只是来得太晚。',
          en: 'Grey is the range of records pure luck can draw; blue is where a genuine Sharpe-1 strategy actually lands. Over the 2–6 months while the relationship is still alive the two clouds overlap almost entirely — luck can fake a Sharpe above 2, while the real strategy’s probability of proving itself at that point is only about 17%. On average it takes 33 months to climb out of luck’s ceiling. Statistics is not wrong; it just arrives too late.',
        },
      },
      {
        type: 'p',
        zh: '时间问题还会藏在样本单位里。一个市场状态在同一天影响 960 笔交易，那仍然主要是一天的信息，不是 960 份独立证据。我们手里 588 个交易日，扣掉自相关后只值大约 76 个独立观测；把每天的样本从 10 笔堆到 960 笔，增加 96 倍，置信区间只收窄了 2.3 倍。日内交易越堆越多，日历却没有因此走得更快。',
        en: 'The time problem also hides inside the sample unit. A market state that affects 960 trades on the same day is still mostly one day of information, not 960 independent pieces of evidence. We had 588 trading days; after discounting autocorrelation they were worth about 76 independent observations. Raising the daily trade count from 10 to 960 — a 96-fold increase in sample — narrowed the confidence interval by only 2.3 times. You can stack more and more intraday trades; the calendar does not move any faster for it.',
      },
      {
        type: 'figure',
        src: 'fig09',
        label: '9',
        alt: {
          zh: '每天堆更多交易时，估计误差的真实范围与"假如每笔独立"的承诺逐渐分开。',
          en: 'As more trades are stacked per day, the true range of estimation error parts ways with what “if every trade were independent” promises.',
        },
        caption: {
          zh: '蓝色是估计误差的真实范围，灰色虚线是"假如每笔交易都独立"的承诺。两者在每天几笔时几乎重合，随后分道扬镳：幻想一路收成针尖，现实撞上共同日冲击造成的地板（红线）再也下不去——96 倍样本只换来 2.3 倍精度。市场变量的独立单元是"天"，不是"笔"。',
          en: 'Blue is the true range of estimation error; the grey dashed line is what “if every trade were independent” promises. The two nearly coincide at a few trades per day, then part ways: the fantasy narrows to a needle point, while reality hits the floor set by common daily shocks (red line) and goes no further — 96 times the sample buys 2.3 times the precision. The independent unit of a market variable is the day, not the trade.',
        },
      },
      {
        type: 'p',
        zh: '安慰剂在这里也会露出边界。我们有一个信号，在搜索窗里打赢了全部一千次标签置换，真实效应甚至高过安慰剂分布的最大值；到了独立时间段却没能通过原定判据。安慰剂没有失灵——它只说明搜索窗里的结构不是那种随机打乱能够制造的，却从未承诺这段结构能够跨时间复现。更重要的是，仅凭验证失败，我们还分不清究竟是同一关系的参数过期了，还是验证期已经变成了另一个问题。',
        en: 'The placebo shows its limits here too. We had a signal that beat all one thousand label permutations inside the search window, with a real effect above even the maximum of the placebo distribution; in an independent time period it failed the pre-specified criterion. The placebo did not malfunction — it only ever said that the structure inside the search window was not the kind of thing shuffling could manufacture; it never promised the structure would reproduce across time. More importantly, a failed validation alone does not tell us whether the parameters of the same relationship have expired, or whether the validation period has become a different question altogether.',
      },
      {
        type: 'p',
        zh: '第四种错误和第三种不同。第三种是证据不够，只要关系保持稳定，继续收集同一种证据可能有用；第四种是证据的保质期太短，继续等待时，待估参数也在继续移动。这里的困难不再只是统计，而是控制：你能不能在旧参数变得不可用以前，识别变化并完成调整？',
        en: 'The fourth trap differs from the third. The third is insufficient evidence: as long as the relationship stays stable, collecting more of the same evidence may help. The fourth is evidence with too short a shelf life: while you wait, the parameter you are estimating keeps moving. The difficulty here is no longer only statistical, it is a control problem — can you detect the change and complete the adjustment before the old parameters become unusable?',
      },
      {
        type: 'p',
        zh: '人生里那些看似牢固的长期经验，也常死在这一层。房价涨了二十年，不等于第二十一年仍会涨；学历溢价养活了一代人，不等于下一代付同样的学费还能换到同样的回报。但真正的困难不在于看不见变化，而在于人调整的速度追不上变化：确认风向变了需要证据，攒证据需要年头，转身本身还要再花几年。等你终于换到新赛道，常常正赶上它自己的周期走到尾声。',
        en: 'The long-run lessons of life that look most solid often die at this layer too. Housing rose for twenty years, which does not mean it rises in the twenty-first; an education premium fed one generation, which does not mean the next gets the same return for the same tuition. But the real difficulty is not that the change is invisible — it is that people adjust more slowly than things change. Confirming the wind has turned takes evidence, accumulating evidence takes years, and turning around takes several more. By the time you finally switch to the new track, you often arrive just as its own cycle is running out.',
      },
      {
        type: 'p',
        zh: '反过来，闻风就动也不是答案。风声里噪声远多于真正的漂移，把每一次波动都当成时代变了，就是在用最少的证据做最大的决定，每次还要重付一遍转身的成本——不断调整的人，有时比一直不动的人输得更多。这就是第四种错误在人生里的形状：站着不动会被变化淘汰，追着变化跑会被噪声消耗，而你分辨两者的速度天然慢于世界改变的速度。',
        en: 'Conversely, moving at every rumour is no answer either. There is far more noise than genuine drift in the wind, and treating every fluctuation as a change of era means making the biggest decisions on the least evidence — and paying the cost of turning around each time. People who adjust constantly sometimes lose more than people who never move at all. That is the shape trap four takes in a life: stand still and change eliminates you, chase change and noise consumes you, and your speed at telling the two apart is naturally slower than the speed at which the world changes.',
      },
    ],
  },

  /* ── 第五种 ── */
  {
    id: 'trap-5',
    title: {
      zh: '第五种：它假设世界不会换题',
      en: 'Trap Five: It Assumes the World Never Changes the Question',
    },
    blocks: [
      {
        type: 'p',
        zh: '第四种里，旧框架原则上仍然成立，重新估计阈值、尺度或窗口还有可能追上变化。第五种不行：**不是答案变了，是问题本身变了。**',
        en: 'In the fourth trap the old framework in principle still holds, and re-estimating thresholds, scales or windows may still catch up with the change. Not in the fifth: **it is not the answer that changed, it is the question.**',
      },
      {
        type: 'p',
        zh: '当人口、约束、因果关系或收益来源发生改变时，无论怎样重新校准旧参数，模型都不再描述眼前的世界。区分两者的标准不是变化快慢，而是重新估计是否足够：参数漂了就更新，问题换了就换模型。',
        en: 'When the population, the constraints, the causal relations or the source of returns change, no amount of recalibrating old parameters makes the model describe the world in front of you. The criterion separating the two is not how fast the change is, but whether re-estimation suffices: if the parameters drifted, update them; if the question changed, change the model.',
      },
      {
        type: 'p',
        zh: '我们把当前熊市大杀四方的实盘策略拿回 2024 年下半年的真牛市里测试：同一份代码，每月 **−6.54%**，最大回撤 **59.9%**，98.9% 的天数在水下。旱季里，它看起来像一台印钞机；回到牛市，它变成碎钞机。',
        en: 'We took a live strategy that has been dominating the current bear market and tested it back in the genuine bull market of the second half of 2024: identical code, **−6.54%** a month, a maximum drawdown of **59.9%**, and 98.9% of days underwater. In the dry season it looks like a money printer; back in a bull market it becomes a shredder.',
      },
      {
        type: 'p',
        zh: '这一层最著名的寓言是罗素的鸡。农夫连续一千天来喂它。鸡拥有一条完美的数据序列：每一天，人类出现，食物出现。样本越多，它对"人类爱我"的信心越高。第一千零一天，农夫带来的不是食物。',
        en: 'The most famous parable at this layer is Russell’s chicken. The farmer feeds it a thousand days running. The chicken holds a perfect data series: every day, a human appears and food appears. The more samples it has, the more confident it becomes that humans love it. On the thousand-and-first day, what the farmer brings is not food.',
      },
      {
        type: 'figure',
        src: 'fig10',
        label: '10',
        alt: {
          zh: '罗素的鸡：完美历史与第一次结构突变。',
          en: 'Russell’s chicken: a perfect history and the first structural break.',
        },
        caption: {
          zh: '鸡的错误不在统计。它真正犯的错，是相信产生数据的机制永远不会改变。',
          en: 'The chicken’s error is not statistical. Its real mistake was believing that the mechanism generating the data would never change.',
        },
      },
      {
        type: 'p',
        zh: '火鸡问题不能靠再多一个喂食日解决。第一千零一天不是旧分布里的小概率坏样本，而是生成数据的规则换了。',
        en: 'The turkey problem cannot be solved by one more feeding day. Day 1,001 is not an unlikely bad draw from the old distribution; the rule generating the data has been replaced.',
      },
      {
        type: 'p',
        zh: '人生里真正致命的变化也常是这一种。行业不会只是工资慢慢下降，它可能瞬间消失。旧经验并非从未正确，只是它所属的世界结束了。',
        en: 'The truly fatal changes in a life are usually of this kind too. An industry does not merely see wages drift down; it can vanish. The old experience was not always wrong — the world it belonged to simply ended.',
      },
      {
        type: 'p',
        zh: '到这里，问题已经不只是"怎样把回测做得更准"，而是你相信自己活在一个怎样的宇宙里：一个规律永恒、只等你发现的决定性宇宙，还是一个规律会衰减、制度会切换、连问题本身都可能改变的世界？',
        en: 'By this point the question is no longer only how to make the backtest more accurate, but what kind of universe you believe you live in: a deterministic one whose laws are eternal and merely waiting to be discovered, or a world where laws decay, regimes switch, and even the question itself can change?',
      },
    ],
  },

  /* ── 活在概率宇宙里 ── */
  {
    id: 'probabilistic-universe',
    title: {
      zh: '活在概率宇宙里',
      en: 'Living in a Probabilistic Universe',
    },
    blocks: [
      {
        type: 'p',
        zh: '生活在决定性宇宙里的人相信，世界有一套恒定规律，只要找对一次，就能受用终身。这个世界观在交易里破产得很快；人生里破产得很慢，所以反而更危险。房价、学历、职业和关系的周期都足够长，一个人可能用半生把顺风误认成规律，再用剩下半生等待规律回来。',
        en: 'People who live in a deterministic universe believe the world runs on a fixed set of laws, and that finding them once will serve you for life. That worldview goes bankrupt quickly in trading; in life it goes bankrupt slowly, which makes it more dangerous. The cycles of housing, education, careers and relationships are all long enough that a person can spend half a life mistaking a tailwind for a law, and the other half waiting for the law to come back.',
      },
      {
        type: 'p',
        zh: '概率性宇宙的活法不是怀疑一切，而是让每个信念都带误差棒。"这个策略有效""我擅长这件事""这条路走得通"，都不是刻在世界里的事实，而是基于目前证据的暂时估计。新证据来了，就更新；证据不够，就降低下注，而不是提高语气。',
        en: 'Living in a probabilistic universe does not mean doubting everything; it means putting error bars on every belief. “This strategy works”, “I am good at this”, “this path leads somewhere” are not facts carved into the world but provisional estimates given current evidence. When new evidence arrives, update; when evidence is thin, size the bet down rather than raise your voice.',
      },
      {
        type: 'p',
        zh: '成功也不再是单一归因。它是能力、选择、路径和时代共同作用的结果，而且比例通常不可知。得意时留一手，因为你不知道自己究竟有多少实力、多少顺风；失意时也别急着把全部结果写进人格，因为反方向同样成立。',
        en: 'Success stops being a single attribution too. It is the joint product of ability, choice, path and era, in proportions that are usually unknowable. Hold something back in good times, because you do not know how much is skill and how much is tailwind; and in bad times do not rush to write the whole result into your character, because the same argument runs in reverse.',
      },
      {
        type: 'p',
        zh: '人还只活在一条路径上。一个赌局每轮有一半概率赚 50%，一半概率亏 40%，算术平均收益是每轮 +5%；但它的长期复利是每轮 −5.1%。一万个平行世界的平均在赚钱，任何一个不断下注的人却在走向归零。你不能靠其他平行世界里的自己，偿还这一个世界的破产。',
        en: 'And a person lives along only one path. Take a bet that gains 50% half the time and loses 40% the other half: the arithmetic mean is +5% per round, but its long-run compounded return is −5.1% per round. The average across ten thousand parallel worlds is making money, while any single person who keeps betting is walking toward zero. You cannot use yourself in other parallel worlds to pay off the bankruptcy in this one.',
      },
      {
        type: 'p',
        zh: '既然无法证明未来，就把赌注切小。人生没有真正的空仓，"什么都不做"也是在赌世界保持原样。能做的是让任何一次判断都不会杀死你：下行封顶，保留选择，避免一次不可逆的满仓，活得比当前气候更久。',
        en: 'Since the future cannot be proven, cut the bet small. There is no true cash position in life: “doing nothing” is also a bet that the world stays as it is. What you can do is make sure no single judgement can kill you — cap the downside, keep options open, avoid one irreversible all-in, and outlive the current climate.',
      },
      {
        type: 'p',
        zh: '更重要的是，让模型可以被丢掉。策略、经验和自我认知都只是工具，不是身份。参数漂了就更新；问题换了，就换模型。一个人真正可持续的能力，不是永远拥有正确答案，而是在答案失效时仍有能力承认它已经失效。',
        en: 'More importantly, keep the model disposable. Strategies, experience and self-image are tools, not identity. If the parameters drifted, update them; if the question changed, change the model. A person’s genuinely durable capability is not always having the right answer, but still being able to admit an answer has failed when it fails.',
      },
      {
        type: 'p',
        zh: '所以我们仍然每天回测。回测擅长杀死坏想法、发现工程错误、比较机制和标出风险，它从来不是无用的。只是当一条资金曲线开始许诺未来时，我们会多问几句：这段过去是真的吗？这个规律是挑出来的吗？样本分得清实力和运气吗？参数还没有过期吗？眼前还是同一个问题吗？',
        en: 'So we still backtest every day. Backtesting is good at killing bad ideas, exposing engineering errors, comparing mechanisms and flagging risk; it was never useless. It is only when an equity curve starts promising the future that we ask a few more questions: is this past real? Was this pattern cherry-picked? Can the sample tell skill from luck? Have the parameters expired? Is this still the same question?',
      },
      {
        type: 'p',
        zh: '历史学家值得尊敬。但下注的那一刻，你面对的从来不是历史，而是一个还没有发生、也没有义务重复过去的世界。',
        en: 'Historians deserve respect. But at the moment you place the bet, what you face is never history — it is a world that has not happened yet, and is under no obligation to repeat the past.',
      },
      {
        type: 'figure',
        src: 'fig12',
        label: '12',
        alt: {
          zh: 'tick 状的山形路径：前半段整段上涨是他全部的观测，途中标着考上好大学、遇见爱人；顶点处小人极小。后半段的下坡尚未发生，虚线沿途是破产、出轨、生病、死亡。放大镜把他脚下最后一小段放大。',
          en: 'A tick-shaped mountain path: the whole rise behind the walker is all he has ever observed, marked with getting into a good university and meeting his love; at the summit the figure is tiny. The descent ahead has not happened yet, its dashed line labelled bankruptcy, betrayal, illness and death. A magnifying glass enlarges the last short stretch beneath his feet.',
        },
        caption: {
          zh: '脚下的小上坡是真的，身后的整段上涨也是真的——考上好大学、遇见爱人，在他拥有的全部观测里，这条路一直在向上，放大镜里的乐观完全诚实。问题只有一个：周期比他的观测窗口长。虚线那一段同样真实，只是还没有发生——破产、出轨、生病和死亡都不会提前打招呼，也不承担延续脚下坡度的义务。',
          en: 'The small rise under his feet is real, and so is the whole climb behind him — a good university, meeting the person he loves. Across every observation he has, the path has been going up, and the optimism inside the magnifying glass is entirely honest. There is only one problem: the cycle is longer than his observation window. The dashed section is just as real, it simply has not happened yet — bankruptcy, betrayal, illness and death give no advance notice, and are under no obligation to continue the slope beneath his feet.',
        },
      },
    ],
  },

  /* ── 清醒之后 ── */
  {
    id: 'after-clarity',
    title: {
      zh: '清醒之后，用什么往前走',
      en: 'After the Clarity, What Carries You Forward',
    },
    blocks: [
      {
        type: 'p',
        zh: '上一张图里的小人在当时是幸福的。盲信是有执行力的——不知道窗口外面有什么的人，每一步都踩得很实，糊涂而坚定，也能过完一生。',
        en: 'The figure in the last picture was happy at the time. Blind belief is operationally effective — someone who does not know what lies outside the window plants every step firmly, and can live a whole life muddled and resolute.',
      },
      {
        type: 'p',
        zh: '但是读完文章的你，让五种陷阱拆掉了对过去的信任，会走到一个比盲信更危险的位置：什么都不敢信了。看清之后觉得无能为力，是这种清醒最常见的结局。而停下来并不是退路——前面说过，人生没有真正的空仓，"什么都不做"也是在赌世界保持原样。你可以拒绝选择先验，但那只是选了一个最坏的先验。',
        en: 'But you, having read this far, with the five traps having dismantled your trust in the past, arrive somewhere more dangerous than blind belief: unable to believe anything. Seeing clearly and then feeling powerless is the most common ending for this kind of clarity. And stopping is not an exit — as said above, there is no true cash position in life; “doing nothing” is also a bet that the world stays as it is. You may refuse to choose a prior, but that is merely choosing the worst one.',
      },
      {
        type: 'figure',
        src: 'fig13',
        label: '13',
        alt: {
          zh: '桥墩上刻着信、望、爱、节制、勤奋、谦逊、贞洁；桥上的行人走过一整条文明的天际线，头顶是一条起落的曲线。',
          en: 'A bridge whose piers are carved with faith, hope, love, temperance, diligence, humility and chastity; a walker crosses an entire skyline of civilisations, a rising and falling curve overhead.',
        },
        caption: {
          zh: '信、望、爱与节制、勤奋、谦逊、贞洁——不是任何一段行情里的最优孤峰，而是几千年、无数次换季之后仍然站着的桥墩。头顶那条线一路涨过、崩过、又涨过；帝国、文明与货币都归过零，桥还在。',
          en: 'Faith, hope and love, with temperance, diligence, humility and chastity — not the optimal lone peak of any single regime, but the piers still standing after thousands of years and countless changes of season. The line overhead has risen, collapsed and risen again; empires, civilisations and currencies have all gone to zero, and the bridge is still there.',
        },
      },
      {
        type: 'p',
        zh: '于是问题变得很实际：盲信者的执行力来自不知道；清醒者知道了所有的不可知之后，执行力从哪里来？',
        en: 'So the question becomes very practical: the blind believer’s drive comes from not knowing. Where does drive come from for someone who knows everything that cannot be known?',
      },
      {
        type: 'p',
        zh: '统计不回答这个问题。它能告诉你什么不可知、多少样本才够看清、置信区间有多宽，它不能告诉你明天早晨为什么还要起床坚持。而行动永远跑在证明前面——一个真夏普 1 的策略平均要三十三个月，一段对应关系的寿命只有几个月；人生更是如此，等一条路被证明走得通，路已经走完了。从决定到证明之间，有一段永远填不上的空窗。填这段空窗的东西，无论你叫它什么，结构上就是信仰。',
        en: 'Statistics does not answer that. It can tell you what is unknowable, how many samples are enough to see clearly, and how wide the confidence interval is; it cannot tell you why to get up tomorrow morning and keep going. And action always runs ahead of proof — a genuine Sharpe-1 strategy takes thirty-three months on average, while the relationship it trades on lives only a few months. Life is more so: by the time a road is proven passable, you have already walked it. Between the decision and the proof there is a gap that can never be filled. Whatever you call the thing that fills it, structurally it is faith.',
      },
      {
        type: 'p',
        zh: '写完前面五章，再去读两千年前的那句话，我才发现它不是诗，是一条精确的认识论：**"信就是所望之事的实底，是未见之事的确据。"**（希伯来书 11:1）所望之事没有实底——第三种、第四种错误刚刚用数字证明完；未见之事没有确据——第五种错误整章都是它的反面教材。信不是理性的对立面，它开始于理性诚实承认边界的那一刻：边界之内用统计；边界之外你必须选择——而且你其实一直在选，只是盲信者不知道自己选了。',
        en: 'Having written the five chapters above, I went back to a sentence written two thousand years ago and found it is not poetry but a precise epistemology: **“Now faith is the substance of things hoped for, the evidence of things not seen.”** (Hebrews 11:1) Things hoped for have no substance — traps three and four just proved that with numbers. Things not seen have no evidence — the whole of trap five is the counter-example. Faith is not the opposite of reason; it begins at the moment reason honestly admits its boundary. Inside the boundary, use statistics. Outside it, you have to choose — and in fact you have been choosing all along; the blind believer simply does not know that he chose.',
      },
      {
        type: 'p',
        zh: '落到实践上，就是**判据先行**。在看到结果之前，把"我按什么准绳行动、我要成为什么样的人"决定下来；结果出来之后，不改判据，不换指标。我们对研究这样做，是因为不信任看到结果之后的自己；对人生这样做，理由完全相同——回测中的人生，是你自己最能言善辩的辩护律师。而这个动作有一个比"预注册"古老得多的名字：**约**。',
        en: 'In practice this means **criteria first**. Before you see the result, settle what standard you will act by and what kind of person you intend to be; once the result is in, do not change the criterion and do not swap the metric. We do this in research because we do not trust the version of ourselves that has already seen the result. We do it in life for exactly the same reason — in the backtest of your own life, you are your own most eloquent defence lawyer. And this move has a name far older than “pre-registration”: **a covenant**.',
      },
      {
        type: 'p',
        zh: '洪水退去，神把彩虹放在云中，先写"我必不再"，然后才看人类此后的表现；婚礼上的誓词把"无论顺境逆境、富足贫穷、健康疾病"放在一切结果之前，因为立约的人清楚，逆境当晚的自己没有资格重新谈判。',
        en: 'When the flood receded, God set the rainbow in the clouds and wrote “never again” first, before seeing how humanity would behave afterwards. The wedding vow puts “for better, for worse, for richer, for poorer, in sickness and in health” ahead of every outcome, because the people making the vow know that the version of themselves on the night of the worst has no standing to renegotiate.',
      },
      {
        type: 'p',
        zh: '约不是对未来的预测，是对自己的封印。',
        en: 'A covenant is not a prediction about the future; it is a seal on yourself.',
      },
      {
        type: 'p',
        zh: '这与"每个信念都带误差棒"并不矛盾。带误差棒的是**预测**：这条路是否走得通，新证据来了就更新。不带误差棒的是**决定**：你选定的准绳。',
        en: 'This does not contradict “put error bars on every belief”. What carries error bars is **prediction**: whether this path leads somewhere, updated when new evidence arrives. What carries none is **decision**: the standard you have chosen.',
      },
      {
        type: 'p',
        zh: '我们要选什么准绳？保罗有一段话，主题恰好是"什么会过期，什么不会"：先知讲道之能终必归于无有，知识也终必归于无有——预测会失效，模型会作废，这是前五章；"如今常存的有信、有望、有爱这三样，其中最大的是爱"，因为"爱是永不止息"。这是人类文本里最早的一份幸存者名单。',
        en: 'Which standard should we choose? Paul has a passage whose subject is precisely what expires and what does not: prophecies shall fail, knowledge shall vanish away — predictions stop working and models get retired, which is the previous five chapters; “and now abideth faith, hope, charity, these three; but the greatest of these is charity”, because “charity never faileth”. It is the earliest survivorship list in the human record.',
      },
      {
        type: 'p',
        zh: '信、望、爱，加上节制、勤奋、谦逊、贞洁，在任何一段历史行情里都不是最优孤峰。但它们是最长的样本外窗口里检验过的平台：几千年，无数次换季，帝国，文明和货币都归过零，它们一直活着。选它们，正是"选平台，不选孤峰"在人生里的用法。',
        en: 'Faith, hope and love, plus temperance, diligence, humility and chastity, are not the optimal lone peak of any single stretch of history. But they are the plateau tested over the longest out-of-sample window there is: several thousand years, countless changes of season, empires, civilisations and currencies all going to zero — and they are still alive. Choosing them is exactly what “choose the plateau, not the peak” looks like applied to a life.',
      },
      {
        type: 'p',
        zh: '必须诚实地说：这不是统计结论。没有人给德性做过随机对照试验。盲信的小人向前走，因为他以为下坡不存在；有信的人向前走，知道下坡就藏在某处的虚线里。他凭什么还敢把下一步踩实？不是因为他算出了前面是上坡——他比谁都清楚这算不出来。他信的那个故事，核心符号本来就不是一条平滑上涨的曲线，而是一次最深的回撤：十字架，门徒的那个周五，是人类信仰叙事里最彻底的一次爆仓——他们押上一切跟随的那个人死了，他们锁着门，不敢出去。**而这个信仰宣告的中心事件，是一次分布之外的翻转：火鸡的第一千零一天从分布外杀进来——复活，它只发生过一次，样本量是一，永远无法回测——你完全可以不信。它从未承诺你的曲线不回撤；它承诺的是回撤的深处有同在，以及最深的那一次回撤不是终点。**',
        en: 'In honesty: this is not a statistical conclusion. Nobody has run a randomised controlled trial on virtue. The blind figure walks forward because he thinks the downslope does not exist; the man of faith walks forward knowing the downslope is hidden somewhere along the dashed line. On what grounds does he still dare to plant the next step? Not because he has calculated that the path ahead rises — he knows better than anyone that this cannot be calculated. The story he believes does not have a smoothly rising curve as its central symbol at all, but the deepest drawdown of all: the cross. The disciples’ Friday is the most complete blow-up in the human narrative of faith — the man they had staked everything to follow was dead, and they locked the doors, afraid to go out. **And the central event this faith proclaims is a reversal from outside the distribution: the turkey’s thousand-and-first day breaking in from the outside — the resurrection. It happened once, sample size one, and can never be backtested. You are entirely free not to believe it. It never promised your curve would not draw down; what it promises is presence in the depth of the drawdown, and that the deepest drawdown of all is not the end.**',
      },
      {
        type: 'p',
        zh: '诗人在旷野里写下的是同一个结构："我虽然行过死荫的幽谷，也不怕遭害，因为你与我同在。"不是"因为幽谷之后必有牛市"——而是"因为你与我同在"——那是关系，不随行情结算。',
        en: 'The poet in the wilderness wrote the same structure: “Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me.” Not “because after the valley there must be a bull market” — but “because thou art with me”. That is a relationship, and it does not settle against the market.',
      },
      {
        type: 'p',
        zh: '回测管得住策略，管不住人；让人穿过回撤的，从来不是那条资金曲线，而是曲线之外他所信的。统计能把人诚实地送到门口，门里那一步，要自己迈。',
        en: 'A backtest can govern a strategy; it cannot govern a person. What carries someone through a drawdown was never the equity curve, but what he believes outside it. Statistics can honestly walk you to the door; the step through it, you take yourself.',
      },
      {
        type: 'p',
        zh: '迈入门槛，从此顺风的时候抬头说：这是恩典，不是实力——统计不许我们说是实力。感谢馈赠，更感谢那位馈赠者。',
        en: 'Step over the threshold, and from then on, when the wind is at your back, look up and say: this is grace, not skill — statistics does not permit us to call it skill. Give thanks for the gift, and more for the giver.',
      },
    ],
  },
];
