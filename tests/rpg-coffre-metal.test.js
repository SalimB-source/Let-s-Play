import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

import { GAINS } from '../src/games/rpgCredits.js';
import { QUETES } from '../src/games/rpgQuetes.js';
import {
  METAUX_COFFRE, METAL_SEMAINE, ORDRE_METAUX, SEUIL_ARGENT, SEUIL_OR,
  libelleCoffre, metalPourGain, paletteCoffre, variablesCoffre,
} from '../src/games/rpgCoffreMetal.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function installerDom() {
  const dom = new JSDOM('<!doctype html><html lang="fr"><body></body></html>', {
    url: 'http://localhost:5173/jeu/sablier-de-bab-el',
    pretendToBeVisual: true,
  });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.Element = dom.window.Element;
  globalThis.Node = dom.window.Node;
  globalThis.Event = dom.window.Event;
  globalThis.MouseEvent = dom.window.MouseEvent;
  globalThis.PointerEvent = dom.window.MouseEvent;
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  return dom;
}

/* ── Le palier : le métal suit le gain, jamais le hasard ─────────────────── */

test('le métal monte avec le gain : bronze, puis argent, puis or', () => {
  assert.equal(metalPourGain(55), 'bronze');
  assert.equal(metalPourGain(60), 'bronze');
  assert.equal(metalPourGain(SEUIL_ARGENT - 1), 'bronze', 'la veille du seuil, on est encore bronze');
  assert.equal(metalPourGain(SEUIL_ARGENT), 'argent', 'le seuil est inclus');
  assert.equal(metalPourGain(70), 'argent');
  assert.equal(metalPourGain(SEUIL_OR - 1), 'argent');
  assert.equal(metalPourGain(SEUIL_OR), 'or');
  assert.equal(metalPourGain(100), 'or');
});

test('un gain inconnu retombe sur le bronze, jamais sur l’or', () => {
  for (const flou of [null, undefined, NaN, 'abc', {}, Infinity]) {
    assert.equal(metalPourGain(flou), 'bronze', `gain ${String(flou)} : pas de promesse d’or`);
  }
  assert.equal(paletteCoffre('platine').id, 'bronze', 'un métal inconnu retombe sur une palette existante');
});

test('les seuils tombent entre les récompenses réelles, pas au milieu d’une valeur', () => {
  const gains = [...new Set(QUETES.map((q) => q.recompense))].sort((a, b) => a - b);
  for (const seuil of [SEUIL_ARGENT, SEUIL_OR]) {
    assert.ok(!gains.includes(seuil - 0.5), 'les gains sont entiers');
    assert.ok(gains.some((g) => g < seuil), `des quêtes paient moins que ${seuil}`);
    assert.ok(gains.some((g) => g >= seuil), `des quêtes paient au moins ${seuil}`);
  }
  // Les trois métaux sont réellement représentés dans le pool du jour.
  const employes = new Set(QUETES.map((q) => metalPourGain(q.recompense)));
  assert.deepEqual([...employes].sort(), ['argent', 'bronze', 'or']);
});

test('plus une quête paie, plus son métal est noble — jamais l’inverse', () => {
  const rang = (m) => ORDRE_METAUX.indexOf(m);
  const tries = [...QUETES].sort((a, b) => a.recompense - b.recompense);
  for (let i = 1; i < tries.length; i += 1) {
    assert.ok(
      rang(metalPourGain(tries[i].recompense)) >= rang(metalPourGain(tries[i - 1].recompense)),
      `${tries[i].id} paie plus que ${tries[i - 1].id} mais son métal est moindre`,
    );
  }
});

