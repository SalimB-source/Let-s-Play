// Rendu réel du son du mode Histoire dans jsdom : de faux `AudioContext`
// comptent les nœuds des bruitages et de la musique. Le garde-fou rejoue le
// parcours complet — lancer un étage, couper le son, le rendre, rentrer au
// menu — et vérifie à chaque étape que les deux lecteurs démarrent/s'arrêtent
// puis libèrent leurs contextes.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Assez de Web Audio pour compter ce qui serait audible. */
function installerFauxAudio(window) {
  const cumul = {
    contextes: 0,
    contextesCrees: [],
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
      cumul.contextesCrees.push(this);
      this.depart = Date.now();
      this.sampleRate = 44100;
      this.destination = {};
      this.ferme = false;
      this.noeuds = { oscillateurs: 0, sources: 0 };
      this.gains = [];
    }
    get currentTime() { return (Date.now() - this.depart) / 1000; }
    createGain() {
      const noeud = gain();
      this.gains.push(noeud);
      return noeud;
    }
    createOscillator() {
      cumul.oscillateurs += 1;
      this.noeuds.oscillateurs += 1;
      return {
        type: 'sine',
        frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        detune: { value: 0, setValueAtTime() {} },
        connect() {},
        disconnect() {},
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
        disconnect() {},
      };
    }
    createStereoPanner() {
      return { pan: { value: 0 }, connect() {}, disconnect() {} };
    }
    createDynamicsCompressor() {
      return {
        threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 },
        connect() {},
      };
    }
    createBuffer(_, longueur) {
      return { longueur, getChannelData: () => new Float32Array(longueur) };
    }
    createBufferSource() {
      cumul.sources += 1;
      this.noeuds.sources += 1;
      return { buffer: null, loop: false, connect() {}, disconnect() {}, start() {}, stop() {} };
    }
    createConvolver() { return { buffer: null, connect() {} }; }
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
  await click(container.querySelector('.rpg-story-tower[data-tour="tour-des-listes"]'), 'ouverture de la Tour des Listes');
  const etages = () => [...container.querySelectorAll('.rpg-story-floor')];
  await click(etages().find((etage) => etage.getAttribute('data-etage') === 'listes-1'), 'étage listes-1');

  // --- L'étage lancé fait jouer la boucle de sa tour ---
  await laisserJouer(900);
  assert.equal(cumul.contextes, 2, 'le jeu sépare le contexte des bruitages de celui de la musique');
  const contexteMusique = cumul.contextesCrees[1];
  const noeudsMusique = () => contexteMusique.noeuds.oscillateurs + contexteMusique.noeuds.sources;
  assert.ok(noeudsMusique() > 0, 'la boucle de la tour produit du son');
  assert.ok(contexteMusique.noeuds.oscillateurs > 0, 'les notes de la tour sont planifiées');
  assert.ok(contexteMusique.noeuds.sources > 0, 'le souffle de la tour (bruit filtré) est planifié');

  // --- Le bouton de la barre du duel coupe tous les sons ---
  const boutonSon = () => buttons().find((button) => button.classList.contains('rpg-duel-nav__sound'));
  assert.ok(boutonSon(), 'la barre du duel porte le bouton du son');
  assert.equal(boutonSon().getAttribute('aria-pressed'), 'true', 'le son est annoncé actif');
  await click(boutonSon(), 'coupure du son');
  assert.equal(boutonSon().getAttribute('aria-pressed'), 'false', 'le bouton annonce le son coupé');
  assert.ok(contexteMusique.gains[0].gain.cibles.at(-1) < 0.01, 'le volume général est ramené à zéro');
  const apresCoupure = noeudsMusique();
  await laisserJouer(500);
  assert.equal(noeudsMusique(), apresCoupure, 'plus aucun son n’est planifié une fois la musique coupée');

  // --- Rendre le son relance la boucle ---
  await click(boutonSon(), 'son rendu');
  await laisserJouer(1400);
  assert.equal(boutonSon().getAttribute('aria-pressed'), 'true', 'le bouton annonce le son rendu');
  assert.ok(noeudsMusique() > apresCoupure, 'la boucle reprend quand le son revient');
  assert.ok(contexteMusique.gains[0].gain.cibles.at(-1) > 0.5, 'le volume général est rendu');

  // --- Rentrer au menu arrête la musique ---
  await click(buttons().find((button) => button.textContent.trim() === 'Menu'), 'bouton Menu');
  const auMenu = noeudsMusique();
  await laisserJouer(500);
  assert.equal(noeudsMusique(), auMenu, 'rentrer au menu arrête la musique');

  // --- Le démontage ferme les deux contextes audio ---
  await act(async () => { root.unmount(); });
  assert.ok(cumul.contextesCrees.every((context) => context.ferme), 'quitter la page ferme les deux lecteurs audio');
}
