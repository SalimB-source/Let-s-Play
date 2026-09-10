import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function NotFound(){
  const { t } = useLanguage();
  return (
    <section className="page-hero wrap" style={{minHeight:'70vh', display:'flex', flexDirection:'column', justifyContent:'center'}}>
      <div className="section-label"><span><b>{t.notFound.label1.split(' / ')[0]}</b> / {t.notFound.label1.split(' / ')[1]}</span><span>{t.notFound.label2}</span></div>
      <h1 style={{fontFamily:'var(--display)', fontSize:'clamp(48px,8vw,96px)', margin:'32px 0 16px', lineHeight:.9}}>{t.notFound.h1a}<br/><em style={{color:'var(--cyan)', fontStyle:'normal'}}>{t.notFound.h1b}</em></h1>
      <p className="page-hero-text">{t.notFound.text}</p>
      <div style={{marginTop:24}}>
        <Link className="button button-yellow" to="/">{t.notFound.backToHome} <Arrow/></Link>
      </div>
    </section>
  );
}