test('le Cachet est en or ; la Semaine prend le violet, qui n’est pas un cran de l’échelle', () => {
  assert.equal(metalPourGain(GAINS.cachetDuCycle), 'or');
  // Le violet ne se déduit pas du montant : sinon toute quête à 80 ◈ le
  // déclencherait et la semaine cesserait d'être reconnaissable.
  assert.equal(metalPourGain(GAINS.cachetDeLaSemaine), 'or');
  assert.equal(METAL_SEMAINE, 'violet');
  assert.ok(!ORDRE_METAUX.includes(METAL_SEMAINE), 'le violet reste hors de l’échelle des gains');
  assert.ok(QUETES.every((q) => metalPourGain(q.recompense) !== 'violet'), 'aucune quête ne tire le violet');
  assert.equal(libelleCoffre(GAINS.cachetDeLaSemaine, METAL_SEMAINE), 'coffre violet');
  assert.ok(METAUX_COFFRE.violet.face.every((c) => /^#[0-9a-f]{6}$/i.test(c)));
  assert.equal(libelleCoffre(60), 'coffre de bronze');
  assert.equal(libelleCoffre(70), "coffre d'argent");
  assert.equal(libelleCoffre(100), "coffre d'or");
});

test('les trois palettes sont complètes et distinctes', () => {
  assert.deepEqual(ORDRE_METAUX, ['bronze', 'argent', 'or']);
  const empreintes = new Set();
  for (const id of ORDRE_METAUX) {
    const p = METAUX_COFFRE[id];
    assert.equal(p.id, id);
    for (const cle of ['face', 'cote', 'dessus', 'bande', 'lueur', 'gemme']) {
      assert.ok(Array.isArray(p[cle]) && p[cle].length >= 2, `${id}.${cle} est un dégradé`);
      for (const couleur of p[cle]) assert.match(couleur, /^#[0-9a-f]{6}$/i, `${id}.${cle} : couleur hexa`);
    }
    assert.match(p.reflet, /^#[0-9a-f]{6}$/i);
    empreintes.add(p.face.join('|'));
  }
  assert.equal(empreintes.size, 3, 'les trois métaux ne partagent pas la même matière');
});

/* ── Le cube : le composant rend un vrai volume, pas une image ───────────── */

/** Monter les trois métaux côte à côte, dans les trois états. */
async function avecCoffres(fn) {
  const dom = installerDom();
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom', logLevel: 'silent',
  });
  const container = document.createElement('div');
  try {
    const { default: RpgCoffreDore } = await vite.ssrLoadModule('/src/games/RpgCoffreDore.jsx');
    document.body.appendChild(container);
    const root = createRoot(container);
    const rendu = async (props) => {
      await act(async () => { root.render(React.createElement(RpgCoffreDore, props)); });
      await act(async () => { await wait(10); });
      return container.querySelector('[data-coffre-dore]');
    };
    await fn({ rendu, container });
    await act(async () => { root.unmount(); });
  } finally {
    container.remove();
    await vite.close();
    dom.window.close();
  }
}

/** jsdom ne met rien en page : sans boîte, l'inclinaison n'a rien à calculer. */
function donnerBoite(el, w = 86, h = 92) {
  el.getBoundingClientRect = () => ({
    x: 0, y: 0, left: 0, top: 0, width: w, height: h, right: w, bottom: h, toJSON() { return this; },
  });
}

const bouger = async (el, x, y) => {
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y }));
  });
};

