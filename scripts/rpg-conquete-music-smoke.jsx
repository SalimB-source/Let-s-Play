import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { rpgNouveauDuel } from '../src/games/rpgDuel.js';

export async function checkConqueteMusic(assert) {
  const originalAudio = window.Audio;
  const pistes = [];
  class Audio {
    constructor(src) { this.src = src; this.volume = 1; this.muted = false; this.currentTime = 0; this.paused = true; pistes.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {}
  }
  window.Audio = Audio;
  const hote = document.createElement('div');
  document.body.append(hote);
  let root = createRoot(hote);
  let seq = 0;
  const initial = rpgNouveauDuel({ pvp: true, rng: () => .1 });
  const decks = { joueur: { id: 'serment-du-soleil-rouge' }, sorcier: { id: 'cour-des-djinns' } };
  const musicaux = () => pistes.filter((p) => /Bushido|CherryBlossom|Acoustic Guitar/.test(p.src));
  const audibles = () => musicaux().filter((p) => !p.paused && !p.muted && p.volume > 0);
  const attendreFondu = () => act(async () => { await new Promise((r) => setTimeout(r, 1300)); });
  const verifierCamp = (camp) => {
    const table = hote.querySelector('.card-table');
    assert.equal(table.dataset.campMusical, camp);
    assert.equal(table.dataset.plateauMusical, camp === 'joueur' ? 'cour-de-l-empereur' : 'table-des-heures');
  };
  const rendre = async (j, s) => {
    const vue = structuredClone(initial);
    vue.joueur.pv = j; vue.sorcier.pv = s;
    await act(async () => { root.render(<RpgDuelPage pvp={{ vue, decks, seq: ++seq, statut: 'en_cours' }} />); });
  };
  const visibilite = async (hidden) => {
    Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
    await act(async () => { document.dispatchEvent(new window.Event('visibilitychange')); });
  };
  try {
    await rendre(25, 25);
    verifierCamp('joueur');
    assert.equal(audibles().length, 1);
    const japon = audibles()[0];
    japon.currentTime = 33;
    await rendre(19, 25); // 41/59 : seuil non franchi
    verifierCamp('joueur');
    await rendre(18, 25); // 39,5/60,5 : musique adverse
    verifierCamp('sorcier');
    await attendreFondu();
    assert.equal(japon.paused, true);
    assert.equal(audibles().length, 1);
    assert.match(audibles()[0].src, /Acoustic Guitar/);
    await rendre(25, 25);
    verifierCamp('sorcier'); // pas de retour intempestif à l'égalité
    await rendre(25, 19);
    verifierCamp('sorcier');
    await rendre(25, 18);
    verifierCamp('joueur');
    await attendreFondu();
    assert.deepEqual(audibles(), [japon]);
    assert.equal(japon.currentTime, 33, 'le retour reprend la piste et sa position');
    assert.equal(musicaux().length, 2, 'une piste par camp, aucune création à chaque PV');

    // Aucun son relancé par une mise à jour réseau dans un onglet masqué.
    await visibilite(true);
    await rendre(18, 25);
    assert.ok(musicaux().every((p) => p.paused));
    await visibilite(false);
    await attendreFondu();
    assert.equal(audibles().length, 1);
    assert.match(audibles()[0].src, /Acoustic Guitar/);
    await act(async () => { hote.querySelector('.rpg-duel-nav__sound').click(); });
    assert.equal(audibles().length, 0);
    await rendre(25, 18); // changement de camp pendant le mute
    assert.equal(audibles().length, 0);
    await act(async () => { hote.querySelector('.rpg-duel-nav__sound').click(); });
    await attendreFondu();
    assert.deepEqual(audibles(), [japon]);

    await act(async () => { root.unmount(); });
    assert.ok(pistes.every((p) => p.paused), 'démontage : aucune piste fantôme');
    root = createRoot(hote);
    await rendre(25, 25);
    verifierCamp('joueur');
  } finally {
    await act(async () => { root.unmount(); });
    hote.remove();
    window.Audio = originalAudio;
    delete document.hidden;
  }
}
