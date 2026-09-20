import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useAchievementAction } from '../achievements/AchievementContext';
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

function Arrow(){ return <span aria-hidden="true">↗</span>; }

function Avatar({ name, src }) {
  return <div className="comment-avatar" aria-hidden="true">
    {src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" /> : initialFor(name)}
  </div>;
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

  const comments = useMemo(() => sortNewestFirst([...local, ...remote]), [local, remote]);
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
        const comment = await postComment(articleId, text);
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
        return <article className={`comment${own ? ' comment-own' : ''}`} key={comment.id}>
          <Avatar name={comment.author_name} src={comment.author_avatar} />
          <div className="comment-content">
            <div className="comment-meta">
              <strong>{comment.author_name}</strong>
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
    <div className="section-label"><span><b>03</b> / {copy.section}</span><span>{status === 'loading' ? '…' : `${comments.length} ${countLabel}`}</span></div>
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