test('le coffre est un cube : deux boîtes de faces, une charnière arrière', async () => {
  await avecCoffres(async ({ rendu }) => {
    const coffre = await rendu({ etat: 'pret', montant: 100 });

    assert.equal(coffre.dataset.coffreMetal, 'or');
    assert.equal(coffre.dataset.coffreDore, 'pret');

    // Deux volumes distincts, chacun avec ses faces posées dans l'espace.
    const caisse = coffre.querySelector('.rpg-coffre-dore__caisse');
    const couvercle = coffre.querySelector('.rpg-coffre-dore__couvercle');
    assert.ok(caisse && couvercle, 'la caisse et le couvercle sont deux boîtes');
    assert.equal(caisse.querySelectorAll('.rpg-coffre-dore__face').length, 5, 'la caisse a cinq faces, le dessus étant la gueule');
    assert.equal(couvercle.querySelectorAll('.rpg-coffre-dore__face').length, 6, 'le couvercle est fermé dessous');
    for (const cote of ['avant', 'arriere', 'droite', 'gauche', 'dessus', 'dessous']) {
      assert.ok(couvercle.querySelector(`.rpg-coffre-dore__face--${cote}`), `face ${cote} du couvercle`);
    }
    assert.ok(coffre.querySelector('.rpg-coffre-dore__gueule'), 'l’intérieur du coffre est dessiné');
    assert.equal(coffre.querySelectorAll('.rpg-coffre-dore__piece').length, 3, 'du butin attend dedans');

    // La matière est injectée en variables : une seule source, le module pur.
    for (const [nom, valeur] of Object.entries(variablesCoffre('or'))) {
      assert.equal(coffre.style.getPropertyValue(nom), valeur, `${nom} vient de la palette`);
    }

    // Les ferrures, la serrure et la pierre sont de vrais éléments.
    assert.ok(coffre.querySelector('.rpg-coffre-dore__serrure .rpg-coffre-dore__trou'), 'la serrure a son trou');
    assert.ok(coffre.querySelector('.rpg-coffre-dore__moraillon'), 'le moraillon pend du couvercle');
    assert.ok(coffre.querySelector('.rpg-coffre-dore__face--dessus .rpg-coffre-dore__gemme'), 'la gemme est sertie sur le dessus');
    assert.ok(coffre.querySelector('.rpg-coffre-dore__ombre'), 'le coffre est assis sur son ombre');
  });
});

test('les trois métaux peignent trois matières différentes', async () => {
  await avecCoffres(async ({ rendu }) => {
    const vus = [];
    for (const [gain, metal] of [[60, 'bronze'], [70, 'argent'], [100, 'or']]) {
      const coffre = await rendu({ etat: 'encours', montant: gain });
      assert.equal(coffre.dataset.coffreMetal, metal);
      vus.push(coffre.style.getPropertyValue('--coffre-face-1'));
    }
    assert.equal(new Set(vus).size, 3, 'aucun métal ne partage la matière d’un autre');
    assert.deepEqual(vus, [METAUX_COFFRE.bronze.face[1], METAUX_COFFRE.argent.face[1], METAUX_COFFRE.or.face[1]]);
  });
});

test('le curseur incline le cube, et le départ le remet au repos', async () => {
  await avecCoffres(async ({ rendu }) => {
    const coffre = await rendu({ etat: 'pret', montant: 100, onClick: () => {} });
    donnerBoite(coffre);
    assert.equal(coffre.style.getPropertyValue('--penche-x'), '0.00deg');

    // Curseur en haut à droite : l'objet se tourne vers lui.
    await bouger(coffre, 86, 0);
    assert.equal(coffre.style.getPropertyValue('--penche-y'), '13.00deg');
    assert.equal(coffre.style.getPropertyValue('--penche-x'), '-7.00deg');

    // En bas à gauche, l'inclinaison s'inverse.
    await bouger(coffre, 0, 92);
    assert.equal(coffre.style.getPropertyValue('--penche-y'), '-13.00deg');
    assert.equal(coffre.style.getPropertyValue('--penche-x'), '7.00deg');

    // React synthétise le « leave » depuis pointerout + relatedTarget.
    await act(async () => {
      coffre.dispatchEvent(new window.MouseEvent('pointerout', { bubbles: true, relatedTarget: document.body }));
    });
    assert.equal(coffre.style.getPropertyValue('--penche-x'), '0.00deg');
    assert.equal(coffre.style.getPropertyValue('--penche-y'), '0.00deg');
  });
});

