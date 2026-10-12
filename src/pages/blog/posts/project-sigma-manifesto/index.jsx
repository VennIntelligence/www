import { useLanguage } from '../../../../context/useLanguage';
import { generateRedacted, generateLine } from './redacted';
import '../../../../styles/pages/blog-sigma-whitepaper.css';

/**
 * Project Σ Whitepaper — 公开草案站位页
 *
 * 文件位置: src/pages/blog/posts/project-sigma-manifesto/index.jsx
 *
 * 结构参照 2017 年 ICO 白皮书的标准骨架：
 *   Abstract → Background → Design Principles → Architecture → Engine →
 *   Sybil Resistance → Governance → Roadmap → Team → Disclaimer → References
 *
 * 当前状态：融资前站位。只公开摘要、问题陈述、设计原则、
 * 免责声明和参考文献；架构 / 引擎 / 抗女巫 / 治理 / 路线图 / 团队标为 WITHHELD，
 * 用 redacted.js 生成的加密技术文本 + 公式占位并模糊，融资后再填充。
 * 查阅说明只在文末出现一次。
 *
 * 视觉：meta.theme = 'paper' 让整站在本文内切成浅色纸面（Navbar / Footer 一并变浅），
 * 正文无衬线；样式见 blog-sigma-whitepaper.css。
 * 所有文案集中在下方 COPY 对象里，中英共用同一套渲染逻辑。
 */

const CONTACT = 'contact@vennai.org';

/* 各暂不公开章节的密文块数（默认 4–5）。调大章节更长，看起来"藏了更多" */
const REDACTED_BLOCKS = { architecture: 5, engine: 5, sybil: 4, governance: 4, team: 3 };

/* 路线图阶段标签：只露阶段名，每行内容为密文 + 可见省略号 */
const PHASES = ['Phase 0', 'Phase 1', 'Phase 2', 'Phase 3'];

const REFERENCES = (
  <ol className="wp-refs">
    <li>Shannon, C. E. (1948). <em>A Mathematical Theory of Communication.</em> Bell System Technical Journal, 27.</li>
    <li>Vygotsky, L. S. (1978). <em>Mind in Society: The Development of Higher Psychological Processes.</em> Harvard University Press.</li>
    <li>Vosoughi, S., Roy, D., Aral, S. (2018). <em>The spread of true and false news online.</em> Science, 359(6380).</li>
    <li>Raymond, E. S. (1999). <em>The Cathedral and the Bazaar.</em> O'Reilly Media.</li>
    <li>Douceur, J. R. (2002). <em>The Sybil Attack.</em> IPTPS.</li>
  </ol>
);

