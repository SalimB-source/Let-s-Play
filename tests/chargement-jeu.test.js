import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLE_MEMOIRE_RECHARGE,
  DELAI_ENTRE_RECHARGEMENTS_MS,
  TENTATIVES_CHARGEMENT,
  estErreurDeMorceau,
  importerAvecReprise,
  messageChargementJeu,
  tenterRechargementSecours,
  urlRechargementSecours,
} from '../src/games/chargementJeu.js';

/**
 * La reprise du téléchargement d'un morceau du jeu — le filet qui empêche
 * l'écran noir quand `RpgDuelPage` n'arrive pas du premier coup.
 */

test('un morceau qui arrive au premier essai n’est pas redemandé', async () => {
  let appels = 0;
  const module = await importerAvecReprise(async () => {
    appels += 1;
    return { duel: true };
  }, { pause: async () => {} });
  assert.deepEqual(module, { duel: true });
  assert.equal(appels, 1);
});

test('une coupure passagère est rattrapée sans que le joueur s’en aperçoive', async () => {
  let appels = 0;
  const attentes = [];
  const essais = [];
  const module = await importerAvecReprise(async () => {
    appels += 1;
    if (appels === 1) throw new Error('Failed to fetch dynamically imported module');
    return 'duel';
  }, {
    pause: async (ms) => { attentes.push(ms); },
    surNouvelEssai: (essai, erreur) => essais.push([essai, erreur.message]),
  });
  assert.equal(module, 'duel');
  assert.equal(appels, 2);
  assert.deepEqual(attentes, [400], 'le premier répit reste court');
  assert.equal(essais.length, 1, 'chaque reprise est signalée une fois');
});

test('les répits doublent, et la dernière erreur remonte', async () => {
  const attentes = [];
  let appels = 0;
  await assert.rejects(
    importerAvecReprise(async () => {
      appels += 1;
      throw new Error(`échec ${appels}`);
    }, { pause: async (ms) => { attentes.push(ms); } }),
    /échec 3/,
    'c’est la dernière tentative qui décrit l’état réel du serveur',
  );
  assert.equal(appels, TENTATIVES_CHARGEMENT);
  assert.deepEqual(attentes, [400, 800], '400 ms puis 800 ms, jamais plus de trois essais');
});

test('un morceau définitivement absent rejette après trois essais', async () => {
  let appels = 0;
  await assert.rejects(importerAvecReprise(async () => {
    appels += 1;
    throw new Error('404');
  }, { pause: async () => {} }));
  assert.equal(appels, 3);
});

test('le nombre d’essais est réglable, sans descendre sous un', async () => {
  let appels = 0;
  const jamais = async (ms) => { throw new Error(`attente inattendue ${ms}`); };
  await assert.rejects(importerAvecReprise(async () => {
    appels += 1;
    throw new Error('absent');
  }, { tentatives: 0, pause: jamais }), /absent/);
  assert.equal(appels, 1, 'zéro tentative reste une tentative');
});

test('le message au joueur traduit l’erreur du navigateur', () => {
  assert.match(
    messageChargementJeu(new Error('Failed to fetch dynamically imported module: https://exemple/assets/RpgDuelPage-abc.js')),
    /connexion interrompue/,
    'la panne de téléchargement se raconte en français',
  );
  assert.match(
    messageChargementJeu(new Error('error loading dynamically imported module')),
    /site mis à jour/,
    'un redéploiement est nommé : c’est la cause la plus fréquente',
  );
  assert.equal(messageChargementJeu(new Error('Boom')), 'Boom', 'les autres erreurs gardent leur message');
  assert.match(messageChargementJeu(null), /Erreur inconnue/, 'sans erreur, on ne laisse pas le champ vide');
});

test('un chargement du duel qui reste en attente propose de recharger sans effacer la progression', async () => {
  const { readFile } = await import('node:fs/promises');
  const composant = await readFile(new URL('../src/games/ChargementDuel.jsx', import.meta.url), 'utf8');
  const entree = await readFile(new URL('../src/games/RpgEntryChoice.jsx', import.meta.url), 'utf8');
  const route = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(composant, /setTimeout\(\(\) => setLent\(true\), 12000\)/);
  assert.match(composant, /clearTimeout\(timer\)/);
  assert.match(composant, /window\.location\.reload\(\)/);
  assert.doesNotMatch(composant, /localStorage|sessionStorage/);
  assert.match(entree, /fallback=\{<ChargementDuel \/>\}/);
  assert.match(route, /fallback=\{<ChargementDuel \/>\}/);
});


// ── Le rechargement de secours ──────────────────────────────────────────────
// Après un redéploiement, l'ancien nom du morceau n'existe plus : réessayer ne
// sert à rien, il faut une page neuve. Ces tests fixent ce comportement.

