// Sentiment d'une actu : positive (vert/sourire), negative (rouge/triste), mixed (jaune/neutre).
// Utilisé sur la page Actus (miniature) et potentiellement sur la page article.

export const SENTIMENTS = {
  positive: { id: 'positive', label: 'Actu positive', short: 'POS', emoji: '😊', color: 'positive' },
  negative: { id: 'negative', label: 'Actu négative', short: 'NÉG', emoji: '😞', color: 'negative' },
  mixed: { id: 'mixed', label: 'Actu mitigée', short: 'MIX', emoji: '😐', color: 'mixed' },
};

const POSITIVE_RE = /(succès|succes|million|record|victoire|remport|gagn|prime|récompens|annonce|dévoile|arrive|arrivée|lancement|lance|disponible|sortie|exclus|nouveau|nouvelle|innovation|amélior|partenariat|collaboration|célèbre|fête|festival|révèle|premier|leader|numéro un|numéro 1|première place|garde la première|quitte le tgs avec|passe à l'attaque|change de quartier|arrive en physique|fait des jaloux|rien d'un hasard|va faire du bruit|entre en scène)/i;
const NEGATIVE_RE = /(licenciement|licenciements|suppression|consolidation|consolider|annulation|annule|perd son dernier jour|report|repouss|retard|prend un peu de retard|reste au garage|ne sortira pas|ne sortira|ne verra pas|n'aura pas|échec|echec|controverse|procès|plainte|justice|accuse|accusation|fermeture|baisse|chute|difficulté|crise|instabilité|conflit|censure|demande l'arrêt|demande son arrêt|dernière jour|typhon|annulation|typhon)/i;

// Mots qui, s'ils coexistent avec du positif et du négatif, signalent un ton nuancé.
// Le jaune (mixed) sert alors à éviter un vert/rouge trompeur.
const MIXED_HINT_RE = /(mais|pourtant|cependant|nuance|mitigé|mitigee|contrasté|partagé|incertain|interrogation|question|débat|tout en|malgré|alors que)/i;

export function inferSentimentFromText(text) {
  if (!text || typeof text !== 'string') return 'mixed';
  const hay = text.toLowerCase();
  const hasPos = POSITIVE_RE.test(hay);
  const hasNeg = NEGATIVE_RE.test(hay);
  const hasMixedHint = MIXED_HINT_RE.test(hay);
  // Si les deux tonalités coexistent, on privilégie le négatif sauf signal de nuance explicite.
  if (hasPos && hasNeg) return hasMixedHint ? 'mixed' : 'negative';
  if (hasMixedHint && (hasPos || hasNeg)) return 'mixed';
  if (hasNeg) return 'negative';
  if (hasPos) return 'positive';
  return 'mixed';
}

export function inferSentimentForStory(story) {
  // Le champ explicite prime sur l'inférence (robot ou rédaction).
  if (story && typeof story.sentiment === 'string') {
    const s = story.sentiment.toLowerCase();
    if (s === 'positive' || s === 'negative' || s === 'mixed' || s === 'neutral') {
      return s === 'neutral' ? 'mixed' : s;
    }
  }
  const hay = [
    story?.title,
    story?.accent,
    story?.dek,
    story?.category,
    story?.cover,
    story?.h2,
    story?.p1,
    story?.takeText,
  ].filter(Boolean).join(' ');
  return inferSentimentFromText(hay);
}

export function sentimentMeta(sentiment) {
  const id = sentiment === 'neutral' ? 'mixed' : sentiment;
  return SENTIMENTS[id] || SENTIMENTS.mixed;
}

// Helper pour les articles « à la main » de News.jsx (objet listing).
export function getArticleSentiment(article, story) {
  if (article?.sentiment) return sentimentMeta(article.sentiment).id;
  if (story) return inferSentimentForStory(story);
  const hay = `${article?.badge || ''} ${article?.title || ''} ${article?.excerpt || ''} ${article?.kicker || ''}`;
  return inferSentimentFromText(hay);
}
