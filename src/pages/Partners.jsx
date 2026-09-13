import React from 'react';
import { Link } from 'react-router-dom';
import { partners, partnerUrls } from '../partnersData';
import { useLanguage } from '../i18n/LanguageContext';
import PartnerMark from '../components/PartnerMark';

function Arrow({ external }) {
  return <span aria-hidden="true">{external ? '↗' : '→'}</span>;
}

export default function Partners() {
  const { t } = useLanguage();
  const page = t.partners;

  return (
    <>
      <section className="page-hero wrap">
        <div className="section-label">
          <span><b>{page.label1.split(' / ')[0]}</b> / {page.label1.split(' / ')[1]}</span>
          <span>{page.label2}</span>
        </div>
        <div className="page-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {page.eyebrow}</p>
            <h1>{page.h1a}<br /><em>{page.h1b}</em></h1>
            <p className="page-hero-text">{page.text}</p>
          </div>
          <div className="page-hero-visual hud-frame">
            <div className="page-hero-visual-inner" style={{ backgroundImage: `url(${partnerUrls.heroVisual})` }} />
            <div className="page-hero-visual-shade" />
            <div className="page-hero-visual-content">
              <strong>{partners.length}</strong><small>{page.visualLabel}</small>
              <span>{page.visualMeta}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="partner-strip wrap" aria-label={page.stripLabel}>
        <span className="partner-strip-label">{page.stripLabel}</span>
        <div className="partner-strip-marks">
          {partners.map((partner) => (
            <a className={`partner-strip-item partner-strip-${partner.tone}`} key={partner.id} href={partner.external} target="_blank" rel="noreferrer">
              <PartnerMark partner={partner} size="sm" />
            </a>
          ))}
        </div>
      </section>

      <section className="partners-detail wrap">
        <div className="section-label">
          <span><b>01</b> / {page.detailLabel}</span>
          <span>{page.detailMeta}</span>
        </div>

        {partners.map((partner, index) => {
          const item = page.items[partner.tag];
          return (
            <article className={`partner-detail partner-detail-${partner.tone}`} key={partner.id} id={partner.id}>
              <div className="partner-detail-side">
                <span className="partner-index">{String(index + 1).padStart(2, '0')}</span>
                <PartnerMark partner={partner} />
                <span className="partner-kicker">{item.kicker}</span>
                <div className="partner-detail-links">
                  {partner.media ? (
                    <a className="arrow-link" href={partner.media} target="_blank" rel="noreferrer">{partner.mediaLabel} <Arrow external /></a>
                  ) : null}
                  {partner.external ? (
                    <a className="arrow-link" href={partner.external} target="_blank" rel="noreferrer">{partner.externalLabel} <Arrow external /></a>
                  ) : null}
                  {partner.extra ? (
                    <a className="arrow-link" href={partner.extra} target="_blank" rel="noreferrer">{partner.extraLabel} <Arrow external /></a>
                  ) : null}
                </div>
              </div>

              <div className="partner-detail-body">
                <h2>{item.title}</h2>
                <p className="partner-detail-lead">{item.lead}</p>
                {item.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

                <div className="partner-detail-facts">
                  <span className="partner-detail-facts-label">{item.factsLabel}</span>
                  <ul className="partner-facts">
                    {item.facts.map((fact) => <li key={fact}>{fact}</li>)}
                  </ul>
                </div>

                <div className="partner-detail-note">
                  <span className="live-dot" />
                  <strong>{page.takeLabel}</strong>
                  <span>{item.take}</span>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="partners-how wrap">
        <div className="section-label">
          <span><b>02</b> / {page.howLabel1}</span>
          <span>{page.howLabel2}</span>
        </div>
        <h2 className="partners-how-title">{page.howA}<br /><em>{page.howB}</em></h2>
        <div className="partner-how-grid">
          {page.how.map((block, index) => (
            <article className="partner-how-card" key={block.title}>
              <span className="partner-index">{String(index + 1).padStart(2, '0')}</span>
              <h3>{block.title}</h3>
              <p>{block.text}</p>
              <span className="partner-how-tag">{block.tag}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="show wrap">
        <div className="section-label">
          <span><b>03</b> / {page.statsLabel}</span>
          <span>{page.statsMeta}</span>
        </div>
        <div className="stats">
          {page.stats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}<span>{stat.accent}</span></strong>
              <small>{stat.label}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="cta wrap">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {page.ctaEyebrow}</p>
          <h2>{page.ctaA}<br /><em>{page.ctaB}</em></h2>
          <p className="cta-note">{page.ctaNote}</p>
        </div>
        <a className="button button-yellow" href={partnerUrls.instagram} target="_blank" rel="noreferrer">{page.ctaBtn} <Arrow external /></a>
      </section>

      <section className="partners-sources wrap">
        <div className="section-label">
          <span><b>04</b> / {page.sourcesLabel}</span>
          <span>{page.sourcesMeta}</span>
        </div>
        <ul className="partners-sources-list">
          {page.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">{source.label} <Arrow external /></a>
              <span>{source.meta}</span>
            </li>
          ))}
        </ul>
        <div className="partners-back">
          <Link className="button button-ghost" to="/">{page.backHome} <Arrow /></Link>
          <Link className="button button-ghost" to="/news">{page.backNews} <Arrow /></Link>
        </div>
      </section>
    </>
  );
}