/** Une fausse fenêtre minimale, de quoi observer `location.replace`. */
function fausseFenetre(href = 'https://letsplay.example/jeu/sablier-de-bab-el?code=ABC#table') {
  const deplacements = [];
  return {
    location: {
      href,
      replace: (cible) => deplacements.push(cible),
    },
    deplacements,
  };
}

/** Un faux `sessionStorage` en mémoire (le vrai lève en navigation privée). */
function fausseMemoire() {
  const donnees = new Map();
  return {
    donnees,
    getItem: (cle) => (donnees.has(cle) ? donnees.get(cle) : null),
    setItem: (cle, valeur) => { donnees.set(cle, String(valeur)); },
    removeItem: (cle) => { donnees.delete(cle); },
  };
}

test('le fichier du jeu manquant est reconnu, un bug du jeu ne l’est pas', () => {
  assert.equal(estErreurDeMorceau(new Error('Failed to fetch dynamically imported module: /assets/RpgDuelPage-1a2b.js')), true);
  assert.equal(estErreurDeMorceau(new Error('error loading dynamically imported module')), true);
  assert.equal(estErreurDeMorceau(new Error('Importing a module script failed.')), true, 'WebKit dit autrement');
  assert.equal(estErreurDeMorceau(Object.assign(new Error('Loading chunk 12 failed'), { name: 'ChunkLoadError' })), true);
  assert.equal(estErreurDeMorceau(new Error('Unable to preload CSS for /assets/duel.css')), true);
  assert.equal(estErreurDeMorceau(new Error('Cannot read properties of undefined (reading \'pv\')')), false,
    'un vrai bug du moteur n’est pas une panne de téléchargement');
  assert.equal(estErreurDeMorceau(null), false);
});

test('l’URL de secours garde la partie et change un seul paramètre', () => {
  const url = new URL(urlRechargementSecours(
    'https://letsplay.example/jeu/sablier-de-bab-el?code=ABC#table', 1234,
  ));
  assert.equal(url.searchParams.get('code'), 'ABC', 'le code de défi survit');
  assert.equal(url.searchParams.get('recharge'), '1234');
  assert.equal(url.hash, '#table', 'le fragment reste');
  assert.notEqual(
    urlRechargementSecours('https://x.test/jeu', 1000),
    urlRechargementSecours('https://x.test/jeu', 1001),
    'deux rechargements ne partagent jamais la même URL : sinon le cache répond',
  );
});

test('un morceau absent recharge la page une fois, tout seul', () => {
  const fenetre = fausseFenetre();
  const memoire = fausseMemoire();
  const parti = tenterRechargementSecours({
    erreur: new Error('Failed to fetch dynamically imported module'),
    fenetre, stockage: memoire, maintenant: () => 5_000, marqueur: 5_000,
  });
  assert.equal(parti, true);
  assert.equal(fenetre.deplacements.length, 1);
  assert.match(fenetre.deplacements[0], /recharge=5000/);
  assert.match(fenetre.deplacements[0], /code=ABC/, 'la page en cours est conservée');
  assert.deepEqual(JSON.parse(memoire.donnees.get(CLE_MEMOIRE_RECHARGE)), { ts: 5_000 });
});

test('si la panne revient aussitôt, on n’entre pas en boucle', () => {
  const fenetre = fausseFenetre();
  const memoire = fausseMemoire();
  const erreur = new Error('error loading dynamically imported module');
  assert.equal(tenterRechargementSecours({ erreur, fenetre, stockage: memoire, maintenant: () => 10_000 }), true);
  assert.equal(tenterRechargementSecours({ erreur, fenetre, stockage: memoire, maintenant: () => 12_000 }), false,
    'deux secondes plus tard, on laisse la carte d’erreur parler');
  assert.equal(fenetre.deplacements.length, 1);
  assert.equal(
    tenterRechargementSecours({ erreur, fenetre, stockage: memoire, maintenant: () => 10_000 + DELAI_ENTRE_RECHARGEMENTS_MS + 1 }),
    true,
    'plus tard, une nouvelle mise à jour peut de nouveau se rattraper',
  );
});

test('un bug du jeu, une mémoire cassée ou pas de fenêtre ne rechargent rien', () => {
  const fenetre = fausseFenetre();
  assert.equal(tenterRechargementSecours({
    erreur: new TypeError('x is not a function'), fenetre, stockage: fausseMemoire(), maintenant: () => 1,
  }), false, 'un bug du moteur ne se « répare » pas en rechargeant');

  const casse = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('SecurityError'); } };
  assert.equal(tenterRechargementSecours({
    erreur: new Error('Failed to fetch dynamically imported module'), fenetre, stockage: casse, maintenant: () => 2,
  }), true, 'une mémoire inaccessible ne bloque pas le secours');

  assert.equal(tenterRechargementSecours({
    erreur: new Error('Failed to fetch dynamically imported module'), fenetre: null, stockage: fausseMemoire(),
  }), false, 'sans DOM (rendu de test), rien à recharger');
});

