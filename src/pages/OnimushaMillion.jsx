import React from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import Comments from '../components/Comments';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function OnimushaMillion(){
  const { t } = useLanguage();
  const a = t.news.million;
  return <>
    <section className="article-hero wrap"><div className="section-label"><span><b>{a.label.split(' / ')[0]}</b> / {a.label.split(' / ')[1]}</span><span>{a.date}</span></div><div className="article-heading"><div><p className="eyebrow"><span className="live-dot" /> {a.eyebrow}</p><h1>{a.title}<br/><em>{a.titleAccent}</em></h1><p className="article-dek">{a.dek}</p><div className="article-byline"><span>{a.byline}</span><span>{a.readTime}</span></div></div><div className="article-cover hud-frame"><img src={`${base}onimusha-million-news.jpg`} alt={a.coverAlt} /><div><small>{a.coverKicker}</small><strong>ONIMUSHA</strong></div></div></div></section>
    <main className="article-layout wrap"><article className="article-body"><p className="article-lead">{a.lead}</p><p>{a.intro}</p><h2>{a.h2a}</h2><p>{a.p1}</p><div className="article-pullquote"><span>“</span><p>{a.quote}</p><small>{a.quoteBy}</small></div><p>{a.p2}</p><h2>{a.h2b}</h2><p>{a.p3}</p><p>{a.p4}</p><div className="article-endnote"><span className="live-dot" /><strong>{a.take}</strong><span>{a.takeText}</span></div><p className="article-source">{a.source} <a href="https://news.instant-gaming.com/fr/articles/21746-onimusha-way-of-the-sword-s-est-vendu-a-plus-d-un-million-d-exemplaires-le-jour-de-sa-sortie" target="_blank" rel="noreferrer">{a.sourceDetail}</a></p></article><aside className="article-aside"><div className="aside-card"><span className="aside-kicker">{a.quick}</span><strong>{a.milestone}</strong><strong>{a.franchise}</strong><strong>{a.platforms}</strong></div><div className="aside-card aside-card-accent"><span className="aside-kicker">{a.next}</span><strong>{a.nextTitle}</strong><p>{a.nextText}</p><Link className="arrow-link" to="/news">{a.back} <Arrow/></Link></div></aside></main>
    <Comments />
    <section className="cta wrap"><div><p className="eyebrow"><span className="live-dot" /> {a.ctaEyebrow}</p><h2>{a.ctaA}<br/><em>{a.ctaB}</em></h2></div><Link className="button button-yellow" to="/news">{a.backButton} <Arrow/></Link></section>
  </>;
}
