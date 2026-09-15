import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { baseUrl as base } from '../data';
import Comments from '../components/Comments';

const stories = {
  'persona-6-switch-2': {
    date: '14.09.2026', category: 'SEGA · RPG', image: 'persona-6-news.png', imageAlt: 'Persona 6 sur Nintendo Switch 2', cover: 'PERSONA 6',
    title: 'PERSONA 6 ARRIVE', accent: 'EN PHYSIQUE.', dek: 'Le prochain épisode de la série Persona sortira aussi en version physique sur Switch 2. Une bonne nouvelle pour les joueurs qui aiment garder leurs RPG près d’eux.',
    lead: 'SEGA avait déjà confirmé Persona 6 sur Switch 2, PS5, Xbox Series et PC. La console de Nintendo aura finalement droit à sa propre édition physique, en plus de la disponibilité numérique annoncée.',
    intro: 'La date de sortie reste inconnue, mais le projet commence à préciser son contour. Après l’annonce de la version physique sur PS5, la Switch 2 rejoint donc la liste des machines qui accueilleront le prochain grand RPG de SEGA.',
    h2: 'UNE CARTE QUI CHANGE TOUT', p1: 'Il faut toutefois garder une nuance importante : SEGA utilise régulièrement le format de la carte clé pour ses sorties physiques sur Switch 2. La boîte sera bien présente en magasin, mais le contenu pourrait nécessiter un téléchargement.',
    quote: 'Une édition physique, oui. Une cartouche complète, pas forcément.', quoteBy: 'Let’s Play · Ce qu’il faut retenir',
    h2b: 'LE GAME PASS DANS L’ÉQUATION', p2: 'Persona 6 sera également ajouté au Xbox Game Pass dès sa sortie. Une manière de toucher immédiatement un large public, alors que l’attente autour de la série dépasse depuis longtemps le cercle des habitués de Persona.', p3: 'Pour SEGA, le choix est cohérent : multiplier les portes d’entrée sans abandonner les collectionneurs. Les joueurs Switch 2 pourront choisir entre le confort du numérique et la présence d’une édition en boîte.', p4: 'Il reste maintenant à découvrir le jeu lui-même. Tant que la date, le prix et le contenu exact de la carte clé ne sont pas précisés, cette annonce doit surtout être lue comme un signe de confiance envers la nouvelle console.',
    take: 'À RETENIR', takeText: 'Persona 6 est annoncé sur Switch 2, PS5, Xbox Series et PC, avec une édition physique prévue sur Switch 2.'
  },
  'last-of-us-ii-mod': {
    date: '14.09.2026', category: 'PLAYSTATION · PC', image: 'last-of-us-mod-news.png', imageAlt: 'The Last of Us Part II et son projet de mod multijoueur PC', cover: 'THE LAST OF US II',
    title: 'LE MULTIJOUEUR', accent: 'RESTE AU GARAGE.', dek: 'Un projet de mod voulait offrir une expérience multijoueur à la version PC de The Last of Us Part II. Sony a demandé son arrêt avant sa sortie.',
    lead: 'The Last of Us Part II Remastered est arrivé sur PC sans le mode multijoueur imaginé pendant le développement du jeu. Des fans ont tenté de combler ce manque avec un mod financé par leur communauté.',
    intro: 'L’équipe Specizer travaillait depuis janvier sur cette composante en ligne, avec une sortie envisagée ce mois-ci. Le projet avait trouvé son public grâce à Patreon et à plusieurs extraits diffusés en ligne.',
    h2: 'QUAND LES FANS REPRENNENT LE RELAIS', p1: 'L’histoire est révélatrice d’une attente qui n’a jamais vraiment disparu. Naughty Dog avait d’abord abandonné le multijoueur prévu pour The Last of Us Part II, avant de mettre fin à son projet connecté autonome. Les joueurs, eux, ont continué à imaginer ce que cet univers pouvait donner en ligne.',
    quote: 'Le projet devait sortir ce mois-ci. Il ne verra finalement jamais le jour.', quoteBy: 'Specizer · Message à sa communauté',
    h2b: 'UNE QUESTION DE DROITS, MAIS AUSSI DE CONTRÔLE', p2: 'Les moddeurs ont confirmé avoir reçu une lettre de Sony Interactive Entertainment leur demandant de ne pas publier le mod. Le contenu n’avait pas encore été officiellement lancé, mais ses images suffisaient à rendre le projet visible.', p3: 'La décision peut se comprendre du point de vue de l’éditeur : un mod non officiel qui reprend des éléments d’une licence protégée peut brouiller la frontière entre fan project et produit concurrent.', p4: 'Elle laisse malgré tout une frustration particulière. Après l’annulation du multijoueur officiel, cette tentative indépendante représentait l’une des rares façons de voir cette idée continuer à vivre. Les extraits encore disponibles témoignent surtout d’un projet qui n’aura pas eu le temps de rencontrer son public.',
    take: 'À RETENIR', takeText: 'Sony a demandé l’arrêt du mod multijoueur PC de The Last of Us Part II avant sa publication.'
  },
  'cyberpunk-2077-battlenet': {
    date: '14.09.2026', category: 'CD PROJEKT RED · PC', image: 'cyberpunk-2077-battlenet-news.png', imageAlt: 'Cyberpunk 2077 Ultimate Edition arrive sur Battle.net', cover: 'CYBERPUNK 2077',
    title: 'CYBERPUNK 2077', accent: 'CHANGE DE QUARTIER.', dek: 'L’Ultimate Edition rejoindra Battle.net plus tard cette année. CD Projekt RED et Blizzard continuent d’élargir leur partenariat autour de leurs grands RPG.',
    lead: 'Après The Witcher 3: Wild Hunt — Remastered, c’est au tour de Cyberpunk 2077: Ultimate Edition de prendre la direction de Battle.net. La sortie est confirmée pour 2026, sans date précise pour le moment.',
    intro: 'L’annonce s’inscrit dans un partenariat officialisé le 26 août entre CD Projekt RED et Blizzard. Le premier rendez-vous est fixé au 29 septembre avec The Witcher 3: Wild Hunt — Remastered, avant l’arrivée de Night City sur le même écosystème.',
    h2: 'NIGHT CITY SUR LE LAUNCHER BLIZZARD', p1: 'Pour les joueurs PC, le changement sera surtout une question d’écosystème. Cyberpunk 2077: Ultimate Edition regroupe déjà le jeu et son extension Phantom Liberty ; son arrivée sur Battle.net lui donnera une nouvelle vitrine auprès du public habitué aux jeux Blizzard.',
    quote: 'Deux univers de RPG, un même point d’entrée sur PC.', quoteBy: 'Let’s Play · L’enjeu de l’annonce',
    h2b: 'UN PARTENARIAT QUI PREND DE L’AMPLEUR', p2: 'Le choix n’est pas anodin. Battle.net est historiquement associé aux licences de Blizzard, mais la plateforme accueille aussi des jeux partenaires. The Witcher 3 puis Cyberpunk 2077 installent progressivement une passerelle entre deux publics de joueurs.', p3: 'Il faudra encore attendre les précisions pratiques : date exacte, prix, gestion des sauvegardes et éventuelles conditions pour les propriétaires de l’Ultimate Edition. Rien de tout cela n’a été détaillé à ce stade.', p4: 'Cette arrivée ne change pas le contenu de Cyberpunk 2077, mais elle confirme que CD Projekt RED cherche de nouveaux chemins de distribution pour ses jeux. Pour Night City, le prochain arrêt est donc connu ; le calendrier reste à écrire.',
    take: 'À RETENIR', takeText: 'Cyberpunk 2077: Ultimate Edition arrivera sur Battle.net plus tard en 2026, sans date précise annoncée.'
  },
  'rayman-legends-retold': {
    date: '15.09.2026', category: 'UBISOFT · PLATEFORMES', image: 'rayman-legends-retold-news.jpg', imageAlt: 'Rayman Legends Retold — miniature officielle du trailer Ubisoft', cover: 'RAYMAN LEGENDS',
    title: 'RAYMAN LEGENDS RETOLD', accent: 'PREND UN PEU DE RETARD.', dek: 'Le remaster ne sortira plus le 1er octobre. Ubisoft repousse le rendez-vous au 3 décembre 2026 pour peaufiner sa version.',
    lead: 'Les joueurs devront patienter quelques semaines de plus avant de retrouver Rayman. Alors que Rayman Legends Retold était attendu le 1er octobre 2026, Ubisoft vient d’annoncer un report au 3 décembre.',
    intro: 'Le changement concerne les versions PS5, Xbox Series, Switch 2 et PC. Le développement est présenté comme terminé, mais l’équipe souhaite profiter de ce délai supplémentaire pour améliorer les derniers détails et viser le niveau de qualité attendu pour ce retour.',
    h2: 'UN REPORT POUR POLIR LE REMASTER', p1: 'Ce décalage ne ressemble donc pas à une remise en question du projet. Rayman Legends Retold garde son calendrier de sortie et ses plateformes, tandis que les développeurs s’offrent un peu d’air pour finaliser l’expérience dans de meilleures conditions.',
    quote: 'Quelques semaines de plus pour laisser le remaster trouver son meilleur rythme.', quoteBy: 'Let’s Play · Le point calendrier',
    h2b: 'UN NOUVEAU RENDEZ-VOUS EN DÉCEMBRE', p2: 'La nouvelle date est fixée au 3 décembre 2026. Elle place le jeu au cœur d’une période chargée en sorties, mais offre aussi à Ubisoft une fenêtre supplémentaire pour présenter les nouveautés et les ajustements de cette version revisitée.', p3: 'Pour accompagner cette attente, une importante vidéo de gameplay est annoncée le 22 septembre. Ce sera l’occasion de voir plus concrètement le travail réalisé sur le remaster et de vérifier comment ses niveaux cultes se comportent sur les machines actuelles.', p4: 'Le rendez-vous change, mais l’envie reste intacte : Rayman Legends Retold vise toujours la PS5, les Xbox Series, la Switch 2 et le PC. Il faudra simplement attendre le début du mois de décembre pour lancer cette nouvelle partie.',
    take: 'À RETENIR', takeText: 'Rayman Legends Retold sortira le 3 décembre 2026 sur PS5, Xbox Series, Switch 2 et PC. Une vidéo de gameplay est prévue le 22 septembre.'
  }
};

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function CurrentNews({ slug }) {
  const routeSlug = useParams().slug;
  const story = stories[slug || routeSlug] || stories['persona-6-switch-2'];
  return <>
    <section className="article-hero wrap"><div className="section-label"><span><b>01</b> / ACTUS À LA UNE</span><span>{story.date} · {story.category}</span></div><div className="article-heading"><div><p className="eyebrow"><span className="live-dot" /> RÉÉCRIT POUR LET’S PLAY</p><h1>{story.title}<br/><em>{story.accent}</em></h1><p className="article-dek">{story.dek}</p><div className="article-byline"><span>LET’S PLAY</span><span>4 MIN DE LECTURE</span></div></div><div className="article-cover hud-frame"><img src={`${base}${story.image}`} alt={story.imageAlt} /><div><small>{story.category}</small><strong>{story.cover}</strong></div></div></div></section>
    <main className="article-layout wrap"><article className="article-body"><p className="article-lead">{story.lead}</p><p>{story.intro}</p><h2>{story.h2}</h2><p>{story.p1}</p><div className="article-pullquote"><span>“</span><p>{story.quote}</p><small>{story.quoteBy}</small></div><p>{story.p2}</p><h2>{story.h2b}</h2><p>{story.p3}</p><p>{story.p4}</p><div className="article-endnote"><span className="live-dot" /><strong>{story.take}</strong><span>{story.takeText}</span></div></article><aside className="article-aside"><div className="aside-card"><span className="aside-kicker">EN BREF</span><strong>{story.date}</strong><strong>{story.category}</strong><strong>LET’S PLAY ORIGINAL</strong></div><div className="aside-card aside-card-accent"><span className="aside-kicker">À LIRE AUSSI</span><strong>LES ACTUS À LA UNE</strong><p>Retrouvez les dernières annonces et analyses de la rédaction.</p><Link className="arrow-link" to="/news">RETOUR AUX ACTUS <Arrow/></Link></div></aside></main>
    <Comments />
    <section className="cta wrap"><div><p className="eyebrow"><span className="live-dot" /> LA SUITE SUR LET’S PLAY</p><h2>RESTEZ DANS<br/><em>LE GAME.</em></h2></div><Link className="button button-yellow" to="/news">VOIR LES ACTUS <Arrow/></Link></section>
  </>;
}

export { stories };
