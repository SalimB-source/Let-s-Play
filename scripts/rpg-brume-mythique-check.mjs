/**
 * Brume des mythiques : catalogue, fiche et plateau de duel réels dans Chromium.
 * npm run check:rpg-brume (ou CHROMIUM_EXECUTABLE_PATH=/chemin/vers/chromium).
 */
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { RPG_DUEL_CARDS } from '../src/games/rpgCards.js';

// Un vrai composant de plateau PvP avec une vue de test : elle contient
// une mythique en main, une sur le champ et une au cimetière.
// Le fixture n'existe que dans ce serveur de test, pas dans l'application.
const plateauFixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '/src/games/RpgDuelPage.jsx';
import { rpgNouveauDuel } from '/src/games/rpgDuel.js';
import { cardById } from '/src/games/rpgCards.js';
import { offreBienvenue, choisirCoffret, sauverOffreBienvenue } from '/src/games/rpgCoffretBienvenue.js';
import '/src/styles.css';
// Un joueur déjà accueilli : aucun dialogue de bienvenue ne masque le plateau.
const offre = offreBienvenue({ rng: () => .5 });
sauverOffreBienvenue(choisirCoffret(offre, offre.coffrets[0].id));
const vue = rpgNouveauDuel({ pvp: true, rng: () => .999 });
vue.mulliganFait = { joueur: true, sorcier: true };
vue.joueur.main = ['feriel', 'chien-du-guet', 'serment-de-la-forge'];
vue.joueur.mana.braise = 10;
vue.joueur.cimetiere = ['feriel'];
const entite = (id, uid) => {
  const carte = cardById(id);
  return { ...carte, id: uid, carteId: id, pv: carte.def, pvMax: carte.def, ready: true, attaquee: false };
};
vue.joueur.creatures = [entite('kraken', 'entite-101'), entite('chien-du-guet', 'entite-102')];
vue.joueur.creatures[1].arme = { carteId: 'armure-de-cendres' };
vue.sorcier.creatures = [{ ...entite('maitre-du-marteau', 'entite-103'), furieDeclenchee: true }];
createRoot(document.getElementById('root')).render(React.createElement(RpgDuelPage, {
  pvp: { vue, seq: 1, statut: 'en_cours', code: 'TEST', onIntention: async () => ({ ok: true }) },
}));
`;
const server = await createServer({
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'error',
  plugins: [{
    name: 'test-brume-plateau',
    resolveId(id) { if (id === 'virtual:rpg-brume-plateau') return '\0rpg-brume-plateau'; },
    load(id) { if (id === '\0rpg-brume-plateau') return plateauFixture; },
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (!req.url?.split('?')[0].endsWith('/__brume-plateau')) return next();
        try {
          const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@id/virtual:rpg-brume-plateau"></script></body></html>';
          res.setHeader('Content-Type', 'text/html');
          res.end(await vite.transformIndexHtml(`${vite.config.base}__brume-plateau`, html));
        } catch (erreur) {
          next(erreur);
        }
      });
    },
  }],
});

// Comparer les pixels réellement peints attrape aussi un calque caché derrière
// l'image : la seule présence du nœud et de son animation ne suffirait pas.
async function mesurerBrumePeinte(page, face, { comparerAvant = false } = {}) {
  const brume = face.locator('.rpg-brume-mythique');
  // Ne pas figer une animation d'entrée à son premier instant (opacité zéro).
  await face.evaluate(async (node) => {
    const entrees = [];
    for (let parent = node; parent; parent = parent.parentElement) {
      for (const animation of parent.getAnimations()) {
        if (animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming().endTime)) {
          entrees.push(animation.finished.catch(() => {}));
        }
      }
    }
    await Promise.all(entrees);
  });
  await face.locator('img').first().evaluate((image) => image.decode());
  await brume.evaluate(async (node) => {
    const fond = getComputedStyle(node, '::before').backgroundImage;
    const image = new Image();
    image.src = fond.match(/url\(["']?(.*?)["']?\)/)?.[1];
    await image.decode();
  });
  const arret = await page.addStyleTag({ content: '*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }' });
  try {
    // Laisse Chromium repeindre la texture décodée avant la capture.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const avec = await face.screenshot();
    let avant = null;
    if (comparerAvant) {
      // Même carte et même phase, avec les anciennes opacités : cette mesure
      // vérifie que le renforcement est visible, pas seulement déclaré en CSS.
      const ancienVoile = await page.addStyleTag({ content: `
        .rpg-brume-mythique::before { opacity: .74 !important; }
        .rpg-brume-mythique::after { opacity: .28 !important; }
      ` });
      try {
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        avant = await face.screenshot();
      } finally {
        await ancienVoile.evaluate((node) => node.remove());
      }
    }
    await brume.evaluate((node) => { node.style.visibility = 'hidden'; });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const sans = await face.screenshot();
    await brume.evaluate((node) => { node.style.removeProperty('visibility'); });
    const resultat = await page.evaluate(async ([a, b, ancien]) => {
      const charger = async (source) => {
        const image = new Image();
        image.src = `data:image/png;base64,${source}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const contexte = canvas.getContext('2d');
        contexte.drawImage(image, 0, 0);
        return contexte.getImageData(0, 0, image.width, image.height).data;
      };
      const avecBrume = await charger(a);
      const sansBrume = await charger(b);
      const mesurer = (pixels) => {
        let changes = 0;
        let ecart = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const difference = Math.abs(pixels[i] - sansBrume[i]) + Math.abs(pixels[i + 1] - sansBrume[i + 1]) + Math.abs(pixels[i + 2] - sansBrume[i + 2]);
          if (difference > 3) changes += 1;
          ecart += difference;
        }
        return { partModifiee: changes / (pixels.length / 4), ecartMoyen: ecart / (pixels.length / 4 * 3) };
      };
      const resultat = mesurer(avecBrume);
      if (ancien) resultat.ecartAvant = mesurer(await charger(ancien)).ecartMoyen;
      return resultat;
    }, [avec.toString('base64'), sans.toString('base64'), avant?.toString('base64') ?? null]);
    return resultat;
  } finally {
    await brume.evaluate((node) => { node.style.removeProperty('visibility'); });
    await arret.evaluate((node) => node.remove());
  }
}

