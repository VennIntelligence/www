import { useLanguage } from '../../../../context/useLanguage';
import { UI, SECTIONS } from './content';
import fig01a from '../../../../assets/blog/five-backtest-traps/fig01a_information_time.webp';
import fig01c from '../../../../assets/blog/five-backtest-traps/fig01c_execution.webp';
import fig01d from '../../../../assets/blog/five-backtest-traps/fig01d_repaint.webp';
import fig03 from '../../../../assets/blog/five-backtest-traps/fig03_multiple_comparisons.webp';
import fig03b from '../../../../assets/blog/five-backtest-traps/fig03b_placebo_anatomy.webp';
import fig04 from '../../../../assets/blog/five-backtest-traps/fig04_grid_peak_plateau.webp';
import fig05 from '../../../../assets/blog/five-backtest-traps/fig05_variance_wall.webp';
import fig06 from '../../../../assets/blog/five-backtest-traps/fig06_lucky_champion.webp';
import fig07 from '../../../../assets/blog/five-backtest-traps/fig07_survivor_streaks.webp';
import fig08 from '../../../../assets/blog/five-backtest-traps/fig08_verification_paradox.webp';
import fig09 from '../../../../assets/blog/five-backtest-traps/fig09_effective_n.webp';
import fig10 from '../../../../assets/blog/five-backtest-traps/fig10_turkey.webp';
import fig12 from '../../../../assets/blog/five-backtest-traps/fig12_slope_walker.webp';
import fig13 from '../../../../assets/blog/five-backtest-traps/fig13_virtue_civilizations_spotlight_candidate.webp';

/**
 * /blog/five-backtest-traps —— 长文随笔排版。
 * 全文静态：章节标题 → 段落（可带 1/2/3 编号）→ 配图（webp，图注保留原文图号）。
 * 正文全部来自 content.js，中英共用同一套渲染逻辑。
 * 页面主题沿用博客默认 'paper'（浅色纸面，见 blog-paper-theme.css）。
 */

const FIGURES = {
  fig01a, fig01c, fig01d, fig03, fig03b, fig04, fig05,
  fig06, fig07, fig08, fig09, fig10, fig12, fig13,
};

/** 行内标记：**加粗** → <strong>，*斜体* → <em>，`等宽` → <code> */
function fmt(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
}

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
        <figure className="blog-figure" id={`fig-${block.label}`}>
          <img src={FIGURES[block.src]} alt={block.alt[lang]} loading="lazy" decoding="async" />
          <figcaption>
            <strong>
              {UI.fig[lang]} {block.label}
              {lang === 'zh' ? '：' : '.'}
            </strong>{' '}
            {fmt(block.caption[lang])}
          </figcaption>
        </figure>
      );
    case 'hr':
      return <hr className="blog-hr" />;
    default:
      return null;
  }
}

export default function FiveBacktestTraps() {
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
