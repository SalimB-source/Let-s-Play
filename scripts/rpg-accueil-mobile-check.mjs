/** Régression navigateur : npm run dev, puis npm run check:rpg-accueil-mobile.
 * Installer le navigateur une fois : npx playwright install chromium.
 * RPG_URL, CHROMIUM_EXECUTABLE_PATH et CHROMIUM_ARGS peuvent remplacer les
 * valeurs locales par défaut.
 *
 * L'accueil mobile du Sablier prend la mise en scène d'un jeu mobile d'arène :
 * bandeau du joueur, arène, gros bouton, rangée de coffres. Sur téléphone il se
 * joue en paysage, et tout doit tenir sur UN seul écran — le bouton de jeu et
 * les coffres ne passent jamais sous le bord.
 *
 * Deux parcours sont vérifiés en plus de la mise en page :
 *   - un coffre de quête prêt s'ouvre d'un tap, verse ses crédits et se referme ;
 *   - le Coffre du cycle (trois quêtes réclamées) ouvre en plus un vrai paquet
 *     de cartes : « Voir les cartes » découvre la cérémonie de retournement.
 *
 * Un navigateur par format : les Chromium de conteneur (`--single-process`)
 * meurent à la fermeture d'un second contexte du même navigateur.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const FORMATS = [[568, 320], [667, 375], [844, 390], [915, 412]];
const URL = process.env.RPG_URL || 'http://localhost:5173/Let-s-Play/jeu/sablier-de-bab-el';

/** Le profil de test : actif (pas de coffret de bienvenue), sans dette de paquets. */
const PROFIL = { version: 1, xp: 120, boostersOfferts: 2, pseudo: 'Duelliste' };

const journee = (suite = {}) => ({
  version: 1,
  jour: new Date().toISOString().slice(0, 10),
  quetes: ['creatures-10', 'duels-2', 'duels-3'],
  progres: { 'creatures-10': 10, 'duels-2': 1, 'duels-3': 0 },
  reclamations: [], cachet: false, semaine: false, serie: 3,
  debutLe: new Date().toISOString(),
  ...suite,
});

const lancer = () => chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: process.env.CHROMIUM_ARGS
    ? process.env.CHROMIUM_ARGS.split(/ +/)
    : ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});

const mesurer = () => {
  const rect = (sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().toJSON() : null;
  };
  const menu = document.querySelector('.rpg-mode-menu');
  return {
    viewport: { w: innerWidth, h: innerHeight },
    menu: { scrollH: menu.scrollHeight, clientH: menu.clientHeight, scrollTop: menu.scrollTop },
    bandeau: rect('.rpg-accueil-mobile__bandeau'),
    arene: rect('.rpg-accueil-mobile__arene'),
    jouer: rect('.rpg-accueil-mobile__jouer'),
    coffres: rect('.rpg-coffres-quetes'),
    slots: [...document.querySelectorAll('.rpg-coffres-quetes__slot')].map((slot) => ({
      cle: slot.dataset.coffre,
      etat: slot.dataset.coffreEtat,
      genre: slot.dataset.coffreGenre,
      paquets: Number(slot.dataset.coffrePaquets),
      box: slot.getBoundingClientRect().toJSON(),
    })),
  };
};

/** Une page tactile, sur la journée de quêtes voulue, navigation du site ôtée. */
async function ouvrirPage(browser, [width, height], quetes) {
  const context = await browser.newContext({
    viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  });
  await context.addInitScript(([profil, etatQuetes]) => {
    localStorage.setItem('letsplay_sablier_entree_v1', 'jeu');
    localStorage.setItem('letsplay_sablier_sound_v1', 'off');
    localStorage.setItem('letsplay_sablier_profil_v1', JSON.stringify(profil));
    localStorage.setItem('letsplay_sablier_quetes_v1', JSON.stringify(etatQuetes));
    localStorage.setItem('letsplay_sablier_histoire_v1', JSON.stringify({ version: 2, etagesVaincus: [], recit: null }));
    for (const name of ['requestFullscreen', 'webkitRequestFullscreen']) {
      Object.defineProperty(Element.prototype, name, { configurable: true, value: undefined });
    }
    if (screen.orientation) {
      Object.defineProperty(screen.orientation, 'lock', { value: () => Promise.reject(new Error('unsupported')), configurable: true });
    }
  }, [PROFIL, quetes]);
  const page = await context.newPage();
  await page.goto(URL);
  await page.locator('.rpg-accueil-mobile').waitFor();
  // Le Sablier est une couche plein écran : la navigation du site n'est pas
  // dans le viewport de jeu (la couche immersive la masque).
  await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Navigation principale"]');
    if (nav) nav.style.display = 'none';
  });
  await page.waitForTimeout(400);
  return page;
}

