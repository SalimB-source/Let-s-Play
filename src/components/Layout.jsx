import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import NeonBackdrop from './NeonBackdrop';

const base = import.meta.env.BASE_URL;

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastScroll = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { user, isDemo, signOut } = useAuth();
  const { summary } = useAchievements();
  const track = useAchievementAction();
  const { progress: quizProgressState } = useQuizProgress();
  const searchRef = useRef(null);
  const navPrimaryRef = useRef(null);
  const profileWrapRef = useRef(null);
  const paletteInputRef = useRef(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });

  // scrolled shrink
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // hide on scroll down (desktop island)
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const last = lastScroll.current;
        const goingDown = y > last + 8;
        const goingUp = y < last - 8;
        // ne cache que sur desktop et quand aucun overlay n'est ouvert
        const isDesktop = window.innerWidth > 800;
        const anyOverlay = menuOpen || paletteOpen || profileMenuOpen;
        if (isDesktop && !anyOverlay && y > 120 && goingDown) {
          setNavHidden(true);
        } else if (goingUp || y < 80 || !isDesktop) {
          setNavHidden(false);
        }
        lastScroll.current = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [menuOpen, paletteOpen, profileMenuOpen]);

  // pill indicator qui glisse
  const updateIndicator = () => {
    const el = navPrimaryRef.current;
    if (!el || window.innerWidth <= 800) {
      setIndicator((p) => ({ ...p, opacity: 0 }));
      return;
    }
    const active = el.querySelector('a.active');
    if (!active) {
      setIndicator((p) => ({ ...p, opacity: 0 }));
      return;
    }
    const pr = el.getBoundingClientRect();
    const ar = active.getBoundingClientRect();
    setIndicator({ left: ar.left - pr.left, width: ar.width, opacity: 1 });
  };
  useLayoutEffect(() => {
    updateIndicator();
  }, [location.pathname]);
  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    // attend la fin de la transition d'entrée
    const t = setTimeout(updateIndicator, 800);
    return () => {
      window.removeEventListener('resize', updateIndicator);
      clearTimeout(t);
    };
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setPaletteOpen(false);
    setProfileMenuOpen(false);
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

  // palette + profil : Esc ferme tout
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setProfileMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // lock scroll quand palette ouverte
  useEffect(() => {
    if (paletteOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // focus input après ouverture
      setTimeout(() => paletteInputRef.current?.focus(), 30);
      return () => { document.body.style.overflow = prev; };
    }
  }, [paletteOpen]);

  const isActive = (path) => location.pathname === path;
  const isHome = location.pathname === '/';
  const [searchValue, setSearchValue] = useState(() => new URLSearchParams(location.search).get('q') || '');
  const [searchOpen, setSearchOpen] = useState(false);
  const liveSearchResults = useMemo(() => searchContent(searchValue).slice(0, 6), [searchValue]);
  const paletteResults = useMemo(() => searchContent(paletteQuery).slice(0, 8), [paletteQuery]);
  const searchTypeLabels = { news: 'News', review: 'Review', dossier: 'Dossier', release: 'Release', quiz: 'Quiz' };
  const searchInputRef = useRef(null);

  useEffect(() => {
    setSearchValue(new URLSearchParams(location.search).get('q') || '');
  }, [location.search]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false);
      if (profileWrapRef.current && !profileWrapRef.current.contains(event.target)) setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  // Cmd+K / Ctrl+K ouvre la palette plein centre
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase() === 'k';
      const slash = e.key === '/';
      if ((e.metaKey || e.ctrlKey) && k) {
        e.preventDefault();
        setPaletteQuery(searchValue);
        setPaletteOpen(true);
      } else if (slash && !e.metaKey && !e.ctrlKey && !paletteOpen && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setPaletteQuery('');
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchValue, paletteOpen]);

  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchValue.trim();
    if (query) track('search_performed', { query });
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
    setMenuOpen(false);
    setSearchOpen(false);
  };

  const submitPalette = (query) => {
    const q = (query ?? paletteQuery).trim();
    if (q) track('search_performed', { query: q });
    setPaletteOpen(false);
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    setProfileMenuOpen(false);
    signOut();
    navigate('/');
  };

  const logoutLabel = t.nav.logout || 'Log out';
  const logoSrc = `${base}lets-play-logo.png`;

  const primaryLinks = [
    { to: '/', label: t.nav.home, num: '01', desc: 'HOME / INDEX' },
    { to: '/news', label: t.nav.news, num: '02', desc: 'NEWS / DROPS' },
    { to: '/reviews', label: t.nav.reviews, num: '03', desc: 'REVIEWS / TESTS' },
    { to: '/dossiers', label: t.nav.dossiers, num: '04', desc: 'DOSSIERS / DEEP' },
    { to: '/quizz', label: t.nav.quiz, num: '05', desc: 'QUIZZ / PLAY' },
  ];

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

  const navClass = [
    'nav',
    scrolled ? 'scrolled' : '',
    isHome ? 'nav-home' : '',
    menuOpen ? 'open' : '',
    navHidden ? 'nav-hidden' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <SEO />
      <ArticleReadingTools />
      {/* Quelques rappels néon sur le fond — décoratifs, derrière le contenu */}
      <NeonBackdrop />
      <nav className={navClass} aria-label="Navigation principale">
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

            <div className="nav-primary" ref={navPrimaryRef} role="navigation" aria-label="Sections">
              <span
                className="nav-pill-indicator"
                aria-hidden="true"
                style={{ left: indicator.left, width: indicator.width, opacity: indicator.opacity }}
              />
              {primaryLinks.map((link, idx) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={isActive(link.to) ? 'active' : ''}
                  aria-current={isActive(link.to) ? 'page' : undefined}
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
              <form className="nav-search" ref={searchRef} onSubmit={submitSearch} onFocus={() => setSearchOpen(true)} role="search" aria-label="Recherche">
                <label className="sr-only" htmlFor="nav-search-input">{t.nav.search.placeholder}</label>
                <span className="nav-search-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <input ref={searchInputRef} id="nav-search-input" value={searchValue} onChange={(event) => { setSearchValue(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder={t.nav.search.placeholder} autoComplete="off" />
                {searchValue ? (
                  <button type="button" className="nav-search-clear" aria-label="Effacer" onClick={() => { setSearchValue(''); setSearchOpen(false); searchInputRef.current?.focus(); }}>
                    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </button>
                ) : (
                  <span className="nav-search-kbd" aria-hidden="true" onClick={() => { setPaletteQuery(''); setPaletteOpen(true); }} style={{cursor:'pointer'}}><span>⌘</span><span>K</span></span>
                )}
                <button type="submit" aria-label={t.nav.search.submit} className="nav-search-submit">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h9M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
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
                    <div className="nav-profile-wrap" ref={profileWrapRef} onMouseEnter={() => setProfileMenuOpen(true)} onMouseLeave={() => setProfileMenuOpen(false)}>
                      <Link
                        to="/auth"
                        className="nav-account connected"
                        onClick={() => setMenuOpen(false)}
                        aria-label={profileAria}
                        title={profileAria}
                        aria-current={isActive('/auth') ? 'page' : undefined}
                        aria-expanded={profileMenuOpen}
                        aria-haspopup="menu"
                        onFocus={() => setProfileMenuOpen(true)}
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
                      <div className={`nav-profile-dropdown${profileMenuOpen ? ' open' : ''}`} role="menu" aria-hidden={!profileMenuOpen}>
                        <div className="nav-profile-dropdown-head">
                          <span className="nav-profile-dropdown-avatar" aria-hidden="true">
                            {profileAvatar ? <img src={profileAvatar} alt="" /> : <span>{profileInitials}</span>}
                            <span className="nav-online-dot" />
                          </span>
                          <span className="nav-profile-dropdown-meta">
                            <strong>{profileName}</strong>
                            <small>{profileRank} · {t.nav.levelShort} {profileLevel}</small>
                          </span>
                        </div>
                        <div className="nav-profile-dropdown-progress" aria-hidden="true">
                          <span style={{ width: `${Math.min(100, ((summary?.xpProgress ?? 0) * 100) || 34)}%` }} />
                        </div>
                        <nav className="nav-profile-dropdown-links">
                          <Link to="/auth" role="menuitem" onClick={() => setProfileMenuOpen(false)}><span>◉</span> {t.nav.profile} <em>↗</em></Link>
                          <Link to="/messages" role="menuitem" onClick={() => setProfileMenuOpen(false)}><span>✉</span> Messages <em>↗</em></Link>
                          <Link to="/auth#achievements" role="menuitem" onClick={() => setProfileMenuOpen(false)}><span>🏆</span> Succès <em>↗</em></Link>
                        </nav>
                        <button type="button" className="nav-profile-dropdown-logout" onClick={handleSignOut} role="menuitem">
                          <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                          {logoutLabel}
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="nav-logout"
                      onClick={handleSignOut}
                      aria-label={logoutLabel}
                      title={logoutLabel}
                    >
                      <svg className="nav-logout-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 21H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5M16 17l5-5-5-5M21 12H9" />
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

      {paletteOpen && (
        <div className="cmd-palette-overlay" onMouseDown={() => setPaletteOpen(false)} role="dialog" aria-modal="true" aria-label="Recherche">
          <div className="cmd-palette" onMouseDown={(e) => e.stopPropagation()}>
            <div className="cmd-palette-head">
              <span className="cmd-palette-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" /><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </span>
              <input
                ref={paletteInputRef}
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitPalette(); }}
                placeholder={t.nav.search.placeholder || 'Rechercher…'}
                aria-label={t.nav.search.placeholder}
              />
              <span className="cmd-palette-kbd" aria-hidden="true">ESC</span>
              <button type="button" className="cmd-palette-close" aria-label="Fermer" onClick={() => setPaletteOpen(false)}>
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="cmd-palette-meta">
              <span className="cmd-palette-hint"><span className="live-dot" /> {paletteQuery ? `${paletteResults.length} résultats` : 'Tape pour chercher · news, reviews, dossiers, quizz'} </span>
              <span className="cmd-palette-shortcuts"><em>↵</em> ouvrir · <em>ESC</em> fermer</span>
            </div>
            <div className="cmd-palette-results" role="listbox">
              {paletteQuery.trim() ? (
                paletteResults.length > 0 ? (
                  <>
                    {paletteResults.map((item) => {
                      const done = item.type === 'quiz' && isQuizFinished(quizProgressState, item.slug);
                      return done ? (
                        <span key={`${item.type}-${item.route}`} className="cmd-palette-item is-finished" aria-disabled="true">
                          <span className="cmd-palette-item-media">{item.image ? <img src={item.image} alt="" /> : <span className="cmd-palette-item-blank" />}</span>
                          <span className="cmd-palette-item-text"><small>{searchTypeLabels[item.type]} · ✓ {t.quiz?.finished || 'FINISHED'}</small><strong>{item.title}</strong></span>
                          <span className="cmd-palette-item-arrow">✓</span>
                        </span>
                      ) : (
                        <Link key={`${item.type}-${item.route}`} to={item.route} className="cmd-palette-item" onClick={() => setPaletteOpen(false)} role="option">
                          <span className="cmd-palette-item-media">{item.image ? <img src={item.image} alt="" /> : <span className="cmd-palette-item-blank" />}</span>
                          <span className="cmd-palette-item-text"><small>{searchTypeLabels[item.type]}</small><strong>{item.title}</strong></span>
                          <span className="cmd-palette-item-arrow">↗</span>
                        </Link>
                      );
                    })}
                    <button type="button" className="cmd-palette-all" onClick={() => submitPalette()}>
                      Voir tous les résultats pour “{paletteQuery}” ↗
                    </button>
                  </>
                ) : (
                  <span className="cmd-palette-empty">{t.nav.search.noResults} — essaie un autre mot-clé</span>
                )
              ) : (
                <div className="cmd-palette-recent">
                  <small>Accès rapide</small>
                  <div className="cmd-palette-quick">
                    {primaryLinks.map((l) => (
                      <Link key={l.to} to={l.to} onClick={() => setPaletteOpen(false)}>{l.label} <em>↗</em></Link>
                    ))}
                    <Link to="/search" onClick={() => setPaletteOpen(false)}>Recherche avancée <em>↗</em></Link>
                  </div>
                  <div className="cmd-palette-tips">
                    <span><strong>⌘K</strong> ouvrir</span><span><strong>/</strong> focus</span><span><strong>ESC</strong> fermer</span>
                  </div>
                </div>
              )}
            </div>
            <div className="cmd-palette-foot">
              <span>LET'S PLAY — 2026 · Gaming & Pop Culture</span>
              <span className="cmd-palette-foot-dot">•</span>
              <span>Algeria</span>
            </div>
          </div>
        </div>
      )}

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
