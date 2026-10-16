import { Fragment, useRef } from 'react';
import { useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { IconArrowRight } from '../../components/common/SocialIcons';
import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import '../../styles/components/glass-button.css';
import '../../styles/sections/funding.css';

/**
 * FundingSection — grants screen between Hero and Drive.
 *
 * Transparent: UnifiedStage keeps the hero's droplets floating behind it (see updateScrollProgress),
 * with a soft dark vignette for legibility. Editorial layout: kicker, heading, a hairline-divided
 * key-facts row, CTAs, and a full-width "currently funded" strip. The detailed process lives on /apply.
 */
export default function FundingSection() {
  const { lang } = useLanguage();
  const copy = COPY.funding[lang];
  const revealRef = useRef(null);
  const inView = useInView(revealRef, { once: true, margin: '-80px' });
  const reveal = `funding-reveal ${inView ? 'is-revealed' : ''}`;

  return (
    <section id="funding" className="funding-section">
      <div className="funding-content" ref={revealRef}>
        <div className={`funding-kicker ${reveal}`}>
          <span>{copy.kicker}</span>
          <span className="funding-kicker__rule" />
        </div>

        <h2 className={`funding-heading ${reveal}`}>
          {copy.headingLines.map((line, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              <span className={i === copy.headingLines.length - 1 ? 'funding-heading__display' : 'funding-heading__light'}>
                {line}
              </span>
            </Fragment>
          ))}
        </h2>

        <p className={`funding-subline ${reveal}`}>{copy.subtitle}</p>

        <dl className={`funding-facts ${reveal}`}>
          {copy.facts.map((fact) => (
            <div key={fact.label} className="funding-fact">
              <dt className="funding-fact__label">{fact.label}</dt>
              <dd className="funding-fact__value">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className={`funding-cta-row ${reveal}`}>
          <Link to="/apply" className="glass-btn glass-btn--light">
            {copy.cta}
            <IconArrowRight className="glass-btn__arrow" />
          </Link>
          <Link to="/drive" className="glass-btn funding-cta--ghost">
            {copy.ctaSecondary}
          </Link>
        </div>

        <Link to="/drive" className={`funding-showcase ${reveal}`}>
          <span className="funding-showcase__kicker">{copy.showcase.kicker}</span>
          <span className="funding-showcase__body">
            <span className="funding-showcase__title">{copy.showcase.title}</span>
            <span className="funding-showcase__desc">{copy.showcase.desc}</span>
          </span>
          <span className="funding-showcase__cta">
            {copy.showcase.cta}
            <IconArrowRight className="funding-showcase__arrow" />
          </span>
        </Link>
      </div>
    </section>
  );
}
