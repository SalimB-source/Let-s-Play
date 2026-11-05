/**
 * La cérémonie du coffre de quête — src/games/RpgCoffreOuverture.jsx
 * =================================================================
 * Le moment qui doit faire plaisir : le coffre tremble, son couvercle saute,
 * huit pièces jaillissent en éventail et le gain s'inscrit en grand. C'est la
 * récompense d'une quête finie, présentée comme un butin et non comme une ligne
 * de comptabilité.
 *
 * Deux règles de la maison, respectées ici :
 *
 *   - **les crédits sont déjà en bourse** quand la cérémonie s'affiche (le
 *     portefeuille les a versés au tap) : fermer l'onglet en plein jaillissement
 *     ne coûte rien, exactement comme pour un paquet acheté au Souk ;
 *   - les coffres qui offrent des cartes (cycle, semaine) ont **déjà** ouvert
 *     leurs paquets au même instant : cette cérémonie passe devant, et le
 *     bouton « Voir les cartes » la referme pour découvrir la cérémonie de
 *     retournement (`RpgBoosterOuverture`) qui attendait dessous.
 *
 * `prefers-reduced-motion` montre le coffre ouvert et le gain, sans secousse.
 */
import { useEffect, useMemo, useState } from 'react';
import { creditsLisible } from './rpgCredits.js';
import { CoffreSvg } from './RpgCoffresQuetes.jsx';
import RpgCreditIcon from './RpgCreditIcon.jsx';

/** Les huit pièces, en éventail : des angles fixes, jamais de hasard au rendu. */
const PIECES = Array.from({ length: 8 }, (_, rang) => {
  const angle = (-160 + rang * 22) * (Math.PI / 180);
  return { rang, dx: Math.round(Math.cos(angle) * 78), dy: Math.round(Math.sin(angle) * 62) };
});

export default function RpgCoffreOuverture({ coffre, paquetsObtenus = 0, onFermer, onPlaySfx }) {
  const [ouvert, setOuvert] = useState(false);

  const reduit = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    try { return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
  }, []);

  useEffect(() => {
    if (!coffre) return undefined;
    if (reduit) { setOuvert(true); return undefined; }
    setOuvert(false);
    const minuteur = setTimeout(() => { setOuvert(true); onPlaySfx?.('bell'); }, 380);
    return () => clearTimeout(minuteur);
  }, [coffre, reduit, onPlaySfx]);

  // Échap referme, comme les autres couches du jeu.
  useEffect(() => {
    if (!coffre) return undefined;
    const surTouche = (event) => { if (event.key === 'Escape') { event.preventDefault(); onFermer?.(); } };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [coffre, onFermer]);

  if (!coffre) return null;

  const avecCartes = paquetsObtenus > 0;
  const note = avecCartes
    ? `Et ${paquetsObtenus} paquet${paquetsObtenus > 1 ? 's' : ''} de cartes à retourner !`
    : coffre.paquets > 0
      ? 'Le comptoir n’est pas encore ouvert : ce coffre ne verse que ses crédits.'
      : 'Crédits encaissés dans votre bourse.';

  return (
    <div
      className="rpg-coffre-ouverture"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coffre-ouverture-titre"
      data-coffre-ouverture={coffre.genre}
      data-coffre-ouverture-ouvert={ouvert ? 'oui' : 'non'}
      data-coffre-ouverture-paquets={paquetsObtenus}
      style={{ '--coffre-teinte': coffre.teinte }}
    >
      <div className="rpg-coffre-ouverture__boite">
        <h2 id="coffre-ouverture-titre" className="rpg-coffre-ouverture__titre">{coffre.nom}</h2>

        <div className={`rpg-coffre-ouverture__scene${ouvert ? ' is-ouvert' : ''}`}>
          <span className="rpg-coffre-ouverture__eclair" aria-hidden="true" />
          <CoffreSvg ouvert={ouvert} genre={coffre.genre} />
          <span className="rpg-coffre-ouverture__pieces" aria-hidden="true">
            {PIECES.map((piece) => (
              <span
                key={piece.rang}
                className="rpg-coffre-ouverture__piece"
                style={{ '--rang': piece.rang, '--dx': piece.dx, '--dy': piece.dy }}
              />
            ))}
          </span>
        </div>

        <p className="rpg-coffre-ouverture__gain" data-coffre-gain={coffre.credits}>
          <RpgCreditIcon anime />
          <b>+{creditsLisible(coffre.credits)}</b>
          <span className="sr-only">crédits</span>
        </p>
        <p className="rpg-coffre-ouverture__note">{note}</p>

        <button type="button" className="rpg-coffre-ouverture__suite" data-coffre-suite onClick={() => onFermer?.()}>
          {avecCartes ? 'Voir les cartes' : 'Encaisser'}
        </button>
      </div>
    </div>
  );
}
