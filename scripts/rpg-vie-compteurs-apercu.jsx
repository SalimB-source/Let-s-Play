// L'aperçu interactif de la vie et des compteurs du Sablier.
// Servi par `npm run preview:rpg-vie-compteurs` (aucun navigateur à installer).
//
// Ce n'est pas une page du jeu : c'est une table d'essai. Elle montre les cinq
// états d'une plaque (pleine, entamée, réserve, veille, morte), les compteurs
// tels qu'ils se posent sur une carte, et un essai libre pour voir les gestes
// se jouer — encaisser, soigner, égrener une Heure — sans lancer une partie.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CompteurCarte, PlaqueVie } from '../src/games/RpgVieCompteurs.jsx';
import '../src/games/rpg-vie-compteurs.css';

function Plaque({ titre, pv, pvMax = 25, bouclier = 0 }) {
  return (
    <section className="scenario">
      <h2>{titre}</h2>
      <div className="plaque">
        <span className="avatar" />
        <span className="ident"><strong>VOUS</strong><small>Deck · Sable</small></span>
        <PlaqueVie pv={pv} pvMax={pvMax} bouclier={bouclier} base={25} />
        <span className="zones">Main · 4</span>
      </div>
    </section>
  );
}

function Carte({ heures = 0, sable = 0 }) {
  return (
    <div className="mini">
      <span className="rpg-card__compteurs">
        {heures > 0 && <CompteurCarte type="heures" valeur={heures} />}
        {sable > 0 && <CompteurCarte type="sable" valeur={sable} />}
      </span>
    </div>
  );
}

function Essai() {
  const [pv, setPv] = useState(25);
  const [pvMax, setPvMax] = useState(25);
  const [heures, setHeures] = useState(3);
  const [sable, setSable] = useState(2);
  const frapper = (points) => setPv((n) => Math.max(0, n - points));
  const soigner = (points) => {
    // Comme le jeu : le soin ouvre la réserve, le maximum suit la vie tenue.
    setPv((n) => {
      const suivant = Math.min(30, n + points);
      setPvMax((max) => Math.max(max, suivant));
      return suivant;
    });
  };
  return (
    <section className="scenario essai">
      <h2>Essai libre</h2>
      <div className="plaque">
        <span className="avatar" />
        <span className="ident"><strong>VOUS</strong><small>Deck · Sable</small></span>
        <PlaqueVie pv={pv} pvMax={pvMax} base={25} />
        <span className="zones">Heures {heures} · Sable {sable}</span>
      </div>
      <div className="boutons">
        <button type="button" onClick={() => frapper(3)}>−3 PV</button>
        <button type="button" onClick={() => frapper(8)}>−8 PV</button>
        <button type="button" onClick={() => soigner(4)}>+4 PV</button>
        <button type="button" onClick={() => setHeures((n) => Math.max(0, n - 1))}>−1 Heure</button>
        <button type="button" onClick={() => setHeures(3)}>Remettre 3 Heures</button>
        <button type="button" onClick={() => setSable((n) => Math.max(0, n - 1))}>−1 sable</button>
        <button
          type="button"
          onClick={() => { setPv(25); setPvMax(25); setHeures(3); setSable(2); }}
        >
          Réinitialiser
        </button>
      </div>
      <div className="cartes">
        <Carte heures={heures} sable={sable} />
        <Carte heures={1} />
        <Carte sable={5} />
      </div>
      <p className="note">
        Le deuxième losange reste à une Heure (fêlure et liseré de veille) ; le troisième
        ne porte que du sable. Cliquez plusieurs fois de suite : chaque coup rejoue son
        geste, variante après variante.
      </p>
    </section>
  );
}

function Apercu() {
  return (
    <main>
      <header>
        <h1>La vie est du sable <em>· les compteurs d’Heures</em></h1>
        <p>
          Le Sablier — aperçu des deux animations livrées. Le chiffre des PV roule jusqu’à
          sa nouvelle valeur, le sable suit la part de vie, la réserve s’ouvre en or
          au-dessus de 25, six grains tombent à chaque perte, et la jauge veille à 5 PV.
          Les compteurs se posent, se vident d’un grain, et la dernière Heure se fêle dans
          son losange.
        </p>
        <p className="note">
          Le chiffre vrai reste toujours lisible par les lecteurs d’écran : le roulage est
          un calque décoratif. En mouvement réduit (réglage du système), tout s’arrête sauf
          l’information — la jauge, les couleurs et les valeurs restent.
        </p>
      </header>
      <div className="grille">
        <Plaque titre="Pleine vie · 25 / 25" pv={25} />
        <Plaque titre="Entamée · 12 / 25" pv={12} />
        <Plaque titre="Réserve · 28 / 29 · bouclier 2" pv={28} pvMax={29} bouclier={2} />
        <Plaque titre="Veille · 4 PV" pv={4} />
        <Plaque titre="Morte · 0 PV" pv={0} />
        <Essai />
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<Apercu />);
