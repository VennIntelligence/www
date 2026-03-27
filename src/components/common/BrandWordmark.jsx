import '../../styles/components/brand-wordmark.css';

const BRAND_LABELS = {
  full: 'Venn AI',
  short: 'Venn',
};

const BRAND_TAILS = {
  full: 'een AI',
  short: 'een',
};

export default function BrandWordmark({
  variant = 'full',
  size = 19,
  className = '',
  style,
  ...props
}) {
  const resolvedVariant = BRAND_LABELS[variant] ? variant : 'full';
  const resolvedSize = typeof size === 'number' ? `${size}px` : size;
  const composedClassName = ['brand-wordmark', className].filter(Boolean).join(' ');

  return (
    <span
      className={composedClassName}
      style={{ '--brand-wordmark-size': resolvedSize, ...style }}
      aria-label={BRAND_LABELS[resolvedVariant]}
      {...props}
    >
      <span className="brand-wordmark__mark">V</span>
      <span className="brand-wordmark__text">{BRAND_TAILS[resolvedVariant]}</span>
    </span>
  );
}
