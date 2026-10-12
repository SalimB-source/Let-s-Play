// Rendu réel de la musique d'ambiance du mode Histoire dans jsdom : un faux
// `AudioContext` compte les nœuds que la page planifie, comme la carte son du
// joueur. Le garde-fou rejoue le parcours complet — lancer un étage, couper le
// son, le rendre, rentrer au menu — et vérifie à chaque étape que la boucle de
// la tour démarre ou s'arrête. Une musique qu'on n'entend pas est une musique
// que la page ne joue pas : ce contrôle-là manquait.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Assez de Web Audio pour compter ce qui serait audible. */
function installerFauxAudio(window) {
  const cumul = {
    contextes: 0,
    oscillateurs: 0,
    sources: 0,
    gains: [],
    dernier: null,
    get noeuds() { return cumul.oscillateurs + cumul.sources; },
  };
  const gain = () => {
    const noeud = {
      gain: {
        value: 0,
        cibles: [],
        setValueAtTime(valeur) { noeud.gain.value = valeur; },
        exponentialRampToValueAtTime() {},
        cancelScheduledValues() {},
        setTargetAtTime(valeur) { noeud.gain.cibles.push(valeur); },
      },
      connect() {},
    };
    cumul.gains.push(noeud);
    return noeud;
  };
  class FauxAudioContext {
    constructor() {
      cumul.contextes += 1;
      cumul.dernier = this;
      this.depart = Date.now();
      this.sampleRate = 44100;
      this.destination = {};
      this.ferme = false;
    }
    get currentTime() { return (Date.now() - this.depart) / 1000; }
    createGain() { return gain(); }
    createOscillator() {
      cumul.oscillateurs += 1;
      return {
        type: 'sine',
        frequency: { value: 0, setValueAtTime() {} },
        detune: { value: 0, setValueAtTime() {} },
        connect() {},
        start() {},
        stop() {},
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        Q: { value: 0 },
        connect() {},
      };
    }
    createBuffer(_, longueur) {
      return { longueur, getChannelData: () => new Float32Array(longueur) };
    }
    createBufferSource() {
      cumul.sources += 1;
      return { buffer: null, loop: false, connect() {}, start() {}, stop() {} };
    }
    async resume() {}
    async close() { this.ferme = true; }
  }
  window.AudioContext = FauxAudioContext;
  return cumul;
}

export async function checkRpgAmbientMusic(assert) {
  const cumul = installerFauxAudio(window);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'desert', 'chien-du-guet', 'parade-du-verre', 'mer', 'veilleur-du-couchant', 'fennec-des-decombres', 'desert']}
      sorcierDeck={['chien-du-guet', 'desert', 'chien-du-guet', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert']}
      rng={() => 0.999}
    />);
  });

  const buttons = () => [...container.querySelectorAll('button')];
  // Les minuteries du duel (tour du sorcier, animations) continuent de vivre
  // pendant les attentes : elles sont tenues dans `act`, comme les autres
  // rendus jsdom du jeu, pour ne pas éveiller d'avertissement React.
  const click = async (button, indice) => {
    assert.ok(button, `le bouton attendu existe (${indice})`);
    await act(async () => { button.click(); });
    await act(async () => { await wait(250); });
  };
  // Une boucle de 8 mesures à 16 pas, c'est long : on laisse le temps au
  // planificateur de traverser plusieurs pas, tous temps confondus.
  const laisserJouer = async (ms) => {
    await act(async () => { await wait(ms); });
  };

  // --- Le menu reste silencieux : aucune tour, aucune boucle ---
  assert.equal(cumul.contextes, 0, 'le menu ne crée aucun contexte audio');

  await click(buttons().find((button) => button.textContent.includes('Histoire')), 'entrée Histoire');
  const etages = () => [...container.querySelectorAll('.rpg-story-floor')];
  await click(etages().find((etage) => etage.getAttribute('data-etage') === 'listes-1'), 'étage listes-1');

  // --- L'étage lancé fait jouer la boucle de sa tour ---
  await laisserJouer(900);
  assert.equal(cumul.contextes, 1, 'l’étage lancé crée le contexte audio de la musique');
  assert.ok(cumul.noeuds > 0, 'la boucle de la tour produit du son');
  assert.ok(cumul.oscillateurs > 0, 'les notes de la tour sont planifiées');
  assert.ok(cumul.sources > 0, 'le souffle de la tour (bruit filtré) est planifié');

  // --- Le bouton de la barre du duel coupe la musique ---
  const boutonSon = () => buttons().find((button) => button.classList.contains('rpg-duel-nav__sound'));
  assert.ok(boutonSon(), 'la barre du duel porte le bouton de musique');
  assert.equal(boutonSon().getAttribute('aria-pressed'), 'true', 'la musique est annoncée active');
  await click(boutonSon(), 'coupure du son');
  assert.equal(boutonSon().getAttribute('aria-pressed'), 'false', 'le bouton annonce la musique coupée');
  assert.ok(cumul.gains[0].gain.cibles.at(-1) < 0.01, 'le volume général est ramené à zéro');
  const apresCoupure = cumul.noeuds;
  await laisserJouer(500);
  assert.equal(cumul.noeuds, apresCoupure, 'plus aucun son n’est planifié une fois la musique coupée');

  // --- Rendre le son relance la boucle ---
  await click(boutonSon(), 'son rendu');
  await laisserJouer(1400);
  assert.equal(boutonSon().getAttribute('aria-pressed'), 'true', 'le bouton annonce la musique rendue');
  assert.ok(cumul.noeuds > apresCoupure, 'la boucle reprend quand le son revient');
  assert.ok(cumul.gains[0].gain.cibles.at(-1) > 0.5, 'le volume général est rendu');

  // --- Rentrer au menu arrête la musique ---
  await click(buttons().find((button) => button.textContent.trim() === 'Menu'), 'bouton Menu');
  const auMenu = cumul.noeuds;
  await laisserJouer(500);
  assert.equal(cumul.noeuds, auMenu, 'rentrer au menu arrête la musique');

  // --- Le démontage ferme le contexte audio ---
  await act(async () => { root.unmount(); });
  assert.equal(cumul.dernier.ferme, true, 'quitter la page ferme le contexte audio');
}
