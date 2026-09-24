import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../auth/AuthContext';
import SEO from './SEO';
import { searchContent } from '../search/searchIndex';
import { useAchievementAction } from '../achievements/AchievementContext';
import { isQuizFinished } from '../quizzes/quizProgress';
import { useQuizProgress } from '../quizzes/useQuizProgress';

const base = import.meta.env.BASE_URL;

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const track = useAchievementAction();
  const { progress: quizProgressState } = useQuizProgress();
  const searchRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname, location.hash]);

  // Full-screen mobile: lock scroll + Esc to close
  useEffect(() => {
    if (menuOpen) {
      const prevOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('nav-open');
      const onKey = (e) => {
        if (e.key === 'Escape') setMenuOpen(false);
      };
      window.addEventListener('keydown', onKey);
      return () => {
        document.body.style.overflow = prevOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.body.classList.remove('nav-open');
        window.removeEventListener('keydown', onKey);
      };
    }
    document.body.classList.remove('nav-open');
    return undefined;
  }, [menuOpen]);

  const isActive = (path) => location.pathname === path;
  const isHome = location.pathname === '/';
  const [searchValue, setSearchValue] = useState(() => new URLSearchParams(location.search).get('q') || '');
  const [searchOpen, setSearchOpen] = useState(false);
  const liveSearchResults = useMemo(() => searchContent(searchValue).slice(0, 6), [searchValue]);
  const searchTypeLabels = { news: 'News', review: 'Review', dossier: 'Dossier', release: 'Release', quiz: 'Quiz' };

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

  const handleSignOut = () => {
    setMenuOpen(false);
    signOut();
    navigate('/');
  };

  const logoutLabel = t.nav.logout || 'Log out';

  const primaryLinks = [
    { to: '/', label: t.nav.home, num: '01', desc: 'HOME / INDEX' },
    { to: '/news', label: t.nav.news, num: '02', desc: 'NEWS / DROPS' },
    { to: '/reviews', label: t.nav.reviews, num: '03', desc: 'REVIEWS / TESTS' },
    { to: '/dossiers', label: t.nav.dossiers, num: '04', desc: 'DOSSIERS / DEEP' },
    { to: '/quizz', label: t.nav.quiz, num: '05', desc: 'QUIZZ / PLAY' },
  ];

  return (
    <>
      <SEO />
      <nav className={`${scrolled ? 'nav scrolled' : 'nav'}${isHome ? ' nav-home' : ''}${menuOpen ? ' open' : ''}`}>
        <Link className="brand" to="/" aria-label="Let's Play, home">
          <img className="brand-logo" src={`${base}lets-play-logo.png`} alt="Let’s Play" />
        </Link>
        <button
          className={`menu-button${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : t.nav.menuAria}
          aria-expanded={menuOpen}
        >
          <span className="menu-button-label">{menuOpen ? 'Close' : t.nav.menu}</span>
          <span className="menu-button-icon" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className={menuOpen ? 'dash open' : 'dash'} aria-hidden="true">—</span>
        </button>

        <div className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <div className="nav-links-inner">
            <div className="mobile-menu-top">
              <div className="mobile-menu-eyebrow">
                <span className="live-dot" aria-hidden="true" />
                <span>NAVIGATION / LET'S PLAY — 2026</span>
                <span className="mobile-menu-eyebrow-line" aria-hidden="true" />
              </div>
            </div>

            <div className="nav-primary">
              {primaryLinks.map((link, idx) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={isActive(link.to) ? 'active' : ''}
                  onClick={() => setMenuOpen(false)}
                  style={{ '--i': idx }}
                >
                  <span className="nav-link-main">
                    <span className="nav-link-num">{link.num}</span>
                    <span className="nav-link-text">
                      <span className="nav-link-label">{link.label}</span>
                      <span className="nav-link-desc">{link.desc}</span>
                    </span>
                  </span>
                  <span className="nav-link-arrow" aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>

            <div className="nav-actions">
              <form className="nav-search" ref={searchRef} onSubmit={submitSearch} onFocus={() => setSearchOpen(true)} role="search">
                <label className="sr-only" htmlFor="nav-search-input">{t.nav.search.placeholder}</label>
                <input id="nav-search-input" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder={t.nav.search.placeholder} />
                <button type="submit" aria-label={t.nav.search.submit}>⌕</button>
                {searchOpen && searchValue.trim() && <div className="nav-search-results">
                  {liveSearchResults.length > 0 ? liveSearchResults.map((item) => {
                    const done = item.type === 'quiz' && isQuizFinished(quizProgressState, item.slug);
                    const body = (
                      <>
                        {item.image ? <img src={item.image} alt="" /> : <span className="nav-search-result-blank" aria-hidden="true" />}
                        <span>
                          <small>{searchTypeLabels[item.type]}{done ? ` · ✓ ${t.quiz?.finished || 'FINISHED'}` : ''}</small>
                          <strong>{item.title}</strong>
                        </span>
                      </>
                    );
                    return done
                      ? <span className="nav-search-result is-finished" key={`${item.type}-${item.route}`}>{body}</span>
                      : <Link className="nav-search-result" to={item.route} key={`${item.type}-${item.route}`} onClick={() => setMenuOpen(false)}>{body}</Link>;
                  }) : <span className="nav-search-empty">{t.nav.search.noResults}</span>}
                  {liveSearchResults.length > 0 && <button type="submit" className="nav-search-all">{t.nav.search.viewAll} ↗</button>}
                </div>}
              </form>

              <div className="nav-actions-grid">
                <LanguageSwitcher variant="nav" />
                {user ? (
                  <>
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
                    <button
                      type="button"
                      className="nav-logout"
                      onClick={handleSignOut}
                      aria-label={logoutLabel}
                      title={logoutLabel}
                    >
                      <svg
                        className="nav-logout-icon"
                        viewBox="0 0 12 12"
                        width="12"
                        height="12"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      <span className="nav-logout-label">{logoutLabel}</span>
                    </button>
                  </>
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

            <div className="mobile-menu-footer">
              <div className="mobile-menu-footer-top">
                <span className="mobile-menu-footer-label">FOLLOW — LET'S PLAY OFFICIEL</span>
                <div className="mobile-menu-socials">
                  <a href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">IG ↗</a>
                  <a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">YT ↗</a>
                </div>
              </div>
              <div className="mobile-menu-footer-bottom">
                <span>{t.footer.copyright}</span>
                <span className="mobile-menu-footer-dot">•</span>
                <span>Algeria / Gaming & Pop Culture</span>
              </div>
              <div className="mobile-menu-hud">
                <span /><span /><span /><span />
              </div>
            </div>
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
          <Link to="/quizz">{t.nav.quiz}</Link>
          <a href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">YouTube</a>
          <span>{t.footer.copyright}</span>
        </div>
      </footer>
    </>
  );
}
