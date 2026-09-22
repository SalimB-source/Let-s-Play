import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { Arrow } from '../components/ReleasesCalendar';
// Les actus du jour générées par le robot ouvrent la liste (les plus récentes
// d’abord) ; les articles manuels de la rédaction suivent dans l’ordre.
import { autoNewsListing } from '../lib/autoNews';

// La section calendrier + compte à rebours (01) a été déplacée sur la page
// d'accueil, juste après le hero — la frise complète vit sur /calendrier.
export default function News(){
  const { t, lang } = useLanguage();
  const featuredCopy = {
    en: {
      cards: [
        ['STARCRAFT · FPS', '12.09.2026 · BLIZZARD', 'STARCRAFT GOES FPS.', 'Blizzard confirms an open-world shooter set at ground level in the StarCraft universe. It is not coming before 2030.'],
        ['DIABLO V · BLIZZCON', '12.09.2026 · BLIZZARD', 'DIABLO V IS COMING.', 'The next chapter arrives in spring 2029, in a Sanctuary left in ruins and without its heroes.'],
        ['DIABLO IV · SWITCH 2', '12.09.2026 · BLIZZARD', 'SANCTUARY GOES PORTABLE.', 'The Age of Hatred Collection brings the base game and its two major expansions to Switch 2 on September 15, 2026.'],
        ['DIABLO · NETFLIX', '12.09.2026 · BLIZZARD', 'DIABLO EXPANDS ITS WORLD.', 'An animated Diablo series is in development for Netflix, with more Blizzard adaptations under consideration.'],
      ], read: 'READ THE STORY', carousel: 'Carousel', grid: 'Grid', mode: 'News display mode', label: 'FEATURED NEWS', updated: 'Updated 12.09.2026', section: 'FEATURED NEWS', today: 'NEWS OF THE DAY'
    },
    fr: {
      cards: [
        ['STARCRAFT · FPS', '12.09.2026 · BLIZZARD', 'STARCRAFT PASSE AU FPS.', 'Blizzard officialise un shooter en monde ouvert situé au ras du champ de bataille. Le projet ne sortira pas avant 2030.'],
        ['DIABLO V · BLIZZCON', '12.09.2026 · BLIZZARD', 'DIABLO V SE PRÉPARE.', 'Le prochain épisode arrivera au printemps 2029 dans un Sanctuaire en ruines, privé de ses héros.'],
        ['DIABLO IV · SWITCH 2', '12.09.2026 · BLIZZARD', 'LE SANCTUAIRE ARRIVE SUR SWITCH 2.', 'La collection Age of Hatred réunira le jeu de base et ses deux extensions majeures dès le 15 septembre 2026.'],
        ['DIABLO · NETFLIX', '12.09.2026 · BLIZZARD', 'DIABLO ÉTEND SON UNIVERS.', 'Une série animée Diablo est en préparation pour Netflix. Blizzard étudie aussi d’autres adaptations.'],
      ], read: 'LIRE L’ARTICLE', carousel: 'Carrousel', grid: 'Grille', mode: 'Mode d’affichage des actualités', label: 'ACTUS À LA UNE', updated: 'Mis à jour le 12.09.2026', section: 'ACTUS À LA UNE', today: 'NEWS DU JOUR'
    },
    ar: {
      cards: [
        ['STARCRAFT · تصويب', '12.09.2026 · بليزارد', 'STARCRAFT تتحول إلى تصويب.', 'تعلن بليزارد عن لعبة تصويب في عالم مفتوح داخل عالم StarCraft، ولن تصدر قبل عام 2030.'],
        ['DIABLO V · بليزكون', '12.09.2026 · بليزارد', 'DIABLO V قادمة.', 'سيصل الفصل التالي في ربيع 2029 داخل ملاذ مدمّر اختفى منه الأبطال.'],
        ['DIABLO IV · SWITCH 2', '12.09.2026 · بليزارد', 'الملاذ يصل إلى Switch 2.', 'تضم مجموعة Age of Hatred اللعبة الأساسية وتوسعتين رئيسيتين ابتداءً من 15 سبتمبر 2026.'],
        ['DIABLO · NETFLIX', '12.09.2026 · بليزارد', 'DIABLO توسّع عالمها.', 'يجري إعداد مسلسل رسوم متحركة عن Diablo لصالح Netflix، مع دراسة تحويل عوالم أخرى.'],
      ], read: 'اقرأ المقال', carousel: 'شريط', grid: 'شبكة', mode: 'طريقة عرض الأخبار', label: 'أبرز الأخبار', updated: 'آخر تحديث 12.09.2026', section: 'أبرز الأخبار', today: 'أخبار اليوم'
    }
  }[lang] || null;
  const featured = featuredCopy || null;
  const million = t.news.million || t.news.featured;
  const carouselRef = useRef(null);
  const [view, setView] = useState('grid');
  const [category, setCategory] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const categoryFor = (article) => {
    if (article.category) return article.category;
    const text = `${article.badge} ${article.kicker} ${article.title}`.toLowerCase();
    if (/netflix|tokyo game show|kingdom hearts|coco/.test(text)) return 'culture';
    if (/hardware|battle\.net|pc|tech/.test(text)) return 'tech';
    return 'gaming';
  };

  const scrollCards = (direction) => {
    carouselRef.current?.scrollBy({ left: direction * carouselRef.current.clientWidth * 0.82, behavior: 'smooth' });
  };

  const articles = [...autoNewsListing,
    { to: '/news/netmarble-tgs-2026', image: 'tokyo-game-show-2026-news.jpg', alt: 'Tokyo Game Show 2026 — visuel officiel de l’événement', badge: 'TGS 2026 · NETMARBLE', kicker: '21.09.2026 · NETMARBLE', title: 'NETMARBLE QUITTE LE TGS AVEC TROIS JEUX.', excerpt: 'Shangri-La Frontier: The Seven Colossi, Solo Leveling: KARMA et Pearl in Blue ont été montrés sous forme de démos. Les dates de sortie restent ouvertes.', read: 'LIRE L’ARTICLE' },
    { to: '/news/control-resonant-24-septembre', image: 'physint-news.jpg', alt: 'Jeu d’action paranormal — visuel éditorial Let’s Play', badge: 'CONTROL RESONANT · SORTIE', kicker: '21.09.2026 · REMEDY', title: 'CONTROL RESONANT ARRIVE À J-3.', excerpt: 'Le lancement mondial reste fixé au 24 septembre sur PS5, Xbox Series et PC. La version Mac suivra plus tard en 2026.', read: 'LIRE L’ARTICLE' },
    { to: '/news/sorties-24-septembre', image: 'monster-hunter-wilds-switch2.jpg', alt: 'Sélection de jeux vidéo — visuel éditorial Let’s Play', badge: 'SORTIES · 24 SEPTEMBRE', kicker: '21.09.2026 · CALENDRIER', title: 'LE 24 SEPTEMBRE VA FAIRE DU BRUIT.', excerpt: 'CONTROL Resonant et Silent Hill: Townfall partagent la même date de sortie. Deux visions du paranormal, un seul jeudi à surveiller.', read: 'LIRE L’ARTICLE' },
    { to: '/news/sony-licence-jeux-numeriques', image: 'playstation-store-ownership-news.jpg', alt: 'Interface officielle du PlayStation Store', badge: 'PLAYSTATION · JUSTICE', kicker: '20.09.2026 · SONY', title: 'VOUS ACHETEZ UN JEU OU UNE LICENCE ?', excerpt: 'Dans une action collective en Californie, Sony soutient qu’un achat numérique sur le PlayStation Store accorde une licence personnelle, et non la propriété du jeu.', read: 'LIRE L’ARTICLE' },
    { to: '/news/tokyo-game-show-2026-annulation', image: 'tokyo-game-show-2026-news.jpg', alt: 'Visuel officiel Tokyo Game Show 2026', badge: 'TOKYO GAME SHOW · ANNULATION', kicker: '20.09.2026 · CESA', title: 'LE TGS 2026 PERD SON DERNIER JOUR.', excerpt: 'La journée du 21 septembre est annulée à cause de l’approche du typhon n°25. Le dimanche 20 reste maintenu, et une partie du programme pourrait passer en ligne.', read: 'LIRE L’ARTICLE' },
    { to: '/news/eshop-switch-2-20-septembre', image: 'fire-emblem-fortunes-weave-news.jpg', alt: 'Fire Emblem: Fortune’s Weave — visuel officiel Nintendo', badge: 'ESHOP SWITCH 2 · CLASSEMENT', kicker: '20.09.2026 · NINTENDO', title: 'FIRE EMBLEM GARDE LA PREMIÈRE PLACE.', excerpt: 'Fortune’s Weave reste numéro un sur l’eShop Switch 2, devant Diablo 4 et les deux éditions de LEGO Batman: Legacy of the Dark Knight.', read: 'LIRE L’ARTICLE' },
    { to: '/news/kingdom-hearts-4-coco', image: 'kingdom-hearts-4-coco-news.jpg', alt: 'Kingdom Hearts 4 — Sora et sa Keyblade-guitare dans le monde de Coco, capture du trailer officiel D23 2026', badge: 'KINGDOM HEARTS 4 · MONDES', kicker: '15.09.2026 · SQUARE ENIX', title: 'LE MONDE DE COCO N’A RIEN D’UN HASARD.', excerpt: 'Sora est apparu au milieu d’une séquence Disney consacrée à Coco. Derrière la surprise, un monde bâti sur la mémoire et la seconde mort — soit le cœur même de la saga.', read: 'LIRE L’ARTICLE' },
    { to: '/news/wolverine-exclu-ps5', image: 'wolverine-countdown.jpg', alt: 'Marvel’s Wolverine — Logan griffes sorties, key art officiel Insomniac Games', badge: 'WOLVERINE · EXCLU PS5', kicker: '15.09.2026 · SONY', title: 'WOLVERINE GARDE SES GRIFFES POUR LA PS5.', excerpt: 'Deux heures manette en main chez Insomniac : récit original sans X-Men, combats bestiaux et caméra de cinéma. L’exclu la plus enviée de la rentrée sort aujourd’hui.', read: 'LIRE L’ARTICLE' },
    { to: '/news/fire-emblem-fortunes-weave', image: 'fire-emblem-fortunes-weave-news.jpg', alt: 'Fire Emblem: Fortune’s Weave — visuel officiel Nintendo', badge: 'FIRE EMBLEM · SWITCH 2', kicker: '15.09.2026 · NINTENDO', title: 'FORTUNE’S WEAVE ENTRE EN SCÈNE.', excerpt: 'À deux jours de sa sortie, le nouvel épisode rappelle ses quatre protagonistes, ses scénarios croisés et son système de progression dans le hub.', read: 'LIRE L’ARTICLE' },
    { to: '/news/rayman-legends-retold', image: 'rayman-legends-retold-news.jpg', alt: 'Rayman Legends Retold — miniature officielle du trailer Ubisoft', badge: 'RAYMAN LEGENDS RETOLD · REPORT', kicker: '15.09.2026 · UBISOFT', title: 'RAYMAN RETROUVE SON RENDEZ-VOUS.', excerpt: 'Le remaster est repoussé au 3 décembre 2026 sur PS5, Xbox Series, Switch 2 et PC. Une vidéo de gameplay est attendue le 22 septembre.', read: 'LIRE L’ARTICLE' },
    { to: '/news/cyberpunk-2077-battlenet', image: 'cyberpunk-2077-battlenet-news.webp', alt: 'Cyberpunk 2077 Ultimate Edition — visuel officiel CD PROJEKT RED', badge: 'CYBERPUNK 2077 · BATTLE.NET', kicker: '14.09.2026 · CD PROJEKT RED', title: 'CYBERPUNK 2077 CHANGE DE QUARTIER.', excerpt: 'L’Ultimate Edition rejoindra Battle.net plus tard cette année, dans le prolongement du partenariat entre CD Projekt RED et Blizzard.', read: 'LIRE L’ARTICLE' },
    { to: '/news/persona-6-switch-2', image: 'persona-6-news.jpg', alt: 'Visuel officiel de l’univers Persona — site Atlus', badge: 'PERSONA 6 · SWITCH 2', kicker: '14.09.2026 · SEGA', title: 'PERSONA 6 ARRIVE EN PHYSIQUE.', excerpt: 'Le prochain épisode de Persona aura aussi une édition physique sur Switch 2. La date reste inconnue, mais la console rejoint les plateformes confirmées.', read: 'LIRE L’ARTICLE' },
    { to: '/news/last-of-us-ii-mod', image: 'last-of-us-mod-news.jpg', alt: 'The Last of Us Part II Remastered — visuel officiel PlayStation', badge: 'THE LAST OF US II · PC', kicker: '14.09.2026 · PLAYSTATION', title: 'LE MOD MULTIJOUEUR NE SORTIRA PAS.', excerpt: 'Sony a demandé l’arrêt d’un projet de fans qui voulait ajouter une composante multijoueur à la version PC de The Last of Us Part II.', read: 'LIRE L’ARTICLE' },
    ...featured.cards.map(([badge, kicker, title, excerpt], index) => ({ to: ['/news/starcraft-fps', '/news/diablo-v', '/news/diablo-switch-2', '/news/diablo-netflix'][index], image: ['starcraft-fps-news.jpeg', 'diablo-v-news.png', 'diablo-switch2-news.jpg', 'diablo-netflix-news.webp'][index], alt: title, badge, kicker, title, excerpt, read: featured.read })),
    { to: '/news/monster-hunter-wilds', image: 'monster-hunter-wilds-switch2.jpg', alt: 'Monster Hunter Wilds sur Nintendo Switch 2', badge: 'MONSTER HUNTER · SWITCH 2', kicker: '09.09.2026 · CAPCOM', title: 'WILDS ARRIVE SUR SWITCH 2.', excerpt: 'Monster Hunter Wilds dévoile ses premières images sur Switch 2 et fixe sa sortie au 4 décembre 2026.', read: 'LIRE L’ARTICLE' },
    { to: '/news/zelda-40th', image: 'zelda-40th-switch2.jpg', alt: 'The Legend of Zelda Ocarina of Time sur Nintendo Switch 2', badge: 'ZELDA · 40 ANS', kicker: '08.09.2026 · NINTENDO', title: 'ZELDA FÊTE SES 40 ANS.', excerpt: 'Nintendo dévoile une Switch 2, une manette Pro et deux amiibo pour accompagner le retour d’Ocarina of Time.', read: 'LIRE L’ARTICLE' },
    { to: '/news/physint', image: 'physint-news.jpg', alt: t.news.featured.alt, badge: t.news.featured.badge, kicker: t.news.featured.kicker, title: t.news.featured.title, excerpt: t.news.featured.excerpt, read: t.news.featured.read },
    { to: '/news/metroid-ravenous', image: 'metroid-ravenous-news.png', alt: t.news.metroid.coverAlt, badge: t.news.metroid.eyebrow, kicker: `${t.news.metroid.date} · ${t.news.platforms}`, title: `${t.news.metroid.title} ${t.news.metroid.titleAccent}`, excerpt: t.news.metroid.dek, read: t.news.metroid.back },
    { to: '/news/wardogs', image: 'wardogs-news.jpg', alt: t.news.wardogs.coverAlt, badge: t.news.wardogs.eyebrow, kicker: `${t.news.wardogs.date} · ${t.news.consolePlatforms}`, title: `${t.news.wardogs.title} ${t.news.wardogs.titleAccent}`, excerpt: t.news.wardogs.dek, read: t.news.wardogs.back },
    { to: '/news/zelda-ocarina', image: 'zelda-ocarina-news.jpg', alt: t.news.zelda.coverAlt, badge: t.news.zelda.eyebrow, kicker: `${t.news.zelda.date} · ${t.news.platforms}`, title: `${t.news.zelda.title} ${t.news.zelda.titleAccent}`, excerpt: t.news.zelda.dek, read: t.news.zelda.back },
    { to: '/news/onimusha-million', image: 'onimusha-million-news.jpg', alt: million.coverAlt || million.alt, badge: million.eyebrow || million.badge, kicker: `${million.date || million.kicker} · CAPCOM`, title: `${million.title} ${million.titleAccent || ''}`, excerpt: million.dek || million.excerpt, read: million.back || million.read },
  ];
  // La page reste lisible par défaut : 12 actus maximum. Le filtre est
  // appliqué avant la limite afin de toujours proposer 12 résultats quand ils
  // existent dans la catégorie choisie.
  const filteredArticles = category === 'all'
    ? articles
    : articles.filter((article) => categoryFor(article) === category);
  const visibleArticles = showAll ? filteredArticles : filteredArticles.slice(0, 12);
  // Le dernier article paru ouvre la section au format paysage (news du jour),
  // les autres articles suivent dans la grille 4 colonnes.
  const [topStory, ...gridArticles] = visibleArticles;
  const filterLabels = {
    all: lang === 'fr' ? 'Toutes' : lang === 'ar' ? 'الكل' : 'All',
    gaming: lang === 'fr' ? 'Gaming' : lang === 'ar' ? 'ألعاب' : 'Gaming',
    tech: lang === 'fr' ? 'Tech' : lang === 'ar' ? 'تقنية' : 'Tech',
    culture: lang === 'fr' ? 'Culture' : lang === 'ar' ? 'ثقافة' : 'Culture',
  };
  const allNewsLabel = lang === 'fr' ? 'Voir toutes les actus' : lang === 'ar' ? 'عرض كل الأخبار' : 'See all news';

  return (
    <>
      <section className="news-carousel-section wrap">
        <div className="section-label"><span><b>01</b> / {featured.section}</span><span>{featured.updated}</span></div>
        <div className="news-carousel-head">
          <div><p className="eyebrow"><span className="live-dot" /> {t.news.eyebrow}</p><h1>{t.news.h1a}<br/><em>{t.news.h1b}</em></h1></div>
          <div className="news-view-tools">
            <div className="news-view-toggle" role="group" aria-label={featured.mode}>
              <button type="button" className={view === 'carousel' ? 'active' : ''} onClick={() => setView('carousel')} aria-pressed={view === 'carousel'}>{featured.carousel}</button>
              <button type="button" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-pressed={view === 'grid'}>{featured.grid}</button>
            </div>
            {view === 'carousel' && <div className="news-carousel-controls" aria-label={featured.carousel}><button type="button" onClick={() => scrollCards(-1)} aria-label={lang === 'fr' ? 'Articles précédents' : lang === 'ar' ? 'المقالات السابقة' : 'Previous articles'}>←</button><button type="button" onClick={() => scrollCards(1)} aria-label={lang === 'fr' ? 'Articles suivants' : lang === 'ar' ? 'المقالات التالية' : 'Next articles'}>→</button></div>}
          </div>
        </div>
        <div className="news-filters" role="group" aria-label={lang === 'fr' ? 'Filtrer les actus' : 'Filter news'}>
          {Object.keys(filterLabels).map((key) => (
            <button key={key} type="button" className={category === key ? 'active' : ''} onClick={() => { setCategory(key); setShowAll(false); }} aria-pressed={category === key}>
              {filterLabels[key]}
            </button>
          ))}
        </div>
        {topStory && <Link className="daily-news-card news-today" to={topStory.to}>
          <div className="daily-news-image"><img src={`${base}${topStory.image}`} alt={topStory.alt} /><span className="news-feature-badge">{topStory.badge}</span><span className="news-feature-arrow">↗</span></div>
          <div className="daily-news-copy">
            <p className="eyebrow"><span className="live-dot" /> {featured.today}</p>
            <span className="news-kicker">{topStory.kicker}</span>
            <h2>{topStory.title}</h2>
            <p>{topStory.excerpt}</p>
            <span className="read-link">{topStory.read} <Arrow /></span>
          </div>
        </Link>}
        <div className={`news-carousel${view === 'grid' ? ' is-grid' : ''}`} ref={carouselRef}>
          {!topStory && <p className="news-empty">{lang === 'fr' ? 'Aucune actu dans cette catégorie.' : lang === 'ar' ? 'لا توجد أخبار في هذه الفئة.' : 'No news in this category.'}</p>}
          {gridArticles.map((article) => <Link className="news-carousel-card" to={article.to} key={article.to}>
            <div className="news-carousel-image"><img src={`${base}${article.image}`} alt={article.alt} /><span className="news-feature-badge">{article.badge}</span><span className="news-feature-arrow">↗</span></div>
            <div className="news-carousel-copy"><span className="news-kicker">{article.kicker}</span><h2>{article.title}</h2><p>{article.excerpt}</p><span className="read-link">{article.read} <Arrow/></span></div>
          </Link>)}
        </div>
        {filteredArticles.length > 12 && (
          <div className="news-all-actions">
            <button type="button" className="button button-yellow" onClick={() => setShowAll((current) => !current)}>
              {showAll ? (lang === 'fr' ? 'Réduire les actus' : lang === 'ar' ? 'عرض أقل' : 'Show fewer news') : allNewsLabel} <Arrow />
            </button>
          </div>
        )}
      </section>
      <section className="cta wrap"><div><p className="eyebrow"><span className="live-dot" /> {t.news.ctaEyebrow}</p><h2>{t.news.ctaH2a}<br/><em>{t.news.ctaH2b}</em></h2></div><Link className="button button-yellow" to="/reviews">{t.news.ctaBtn} <Arrow/></Link></section>
    </>
  );
}
