/**
 * weekend-equity-perps 正文内容（中英双语）
 *
 * 文件位置: src/pages/blog/posts/weekend-equity-perps/content.js
 *
 * 中文为原稿，英文为对照译文。渲染逻辑见同目录 index.jsx。
 *
 * 块类型：
 *   p         段落。可选 num（有序编号）
 *   figure    配图。src 对应 index.jsx 的 FIGURES 键
 *   eq        公式块。id 对应 index.jsx 的 EQUATIONS（站点无 KaTeX，公式用
 *             语义化 HTML + Unicode 数学字符手写，零依赖、可随字号缩放）
 *   flow      箭头链路（一行若干节点，用 → 串起来）
 *   table     表格。headers / rows 均为 { zh, en }
 *   sequence  时序图（原文 mermaid sequenceDiagram 的手绘 SVG 版）
 *   ul        无序列表，支持行内 [文字](链接)
 *   hr        分割线
 *   note      文末小字附注
 *
 * 行内标记：**加粗**、*斜体*、`等宽`、[文字](链接)
 */

/** 界面词 */
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
        zh: '一周 168 小时，美股只开 32 个半。剩下的 135 小时里，特斯拉值多少钱，没有任何人回答，但股票永续合约不休息。它的清算引擎每一秒都要一个价格，于是四家交易所发明了四个版本的"特斯拉此刻值多少钱"：Binance 曾经把周五收盘价直接冻住，Hyperliquid 让本所订单流自己往上顶，OKX 去抄别家的报价，Gate 干脆塞进来一个 24/7 交易的代币化现货当锚。',
        en: 'There are 168 hours in a week, and the US equity market is open for thirty-two and a half of them. For the remaining 135 hours nobody answers the question of what Tesla is worth — but equity perpetuals do not take the weekend off. Their liquidation engines need a price every second, so four exchanges invented four versions of “what Tesla is worth right now”: Binance used to freeze Friday’s close outright, Hyperliquid lets its own order flow push the price along, OKX copies other venues’ quotes, and Gate simply wired in a tokenised spot that trades 24/7 as the anchor.',
      },
      {
        type: 'p',
        zh: '价格只能住在两个条件同时成立的地方：机制允许它移动，而且移动有锚。谁的机制不许价格动，谁的报价就是一张免费期权；谁的价格能动、锚却薄，谁就等着被一笔异常打印带崩清算引擎。周末盘面上所有看似古怪的现象——为什么总是 Hyperliquid 的 mark 先动，为什么 Binance、OKX 随后跟价，为什么周末在 CEX 做市总感觉被薅，为什么 Gate 的周末深度反而更好——都是这一条约束的推论。',
        en: 'Price can only live where two conditions hold at once: the mechanism permits it to move, and the movement has an anchor. A venue whose mechanism forbids the price to move is handing out a free option on its own quotes; a venue whose price can move but whose anchor is thin is waiting for one anomalous print to take down its liquidation engine. Everything that looks odd on a weekend screen — why Hyperliquid’s mark always moves first, why Binance and OKX follow, why market making on a CEX over the weekend always feels like being picked off, why Gate’s weekend depth is actually better — is a corollary of that single constraint.',
      },
      {
        type: 'p',
        zh: '先纠正一个容易混淆的命名。大家说的"Hyperliquid 股票永续合约"，多数并不是 Hyperliquid 核心团队定价的原生市场，而是 HIP-3 builder market——由 Trade.xyz 等 builder 部署，Hyperliquid 提供订单簿、撮合、保证金和结算，builder 决定合约规格、杠杆和 oracle。Trade.xyz 占据了绝大部分股票／RWA 市场的持仓与成交，所以分析股票永续时不能把 BTC 原生永续的通用 mark 公式直接套过来，真正要看的是 Trade.xyz 自己的内部／外部定价切换机制。下文说"Hyperliquid"时，指的都是这条链上的 Trade.xyz 股票市场。',
        en: 'First, a naming correction. What people call “Hyperliquid equity perpetuals” is mostly not a native market priced by the Hyperliquid core team, but a HIP-3 builder market — deployed by builders such as Trade.xyz, with Hyperliquid supplying the order book, matching, margin and settlement while the builder decides contract specs, leverage and oracle. Trade.xyz holds the overwhelming majority of open interest and volume across equity/RWA markets, so you cannot lift the generic mark formula of a native BTC perpetual and apply it here; what matters is Trade.xyz’s own switch between internal and external pricing. Wherever this article says “Hyperliquid”, it means the Trade.xyz equity markets on that chain.',
      },
      { type: 'hr' },
    ],
  },

  /* ── 一 ── */
  {
    id: 'four-prices',
    title: {
      zh: '一、先把四种价格拆开',
      en: 'I. Pulling the Four Prices Apart',
    },
    blocks: [
      {
        type: 'p',
        zh: '先回顾一些基本定义：一个交易所同时存在至少四种价格，用途不同，更新节奏也不同。',
        en: 'Some basic definitions first. An exchange carries at least four prices at once, with different purposes and different update cadences.',
      },
      {
        type: 'figure',
        src: 'priceLayers',
        alt: {
          zh: '四种价格的关系：订单簿价格、最新成交价、指数／预言机、标记价格。',
          en: 'How the four prices relate: order-book prices, last price, index/oracle and mark price.',
        },
      },
      {
        type: 'p',
        num: 1,
        zh: '**Last price** 是最近一笔真实成交，只有发生新成交才变。',
        en: '**Last price** is the most recent actual trade. It only moves when a new trade happens.',
      },
      {
        type: 'p',
        num: 2,
        zh: '**Best bid/ask 与 impact price** 描述当前订单簿——即使没有成交，做市商撤单重挂它们就会动。',
        en: '**Best bid/ask and impact price** describe the current order book — they move when makers cancel and requote, with no trade at all.',
      },
      {
        type: 'p',
        num: 3,
        zh: '**Index／oracle** 是外部参考：股票数据商、其他交易所价格、汇率的组合。',
        en: '**Index / oracle** is the external reference: a combination of equity data vendors, other venues’ prices and FX rates.',
      },
      {
        type: 'p',
        num: 4,
        zh: '**Mark price** 是风险价格，用于未实现盈亏、保证金、强平和 TP/SL 触发，通常对前三者做中位数、EMA、限幅之类的保护处理。以 Trade.xyz 的股票永续为例，mark 是三个分量的中位数：',
        en: '**Mark price** is the risk price, used for unrealised PnL, margin, liquidation and TP/SL triggers. It usually applies protective treatment — medians, EMAs, clamps — to the three above. Take Trade.xyz’s equity perpetuals: the mark is the median of three components.',
      },
      { type: 'eq', id: 'mark' },
      {
        type: 'p',
        zh: '(1) 是外部锚，(3) 是纯本所订单簿，(2) 是折中——oracle 加上"本所基差"的 150 秒 EMA。Binance、OKX、Gate 的 mark 结构大同小异：**三个分量里通常有两个吃 index。** 所以谁控制了休市期的 index，谁就控制了 mark——而 mark 控制着清算引擎。',
        en: '(1) is the external anchor, (3) is the pure local order book, and (2) is the compromise — the oracle plus a 150-second EMA of the local basis. Binance, OKX and Gate have much the same structure: **two of the three components usually feed on the index.** So whoever controls the index while the underlying is closed controls the mark — and the mark controls the liquidation engine.',
      },
      {
        type: 'p',
        zh: '由此有两个立刻能用的推论。第一，屏幕上"mark 变了、last 没变"不是 mark 在神秘地预测未来，它只说明三件事之一：外部 oracle 先更新了；本所 BBO 已经撤单重报但还没人成交；或者 mark 的推送频率比成交栏快。真正的领价者是**进入 mark 公式的那个可执行价格或信息源**，不是函数输出本身。第二，mark 也绝不只是展示价：它一旦先动到某些账户的维持保证金线，强平引擎就会向本所订单簿发出真实订单——',
        en: 'Two immediately usable corollaries follow. First, “the mark moved but last did not” on your screen is not the mark mysteriously predicting the future; it says one of three things: the external oracle updated first; the local BBO has been cancelled and requoted but nobody has traded yet; or the mark simply pushes faster than the trade tape. The real price leader is **the executable price or information source that enters the mark formula**, not the output of the function. Second, the mark is never merely a display price: the moment it moves through some accounts’ maintenance margin, the liquidation engine sends real orders into the local book —',
      },
      {
        type: 'flow',
        nodes: {
          zh: ['外部源／领价盘口', '本所 index／mark', '保证金不足', '强平单', '本所 last 跟随'],
          en: ['External source / leading book', 'Local index / mark', 'Margin shortfall', 'Liquidation order', 'Local last follows'],
        },
      },
      {
        type: 'p',
        zh: '这条反向链路是：有时不是套利者先把成交价打过去，而是风险价格先接受了外部世界，再由强平流把本所成交补上。**Mark 不是裁判，而是价格网络接入强平系统的插座。**',
        en: 'This is the reverse channel: sometimes it is not an arbitrageur who prints the new trade first — the risk price accepts the outside world first, and liquidation flow then fills in the local trade. **The mark is not a referee; it is the socket through which the price network plugs into the liquidation system.**',
      },
      { type: 'hr' },
    ],
  },

  /* ── 二 ── */
  {
    id: 'four-venues',
    title: {
      zh: '二、休市之后，四家各自发明了什么',
      en: 'II. What the Four Venues Each Invented After the Close',
    },
    blocks: [
      {
        type: 'table',
        headers: {
          zh: ['场所', '休市期 index／oracle 来源', '本所订单流能否推动价格', '约束机制'],
          en: ['Venue', 'Off-hours index / oracle source', 'Can local flow move the price?', 'Constraint mechanism'],
        },
        rows: {
          zh: [
            ['**Hyperliquid** (Trade.xyz)', 'internal pricing：impact 盘口压力驱动 oracle 演化', '**能，设计如此**', 'discovery bounds：±5% 分层棘轮，硬顶约 ±15.76%'],
            ['**Binance**（股票类）', '2026-05-16 起 Orderbook EWMA（此前 index 冻结于最后收盘价）', '能，经本所盘口', 'EWMA 平滑 + 模式切换 30 秒线性过渡'],
            ['**OKX**', '自身合约价 + 他所股票永续（明确点名 HL、Gate、Bitget、Binance）', '间接能，经 EMA 加权稀释', '±10% index bands，锚定最后可得股价'],
            ['**Gate**', 'xStocks 代币化股票现货**同场 24/7 交易** + 本所盘口', '能，经现货—永续套利', '现货流动性本身即锚'],
          ],
          en: [
            ['**Hyperliquid** (Trade.xyz)', 'Internal pricing: impact-book pressure drives the oracle forward', '**Yes, by design**', 'Discovery bounds: layered ±5% ratchet, hard cap ≈ ±15.76%'],
            ['**Binance** (equities)', 'Orderbook EWMA since 2026-05-16 (previously the index froze at the last close)', 'Yes, via the local book', 'EWMA smoothing + 30-second linear transition on mode switch'],
            ['**OKX**', 'Own contract price + other venues’ equity perps (HL, Gate, Bitget, Binance named explicitly)', 'Indirectly, diluted by EMA weighting', '±10% index bands anchored to the last available share price'],
            ['**Gate**', 'xStocks tokenised equity spot **trading 24/7 on the same venue** + the local book', 'Yes, via spot–perp arbitrage', 'Spot liquidity is itself the anchor'],
          ],
        },
      },
      {
        type: 'p',
        zh: '**Hyperliquid / Trade.xyz** 在外部股票数据可用时用外部定价；休市后进入 internal pricing。内部 oracle 不追逐单笔 last trade，而是观察设定名义金额下的 impact bid/ask 对当前 oracle 的压力：',
        en: '**Hyperliquid / Trade.xyz** uses external pricing while external equity data is available, and switches to internal pricing once the market closes. The internal oracle does not chase individual last trades; it watches the pressure that the impact bid/ask at a set notional exerts on the current oracle.',
      },
      { type: 'eq', id: 'ipd' },
      {
        type: 'p',
        zh: '再用连续时间 EMA 缓慢推进（2026 年 4 月底起时间常数从 1 小时缩短到 30 分钟）：',
        en: 'It is then advanced slowly by a continuous-time EMA (the time constant was shortened from one hour to thirty minutes in late April 2026).',
      },
      { type: 'eq', id: 'oracleEma' },
      {
        type: 'p',
        zh: 'oracle 的活动范围被 discovery bounds 约束。以周五收盘参考价 100 为例：',
        en: 'The oracle’s range of movement is constrained by discovery bounds. Taking a Friday close of 100 as the reference:',
      },
      {
        type: 'figure',
        src: 'discoveryBounds',
        alt: {
          zh: 'Discovery bounds 分层棘轮：每层 ±5%，最多三层，累计硬顶约 115.76。',
          en: 'Discovery bounds as a layered ratchet: ±5% per level, at most three levels, cumulative hard cap ≈ 115.76.',
        },
      },
      {
        type: 'p',
        zh: '棘轮最多三层、双向对称，累计硬顶 100 × 1.05³ ≈ 115.76。也就是：**Hyperliquid 是四家里唯一把"休市期让订单流驱动价格"写成正式机制的**——周末价格发现不是被容忍的风险，而是产品设计目标本身。慢变量（30 分钟 oracle）负责抑制单笔噪声，快变量（150 秒基差 EMA、BBO／last 中位数）让 mark 在做市商刚撤单重挂、甚至还没有新成交时就能移动。',
        en: 'The ratchet allows at most three levels, symmetric in both directions, for a cumulative hard cap of 100 × 1.05³ ≈ 115.76. In other words, **Hyperliquid is the only one of the four that writes “let order flow drive the price while the underlying is closed” into the mechanism as a formal rule** — weekend price discovery is not a tolerated risk but the product goal itself. The slow variable (the 30-minute oracle) suppresses single-print noise, while the fast variables (the 150-second basis EMA and the BBO/last median) let the mark move the instant makers cancel and requote, before any new trade prints.',
      },
      {
        type: 'p',
        zh: '**Binance** 的情况必须注明时间线。早期股票类 TradFi 永续在休市期使用 Fixed Mode——index 冻结在最后收盘价，mark 三分量里两个跟着 index，mark 就冻结。这个静态锚曾经是周末被薅故事里最显眼的角色。但自 **2026 年 5 月 16 日 00:00 UTC** 起（商品类早一周，5 月 8 日），Binance 已把股票类的休市 index 切换为 Orderbook EWMA：',
        en: '**Binance** requires a timeline. Early equity-based TradFi perpetuals used Fixed Mode while the market was closed — the index froze at the last close, two of the three mark components followed the index, and so the mark froze too. That static anchor was once the most conspicuous character in every weekend pick-off story. But since **16 May 2026, 00:00 UTC** (commodities switched a week earlier, on 8 May), Binance has moved the equity off-hours index to an Orderbook EWMA.',
      },
      { type: 'eq', id: 'binanceEwma' },
      {
        type: 'p',
        zh: '进出该模式时用 30 秒窗口在新旧模式之间线性过渡。也就是说，Binance 已经从"外部 index 冻住、天然滞后"变成"本所订单簿决定 index"的内生体系。静态锚消除了，但引入了另一种结构——薄订单簿 → EWMA index → mark／风控 → 强平与成交 → 回到薄订单簿的自循环。这一点第五节再算账。',
        en: 'Entering and leaving that mode uses a 30-second window to interpolate linearly between the old and new modes. Binance has therefore gone from “external index frozen, lag by construction” to an endogenous system in which the local order book determines the index. The static anchor is gone, but another structure has been introduced — a self-referential loop from thin book to EWMA index to mark and risk controls to liquidations and fills and back to the thin book. Section V settles that account.',
      },
      {
        type: 'p',
        zh: '**OKX** 的帮助文档写得很诚实。其指数是多价源加权：',
        en: '**OKX** is admirably candid in its help docs. Its index is a weighted blend of several price sources.',
      },
      { type: 'eq', id: 'okxIndex' },
      {
        type: 'p',
        zh: '开市时以 Pyth、Ondo 等实时股价 feed 为主；休市时权重转向**自身合约价和其他交易所的股票永续**——文档明确点名 Gate、Bitget、Hyperliquid、Binance。index 被约束在数据商最后股价 ±10% 的区间内。mark 则是 M = I + MA(Mid − I)。一个平滑加权的跟随者，在定义上不可能领先。',
        en: 'During market hours it leans on real-time equity feeds such as Pyth and Ondo; off hours the weight shifts to **its own contract price and other exchanges’ equity perpetuals** — the docs name Gate, Bitget, Hyperliquid and Binance explicitly. The index is confined to ±10% around the vendor’s last share price, and the mark is M = I + MA(Mid − I). A smoothed weighted follower cannot lead, by definition.',
      },
      {
        type: 'p',
        zh: '**Gate** 走了第四条路：把 Backed 发行的 xStocks 代币化股票现货和对应永续放进**同一个保证金体系**。永续实际写在 24/7 交易的代币化现货上，根本不需要发明合成的周末定价——现货腿周末也是活的。其 mark 同样是三分量中位数（funding 调整后的 index、index 加基差均线、last），并且规则明确写着：当外部成分不再提供有意义参考时，可主要依靠本合约报价定 mark——本地价格发现的自主权是写进规则里的。',
        en: '**Gate** took a fourth road: it put Backed-issued xStocks tokenised equity spot and the matching perpetual into **the same margin system**. The perpetual is effectively written on a tokenised spot that trades 24/7, so there is no need to invent synthetic weekend pricing at all — the spot leg is alive on Saturday too. Its mark is likewise a three-component median (funding-adjusted index, index plus a basis moving average, last), and the rules state plainly that when external components no longer provide a meaningful reference, the mark may rely primarily on the contract’s own quotes. Local price-discovery autonomy is written into the rulebook.',
      },
      { type: 'hr' },
    ],
  },

  /* ── 三 ── */
  {
    id: 'why-hl-first',
    title: {
      zh: '三、为什么总是 Hyperliquid 先动',
      en: 'III. Why Hyperliquid Always Moves First',
    },
    blocks: [
      {
        type: 'figure',
        src: 'transmission',
        alt: {
          zh: '休市期价格传导：周末新信息 → 领价订单簿 → oracle／mark → 跨所做市与套利 → 各 CEX 盘口与风险引擎 → 本所 last。',
          en: 'Off-hours price transmission: weekend news → leading order book → oracle/mark → cross-venue makers and arbitrageurs → CEX books and risk engines → local last price.',
        },
      },
      {
        type: 'p',
        zh: 'Hyperliquid 先动有三个原因叠加：',
        en: 'Three reasons stack up behind Hyperliquid moving first.',
      },
      {
        type: 'p',
        num: 1,
        zh: '**机制上它最先被允许动。** Trade.xyz 的 oracle 在休市期主动吸收本所 impact 盘口压力；OKX 的 index 是他人价格的平滑加权；Binance 切换后虽然也是本所盘口驱动，但 EWMA 的任务是拒绝瞬时噪声——滤波越强，对真新闻的响应越慢。允许价格动、且动得最快的机制，在 Hyperliquid。',
        en: '**Mechanically it is permitted to move first.** Trade.xyz’s oracle actively absorbs local impact-book pressure while the market is closed; OKX’s index is a smoothed weighting of other people’s prices; Binance, post-switch, is also driven by its local book, but the job of an EWMA is to reject transient noise — and the stronger the filter, the slower the response to genuine news. The mechanism that both permits movement and moves fastest is Hyperliquid’s.',
      },
      {
        type: 'p',
        num: 2,
        zh: '**流动性和注意力已经聚集在那里。** 股票合约这个品类一年内从小众变成主流——BitMEX 的季度报告显示，TradFi 类永续周成交量从 2025 年 12 月底的 5.3 亿美元膨胀到 2026 年 3 月中的 307 亿美元，峰值单周 545 亿——而股票永续这块的持仓高度集中。Coin Metrics 2026 年 8 月的统计：Trade.xyz 未平仓量超过 40 亿美元，2026 年 1 月以来累计撮合超 4600 亿美元，8 月已占 Hyperliquid 全站成交约 55%；Growth Mode 又把费用压低九成以上。交易者去最可能立即成交的盘口，做市商把库存和 API 资源配到最有订单流的盘口，盘口更深后又被更多做市模型当作 fair value 输入——价格发现权属于**最早承接边际知情订单、且让信息以最低冲击被表达的那本订单簿**，而这是个自强化过程。Pantera 记录的极端案例：2 月底伊朗冲突在周六早晨爆发时，Hyperliquid 是全球唯一能交易原油的场所，当日成交 37 亿美元——**周日夜里 CME 原油期货的开盘价，就开在 Hyperliquid 永续已经交易到的位置。**',
        en: '**Liquidity and attention are already there.** Equity contracts went from niche to mainstream inside a year — BitMEX’s quarterly report shows TradFi perpetual weekly volume swelling from $530M in late December 2025 to $30.7B by mid-March 2026, peaking at $54.5B in a single week — and equity-perp open interest is highly concentrated. Coin Metrics, August 2026: Trade.xyz open interest above $4B, more than $460B matched cumulatively since January 2026, and roughly 55% of all Hyperliquid volume in August, with Growth Mode cutting fees by over ninety percent. Traders go to the book most likely to fill immediately; makers allocate inventory and API budget to the book with the most order flow; a deeper book is then used as a fair-value input by more pricing models. Price discovery belongs to **the order book that absorbs the marginal informed order first and lets information be expressed at the lowest impact** — and that is a self-reinforcing process. Pantera records the extreme case: when the Iran conflict broke on a Saturday morning in late February, Hyperliquid was the only venue on earth where crude could be traded, and it did $3.7B that day — **on Sunday night, CME crude futures opened exactly where the Hyperliquid perpetual had already traded to.**',
      },
      {
        type: 'p',
        num: 3,
        zh: '**OKX 的指数公式直接引用 HL。** 所谓"传导到各 CEX"，一半是套利者搬砖，另一半是 CEX 的 index 公式在机械地抄 HL 的作业。',
        en: '**OKX’s index formula cites HL directly.** What gets called “transmission to the CEXs” is half arbitrageurs moving bricks and half CEX index formulas mechanically copying HL’s homework.',
      },
      { type: 'hr' },
    ],
  },

  /* ── 四 ── */
  {
    id: 'four-channels',
    title: {
      zh: '四、价格传导是四条通道叠加',
      en: 'IV. Transmission Runs Through Four Channels at Once',
    },
    blocks: [
      {
        type: 'p',
        zh: '价格从领价盘口进入各 CEX，至少走四条路：',
        en: 'Price travels from the leading book into the CEXs along at least four routes.',
      },
      {
        type: 'p',
        num: 1,
        zh: '**指数成分传导。** OKX 的休市 index 直接纳入 HL、Gate 的永续价——外部 index 先变，OKX 的 mark 可以在本所一笔成交都没有时就移动。',
        en: '**Index-component transmission.** OKX’s off-hours index takes in HL and Gate perpetual prices directly — the external index moves first, and OKX’s mark can move without a single local trade.',
      },
      {
        type: 'p',
        num: 2,
        zh: '**做市商参考价传导。** 大型做市商维护一个跨场统一 fair value，Trade.xyz 的可执行买卖价一变，模型立刻撤掉 Binance／OKX／Gate 上的旧单重挂。用户看到的"HL mark → CEX mark"，中间真正发生的常常是"HL BBO → 做市模型 → CEX BBO → CEX mark"，全程可以没有一笔成交。',
        en: '**Maker reference-price transmission.** Large market makers maintain a single cross-venue fair value; the moment Trade.xyz’s executable bid/ask moves, the model cancels and requotes on Binance, OKX and Gate. What users read as “HL mark → CEX mark” is usually “HL BBO → pricing model → CEX BBO → CEX mark”, with no trade occurring anywhere along the way.',
      },
      {
        type: 'p',
        num: 3,
        zh: '**跨所套利传导。** 领价场所涨了 2%、落后场所卖一只挪了 0.5%，预先在两边分好仓的账户买落后、卖领先。机会几秒内消失，临时跨链划转来不及——能稳定吃到的只有预置资金加高速撤单的玩家。',
        en: '**Cross-venue arbitrage.** The leading venue is up 2% while the laggard’s best offer has moved 0.5%; accounts pre-funded on both sides buy the laggard and sell the leader. The opportunity is gone in seconds and there is no time for an ad-hoc cross-chain transfer — only players with pre-positioned capital and fast cancels capture it consistently.',
      },
      {
        type: 'p',
        num: 4,
        zh: '**风险引擎传导。** mark 进入保证金和强平后，价格差异转化为强制订单流。周末深度薄、强平单相对盘口很大时，这条通道会把平滑的 mark 变化放大成跳跃的 last。',
        en: '**Risk-engine transmission.** Once the mark enters margin and liquidation, a price difference is converted into forced order flow. When weekend depth is thin and liquidation orders are large relative to the book, this channel amplifies a smooth mark change into a jumping last price.',
      },
      {
        type: 'p',
        zh: '一次典型的周末事件按时间展开：',
        en: 'A typical weekend event, laid out in time:',
      },
      {
        type: 'sequence',
        caption: {
          zh: '一次周末重定价的时序：领价盘口先动，做市模型与外部指数把它搬进各 CEX，最后由强平流把本所 last 补上。',
          en: 'The sequence of a weekend repricing: the leading book moves first, pricing models and external indices carry it into the CEXs, and liquidation flow finally fills in the local last price.',
        },
        actors: {
          zh: [
            ['周末新信息'],
            ['Trade.xyz / HL'],
            ['跨所做市与套利'],
            ['Binance / OKX', '盘口'],
            ['CEX mark', '与风险引擎'],
          ],
          en: [
            ['Weekend news'],
            ['Trade.xyz / HL'],
            ['Cross-venue MMs', '& arbitrageurs'],
            ['Binance / OKX', 'order books'],
            ['CEX mark', '& risk engine'],
          ],
        },
        messages: [
          {
            from: 0, to: 1, dashed: false,
            zh: ['知情单扫盘 / 迫使做市商撤单'],
            en: ['Informed orders sweep;', 'makers are forced to cancel'],
          },
          {
            from: 1, to: 1, dashed: false,
            zh: ['BBO 与 impact 先变，', 'oracle 与 mark 重算'],
            en: ['BBO and impact move first;', 'oracle and mark recompute'],
          },
          {
            from: 1, to: 2, dashed: true,
            zh: ['暴露新的可执行 fair value'],
            en: ['A new executable fair value is exposed'],
          },
          {
            from: 2, to: 3, dashed: false,
            zh: ['撤旧单，买落后场所、卖领价场所'],
            en: ['Cancel stale quotes; buy the laggard,', 'sell the leader'],
          },
          {
            from: 1, to: 4, dashed: true,
            zh: ['OKX 类场所直接吸收外部指数输入'],
            en: ['OKX-style venues absorb the external index directly'],
          },
          {
            from: 3, to: 4, dashed: false,
            zh: ['本所 BBO / impact / last 进入本地公式'],
            en: ['Local BBO / impact / last enter the local formula'],
          },
          {
            from: 4, to: 3, dashed: false,
            zh: ['保证金收缩，强平单与触发单落地'],
            en: ['Margin tightens; liquidations and', 'trigger orders land'],
          },
          {
            from: 3, to: 3, dashed: false,
            zh: ['last price 最后完成跟随'],
            en: ['Last price completes the follow'],
          },
        ],
      },
      {
        type: 'p',
        zh: 'Funding 帮不上忙：它把一段时间的 premium 积分后在离散时点交换现金流，擅长纠正持续性基差，不擅长在几秒内重写 fair value。等 funding 完整反映偏离时，传导早就结束了。',
        en: 'Funding is no help. It integrates the premium over an interval and exchanges cash flows at discrete points; it is good at correcting a persistent basis and bad at rewriting fair value inside a few seconds. By the time funding fully reflects the deviation, transmission finished long ago.',
      },
      { type: 'hr' },
    ],
  },

  /* ── 五 ── */
  {
    id: 'free-option',
    title: {
      zh: '五、滞后的 mark 是一张免费送出的期权',
      en: 'V. A Lagging Mark Is a Free Option, Given Away',
    },
    blocks: [
      {
        type: 'p',
        zh: '想象周六出了利好，真实公允价（以 HL 为代理）涨了 3%：',
        en: 'Imagine good news on a Saturday, and true fair value (proxied by HL) is up 3%.',
      },
      {
        type: 'figure',
        src: 'freeOption',
        alt: {
          zh: '滞后的 index 是一张免费期权：真实公允价跳涨 3%，被平滑的 index／mark 以已知速度收敛，缺口就是期权的赔付。',
          en: 'A lagging index is a free option: true fair value jumps 3% while the smoothed index/mark converges at a known rate, and the gap is the option’s payoff.',
        },
      },
      {
        type: 'p',
        zh: '做市商在薄簿上挂 q ± s/2，点差至少要覆盖三种成本——被知情流挑走的 adverse selection、无法即时对冲的 gap 风险、库存偏斜：',
        en: 'A maker quoting q ± s/2 on a thin book needs the spread to cover at least three costs — adverse selection from informed flow, the gap risk of being unable to hedge immediately, and inventory skew.',
      },
      { type: 'eq', id: 'spread' },
      {
        type: 'p',
        zh: '周末 Hₜ 和 Jₜ 显著上升，理性的盘口本来就该更宽更薄。被薅是在此之上三层结构性劣势的乘积：',
        en: 'Over the weekend Hₜ and Jₜ rise sharply, so a rational book should already be wider and thinner. Getting picked off is the product of three structural disadvantages layered on top of that.',
      },
      {
        type: 'p',
        zh: '**第一层：本所风险价与真实公允价脱锚。** 做市商两难——按滞后的 index／mark 附近报价，等于以旧价格卖新世界，拿 HL 行情当信号的知情 taker 持续单边吃你（对方只在价格对自己有利时来，不利时绝不出现，教科书级 pick-off）；按 HL 价格报价，则偏离 mark 太远，保证金占用和交易所价格保护制造摩擦。多数人选择拉宽点差、砍挂单量，于是簿更薄、单笔冲击更大，恶性循环。**平滑在微观结构上等价于送出一张免费期权**：标的（真实价格）在动，行权价（index／mark）被人为按慢，时间价值由做市商和被清算的散户支付。',
        en: '**Layer one: the local risk price is unmoored from true fair value.** The maker faces a dilemma. Quote near the lagging index/mark and you are selling the new world at the old price, while informed takers using HL as their signal eat you one-sidedly (they show up only when the price favours them and never when it does not — textbook pick-off). Quote at the HL price and you are too far from the mark, which creates friction through margin usage and the exchange’s own price protections. Most choose to widen the spread and cut size, so the book gets thinner, single-order impact gets larger, and the loop feeds itself. **In microstructure terms, smoothing is equivalent to writing a free option**: the underlying (the true price) is moving, the strike (index/mark) is held back deliberately, and the time value is paid by makers and by the retail accounts that get liquidated.',
      },
      {
        type: 'p',
        zh: '**第二层：滞后是可预测的。** OKX 的 EMA 加权、Binance 的 EWMA，都意味着真实价格快速移动时，本所 index 以一个**已知的、可计算的速度**追赶。滞后本身不致命，可预测的滞后才致命：套利者精确知道你的 mark 未来几分钟会向 HL 收敛，方向和幅度都是公开公式的输出。Arrakis 用修正 Hayashi-Yoshida 估计量做的跨所 lead-lag 研究展示了同一博弈在区块级别的形态——一边先动，另一边的陈旧挂单在撤单竞速失败时被 IOC 单集中收割。周末 CEX 股票永续上演的是同一出戏，只是时间尺度从几百毫秒放大到几分钟——对收割者仁慈得多。',
        en: '**Layer two: the lag is predictable.** OKX’s EMA weighting and Binance’s EWMA both mean that when the true price moves fast, the local index catches up at a **known, computable rate**. Lag alone is not fatal; predictable lag is. The arbitrageur knows precisely that your mark will converge toward HL over the next few minutes, and both direction and magnitude are outputs of a published formula. Arrakis’s cross-venue lead-lag work using a corrected Hayashi-Yoshida estimator shows the same game at block granularity — one side moves first, and the other side’s stale quotes are harvested en masse by IOC orders when the cancel race is lost. Weekend CEX equity perpetuals stage the same play, with the timescale stretched from a few hundred milliseconds to a few minutes — far kinder to the harvester.',
      },
      {
        type: 'p',
        zh: '**第三层：做市商没有对冲腿。** 开市时可对冲到真实股票或 CME 期货；周末这条腿断了，Binance／OKX 自身又没有可交易的股票现货。无对冲能力的做市商只能靠点差为库存风险定价，深度进一步塌陷。而 HL 的周末流动性由真实双向投机需求供给，Gate 的做市商有 xStocks 现货随时可对冲——这直接引出下一节。',
        en: '**Layer three: the maker has no hedge leg.** During market hours you can hedge into the real share or a CME future; over the weekend that leg is severed, and Binance and OKX have no tradable equity spot of their own. A maker who cannot hedge can only price inventory risk through the spread, and depth collapses further. HL’s weekend liquidity is supplied by genuine two-sided speculative demand, and Gate’s makers have xStocks spot available to hedge at any moment — which leads straight into the next section.',
      },
      {
        type: 'p',
        zh: 'Binance 的切换是从 Fixed Mode 到 Orderbook EWMA，消除的是最显眼的静态锚（周一开盘 index 解冻、基差一次性跳变收敛的清算事故），没有消除的是信息差。EWMA 的任务是拒绝瞬时噪声，不是识别新闻真假——当冲击真的是新信息，平滑必然表现为滞后；当本所做市商又把 HL 当参考价，Binance 最终仍会跟随，只是传导从"冻结 index 解冻跳变"换成了"做市商撤单 → impact 变化 → EWMA 爬行 → 强平自循环"。',
        en: 'Binance’s switch from Fixed Mode to Orderbook EWMA removed the most conspicuous static anchor — the Monday-open liquidation accidents where the index thawed and the basis converged in one jump. It did not remove the information asymmetry. The job of an EWMA is to reject transient noise, not to tell real news from fake; when the shock genuinely is new information, smoothing necessarily manifests as lag. And since local makers still use HL as their reference price, Binance still follows in the end — the transmission has merely changed from “frozen index thaws and jumps” to “makers cancel → impact shifts → EWMA crawls → liquidation loop”.',
      },
      {
        type: 'p',
        zh: '**反操纵滤波和快速价格发现之间没有免费午餐：滤波越强，真新闻下旧报价活得越久；滤波越弱，薄盘操纵和异常打印越容易进入强平系统**——SK Hynix 事故就是这架天平的另一端。',
        en: '**There is no free lunch between anti-manipulation filtering and fast price discovery: the stronger the filter, the longer stale quotes survive genuine news; the weaker the filter, the more easily thin-book manipulation and anomalous prints reach the liquidation engine.** The SK Hynix incident sits at the other end of that scale.',
      },
      { type: 'hr' },
    ],
  },

  /* ── 六 ── */
  {
    id: 'gate-depth',
    title: {
      zh: '六、Gate 的周末深度：现货腿活着',
      en: 'VI. Gate’s Weekend Depth: the Spot Leg Is Alive',
    },
    blocks: [
      {
        type: 'p',
        zh: 'Gate 周末量和深度更好，答案在架构而不在营销。先看已证实的数据：CryptoRank 对 2026 年 7 月末 CEX RWA 永续的统计，全部 CEX 未平仓量约 7.63 亿美元，其中 Gate 3.79 亿、占 **49.6%**，约为第二名 Bybit（1.74 亿）的 2.2 倍，Binance 1.16 亿、Bitget 0.85 亿。',
        en: 'Gate’s better weekend volume and depth is an architectural answer, not a marketing one. Start with the confirmed data: CryptoRank’s survey of CEX RWA perpetuals in late July 2026 puts total CEX open interest at about $763M, of which Gate holds $379M, or **49.6%** — roughly 2.2 times second-placed Bybit ($174M), with Binance at $116M and Bitget at $85M.',
      },
      {
        type: 'figure',
        src: 'oiSplit',
        alt: {
          zh: 'CEX RWA 永续未平仓量分布：Gate 3.788 亿、Bybit 1.744 亿、Binance 1.163 亿、Bitget 0.846 亿、其他 0.089 亿。',
          en: 'CEX RWA perpetual open interest: Gate $378.8M, Bybit $174.4M, Binance $116.3M, Bitget $84.6M, others $8.9M.',
        },
      },
      {
        type: 'p',
        zh: 'OI 比 24 小时成交量更有解释力：成交量可以由同一笔资金反复周转、受激励和口径影响；OI 更接近"有多少资本愿意把风险留在这里，跨过夜和周末"。近一半 CEX RWA 持仓集中在一处时，做市商更容易找到双边流量和对手盘，交易者又因盘口更好继续迁入——liquidity begets liquidity。而这个集中不是凭空来的，背后是三个复利效应：',
        en: 'Open interest explains more than 24-hour volume: volume can be churned by the same capital repeatedly and is sensitive to incentives and definitions, while OI is closer to “how much capital is willing to leave risk here overnight and over the weekend”. When nearly half of all CEX RWA positioning sits in one place, makers find two-sided flow and counterparties more easily, and traders migrate toward the better book — liquidity begets liquidity. That concentration did not come from nowhere; three compounding effects sit behind it.',
      },
      {
        type: 'p',
        num: 1,
        zh: '**做市商在周末有活的对冲腿。** Gate 最早（2025 年 7 月起）把 xStocks 现货和永续放进同一账户体系。在 Gate 做 TSLA 永续的市商，库存偏了可以立刻在同一保证金账户买卖 TSLAx 现货——delta 中性、无跨所划转、无银行时滞。Blockworks 点破：这"消除了合成周末定价的需要，并实现原子化跨保证金，xStocks 可直接作为 delta 中性 carry 交易的抵押品"。能对冲就敢报深度，敢报深度就有成交——正是别家周末缺失的那条正循环。当然，周末 tokenized 现货未必能无摩擦赎回真实股票，但它至少给了一条 24/7 同场可交易的腿，且风险在账户层净额化。',
        en: '**Makers have a live hedge leg over the weekend.** Gate was first, from July 2025, to put xStocks spot and perpetuals into a single account system. A maker running TSLA perpetuals on Gate whose inventory skews can immediately buy or sell TSLAx spot in the same margin account — delta neutral, no cross-venue transfer, no banking lag. Blockworks puts it plainly: this “removes the need for synthetic weekend pricing and enables atomic cross-margin, with xStocks usable directly as collateral for delta-neutral carry trades”. A maker who can hedge dares to quote depth, and depth brings fills — exactly the virtuous loop the other venues lack on a Saturday. Granted, a tokenised spot may not redeem frictionlessly into the real share over the weekend, but it at least provides a 24/7 leg on the same venue, with risk netted at the account level.',
      },
      {
        type: 'p',
        num: 2,
        zh: '**它的 mark 有真锚。** 别家周末在自指涉（Coinbase 干脆明说：周末 index 是本所 mark 的 1 小时 EMA 加 xStocks feed，周日晚再用 30 分钟线性桥接回真实股价），Gate 的永续始终有同场真实成交的现货价可收敛，操纵成本高得多，做市商报价风险因此更低。',
        en: '**Its mark has a real anchor.** Everyone else is self-referential on a weekend — Coinbase says so outright: the weekend index is a one-hour EMA of its own mark plus an xStocks feed, bridged back to the real share price over thirty minutes on Sunday night. Gate’s perpetual always has a genuinely traded on-venue spot price to converge to. Manipulation costs far more, and makers therefore carry less quoting risk.',
      },
      {
        type: 'p',
        num: 3,
        zh: '**它在传导图里是上游节点。** 回看 OKX 文档：休市期指数明确纳入"Gate、Bitget 的股票永续价"。Gate 不是价格接受者而是输出者之一——上游节点天然获得知情流，知情流对做市商是成本，对交易场所却是成交量。此外它快速铺开韩国、日本、香港股票和 quanto 永续，让用户用 USDT 直接表达本币股票观点，亚洲时段的自然双边流又补上了别家只有单边 taker 的时间窗。',
        en: '**It is an upstream node in the transmission graph.** Look again at OKX’s docs: the off-hours index explicitly includes “Gate and Bitget equity perpetual prices”. Gate is not a price taker but one of the outputs — and an upstream node naturally receives informed flow. Informed flow is a cost to makers but volume to a venue. It has also rolled out Korean, Japanese and Hong Kong equities and quanto perpetuals quickly, letting users express a local-currency equity view directly in USDT, so natural two-sided flow in Asian hours fills the window in which other venues see only one-sided takers.',
      },
      {
        type: 'figure',
        src: 'weekdayWeekend',
        alt: {
          zh: 'RWA 永续工作日与周末日均成交对比：工作日约 84 亿美元，周末约 13 亿，约 6.5 倍落差。',
          en: 'RWA perpetual average daily volume, weekday versus weekend: about $8.4B against about $1.3B, a roughly 6.5× drop.',
        },
      },
      {
        type: 'p',
        zh: '保留一个诚实的限定：OI 集中证明 Gate 聚集了最多愿意持仓的 CEX RWA 资本，不证明它在每只股票、每个周末、每个订单规模上都最深。7 月末 RWA 永续工作日日均量约 84 亿美元、周末仅约 13 亿，整体缩到六分之一；某些美股 megacap、某些新闻时点，Binance 或 HL 仍可能更深。真正的深度比较要用相同 ticker 的 spread、±10/25/50bp 内累计美元深度、固定名义冲击成本和扫单后的补单速度来做，不能只看网页上的 24h volume 标签。',
        en: 'One honest qualification: concentrated OI proves that Gate has gathered the most CEX RWA capital willing to hold a position; it does not prove Gate is deepest for every ticker, every weekend and every order size. In late July, RWA perpetual volume averaged about $8.4B per weekday against roughly $1.3B per weekend day, shrinking to a sixth overall; for certain US megacaps and certain news moments, Binance or HL may still be deeper. A real depth comparison uses, for the same ticker, the spread, cumulative dollar depth within ±10/25/50bp, impact cost at a fixed notional and replenishment speed after a sweep — not the 24h volume label on a web page.',
      },
      { type: 'hr' },
    ],
  },

  /* ── 七 ── */
  {
    id: 'implications',
    title: {
      zh: '七、可交易的推论',
      en: 'VII. Tradable Implications',
    },
    blocks: [
      {
        type: 'p',
        zh: '四个现象是同一枚硬币：**休市期间，价格只能住在允许它移动、且移动有锚的地方。** Hyperliquid 用 internal pricing 和 discovery bounds 给了价格移动的许可，且资本已聚集在那里，所以先动；OKX 的指数公式、跨场做市商的统一 fair value、预置资金的套利者和强平引擎，把 HL 的价格沿四条通道搬进各 CEX，所以传导路径固定；平滑滤波把可预测的收敛送给拿 HL 当信号源的对手方，所以周末做市总在被薅；Gate 让现货腿在周末活着，做市商有锚有对冲，所以量和深度反而更好。',
        en: 'The four phenomena are one coin: **while the underlying is closed, price can only live where it is permitted to move and where movement has an anchor.** Hyperliquid grants that permission through internal pricing and discovery bounds, and capital has already gathered there, so it moves first. OKX’s index formula, cross-venue makers’ unified fair value, pre-funded arbitrageurs and liquidation engines carry HL’s price into the CEXs along four channels, so the transmission path is fixed. Smoothing filters hand a predictable convergence to counterparties using HL as their signal, so weekend market making keeps getting picked off. Gate keeps the spot leg alive over the weekend, so its makers have both an anchor and a hedge — and its volume and depth are better for it.',
      },
      {
        type: 'p',
        zh: '几条可操作的推论：',
        en: 'A few actionable implications:',
      },
      {
        type: 'p',
        num: 1,
        zh: '**周末做 CEX 股票永续的 taker**，信号源应该是 HL 的 oracle（而非 mark 或 last），对象优先选滤波最重、盘口最薄的场所。但要把两类风险计入：滤波保护你不被周末噪声强平的同时，也意味着真新闻的重定价会以强平流的形式集中到账；而 HL 侧的 oracle 也可能被薄外部盘口带崩（SK Hynix 式事故），先动的信号源不是无条件可信的。',
        en: '**Taking liquidity in CEX equity perpetuals over the weekend**: your signal should be HL’s oracle (not its mark or last), and your targets should be the venues with the heaviest filtering and the thinnest books. But price in two risks: the filter that protects you from being liquidated by weekend noise also means that the repricing of genuine news arrives all at once as liquidation flow; and HL’s own oracle can be dragged off by a thin external book (the SK Hynix-style accident). The signal source that moves first is not unconditionally trustworthy.',
      },
      {
        type: 'p',
        num: 2,
        zh: '**在 Binance／OKX 做周末被动做市大概率是负期望**，除非点差宽到覆盖 adverse selection。要提供周末流动性，Gate（有现货对冲）或 HL（有真实双向流）才是结构上站得住的位置。',
        en: '**Passive weekend market making on Binance or OKX is probably negative expectancy**, unless the spread is wide enough to cover adverse selection. If you want to supply weekend liquidity, Gate (with a spot hedge) or HL (with genuine two-sided flow) are the structurally defensible places to stand.',
      },
      {
        type: 'p',
        num: 3,
        zh: '**盯住两个机制拐点。** 其一，Binance 2026-05-16 已把股票类切到 Orderbook EWMA，最肥的"冻结套利"窗口已经关了，剩下的是滤波滞后套利——更窄，但结构还在；下一个值得盯的是 EWMA 参数和各家滤波强度的调整公告，每次调整都在重新分配"抗操纵 vs 抗滞后"这架天平。其二，HL 的 discovery bounds 硬顶（约 ±15.76%）意味着极端周末行情里 HL 价格会被封顶，此时 Gate 的 xStocks 现货反而成为唯一不受人为上限约束的价格发现场所——0xArchive 对霍尔木兹危机周末的复盘正是这个尾部场景的预演。',
        en: '**Watch two mechanism inflection points.** First, Binance moved equities to Orderbook EWMA on 2026-05-16, closing the fattest “frozen index” window; what remains is filter-lag arbitrage — narrower, but structurally intact. The next thing worth watching is announcements changing EWMA parameters and filter strength at each venue, since every adjustment re-allocates the anti-manipulation versus anti-lag trade-off. Second, HL’s discovery-bounds hard cap (about ±15.76%) means HL’s price gets capped in an extreme weekend move, at which point Gate’s xStocks spot becomes the only price-discovery venue not bound by an artificial ceiling — 0xArchive’s post-mortem of the Hormuz crisis weekend is a rehearsal of exactly that tail scenario.',
      },
      {
        type: 'p',
        num: 4,
        zh: '**想把"感觉谁先动"变成证据**，对同一 ticker 同时采集各所的 bid/ask、impact、last、index/oracle、mark、强平打印（统一 numeraire 和时间戳），围绕周末跳价识别"第一跳"，再做 lead-lag 回归或 Hasbrouck information share；被薅程度直接用成交后 1s/5s/30s 的 taker signed markout 量化。日常观察时，这张对照表就够用了：',
        en: '**To turn “it feels like X moves first” into evidence**, capture bid/ask, impact, last, index/oracle, mark and liquidation prints for the same ticker across venues simultaneously (with a single numeraire and clock), identify the “first jump” around weekend repricings, then run a lead-lag regression or a Hasbrouck information share. Quantify how badly you are picked off with taker signed markout at 1s/5s/30s after the fill. For day-to-day observation, this table is enough:',
      },
      {
        type: 'table',
        headers: {
          zh: ['观测', '它真正回答的问题'],
          en: ['What you observe', 'What it actually answers'],
        },
        rows: {
          zh: [
            ['mark 先变，BBO 与 last 未变', '外部 index/oracle 或推送先更新'],
            ['BBO 先变，无成交', '做市商已引用别处 fair value 撤单重挂'],
            ['last 先变，mark 慢慢跟', '本所主动单先价格发现，风险价在滤波'],
            ['mark 先变，随后出现强平打印', '外部风险价通过强平驱动本所成交'],
            ['价差收敛但单边深度不恢复', '套利完成了价格同步，库存风险仍在'],
            ['扫单后迅速补单', '真正的韧性深度，而非静态挂单截图'],
          ],
          en: [
            ['Mark moves first; BBO and last do not', 'The external index/oracle — or just the feed — updated first'],
            ['BBO moves first, no trade', 'Makers have cancelled and requoted off someone else’s fair value'],
            ['Last moves first, mark follows slowly', 'Local aggressive orders discovered the price; the risk price is filtering'],
            ['Mark moves first, then liquidation prints appear', 'An external risk price is driving local fills through liquidation'],
            ['The spread converges but one-sided depth does not recover', 'Arbitrage synchronised the price; inventory risk remains'],
            ['Size is replenished quickly after a sweep', 'Genuine resilient depth, not a screenshot of resting orders'],
          ],
        },
      },
      {
        type: 'p',
        zh: '判断谁在领价，不要盯着一个 mark 数字，沿着链条回溯：**哪本订单簿先撤掉旧报价，哪个 oracle 把它写进风险价，哪家交易所直接引用了它，最后是谁的强平单把本所 last 推过去。** 四步分开，周末盘面就不混乱了。',
        en: 'To work out who is leading, do not stare at a single mark number — walk back along the chain: **which book cancelled its stale quotes first, which oracle wrote that into a risk price, which exchange cited it directly, and finally whose liquidation orders pushed the local last across.** Separate those four steps and the weekend screen stops being confusing.',
      },
      { type: 'hr' },
    ],
  },

  /* ── 参考材料 ── */
  {
    id: 'sources',
    title: {
      zh: '主要参考材料',
      en: 'Primary Sources',
    },
    blocks: [
      {
        type: 'ul',
        items: {
          zh: [
            'Binance, [Important Updates on Price Index Calculation Mode of Equity-Based TradFi Perpetual Contracts](https://www.binance.com/en/support/announcement/detail/53bfc17634f54f2f90666dbc396f5cee)（2026-05-16 起股票类切换 Orderbook EWMA）；[Clearing Procedures](https://bin.bnbstatic.com/static/cms/cg08ou2ak0tn7mcplvfg/file/c8f87450c656663581984dc71672633398d1bd79e26b5981433ed01ab110c7c9.pdf)',
            'Trade.xyz Docs：[Mark Price](https://docs.trade.xyz/perp-mechanics/mark-price) / [Oracle Price](https://docs.trade.xyz/perp-mechanics/oracle-price) / [Discovery Bounds](https://docs.trade.xyz/perp-mechanics/discovery-bounds) / [Oracle Time Constant Update](https://docs.trade.xyz/changelog/oracle-time-constant-update)',
            'Hyperliquid Docs：[HIP-3: Builder-deployed perpetuals](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals)，*Robust Price Indices*',
            'OKX Help Center, [Stock perpetuals](https://www.okx.com/en-ae/help/stock-perpetuals)（指数成分、休市加权与 ±10% index bands）',
            'Gate Help Center, [Index Price Calculation](https://www.gate.com/help/futures/logical/22069/index-price-calculation) / [Mark Price Calculation](https://www.gate.com/help/futures/Logical/22067/Instructions-of-Dual-Price-Mechanism-Mark-Price-Last-Traded-Price)；[Unified Account](https://www.gate.com/unified-trading-account)',
            'Coinbase Help, *How do stock perpetual futures stay in line with the underlying*（周末混合指数与 30 分钟桥接）',
            'Messari / Blockworks, *Price Discovery in Hyperliquid’s Weekend Markets*（614 个市场-周末实证）；Blockworks Research, *Equity Perpetuals Landscape Report*',
            'Coin Metrics, [Trade.xyz’s Role in Hyperliquid](https://coinmetrics.substack.com/p/tradexyzs-role-in-hyperliquid)（2026-08-18，OI 与成交份额）',
            'CryptoRank, [July 2026 Crypto Exchange Recap](https://cryptorank.io/insights/reports/july-2026-crypto-exchange-recap)（CEX RWA 永续 OI 分布与周末缩量）',
            'Galaxy Research, [Hyperliquid Perps Deployer TradeXYZ Eats a $60M Oracle Mistake](https://www.galaxy.com/insights/research/hyperliquid-tradexyz-oracle-liquidations)（SK Hynix 事故）',
            'Pantera Capital, *Housing All of Finance: The Rise of Perps and Hyperliquid*（伊朗冲突周末原油案例）',
            '0xArchive, *Hyperliquid Weekend Price Discovery in 24/7 Markets*（discovery bounds 约束下的危机周末复盘）',
            'Talos, *State of the Network: Pre-IPO Price Discovery on Crypto Rails*（SpaceX perp）',
            'Arrakis Finance, cross-venue lead-lag estimation（Hayashi-Yoshida 与 stale quote 收割）',
            'BitMEX, [Q1 2026 Derivatives Report](https://www.bitmex.com/blog/2026q1-derivatives-report)（TradFi 永续成交量）',
          ],
          en: [
            'Binance, [Important Updates on Price Index Calculation Mode of Equity-Based TradFi Perpetual Contracts](https://www.binance.com/en/support/announcement/detail/53bfc17634f54f2f90666dbc396f5cee) (equities switched to Orderbook EWMA on 2026-05-16); [Clearing Procedures](https://bin.bnbstatic.com/static/cms/cg08ou2ak0tn7mcplvfg/file/c8f87450c656663581984dc71672633398d1bd79e26b5981433ed01ab110c7c9.pdf)',
            'Trade.xyz Docs: [Mark Price](https://docs.trade.xyz/perp-mechanics/mark-price) / [Oracle Price](https://docs.trade.xyz/perp-mechanics/oracle-price) / [Discovery Bounds](https://docs.trade.xyz/perp-mechanics/discovery-bounds) / [Oracle Time Constant Update](https://docs.trade.xyz/changelog/oracle-time-constant-update)',
            'Hyperliquid Docs: [HIP-3: Builder-deployed perpetuals](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals), *Robust Price Indices*',
            'OKX Help Center, [Stock perpetuals](https://www.okx.com/en-ae/help/stock-perpetuals) (index components, off-hours weighting and ±10% index bands)',
            'Gate Help Center, [Index Price Calculation](https://www.gate.com/help/futures/logical/22069/index-price-calculation) / [Mark Price Calculation](https://www.gate.com/help/futures/Logical/22067/Instructions-of-Dual-Price-Mechanism-Mark-Price-Last-Traded-Price); [Unified Account](https://www.gate.com/unified-trading-account)',
            'Coinbase Help, *How do stock perpetual futures stay in line with the underlying* (weekend composite index and the 30-minute bridge)',
            'Messari / Blockworks, *Price Discovery in Hyperliquid’s Weekend Markets* (614 market-weekends); Blockworks Research, *Equity Perpetuals Landscape Report*',
            'Coin Metrics, [Trade.xyz’s Role in Hyperliquid](https://coinmetrics.substack.com/p/tradexyzs-role-in-hyperliquid) (2026-08-18; OI and volume share)',
            'CryptoRank, [July 2026 Crypto Exchange Recap](https://cryptorank.io/insights/reports/july-2026-crypto-exchange-recap) (CEX RWA perp OI split and weekend contraction)',
            'Galaxy Research, [Hyperliquid Perps Deployer TradeXYZ Eats a $60M Oracle Mistake](https://www.galaxy.com/insights/research/hyperliquid-tradexyz-oracle-liquidations) (the SK Hynix incident)',
            'Pantera Capital, *Housing All of Finance: The Rise of Perps and Hyperliquid* (the Iran-conflict weekend crude case)',
            '0xArchive, *Hyperliquid Weekend Price Discovery in 24/7 Markets* (a crisis weekend under discovery-bounds constraints)',
            'Talos, *State of the Network: Pre-IPO Price Discovery on Crypto Rails* (the SpaceX perp)',
            'Arrakis Finance, cross-venue lead-lag estimation (Hayashi-Yoshida and stale-quote harvesting)',
            'BitMEX, [Q1 2026 Derivatives Report](https://www.bitmex.com/blog/2026q1-derivatives-report) (TradFi perpetual volume)',
          ],
        },
      },
      {
        type: 'note',
        zh: '注：产品规则变化很快——Binance 在 2026 年 5 月已两次修改休市 index 模式（5/8 商品类、5/16 股票类）。引用任何机制细节前，应重新核对各所最新公告。',
        en: 'Note: these product rules change fast — Binance revised its off-hours index mode twice in May 2026 alone (commodities on the 8th, equities on the 16th). Re-check each venue’s latest announcements before citing any mechanism detail.',
      },
    ],
  },
];
