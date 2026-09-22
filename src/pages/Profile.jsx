import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { DEMO_PROFILES } from '../auth/demoProfiles';
import { supabase } from '../lib/supabase';
import { useAchievements } from '../achievements/AchievementContext';
import { levelTitle } from '../achievements/catalog';
import { useLanguage } from '../i18n/LanguageContext';
import DeleteAccount from '../components/DeleteAccount';
import FriendButton from '../friends/FriendButton';
import MessageButton from '../messages/MessageButton';
import { useFriends } from '../friends/FriendsContext';
import { isRecentlySeen } from '../friends/friendsApi';
import { demoPresence, findDemoPlayer } from '../friends/demoRoster';
import { normalizePlatforms, gamePlatforms } from '../lib/gameLibrary';

function formatJoined(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  } catch {
    return String(d.getFullYear());
  }
}

function DemoNotFound({ id }) {
  return (
    <section className="auth-page wrap">
      <div className="player-hub">
        <div className="player-section" style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--display)', color: '#fff' }}>Profil introuvable</h2>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>Le joueur “{id}” n’existe pas.</p>
          <Link to="/auth" className="button button-yellow" style={{ marginTop: 18 }}>Retour au hub</Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Ligne « jeux testés » du profil : une puce par jeu, avec les plateformes
 * cataloguées du titre (PS5 / Xbox Series X) quand le jeu est dans le
 * catalogue — un titre stocké avant une mise à jour du catalogue s'affiche
 * quand même, sans tag.
 */
function TestedGamesRow({ games, heading = 'Jeux testés', sub = 'PS5 · Xbox Series X', emptyText = null }) {
  const list = Array.isArray(games) ? games.filter((g) => typeof g === 'string' && g.trim()) : [];
  return (
    <div className="player-section">
      <div className="player-section-header">
        <h2>{heading}</h2>
        <p>{sub}</p>
      </div>
      {list.length > 0 ? (
        <div className="player-games-row">
          {list.map((title) => {
            const platforms = gamePlatforms(title);
            return (
              <span key={title} className="player-game-pill">
                <span className="player-game-pill-title">{title}</span>
                {platforms.length > 0 && <span className="player-game-pill-platforms">{platforms.join(' · ')}</span>}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="player-empty-note">{emptyText || 'Aucun jeu testé pour l’instant.'}</p>
      )}
    </div>
  );
}

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const { summary } = useAchievements();
  const { lang } = useLanguage();
  const friends = useFriends();
  const isOwn = me && userId === me.id;
  const demoProfile = Object.values(DEMO_PROFILES).find((p) => p.id === userId);
  // Joueur de la communauté de démonstration (liste d'amis des personas) :
  // pas de compte, une fiche scriptée.
  const demoPlayer = !demoProfile ? findDemoPlayer(userId) : null;
  const [remoteProfile, setRemoteProfile] = useState(null);
  const [commentCount, setCommentCount] = useState(null);
  // Les fiches scriptées (personas, communauté démo) sont connues tout de
  // suite : pas de squelette de chargement pour elles.
  const [loading, setLoading] = useState(() => !(demoProfile || demoPlayer));
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (demoProfile || demoPlayer) {
      setLoading(false);
      return;
    }
    if (isOwn) {
      setLoading(false);
      return;
    }
    if (!supabase) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        // `last_seen_at` (présence), `platforms` et `tested_games` (section
        // 3b2 du schéma) n'existent que si la migration a été appliquée :
        // on essaie les colonnes par paliers, du plus riche au plus basique.
        const SELECT_TIERS = [
          'id, username, display_name, avatar_url, created_at, updated_at, last_seen_at, platforms, tested_games',
          'id, username, display_name, avatar_url, created_at, updated_at, last_seen_at',
          'id, username, display_name, avatar_url, created_at, updated_at',
        ];
        let data = null;
        let error = null;
        for (const select of SELECT_TIERS) {
          ({ data, error } = await supabase.from('profiles').select(select).eq('id', userId).maybeSingle());
          const message = String(error && error.message || '');
          const missingOptionalColumn = Boolean(error)
            && (message.includes('last_seen_at') || message.includes('platforms') || message.includes('tested_games'));
          if (!error || !missingOptionalColumn) break;
        }
        if (cancelled) return;
        if (error) throw error;
        if (!data) {
          setNotFound(true);
        } else {
          setRemoteProfile(data);
          // fetch comment count
          try {
            const { count } = await supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', userId);
            if (!cancelled && typeof count === 'number') setCommentCount(count);
          } catch {}
        }
      } catch (e) {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, demoProfile, demoPlayer, isOwn]);

  // Own profile → redirect to hub for editing
  if (isOwn) {
    // show own hub inline instead of redirecting, to keep XP sync with achievements
    const meta = me.user_metadata || {};
    const gamertag = meta.gamertag || me.email?.split('@')[0] || 'Player_DZ';
    const fullName = meta.fullName || meta.full_name || me.email || 'Let’s Play Player';
    const tier = meta.tier || 'TIER I · MEMBER';
    const rankTitle = meta.rankTitle || 'New Player';
    const avatar = meta.avatar || meta.avatar_url || meta.picture || null;
    const lvl = summary?.level?.level ?? meta.level ?? 1;
    const xp = summary?.xp ?? meta.xp ?? 0;
    const xpForNext = summary?.level?.xpForNextLevel ?? meta.nextLevelXp ?? 100;
    const xpInLevel = summary?.level?.xpInLevel ?? 0;
    const percent = summary?.level?.percent ?? 0;
    const title = levelTitle(lvl, lang);
    // Consoles possédées + jeux testés : la sélection se fait dans le hub
    // joueur (/auth), le profil l'affiche.
    const ownPlatforms = normalizePlatforms(meta.platforms);
    const ownGames = Array.isArray(meta.testedGames) ? meta.testedGames : [];

    return (
      <section className="auth-page wrap">
        <div className="player-hub">
          <div className="player-demo-banner" style={{ background: 'rgba(34,211,238,.08)', borderColor: 'var(--cyan)' }}>
            <div className="player-demo-banner-left">
              <span className="player-demo-pill" style={{ background: 'var(--cyan)', color: '#07101a' }}>VOTRE PROFIL</span>
              <span className="player-demo-text">Vous consultez votre propre profil — gérez-le depuis le hub joueur.</span>
            </div>
            <Link to="/auth" className="player-demo-switch-btn">Ouvrir le hub ↗</Link>
          </div>

          <div className="player-profile-card">
            <div className="player-header-layout">
              <div className="player-avatar-col">
                <div className="player-avatar-wrap" style={{ cursor: 'default' }}>
                  {avatar ? <img src={avatar} alt={gamertag} className="player-avatar-img" /> : <div className="player-avatar-fallback">{gamertag.slice(0,2).toUpperCase()}</div>}
                  <span className="player-status-badge"><span className="player-status-dot" /> EN LIGNE</span>
                </div>
              </div>
              <div className="player-identity">
                <div className="player-tags-row">
                  <span className="player-badge-tier">{tier}</span>
                  <span className="player-badge-verified">NIV. {lvl} · {xp} XP</span>
                </div>
                <h1 className="player-gamertag">{gamertag}</h1>
                <div className="player-meta-line">
                  <span><strong>{fullName}</strong></span><span>•</span><span>{me.email}</span><span>•</span><span>Membre depuis {formatJoined(me.created_at)}</span>
                </div>
                {meta.bio && <p className="player-bio">{meta.bio}</p>}
              </div>
            </div>
            <div className="player-xp-section">
              <div className="player-xp-header">
                <span className="player-xp-level-tag">NIVEAU {lvl} — {title}</span>
                <span className="player-xp-count">{xp} / {xpForNext} XP ({percent}%)</span>
              </div>
              <div className="player-xp-bar-bg"><div className="player-xp-bar-fill" style={{ width: `${percent}%` }} /></div>
              <p style={{ margin: '8px 0 0', color: 'var(--dim)', font: '500 10px var(--mono)', letterSpacing: '.12em' }}>{xpInLevel} XP dans le niveau · {xpForNext - xpInLevel} XP avant le prochain rang</p>
            </div>
          </div>

          {/* CONSOLES POSSÉDÉES — sélection faite dans le hub joueur */}
          <div className="player-section">
            <div className="player-section-header">
              <h2>Mes consoles</h2>
              <p>Les consoles que tu possèdes — choisis-les dans ton hub joueur.</p>
            </div>
            {ownPlatforms.length > 0 ? (
              <div className="player-platforms-row">
                {ownPlatforms.map((p) => <span key={p} className="player-platform-pill">🎮 {p}</span>)}
              </div>
            ) : (
              <p className="player-empty-note">Aucune console ajoutée pour l’instant — coche-les dans ton hub.</p>
            )}
          </div>

          {/* JEUX TESTÉS — PS5 / Xbox Series X, catalogue + recherche dans le hub */}
          <TestedGamesRow
            games={ownGames}
            emptyText="Aucun jeu testé pour l’instant — ajoute-les depuis ton hub."
          />

          <div className="player-actions-card">
            <div className="player-actions-left">
              <Link to="/auth" className="button button-yellow">Gérer mon profil ↗</Link>
              <button type="button" className="button button-ghost" onClick={() => navigate(-1)}>Retour</button>
            </div>
            <div className="player-actions-right">
              <DeleteAccount />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="auth-page wrap">
        <div className="player-hub">
          <div className="player-profile-card" style={{ padding: 40, textAlign: 'center' }}>
            <div className="comment-skeleton" style={{ height: 120, width: '40%', margin: '0 auto 24px' }} />
            <div className="comment-skeleton" style={{ height: 16, width: '60%', margin: '0 auto' }} />
          </div>
        </div>
      </section>
    );
  }

  if (demoProfile) {
    const meta = demoProfile.user_metadata;
    const lvl = meta.level || 1;
    const xp = meta.xp || 0;
    const next = meta.nextLevelXp || 100;
    const pct = next > 0 ? Math.min(100, Math.round((xp / next) * 100)) : 0;
    const title = meta.rankTitle || levelTitle(lvl, lang);
    return (
      <section className="auth-page wrap">
        <div className="player-hub">
          <div className="player-demo-banner">
            <div className="player-demo-banner-left">
              <span className="player-demo-pill">APERÇU DÉMO</span>
              <span className="player-demo-text">Profil de démonstration — cet aperçu simule un joueur connecté.</span>
            </div>
            <Link to="/auth" className="player-demo-switch-btn">Ouvrir le hub démo ↗</Link>
          </div>

          <div className="player-profile-card">
            <div className="player-header-layout">
              <div className="player-avatar-col">
                <div className="player-avatar-wrap" style={{ cursor: 'default' }}>
                  <img src={meta.avatar} alt={meta.gamertag} className="player-avatar-img" />
                  <span className="player-status-badge"><span className="player-status-dot" /> EN LIGNE</span>
                </div>
              </div>
              <div className="player-identity">
                <div className="player-tags-row">
                  <span className="player-badge-tier">{meta.tier}</span>
                  {meta.rankTag && <span className="player-badge-verified">{meta.rankTag}</span>}
                  <span className="player-badge-tier" style={{ background: 'var(--yellow)', color: '#0a0b1a', borderColor: 'var(--yellow)' }}>NIV. {lvl} · {xp} XP</span>
                </div>
                <h1 className="player-gamertag">{meta.gamertag}</h1>
                <div className="player-meta-line">
                  <span><strong>{meta.fullName}</strong></span><span>•</span><span>{demoProfile.email}</span><span>•</span><span>{meta.location}</span><span>•</span><span>Membre depuis {meta.joinedDate}</span>
                </div>
                <p className="player-bio">{meta.bio}</p>
              </div>
            </div>
            <div className="player-xp-section">
              <div className="player-xp-header">
                <span className="player-xp-level-tag">NIVEAU {lvl} — {title}</span>
                <span className="player-xp-count">{xp.toLocaleString()} / {next.toLocaleString()} XP ({pct}%)</span>
              </div>
              <div className="player-xp-bar-bg"><div className="player-xp-bar-fill" style={{ width: `${pct}%` }} /></div>
              <p style={{ margin: '8px 0 0', color: 'var(--dim)', font: '500 10px var(--mono)', letterSpacing: '.12em' }}>{meta.xp} XP au total · {next - xp} XP avant le prochain rang</p>
            </div>
          </div>

          <div className="player-stats-grid">
            <div className="player-stat-card"><div className="player-stat-value">{meta.stats.articlesRead}</div><div className="player-stat-label">Articles lus</div></div>
            <div className="player-stat-card"><div className="player-stat-value">{meta.stats.commentsPosted}</div><div className="player-stat-label">Commentaires</div></div>
            <div className="player-stat-card"><div className="player-stat-value">{meta.stats.savedArticles}</div><div className="player-stat-label">Articles sauvés</div></div>
            <div className="player-stat-card"><div className="player-stat-value">{meta.stats.badgesUnlocked}</div><div className="player-stat-label">Succès</div></div>
          </div>

          {meta.platforms?.length > 0 && (
            <div className="player-section">
              <div className="player-section-header"><h2>Plateformes</h2></div>
              <div className="player-platforms-row">{meta.platforms.map((p) => <span key={p} className="player-platform-pill">🎮 {p}</span>)}</div>
            </div>
          )}

          {meta.testedGames?.length > 0 && (
            <TestedGamesRow games={meta.testedGames} />
          )}

          {meta.badges?.length > 0 && (
            <div className="player-section">
              <div className="player-section-header"><h2>Succès & badges</h2></div>
              <div className="player-badges-grid">{meta.badges.map((b) => (
                <div key={b.id} className="player-badge-item"><span className="player-badge-icon">{b.icon}</span><div className="player-badge-info"><h4>{b.name}</h4><p>{b.desc}</p></div></div>
              ))}</div>
            </div>
          )}

          <div className="player-actions-card">
            <div className="player-actions-left">
              {/* Demande d'ami : la relation vit dans le contexte des amis
                  (communauté de démonstration pour une persona, table
                  friendships pour un compte). */}
              <FriendButton userId={demoProfile.id} name={meta.gamertag} />
              {/* Messagerie 1-à-1 : réservée aux amis (le bouton l'explique sinon). */}
              <MessageButton userId={demoProfile.id} name={meta.gamertag} />
              <Link to="/news" className="button button-ghost">Voir les actus ↗</Link>
              <button type="button" className="button button-ghost" onClick={() => navigate(-1)}>Retour</button>
            </div>
            <Link to="/auth" className="player-signout-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>Ouvrir mon hub</Link>
          </div>
        </div>
      </section>
    );
  }

  if (demoPlayer) {
    // Persona connectée : présence « vivante » du contexte (elle avance avec
    // l'horloge) ; visiteur : valeur scriptée du moment.
    const presence = friends.mode === 'demo'
      ? { online: friends.isOnline(demoPlayer.id) }
      : demoPresence(demoPlayer, Date.now());
    const title = levelTitle(demoPlayer.level, lang);
    const nextXp = Math.max(demoPlayer.xp + 1, Math.ceil((demoPlayer.xp + 1) / 500) * 500);
    const pct = Math.min(100, Math.round((demoPlayer.xp / nextXp) * 100));
    return (
      <section className="auth-page wrap">
        <div className="player-hub">
          <div className="player-demo-banner">
            <div className="player-demo-banner-left">
              <span className="player-demo-pill">COMMUNAUTÉ DÉMO</span>
              <span className="player-demo-text">Joueur de la communauté de démonstration — cette fiche simule un profil public.</span>
            </div>
            <Link to="/auth" className="player-demo-switch-btn">Ouvrir mon hub ↗</Link>
          </div>

          <div className="player-profile-card">
            <div className="player-header-layout">
              <div className="player-avatar-col">
                <div className="player-avatar-wrap" style={{ cursor: 'default' }}>
                  {demoPlayer.avatar ? <img src={demoPlayer.avatar} alt={demoPlayer.gamertag} className="player-avatar-img" /> : <div className="player-avatar-fallback">{demoPlayer.gamertag.slice(0, 2).toUpperCase()}</div>}
                  {presence.online
                    ? <span className="player-status-badge"><span className="player-status-dot" /> EN LIGNE</span>
                    : <span className="player-status-badge" style={{ borderColor: 'var(--line-strong)', color: 'var(--muted)' }}><span className="player-status-dot" style={{ background: 'var(--muted)', boxShadow: 'none', animation: 'none' }} /> HORS LIGNE</span>}
                </div>
              </div>
              <div className="player-identity">
                <div className="player-tags-row">
                  <span className="player-badge-tier">JOUEUR · COMMUNAUTÉ</span>
                  <span className="player-badge-verified">NIV. {demoPlayer.level} · {demoPlayer.xp.toLocaleString()} XP</span>
                </div>
                <h1 className="player-gamertag">{demoPlayer.gamertag}</h1>
                <div className="player-meta-line">
                  <span><strong>{demoPlayer.fullName}</strong></span><span>•</span><span>Algérie</span><span>•</span><span>Membre de la communauté Let’s Play</span>
                </div>
              </div>
            </div>
            <div className="player-xp-section">
              <div className="player-xp-header">
                <span className="player-xp-level-tag">NIVEAU {demoPlayer.level} — {title}</span>
                <span className="player-xp-count">{demoPlayer.xp.toLocaleString()} / {nextXp.toLocaleString()} XP ({pct}%)</span>
              </div>
              <div className="player-xp-bar-bg"><div className="player-xp-bar-fill" style={{ width: `${pct}%` }} /></div>
            </div>
          </div>

          {demoPlayer.platforms?.length > 0 && (
            <div className="player-section">
              <div className="player-section-header"><h2>Plateformes</h2></div>
              <div className="player-platforms-row">{demoPlayer.platforms.map((p) => <span key={p} className="player-platform-pill">🎮 {p}</span>)}</div>
            </div>
          )}

          {demoPlayer.testedGames?.length > 0 && (
            <TestedGamesRow games={demoPlayer.testedGames} />
          )}

          <div className="player-actions-card">
            <div className="player-actions-left">
              <FriendButton userId={demoPlayer.id} name={demoPlayer.gamertag} />
              <MessageButton userId={demoPlayer.id} name={demoPlayer.gamertag} />
              <button type="button" className="button button-ghost" onClick={() => navigate(-1)}>Retour</button>
            </div>
            <Link to="/auth" className="player-signout-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>Mon hub</Link>
          </div>
        </div>
      </section>
    );
  }

  if (notFound || !remoteProfile) {
    return (
      <section className="auth-page wrap">
        <div className="player-hub">
          <div className="player-section" style={{ textAlign: 'center', padding: '60px 32px' }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🔍</div>
            <h2 style={{ fontFamily: 'var(--display)', color: '#fff', margin: '0 0 10px' }}>Profil introuvable</h2>
            <p style={{ color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.6 }}>Le joueur <code style={{ background: 'rgba(255,255,255,.06)', padding: '2px 6px', borderRadius: 4 }}>{userId}</code> n’existe pas ou n’est plus disponible.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/auth" className="button button-yellow">Aller au hub</Link>
              <button type="button" className="button button-ghost" onClick={() => navigate(-1)}>Retour</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Remote real user fetched from Supabase
  const displayName = remoteProfile.display_name || remoteProfile.username || remoteProfile.id.slice(0, 8);
  const handle = remoteProfile.username || displayName;
  const avatarUrl = remoteProfile.avatar_url || null;
  const joined = formatJoined(remoteProfile.created_at);
  // level fallback : 1 si non stocké (colonne absente)
  const lvl = remoteProfile.level ?? 1;
  const xp = remoteProfile.xp ?? null;
  const title = levelTitle(lvl, lang);
  // Présence : canal temps réel (contexte des amis) ou battement de cœur récent.
  const isOnline = friends.isOnline(remoteProfile.id) || isRecentlySeen(remoteProfile.last_seen_at);

  return (
    <section className="auth-page wrap">
      <div className="player-hub">
        <div className="player-profile-card">
          <div className="player-header-layout">
            <div className="player-avatar-col">
              <div className="player-avatar-wrap" style={{ cursor: 'default' }}>
                {avatarUrl ? <img src={avatarUrl} alt={handle} className="player-avatar-img" /> : <div className="player-avatar-fallback">{String(handle).slice(0,2).toUpperCase()}</div>}
                {isOnline
                  ? <span className="player-status-badge"><span className="player-status-dot" /> EN LIGNE</span>
                  : <span className="player-status-badge" style={{ borderColor: 'var(--line-strong)', color: 'var(--muted)' }}><span className="player-status-dot" style={{ background: 'var(--muted)', boxShadow: 'none', animation: 'none' }} /> HORS LIGNE</span>}
              </div>
            </div>
            <div className="player-identity">
              <div className="player-tags-row">
                <span className="player-badge-tier">JOUEUR · COMMUNAUTÉ</span>
                <span className="player-badge-verified">NIV. {lvl} {xp != null ? `· ${xp} XP` : ''}</span>
              </div>
              <h1 className="player-gamertag">{handle}</h1>
              <div className="player-meta-line">
                {displayName && <><span><strong>{displayName}</strong></span><span>•</span></>}
                <span>{remoteProfile.id.slice(0, 8)}…</span><span>•</span><span>Membre depuis {joined}</span>
              </div>
              <p className="player-bio" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Profil public Let’s Play — statistiques détaillées bientôt disponibles.</p>
            </div>
          </div>
          <div className="player-xp-section">
            <div className="player-xp-header">
              <span className="player-xp-level-tag">NIVEAU {lvl} — {title}</span>
              {xp != null && <span className="player-xp-count">{xp} XP</span>}
            </div>
            <div className="player-xp-bar-bg"><div className="player-xp-bar-fill" style={{ width: xp != null ? `${Math.min(100, Math.round((xp % 150)/150*100))}%` : '8%' }} /></div>
          </div>
        </div>

        <div className="player-stats-grid">
          <div className="player-stat-card"><div className="player-stat-value">{commentCount ?? '—'}</div><div className="player-stat-label">Commentaires</div></div>
          <div className="player-stat-card"><div className="player-stat-value">{lvl}</div><div className="player-stat-label">Niveau XP</div></div>
          <div className="player-stat-card"><div className="player-stat-value">{handle.slice(0,6)}</div><div className="player-stat-label">Gamertag</div></div>
          <div className="player-stat-card"><div className="player-stat-value">—</div><div className="player-stat-label">Succès</div></div>
        </div>

        {/* Consoles possédées + jeux testés — colonnes publiques du profil
            (section 3b2 du schéma) ; absentes sur les anciens déploiements. */}
        {normalizePlatforms(remoteProfile.platforms).length > 0 && (
          <div className="player-section">
            <div className="player-section-header"><h2>Plateformes</h2></div>
            <div className="player-platforms-row">
              {normalizePlatforms(remoteProfile.platforms).map((p) => <span key={p} className="player-platform-pill">🎮 {p}</span>)}
            </div>
          </div>
        )}
        {Array.isArray(remoteProfile.tested_games) && remoteProfile.tested_games.length > 0 && (
          <TestedGamesRow games={remoteProfile.tested_games} />
        )}

        <div className="player-actions-card">
          <div className="player-actions-left">
            <FriendButton userId={remoteProfile.id} name={handle} />
            <MessageButton userId={remoteProfile.id} name={handle} />
            <Link to="/news" className="button button-ghost">Explorer les actus ↗</Link>
            <button type="button" className="button button-ghost" onClick={() => navigate(-1)}>Retour</button>
          </div>
          <Link to="/auth" className="player-signout-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>Mon hub</Link>
        </div>
      </div>
    </section>
  );
}
