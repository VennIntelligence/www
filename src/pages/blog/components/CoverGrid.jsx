/**
 * CoverGrid — 各文章封面蚀刻图共用的"坐标纸"网格层
 *
 * 所有封面 SVG 统一 viewBox 800×500。
 * 竖线每 80px 一根、横线每 100px 一根;线色由 stroke 传入,
 * 各封面按自己的色温给一个极低 alpha(建议 0.04~0.06)。
 */

const GRID_X = Array.from({ length: 9 }, (_, i) => 80 + i * 80);
const GRID_Y = Array.from({ length: 4 }, (_, i) => 100 + i * 100);

export default function CoverGrid({ stroke }) {
  return (
    <g stroke={stroke} strokeWidth="1">
      {GRID_X.map(x => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="500" />
      ))}
      {GRID_Y.map(y => (
        <line key={`h${y}`} x1="0" y1={y} x2="800" y2={y} />
      ))}
    </g>
  );
}