/** La mise en page : tout tient, rien ne se recouvre, cinq coffres touchables. */
function verifierMiseEnPage(m, prefixe) {
  assert.ok(m.menu.scrollH <= m.menu.clientH + 1, `${prefixe} : l'accueil ne défile pas (${m.menu.scrollH} > ${m.menu.clientH})`);
  assert.equal(m.menu.scrollTop, 0, `${prefixe} : aucun défilement`);
  for (const [nom, boite] of [['bandeau', m.bandeau], ['arène', m.arene], ['bouton de jeu', m.jouer], ['coffres', m.coffres]]) {
    assert.ok(boite, `${prefixe} : ${nom} présent`);
    assert.ok(boite.top >= -1 && boite.bottom <= m.viewport.h + 1, `${prefixe} : ${nom} tient dans l'écran (${boite.top.toFixed(0)}→${boite.bottom.toFixed(0)})`);
    assert.ok(boite.left >= -1 && boite.right <= m.viewport.w + 1, `${prefixe} : ${nom} tient en largeur`);
  }
  assert.ok(m.arene.height >= 60, `${prefixe} : l'arène garde une hauteur lisible (${m.arene.height.toFixed(0)})`);
  assert.ok(m.jouer.height >= 34, `${prefixe} : le bouton de jeu reste touchable (${m.jouer.height.toFixed(0)})`);
  assert.ok(m.jouer.bottom <= m.coffres.top + 1, `${prefixe} : le bouton passe au-dessus des coffres, sans les recouvrir`);
  assert.equal(m.slots.length, 5, `${prefixe} : trois coffres de quête + cycle + semaine`);
  assert.deepEqual(m.slots.map((s) => s.genre), ['bronze', 'argent', 'or', 'royal', 'legende'], `${prefixe} : un genre par coffre`);
  for (const slot of m.slots) {
    assert.ok(slot.box.bottom <= m.viewport.h + 1, `${prefixe} : le coffre ${slot.cle} tient dans l'écran`);
    assert.ok(slot.box.width >= 60, `${prefixe} : le coffre ${slot.cle} reste touchable (${slot.box.width.toFixed(0)}px)`);
  }
}

// ── 1. La mise en page, aux quatre formats de téléphone en paysage ────────
for (const format of FORMATS) {
  const browser = await lancer();
  try {
    const page = await ouvrirPage(browser, format, journee());
    const m = await page.evaluate(mesurer);
    verifierMiseEnPage(m, `${format[0]}×${format[1]}`);
    assert.equal(m.slots[0].etat, 'pret', 'la quête finie donne un coffre prêt');
    console.log(`✓ ${format[0]}×${format[1]} — accueil, arène, bouton et 5 coffres sur un seul écran`);
  } finally {
    await browser.close();
  }
}

// ── 2. Le coffre de quête : un tap, des crédits, une cérémonie ────────────
{
  const browser = await lancer();
  try {
    const page = await ouvrirPage(browser, [844, 390], journee());
    const avant = await page.evaluate(() => JSON.parse(localStorage.getItem('letsplay_sablier_bourse_v1') ?? '{}').credits ?? 0);
    await page.locator('[data-coffre="quete:creatures-10"] button').click();
    const ceremonie = page.locator('[data-coffre-ouverture]');
    await ceremonie.waitFor();
    assert.equal(await ceremonie.getAttribute('data-coffre-ouverture'), 'bronze');
    assert.equal(await page.locator('[data-coffre-gain]').getAttribute('data-coffre-gain'), '60');
    // La cérémonie tient elle aussi dans l'écran, bouton compris.
    const boite = await page.locator('.rpg-coffre-ouverture__boite').boundingBox();
    assert.ok(boite.y >= -1 && boite.y + boite.height <= 391, `la cérémonie tient dans l'écran (${boite.y}→${boite.y + boite.height})`);
    const apres = await page.evaluate(() => JSON.parse(localStorage.getItem('letsplay_sablier_bourse_v1') ?? '{}').credits ?? 0);
    assert.ok(apres - avant >= 60, `les crédits sont en bourse dès le tap (${apres - avant} ◈)`);
    await page.locator('[data-coffre-suite]').click();
    await page.locator('[data-coffre-ouverture]').waitFor({ state: 'detached' });
    assert.equal(await page.locator('[data-coffre="quete:creatures-10"]').getAttribute('data-coffre-etat'), 'ouvert');
    console.log('✓ Coffre de quête — un tap verse les crédits, la cérémonie se referme, le coffre est ouvert');
  } finally {
    await browser.close();
  }
}

