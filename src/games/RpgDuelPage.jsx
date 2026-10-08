/**
 * La nouvelle partie du Sablier de Bab El — le duel de sorciers.
 *
 * Plus aucune ancienne carte : le paquet du joueur et celui du sorcier ne
 * contiennent que les nouvelles cartes (créatures + héros) en images 4:5,
 * posées sur la table en bois. Table vide au départ, 5 cartes piochées,
 * 50 PV (le sorcier selon sa puissance), mur de créatures, mal
 * d'invocation, une attaque par tour, capacités d'arrivée/destruction.
 */

import { useEffect, useRef, useState } from 'react';
import './rpg-battle.css';
import {
  rpgAttaquerCreature,
  rpgAttaquerSorcier,
  rpgEngagerTerrain,
  rpgFinDeTour,
  rpgJouerCreature,
  rpgNouveauDuel,
  rpgPeutPayer,
  rpgPoserTerrain,
  rpgTourSorcierIA,
  rpgVainqueur,
} from './rpgDuel.js';
import { CARD_RARITIES, cardById } from './rpgCards.js';

const JOUEUR_DECK = [
  'rat-des-decombres', 'chien-du-guet', 'chien-du-guet', 'porteuse-de-cruches',
  'guetteur-du-beffroi', 'vipere-de-verre', 'dune-marchante', 'dune-marchante',
  'scribe-de-la-liste', 'sonneur-fele', 'colosse-de-sel', 'djinn-du-souk',
  'salem', 'yamina', 'boualem', 'feriel', 'tarek',
  'plaines', 'plaines', 'plaines', 'plaines', 'mer', 'mer', 'mer', 'montagne', 'montagne', 'montagne',
];
const SORCIER_DECK = [
  'chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet',
  'dune-marchante', 'dune-marchante', 'dune-marchante', 'dune-marchante',
  'rat-des-decombres', 'rat-des-decombres', 'porteuse-de-cruches', 'porteuse-de-cruches',
  'guetteur-du-beffroi', 'guetteur-du-beffroi', 'sonneur-fele', 'sonneur-fele',
  'vipere-de-verre', 'vipere-de-verre',
  'plaines', 'plaines', 'plaines', 'plaines', 'mer', 'mer', 'montagne', 'montagne',
];

const TILTS = [-2.4, 1.7, -1.2, 2.3, -1.8, 1.1];
const cardArt = (id) => `${import.meta.env.BASE_URL}cards/${id}.jpg`;

/** Carte posée sur la table : l'image 4:5, nom et ⚔/ en bandeaux. */
function TableCard({ entite, cote, active, selected, onClick, tilt }) {
  const carte = cardById(entite.carteId);
  return (
    <article
      className={[
        `rpg-card rpg-card--img rpg-card--elem-${carte?.element ?? 'sable'}`,
        cote === 'ennemi' ? 'rpg-card--ennemi' : 'rpg-card--equipe',
        carte?.kind === 'hero' ? 'rpg-card--legendaire' : '',
        active ? 'is-active' : '',
        selected ? 'is-selected' : '',
        entite.ready && !entite.attaquee && cote === 'joueur' ? 'is-pret' : '',
      ].join(' ')}
      style={{ '--tilt': `${tilt}deg` }}
      onClick={onClick}
      title={`${entite.name} — ⚔${entite.atk} 🛡${entite.pv}`}
    >
      <img className="rpg-card__img" src={cardArt(entite.carteId)} alt={`Carte ${entite.name}`} />
      <header className="rpg-card__title">
        <strong>{entite.name}</strong>
        {carte?.kind === 'hero' && <em className="rpg-card__set rpg-card__set--mythique" aria-hidden="true">✦</em>}
      </header>
      <footer className="rpg-card__foot">
        <span className="rpg-card__stat rpg-card__stat--atk" title="Attaque">⚔ {entite.atk}</span>
        <span className="rpg-card__pt" title="Défense (PV restants)">🛡 {entite.pv}</span>
      </footer>
    </article>
  );
}

