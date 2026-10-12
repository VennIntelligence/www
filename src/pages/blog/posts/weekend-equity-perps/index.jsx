import { useLanguage } from '../../../../context/useLanguage';
import { SECTIONS } from './content';
import priceLayers from '../../../../assets/blog/weekend-equity-perps/price_layers.svg';
import discoveryBounds from '../../../../assets/blog/weekend-equity-perps/discovery_bounds.svg';
import transmission from '../../../../assets/blog/weekend-equity-perps/weekend_price_transmission.svg';
import freeOption from '../../../../assets/blog/weekend-equity-perps/free_option_gap.svg';
import oiSplit from '../../../../assets/blog/weekend-equity-perps/cex_rwa_perp_oi.svg';
import weekdayWeekend from '../../../../assets/blog/weekend-equity-perps/weekday_vs_weekend_volume.svg';

/**
 * /blog/weekend-equity-perps —— 机制分析长文排版。
 * 全文静态：章节 → 段落／编号要点 → 配图（原文自带标题图例的 SVG，故无 figcaption）
 * → 公式 → 箭头链路 → 表格 → 时序图 → 参考材料。正文全部来自 content.js。
 *
 * 站点没有 KaTeX / mermaid 依赖，两者都用零依赖方式实现：
 *   公式  语义化 HTML + Unicode 数学字符（随正文字号缩放，主题色自动继承）
 *   时序图 手绘 SVG，参与者与消息文案同样来自 content.js，中英各排一次
 */

const FIGURES = { priceLayers, discoveryBounds, transmission, freeOption, oiSplit, weekdayWeekend };

/** 行内标记：**加粗**、*斜体*、`等宽`、[文字](链接) */
function fmt(text) {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
    .map((part, i) => {
      if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
      if (part.startsWith('[')) {
        const [, label, href] = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        );
      }
      if (part.startsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
      return part;
    });
}

/* ══════════════ 公式 ══════════════ */

/** 变量：斜体正文 + 可选上/下标 */
function V({ n, sup, sub }) {
  return (
    <i className="eq-v">
      {n}
      {sup && <sup>{sup}</sup>}
      {sub && <sub>{sub}</sub>}
    </i>
  );
}

/** 函数名：正体，不斜 */
const F = ({ children }) => <span className="eq-f">{children}</span>;

const EQUATIONS = {
  /* Trade.xyz 标记价 = 三分量中位数。原文用 \underbrace 标 (1)(2)(3)，
     这里改成"主式 + 三条分量"，与后文"(1) 是外部锚…"的指代一一对应 */
  mark: () => (
    <>
      <div className="blog-eq__main">
        <V n="Mark" /> = <F>median</F>( ①, ②, ③ )
      </div>
      <ol className="blog-eq__terms">
        <li>
          <span className="blog-eq__tag">①</span>
          <V n="P" sub="oracle" />
        </li>
        <li>
          <span className="blog-eq__tag">②</span>
          <V n="P" sub="oracle" /> + <F>EMA</F>
          <sub>150s</sub>(<V n="P" sub="mid" /> − <V n="P" sub="oracle" />)
        </li>
        <li>
          <span className="blog-eq__tag">③</span>
          <F>median</F>(<V n="bid" sub="1" />, <V n="ask" sub="1" />, <V n="last" />)
        </li>
      </ol>
    </>
  ),

  /* 内部 oracle 的 impact 盘口压力 */
  ipd: () => (
    <div className="blog-eq__main">
      <V n="IPD" sub="t" /> = <F>max</F>(<V n="P" sup="impactBid" sub="t" /> − <V n="O" sub="t−1" />, 0) −{' '}
      <F>max</F>(<V n="O" sub="t−1" /> − <V n="P" sup="impactAsk" sub="t" />, 0)
    </div>
  ),

  /* 连续时间 EMA 推进 */
  oracleEma: () => (
    <div className="blog-eq__main">
      <V n="O" sub="t" /> = <V n="O" sub="t−1" /> + (1 − <i className="eq-v">e</i>
      <sup>−Δt/τ</sup>) · <V n="IPD" sub="t" />
      <span className="blog-eq__where">τ = 30 min</span>
    </div>
  ),

  /* Binance 休市 Orderbook EWMA */
  binanceEwma: () => (
    <>
      <div className="blog-eq__main">
        <V n="I" sup="BN" sub="raw, t" /> = ( <V n="ImpactBid" sub="t" /> + <V n="ImpactAsk" sub="t" /> ) / 2
      </div>
      <div className="blog-eq__main">
        <V n="I" sup="BN" sub="weekend, t" /> = <F>EWMA</F>(<V n="I" sup="BN" sub="raw, t" />)
      </div>
    </>
  ),

  /* OKX 多价源加权指数 */
  okxIndex: ({ lang }) => (
    <>
      <div className="blog-eq__main">
        <V n="I" sub="OKX" /> = <span className="eq-big">Σ</span>
        <sub>i</sub> <V n="w" sub="i" /> · <i className="eq-v">P̃</i>
        <sub>i</sub>
      </div>
      <div className="blog-eq__main">
        <i className="eq-v">P̃</i>
        <sub>i</sub> = <F>EMA</F>(<V n="P" sub="i" />)
        <span className="blog-eq__where">
          {lang === 'zh' ? '低流动性成分做平滑' : 'low-liquidity components are smoothed'}
        </span>
      </div>
    </>
  ),

  /* 做市点差下界 */
  spread: () => (
    <div className="blog-eq__main">
      <V n="s" sub="t" /> ≳ 2( <V n="A" sub="t" /> + <V n="H" sub="t" /> + λ|<V n="Inv" sub="t" />| +{' '}
      <V n="J" sub="t" /> )
    </div>
  ),
};