test('cliquer un coffre prêt réclame aussitôt et fait jaillir la gerbe', async () => {
  await avecCoffres(async ({ rendu }) => {
    const clics = [];
    const coffre = await rendu({ etat: 'pret', montant: 100, onClick: () => clics.push('or') });
    assert.equal(coffre.tagName, 'BUTTON', 'un coffre prêt est un vrai bouton');

    await act(async () => { coffre.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    assert.deepEqual(clics, ['or'], 'la récompense part tout de suite, l’animation ne la retarde pas');
    assert.ok(coffre.classList.contains('is-gerbe'), 'les pièces jaillissent');
    assert.equal(coffre.querySelectorAll('.rpg-coffre-dore__eclat').length, 6);
  });
});

test('un coffre verrouillé tressaut mais ne verse rien', async () => {
  await avecCoffres(async ({ rendu }) => {
    const coffre = await rendu({ etat: 'encours', montant: 60 });
    assert.equal(coffre.tagName, 'DIV', 'pas de bouton mort : le coffre verrouillé n’en est pas un');
    await act(async () => { coffre.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true })); });
    assert.ok(coffre.classList.contains('is-secousse'), 'il répond « pas encore »');
    assert.ok(!coffre.classList.contains('is-gerbe'), 'aucune pièce ne sort d’un coffre fermé');
  });
});