export default function RpgDuelPage({ joueurDeck = JOUEUR_DECK, sorcierDeck = SORCIER_DECK, sorcierPuissance = 2 } = {}) {
  const duelRef = useRef(null);
  const [, setVersion] = useState(0);
  const force = () => setVersion((v) => v + 1);
  const [attaquantId, setAttaquantId] = useState(null);
  const [message, setMessage] = useState('Posez vos cartes, puis attaquez. Fin du tour quand vous voulez.');
  const timersRef = useRef([]);
  const later = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };
  useEffect(() => () => timersRef.current.forEach((id) => window.clearTimeout(id)), []);

  const nouvellePartie = () => {
    duelRef.current = rpgNouveauDuel({ joueurDeck, sorcierDeck, sorcierPuissance });
    setAttaquantId(null);
    setMessage('À vous : posez des cartes (le sable tombe chaque tour), puis Fin du tour.');
    force();
  };
  useEffect(() => { nouvellePartie(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const duel = duelRef.current;
  if (!duel) return null;
  const vainqueur = rpgVainqueur(duel);
  const monTour = duel.tour === 'joueur' && !vainqueur;

  const poserTerrain = (carteId) => {
    if (!monTour) return;
    const res = rpgPoserTerrain(duel, 'joueur', carteId);
    setMessage(res.ok ? `Terrain posé : ${cardById(carteId).name}. Engagez-le pour son mana.` : 'Un seul terrain par tour.');
    force();
  };

  const engager = (terrainId) => {
    if (!monTour) return;
    const res = rpgEngagerTerrain(duel, 'joueur', terrainId);
    setMessage(res.ok ? 'Terrain engagé : +1 mana.' : 'Déjà engagé.');
    force();
  };

  const poserCarte = (carteId) => {
    if (!monTour) return;
    const carte = cardById(carteId);
    const cibleAuto = duel.sorcier.creatures[0]?.id ?? null;
    const res = rpgJouerCreature(duel, 'joueur', carteId, cibleAuto);
    if (!res.ok) {
      setMessage(res.raison === 'mana' ? `Pas le bon mana pour ${carte?.name} (${carte.cost}, dont 1 ${carte.element}).` : 'Impossible.');
    } else {
      setMessage(`Vous posez ${carte.name} (⚔${carte.atk} 🛡${carte.def}).`);
    }
    force();
  };

  const cliquerCreatureJoueur = (entite) => {
    if (!monTour) return;
    if (!entite.ready || entite.attaquee) {
      setMessage(entite.ready ? `${entite.name} a déjà frappé ce tour.` : `${entite.name} observe encore (mal d'invocation).`);
      force();
      return;
    }
    setAttaquantId(attaquantId === entite.id ? null : entite.id);
    setMessage(attaquantId === entite.id ? 'Attaque annulée.' : `${entite.name} prêt à frapper : choisissez une cible.`);
    force();
  };

  const cliquerCreatureEnnemie = (entite) => {
    if (!monTour || !attaquantId) return;
    const res = rpgAttaquerCreature(duel, 'joueur', attaquantId, entite.id);
    setMessage(res.ok ? `${cardById(duel.joueur.creatures.find((e) => e.id === attaquantId)?.carteId ?? '')?.name ?? 'Votre créature'} attaque ${entite.name}.` : 'Attaque impossible.');
    setAttaquantId(null);
    force();
  };

  const cliquerSorcier = () => {
    if (!monTour || !attaquantId) {
      if (monTour) setMessage(duel.sorcier.creatures.length ? 'Des créatures vous font face : tuez-les d’abord.' : 'Choisissez d’abord une créature prête.');
      force();
      return;
    }
    const res = rpgAttaquerSorcier(duel, 'joueur', attaquantId);
    setMessage(res.ok ? 'Votre créature frappe le sorcier adverse !' : 'Le mur de créatures vous bloque.');
    setAttaquantId(null);
    force();
  };

  const finDuTour = () => {
    if (!monTour) return;
    setAttaquantId(null);
    rpgFinDeTour(duel);
    setMessage('Le sorcier adverse joue…');
    force();
    later(() => {
      rpgTourSorcierIA(duel, Math.random);
      force();
      later(() => {
        rpgFinDeTour(duel);
        setMessage('À vous : +2 ⛃ et une carte piochée.');
        force();
      }, 700);
    }, 700);
  };

  return (
    <div className="rpg-battle" data-scene="duel">
      <div
        className="card-table"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}card-table.jpg)` }}
        aria-label="Table de jeu du duel de sorciers"
      >
        <button type="button" className="rpg-wizard-plate rpg-wizard-plate--ennemi" onClick={cliquerSorcier}
          title={attaquantId ? 'Frapper le sorcier adverse' : 'Le sorcier adverse'}>
          <strong>LE SORCIER</strong>
          <span className="rpg-wizard-plate__pv">🛡 {duel.sorcier.pv}</span>
          <span className="rpg-wizard-plate__sable">
            <i className="mana mana--braise" title="Mana braise">{duel.sorcier.mana.braise}</i>
            <i className="mana mana--eau" title="Mana eau">{duel.sorcier.mana.eau}</i>
            <i className="mana mana--sable" title="Mana sable">{duel.sorcier.mana.sable}</i>
            · 🂠 {duel.sorcier.deck.length}
          </span>
        </button>
        <div className="rpg-wizard-plate rpg-wizard-plate--joueur" title="Vous">
          <strong>VOUS</strong>
          <span className="rpg-wizard-plate__pv">🛡 {duel.joueur.pv}</span>
          <span className="rpg-wizard-plate__sable">
            <i className="mana mana--braise" title="Mana braise">{duel.joueur.mana.braise}</i>
            <i className="mana mana--eau" title="Mana eau">{duel.joueur.mana.eau}</i>
            <i className="mana mana--sable" title="Mana sable">{duel.joueur.mana.sable}</i>
            · 🂠 {duel.joueur.deck.length}
          </span>
        </div>

        <div className="rpg-terrains rpg-terrains--ennemi" aria-label="Terrains du sorcier">
          {duel.sorcier.terrains.map((terrain) => (
            <span key={terrain.id} className={`rpg-terrain ${terrain.tapped ? 'is-tapped' : ''}`}
              title={`${cardById(terrain.carteId)?.name}${terrain.tapped ? ' (engagé)' : ''}`}>
              <img src={cardArt(terrain.carteId)} alt="" />
            </span>
          ))}
        </div>
        <div className="rpg-terrains rpg-terrains--joueur" aria-label="Vos terrains, cliquez pour engager">
          {duel.joueur.terrains.map((terrain) => (
            <button key={terrain.id} type="button"
              className={`rpg-terrain rpg-terrain--joueur ${terrain.tapped ? 'is-tapped' : ''}`}
              disabled={!monTour || terrain.tapped}
              onClick={() => engager(terrain.id)}
              title={`${cardById(terrain.carteId)?.name} — cliquer pour engager (+1 mana)`}>
              <img src={cardArt(terrain.carteId)} alt="" />
            </button>
          ))}
        </div>

        <div className="card-row card-row--ennemi">
          {duel.sorcier.creatures.map((entite, i) => (
            <TableCard
              key={entite.id}
              entite={entite}
              cote="ennemi"
              selected={false}
              tilt={TILTS[i % TILTS.length]}
              onClick={() => cliquerCreatureEnnemie(entite)}
            />
          ))}
        </div>
        <div className="card-row card-row--equipe">
          {duel.joueur.creatures.map((entite, i) => (
            <TableCard
              key={entite.id}
              entite={entite}
              cote="joueur"
              active={attaquantId === entite.id}
              selected={attaquantId === entite.id}
              tilt={TILTS[(i + 2) % TILTS.length]}
              onClick={() => cliquerCreatureJoueur(entite)}
            />
          ))}
        </div>

        <div className="rpg-bottombar">
          <ol className="rpg-log" aria-live="polite">
            {duel.log.slice(-7).map((line, index) => (
              <li key={`${duel.log.length}-${index}-${line}`} className="rpg-log__line">{line}</li>
            ))}
          </ol>
          <p className="rpg-actions__wait" aria-live="polite">{message}</p>
          <div className="rpg-actions">
            <div className="rpg-actions__row">
              <button type="button" className="rpg-btn rpg-btn--endturn" onClick={finDuTour} disabled={!monTour}>
                ⧗ Fin du tour
              </button>
            </div>
          </div>
        </div>

        <div className="rpg-hand-dock" aria-label="Votre main, à moitié glissée sous la table">
          <div className="rpg-hand">
            {duel.joueur.main.map((carteId, i) => {
              const carte = cardById(carteId);
              const estTerrain = carte.kind === 'terrain';
              const jouable = monTour && (estTerrain ? !duel.joueur.terrainPose : rpgPeutPayer(duel.joueur, carte));
              return (
                <button
                  key={`${carteId}-${i}`}
                  type="button"
                  disabled={!jouable}
                  onClick={estTerrain ? () => poserTerrain(carteId) : () => poserCarte(carteId)}
                  className={[
                    'rpg-hand__card rpg-hand__card--img',
                    estTerrain ? 'rpg-hand__card--terrain' : '',
                    `rpg-hand__card--elem-${carte.element}`,
                  ].join(' ')}
                  style={{ '--tilt': `${TILTS[i % TILTS.length]}deg` }}
                  title={carte.text}
                >
                  <img className="rpg-hand__img" src={cardArt(carteId)} alt={`Carte ${carte.name}`} />
                  <span className="rpg-hand__title">
                    <strong>{carte.name}</strong>
                    <span className="rpg-hand__cost">{carte.cost} ⛃</span>
                  </span>
                  <span className="rpg-hand__stats" title="Attaque / Défense">⚔ {carte.atk} · 🛡 {carte.def}</span>
                  <span className="rpg-hand__text">{carte.text}</span>
                  <span className="rpg-hand__rarity">{CARD_RARITIES[carte.rarity]?.label ?? carte.rarity}</span>
                </button>
              );
            })}
          </div>
        </div>

        {vainqueur && (
          <div className="rpg-overlay">
            <h2>{vainqueur === 'joueur' ? 'Le sorcier s’effondre !' : vainqueur === 'sorcier' ? 'Vous êtes tombé…' : 'Double chute…'}</h2>
            <p>
              {vainqueur === 'joueur'
                ? 'Bab El respire : le cycle tient encore un soir.'
                : 'Le sable recouvre votre Nom. L’Astrolabe sonne pour quelqu’un d’autre.'}
            </p>
            <button type="button" className="rpg-btn rpg-btn--primary" onClick={nouvellePartie}>
              Nouvelle partie
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