/* ══════════════ 时序图（原文 mermaid sequenceDiagram 的手绘 SVG 版） ══════════════ */

/* 画布与排版常量：改这里即可整体调宽窄／疏密 */
const SEQ_W = 940; // viewBox 宽度
const SEQ_PAD = 16; // 左右留白
const SEQ_HEAD_H = 50; // 参与者标题框高度
const SEQ_LINE_H = 15; // 消息文案行高
const SEQ_LOOP_W = 46; // 自消息回环宽度

/**
 * 逐条消息排版（纯函数，组件外求值）：
 * 非自消息文案排在箭头上方，自消息文案排在回环右侧；返回排好的消息与画布总高。
 */
function layoutMessages(messages, lang) {
  let y = SEQ_HEAD_H + 26;
  const laid = [];
  for (const m of messages) {
    const lines = m[lang];
    const labelH = lines.length * SEQ_LINE_H;
    const self = m.from === m.to;
    const item = self
      ? { ...m, lines, self, arrowY: y + 8, labelY: y + 6 }
      : { ...m, lines, self, arrowY: y + labelH + 10, labelY: y + 4 };
    y = self ? y + Math.max(46, labelH + 22) : item.arrowY + 20;
    laid.push(item);
  }
  return { laid, height: y + 8 };
}

