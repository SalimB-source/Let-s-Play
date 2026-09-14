import React from 'react';
import { Link } from 'react-router-dom';
import { partners, partnerUrls } from '../partnersData';
import PartnerMark from '../components/PartnerMark';
import { useLanguage } from '../i18n/LanguageContext';

function Arrow({ external = false }) {
  return <span aria-hidden="true">{external ? '↗' : '→'}</span>;
}

const copy = {
  fr: {
    label: 'PAGE / EVENTS', meta: 'ANNONCEURS · MÉDIAS · GAMING', eyebrow: 'Le terrain de jeu', titleA: 'NOS EVENTS,', titleB: 'NOS RELAIS.',
    intro: 'Une émission se construit aussi hors du plateau. Cette page rassemble les marques, médias, lieux et communautés qui ont accompagné Let’s Play — avec le cadre public de chaque collaboration, sans extrapoler ce qui reste à confirmer.', count: 'PARTENAIRES RÉFÉRENCÉS', strip: 'ÉCOSYSTÈME LET’S PLAY', details: 'PARTENAIRES & COLLABORATIONS', sources: 'SOURCES PUBLIQUES', sourcesMeta: 'LIENS VÉRIFIÉS OU À CONFIRMER', backHome: 'Retour à l’accueil', backNews: 'Voir les actus', cta: 'Vous êtes une marque, un média ou un événement ?', ctaText: 'Parlons contenu, diffusion et communautés gaming en Algérie.', ctaButton: 'Nous contacter', verified: 'Statut documentaire', source: 'Source publique'
  },
  en: {
    label: 'PAGE / EVENTS', meta: 'ADVERTISERS · MEDIA · GAMING', eyebrow: 'The playing field', titleA: 'OUR EVENTS,', titleB: 'OUR NETWORK.',
    intro: 'A show is built beyond the studio. This page brings together the brands, media, venues and communities connected to Let’s Play, with the public context of each collaboration and clear notes where confirmation is still needed.', count: 'REFERENCED PARTNERS', strip: 'LET’S PLAY ECOSYSTEM', details: 'PARTNERS & COLLABORATIONS', sources: 'PUBLIC SOURCES', sourcesMeta: 'VERIFIED OR TO BE CONFIRMED', backHome: 'Back home', backNews: 'See the news', cta: 'Are you a brand, media outlet or event?', ctaText: 'Let’s talk content, distribution and gaming communities in Algeria.', ctaButton: 'Contact us', verified: 'Documentation status', source: 'Public source'
  },
  ar: {
    label: 'صفحة / الفعاليات', meta: 'معلنون · إعلام · ألعاب', eyebrow: 'الميدان', titleA: 'فعالياتنا،', titleB: 'وشبكتنا.',
    intro: 'البرنامج يُبنى خارج الاستوديو أيضًا. تجمع هذه الصفحة العلامات والقنوات والأماكن والمجتمعات المرتبطة بـ Let’s Play، مع توضيح إطار كل تعاون وما يحتاج إلى تأكيد.', count: 'شركاء موثقون', strip: 'منظومة LET’S PLAY', details: 'الشركاء والتعاونات', sources: 'المصادر العلنية', sourcesMeta: 'موثقة أو قيد التأكيد', backHome: 'العودة للرئيسية', backNews: 'الأخبار', cta: 'هل أنتم علامة أو قناة أو فعالية؟', ctaText: 'لنتحدث عن المحتوى والبث ومجتمعات الألعاب في الجزائر.', ctaButton: 'تواصلوا معنا', verified: 'حالة التوثيق', source: 'مصدر علني'
  }
};

export default function Partners() {
  const { lang } = useLanguage();
  const page = copy[lang] || copy.fr;

  return (
    <>
      <section className="page-hero wrap">
        <div className="section-label"><span><b>{page.label.split(' / ')[0]}</b> / {page.label.split(' / ')[1]}</span><span>{page.meta}</span></div>
        <div className="page-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {page.eyebrow}</p>
            <h1>{page.titleA}<br /><em>{page.titleB}</em></h1>
            <p className="page-hero-text">{page.intro}</p>
          </div>
          <div className="page-hero-visual hud-frame">
            <div className="page-hero-visual-inner" style={{ backgroundImage: `url(${partnerUrls.heroVisual})` }} />
            <div className="page-hero-visual-shade" />
            <div className="page-hero-visual-content"><strong>{partners.length}</strong><small>{page.count}</small><span>{page.meta}</span></div>
          </div>
        </div>
      </section>

      <section className="partner-strip wrap" aria-label={page.strip}>
        <span className="partner-strip-label">{page.strip}</span>
        <div className="partner-strip-marks">{partners.map((partner) => <a className={`partner-strip-item partner-strip-${partner.tone}`} key={partner.id} href={partner.external} target="_blank" rel="noreferrer"><PartnerMark partner={partner} size="sm" /></a>)}</div>
      </section>

      <section className="partners-detail wrap">
        <div className="section-label"><span><b>01</b> / {page.details}</span><span>{page.meta}</span></div>
        {partners.map((partner, index) => (
          <article className={`partner-detail partner-detail-${partner.tone}`} key={partner.id} id={partner.id}>
            <div className="partner-detail-side">
              <span className="partner-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="partner-detail-logo"><PartnerMark partner={partner} size="xl" showText={false} /></div>
              <span className="partner-kicker">{partner.role}</span>
              <div className="partner-detail-links">
                {partner.media ? <a className="arrow-link" href={partner.media} target="_blank" rel="noreferrer">{partner.mediaLabel} <Arrow external /></a> : null}
                <a className="arrow-link" href={partner.external} target="_blank" rel="noreferrer">{partner.externalLabel} <Arrow external /></a>
              </div>
            </div>
            <div className="partner-detail-body">
              <h2>{partner.name}</h2>
              <p className="partner-detail-lead">{partner.context}</p>
              {partner.video ? <div className="partner-video"><div className="section-label"><span><b>VIDÉO</b> / {partner.mediaLabel}</span><span>{partner.role}</span></div><div className="article-video-frame"><iframe src={`https://www.youtube.com/embed/${partner.video}?rel=0`} title={partner.mediaLabel} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></div> : null}
              <div className="partner-detail-facts"><span className="partner-detail-facts-label">{page.verified}</span><ul className="partner-facts"><li>{partner.role}</li><li>{partner.confidence}</li><li>{page.source}: {partner.source}</li></ul></div>
              <div className="partner-detail-note"><span className="live-dot" /><strong>{partner.confidence}</strong><span>{partner.context}</span></div>
            </div>
          </article>
        ))}
      </section>

      <section className="cta wrap"><div><p className="eyebrow"><span className="live-dot" /> {page.cta}</p><h2>{page.ctaText}</h2></div><a className="button button-yellow" href={partnerUrls.instagram} target="_blank" rel="noreferrer">{page.ctaButton} <Arrow external /></a></section>

      <section className="partners-sources wrap">
        <div className="section-label"><span><b>02</b> / {page.sources}</span><span>{page.sourcesMeta}</span></div>
        <ul className="partners-sources-list">{partners.map((partner) => <li key={partner.id}><a href={partner.source} target="_blank" rel="noreferrer">{partner.name} <Arrow external /></a><span>{partner.confidence} · {partner.role}</span></li>)}</ul>
        <div className="partners-back"><Link className="button button-ghost" to="/">{page.backHome} <Arrow /></Link><Link className="button button-ghost" to="/news">{page.backNews} <Arrow /></Link></div>
      </section>
    </>
  );
}