const COPY = {
  en: {
    masthead: [
      ['Document', 'Project Σ · Whitepaper'],
      ['Version', 'v0.1 · Public draft'],
      ['Date', 'September 2026'],
      ['Status', 'Pre-seed · Partial disclosure'],
    ],
    tocTitle: 'Contents',
    status: { public: 'Public', withheld: 'Withheld' },
    colophon: (
      <>
        Sections marked withheld are available in full to participants in the private round.
        Request access:{' '}
        <a href={`mailto:${CONTACT}?subject=${encodeURIComponent('Project Σ whitepaper access')}`}>
          {CONTACT}
        </a>
      </>
    ),
    sections: [
      {
        id: 'abstract',
        title: 'Abstract',
        status: 'public',
        body: (
          <>
            <p className="wp-p">
              Project Σ is a protocol for the exchange of human intelligence. Where today's
              networks rank content by the attention it captures, Σ settles it by the information
              it adds. Each message is priced against what its receiver already knows. Each
              participant is provably one human, without being identifiable. Each community may
              issue its own unit of account for contribution to collective knowledge.
            </p>
            <p className="wp-p">
              This is a public draft. It sets out the problem and the design principles. The
              protocol architecture, the scoring function, Sybil resistance, governance, the
              roadmap and the team are withheld until the private round closes.
            </p>
          </>
        ),
      },
      {
        id: 'background',
        title: 'Background and Problem Statement',
        status: 'public',
        body: (
          <>
            <p className="wp-p">
              In thirty years the internet delivered half of its promise. It connected five
              billion people. The other half, that connection would make humanity collectively
              smarter, never arrived. Platforms funded by advertising optimise for time on screen,
              not for what a reader knows afterwards. On those platforms false news travels
              roughly six times faster than true news.<sup>[3]</sup>
            </p>
            <p className="wp-p">
              Bots, coordinated campaigns and paid opinion are not defects of this model. They
              are its equilibrium. Producing noise costs nothing. Verifying it costs every reader
              something. <strong>Gresham's law follows: bad information drives out good.</strong>
            </p>
            <p className="wp-p">
              We hold that this is a failure of infrastructure, not of people. Readers want work
              that is deeper, rarer and more honest. No system has yet paid for it.{' '}
              <strong>Change what the network rewards, and you change what emerges from it.</strong>
            </p>
          </>
        ),
      },
      {
        id: 'principles',
        title: 'Design Principles',
        status: 'public',
        body: (
          <>
            <p className="wp-p">
              Σ is not a better social network. It is a rebuild, at the protocol layer, of how
              information moves between people: how it flows, how it is valued, how it settles
              and how it compounds. Four principles fix the design. The mechanisms behind them
              are specified in the withheld sections.
            </p>
            <h4 className="wp-h3"><span>3.1</span>Personhood without identity</h4>
            <p className="wp-p">
              The protocol must know that you are one human, and must never learn which one.
              Resistance to Sybil attacks is the foundation, not a feature.<sup>[5]</sup>
            </p>
            <h4 className="wp-h3"><span>3.2</span>Information gain, not engagement</h4>
            <p className="wp-p">
              A message is worth what it adds to the receiver's existing knowledge, not how long
              it holds their attention. The measure is computable and verifiable. Its lineage
              runs from Shannon<sup>[1]</sup> to Vygotsky.<sup>[2]</sup>
            </p>
            <h4 className="wp-h3"><span>3.3</span>Cognitive topology, not social graph</h4>
            <p className="wp-p">
              Participants are placed by what they know, not by whom they follow. Content moves
              down gradients of knowledge, and each transfer reshapes the terrain.
            </p>
            <h4 className="wp-h3"><span>3.4</span>Protocol, not platform</h4>
            <p className="wp-p">
              Any community may fork its own tribe, issue its own unit of account and define what
              counts as contribution. A thousand bazaars, not one cathedral.<sup>[4]</sup>
            </p>
          </>
        ),
      },
      { id: 'architecture', title: 'Protocol Architecture', status: 'withheld' },
      { id: 'engine', title: 'The Σ Engine: Information-Gain Scoring', status: 'withheld' },
      { id: 'sybil', title: 'Sybil and Collusion Resistance', status: 'withheld' },
      { id: 'governance', title: 'Governance', status: 'withheld' },
      { id: 'roadmap', title: 'Roadmap', status: 'withheld', phases: PHASES },
      { id: 'team', title: 'Team and Advisors', status: 'withheld' },
      {
        id: 'disclaimer',
        title: 'Disclaimer',
        status: 'public',
        body: (
          <>
            <p className="wp-p">
              This document is a public draft for discussion. It is not an offer to sell, or a
              solicitation of an offer to buy, any token, security or other instrument in any
              jurisdiction. No token is on sale at the time of publication.
            </p>
            <p className="wp-p">
              It contains forward-looking statements about a system that does not yet exist in
              the form described. Every part of it, including the withheld sections, may change
              materially before any public release. Nothing here is investment, legal or tax
              advice.
            </p>
          </>
        ),
      },
      { id: 'references', title: 'References', status: 'public', body: REFERENCES },
    ],
  },

  zh: {
    masthead: [
      ['文档', 'Project Σ · 白皮书'],
      ['版本', 'v0.1 · 公开草案'],
      ['日期', '2026 年 9 月'],
      ['状态', '融资前 · 部分公开'],
    ],
    tocTitle: '目录',
    status: { public: '公开', withheld: '暂不公开' },
    colophon: (
      <>
        标注"暂不公开"的章节，完整内容仅向私募轮参与方开放。申请查阅：{' '}
        <a href={`mailto:${CONTACT}?subject=${encodeURIComponent('Project Σ 白皮书查阅申请')}`}>
          {CONTACT}
        </a>
      </>
    ),
    sections: [
      {
        id: 'abstract',
        title: '摘要',
        status: 'public',
        body: (
          <>
            <p className="wp-p">
              Project Σ 是一个人类智慧交换协议。今天的网络按内容抓住了多少注意力来排序，Σ 按内容带来了多少信息来结算：每一条消息以接收者已有的认知为基准计价；每一个参与者可被证明是一个真人，却无法被识别是谁；每一个社区都可以为集体认知的贡献发行自己的记账单位。
            </p>
            <p className="wp-p">
              本文是公开草案，只陈述问题与设计原则。协议架构、评分函数、抗女巫机制、治理、路线图与团队在私募轮结束前暂不公开。
            </p>
          </>
        ),
      },
      {
        id: 'background',
        title: '背景与问题陈述',
        status: 'public',
        body: (
          <>
            <p className="wp-p">
              三十年间，互联网兑现了一半承诺：连接了 50 亿人。另一半承诺，连接会让人类集体变得更聪明，始终没有到来。靠广告养活的平台优化的是屏幕停留时间，而不是读者看完之后多知道了什么。在这些平台上，假消息的传播速度约为真消息的六倍。<sup>[3]</sup>
            </p>
            <p className="wp-p">
              水军、机器人、协同操纵、付费舆论，都不是这个模式的缺陷，而是它的均衡态。制造噪音不花钱，鉴别噪音却要每个读者付出成本。<strong>格雷欣法则随之生效：劣质信息驱逐优质信息。</strong>
            </p>
            <p className="wp-p">
              我们认为这是基础设施的失败，不是人的失败。读者想要更深、更稀缺、更诚实的内容，只是从未有一个系统为此付费。<strong>改变网络奖励什么，就改变了网络涌现出什么。</strong>
            </p>
          </>
        ),
      },
      {
        id: 'principles',
        title: '设计原则',
        status: 'public',
        body: (
          <>
            <p className="wp-p">
              Σ 不是一个更好的社交网络，而是在协议层重建信息在人与人之间的运动方式：如何流动、如何定价、如何结算、如何累积。四条原则定下设计，背后的机制见暂不公开章节。
            </p>
            <h4 className="wp-h3"><span>3.1</span>真人，而非身份</h4>
            <p className="wp-p">
              协议必须知道你是一个真人，却永远不能知道你是哪一个。抗女巫攻击是地基，不是功能。<sup>[5]</sup>
            </p>
            <h4 className="wp-h3"><span>3.2</span>信息增量，而非停留时长</h4>
            <p className="wp-p">
              一条消息的价值等于它给接收者已有认知增加了多少，而不是它占用了多久的注意力。这个度量可计算、可验证，思想脉络从 Shannon<sup>[1]</sup> 延续到 Vygotsky。<sup>[2]</sup>
            </p>
            <h4 className="wp-h3"><span>3.3</span>认知拓扑，而非社交图谱</h4>
            <p className="wp-p">
              参与者按"知道什么"定位，而不是按"关注了谁"。内容顺着认知梯度流动，每一次传递都在重塑地形。
            </p>
            <h4 className="wp-h3"><span>3.4</span>协议，而非平台</h4>
            <p className="wp-p">
              任何社区都可以 fork 自己的部落、发行自己的记账单位、定义什么算贡献。一千个集市，而不是一座大教堂。<sup>[4]</sup>
            </p>
          </>
        ),
      },
      { id: 'architecture', title: '协议架构', status: 'withheld' },
      { id: 'engine', title: 'Σ 引擎：信息增量评分', status: 'withheld' },
      { id: 'sybil', title: '抗女巫与抗共谋', status: 'withheld' },
      { id: 'governance', title: '治理', status: 'withheld' },
      { id: 'roadmap', title: '路线图', status: 'withheld', phases: PHASES },
      { id: 'team', title: '团队与顾问', status: 'withheld' },
      {
        id: 'disclaimer',
        title: '免责声明',
        status: 'public',
        body: (
          <>
            <p className="wp-p">
              本文为供讨论的公开草案，不构成在任何司法辖区出售或邀约购买任何代币、证券或其他金融工具的要约。发布时没有任何代币在售。
            </p>
            <p className="wp-p">
              本文包含关于一个尚未以所述形态存在的系统的前瞻性陈述。全部内容，包括暂不公开的章节，在任何公开发布前都可能发生重大变化。本文不构成投资、法律或税务建议。
            </p>
          </>
        ),
      },
      { id: 'references', title: '参考文献', status: 'public', body: REFERENCES },
    ],
  },
};