test('le mouvement réduit coupe l’inclinaison et la gerbe, pas le coffre', async () => {
  await avecCoffres(async ({ rendu, container }) => {
    const vraiMatchMedia = window.matchMedia;
    window.matchMedia = (q) => ({ matches: q.includes('reduce'), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    try {
      const clics = [];
      const coffre = await rendu({ etat: 'pret', montant: 100, onClick: () => clics.push('or') });
      donnerBoite(coffre);
      await bouger(coffre, 86, 0);
      assert.equal(coffre.style.getPropertyValue('--penche-y'), '0.00deg', 'le cube ne suit pas le curseur');
      await act(async () => { coffre.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
      assert.deepEqual(clics, ['or'], 'réclamer marche toujours');
      assert.ok(!coffre.classList.contains('is-gerbe'), 'pas de gerbe animée');
      assert.ok(container.querySelector('.rpg-coffre-dore__caisse'), 'le volume est intact');
    } finally {
      window.matchMedia = vraiMatchMedia;
    }
  });
});

test('le métal forcé l’emporte sur le gain, et le CSS garde la chaîne 3D intacte', async () => {
  await avecCoffres(async ({ rendu }) => {
    const coffre = await rendu({ etat: 'pret', montant: 60, metal: 'or' });
    assert.equal(coffre.dataset.coffreMetal, 'or', 'le métal imposé gagne');
    assert.equal(coffre.style.getPropertyValue('--coffre-face-1'), METAUX_COFFRE.or.face[1]);
  });

  const css = await import('node:fs').then((fs) => fs.readFileSync('src/games/rpg-coffre-dore.css', 'utf8'));
  for (const metal of ORDRE_METAUX) {
    assert.match(css, new RegExp(`\\[data-coffre-metal='${metal}'\\]`), `le CSS connaît le métal ${metal}`);
  }
  // La lueur épouse la silhouette : elle est portée par les faces, pas par un
  // disque derrière le coffre. Chaque métal fournit sa propre couleur.
  assert.match(css, /\.is-encours \.rpg-coffre-dore__face\s*\{[^}]*drop-shadow\(0 0 \d+px var\(--coffre-lueur\)\)/s,
    'la lueur prend la couleur du métal et suit la forme des faces');
  for (const metal of [...ORDRE_METAUX, METAL_SEMAINE]) {
    assert.match(css, new RegExp(`\\[data-coffre-metal='${metal}'\\]\\s*\\{[^}]*--coffre-lueur:`, 's'),
      `le métal ${metal} définit sa lueur`);
  }
  assert.doesNotMatch(css, /rpg-coffre-dore__halo/, 'le halo rond a disparu');
  assert.match(css, /\.rpg-coffre-dore__montant\s*\{[^}]*color:\s*var\(--coffre-plaque-texte\)/s, 'la plaquette aussi');

  // Une règle peut viser plusieurs sélecteurs : on les ramasse toutes.
  const blocs = (sel) => [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)]
    .filter((m) => m[1].includes(`.rpg-coffre-dore${sel}`))
    .map((m) => m[2]);

  // La chaîne 3D doit rester intacte de la scène jusqu'aux boîtes.
  for (const sel of ['__scene', '__dessin', '__cube', '__caisse', '__couvercle']) {
    assert.ok(blocs(sel).some((b) => /transform-style:\s*preserve-3d/.test(b)), `${sel} garde le volume`);
    // Un filtre sur un maillon 3D l'aplatirait : il n'y en a que sur les faces.
    assert.ok(blocs(sel).every((b) => !/\bfilter:/.test(b)), `${sel} ne porte aucun filtre qui aplatirait le cube`);
  }
  // La charnière est à l'arrière, pas au centre du couvercle.
  assert.ok(
    blocs('__couvercle').some((b) => /transform-origin:\s*50%\s*100%\s*calc\(var\(--d\)\s*\/\s*-2\)/.test(b)),
    'le couvercle bascule sur son arête arrière',
  );
});

test('la Semaine reste accessible sans ajouter de coffre, et le bouton Souk n’y est plus', async () => {
  const fs = await import('node:fs');
  const rampe = fs.readFileSync('src/games/RpgQuetesDuJour.jsx', 'utf8');
  const css = fs.readFileSync('src/games/rpg-quetes-jour.css', 'utf8');

  // La récompense de la semaine est un jalon, pas un quatrième coffre.
  assert.match(rampe, /className="rpg-quests-jour__semaine"/);
  assert.match(rampe, /data-jouer-semaine-reclamer/);
  assert.match(css, /\.rpg-quests-jour__jalon-bouton/);

  // Le raccourci Souk a quitté la rampe : l'onglet latéral porte déjà le solde.
  assert.ok(!rampe.includes('data-jouer-souk'), 'plus de bouton Souk dans la rampe');
  assert.ok(!rampe.includes('rpg-quests-jour__souk'), 'ni son habillage');
  assert.ok(!rampe.includes('data-jouer-solde'), 'ni le solde miniature');
  assert.ok(!css.includes('rpg-quests-jour__souk'), 'le CSS mort est parti aussi');
  assert.ok(!css.includes('rpg-quests-jour__etape-souk'), 'la colonne ne s’appelle plus « étape souk »');
  assert.match(css, /\.rpg-quests-jour__semaine\b/, 'elle s’appelle la semaine');

  // Le Souk reste accessible : on n'a pas supprimé l'entrée, seulement le doublon.
  const page = fs.readFileSync('src/games/RpgDuelPage.jsx', 'utf8');
  assert.match(page, /data-souk-onglet=\{credits\}/, 'l’onglet Souk de la barre latérale porte toujours le solde');
});

test('le coffre violet rend sa matière et son habillage complet', async () => {
  await avecCoffres(async ({ rendu }) => {
    const coffre = await rendu({ etat: 'pret', montant: 80, metal: METAL_SEMAINE, sousTitre: 'Semaine' });
    assert.equal(coffre.dataset.coffreMetal, 'violet');
    for (const [nom, valeur] of Object.entries(variablesCoffre('violet'))) {
      assert.equal(coffre.style.getPropertyValue(nom), valeur, `${nom} vient de la palette violette`);
    }
    assert.equal(coffre.querySelector('.rpg-coffre-dore__sous')?.textContent, 'Semaine');
    // La matière violette ne ressemble à aucune des trois autres.
    const autres = ORDRE_METAUX.map((m) => METAUX_COFFRE[m].face[1]);
    assert.ok(!autres.includes(METAUX_COFFRE.violet.face[1]));
  });

  const css = await import('node:fs').then((fs) => fs.readFileSync('src/games/rpg-coffre-dore.css', 'utf8'));
  assert.match(css, /\[data-coffre-metal='violet'\]/, 'le CSS accorde le halo et la plaquette au violet');
});

test('le coffre est arrondi : cadre sombre, panneau incrusté, clous et blason', async () => {
  await avecCoffres(async ({ rendu }) => {
    const coffre = await rendu({ etat: 'encours', montant: 100 });
    // Les clous ne vivent que sur les deux grandes faces : sur la face avant
    // du couvercle, haute de 15 px, ils se marcheraient dessus.
    assert.equal(coffre.querySelectorAll('.rpg-coffre-dore__clous').length, 2);
    assert.ok(coffre.querySelector('.rpg-coffre-dore__face--avant .rpg-coffre-dore__serrure'), 'le blason est sur la face avant');
    assert.ok(coffre.querySelector('.rpg-coffre-dore__face--dessus .rpg-coffre-dore__gemme'), 'la gemme est sur le dessus');
  });

  const css = await import('node:fs').then((fs) => fs.readFileSync('src/games/rpg-coffre-dore.css', 'utf8'));
  const bloc = (sel) => {
    const m = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)].filter((x) => x[1].includes(sel));
    return m.map((x) => x[2]).join('\n');
  };
  assert.match(bloc('.rpg-coffre-dore__face'), /border-radius:\s*var\(--c-arrondi\)/, 'les faces sont arrondies');
  // La bave recouvre les angles : sans elle, le cube aurait des jours aux coins.
  assert.match(bloc('.rpg-coffre-dore__face'), /calc\(-1 \* var\(--c-bave\)\)/, 'les faces débordent leur boîte');
  const inset = Number((bloc('.rpg-coffre-dore__face::before').match(/inset:\s*(\d+)px/) || [])[1]);
  assert.ok(inset >= 3, `le panneau clair est incrusté dans le cadre (${inset}px)`);
  assert.match(bloc('.rpg-coffre-dore__clous'), /radial-gradient/, 'les clous sont peints');
  // Le couvercle déborde la caisse : c'est ce qui fait lire « coffre ».
  assert.match(bloc('.rpg-coffre-dore__couvercle'), /--w:\s*calc\(var\(--c-largeur\) \+ var\(--c-debord\)\)/, 'le couvercle déborde');

  // Agrandis à la demande : un plancher pour qu'ils ne rétrécissent pas en
  // silence au prochain remaniement.
  const racine = bloc('.rpg-coffre-dore');
  for (const [nom, mini] of [['--c-largeur', 60], ['--c-profondeur', 52], ['--c-caisse', 38], ['--c-couvercle', 18]]) {
    const px = Number((racine.match(new RegExp(`${nom}:\\s*(\\d+)px`)) || [])[1]);
    assert.ok(px >= mini, `${nom} vaut ${px}px, au moins ${mini}px`);
  }
});

test('le gain passe à droite du coffre, en gros, et la quête descend dessous', async () => {
  await avecCoffres(async ({ rendu }) => {
    // Par défaut le gain reste sous le dessin : les jalons compacts (Cachet,
    // Semaine) n'ont pas la place de le porter à côté.
    const dessous = await rendu({ etat: 'pret', montant: 80, sousTitre: 'Cachet' });
    assert.equal(dessous.dataset.coffreGain, 'dessous');
    assert.ok(!dessous.classList.contains('is-gain-droite'));
    assert.equal(dessous.querySelector('.rpg-coffre-dore__montant strong')?.textContent, '80');

    const droite = await rendu({ etat: 'pret', montant: 55, gain: 'droite' });
    assert.equal(droite.dataset.coffreGain, 'droite');
    assert.ok(droite.classList.contains('is-gain-droite'));
    // À droite, le gain se lit comme une promesse : « +55 ».
    assert.equal(droite.querySelector('.rpg-coffre-dore__montant strong')?.textContent, '+55');
    assert.equal(droite.dataset.coffreDoreMontant, '55', 'la donnée reste numérique');

    // Une fois en bourse, le « + » tombe : ce n'est plus à gagner.
    const pris = await rendu({ etat: 'ouvert', montant: 55, gain: 'droite' });
    assert.equal(pris.querySelector('.rpg-coffre-dore__montant strong')?.textContent, '55');
    assert.ok(pris.querySelector('.rpg-coffre-dore__coche'), 'la coche remplace la pièce');
  });

  const fs = await import('node:fs');
  const coffreCss = fs.readFileSync('src/games/rpg-coffre-dore.css', 'utf8');
  const rampeCss = fs.readFileSync('src/games/rpg-quetes-jour.css', 'utf8');
  const rampe = fs.readFileSync('src/games/RpgQuetesDuJour.jsx', 'utf8');
  const bloc = (css, sel) => [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)]
    .filter((m) => m[1].includes(sel)).map((m) => m[2]).join('\n');

  // Le gain à droite est plus gros que l'étiquette d'origine (13 px).
  const taille = Number((bloc(coffreCss, '.rpg-coffre-dore.is-gain-droite .rpg-coffre-dore__montant')
    .match(/font-size:\s*(\d+)px/) || [])[1]);
  assert.ok(taille >= 18, `le gain est mis en valeur (${taille}px)`);
  assert.match(bloc(coffreCss, '.rpg-coffre-dore.is-gain-droite'), /flex-direction:\s*row/, 'le coffre et le gain sont côte à côte');
  // La lueur reste sur le coffre, pas au milieu de la ligne : en la portant
  // sur les faces, elle est centrée dessus par construction — il n'y a plus
  // de disque à repositionner quand le gain passe à droite.
  assert.doesNotMatch(coffreCss, /is-gain-droite[^{]*__halo/, 'plus de disque à recentrer');
  assert.match(bloc(coffreCss, '.rpg-coffre-dore.is-encours .rpg-coffre-dore__face'), /drop-shadow/,
    'la lueur est sur le coffre lui-même');

  // La capsule n'est plus glissée derrière le coffre : elle est descendue.
  assert.ok(!/margin-left:\s*-/.test(bloc(rampeCss, '.rpg-quests-jour__capsule')), 'la capsule ne chevauche plus le coffre');
  assert.match(rampe, /gain="droite"/, 'la quête demande le gain à droite');
  const corps = rampe.slice(rampe.indexOf('className="rpg-quests-jour__corps"'));
  const capsule = corps.indexOf('className="rpg-quests-jour__capsule"');
  const fermetureCorps = corps.indexOf('</div>');
  assert.ok(capsule > fermetureCorps, 'la capsule est sortie du corps : elle est sous le coffre');
});

test('le coffre encaissé est vidé et entièrement grisé, gain compris', async () => {
  const fs = await import('node:fs');
  const css = fs.readFileSync('src/games/rpg-coffre-dore.css', 'utf8');
  const blocs = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)]
    .map((m) => ({ selecteur: m[1].trim(), regles: m[2] }));
  // Une règle peut être groupée : on concatène tous les blocs qui visent le
  // sélecteur cherché, puis on raisonne sur l'ensemble.
  const regle = (needle) => blocs
    .filter((b) => b.selecteur.includes(needle))
    .map((b) => b.regles)
    .join(' ');

  const ouvert = (needle) => regle(`.is-ouvert .rpg-coffre-dore__${needle}`);

  // Le métal passe en niveaux de gris. Le filtre est sur la face, donc il
  // emporte toute sa garniture : ferrures, blason, gemme et clous.
  assert.match(ouvert('face'), /grayscale\(1\)/, 'les faces du coffre ouvert doivent être grises');
  assert.match(ouvert('face--gauche'), /grayscale\(1\)/, 'la face gauche aussi');

  // Rien ne brille plus, et il ne reste aucune pièce au fond : on voit le creux.
  assert.match(ouvert('lueur'), /opacity:\s*0\s*;/, 'plus de lueur dans un coffre vidé');
  assert.match(ouvert('piece'), /opacity:\s*0\s*;/, 'plus de pièces au fond');
  assert.match(ouvert('gueule'), /opacity:\s*1\s*;/, 'l’intérieur vide doit être visible');
  assert.match(ouvert('gueule'), /inset 0 \d+px \d+px/, 'le creux doit avoir de la profondeur');

  // Le gain est grisé lui aussi, plaque et coche.
  assert.match(ouvert('montant'), /grayscale\(1\)/, 'la plaquette de gain doit être grise');
  assert.match(ouvert('coche'), /color:\s*#8e8a82/, 'la coche suit le gris');

  // Un coffre vidé ne luit plus : ses faces n'ont que le gris, aucun
  // `drop-shadow`. C'est ce qui sépare « il reste un butin » de « c'est fini ».
  assert.doesNotMatch(ouvert('face'), /drop-shadow/, 'le coffre ouvert ne luit plus');
  assert.match(regle('.is-pret .rpg-coffre-dore__face'), /drop-shadow/, 'le coffre prêt luit');
  assert.match(regle('.is-encours .rpg-coffre-dore__face'), /drop-shadow/, 'le coffre fermé luit aussi, il promet encore');

  // Un coffre encore fermé garde sa couleur et son butin.
  assert.doesNotMatch(regle('.is-pret .rpg-coffre-dore__face'), /grayscale/);
  assert.doesNotMatch(regle('.is-encours .rpg-coffre-dore__face'), /grayscale/);

  // Le couvercle bâille plus grand qu'un coffre simplement prêt, mais le
  // coffre garde sa taille : un coffre encaissé n'est pas un coffre réduit.
  const angle = (etat) => Number(
    regle(`.is-${etat} .rpg-coffre-dore__couvercle`).match(/rotateX\((\d+)deg\)/)[1],
  );
  assert.ok(angle('ouvert') > angle('pret'), 'le coffre encaissé doit être ouvert plus grand');
  // Le sélecteur est précédé d'un commentaire : on identifie le bloc racine
  // par la variable qu'il est seul à déclarer.
  const racine = blocs.find((b) => b.selecteur.includes('.is-ouvert') && /--ecaille:/.test(b.regles)).regles;
  const ecaille = Number(racine.match(/--ecaille:\s*([\d.]+)/)[1]);
  assert.equal(ecaille, 1, 'le coffre ouvert garde exactement la taille des autres');
  // L'échelle est bien branchée sur le cube, sinon la déclaration ne sert à rien.
  assert.match(regle('.rpg-coffre-dore__cube'), /scale\(var\(--ecaille\)\)/);
});

