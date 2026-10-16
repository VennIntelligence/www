import { Fragment, useRef } from 'react';
import { useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import PillarCard from '../../components/common/PillarCard';
import { IconArrowRight } from '../../components/common/SocialIcons';
import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import '../../styles/sections/funding.css';

/**
 * FundingSection — grant application screen (between Hero and Drive).
 *
 * The hero's "Apply for funding" button scrolls here. Heading uses the same type system as
 * Σ / Ω / Drive (light sans + serif last line); below are the process cards and a funded showcase.
 * The CTA opens the online application form at /apply.
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
        <div className={`funding-subheading ${reveal}`}>
          <div className="funding-subheading__line" />
          <span>{copy.subheading}</span>
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

        <div className={`funding-cta-row ${reveal}`}>
          <Link to="/apply" className="funding-cta">
            {copy.cta}
            <IconArrowRight className="funding-cta__icon" />
          </Link>
        </div>

        <div className="funding-pillars">
          <span className="funding-pillars__label">{copy.pillarTitle}</span>
          <div className="funding-pillars__grid">
            {copy.pillars.map((pillar, i) => (
              <PillarCard key={pillar.icon} pillar={pillar} index={i} prefix="funding" />
            ))}
            <Link to="/drive" className="funding-showcase">
              <span className="funding-showcase__kicker">{copy.showcase.kicker}</span>
              <span className="funding-showcase__title">{copy.showcase.title}</span>
              <span className="funding-showcase__desc">{copy.showcase.desc}</span>
              <span className="funding-showcase__cta">
                {copy.showcase.cta}
                <IconArrowRight className="funding-showcase__arrow" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