/** 暂不公开章节：加密技术散文 + 公式，CSS 负责模糊 */
function Redacted({ id }) {
  const blocks = generateRedacted(id, REDACTED_BLOCKS[id] ?? 4);
  return (
    <div className="wp-redacted" aria-hidden="true">
      {blocks.map((b, i) =>
        b.type === 'eq'
          ? <div key={i} className="wp-redacted__eq">{b.text}</div>
          : <p key={i} className="wp-redacted__p">{b.text}</p>,
      )}
    </div>
  );
}

/** 路线图：每个阶段一行密文，末尾三个可见省略号 */
function RoadmapBody({ id, phases }) {
  return phases.map(tag => (
    <div key={tag} className="wp-phase">
      <div className="wp-phase__tag">{tag}</div>
      <div className="wp-phase__body">
        <span className="wp-redacted wp-redacted--line" aria-hidden="true">
          {generateLine(`${id}-${tag}`)}
        </span>
        <span className="wp-phase__more">...</span>
      </div>
    </div>
  ));
}

function StatusTag({ status, labels }) {
  return <span className={`wp-status wp-status--${status}`}>{labels[status]}</span>;
}

export default function ProjectSigmaArticle() {
  const { lang } = useLanguage();
  const copy = COPY[lang] ?? COPY.en;
  const sections = copy.sections.map((s, i) => ({ ...s, num: i + 1 }));

  return (
    <div className="wp-doc">
      <div className="wp-masthead">
        {copy.masthead.map(([label, value]) => (
          <div key={label}>
            <span className="wp-label">{label}</span>
            <span className="wp-masthead__value">{value}</span>
          </div>
        ))}
      </div>

      <p className="wp-label wp-label--toc">{copy.tocTitle}</p>
      <ol className="wp-toc">
        {sections.map(s => (
          <li key={s.id} data-status={s.status}>
            <span className="wp-toc__num">{s.num}</span>
            <a className="wp-toc__title" href={`#${s.id}`}>{s.title}</a>
            <span className="wp-toc__leader" />
            <StatusTag status={s.status} labels={copy.status} />
          </li>
        ))}
      </ol>

      {sections.map(s => (
        <section key={s.id} id={s.id} className="wp-section">
          <div className="wp-section__head">
            <span className="wp-section__num">{`§${s.num}`}</span>
            <h2 className="wp-h2">{s.title}</h2>
            <StatusTag status={s.status} labels={copy.status} />
          </div>
          {s.status === 'public' && s.body}
          {s.status === 'withheld' && (s.phases
            ? <RoadmapBody id={s.id} phases={s.phases} />
            : <Redacted id={s.id} />)}
        </section>
      ))}

      <p className="wp-colophon">{copy.colophon}</p>
    </div>
  );
}
