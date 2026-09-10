import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function Comments(){
  const { t } = useLanguage();
  const copy = t.news.comments;
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [comments, setComments] = useState([]);

  function submit(event){
    event.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setComments(current => [{ name: name.trim(), message: message.trim() }, ...current]);
    setName('');
    setMessage('');
  }

  return <section className="comments wrap" aria-labelledby="comments-title">
    <div className="section-label"><span><b>03</b> / {copy.section}</span><span>{comments.length} {copy.count}</span></div>
    <div className="comments-panel">
      <div className="comments-heading"><span className="comments-mark">//</span><h2 id="comments-title">{copy.title}</h2><p>{copy.intro}</p></div>
      <form className="comment-form" onSubmit={submit}>
        <div className="comment-form-heading"><span>01</span><strong>{copy.submit}</strong></div>
        <label>{copy.name}<input value={name} onChange={event => setName(event.target.value)} placeholder={copy.namePlaceholder} required /></label>
        <label>{copy.message}<textarea value={message} onChange={event => setMessage(event.target.value)} placeholder={copy.messagePlaceholder} rows="4" required /></label>
        <button className="button button-yellow" type="submit">{copy.submit} <span aria-hidden="true">↗</span></button>
      </form>
      <div className="comment-feed">
        <div className="comment-feed-heading"><span>{copy.count}</span><i /></div>
        {comments.length === 0 ? <div className="comment-empty"><span className="comment-empty-icon">+</span><p>{copy.empty}</p></div> : <div className="comment-list">{comments.map((comment, index) => <article className="comment" key={`${comment.name}-${index}`}><div className="comment-avatar">{comment.name.charAt(0).toUpperCase()}</div><div><strong>{comment.name}</strong><p>{comment.message}</p></div></article>)}</div>}
      </div>
    </div>
  </section>;
}
