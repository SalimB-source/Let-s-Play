import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../auth/AuthContext';
import SEO from './SEO';
import { searchContent } from '../search/searchIndex';
import { useAchievementAction, useAchievements } from '../achievements/AchievementContext';
import { levelTitle } from '../achievements/catalog';
import { avatarFor, displayNameFor } from '../lib/comments';
import { isQuizFinished } from '../quizzes/quizProgress';
import { useQuizProgress } from '../quizzes/useQuizProgress';
import ArticleReadingTools from './ArticleReadingTools';

const base = import.meta.env.BASE_URL;

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { user, isDemo, signOut } = useAuth();
  const { summary } = useAchievements();
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
  // Le wordmark officiel est le même dans les deux thèmes : son contour violet
  // le rend lisible sur la barre blanche comme sur le fond noir.
  const logoSrc = `${base}lets-play-logo.png`;

  const primaryLinks = [
    { to: '/', label: t.nav.home, num: '01', desc: 'HOME / INDEX' },
    { to: '/news', label: t.nav.news, num: '02', desc: 'NEWS / DROPS' },
    { to: '/reviews', label: t.nav.reviews, num: '03', desc: 'REVIEWS / TESTS' },
    { to: '/dossiers', label: t.nav.dossiers, num: '04', desc: 'DOSSIERS / DEEP' },
    { to: '/quizz', label: t.nav.quiz, num: '05', desc: 'QUIZZ / PLAY' },
  ];

  // Photo + niveau du joueur connecté, mêmes sources que le hub /auth :
  // avatar des métadonnées, niveau du moteur de succès (chiffres scriptés
  // pour une persona de démo). Le menu mobile les montre sous Quizz.
  const profileMeta = user?.user_metadata || {};
  const profileName = user ? displayNameFor(user) : '';
  const profileAvatar = user ? avatarFor(user) : null;
  const profileLevel = user
    ? (isDemo ? (profileMeta.level || 1) : (summary?.level?.level || 1))
    : null;
  const profileRank = user
    ? (isDemo ? (profileMeta.rankTitle || levelTitle(profileLevel, lang)) : levelTitle(profileLevel, lang))
    : '';
  const profileInitials = (profileName || '?').slice(0, 2).toUpperCase();
  const profileHref = user ? '/auth' : '/auth?mode=signin';
  const profileAria = user
    ? `${t.nav.profile}, ${profileName}, ${t.nav.levelShort} ${profileLevel}`
    : `${t.nav.profile}, ${t.nav.login}`;

  return (
    <>
      <SEO />
      <ArticleReadingTools />
      <nav className={`${scrolled ? 'nav scrolled' : 'nav'}${isHome ? ' nav-home' : ''}${menuOpen ? ' open' : ''}`}>
        <Link className="brand" to="/" aria-label="Let's Play, home">
          <img className="brand-logo" src={logoSrc} alt="Let’s Play" />
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
              {/* Menu mobile uniquement : entrée Profil juste sous Quizz,
                  avec la photo et le niveau. Le desktop garde la pastille. */}
              <Link
                to={profileHref}
                className={`nav-profile-link${user ? ' is-player' : ' is-guest'}${isActive('/auth') ? ' active' : ''}`}
                onClick={() => setMenuOpen(false)}
                style={{ '--i': primaryLinks.length }}
                aria-label={profileAria}
              >
                <span className="nav-link-main">
                        <span className="nav-link-num">07</span>
                  <span className="nav-profile-avatar" aria-hidden="true">
                    <span className="nav-profile-avatar-face">
                      {profileAvatar ? (
                        <img src={profileAvatar} alt="" />
                      ) : user ? (
                        <span className="nav-profile-initials">{profileInitials}</span>
                      ) : (
                        <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
                          <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                          <path d="M5.2 19.2c1.3-3.1 3.6-4.5 6.8-4.5s5.5 1.4 6.8 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      )}
                    </span>
                    {user ? <span className="nav-online-dot" /> : null}
                  </span>
                  <span className="nav-link-text">
                    <span className="nav-link-label">{t.nav.profile}</span>
                    <span className="nav-link-desc">{user ? `${profileName} · ${profileRank}` : t.nav.login}</span>
                  </span>
                </span>
                {user ? (
                  <span className="nav-profile-level">
                    <small>{t.nav.levelShort}</small>
                    <strong>{profileLevel}</strong>
                  </span>
                ) : (
                  <span className="nav-link-arrow" aria-hidden="true">↗</span>
                )}
              </Link>
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
                <ThemeToggle />
                {user ? (
                  <>
                    <Link
                      to="/auth"
                      className="nav-account connected"
                      onClick={() => setMenuOpen(false)}
                      aria-label={profileAria}
                      title={profileAria}
                      aria-current={isActive('/auth') ? 'page' : undefined}
                    >
                      <span className="nav-account-inner">
                        <span className="nav-account-avatar" aria-hidden="true">
                          <span className="nav-account-avatar-face">
                            {profileAvatar ? (
                              <img src={profileAvatar} alt="" />
                            ) : (
                              <span className="nav-account-initials">{profileInitials}</span>
                            )}
                          </span>
                          <span className="nav-online-dot" />
                        </span>
                        <span className="nav-account-name">
                          {profileName || user.user_metadata?.gamertag || user.email?.split('@')[0] || 'Account'}
                        </span>
                        {profileLevel != null && (
                          <span className="nav-account-level" aria-hidden="true">
                            <small>{t.nav.levelShort}</small>
                            <strong>{profileLevel}</strong>
                          </span>
                        )}
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
          <img className="brand-logo" src={logoSrc} alt="Let’s Play" />
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
