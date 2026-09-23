import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { searchContent } from '../search/searchIndex';
import { useAchievementAction } from '../achievements/AchievementContext';
import { isQuizFinished } from '../quizzes/quizProgress';
import { useQuizProgress } from '../quizzes/useQuizProgress';

const copy = {
  en: { label: 'SEARCH / RESULTS', titleA: 'FIND YOUR', titleB: 'NEXT PLAY.', placeholder: 'Search news, reviews, games…', submit: 'Search', clear: 'Clear search', results: 'results', result: 'result', empty: 'No results found. Try a different title, game, or platform.', prompt: 'Search the Let’s Play archive.', types: { news: 'News', review: 'Review', dossier: 'Dossier', release: 'Release calendar', quiz: 'Quizzes' }, read: 'Open story', finished: 'FINISHED', finishedNote: 'Three levels cleared' },
  fr: { label: 'RECHERCHE / RÉSULTATS', titleA: 'TROUVE TON', titleB: 'PROCHAIN JEU.', placeholder: 'Rechercher une actu, un test, un jeu…', submit: 'Rechercher', clear: 'Effacer', results: 'résultats', result: 'résultat', empty: 'Aucun résultat. Essaie un autre titre, jeu ou support.', prompt: 'Explore les archives Let’s Play.', types: { news: 'Actus', review: 'Test', dossier: 'Dossier', release: 'Calendrier des sorties', quiz: 'Quizz' }, read: 'Ouvrir l’article', finished: 'TERMINÉ', finishedNote: 'Trois niveaux terminés' },
  ar: { label: 'بحث / النتائج', titleA: 'اعثر على', titleB: 'لعبتك القادمة.', placeholder: 'ابحث عن خبر أو مراجعة أو لعبة…', submit: 'بحث', clear: 'مسح البحث', results: 'نتائج', result: 'نتيجة', empty: 'لم نعثر على نتائج. جرّب عنوانًا أو لعبة أو منصة أخرى.', prompt: 'استكشف أرشيف Let’s Play.', types: { news: 'أخبار', review: 'مراجعة', dossier: 'ملف', release: 'تقويم الإصدارات', quiz: 'اختبارات' }, read: 'فتح المقال', finished: 'مكتمل', finishedNote: 'المستويات الثلاثة مكتملة' },
};

export default function Search() {
  const { lang } = useLanguage();
  const t = copy[lang] || copy.fr;
  const track = useAchievementAction();
  // Un quizz dont les TROIS niveaux sont terminés reste dans les résultats,
  // mais en niveaux de gris et verrouillé — comme sur la grille `/quizz`.
  const { progress } = useQuizProgress();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const [value, setValue] = useState(query);
  const results = useMemo(() => searchContent(query), [query]);

  useEffect(() => setValue(query), [query]);

  const submit = (event) => {
    event.preventDefault();
    const next = value.trim();
    if (next) track('search_performed', { query: next });
    setParams(next ? { q: next } : {});
  };

  const grouped = results.reduce((groups, item) => {
    (groups[item.type] ||= []).push(item);
    return groups;
  }, {});

  return (
    <div className="search-page wrap">
      <section className="search-hero">
        <div className="section-label"><span>{t.label}</span><span>{query ? `${results.length} ${results.length === 1 ? t.result : t.results}` : t.prompt}</span></div>
        <p className="eyebrow"><span className="live-dot" /> {t.prompt}</p>
        <h1>{t.titleA}<br /><em>{t.titleB}</em></h1>
        <form className="search-form" onSubmit={submit} role="search">
          <label className="sr-only" htmlFor="site-search">{t.placeholder}</label>
          <input id="site-search" value={value} onChange={(event) => setValue(event.target.value)} placeholder={t.placeholder} autoComplete="off" autoFocus />
          {value && <button type="button" className="search-clear" onClick={() => { setValue(''); setParams({}); }} aria-label={t.clear}>×</button>}
          <button type="submit" className="button button-yellow">{t.submit} <span aria-hidden="true">↗</span></button>
        </form>
      </section>

      {query && results.length === 0 && <p className="search-empty">{t.empty}</p>}
      {!query && <p className="search-empty">{t.prompt}</p>}

      {Object.entries(grouped).map(([type, items]) => (
        <section className="search-results-section" key={type}>
          <div className="section-label"><span>{t.types[type]}</span><span>{items.length}</span></div>
          <div className="search-results-grid">
            {items.map((item) => {
              const done = item.type === 'quiz' && isQuizFinished(progress, item.slug);
              const body = (
                <>
                  {item.image ? <img className="search-result-image" src={item.image} alt="" loading="lazy" /> : <span className="search-result-image search-result-image-blank" aria-hidden="true" />}
                  <div className="search-result-top"><span>{t.types[item.type]}</span><span>{done ? `✓ ${t.finished}` : (item.meta || '↗')}</span></div>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                  <span className="read-link">{done ? `🏁 ${t.finishedNote}` : <>{t.read} <span aria-hidden="true">↗</span></>}</span>
                </>
              );
              return done
                ? <div className="search-result-card is-finished" key={`${item.type}-${item.route}`} aria-label={`${item.title} — ${t.finished}`}>{body}</div>
                : <Link className="search-result-card" to={item.route} key={`${item.type}-${item.route}`}>{body}</Link>;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
