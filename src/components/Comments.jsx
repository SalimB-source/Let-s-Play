import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useAchievementAction, useAchievements } from '../achievements/AchievementContext';
import { DEMO_PROFILES } from '../auth/demoProfiles';
import { supabase } from '../lib/supabase';
import { levelTitle } from '../achievements/catalog';
import {
  COMMENT_MAX_LENGTH,
  addDemoComment,
  avatarFor,
  commentsEnabled,
  deleteComment,
  describeCommentsError,
  displayNameFor,
  fetchComments,
  formatCommentDate,
  initialFor,
  normalizeArticleId,
  postComment,
  readDemoComments,
  removeDemoComment,
} from '../lib/comments';
import FriendButton from '../friends/FriendButton';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

function Avatar({ name, src }) {
  return <div className="comment-avatar" aria-hidden="true">
    {src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" /> : initialFor(name)}
  </div>;
}

function demoProfileForComment(comment){
  if (!comment) return null;
  if (comment.demo) {
    const byId = Object.values(DEMO_PROFILES).find((p) => p.id === comment.user_id);
    if (byId) return byId;
  }
  if (comment.user_id && String(comment.user_id).startsWith('demo-')) {
    const byId = Object.values(DEMO_PROFILES).find((p) => p.id === comment.user_id);
    if (byId) return byId;
  }
  // demo comments sometimes carry author_name matching gamertag
  if (comment.demo) {
    const byName = Object.values(DEMO_PROFILES).find((p) => p.user_metadata.gamertag === comment.author_name);
    if (byName) return byName;
  }
  return null;
}

function profileHrefFor(comment){
  if (!comment?.user_id) return '/auth';
  return `/profile/${encodeURIComponent(comment.user_id)}`;
}

function nameForComment(comment, user, isDemo, profileMeta){
  if (!comment) return '';
  if (user && comment.user_id === user.id) return displayNameFor(user);
  const demo = demoProfileForComment(comment);
  if (demo) {
    if (isDemo && user && user.id === comment.user_id) return displayNameFor(user);
    return demo.user_metadata.gamertag || comment.author_name;
  }
  if (comment.user_id && profileMeta[comment.user_id]) {
    const p = profileMeta[comment.user_id];
    return p.display_name || p.username || comment.author_name;
  }
  return comment.author_name;
}

function avatarForComment(comment, user, isDemo, profileMeta){
  if (!comment) return null;
  if (user && comment.user_id === user.id) return avatarFor(user);
  const demo = demoProfileForComment(comment);
  if (demo) {
    if (isDemo && user && user.id === comment.user_id) return avatarFor(user);
    return demo.user_metadata.avatar || comment.author_avatar;
  }
  if (comment.user_id && profileMeta[comment.user_id]?.avatar_url) return profileMeta[comment.user_id].avatar_url;
  return comment.author_avatar;
}

function sortNewestFirst(list) {
  return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// Article comment thread. Signed-in players post under their gamertag (the
// author is stamped server-side, see supabase/schema.sql); visitors read the
// thread and get a sign-in call to action that brings them back here.
export default function Comments({ articleId: articleIdProp }){
  const { t, lang } = useLanguage();
  const copy = t.news.comments;
  const location = useLocation();
  const { user, isDemo, loading: authLoading } = useAuth();
  const { summary } = useAchievements();
  const track = useAchievementAction();
  const articleId = useMemo(
    () => normalizeArticleId(articleIdProp || location.pathname),
    [articleIdProp, location.pathname],
  );

  const [remote, setRemote] = useState([]);
  const [local, setLocal] = useState([]);
  const [status, setStatus] = useState(commentsEnabled ? 'loading' : 'ready');
  // Errors are kept raw and translated at render time, so a language switch
  // re-labels them without re-fetching the thread.
  const [loadError, setLoadError] = useState(null);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(null);
  const [notice, setNotice] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [profileMeta, setProfileMeta] = useState({}); // user_id -> { level, xp }

  // Ignores responses that arrive after the reader moved to another article.
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    if (!commentsEnabled) {
      setRemote([]);
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setLoadError(null);
    try {
      const rows = await fetchComments(articleId);
      if (requestRef.current !== requestId) return; // superseded by a newer article
      setRemote(rows);
      setStatus('ready');
    } catch (error) {
      if (requestRef.current !== requestId) return;
      setLoadError(error || new Error('load failed'));
      setStatus('error');
    }
  }, [articleId]);

  useEffect(() => {
    load();
    return () => { requestRef.current += 1; };
  }, [load]);

  // Demo profiles keep their comments on this device only.
  useEffect(() => {
    setLocal(isDemo ? readDemoComments(articleId) : []);
  }, [articleId, isDemo]);

  // Reset the composer when the reader changes article or account.
  useEffect(() => {
    setBody('');
    setPostError(null);
    setNotice('');
  }, [articleId, user?.id]);

  // Keep demo comments in sync with live profile edits (gamertag / avatar / level)
  // isDemo comments are stored in localStorage; when the persona is edited we
  // re-read them so the list shows the new name/photo without a full reload.
  useEffect(() => {
    if (isDemo) setLocal(readDemoComments(articleId));
  }, [articleId, isDemo, user?.user_metadata?.gamertag, user?.user_metadata?.avatar, user?.user_metadata?.level, user?.user_metadata?.xp, user?.user_metadata?.fullName]);

  // Listen for cross-component profile sync (same tab) and storage events (other tabs)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onSync = () => {
      if (isDemo) setLocal(readDemoComments(articleId));
      else if (commentsEnabled) load();
      // also clear cached profile so fresh name/avatar is re-fetched
      setProfileMeta({});
    };
    window.addEventListener('letsplay:demo-comments-synced', onSync);
    window.addEventListener('letsplay:profile-synced', onSync);
    const onStorage = (e) => {
      if (!e.key) return;
      if (e.key.startsWith('letsplay_demo_comments:') || e.key === 'letsplay_demo_comments_sync_tick' || e.key === 'letsplay_auth_demo_profile') {
        if (isDemo) setLocal(readDemoComments(articleId));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('letsplay:demo-comments-synced', onSync);
      window.removeEventListener('letsplay:profile-synced', onSync);
      window.removeEventListener('storage', onStorage);
    };
  }, [articleId, isDemo, load]);

  const comments = useMemo(() => sortNewestFirst([...local, ...remote]), [local, remote]);

  // Fetch levels for remote comment authors (public profiles) so the badge can
  // show the stored XP even for visitors we have never seen before. Demo and
  // own comments are resolved synchronously, so this only touches unknown ids.
  useEffect(() => {
    if (!supabase || comments.length === 0) return;
    const ids = [...new Set(comments.map((c) => c.user_id).filter((id) => id && !String(id).startsWith('demo-') && id !== user?.id))];
    const missing = ids.filter((id) => !(id in profileMeta));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        // Try with level/xp columns first (new schema), fall back to basic columns.
        let data = null;
        let error = null;
        try {
          const res = await supabase.from('profiles').select('id, username, display_name, avatar_url, level, xp').in('id', missing);
          data = res.data; error = res.error;
          // If columns do not exist PostgREST returns 400 / PGRST204
          if (error && /column.*level|column.*xp does not exist/i.test(error.message || '')) throw new Error('retry_basic');
          if (error) throw error;
        } catch (e) {
          if (String(e.message) === 'retry_basic') {
            const res2 = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', missing);
            if (res2.error) throw res2.error;
            data = res2.data;
          } else {
            throw e;
          }
        }
        if (cancelled || !data) return;
        const next = {};
        for (const row of data) {
          next[row.id] = { level: row.level ?? 1, xp: row.xp ?? null, username: row.username, display_name: row.display_name, avatar_url: row.avatar_url };
        }
        // mark fetched ids that returned nothing as level 1 to avoid refetch loop
        for (const id of missing) if (!next[id]) next[id] = { level: 1, xp: null };
        if (!cancelled) setProfileMeta((prev) => ({ ...prev, ...next }));
      } catch (e) {
        if (cancelled) return;
        const fallback = {};
        for (const id of missing) fallback[id] = { level: 1, xp: null };
        setProfileMeta((prev) => ({ ...prev, ...fallback }));
      }
    })();
    return () => { cancelled = true; };
  }, [comments, user?.id, profileMeta]);

  const displayName = displayNameFor(user);
  const avatar = avatarFor(user);
  const returnTo = `${location.pathname}#comments`;

  async function submit(event){
    event.preventDefault();
    const text = body.trim();
    if (!text || posting || !user) return;
    setPosting(true);
    setPostError(null);
    setNotice('');
    try {
      if (isDemo) {
        const comment = addDemoComment(articleId, user, text);
        setLocal((current) => [comment, ...current]);
      } else {
        const lvl = summary?.level?.level ?? user.user_metadata?.level ?? 1;
        const xpVal = summary?.xp ?? user.user_metadata?.xp ?? 0;
        const comment = await postComment(articleId, text, { level: lvl, xp: xpVal });
        setRemote((current) => [comment, ...current.filter((item) => item.id !== comment.id)]);
      }
      setBody('');
      setNotice(copy.posted);
      // Achievement progress: the player really posted a comment.
      track('comment_posted');
    } catch (error) {
      setPostError(error || new Error('post failed'));
    } finally {
      setPosting(false);
    }
  }

  function onComposerKeyDown(event){
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit?.();
    }
  }

  function isOwn(comment){
    if (!user) return false;
    return comment.demo ? isDemo : comment.user_id === user.id;
  }

  function levelFor(comment){
    // For own comments, always show the live level/XP from the current session
    // (achievements + user_metadata) so a profile edit is reflected instantly
    // even before the DB row is updated.
    if (user && comment.user_id === user.id) {
      const lvl = summary?.level?.level ?? user.user_metadata?.level ?? 1;
      const xp = summary?.xp ?? user.user_metadata?.xp ?? 0;
      const title = levelTitle(lvl, lang);
      return { level: lvl, xp, title, tier: user.user_metadata?.tier };
    }
    // stored level from DB (if migration applied) — used for other users
    if (comment.author_level != null) {
      return { level: comment.author_level, xp: comment.author_xp ?? null };
    }
    const demo = demoProfileForComment(comment);
    if (demo) {
      // For demo comments that belong to the current demo user, the live user
      // object already carries the edited level; otherwise fall back to the
      // constant persona definition.
      if (isDemo && user && user.id === comment.user_id) {
        const lvl = user.user_metadata?.level ?? demo.user_metadata.level ?? 1;
        const xp = user.user_metadata?.xp ?? demo.user_metadata.xp ?? null;
        return { level: lvl, xp, tier: user.user_metadata?.tier || demo.user_metadata.tier, title: user.user_metadata?.rankTitle || demo.user_metadata.rankTitle };
      }
      return { level: demo.user_metadata.level ?? 1, xp: demo.user_metadata.xp ?? null, tier: demo.user_metadata.tier, title: demo.user_metadata.rankTitle };
    }
    if (profileMeta[comment.user_id]) {
      const p = profileMeta[comment.user_id];
      return { level: p.level ?? 1, xp: p.xp ?? null, tier: p.tier ?? null };
    }
    return { level: 1, xp: null };
  }

  async function remove(comment){
    if (deletingId) return;
    if (typeof window !== 'undefined' && !window.confirm(copy.deleteConfirm)) return;
    setDeletingId(comment.id);
    setPostError(null);
    setNotice('');
    try {
      if (comment.demo) {
        removeDemoComment(articleId, comment.id);
        setLocal((current) => current.filter((item) => item.id !== comment.id));
      } else {
        await deleteComment(comment.id);
        setRemote((current) => current.filter((item) => item.id !== comment.id));
      }
    } catch (error) {
      setPostError(error || new Error('delete failed'));
    } finally {
      setDeletingId(null);
    }
  }

  const countLabel = comments.length === 1 ? copy.countOne : copy.count;
  const loadErrorText = loadError ? describeCommentsError(loadError, copy, copy.errLoad) : '';
  const postErrorText = postError ? describeCommentsError(postError, copy, copy.errPost) : '';

  let composer;
  if (authLoading) {
    composer = <div className="comment-form comment-form-pending" aria-busy="true">
      <div className="comment-form-heading"><span>01</span><strong>{copy.submit}</strong></div>
      <div className="comment-skeleton" />
      <div className="comment-skeleton comment-skeleton-tall" />
    </div>;
  } else if (!user) {
    composer = <div className="comment-form comment-gate">
      <div className="comment-form-heading"><span>01</span><strong>{copy.submit}</strong></div>
      <p className="comment-gate-text">{copy.signInPrompt}</p>
      <div className="comment-gate-actions">
        <Link className="button button-yellow" to="/auth" state={{ from: returnTo, mode: 'signin' }}>{copy.signIn} <Arrow/></Link>
        <Link className="arrow-link" to="/register" state={{ from: returnTo }}>{copy.createAccount} <Arrow/></Link>
      </div>
    </div>;
  } else {
    composer = <form className="comment-form" onSubmit={submit}>
      <div className="comment-form-heading"><span>01</span><strong>{copy.submit}</strong></div>
      <div className="comment-identity">
        <Avatar name={displayName} src={avatar} />
        <div className="comment-identity-text">
          <small>{copy.postingAs}</small>
          <strong>{displayName}</strong>
        </div>
        {isDemo && <span className="comment-tag comment-tag-demo">{copy.demoTag}</span>}
        <Link className="comment-identity-link" to="/auth">{copy.editProfile} <Arrow/></Link>
      </div>
      <label>{copy.message}
        <textarea
          value={body}
          onChange={event => setBody(event.target.value)}
          onKeyDown={onComposerKeyDown}
          placeholder={copy.messagePlaceholder}
          rows="4"
          maxLength={COMMENT_MAX_LENGTH}
          disabled={posting}
          required
        />
      </label>
      <div className="comment-form-footer">
        <span className="comment-counter" aria-live="polite">{body.length}/{COMMENT_MAX_LENGTH}</span>
        <button className="button button-yellow" type="submit" disabled={posting || !body.trim()}>
          {posting ? copy.posting : copy.submit} <Arrow/>
        </button>
      </div>
      {isDemo && <p className="comment-note">{copy.demoNote}</p>}
      {notice && <p className="comment-note comment-note-ok" role="status">{notice}</p>}
      {postErrorText && <p className="comment-note comment-note-error" role="alert">{postErrorText}</p>}
    </form>;
  }

  let feed;
  if (status === 'loading') {
    feed = <div className="comment-empty" aria-busy="true">
      <span className="comment-empty-icon comment-empty-icon-spin">◌</span>
      <p>{copy.loading}</p>
    </div>;
  } else if (status === 'error') {
    feed = <div className="comment-empty comment-empty-error" role="alert">
      <span className="comment-empty-icon">!</span>
      <p>{loadErrorText}</p>
      <button type="button" className="comment-retry" onClick={load}>{copy.retry} ↻</button>
    </div>;
  } else if (comments.length === 0) {
    feed = <div className="comment-empty"><span className="comment-empty-icon">+</span><p>{copy.empty}</p></div>;
  } else {
    feed = <div className="comment-list">
      {comments.map((comment) => {
        const own = isOwn(comment);
        const { level, xp, title } = levelFor(comment);
        const lvlLabel = lang === 'fr' ? `NIV. ${level}` : lang === 'ar' ? `المستوى ${level}` : `LVL ${level}`;
        const xpLabel = xp != null ? `${xp.toLocaleString()} XP` : null;
        const href = own ? '/auth' : profileHrefFor(comment);
        const displayAuthorName = nameForComment(comment, user, isDemo, profileMeta);
        const displayAvatar = avatarForComment(comment, user, isDemo, profileMeta);
        return <article className={`comment${own ? ' comment-own' : ''}`} key={comment.id}>
          <Link to={href} className="comment-avatar-link" aria-label={`${displayAuthorName} — voir le profil`} title={`${displayAuthorName} — voir le profil`}>
            <Avatar name={displayAuthorName} src={displayAvatar} />
          </Link>
          <div className="comment-content">
            <div className="comment-meta">
              <Link to={href} className="comment-author-link" title={`${displayAuthorName} — voir le profil`}>
                <strong>{displayAuthorName}</strong>
              </Link>
              {/* Demande d'ami en un clic depuis la conversation (icône seule,
                  masquée pour les visiteurs non connectés). */}
              {!own && <FriendButton userId={comment.user_id} name={displayAuthorName} variant="icon" guestHidden />}
              <span className="comment-level" title={title ? `${title} — ${xpLabel || ''}` : xpLabel || lvlLabel}>
                <span className="comment-level-lvl">{lvlLabel}</span>
                {xpLabel && <><span className="comment-level-dot" aria-hidden="true">·</span><span className="comment-level-xp">{xpLabel}</span></>}
              </span>
              {own && <span className="comment-tag">{copy.you}</span>}
              {comment.demo && <span className="comment-tag comment-tag-demo">{copy.demoTag}</span>}
              <time className="comment-time" dateTime={comment.created_at}>{formatCommentDate(comment.created_at, lang)}</time>
              {own && <button
                type="button"
                className="comment-delete"
                onClick={() => remove(comment)}
                disabled={deletingId === comment.id}
              >
                {deletingId === comment.id ? copy.deleting : copy.delete}
              </button>}
            </div>
            <p>{comment.body}</p>
          </div>
        </article>;
      })}
    </div>;
  }

  return <section className="comments wrap" id="comments" aria-labelledby="comments-title">
    <div className="section-label"><span>{copy.section}</span><span>{status === 'loading' ? '…' : `${comments.length} ${countLabel}`}</span></div>
    <div className="comments-panel">
      <div className="comments-heading"><span className="comments-mark">//</span><h2 id="comments-title">{copy.title}</h2><p>{copy.intro}</p></div>
      {composer}
      <div className="comment-feed">
        <div className="comment-feed-heading"><span>{copy.count}</span><i /></div>
        {feed}
      </div>
    </div>
  </section>;
}
