// L'aperçu du sonar de la Malédiction.
// Servi par `npm run preview:rpg-malediction-sonar` (aucun navigateur à installer).
//
// Ce n'est pas une page du jeu : c'est une table d'essai. Elle pose les trois
// teintes du même calque côte à côte — le bleu de la Résonance, l'or de l'Aura
// et le violet de la Malédiction — avec, à droite, une créature maudite qui ne
// rayonne pas : seule la source projette ses ondes.
import { createRoot } from 'react-dom/client';
import { TableCard } from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';
import '../src/games/rpg-battle.css';

const entite = (carteId, extras = {}) => {
  const carte = cardById(carteId);
  return {
    id: `apercu-${carteId}`,
    carteId,
    name: carte?.name ?? carteId,
    atk: carte?.atk ?? 3,
    pv: carte?.def ?? 3,
    pvMax: carte?.def ?? 3,
    armes: [],
    ...extras,
  };
};

const CASES = [
  {
    titre: 'Malédiction · violet',
    detail: 'La Barbe Noire — toutes les créatures adverses gagnent -2/-0.',
    entite: entite('la-barbe-noire'),
  },
  {
    titre: 'Aura · or',
    detail: 'Le Kenshi de la forge — renforce ses voisines de case.',
    entite: entite('kenshi-de-la-forge'),
  },
  {
    titre: 'Résonance · bleu',
    detail: 'Le Samouraï du torii — +1/+1 aux Samouraïs des deux camps.',
    entite: entite('samourai-du-torii'),
  },
  {
    titre: 'Créature maudite · rien',
    detail: 'Le Fennec porte `maledictionBonus = -2` : il subit, il ne rayonne pas.',
    entite: entite('fennec-des-decombres', { maledictionBonus: -2 }),
  },
];

function Apercu() {
  return (
    <main>
      <header>
        <h1>Le Sablier — le sonar de la <em>Malédiction</em></h1>
        <p>
          Même calque, même cycle de 3,6 s, même débordement hors du cadre :
          seule la teinte change. Le violet des Ténèbres dit que l'onde part
          vers le camp adverse.
        </p>
        <p className="note">
          En mouvement réduit (<code>prefers-reduced-motion</code>), les trois
          ondes se figent en couronnes immobiles — le liseré violet reste
          allumé.
        </p>
      </header>
      <div className="grille">
        {CASES.map((cas) => (
          <section className="scenario" key={cas.titre}>
            <h2>{cas.titre}</h2>
            <TableCard entite={cas.entite} cote="joueur" tilt={0} />
            <p className="note">{cas.detail}</p>
          </section>
        ))}
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<Apercu />);
