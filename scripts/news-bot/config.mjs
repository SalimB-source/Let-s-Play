// Configuration du robot actus du jour — sources, filtres et scoring.
// Tout le reste du bot lit ce fichier : ajouter un média = ajouter une entrée ici.

export const BOT = {
  // Nombre d'articles générés par exécution (surchargé par --count=N ou NEWS_COUNT).
  count: 3,
  // Une source de plus de N heures est considérée comme « déjà vue ».
  freshHours: 36,
  // En mode --force, on élargit la fenêtre de fraîcheur pour ne jamais sortir vide.
  forceHours: 24 * 8,
  // Pas plus de N articles du même média dans une même fournée.
  maxPerSource: 2,
  // Les articles plus vieux que N jours sont archivés (retirés du site) à chaque run.
  archiveDays: 21,
  // Limites de la matière première envoyée à la rédaction (LLM ou gabarit).
  bodyMaxChars: 7000,
  descriptionMaxChars: 700,
};

export const SOURCES = [
  // ---- Médias francophones -------------------------------------------------
  { name: 'Jeuxvideo.com', url: 'https://www.jeuxvideo.com/rss/rss.xml', lang: 'fr', tier: 3 },
  { name: 'ActuGaming', url: 'https://www.actugaming.net/feed/', lang: 'fr', tier: 3 },
  { name: 'Gamekult', url: 'https://www.gamekult.com/feed.xml', lang: 'fr', tier: 3 },
  { name: 'Frandroid Gaming', url: 'https://www.frandroid.com/gaming/feed', lang: 'fr', tier: 2 },
  { name: 'Numerama', url: 'https://www.numerama.com/pop-culture/feed/', lang: 'fr', tier: 2 },
  // ---- Médias internationaux ----------------------------------------------
  { name: 'VGC', url: 'https://www.videogameschronicle.com/feed/', lang: 'en', tier: 3 },
  { name: 'Eurogamer', url: 'https://www.eurogamer.net/feed', lang: 'en', tier: 3 },
  { name: 'Gematsu', url: 'https://www.gematsu.com/feed', lang: 'en', tier: 2 },
  { name: 'IGN', url: 'https://feeds.ign.com/ign/games-all', lang: 'en', tier: 2 },
  { name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/', lang: 'en', tier: 2 },
];

// Mots-clés qui font monter une news dans la sélection (studios, licences, plateformes).
export const HOT_KEYWORDS = [
  'nintendo', 'switch 2', 'playstation', 'ps5', 'xbox', 'rockstar', 'gta 6', 'gta vi',
  'sony', 'microsoft', 'blizzard', 'valve', 'steam', 'ubisoft', 'ea ', 'capcom',
  'square enix', 'fromsoftware', 'konami', 'bandai namco', 'sega', 'atlus', 'remedy',
  'cd projekt', 'the witcher', 'naughty dog', 'insomniac', 'bethesda', 'elder scrolls',
  'call of duty', 'resident evil', 'grand theft auto', 'zelda', 'mario', 'final fantasy',
  'metal gear', 'silent hill', 'hollow knight', 'halo', 'gearbox', 'borderlands',
  'warner', 'harry potter', 'fortnite', 'minecraft', 'roblox', 'esport', 'game awards',
  'tokyo game show', 'gamescom', 'e3', 'state of play', 'direct', 'showcase',
];

// Sujets à écarter : promos, guides, tests et listicles ne sont pas de l'actu.
export const NEGATIVE_TITLE = [
  /€/, /\$\s?\d/, /\d+\s?€/, /\bpromo\b/i, /\bbon plan\b/i, /\bsoldes?\b/i, /\br[ée]duction\b/i,
  /\bpas cher\b/i, /\bastuce\b/i, /\bsoluce\b/i, /\bguide\b/i, /\bwalkthrough\b/i,
  /\btips\b/i, /\bdeal\b/i, /\bdiscount\b/i, /\bsale\b/i, /\bgiveaway\b/i, /\bconcours\b/i,
  /\btop\s+\d+\b/i, /\bmeilleures? (astuces|offres)\b/i, /\bpatch notes?\b/i,
  /jouable gratuitement/i, /\bmeilleur(e)?s? .*(acheter|installer)\b/i,
];

// Catégories RSS à écarter telles quelles (flux jeuxvideo.com notamment).
export const NEGATIVE_CATEGORIES = [
  /astuce/i, /soluce/i, /guide/i, /test\b/i, /chronique/i, /hardware/i, /bon plan/i,
  /dossier/i, /video\b/i, /vid[ée]o/i,
];

// Sentiment global affiché sur les miniatures : vert (positive), rouge (negative), jaune (mixed).
// Détecté automatiquement (positif = annonce/sortie/succès, négatif = annulation/report/licenciement, mitigé = le reste).
export const SENTIMENT_VALUES = ['positive', 'negative', 'mixed'];

// Le style éditorial Let's Play, injecté tel quel dans le prompt LLM.
export const STYLE_GUIDE = `Tu écris pour « Let’s Play », l’émission algérienne de gaming, cinéma, e-sport et pop culture. La rédaction du site publie chaque jour des actus au style très reconnaissable :

- Français de France, ton de journalisme gaming exigeant : factuel, précis, jamais excité, jamais familié.
- AUCUN fait inventé : tout le contenu doit venir de la matière première fournie. Si un point reste inconnu (date, prix, plateformes), tu le signales comme « à confirmer » au lieu de le deviner.
- On cite clairement la source d’origine dans le champ « source ».
- Titres en MAJUSCULES, coupés en deux champs : « title » (1 à 3 mots forts) + « accent » (la chute, qui se termine TOUJOURS par un point). Exemples réels : title « NETMARBLE QUITTE » / accent « LE TGS AVEC TROIS JEUX. » ; title « PERSONA 6 ARRIVE » / accent « EN PHYSIQUE. » ; title « LE MULTIJOUEUR » / accent « RESTE AU GARAGE. »
- Apostrophes typographiques (’), guillemets français (« »), espaces insécables avant : ; ! ? — pas d’emoji, pas de markdown, texte brut.
- Structure d’un article : dek (chapô 1-2 phrases), lead (accroche), intro (mise en contexte), deux sections titrées (h2 + p1, h2b + p2/p3/p4), une citation en exergue, un encadré « À RETENIR ».
- Les h2 sont courts, en MAJUSCULES, et disent quelque chose (pas « Annonce » ni « Conclusion »).
- La citation (« quote ») est la phrase la plus juste de l’article, avec « quoteBy » : « L’ANALYSE LET’S PLAY ».
- « takeText » résume tout l’article en une phrase autonome.
- Dernier paragraphe (p4) : perspective honnête pour les joueurs — quoi surveiller ensuite, quel signal attendre — sans spéculation présentée comme un fait, puis une question concrète qui donne envie de prendre position dans les commentaires (sans inventer de réponse ni de sondage).
- Les paragraphes font 2 à 4 phrases, environ 45 à 80 mots chacun.
- AUCUNE RÉPÉTITION : une phrase (ou un passage de plus de quelques mots) ne doit jamais réapparaître dans deux champs. dek, lead, intro, p1, quote, p2, p3 et takeText apportent chacun du contenu distinct ; la citation est une phrase unique qui ne figure nulle part ailleurs dans l’article.`;

export const STORY_SCHEMA_DOC = `Réponds UNIQUEMENT avec un objet JSON (aucun texte autour, pas de bloc de code) respectant exactement cette structure :

{
  "title": "2-3 MOTS EN MAJUSCULES",
  "accent": "LA CHUTE EN MAJUSCULES QUI FINIT PAR UN POINT.",
  "category": "EDITEUR OU SUJET · THEME (ex : NINTENDO · DIRECT, SONY · SORTIE)",
  "cover": "1 A 3 MOTS affichés sur le visuel (le sujet principal)",
  "dek": "Chapô de 1 à 2 phrases qui donne l’info clé.",
  "lead": "Accroche de 1 à 2 phrases.",
  "intro": "Mise en contexte de 1 à 3 phrases.",
  "h2": "TITRE DE SECTION 1 EN MAJUSCULES",
  "p1": "Développement des faits principaux, 2-4 phrases.",
  "quote": "Phrase forte tirée de la matière première (15-30 mots), absente de tous les autres champs.",
  "h2b": "TITRE DE SECTION 2 EN MAJUSCULES",
  "p2": "Analyse ou détail de la matière première, 2-4 phrases.",
  "p3": "Complément factuel, 2-4 phrases.",
  "p4": "Perspective : quoi surveiller ensuite, 2-3 phrases.",
  "takeText": "Résumé final en une phrase autonome, reformulé (pas une reprise du dek ou du lead).",
  "sentiment": "positive | negative | mixed — ton global de l'actu : positive (bonne nouvelle/sortie/succès) en VERT, negative (annulation/report/licenciement/problème) en ROUGE, mixed (nuancé/incertain/débat) en JAUNE."
}`;
