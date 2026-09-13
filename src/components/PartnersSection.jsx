import React from 'react';
import { Link } from 'react-router-dom';
import { partners } from '../partnersData';
import { useLanguage } from '../i18n/LanguageContext';
import PartnerMark from './PartnerMark';

function Arrow({ external }) {
  return <span aria-hidden="true">{external ? '↗' : '→'}</span>;
}

/**
 * Bandeau de partenaires affiché sur l'accueil (section 04).
 * Le détail complet vit sur /partenaires.
 */
export default function PartnersSection() {
  const { t } = useLanguage();
  const copy = t.home.partners;

  return (
    <section className="partners wrap" id="partners">
      <div className="section-label">
        <span><b>{copy.label1.split(' / ')[0]}</b> / {copy.label1.split(' / ')[1]}</span>
        <span>{copy.label2}</span>
      </div>

      <div className="partners-head">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {copy.eyebrow}</p>
          <h2>{copy.h2a}<br /><em>{copy.h2b}</em></h2>
        </div>
        <div className="partners-head-side">
          <p className="partners-intro">{copy.text}</p>
          <Link className="arrow-link" to="/partenaires">{copy.cta} <Arrow /></Link>
        </div>
      </div>

      <div className="partner-grid">
        {partners.map((partner, index) => {
          const item = t.partners.items[partner.tag];
          return (
            <article className={`partner-card partner-card-${partner.tone}`} key={partner.id}>
              <div className="partner-card-top">
                <span className="partner-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="partner-kicker">{item.kicker}</span>
              </div>

              <PartnerMark partner={partner} />

              <h3>{item.title}</h3>
              <p className="partner-desc">{item.desc}</p>

              <ul className="partner-facts">
                {item.facts.map((fact) => <li key={fact}>{fact}</li>)}
              </ul>

              <a className="partner-link" href={partner.cta} target="_blank" rel="noreferrer">
                {item.cta} <Arrow external />
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