function SequenceDiagram({ block, lang }) {
  const actors = block.actors[lang];
  const laneW = (SEQ_W - 2 * SEQ_PAD) / actors.length;
  const laneX = (i) => SEQ_PAD + laneW * (i + 0.5);
  const { laid, height } = layoutMessages(block.messages, lang);

  return (
    <svg className="blog-seq__svg" viewBox={`0 0 ${SEQ_W} ${height}`} role="img" aria-label={block.caption[lang]}>
      <defs>
        <marker id="seq-head" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 z" fill="var(--seq-accent)" />
        </marker>
      </defs>

      {/* 参与者标题框 + 生命线 */}
      {actors.map((label, i) => (
        <g key={i}>
          <rect
            x={laneX(i) - laneW / 2 + 8}
            y="6"
            width={laneW - 16}
            height={SEQ_HEAD_H - 12}
            rx="6"
            fill="var(--seq-box)"
            stroke="var(--seq-rule)"
          />
          {label.map((line, k) => (
            <text
              key={k}
              x={laneX(i)}
              y={6 + (SEQ_HEAD_H - 12) / 2 + 4 - ((label.length - 1) * 14) / 2 + k * 14}
              textAnchor="middle"
              className="blog-seq__actor"
            >
              {line}
            </text>
          ))}
          <line
            x1={laneX(i)}
            y1={SEQ_HEAD_H}
            x2={laneX(i)}
            y2={height - 6}
            stroke="var(--seq-rule)"
            strokeDasharray="4 5"
          />
        </g>
      ))}

      {/* 消息 */}
      {laid.map((m, i) => {
        const x1 = laneX(m.from);
        const dash = m.dashed ? '6 5' : undefined;
        if (m.self) {
          const x2 = x1 + SEQ_LOOP_W;
          return (
            <g key={i}>
              <path
                d={`M ${x1} ${m.arrowY} H ${x2} V ${m.arrowY + 24} H ${x1 + 3}`}
                fill="none"
                stroke="var(--seq-accent)"
                strokeWidth="1.4"
                strokeDasharray={dash}
                markerEnd="url(#seq-head)"
              />
              {m.lines.map((line, k) => (
                <text
                  key={k}
                  x={x2 + 12}
                  y={m.labelY + 12 + k * SEQ_LINE_H}
                  className="blog-seq__msg"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        }
        const dir = m.to > m.from ? 1 : -1;
        const x2 = laneX(m.to) - dir * 4;
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={m.arrowY}
              x2={x2}
              y2={m.arrowY}
              stroke="var(--seq-accent)"
              strokeWidth="1.4"
              strokeDasharray={dash}
              markerEnd="url(#seq-head)"
            />
            {m.lines.map((line, k) => (
              <text
                key={k}
                x={(x1 + x2) / 2}
                y={m.labelY + 10 + k * SEQ_LINE_H}
                textAnchor="middle"
                className="blog-seq__msg"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/* ══════════════ 块渲染 ══════════════ */

function Block({ block, lang }) {
  switch (block.type) {
    case 'p':
      return block.num ? (
        <p className="blog-p blog-p--num">
          <span className="blog-p__num">{block.num}.</span>
          {fmt(block[lang])}
        </p>
      ) : (
        <p className="blog-p">{fmt(block[lang])}</p>
      );

    case 'figure':
      return (
        <figure className="blog-figure blog-figure--plain">
          <img src={FIGURES[block.src]} alt={block.alt[lang]} loading="lazy" decoding="async" />
        </figure>
      );

    case 'eq': {
      const Eq = EQUATIONS[block.id];
      return (
        <div className="blog-eq">
          <Eq lang={lang} />
        </div>
      );
    }

    case 'flow':
      return (
        <div className="blog-flow">
          {block.nodes[lang].map((node, i) => (
            <span key={i} className="blog-flow__node">
              {node}
            </span>
          ))}
        </div>
      );

    case 'table':
      return (
        <div className="blog-table">
          <table>
            <thead>
              <tr>
                {block.headers[lang].map((hd, i) => (
                  <th key={i}>{hd}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows[lang].map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{fmt(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'sequence':
      return (
        <figure className="blog-seq">
          <div className="blog-seq__scroll">
            <SequenceDiagram block={block} lang={lang} />
          </div>
          <figcaption>{block.caption[lang]}</figcaption>
        </figure>
      );

    case 'ul':
      return (
        <ul className="blog-ul">
          {block.items[lang].map((item, i) => (
            <li key={i}>{fmt(item)}</li>
          ))}
        </ul>
      );

    case 'note':
      return <p className="blog-note">{fmt(block[lang])}</p>;

    case 'hr':
      return <hr className="blog-hr" />;

    default:
      return null;
  }
}

export default function WeekendEquityPerps() {
  const { lang } = useLanguage();
  return (
    <>
      {SECTIONS.map((sec) => (
        <section key={sec.id} id={sec.id}>
          {sec.title && <h2 className="blog-h2">{sec.title[lang]}</h2>}
          {sec.blocks.map((block, i) => (
            <Block key={i} block={block} lang={lang} />
          ))}
        </section>
      ))}
    </>
  );
}
