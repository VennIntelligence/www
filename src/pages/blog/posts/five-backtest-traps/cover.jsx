/**
 * five-backtest-traps 封面 —— 正文图 12「山坡上的行人」的右上角特写。
 *
 * 资源 cover-slope-walker.webp 是原图 2400×1350 裁出的 (1104,100)–(2400,910)
 * 区域（约右上角 60%，1296×810 ≈ 16:10）：放大镜里"我的策略／我的人生越来越好"，
 * 镜外是尚未发生的虚线下坡。裁剪已烘进资源，卡片只按自身比例做 cover 微裁。
 */

import coverImg from '../../../../assets/blog/five-backtest-traps/cover-slope-walker.webp';

export default function FiveBacktestTrapsCover() {
  return (
    <div className="blog-cover-photo">
      <img src={coverImg} alt="" loading="lazy" decoding="async" />
    </div>
  );
}
