import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { languageMeta, SITE_LANG } from '../i18n/languages.js';
import '../article-language.css';

function fill(template, values) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) => (values[key] ?? match));
}

/**
 * Bandeau de langue, posé en tête de l'article.
 *
 * Deux vérités à dire au lecteur, sans détour et sans mentir :
 *
 *   - **la traduction existe** (`translated`) : l'article est une traduction
 *     automatique du français ; on le signale, avec un lien pour revenir à la
 *     version d'origine — c'est elle qui fait foi en cas de doute ;
 *   - **elle n'existe pas encore** : l'article reste en français, et le bandeau
 *     l'annonce franchement plutôt que de laisser croire à une traduction.
 *
 * Rien n'est affiché en français : c'est la langue de référence, il n'y a rien
 * à signaler au lecteur francophone.
 */
export default function ArticleLanguageNotice({ translated, state = 'ready', onReadOriginal }) {
  const { lang, t, setLang } = useLanguage();
  if (!lang || lang === SITE_LANG) return null;

  const copy = t?.lang || {};
  const languageName = languageMeta(lang).name;
  const isPending = state === 'loading';

  const variant = isPending ? 'pending' : translated ? 'translated' : 'french';
  const title = isPending ? copy.loading : translated ? copy.autoTranslated : copy.frenchOnly;
  const note = isPending
    ? ''
    : fill(translated ? copy.autoTranslatedNote : copy.frenchOnlyNote, { language: languageName });

  return (
    <aside className={`article-lang article-lang--${variant}`} lang={translated ? lang : SITE_LANG} role="note">
      <span className="article-lang-icon" aria-hidden="true">
        {translated ? (
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="8" cy="8" r="6" />
            <path d="M2 8h12M8 2c1.6 1.7 2.5 3.8 2.5 6S9.6 12.3 8 14C6.4 12.3 5.5 10.2 5.5 8S6.4 3.7 8 2Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="8" cy="8" r="6" />
            <path d="M5.2 6.2h5.6M8 6.2V4.6M9.6 6.2c-.2 2-1.5 3.6-3.4 4.6M6.6 7.6c.7 1.5 1.9 2.6 3.4 3.2" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <span className="article-lang-text">
        <strong>{title}</strong>
        {note ? <span>{note}</span> : null}
      </span>
      {!isPending && translated ? (
        <button type="button" className="article-lang-action" onClick={onReadOriginal}>
          {copy.readInFrench || 'Lire en français'}
        </button>
      ) : null}
      {!isPending && !translated ? (
        <button
          type="button"
          className="article-lang-action"
          onClick={() => (onReadOriginal ? onReadOriginal() : setLang('fr'))}
        >
          {copy.readInFrench || 'Lire en français'}
        </button>
      ) : null}
    </aside>
  );
}
