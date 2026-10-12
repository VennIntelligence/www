import { useRef } from 'react';
import { motion as Motion, useInView } from 'framer-motion';

/**
 * PillarCard — 各项目区块共用的支柱卡片（序号 + 标题同行，描述在下）
 *
 * prefix 决定 BEM 类名前缀（sigma / omega / drive），
 * 卡片样式在各自 section 的 CSS 里定义，这里只负责结构和入场动画。
 */
export default function PillarCard({ pillar, index, prefix }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <Motion.div
      ref={ref}
      className={`${prefix}-pillar`}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div className={`${prefix}-pillar__header`}>
        <span className={`${prefix}-pillar__icon`}>{pillar.icon}</span>
        <h3 className={`${prefix}-pillar__title`}>{pillar.title}</h3>
      </div>
      <p className={`${prefix}-pillar__desc`}>{pillar.desc}</p>
    </Motion.div>
  );
}
