import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { Arrow } from '../components/ReleasesCalendar';
import { youTubeThumbUrl } from '../lib/videoThumbnails';
import { getArticleViews, normalizeArticleId, formatViews } from '../lib/articleViews';
import { getArticleSentiment, sentimentMeta } from '../lib/articleSentiment';
import NewsFeaturedStory from '../components/NewsFeaturedStory';

// Les URLs absolues (visuels officiels) passent telles quelles, les fichiers
// locaux du site prennent le préfixe du baseUrl ; une carte éditoriale SVG de
// repli (`fallbackImage`) prend le relais si l'image distante ne répond plus —
// même mécanique que les pages gaming et cinéma.
const imageUrl = (image) => (/^https?:\/\//i.test(image) ? image : `${base}${image}`);

// Page des actus TECH — troisième zone du hub `/news`, au même gabarit que les
// pages gaming et cinéma : une mise en avant vidéo + texte, puis la grille des
// actus. Les cartes renvoient vers `/news/tech/<slug>` (route générique servie
// par CurrentNews avec le préfixe `tech/`).
export default function TechNews() {
  const { lang } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const [viewsMap, setViewsMap] = useState({});

  const copy = {
    en: {
      section: 'TECH NEWS',
      updated: 'Updated 07.10.2026',
      today: 'FEATURED STORY',
      read: 'READ THE STORY',
      seeAll: 'See all news',
      showLess: 'Show fewer news',
      ctaEyebrow: 'HARDWARE, AI, SPACE',
      ctaH2a: 'WANT MORE',
      ctaH2b: 'TECH?',
      ctaBtn: 'Back to hub',
      back: 'Back to hub',
    },
    fr: {
      section: 'ACTUS TECH',
      updated: 'Mis à jour le 07.10.2026',
      today: 'À LA UNE',
      read: 'LIRE L’ARTICLE',
      seeAll: 'Voir toutes les actus',
      showLess: 'Réduire les actus',
      ctaEyebrow: 'MATÉRIEL, IA, ESPACE',
      ctaH2a: 'ENVIE DE',
      ctaH2b: 'TECH ?',
      ctaBtn: 'Retour au hub',
      back: 'Retour au hub',
    },
    ar: {
      section: 'أخبار التقنية',
      updated: 'آخر تحديث 07.10.2026',
      today: 'الخبر الرئيسي',
      read: 'اقرأ المقال',
      seeAll: 'عرض كل الأخبار',
      showLess: 'عرض أقل',
      ctaEyebrow: 'عتاد، ذكاء اصطناعي، فضاء',
      ctaH2a: 'المزيد',
      ctaH2b: 'من التقنية',
      ctaBtn: 'العودة',
      back: 'العودة إلى hub',
    },
  }[lang] || {
    section: 'ACTUS TECH',
    updated: 'Mis à jour le 07.10.2026',
    today: 'À LA UNE',
    read: 'LIRE L’ARTICLE',
    seeAll: 'Voir toutes les actus',
    showLess: 'Réduire les actus',
    ctaEyebrow: 'MATÉRIEL, IA, ESPACE',
    ctaH2a: 'ENVIE DE',
    ctaH2b: 'TECH ?',
    ctaBtn: 'Retour au hub',
    back: 'Retour au hub',
  };

  // Actu tech du mercredi 07.10.2026 : l'AI Act européen déclenche ses premiers
  // contrôles sur les modèles frontières (OpenAI, Google, Meta, Anthropic) ;
  // suivent l'actu du mardi 06.10.2026 (interdiction partielle des lunettes
  // connectées en Norvège), celle du lundi 05.10.2026 (la « Super Intelligence
  // Force » de Trump et SpaceXSI), puis celles du week-end des 03-04.10.2026
  // — cyberattaque Hauts-de-France, technique HashHiding et livraisons Tesla —,
  // le vol 14 de Starship, OpenShell de NVIDIA et le déjeuner IA à la Maison-
  // Blanche. Les plus récentes ouvrent la page ; chaque carte affiche le
  // visuel officiel ou éditorial de l'actu avec sa carte SVG en repli.
  const articles = useMemo(() => [
    // Actu tech du mercredi 07.10.2026 : l'AI Act européen déclenche ses premiers
    // contrôles sur les modèles frontières (OpenAI, Google, Meta, Anthropic).
    { to: '/news/tech/ai-act-europe-premiers-controles', image: 'ai-act-europe-regulation-news.jpg', fallbackImage: 'ai-act-europe-controles-news.svg', alt: 'Régulation européenne de l’intelligence artificielle — illustration éditoriale originale Let’s Play', badge: 'EUROPE · RÉGULATION IA', kicker: '07.10.2026 · REUTERS', title: 'L’AI ACT : L’EUROPE S’ACTIVE.', excerpt: 'Le Bureau européen de l’IA adresse ses premières demandes de conformité aux concepteurs de modèles frontières dépassant 10^25 FLOPs. Les laboratoires ont 30 jours pour documenter leurs systèmes, sous peine d’amendes allant jusqu’à 7 % du chiffre d’affaires mondial.', read: copy.read, sentiment: 'mixed' },
    // Actu tech du mardi 06.10.2026 : la Norvège veut couper les caméras des
    // lunettes connectées dans les lieux publics — l'usage privé reste permis.
    { to: '/news/tech/norvege-lunettes-connectees-interdiction', image: 'https://i.guim.co.uk/img/media/40af5768117abd5443d47eba0a698ad852dd88a1/451_0_4085_3270/master/4085.jpg?width=1200&dpr=1&s=none&crop=none', fallbackImage: 'norvege-lunettes-connectees-news.svg', alt: 'Mark Zuckerberg présente la gamme de lunettes connectées de Meta — photo Carlos Barría/Reuters publiée par The Guardian', badge: 'NORVÈGE · VIE PRIVÉE', kicker: '06.10.2026 · THE GUARDIAN', title: 'LA NORVÈGE COUPE LES CAMÉRAS.', excerpt: 'Le gouvernement veut interdire temporairement les lunettes connectées dans les parcs, plages, musées, écoles, crèches, établissements de santé, salles de sport et événements publics. L’usage privé resterait autorisé ; le texte, encore à déposer, est soutenu par un groupe d’experts chargé d’une régulation permanente.', read: copy.read, sentiment: 'mixed' },
    // Actu tech du lundi 05.10.2026 : la « Super Intelligence Force » de Trump
    // et le futur SpaceXSI d'Elon Musk.
    { to: '/news/tech/super-intelligence-force-spacexsi', image: youTubeThumbUrl('6UBA8iL3x54'), fallbackImage: 'super-intelligence-force-news.svg', alt: 'La Maison-Blanche pendant la réunion consacrée à la « super intelligence » — image de la vidéo officielle publiée par The White House', badge: 'IA · WASHINGTON', kicker: '05.10.2026 · DATACONOMY', title: 'L’IA S’APPELLE « SI ».', excerpt: 'Trump a annoncé dimanche la création d’une « Super Intelligence Force », présidée par Jay Clayton, avec un rapport attendu sous 120 jours. Le décret du 29 septembre impose déjà le sigle aux agences fédérales, et Elon Musk a confirmé vouloir renommer SpaceXAI en SpaceXSI.', read: copy.read, sentiment: 'mixed' },
    // Actus tech du week-end des 03-04.10.2026 : la cyberattaque de la Région
    // Hauts-de-France, les livraisons trimestrielles de Tesla et la technique
    // HashHiding des pirates nord-coréens. Les plus récentes ouvrent la page.
    { to: '/news/tech/cyberattaque-hauts-de-france-rib', image: 'https://www.01net.com/app/uploads/2025/06/fuite-donnees-france.jpg', fallbackImage: 'cyberattaque-hauts-de-france-news.svg', alt: 'Illustration d’une fuite de données publiée par 01net (Unsplash)', badge: 'CYBERSÉCURITÉ · FRANCE', kicker: '03.10.2026 · 01NET', title: 'CYBERATTAQUE EN HAUTS-DE-FRANCE.', excerpt: 'La Région a confirmé samedi 3 octobre un accès non autorisé à des données personnelles via deux prestataires, Atexo et Docaposte. Un pirate revendique les informations de plus de 700 000 personnes, dont des RIB. Une plainte a été déposée et les usagers commencent à être informés.', read: copy.read, sentiment: 'negative' },
    { to: '/news/tech/coree-du-nord-ethereum-hashhiding', image: 'https://www.01net.com/app/uploads/2024/01/ethereum.jpg', fallbackImage: 'coree-du-nord-ethereum-news.svg', alt: 'Illustration Ethereum publiée par 01net (Unsplash)', badge: 'CYBERSÉCURITÉ · BLOCKCHAIN', kicker: '04.10.2026 · 01NET', title: 'LA CORÉE DU NORD DÉTOURNE ETHEREUM.', excerpt: 'Des chercheurs ont identifié HashHiding : la campagne XCTDH cache l’adresse de ses serveurs de commande dans des transferts Ethereum, vers des adresses dont personne ne détient la clé. Plus de 2 600 transferts ont été recensés en trois mois, et bloquer un serveur ne suffit plus.', read: copy.read, sentiment: 'negative' },
    { to: '/news/tech/tesla-t3-2026-livraisons-byd', image: 'https://img.frandroid.com/images.frandroid.com/wp-content/uploads/2026/04/tesla-gigafactory-berlin-usine-00017.jpg?resize=1200,675&key=c61b8cfd', fallbackImage: 'tesla-livraisons-t3-news.svg', alt: 'Gigafactory Tesla de Berlin — photo officielle Tesla', badge: 'TESLA · INDUSTRIE', kicker: '04.10.2026 · FRANDROID', title: 'TESLA REDRESSE, BYD S’ENVOLE.', excerpt: 'Tesla a livré 486 532 voitures au troisième trimestre 2026, environ 5 % de mieux que les prévisions, essentiellement en piochant dans ses stocks. BYD en a vendu 762 478 et porte son avance à près de 276 000 unités, tirée par un export en hausse de 154 % en septembre.', read: copy.read, sentiment: 'mixed' },
    { to: '/news/tech/starship-vol-14-orbite-atteinte', image: 'https://sxcontent9668.azureedge.us/cms-assets/assets/Flight_14_Website_Desktop_4_734a6bbf25.jpg', fallbackImage: 'starship-vol-14-orbite-news.svg', alt: 'Starship — visuel officiel du quatorzième vol d’essai sur la page de lancement de SpaceX', badge: 'SPACEX · ESPACE', kicker: '29.09.2026 · SPACEX', title: 'STARSHIP EST ENFIN EN ORBITE.', excerpt: 'Première mise en orbite de l’histoire de la fusée lundi, avec 26 satellites Starlink V3 déployés — une première. Une panne de moteur en montée a ramené le vaisseau après 3 h 09, et il a explosé en basculant après son amerrissage.', read: copy.read, sentiment: 'positive' },
    { to: '/news/tech/nvidia-open-agent-safety-platform', image: 'https://iprsoftwaremedia.com/219/files/202609/c68dda94943a6e093074e9e88fd5ddef/6aba9c533d6332d60a0bb99a_nvidia-open-agent-safety-platform/nvidia-open-agent-safety-platform_mid.png?v=f9cea0c6-00ad-4b7f-b0a0-6bc06b39af63', fallbackImage: 'nvidia-agent-safety-news.svg', alt: 'Visuel officiel du communiqué NVIDIA Open Agent Safety Platform', badge: 'NVIDIA · SÉCURITÉ IA', kicker: '29.09.2026 · NVIDIA', title: 'NVIDIA MET LES AGENTS EN CAGE.', excerpt: 'OpenShell, un bac à sable open source, et Sentry, une surveillance dans le silicium des DPU BlueField-4 : la nouvelle plateforme de NVIDIA contient les agents autonomes qui sortent de leur cadre. Plus de 100 partenaires, OpenAI absent.', read: copy.read, sentiment: 'mixed' },
    { to: '/news/tech/midi-ia-maison-blanche', image: 'https://img.semafor.com/4edcc71f032e922ad0fa3f238b2206d9949f984f-2048x1294.jpg?w=740&q=75&auto=format&h=467', fallbackImage: 'ia-maison-blanche-news.svg', alt: 'Sam Altman (OpenAI) et Mark Zuckerberg (Meta) à un dîner d’État à la Maison-Blanche — photo de presse Evelyn Hockstein / Reuters', badge: 'MAISON-BLANCHE · IA', kicker: '29.09.2026 · REUTERS', title: 'TRUMP REÇOIT LES 6 BOSS DE L’IA.', excerpt: 'Zuckerberg, Amodei, Brockman, Pichai, Karp et Huang déjeunent à la Maison-Blanche pour arbitrer la régulation de l’IA. Le même jour, Hinton, Bengio et des chercheurs des grands laboratoires alertent sur une « explosion d’intelligence ».', read: copy.read, sentiment: 'mixed' },
    { to: '/news/tech/starship-flight-14-premier-vol-orbital', image: 'https://sxcontent9668.azureedge.us/cms-assets/assets/Flight_14_Website_Desktop_4_734a6bbf25.jpg', fallbackImage: 'starship-flight-14-news.svg', alt: 'Starship — visuel officiel du quatorzième vol d’essai sur la page de lancement de SpaceX', badge: 'SPACEX · ESPACE', kicker: '28.09.2026 · SPACEX', title: 'STARSHIP VISE L’ORBITE POUR DE VRAI.', excerpt: 'Quatorzième vol d’essai ce lundi : première insertion en orbite visée, puis le déploiement de 26 satellites Starlink V3 — jusqu’à 26 Tbps de capacité ajoutée. Fenêtre ouverte à 12 h 15 UTC, repli les 29 et 30 septembre.', read: copy.read, sentiment: 'positive' },
    { to: '/news/tech/copilot-home-code-autopilot', image: 'https://blogs.microsoft.com/wp-content/uploads/2026/09/OMB-Copilot-9-25-Hero-9_22_26.png', fallbackImage: 'copilot-autopilot-news.svg', alt: 'Les logos de Copilot et sa signature « The AI built for work » — visuel officiel de l’annonce Microsoft du 25 septembre 2026', badge: 'MICROSOFT · IA', kicker: '25.09.2026 · MICROSOFT', title: 'COPILOT DEVIENT UN AGENT.', excerpt: 'Home, Code, Autopilot : Microsoft réorganise son assistant autour de trois briques, dont un agent hébergé dans le cloud qui continue de travailler hors connexion. Entreprises d’abord, facturation à l’usage pour les fonctions agentiques.', read: copy.read, sentiment: 'mixed' },
    { to: '/news/tech/apple-taptic-engine-verdict-5-7-milliards', image: 'https://platform.theverge.com/wp-content/uploads/sites/2/2026/09/268738_Apple_Watch_Series_12_AKrales_0277.jpg?quality=90&strip=all&crop=0%2C0%2C100%2C100&w=1600', fallbackImage: 'apple-taptic-verdict-news.svg', alt: 'Apple Watch Series 12 — photo de presse d’Amelia Holowaty Krales pour The Verge', badge: 'APPLE · JUSTICE', kicker: '25.09.2026 · REUTERS', title: 'APPLE ÉCOPE À 5,7 MILLIARDS.', excerpt: 'Un jury fédéral de San Diego juge que le Taptic Engine des iPhone et Apple Watch contrefait deux brevets de Taction Technology. Le verdict le plus lourd jamais rendu contre une entreprise technologique aux États-Unis ; Apple fera appel.', read: copy.read, sentiment: 'negative' },
    { to: '/news/tech/agent-openai-portail-australien', image: 'https://image.cnbcfm.com/api/v1/image/107431804-17189858722024-06-21t155215z_1214353438_rc2sj6aut6ur_rtrmadp_0_rockset-m-a-openai.jpeg?v=1757715670&w=1600&h=900&vtcrop=y', fallbackImage: 'openai-agent-australie-news.svg', alt: 'Logo OpenAI — photo d’illustration Reuters / Dado Ruvic', badge: 'OPENAI · CYBERSÉCURITÉ', kicker: '24.09.2026 · CNBC', title: 'UN AGENT IA FRANCHIT LE GARDE-FOU.', excerpt: 'En juin, un agent d’OpenAI a atteint des fichiers non publics du portail de statistiques Medicare australien, sans consigne en ce sens. L’Australie n’a été prévenue que le 10 septembre et n’exclut pas des poursuites.', read: copy.read, sentiment: 'negative' },
    { to: '/news/tech/meta-connect-2026-lunettes-muse-charm', image: 'https://image.cnbcfm.com/api/v1/image/108367218-Julia_Meta_VR_2.jpg?v=1790211668&w=1600&h=900&vtcrop=y', fallbackImage: 'meta-connect-2026-news.svg', alt: 'Prise en main des Meta VR Glasses au Meta Connect 2026 à Menlo Park — photo Minh Connors / Bloomberg / Getty Images, publiée par CNBC', badge: 'META · CONNECT 2026', kicker: '23.09.2026 · CNBC', title: 'META RELANCE SES LUNETTES.', excerpt: 'Des lunettes de réalité virtuelle à 1 299 dollars pour le printemps 2027, un Muse Charm pour parler à son agent IA sans sortir son téléphone, et Muse en tête des applications gratuites de l’App Store américain.', read: copy.read, sentiment: 'mixed' },
  ], [copy.read]);

  useEffect(() => {
    const ids = articles.map((a) => normalizeArticleId(a.to));
    let cancelled = false;
    getArticleViews(ids).then((map) => { if (!cancelled) setViewsMap(map); });
    return () => { cancelled = true; };
  }, [articles]);

  const visibleArticles = showAll ? articles : articles.slice(0, 12);
  const [topStory, ...gridArticles] = visibleArticles;

  const renderBadges = (article) => {
    const sentimentId = getArticleSentiment(article);
    const meta = sentimentMeta(sentimentId);
    const views = viewsMap[normalizeArticleId(article.to)] ?? null;
    return (
      <>
        <span className="news-feature-badge">{article.badge}</span>
        <span className="news-feature-arrow">↗</span>
        <span className={`news-sentiment ${meta.color}`} title={meta.label} aria-label={meta.label}>{meta.emoji}</span>
        {views != null && (
          <span className="news-views" aria-label={`${views} vues`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3.2" /></svg>
            {formatViews(views)}
          </span>
        )}
      </>
    );
  };

  const renderStoryImage = (story, loading = 'lazy') => (
    <img
      src={imageUrl(story.image)}
      alt={story.alt}
      loading={loading}
      onError={(event) => {
        if (story.fallbackImage && event.currentTarget.dataset.fallback !== 'true') {
          event.currentTarget.dataset.fallback = 'true';
          event.currentTarget.src = imageUrl(story.fallbackImage);
        }
      }}
    />
  );

  return (
    <>
      {/* Lien retour vers le hub */}
      <div className="news-hub-back wrap">
        <Link className="arrow-link" to="/news">{copy.back} <Arrow /></Link>
      </div>

      <section className="news-carousel-section wrap">
        <div className="section-label"><span>{copy.section}</span><span>{copy.updated}</span></div>
        <NewsFeaturedStory
          story={topStory}
          todayLabel={copy.today}
          renderStoryImage={renderStoryImage}
          renderBadges={renderBadges}
        />
        <div className="news-carousel is-grid">
          {gridArticles.map((article) => (
            <div className="news-grid-cell" key={article.to}>
              <Link className="news-carousel-card" to={article.to}>
                <div className="news-carousel-image">
                  {renderStoryImage(article)}
                  {renderBadges(article)}
                </div>
                <div className="news-carousel-copy">
                  <span className="news-kicker">{article.kicker}</span>
                  <h2>{article.title}</h2>
                  <p>{article.excerpt}</p>
                  <span className="read-link">{article.read} <Arrow /></span>
                </div>
              </Link>
            </div>
          ))}
        </div>
        {articles.length > 12 && (
          <div className="news-all-actions">
            <button type="button" className="button button-yellow" onClick={() => setShowAll((c) => !c)}>
              {showAll ? copy.showLess : copy.seeAll} <Arrow />
            </button>
          </div>
        )}
      </section>

      <section className="cta wrap">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {copy.ctaEyebrow}</p>
          <h2>{copy.ctaH2a} <em>{copy.ctaH2b}</em></h2>
        </div>
        <Link className="button button-yellow" to="/news">{copy.ctaBtn} <Arrow /></Link>
      </section>
    </>
  );
}
