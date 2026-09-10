import React from 'react';
import { Link } from 'react-router-dom';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function NotFound(){
  return (
    <section className="page-hero wrap" style={{minHeight:'70vh', display:'flex', flexDirection:'column', justifyContent:'center'}}>
      <div className="section-label"><span><b>404</b> / LOST</span><span>PAGE NOT FOUND</span></div>
      <h1 style={{fontFamily:'var(--display)', fontSize:'clamp(48px,8vw,96px)', margin:'32px 0 16px', lineHeight:.9}}>LOST<br/><em style={{color:'var(--cyan)', fontStyle:'normal'}}>IN GAME.</em></h1>
      <p className="page-hero-text">This page doesn’t exist — maybe it was never unlocked. Go back home and continue the quest.</p>
      <div style={{marginTop:24}}>
        <Link className="button button-yellow" to="/">Back to home <Arrow/></Link>
      </div>
    </section>
  );
}
