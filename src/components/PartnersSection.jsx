import React from 'react';
import { Link } from 'react-router-dom';
import { partners } from '../partnersData';
import { useLanguage } from '../i18n/LanguageContext';
import PartnerMark from './PartnerMark';

function Arrow({ external = false }) {
  return <span aria-hidden="true">{external ? '↗' : '→'}</span>;
}

export default function PartnersSection() {
  const { lang } = useLanguage();
  const isFr = lang === 'fr';
  const isAr = lang === 'ar';
  const copy = isAr
    ? { label: '03 / الفعاليات', meta: 'معلنون · إعلام · ألعاب', eyebrow: 'على أرض الواقع', titleA: 'العلامات،', titleB: 'والمجتمعات.', text: 'اتصالات الجزائر، أوريدو، 7ouma Arena: لكل شراكة مقال. وسنضيف غيرها.', cta: 'كل الفعاليات', link: 'المصدر', explainer: 'تعرّف على 7ouma Arena' }
    : isFr
      ? { label: '05 / EVENTS', meta: 'ANNONCEURS · MÉDIAS · GAMING', eyebrow: 'Sur le terrain', titleA: 'LES MARQUES,', titleB: 'LES COMMUNAUTÉS.', text: 'Algérie Télécom, Ooredoo, 7ouma Arena : chaque partenariat a son article. D’autres suivront.', cta: 'Tous les Events', link: 'Source', explainer: 'Comprendre 7ouma Arena' }
      : { label: '05 / EVENTS', meta: 'ADVERTISERS · MEDIA · GAMING', eyebrow: 'On the ground', titleA: 'THE BRANDS,', titleB: 'THE COMMUNITIES.', text: 'Algérie Télécom, Ooredoo, 7ouma Arena: each partnership has its own article. More will follow.', cta: 'All Events', link: 'Source', explainer: 'Understand 7ouma Arena' };

  return (
    <section className="partners wrap" id="events">
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

      <div className="partner-grid">
        {partners.map((partner, index) => (
            <article className={`partner-card partner-card-logo-only partner-card-${partner.tone}`} key={partner.id} aria-label={partner.name}>
              <div className="partner-card-logo">
                <PartnerMark partner={partner} size="xl" showText={false} />
              </div>
            </article>
        ))}
      </div>
    </section>
  );
}
