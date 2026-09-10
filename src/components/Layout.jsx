import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const base = import.meta.env.BASE_URL;

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

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

  return (
    <>
      <nav className={scrolled ? 'nav scrolled' : 'nav'}>
        <Link className="brand" to="/" aria-label="Let's Play, home">
          <img className="brand-logo" src={`${base}lets-play-logo.png`} alt="Let’s Play" />
        </Link>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Ouvrir le menu">
          MENU <span className={menuOpen ? 'dash open' : 'dash'}>—</span>
        </button>
        <div className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <Link to="/" className={isActive('/') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/news" className={isActive('/news') ? 'active' : ''} onClick={() => setMenuOpen(false)}>News</Link>
          <Link to="/reviews" className={isActive('/reviews') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Reviews</Link>
          <Link to="/dossiers" className={isActive('/dossiers') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Dossiers</Link>
          <a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer" className="nav-cta" onClick={() => setMenuOpen(false)}>Watch ↗</a>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="footer wrap">
        <Link className="brand" to="/" aria-label="Let's Play, home">
          <img className="brand-logo" src={`${base}lets-play-logo.png`} alt="Let’s Play" />
        </Link>
        <p>An original show dedicated to the culture that brings us together. Now multi-page.</p>
        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/news">News</Link>
          <Link to="/reviews">Reviews</Link>
          <Link to="/dossiers">Dossiers</Link>
          <a href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">YouTube</a>
          <span>© 2026 Let’s Play</span>
        </div>
      </footer>
    </>
  );
}