test('la frontière du Sablier branche le secours et raconte la mise à jour', async () => {
  const { readFile } = await import('node:fs/promises');
  const composant = await readFile(new URL('../src/games/GameLoadBoundary.jsx', import.meta.url), 'utf8');
  assert.match(composant, /tenterRechargementSecours\(\{ erreur,/,
    'la frontière tente le rechargement automatique');
  assert.match(composant, /setState\(\{ rechargementAuto: true \}\)/);
  assert.match(composant, /se met à jour…/, 'le joueur voit une mise à jour, pas une panne');
  assert.match(composant, /rechargé la page\s*\n?\s*une fois tout seul|rechargé la page une fois tout seul|rechargé\s+la page\s+une fois tout seul/s,
    'la carte d’erreur dit que le secours a déjà été tenté');
});


// ── La frontière, rendue pour de vrai ───────────────────────────────────────
// Les fonctions pures disent QUAND recharger ; ce test vérifie que l'écran du
// Sablier s'en sert vraiment et ne laisse jamais un écran noir.

test('la frontière recharge d’elle-même sur une mise à jour, et explique une vraie panne', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><div id="racine"></div>', { url: 'https://letsplay.example/jeu/sablier-de-bab-el' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;

  const React = (await import('react')).default;
  const { createRoot } = await import('react-dom/client');
  const { createServer } = await import('vite');
  const serveur = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: GameLoadBoundary } = await serveur.ssrLoadModule('/src/games/GameLoadBoundary.jsx');
    const h = React.createElement;

    /** Un enfant qui jette l'erreur demandée au rendu. */
    const EnPanne = ({ erreur }) => { throw erreur; };
    const memoire = () => {
      const donnees = new Map();
      return { getItem: (c) => (donnees.has(c) ? donnees.get(c) : null), setItem: (c, v) => donnees.set(c, String(v)) };
    };

    const rendre = async (erreur, securite) => {
      const hote = dom.window.document.createElement('div');
      dom.window.document.body.appendChild(hote);
      const racine = createRoot(hote);
      const silence = console.error;
      console.error = () => {};
      try {
        racine.render(h(React.StrictMode, null,
          h(GameLoadBoundary, { jeu: 'Le Sablier', securite },
            h(EnPanne, { erreur }))));
        await new Promise((r) => setTimeout(r, 60));
      } finally {
        console.error = silence;
      }
      const texte = hote.textContent || '';
      racine.unmount();
      hote.remove();
      return texte;
    };

    // 1) Morceau manquant après redéploiement : rechargement automatique.
    const deplacements = [];
    const fenetreTest = { location: { href: 'https://letsplay.example/jeu/sablier-de-bab-el', replace: (c) => deplacements.push(c) } };
    const texteMiseAJour = await rendre(new Error('Failed to fetch dynamically imported module'), { fenetre: fenetreTest, stockage: memoire(), maintenant: () => 7 });
    assert.equal(deplacements.length, 1, 'la page est rechargée sans que le joueur ait à cliquer');
    assert.match(deplacements[0], /recharge=7/);
    assert.match(texteMiseAJour, /Le Sablier se met à jour/, 'le joueur lit une mise à jour, pas un plantage');

    // 2) Vraie panne (mémoire déjà marquée) : la carte d'erreur, avec le bouton.
    const deja = memoire();
    deja.setItem('letsplay:recharge-jeu', JSON.stringify({ ts: 1_000 }));
    const texteErreur = await rendre(new Error('Failed to fetch dynamically imported module'), {
      fenetre: { location: { href: 'https://letsplay.example/jeu', replace: () => { throw new Error('ne doit pas partir'); } } },
      stockage: deja, maintenant: () => 1_500,
    });
    assert.match(texteErreur, /n’a pas pu se charger/);
    assert.match(texteErreur, /Recharger la page/);

    // 3) Un bug du jeu ne déclenche aucun rechargement : il garde sa carte.
    const deplacements2 = [];
    const texteBug = await rendre(new TypeError('x is not a function'), {
      fenetre: { location: { href: 'https://letsplay.example/jeu', replace: (c) => deplacements2.push(c) } },
      stockage: memoire(), maintenant: () => 2,
    });
    assert.equal(deplacements2.length, 0);
    assert.match(texteBug, /n’a pas pu se charger/);
  } finally {
    await serveur.close();
    // On laisse `window` et `document` en place : React programme encore un
    // rappel après le démontage, et le retirer ici le ferait échouer sur un
    // « window is not defined » sans rapport avec le test.
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  }
});
