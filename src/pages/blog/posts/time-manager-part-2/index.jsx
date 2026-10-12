import { useLanguage } from '../../../../context/useLanguage';
import { UI, FRONT, SECTIONS } from './content';
import fig01 from '../../../../assets/blog/time-manager-part-2/fig-01.svg';
import fig02 from '../../../../assets/blog/time-manager-part-2/fig-02.svg';
import fig03 from '../../../../assets/blog/time-manager-part-2/fig-03.svg';
import fig04 from '../../../../assets/blog/time-manager-part-2/fig-04.svg';
import fig05 from '../../../../assets/blog/time-manager-part-2/fig-05.svg';
import fig06 from '../../../../assets/blog/time-manager-part-2/fig-06.svg';
import fig07 from '../../../../assets/blog/time-manager-part-2/fig-07.svg';
import fig08 from '../../../../assets/blog/time-manager-part-2/fig-08.svg';
import fig09 from '../../../../assets/blog/time-manager-part-2/fig-09.svg';
import '../../../../styles/pages/blog-paper.css';

/**
 * /blog/time-manager-part-2 — 技术报告 / 系统分析论文排版。
 * 全文静态：摘要 → 编号章节 → 图（matplotlib SVG，scripts/figures/ 生成）
 * → 表（罗马数字编号）→ 代码清单。正文全部来自 content.js。
 * 页面主题：meta.theme = 'paper'（整站浅色，见 blog-paper-theme.css）。
 */

const FIGURES = { fig01, fig02, fig03, fig04, fig05, fig06, fig07, fig08, fig09 };

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** 行内标记：`code` → <code>，**text** → <strong> */
function fmt(text) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

/** 按出现顺序为图 / 表 / 代码清单分配编号（与正文中的 Fig. n / Table n / Listing n 一致） */
function numberBlocks(sections) {
  const counters = { figure: 0, table: 0, listing: 0 };
  return sections.map((sec) => ({
    ...sec,
    blocks: sec.blocks.map((block) => {
      if (block.type in counters) {
        counters[block.type] += 1;
        return { ...block, n: counters[block.type] };
      }
      return block;
    }),
  }));
}

const NUMBERED = numberBlocks(SECTIONS);

function Block({ block, lang }) {
  switch (block.type) {
    case 'p':
      return <p>{fmt(block[lang])}</p>;
    case 'h3':
      return <h3 className="paper-h3">{block[lang]}</h3>;
    case 'ol':
    case 'ul': {
      const Tag = block.type;
      return (
        <Tag className="paper-list">
          {block[lang].map((item, i) => (
            <li key={i}>{fmt(item)}</li>
          ))}
        </Tag>
      );
    }
    case 'def':
      return (
        <div className="paper-def">
          <strong>{block.term[lang]}</strong> {fmt(block[lang])}
        </div>
      );
    case 'figure':
      return (
        <figure className="paper-figure" id={`fig-${block.n}`}>
          <img src={FIGURES[block.src]} alt={block.alt[lang]} loading="lazy" decoding="async" />
          <figcaption>
            <strong>
              {UI.fig[lang]} {block.n}.
            </strong>{' '}
            {fmt(block.caption[lang])}
          </figcaption>
        </figure>
      );
    case 'table':
      return (
        <div className="paper-table" id={`table-${block.n}`}>
          <div className="paper-table__caption">
            <span className="paper-table__no">
              {UI.table[lang]} {ROMAN[block.n - 1]}
            </span>
            <span>{fmt(block.caption[lang])}</span>
          </div>
          <div className="paper-table__scroll">
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
        </div>
      );
    case 'listing':
      return (
        <figure className="paper-listing" id={`listing-${block.n}`}>
          <figcaption>
            <strong>
              {UI.listing[lang]} {block.n}.
            </strong>{' '}
            {fmt(block.caption[lang])} <span className="paper-listing__note">({UI.abridged[lang]})</span>
          </figcaption>
          <pre>
            <code>{block.code}</code>
          </pre>
        </figure>
      );
    default:
      return null;
  }
}

export default function TimeManagerPart2() {
  const { lang } = useLanguage();
  return (
    <div className="paper">
      <div className="paper-report">{UI.report[lang]}</div>

      <section className="paper-abstract">
        <p>
          <strong>{UI.abstract[lang]}—</strong>
          {FRONT.abstract[lang]}
        </p>
        <p className="paper-keywords">
          <strong>{UI.keywords[lang]}—</strong>
          {FRONT.keywords[lang].join(', ')}
        </p>
      </section>

      {NUMBERED.map((sec) => (
        <section key={sec.id} className="paper-section" id={sec.id}>
          <h2 className="paper-h2">
            <span className="paper-h2__no">{sec.no}.</span> {sec.title[lang]}
          </h2>
          {sec.blocks.map((block, i) => (
            <Block key={i} block={block} lang={lang} />
          ))}
        </section>
      ))}
    </div>
  );
}
