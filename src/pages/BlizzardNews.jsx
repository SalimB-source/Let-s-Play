import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { baseUrl as base } from '../data';
import Comments from '../components/Comments';

const stories = {
  'starcraft-fps': {
    date: '12.09.2026', category: 'BLIZZARD · PC / XBOX', image: 'starcraft-fps-news.jpeg', imageAlt: 'Un soldat face à une armure dans l’univers StarCraft', cover: 'STARCRAFT', video: '9eQUtOQXYgQ', videoTitle: 'STARCRAFT — bande-annonce d’annonce',
    title: 'STARCRAFT PASSE', accent: 'AU FPS.', dek: 'Blizzard transforme son univers de guerre interstellaire en shooter en monde ouvert. Un virage spectaculaire, mais il faudra patienter jusqu’en 2030.',
    lead: 'La BlizzCon 2026 a enfin levé le voile sur le projet StarCraft que Blizzard préparait dans le plus grand secret. Cette fois, la saga quitte la stratégie en vue aérienne pour placer le joueur au cœur du combat.',
    intro: 'Le studio a présenté un premier trailer cinématique, chargé d’installer l’ambiance et le contexte de cette nouvelle aventure. Aucun gameplay n’a encore été montré, mais la promesse est déjà claire : l’univers StarCraft se vivra désormais au ras du sol.',
    h2: 'UNE NOUVELLE ÉCHELLE POUR LA GUERRE', p1: 'Ce projet prendra la forme d’un FPS en monde ouvert. Blizzard veut donner une place centrale à l’exploration, à la tension des affrontements et au sentiment de survivre dans un conflit qui dépasse chaque soldat.',
    quote: 'Un jeu de tir en monde ouvert où chaque pas se mérite.', quoteBy: 'Dan Hay · Directeur du projet',
    h2b: 'UNE ÉQUIPE EXPÉRIMENTÉE', p2: 'Le jeu est dirigé par Dan Hay, ancien responsable de la licence Far Cry. Un choix qui laisse entrevoir une expérience plus directe et cinématographique, sans pour autant renier l’ADN de la franchise.', p3: 'StarCraft ne sera pas disponible avant 2030. Le titre est annoncé sur PC et consoles Xbox, tandis que Blizzard garde encore le reste de ses plans confidentiel.', p4: 'Pour l’instant, cette annonce ressemble davantage à une déclaration d’intention qu’à une présentation complète. Mais le simple fait de voir StarCraft changer de perspective suffit à relancer toutes les spéculations.',
    take: 'À RETENIR', takeText: 'StarCraft devient un FPS en monde ouvert, prévu pour 2030 sur PC et Xbox.'
  },
  'diablo-v': {
    date: '12.09.2026', category: 'BLIZZARD · ACTION-RPG', image: 'diablo-v-news.png', imageAlt: 'Logo Diablo V et annonce du printemps 2029', cover: 'DIABLO V', video: 'GxCN_AKYtts', videoTitle: 'Diablo V — teaser officiel',
    title: 'DIABLO V', accent: 'SE PRÉPARE.', dek: 'Le prochain chapitre de la saga arrivera au printemps 2029. Blizzard promet un Sanctuaire en ruines, où les héros ont disparu.',
    lead: 'La BlizzCon 2026 a confirmé le retour de Diablo. Après plusieurs années d’attente, Blizzard a officialisé le cinquième épisode de sa série d’action-RPG.',
    intro: 'L’annonce reste volontairement mystérieuse. Le studio n’a partagé ni séquence de gameplay ni détail sur les classes jouables, préférant poser une atmosphère : celle d’un Sanctuaire tombé et privé de ses figures héroïques.',
    h2: 'UN SANCTUAIRE SANS HÉROS', p1: 'Cette nouvelle direction narrative pourrait changer la place du joueur dans l’univers de Diablo. Dans un monde où les anciens défenseurs ont disparu, il faudra reconstruire l’espoir autant que combattre les forces démoniaques.',
    quote: 'L’histoire prendra place dans un Sanctuaire qui est tombé.', quoteBy: 'Blizzard Entertainment',
    h2b: 'UNE LONGUE ATTENTE', p2: 'Diablo V est attendu au printemps 2029. La fenêtre est encore large, mais elle confirme que le projet se trouve à un stade de développement précoce.', p3: 'Blizzard n’a donné aucune précision sur les plateformes, le modèle économique ou les nouveautés de cette suite. La prochaine présentation devrait donc être particulièrement scrutée.', p4: 'En attendant, cette première annonce installe une ambiance plus sombre que jamais. Le Sanctuaire est à terre ; reste à savoir qui répondra à l’appel.',
    take: 'À RETENIR', takeText: 'Diablo V est prévu pour le printemps 2029, dans un Sanctuaire en ruines.'
  },
  'diablo-switch-2': {
    date: '12.09.2026', category: 'BLIZZARD · SWITCH 2', image: 'diablo-switch2-news.jpg', imageAlt: 'Diablo IV Age of Hatred Collection sur Nintendo Switch 2', cover: 'DIABLO IV',
    title: 'DIABLO IV ARRIVE', accent: 'SUR SWITCH 2.', dek: 'La collection Age of Hatred réunira le jeu de base et ses deux extensions majeures dès le 15 septembre 2026.',
    lead: 'Le Sanctuaire s’apprête à devenir nomade. Blizzard a confirmé l’arrivée de Diablo IV sur Nintendo Switch 2 avec une collection pensée pour rassembler toute l’expérience actuelle.',
    intro: 'Cette version, baptisée Diablo IV: Age of Hatred Collection, comprend le jeu principal ainsi que ses deux extensions majeures. Une manière de proposer un point d’entrée complet aux joueurs qui découvrent la licence sur la nouvelle console.',
    h2: 'TOUT LE SANCTUAIRE DANS LA CONSOLE', p1: 'Le contenu embarqué est généreux : la campagne, les saisons et les extensions seront réunis dans une seule collection. La sortie intervient alors que Diablo IV continue d’enrichir régulièrement son univers.',
    quote: 'Une collection complète pour partir chasser les démons partout.', quoteBy: 'Let’s Play · Première impression',
    h2b: 'RENDEZ-VOUS LE 15 SEPTEMBRE', p2: 'La sortie est fixée au 15 septembre 2026. Blizzard n’a pas encore détaillé toutes les spécificités techniques de cette édition, mais la Switch 2 devrait offrir une porte d’entrée originale vers le jeu.', p3: 'Cette annonce accompagne celle de Diablo V, tout en répondant à une demande qui circulait depuis plusieurs mois. Les joueurs pourront donc retrouver le Sanctuaire sans rester devant leur écran fixe.', p4: 'Le plus important est ailleurs : l’édition arrive avec suffisamment de contenu pour éviter l’effet simple portage. La collection vise clairement les nouveaux venus comme les habitués.',
    take: 'À RETENIR', takeText: 'Diablo IV: Age of Hatred Collection sort le 15 septembre 2026 sur Switch 2.'
  },
  'diablo-netflix': {
    date: '12.09.2026', category: 'BLIZZARD · NETFLIX', image: 'diablo-netflix-news.webp', imageAlt: 'Annonce d’une série animée Diablo pour Netflix', cover: 'DIABLO',
    title: 'DIABLO ÉTEND', accent: 'SON UNIVERS.', dek: 'Une série animée Diablo est en préparation pour Netflix. Blizzard étudie également d’autres adaptations.',
    lead: 'Les démons ne resteront pas confinés aux jeux vidéo. Blizzard a annoncé une nouvelle adaptation animée de Diablo, destinée à Netflix.',
    intro: 'Le projet a été révélé en ouverture de la BlizzCon 2026. Aucun casting, aucune date de diffusion et aucun synopsis détaillé n’ont encore été communiqués, mais la série devrait puiser dans l’univers sombre de Sanctuaire.',
    h2: 'UNE NOUVELLE PORTE D’ENTRÉE', p1: 'Après plusieurs tentatives d’adaptation autour de ses licences, Blizzard veut utiliser l’animation pour développer ses histoires autrement. Diablo se prête naturellement à ce format : ses conflits millénaires et ses personnages tourmentés offrent une matière particulièrement riche.',
    quote: 'D’autres adaptations sont également à l’étude.', quoteBy: 'Johanna Faries · Blizzard Entertainment',
    h2b: 'OVERWATCH ET WARCRAFT DANS LE VISEUR', p2: 'La présidente de Blizzard a indiqué que d’autres licences pourraient suivre. Overwatch et Warcraft sont notamment concernés par cette réflexion.', p3: 'Pour le moment, Diablo reste le seul projet officiellement annoncé. Le partenariat avec Netflix pourrait toutefois ouvrir une nouvelle période pour les univers Blizzard à l’écran.', p4: 'Il faudra attendre les premières images pour juger la direction artistique. Mais l’annonce confirme une ambition : faire vivre ces mondes au-delà de la manette et du clavier.',
    take: 'À RETENIR', takeText: 'Une série animée Diablo est en préparation pour Netflix, sans date annoncée.'
  }
};

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function BlizzardNews({ slug }){
  const routeSlug = useParams().slug;
  const story = stories[slug || routeSlug] || stories['starcraft-fps'];
  return <>
    <section className="article-hero wrap"><div className="section-label"><span><b>01</b> / ACTUS À LA UNE</span><span>{story.date} · {story.category}</span></div><div className="article-heading"><div><p className="eyebrow"><span className="live-dot" /> RÉÉCRIT POUR LET’S PLAY</p><h1>{story.title}<br/><em>{story.accent}</em></h1><p className="article-dek">{story.dek}</p><div className="article-byline"><span>LET’S PLAY</span><span>5 MIN DE LECTURE</span></div></div><div className="article-cover hud-frame"><img src={`${base}${story.image}`} alt={story.imageAlt} /><div><small>{story.category}</small><strong>{story.cover}</strong></div></div></div></section>
    <main className="article-layout wrap"><article className="article-body"><p className="article-lead">{story.lead}</p><p>{story.intro}</p>{story.video ? <section className="article-video"><div className="section-label"><span><b>VIDÉO</b> / TRAILER</span><span>{story.category}</span></div><div className="article-video-frame"><iframe src={`https://www.youtube.com/embed/${story.video}?rel=0`} title={story.videoTitle} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></section> : null}<h2>{story.h2}</h2><p>{story.p1}</p><div className="article-pullquote"><span>“</span><p>{story.quote}</p><small>{story.quoteBy}</small></div><p>{story.p2}</p><h2>{story.h2b}</h2><p>{story.p3}</p><p>{story.p4}</p><div className="article-endnote"><span className="live-dot" /><strong>{story.take}</strong><span>{story.takeText}</span></div></article><aside className="article-aside"><div className="aside-card"><span className="aside-kicker">EN BREF</span><strong>{story.date}</strong><strong>{story.category}</strong><strong>LET’S PLAY ORIGINAL</strong></div><div className="aside-card aside-card-accent"><span className="aside-kicker">À LIRE AUSSI</span><strong>LES ACTUS À LA UNE</strong><p>Retrouvez les dernières annonces et analyses de la rédaction.</p><Link className="arrow-link" to="/news">RETOUR AUX ACTUS <Arrow/></Link></div></aside></main>
    <Comments />
    <section className="cta wrap"><div><p className="eyebrow"><span className="live-dot" /> LA SUITE SUR LET’S PLAY</p><h2>RESTEZ DANS<br/><em>LE GAME.</em></h2></div><Link className="button button-yellow" to="/news">VOIR LES ACTUS <Arrow/></Link></section>
  </>;
}

export { stories };
