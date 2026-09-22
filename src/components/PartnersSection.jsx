import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { partners } from '../partnersData';
import { useLanguage } from '../i18n/LanguageContext';
import PartnerMark from './PartnerMark';

function Arrow({ external = false }) {
  return <span aria-hidden="true">{external ? '↗' : '→'}</span>;
}

export default function PartnersSection() {
  const { lang } = useLanguage();
  const [paused, setPaused] = useState(false);
  const isFr = lang === 'fr';
  const isAr = lang === 'ar';
  const copy = isAr
    ? { label: '03 / الفعاليات', meta: 'معلنون · إعلام · ألعاب', eyebrow: 'على أرض الواقع', titleA: 'العلامات،', titleB: 'والمجتمعات.', text: 'اتصالات الجزائر، أوريدو، 7ouma Arena: لكل شراكة مقال. وسنضيف غيرها.', cta: 'كل الفعاليات', link: 'المصدر', explainer: 'تعرّف على 7ouma Arena' }
    : isFr
      ? { label: '05 / EVENTS', meta: 'ANNONCEURS · MÉDIAS · GAMING', eyebrow: 'Sur le terrain', titleA: 'LES MARQUES,', titleB: 'LES COMMUNAUTÉS.', text: 'Algérie Télécom, Ooredoo, 7ouma Arena : chaque partenariat a son article. D’autres suivront.', cta: 'Tous les Events', link: 'Source', explainer: 'Comprendre 7ouma Arena' }
      : { label: '05 / EVENTS', meta: 'ADVERTISERS · MEDIA · GAMING', eyebrow: 'On the ground', titleA: 'THE BRANDS,', titleB: 'THE COMMUNITIES.', text: 'Algérie Télécom, Ooredoo, 7ouma Arena: each partnership has its own article. More will follow.', cta: 'All Events', link: 'Source', explainer: 'Understand 7ouma Arena' };

  return (
    <section className="partners" id="events">
      <div className="wrap">
      <div className="section-label">
        <span>{copy.label.split(' / ')[1]}</span><span>{copy.meta}</span>
      </div>

      <div className="partners-head">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {copy.eyebrow}</p><h2>{copy.titleA}<br /><em>{copy.titleB}</em></h2>
        </div>
        <div className="partners-head-side">
          <p className="partners-intro">{copy.text}</p><Link className="arrow-link" to="/events">{copy.cta} <Arrow /></Link>
        </div>
      </div>

      </div>
      <div className="partners-marquee" data-paused={paused}>
        <div className="partners-marquee-track">
          {[0, 1].map((copyIndex) => (
            <ul className="partners-marquee-group" key={copyIndex} aria-hidden={copyIndex === 1 ? true : undefined}>
              {partners.map((partner) => (
                <li className="partners-marquee-item" key={partner.id}>
                  <PartnerMark partner={partner} showText={false} />
                </li>
              ))}
            </ul>
          ))}
        </div>
        <button
          className="partners-marquee-toggle"
          type="button"
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
          aria-label={isAr ? 'إيقاف التمرير مؤقتًا' : isFr ? 'Mettre le défilement en pause' : 'Pause scrolling'}
        >
          <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
        </button>
      </div>
    </section>
  );
}