test('la plaquette grisée l’emporte sur la variante « gain à droite »', async () => {
  // Même spécificité des deux côtés : c'est l'ordre qui tranche. Si la règle
  // du gain à droite repassait devant, le badge encaissé regagnerait son
  // ombre portée et son fond métal.
  const fs = await import('node:fs');
  const css = fs.readFileSync('src/games/rpg-coffre-dore.css', 'utf8');
  const droite = css.indexOf('.rpg-coffre-dore.is-gain-droite .rpg-coffre-dore__montant {');
  const ouvert = css.indexOf('.rpg-coffre-dore.is-ouvert .rpg-coffre-dore__montant {');
  assert.ok(droite > 0 && ouvert > droite, 'l’état ouvert doit être écrit après la variante à droite');
});

test('le jalon de la semaine indique son encaissement', async () => {
  // Il restait bloqué sur « en cours » : le drapeau `semaine` n'était pas lu.
  const fs = await import('node:fs');
  const src = fs.readFileSync('src/games/RpgQuetesDuJour.jsx', 'utf8');
  assert.match(src, /const semainePrise = Boolean\(quetes\?\.semaine\)/);
  assert.match(src, /semainePrise \? 'encaissée' : semainePrete \? 'Réclamer'/);
  // Et le drapeau lu est bien celui que pose l'encaissement.
  const quetes = fs.readFileSync('src/games/rpgQuetes.js', 'utf8');
  assert.match(quetes, /semaine:\s*true/);
});
