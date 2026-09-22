// Visuel éditorial d’un article : une carte 16:9 aux couleurs Let’s Play
// (fond sombre, cadre HUD, accent jaune), générée en SVG déterministe.
// Pas de photo : aucune image de droit n’est embarquée automatiquement.

const WIDTH = 1280;
const HEIGHT = 720;

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Découpe un titre en lignes qui tiennent dans ~1040 px selon la taille.
function wrap(text, fontSize, maxLines = 4) {
  const charWidth = fontSize * 0.62;
  const budget = Math.max(8, Math.floor(1040 / charWidth));
  const words = String(text).toUpperCase().replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > budget && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  return lines.slice(0, maxLines);
}

export function coverSvg({ title, accent, category, date, source }) {
  const headline = `${title} ${accent}`.replace(/\s+/g, ' ').trim();
  let fontSize = 76;
  let lines = wrap(headline, fontSize, 4);
  if (lines.length > 3) { fontSize = 62; lines = wrap(headline, fontSize, 4); }
  if (lines.length > 3) { fontSize = 50; lines = wrap(headline, fontSize, 4); }
  const lineHeight = Math.round(fontSize * 1.08);
  const startY = Math.round(HEIGHT / 2 - ((lines.length - 1) * lineHeight) / 2 + 14);
  const textLines = lines
    .map((line, index) => `<text x="120" y="${startY + index * lineHeight}" font-size="${fontSize}" fill="#ffffff">${escapeXml(line)}</text>`)
    .join('');
  const kicker = escapeXml([date, category, source ? `D’APRÈS ${source.toUpperCase()}` : ''].filter(Boolean).join('  ·  ').toUpperCase());

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(headline)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#101014"/><stop offset="0.55" stop-color="#0b0b0f"/><stop offset="1" stop-color="#16161c"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffd400" stop-opacity="0.16"/><stop offset="1" stop-color="#ffd400" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <g opacity="0.35">
    <rect x="-200" y="-160" width="900" height="140" fill="#1c1c24" transform="rotate(-18 250 -90)"/>
    <rect x="620" y="640" width="1000" height="120" fill="#1c1c24" transform="rotate(-18 1120 700)"/>
  </g>
  <rect x="0" y="${HEIGHT - 220}" width="${WIDTH}" height="220" fill="url(#shine)"/>
  <g fill="none" stroke="#ffd400" stroke-width="4">
    <path d="M40 110 L40 40 L110 40"/>
    <path d="M${WIDTH - 40} 610 L${WIDTH - 40} 680 L${WIDTH - 110} 680"/>
  </g>
  <g fill="none" stroke="#3a3a44" stroke-width="2">
    <path d="M${WIDTH - 40} 110 L${WIDTH - 40} 40 L${WIDTH - 110} 40"/>
    <path d="M40 610 L40 680 L110 680"/>
  </g>
  <g>
    <rect x="40" y="86" width="236" height="56" fill="#ffd400"/>
    <text x="60" y="124" font-family="'Arial Black', Arial, Helvetica, sans-serif" font-size="28" font-weight="900" fill="#0b0b0f" letter-spacing="2">LET’S PLAY</text>
    <text x="292" y="124" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#8b8b96" letter-spacing="6">ACTUS DU JOUR</text>
  </g>
  <g font-family="'Arial Black', Arial, Helvetica, sans-serif" font-weight="900" letter-spacing="1">
    ${textLines}
  </g>
  <rect x="120" y="${startY + lines.length * lineHeight + 18}" width="72" height="6" fill="#ffd400"/>
  <text x="120" y="${HEIGHT - 60}" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#9a9aa6" letter-spacing="3">${kicker}</text>
</svg>
`;
}
