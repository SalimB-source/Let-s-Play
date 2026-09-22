import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../auth/AuthContext';
import SEO from './SEO';
import { searchContent } from '../search/searchIndex';
import { useAchievementAction } from '../achievements/AchievementContext';

const base = import.meta.env.BASE_URL;

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const track = useAchievementAction();
  const searchRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change. A `#anchor` in the URL wins over the scroll to top.
  useEffect(() => {
    setMenuOpen(false);
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname, location.hash]);

  const isActive = (path) => location.pathname === path;
  const isHome = location.pathname === '/';
  const [searchValue, setSearchValue] = useState(() => new URLSearchParams(location.search).get('q') || '');
  const [searchOpen, setSearchOpen] = useState(false);
  const liveSearchResults = useMemo(() => searchContent(searchValue).slice(0, 6), [searchValue]);
  const searchTypeLabels = { news: 'News', review: 'Review', dossier: 'Dossier', release: 'Release' };

  useEffect(() => {
    setSearchValue(new URLSearchParams(location.search).get('q') || '');
  }, [location.search]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchValue.trim();
    if (query) track('search_performed', { query });
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
    setMenuOpen(false);
    setSearchOpen(false);
  };
  
  return (
    <>
      <SEO />
      <nav className={`${scrolled ? 'nav scrolled' : 'nav'}${isHome ? ' nav-home' : ''}`}>
        <Link className="brand" to="/" aria-label="Let's Play, home">
          <img className="brand-logo" src={`${base}lets-play-logo.png`} alt="Let’s Play" />
        </Link>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={t.nav.menuAria}>
          {t.nav.menu} <span className={menuOpen ? 'dash open' : 'dash'}>—</span>
        </button>
        <div className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <div className="nav-primary">
            <Link to="/" className={isActive('/') ? 'active' : ''} onClick={() => setMenuOpen(false)}>{t.nav.home}</Link>
            <Link to="/news" className={isActive('/news') ? 'active' : ''} onClick={() => setMenuOpen(false)}>{t.nav.news}</Link>
            <Link to="/reviews" className={isActive('/reviews') ? 'active' : ''} onClick={() => setMenuOpen(false)}>{t.nav.reviews}</Link>
            <Link to="/dossiers" className={isActive('/dossiers') ? 'active' : ''} onClick={() => setMenuOpen(false)}>{t.nav.dossiers}</Link>
            <Link to="/events" className={isActive('/events') ? 'active' : ''} onClick={() => setMenuOpen(false)}>Events</Link>
          </div>
          <div className="nav-actions">
            <form className="nav-search" ref={searchRef} onSubmit={submitSearch} onFocus={() => setSearchOpen(true)} role="search">
            <label className="sr-only" htmlFor="nav-search-input">{t.nav.search.placeholder}</label>
            <input id="nav-search-input" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder={t.nav.search.placeholder} />
            <button type="submit" aria-label={t.nav.search.submit}>⌕</button>
            {searchOpen && searchValue.trim() && <div className="nav-search-results">
              {liveSearchResults.length > 0 ? liveSearchResults.map((item) => (
                <Link className="nav-search-result" to={item.route} key={`${item.type}-${item.route}`} onClick={() => setMenuOpen(false)}>
                  {item.image ? <img src={item.image} alt="" /> : <span className="nav-search-result-blank" aria-hidden="true" />}
                  <span><small>{searchTypeLabels[item.type]}</small><strong>{item.title}</strong></span>
                </Link>
              )) : <span className="nav-search-empty">{t.nav.search.noResults}</span>}
              {liveSearchResults.length > 0 && <button type="submit" className="nav-search-all">{t.nav.search.viewAll} ↗</button>}
            </div>}
            </form>
            <LanguageSwitcher variant="nav" />
            {user ? (
              <Link
                to="/auth"
                className={`nav-account connected`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="nav-account-inner">
                  <span className="nav-online-dot" aria-hidden="true" />
                  <span className="nav-account-name">
                    {user.user_metadata?.gamertag || user.email?.split('@')[0] || 'Account'}
                  </span>
                </span>
              </Link>
            ) : (
              <>
                <Link
                  to="/auth?mode=signin"
                  className="nav-account nav-login"
                  onClick={() => setMenuOpen(false)}
                >
                  {t.nav.login || 'Log in'}
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className="nav-account nav-register"
                  onClick={() => setMenuOpen(false)}
                >
                  {t.nav.register || 'Register'}
                </Link>
              </>
            )}
          </div>
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
          <Link to="/events">Events</Link>
          <a href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">YouTube</a>
          <span>{t.footer.copyright}</span>
        </div>
      </footer>
    </>
  );
}
