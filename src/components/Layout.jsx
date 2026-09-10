import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../auth/AuthContext';

const base = import.meta.env.BASE_URL;

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change and scroll to top
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const isHome = location.pathname === '/';
  
  return (
    <>
      <nav className={`${scrolled ? 'nav scrolled' : 'nav'}${isHome ? ' nav-home' : ''}`}>
        <Link className="brand" to="/" aria-label="Let's Play, home">
          <img className="brand-logo" src={`${base}lets-play-logo.png`} alt="Let’s Play" />
        </Link>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={t.nav.menuAria}>
          {t.nav.menu} <span className={menuOpen ? 'dash open' : 'dash'}>—</span>
        </button>
        <div className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <Link to="/" className={isActive('/') ? 'active' : ''} onClick={() => setMenuOpen(false)}>{t.nav.home}</Link>
          <Link to="/news" className={isActive('/news') ? 'active' : ''} onClick={() => setMenuOpen(false)}>{t.nav.news}</Link>
          <Link to="/reviews" className={isActive('/reviews') ? 'active' : ''} onClick={() => setMenuOpen(false)}>{t.nav.reviews}</Link>
          <Link to="/dossiers" className={isActive('/dossiers') ? 'active' : ''} onClick={() => setMenuOpen(false)}>{t.nav.dossiers}</Link>
          <LanguageSwitcher variant="nav" />
          <Link to="/auth" className="nav-account" onClick={() => setMenuOpen(false)}>{user ? (user.email?.split('@')[0] || 'Account') : 'Join'}</Link>
          <a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer" className="nav-cta" onClick={() => setMenuOpen(false)}>{t.nav.watch} ↗</a>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="footer wrap">
        <Link className="brand" to="/" aria-label="Let's Play, home">
          <img className="brand-logo" src={`${base}lets-play-logo.png`} alt="Let’s Play" />
        </Link>
        <p>{t.footer.tagline}</p>
        <div className="footer-links">
          <Link to="/">{t.nav.home}</Link>
          <Link to="/news">{t.nav.news}</Link>
          <Link to="/reviews">{t.nav.reviews}</Link>
          <Link to="/dossiers">{t.nav.dossiers}</Link>
          <a href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">YouTube</a>
          <span>{t.footer.copyright}</span>
        </div>
      </footer>
    </>
  );
}
