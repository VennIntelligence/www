/**
 * 暂不公开章节的"密文"生成器
 *
 * 文件位置: src/pages/blog/posts/project-sigma-manifesto/redacted.js
 *
 * 思路：不用涂黑条，而是生成一段看起来像真实协议文档的内容
 * （技术散文 + 公式），先做确定性的字符级加密打乱，再由 CSS 模糊。
 * 打乱是安全边界：即使有人在开发者工具里去掉 blur，看到的也只是密文，
 * 不会泄露任何真实细节。语料本身也只是通用词汇，不含项目机密。
 *
 * 全部由 seed 决定（mulberry32），同一章节每次渲染完全一致，
 * 不会因为 re-render 而闪烁。
 */

/* 打乱强度：每个字母被替换的概率（默认 0.55）。调高更像乱码，调低残留更多可辨词形 */
const SCRAMBLE_RATE = 0.55;

/** mulberry32 —— 32 位种子的确定性伪随机数 */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 字符串 → 32 位整数种子 */
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* 通用协议词汇，只用于生成"像那么回事"的句子，不对应任何真实设计 */
const NOUNS = [
  'commitment', 'nullifier', 'epoch', 'verifier', 'prover', 'receiver', 'prior',
  'posterior', 'gradient', 'quorum', 'validator', 'ledger', 'witness', 'accumulator',
  'transcript', 'challenge', 'circuit', 'attestation', 'checkpoint', 'settlement',
  'entropy budget', 'cognitive map', 'topology', 'perturbation', 'cluster', 'edge weight',
  'relay', 'slashing condition', 'bond', 'oracle', 'aggregate', 'signature share',
];
const VERBS = [
  'is derived from', 'is bound to', 'commits to', 'is verified against', 'is sampled from',
  'is settled by', 'is bounded by', 'propagates through', 'is rotated every', 'is folded into',
  'is weighted by', 'is rejected unless', 'is finalised once', 'is amortised over',
];
const TAILS = [
  'under the standard soundness assumption', 'without revealing the underlying identity',
  'with negligible probability of collision', 'before the next epoch boundary',
  'subject to the collusion bound in §6', 'as defined in Appendix B',
  'with cost linear in the number of participants', 'under adversarial scheduling',
  'so that bribery is strictly unprofitable', 'until the receiver acknowledges receipt',
];

/* 公式模板：Unicode 数学，不依赖任何渲染库。占位 {a} {b} {c} 由随机符号填充 */
const FORMULAS = [
  'ΔI(m | K_r) = H(K_r) − H(K_r | m)',
  'π ← Prove(pk, x, w),   Verify(vk, x, π) = 1',
  's_t = Σ_i w_i · D_KL(P_i ‖ Q_i)',
  '∇φ(x) = −λ Σ_j (x − x_j) / ‖x − x_j‖²',
  'Pr[Sybil ∧ Accept] ≤ ε + negl(κ)',
  'R(u) = Σ_{m ∈ M_u} ΔI(m) · e^{−βΔt}',
  'C_bribe(n) ≥ n · s_min > Σ_k r_k',
  'H(X) = −Σ_x p(x) log₂ p(x)',
  'z_{t+1} = z_t + η · (x_r − z_t) + ξ_t',
  'Acc_{t+1} = Acc_t^{g(c)} mod N',
  'θ* = argmin_θ E[(ΔI − f_θ(m, K_r))²]',
  'ZPD(r) = { m : H(m | K_r) ∈ (δ_low, δ_high) }',
];

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const SYMBOLS = 'αβγδεζηθικλμνξπρστυφχψω';

function pick(r, arr) {
  return arr[Math.floor(r() * arr.length)];
}

/** 字符级打乱：字母按 SCRAMBLE_RATE 替换成同大小写的随机字母，其它字符保留 */
function scramble(r, text) {
  let out = '';
  for (const ch of text) {
    if (/[a-z]/.test(ch) && r() < SCRAMBLE_RATE) out += pick(r, LETTERS);
    else if (/[A-Z]/.test(ch) && r() < SCRAMBLE_RATE) out += pick(r, LETTERS).toUpperCase();
    else if (/[α-ω]/.test(ch) && r() < 0.4) out += pick(r, SYMBOLS);
    else out += ch;
  }
  return out;
}

/** 单行密文（路线图等只需一行的地方） */
export function generateLine(seedKey) {
  const r = rng(hashSeed(seedKey));
  return scramble(r, sentence(r));
}

function sentence(r) {
  const n1 = pick(r, NOUNS);
  const n2 = pick(r, NOUNS);
  const v = pick(r, VERBS);
  const tail = pick(r, TAILS);
  const s = `The ${n1} ${v} the ${n2} ${tail}.`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function paragraph(r) {
  const count = 3 + Math.floor(r() * 3);
  return Array.from({ length: count }, () => sentence(r)).join(' ');
}

/**
 * 生成一节密文块
 * @param {string} seedKey  章节 id，决定内容
 * @param {number} blocks   块数（默认 4）。每块是一段散文或一条公式
 * @returns {{ type: 'p' | 'eq', text: string }[]}
 */
export function generateRedacted(seedKey, blocks = 4) {
  const r = rng(hashSeed(seedKey));
  const out = [];
  for (let i = 0; i < blocks; i += 1) {
    // 第一块固定是散文，之后约 40% 概率出现公式
    const isEq = i > 0 && r() < 0.4;
    out.push(
      isEq
        ? { type: 'eq', text: scramble(r, pick(r, FORMULAS)) }
        : { type: 'p', text: scramble(r, paragraph(r)) },
    );
  }
  return out;
}