// ── 3. Le Coffre du cycle : ses crédits ET un paquet de cartes ────────────
{
  const browser = await lancer();
  try {
    const page = await ouvrirPage(browser, [844, 390], journee({
      progres: { 'creatures-10': 10, 'duels-2': 2, 'duels-3': 3 },
      reclamations: ['creatures-10', 'duels-2', 'duels-3'],
    }));
    const cycle = page.locator('[data-coffre="cycle"]');
    assert.equal(await cycle.getAttribute('data-coffre-etat'), 'pret', 'les trois quêtes réclamées ouvrent le Coffre du cycle');
    assert.equal(await cycle.getAttribute('data-coffre-paquets'), '1', 'le Coffre du cycle annonce un paquet');
    await cycle.locator('button').click();
    const ceremonie = page.locator('[data-coffre-ouverture]');
    await ceremonie.waitFor();
    assert.equal(await ceremonie.getAttribute('data-coffre-ouverture'), 'royal');
    assert.equal(await ceremonie.getAttribute('data-coffre-ouverture-paquets'), '1', 'un paquet a réellement été tiré');
    assert.match(await page.locator('.rpg-coffre-ouverture__note').textContent(), /paquet/, 'la cérémonie annonce les cartes');
    // « Voir les cartes » referme les pièces et découvre le retournement.
    await page.locator('[data-coffre-suite]').click();
    await page.locator('[data-coffre-ouverture]').waitFor({ state: 'detached' });
    const retournement = page.locator('[data-souk-ceremonie]');
    await retournement.waitFor({ timeout: 15000 });
    assert.equal(await retournement.getAttribute('data-souk-ceremonie-paquet'), '1', 'un seul paquet pour le Coffre du cycle');
    assert.equal(await retournement.getAttribute('data-souk-ceremonie-offert'), 'true', 'le paquet du coffre est offert, rien n’est débité');
    // Un paquet de quête n'est pas un palier de niveau : la cérémonie doit dire
    // le coffre, jamais « Niveau — » sans numéro.
    assert.equal(await retournement.getAttribute('data-souk-ceremonie-coffre'), 'true', 'la cérémonie sait que le paquet vient d’un coffre');
    assert.equal(await retournement.getAttribute('data-souk-ceremonie-niveau'), null, 'aucun niveau n’est annoncé pour un coffre de quête');
    assert.match(await retournement.locator('h2').textContent(), /cycle/i, 'le titre nomme le coffre');
    assert.doesNotMatch(await retournement.locator('h2').textContent(), /niveau/i, 'le titre ne parle pas de niveau');
    // Les cartes se retournent une à une : « Passer » les dévoile toutes, ce qui
    // rend le compte déterministe au lieu d'attendre la fin de l'animation.
    const passer = page.locator('[data-souk-ceremonie-passer]');
    if (await passer.count()) await passer.click();
    await page.locator('[data-souk-carte]').first().waitFor({ timeout: 15000 });
    const cartes = await page.locator('[data-souk-carte]').count();
    assert.equal(cartes, 5, `le paquet du coffre retourne ses cinq cartes (${cartes} visibles)`);
    // « Tout ranger » referme : le coffre est ouvert, il ne se paie pas deux fois.
    await page.locator('[data-souk-ceremonie-ranger]').click();
    await page.locator('[data-souk-ceremonie]').waitFor({ state: 'detached' });
    assert.equal(await page.locator('[data-coffre="cycle"]').getAttribute('data-coffre-etat'), 'ouvert');
    console.log('✓ Coffre du cycle — crédits + un vrai paquet, retourné par la cérémonie du Souk');
  } finally {
    await browser.close();
  }
}