let browser;
try {
  await server.listen();
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  // Joueur déjà accueilli : le contrôle de la brume porte sur le catalogue,
  // pas sur la cérémonie de bienvenue qui se présente désormais au menu.
  await page.addInitScript(() => {
    localStorage.setItem('letsplay_sablier_histoire_v2', JSON.stringify({ version: 2, etagesVaincus: ['listes-1'], recit: null }));
  });
  const erreurs = [];
  page.on('pageerror', (erreur) => erreurs.push(erreur.message));
  const base = server.config.base.endsWith('/') ? server.config.base : `${server.config.base}/`;
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}${base}jeu/sablier-de-bab-el`);
  await page.getByRole('button', { name: /Jouer dans le navigateur/ }).click();
  await page.getByRole('button', { name: /Catalogue/ }).first().click();
  await page.waitForSelector('.rpg-card-catalogue__card');

  const cartes = await page.locator('.rpg-card-catalogue__card').evaluateAll((noeuds) => noeuds.map((noeud) => ({
    id: noeud.dataset.cardId,
    brumes: noeud.querySelectorAll('.rpg-card-catalogue__art .rpg-brume-mythique').length,
  })));
  assert.equal(cartes.length, RPG_DUEL_CARDS.length);
  const raretes = new Map(RPG_DUEL_CARDS.map((carte) => [carte.id, carte.rarity]));
  for (const carte of cartes) {
    assert.equal(carte.brumes, raretes.get(carte.id) === 'mythique' ? 1 : 0,
      `${carte.id} : la brume appartient uniquement aux mythiques`);
  }

  // Le filtre ne vole pas le clic : ouvrir la fiche d'une carte verrouillée
  // montre sa grande face, et ses chiffres restent au-dessus du calque.
  const pere = page.locator('.rpg-card-catalogue__card[data-card-id="pere-des-corbeaux"]');
  assert.equal(await pere.locator('.rpg-brume-mythique').evaluate((node) => getComputedStyle(node).filter), 'grayscale(1)',
    'une carte verrouillée reste grise');
  await pere.locator('[data-catalogue-open]').click();
  const face = page.locator('.rpg-card-peek .rpg-hover-card-preview__face');
  const brume = face.locator('.rpg-brume-mythique');
  assert.equal(await brume.count(), 1, 'la fiche conserve la brume');
  assert.equal(await brume.getAttribute('aria-hidden'), 'true');
  assert.equal(await brume.evaluate((node) => getComputedStyle(node).pointerEvents), 'none');
  assert.ok(Number(await face.locator('.rpg-card__foot').evaluate((node) => getComputedStyle(node).zIndex)) > 0,
    'attaque et défense restent au-dessus de la brume');
  const peinture = await mesurerBrumePeinte(page, face, { comparerAvant: true });
  assert.ok(peinture.partModifiee > .05 && peinture.ecartMoyen < 40,
    `la brume se peint sur la fiche sans masquer la peinture (${JSON.stringify(peinture)})`);
  assert.ok(peinture.ecartMoyen > peinture.ecartAvant * 1.5,
    `la brume est sensiblement plus forte qu’avant (${JSON.stringify(peinture)})`);

  const styleDesNappes = () => brume.evaluate((node) => ({
    premiere: getComputedStyle(node, '::before').transform,
    seconde: getComputedStyle(node, '::after').transform,
    nomPremiere: getComputedStyle(node, '::before').animationName,
    nomSeconde: getComputedStyle(node, '::after').animationName,
    animations: node.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length,
  }));
  const avant = await styleDesNappes();
  await page.waitForTimeout(1000);
  const apres = await styleDesNappes();
  assert.equal(apres.animations, 2, 'deux nappes sont animées');
  assert.notEqual(apres.premiere, avant.premiere, 'la première nappe se déplace');
  assert.notEqual(apres.seconde, avant.seconde, 'la seconde nappe se déplace aussi');

  // Mesure du vrai PNG chargé par le CSS : il n'y a ni fond opaque, ni écran
  // jaune sur la peinture. La transparence est intrinsèque à la texture.
  const alpha = await brume.evaluate(async (node) => {
    const fond = getComputedStyle(node, '::before').backgroundImage;
    const url = fond.match(/url\(["']?(.*?)["']?\)/)?.[1];
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let max = 0;
    let total = 0;
    let transparents = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      const valeur = pixels[i];
      max = Math.max(max, valeur);
      total += valeur;
      if (valeur === 0) transparents += 1;
    }
    return { max, moyenne: total / (pixels.length / 4), transparents };
  });
  assert.ok(alpha.max > 0 && alpha.max < 110, 'même la fumée la plus dense laisse voir la peinture');
  assert.ok(alpha.moyenne > 3 && alpha.moyenne < 45 && alpha.transparents > 0,
    'la texture conserve des espaces totalement transparents');
  const opacites = await brume.evaluate((node) => ({
    premiere: Number(getComputedStyle(node, '::before').opacity),
    seconde: Number(getComputedStyle(node, '::after').opacity),
  }));
  const alphaMax = alpha.max / 255;
  const couvertureMax = 1 - (1 - alphaMax * opacites.premiere) * (1 - alphaMax * opacites.seconde);
  assert.ok(couvertureMax < .55,
    `même les deux nappes superposées laissent voir la peinture (${couvertureMax})`);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduite = await styleDesNappes();
  assert.equal(reduite.nomPremiere, 'none');
  assert.equal(reduite.nomSeconde, 'none');
  assert.equal(await brume.isVisible(), true, 'en mouvement réduit, la brume reste visible mais immobile');
  await page.getByRole('button', { name: 'Fermer la fiche' }).click();
  assert.equal(await page.locator('.rpg-card-peek').count(), 0, 'la fiche se ferme normalement');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}${base}__brume-plateau`);
  const enMain = page.locator('.rpg-hand__card[data-card-id="feriel"]');
  const surTable = page.locator('.rpg-card--equipe[data-card-id="kraken"]');
  try {
    await enMain.waitFor({ timeout: 10000 });
    await surTable.waitFor({ timeout: 10000 });
  } catch (erreur) {
    console.error('Plateau de test :', page.url(), (await page.locator('body').innerText()).slice(0, 1000), erreurs);
    throw erreur;
  }
  for (const [nom, carte] of [['main', enMain], ['plateau', surTable]]) {
    const voile = carte.locator('.rpg-brume-mythique');
    assert.equal(await voile.count(), 1, `la mythique en ${nom} porte sa brume`);
    const premierTransform = await voile.evaluate((node) => getComputedStyle(node, '::before').transform);
    await page.waitForTimeout(400);
    assert.notEqual(await voile.evaluate((node) => getComputedStyle(node, '::before').transform), premierTransform,
      `la brume en ${nom} est animée`);
  }
  for (const [nom, carte] of [['main', enMain], ['plateau', surTable]]) {
    const rendu = await mesurerBrumePeinte(page, carte);
    assert.ok(rendu.partModifiee > .05 && rendu.ecartMoyen < 40,
      `la brume se peint en ${nom} sans masquer la peinture (${JSON.stringify(rendu)})`);
  }
  assert.equal(await page.locator('.rpg-hand__card[data-card-id="chien-du-guet"] .rpg-brume-mythique').count(), 0);
  assert.equal(await page.locator('.rpg-card--equipe[data-card-id="chien-du-guet"] .rpg-brume-mythique').count(), 0);
  const furie = page.locator('.rpg-card--ennemi[data-card-id="maitre-du-marteau"]');
  assert.equal(await furie.locator('.rpg-brume-mythique').count(), 1,
    'la mythique en furie garde sa brume même sans classe de cadre mythique');
  assert.equal(await furie.evaluate((node) => node.classList.contains('rpg-card--mythique')), false);
  const cimetiere = page.locator('.rpg-card-pile--graveyard [data-card-id="feriel"]');
  assert.equal(await cimetiere.locator('.rpg-brume-mythique').count(), 1,
    'la carte visible au cimetière garde elle aussi la brume');
  const pile = await mesurerBrumePeinte(page, cimetiere);
  assert.ok(pile.partModifiee > .05 && pile.ecartMoyen < 40,
    `la brume est visible sur la vignette du cimetière sans masquer la peinture (${JSON.stringify(pile)})`);
  const cibleAuCentre = await surTable.evaluate((carte) => {
    const r = carte.getBoundingClientRect();
    const cible = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return Boolean(cible && carte.contains(cible) && !cible.classList.contains('rpg-brume-mythique'));
  });
  assert.equal(cibleAuCentre, true, 'le voile ne prend pas les clics sur le plateau');
  await surTable.click();
  assert.equal(await surTable.getAttribute('aria-pressed'), 'true', 'la mythique reste sélectionnable pour attaquer');
  // Une consultation au clic droit montre aussi l'arme réellement équipée.
  // Quitter le survol du Kraken laisse se refermer son éventuelle info-bulle.
  await page.mouse.move(5, 5);
  await page.waitForTimeout(600);
  await page.locator('.rpg-card--equipe[data-card-id="chien-du-guet"]').click({ button: 'right' });
  const arme = page.locator('.rpg-card-peek .rpg-hover-card-preview__weapon[data-arme-equipee="armure-de-cendres"]');
  await arme.waitFor();
  assert.equal(await arme.locator('.rpg-brume-mythique').count(), 1, 'une arme mythique équipée conserve sa brume dans l’aperçu');

  // Lancer un sort mythique réel : sa vignette annoncée garde son image et le
  // calque, y compris après la transformation de <img> en conteneur de face.
  await page.reload();
  await page.locator('.rpg-hand__card[data-card-id="serment-de-la-forge"]').click();
  await page.getByRole('button', { name: 'Lancer le sort' }).click();
  const sort = page.locator('.rpg-spell-played__art');
  await sort.waitFor();
  assert.equal(await sort.locator('.rpg-brume-mythique').count(), 1, 'l’annonce du sort mythique porte sa brume');
  assert.ok(await sort.locator('img').evaluate((image) => image.getBoundingClientRect().width > 0),
    'l’illustration de l’annonce reste visible');

  // Même superposition sur les gabarits de duel de téléphone, en paysage.
  for (const [width, height] of [[844, 390], [568, 320]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}${base}__brume-plateau`);
    for (const [nom, carte] of [['main', enMain], ['plateau', surTable]]) {
      await carte.waitFor();
      const dimensions = await carte.evaluate((node) => {
        const image = node.querySelector('img').getBoundingClientRect();
        const brume = node.querySelector('.rpg-brume-mythique').getBoundingClientRect();
        return { image: { width: image.width, height: image.height }, brume: { width: brume.width, height: brume.height } };
      });
      assert.ok(dimensions.image.width > 0 && dimensions.brume.width > 0
        && Math.abs(dimensions.image.width - dimensions.brume.width) < 1
        && Math.abs(dimensions.image.height - dimensions.brume.height) < 1,
      `${width}×${height} : la brume épouse la carte en ${nom}`);
    }
  }
  assert.deepEqual(erreurs, [], 'aucune erreur navigateur');
  console.log('✓ Brume dorée animée uniquement sur les mythiques, transparente, non bloquante et respectueuse du mouvement réduit.');
} finally {
  await browser?.close();
  await server.close();
}
