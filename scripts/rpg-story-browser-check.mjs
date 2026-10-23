/** Vrai navigateur : npm run dev puis npm run check:rpg-story-browser.
 * Playwright Chromium installé, ou CHROMIUM_EXECUTABLE_PATH / CHROMIUM_ARGS.
 * Aucun raccourci de victoire : la fixture simule un ancien joueur dont les
 * cinq duels sont déjà gagnés et exerce le parcours « déjà remporté ».
 */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { RPG_STORY_STORAGE_KEY, RPG_STORY_LEGACY_STORAGE_KEY } from '../src/games/rpgStory.js';
import { RPG_STORY_CAMPAIGN_FLOORS, acteSuivantHistoire, questionChoix, sceneHistoire } from '../src/games/rpgStoryScenes.js';
import { recitHistoireVide, transitionRecitHistoire } from '../src/games/rpgStoryFlow.js';

/** Rejoue les vraies transitions, sans fabriquer un acte encore verrouillé. */
function progressionJusqua(cible) {
  const atteint = (curseur) => typeof cible === 'string'
    ? curseur.id === cible
    : Object.entries(cible).every(([cle, valeur]) => curseur[cle] === valeur);
  let recit = recitHistoireVide();
  let etagesVaincus = [];
  for (let garde = 0; garde < 500 && !atteint(recit.curseur); garde += 1) {
    const curseur = recit.curseur;
    if (curseur.type === 'fin') {
      const suivant = acteSuivantHistoire(curseur.acteId ?? 'acte-1');
      assert.ok(suivant, 'la campagne ne peut pas ouvrir un acte après son terme');
      recit = transitionRecitHistoire(recit, { type: 'ouvrir-acte', curseur, acteId: suivant.id }, etagesVaincus);
    } else if (curseur.type === 'duel') {
      etagesVaincus = [...etagesVaincus, curseur.etageId];
      recit = transitionRecitHistoire(recit,
        { type: 'victoire', curseur, etageId: curseur.etageId }, etagesVaincus);
    } else {
      const scene = sceneHistoire(curseur.id);
      if (scene.choix) {
        const question = questionChoix(scene.choix);
        recit = transitionRecitHistoire(recit, { type: 'resumer', curseur }, etagesVaincus);
        recit = transitionRecitHistoire(recit,
          { type: 'choisir', curseur: recit.curseur, optionId: question.options[0].id }, etagesVaincus);
      } else {
        recit = transitionRecitHistoire(recit, { type: 'continuer', curseur }, etagesVaincus);
      }
    }
  }
  assert.ok(atteint(recit.curseur), `la campagne atteint ${JSON.stringify(cible)}`);
  return { version: 2, etagesVaincus, recit };
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: process.env.CHROMIUM_ARGS ? process.env.CHROMIUM_ARGS.split(/ +/) : ['--no-sandbox', '--disable-dev-shm-usage'],
});
const url = process.env.RPG_URL || 'http://localhost:5173/Let-s-Play/jeu/sablier-de-bab-el';
const screenshotDir = process.env.RPG_STORY_SCREENSHOT_DIR;
if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
try {
  for (const optionId of ['publique', 'confiee']) {
    const mobile = optionId === 'confiee';
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 960 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const erreurs = [];
    page.on('pageerror', (error) => erreurs.push(error.message));
    // sessionStorage garantit que le rechargement n'écrase pas le récit testé.
    await page.addInitScript(({ legacyKey, floors }) => {
      if (!sessionStorage.getItem('story-browser-initialized')) {
        localStorage.clear();
        localStorage.setItem('letsplay_sablier_entree_v1', 'jeu');
        localStorage.setItem(legacyKey, JSON.stringify({ etagesVaincus: floors }));
        localStorage.setItem('letsplay_sablier_sound_v1', 'off');
        sessionStorage.setItem('story-browser-initialized', 'yes');
      }
      for (const key of ['requestFullscreen', 'webkitRequestFullscreen']) {
        Object.defineProperty(Element.prototype, key, { value: undefined, configurable: true });
      }
    }, { legacyKey: RPG_STORY_LEGACY_STORAGE_KEY, floors: RPG_STORY_CAMPAIGN_FLOORS });
    const lire = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), RPG_STORY_STORAGE_KEY);
    const ouvrir = async () => {
      await page.getByRole('button', { name: 'Histoire', exact: true }).click();
      await page.locator('[data-story-campaign]').click();
      await page.locator('.rpg-narrative').waitFor();
    };
    const capture = async (nom) => { if (screenshotDir) await page.screenshot({ path: join(screenshotDir, `${optionId}-${nom}.png`) }); };
    const portraits = new Map();
    const verifierPortrait = async () => {
      const img = page.locator('.rpg-narrative__stand--actif img[data-personnage], .rpg-narrative__stand img[data-personnage], .rpg-narrative__portrait img').first();
      await img.waitFor();
      await img.evaluate((image) => image.decode());
      const donnees = await img.evaluate((image) => ({
        id: image.dataset.personnage,
        src: image.getAttribute('src'),
        width: image.naturalWidth,
        support: image.closest('[data-personnage-stand]') ? 'stand' : 'portrait',
      }));
      assert.ok(donnees.width > 0, `${donnees.id} est livré`);
      const cle = `${donnees.id}:${donnees.support}`;
      if (portraits.has(cle)) assert.equal(donnees.src, portraits.get(cle), 'chaque représentation du personnage reste stable');
      portraits.set(cle, donnees.src);
    };
    const verifierLargeur = async () => {
      const dimensions = await page.locator('.rpg-narrative').evaluate((el) => {
        const boite = el.querySelector('.rpg-narrative__boite')?.getBoundingClientRect();
        const stands = [...el.querySelectorAll('.rpg-narrative__stand')]
          .map((s) => ({ rect: s.getBoundingClientRect(), fixe: getComputedStyle(s).position === 'fixed' }));
        return {
          client: el.clientWidth,
          contenu: el.scrollWidth,
          auDessusDeLaBoite: !boite || stands.every((s) => s.rect.top < boite.top - 120),
          // Les personnages dépassent : leur bas sort de la fenêtre (fixés) ou
          // passe derrière le bord de la bulle (portrait étroit, où elle occupe
          // la largeur utile).
          debord: !boite ? [] : stands.map((s) => (s.fixe
            ? s.rect.bottom - window.innerHeight
            : s.rect.bottom - boite.top)),
        };
      });
      assert.ok(dimensions.contenu <= dimensions.client + 1, 'aucun débordement horizontal du lecteur');
      assert.ok(dimensions.auDessusDeLaBoite, 'les personnages restent largement visibles au-dessus de la boîte de dialogue');
      assert.ok(dimensions.debord.every((valeur) => valeur > 16),
        `les personnages dépassent de l’écran (jambes coupées par le bord, mesuré : ${dimensions.debord.join(', ')})`);
    };

    await page.goto(url);
    await ouvrir();
    assert.equal((await lire()).recit.curseur.id, 'listes-1-avant', 'les victoires v1 ne sont pas des scènes lues');
    assert.equal(await page.locator('.rpg-mulligan,.card-table,.rpg-rotate-prompt').count(), 0, 'le récit est lisible en portrait, sans duel caché');
    await verifierPortrait();
    await page.locator('[data-story-next]').focus();
    await page.keyboard.press('Enter');
    assert.equal((await lire()).recit.curseur.replique, 1, 'le clavier fait avancer la lecture');
    await verifierPortrait();
    await page.reload();
    await ouvrir();
    assert.equal((await lire()).recit.curseur.replique, 1, 'la lecture reprend à la même réplique');
    await verifierPortrait();
    for (const theme of ['light', 'dark']) {
      await page.evaluate((valeur) => document.documentElement.setAttribute('data-theme', valeur), theme);
      const color = await page.locator('.rpg-narrative__dialogue p:not(.rpg-narrative__sr)').evaluate((el) => getComputedStyle(el).color);
      assert.equal(color, 'rgb(238, 230, 216)', `le texte reste clair sur le décor sombre en thème ${theme}`);
    }
    for (const [width, height] of [[320, 740], [390, 844], [844, 390], [1440, 960]]) {
      await page.setViewportSize({ width, height });
      await verifierLargeur();
    }
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 960 });
    await page.locator('[data-story-summary]').click();
    await page.locator('[data-story-next]').click();
    const portraitBriefing = await page.locator('.rpg-narrative__portrait img').getAttribute('src');
    await page.locator('[data-story-start-duel]').click();
    await page.locator('.rpg-mulligan').waitFor();
    assert.equal(await page.locator('.rpg-wizard-plate--ennemi img').getAttribute('src'), portraitBriefing, 'le vrai duel reprend le visage du briefing');
    // La page ne sauvegarde pas le plateau : on revient au briefing, pas à un
    // faux duel reconstitué. La victoire v1 permet ensuite la lecture sans grind.
    await page.reload();
    await ouvrir();
    assert.equal((await lire()).recit.curseur.type, 'duel');
    let garde = 0;
    while ((await lire()).recit.curseur.type !== 'fin' && garde++ < 45) {
      await verifierPortrait();
      await verifierLargeur();
      const curseur = (await lire()).recit.curseur;
      if (curseur.type === 'duel') {
        await page.locator('[data-story-skip-duel]').click();
      } else {
        if (await page.locator('[data-story-summary]').count()) await page.locator('[data-story-summary]').click();
        if (await page.locator('[data-story-choice]').count()) {
          assert.equal(curseur.id, 'listes-2-apres');
          assert.equal(await page.locator('[data-story-next]').count(), 0, 'aucun bouton ne contourne la décision');
          await page.locator(`[data-story-choice="${optionId}"]`).scrollIntoViewIfNeeded();
          await capture('choix');
          await page.locator(`[data-story-choice="${optionId}"]`).click();
          assert.equal((await lire()).recit.choix['diffusion-liste'], optionId);
        } else await page.locator('[data-story-next]').click();
      }
    }
    assert.ok(garde < 45);
    assert.equal((await lire()).recit.scenesVues.length, 10);
    const epilogue = await page.locator('.rpg-narrative__outcome').textContent();
    assert.match(epilogue, mobile ? /Tarek.*escalier de service/ : /Souk.*Scribe/);
    await capture('epilogue');
    const sauvegarde = await lire();
    await page.getByRole('button', { name: /Ouvrir le journal/ }).click();
    assert.equal(await page.locator('[data-journal-scene]').count(), 10);
    await page.locator('[data-journal-scene="listes-5-apres"] summary').click();
    const texteFin = await page.locator('[data-journal-scene="listes-5-apres"]').textContent();
    assert.match(texteFin, mobile ? /porte de service/ : /Tout le Souk/);
    for (const [cle, src] of portraits) {
      const [id, support] = cle.split(':');
      if (support !== 'portrait') continue;
      assert.equal(await page.locator(`.rpg-story-journal__cast [data-personnage="${id}"]`).getAttribute('src'), src, 'le journal reprend le portrait canonique');
    }
    assert.deepEqual(await lire(), sauvegarde, 'le journal ne change pas la sauvegarde');
    await capture('journal');
    assert.deepEqual(erreurs, [], 'aucune erreur JavaScript pendant le parcours');
    console.log(`✓ Navigateur ${mobile ? 'tactile' : 'ordinateur'} : branche ${optionId}, migration, clavier, reprise, images cohérentes, personnages qui dépassent de l’écran, journal, 320–1440 px et deux thèmes`);
    await context.close();
  }

  // Les trois actes ajoutés à la campagne : leurs propres peintures doivent
  // être réellement servies et décodées par le navigateur, y compris hors
  // scène (briefing, livre et épilogue), pas seulement présentes sur disque.
  const casActes = [
    { nom: 'acte-6-scene', cible: 'corsaires-1-avant', acte: 'acte-6', decor: 'corsaires', id: 'corsaire-mousse', fichier: 'stand-corsaire-mousse.webp', stand: true },
    { nom: 'acte-6-negociant', cible: { type: 'duel', etageId: 'corsaires-2' }, acte: 'acte-6', decor: 'corsaires', id: 'corsaire-negociant', fichier: 'corsaire-negociant.jpg', duel: true },
    { nom: 'acte-6-epilogue', cible: 'corsaires-4-apres', acte: 'acte-6', decor: 'corsaires', id: 'corsaire-barbe-rousse', fichier: 'la-barbe-rousse.jpg', conclure: true },
    { nom: 'acte-7-scene', cible: 'soleil-1-avant', acte: 'acte-7', decor: 'soleil', id: 'samurai-ashigaru', fichier: 'stand-samurai-ashigaru.webp', stand: true, livre: true },
    { nom: 'acte-8-scene-mobile', cible: 'necropole-3-avant', acte: 'acte-8', decor: 'necropole', id: 'necro-peseuse', fichier: 'stand-necro-peseuse.webp', stand: true, mobile: true },
    { nom: 'acte-8-epilogue', cible: 'necropole-4-apres', acte: 'acte-8', decor: 'necropole', id: 'necro-devoreuse', fichier: 'la-devoreuse.jpg', conclure: true },
  ];
  for (const cas of casActes) {
    const context = await browser.newContext({
      viewport: cas.mobile ? { width: 390, height: 844 } : { width: 1440, height: 960 },
      isMobile: Boolean(cas.mobile), hasTouch: Boolean(cas.mobile), reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const erreurs = [];
    page.on('pageerror', (error) => erreurs.push(error.message));
    await page.addInitScript(({ key, etat }) => {
      localStorage.clear();
      localStorage.setItem('letsplay_sablier_entree_v1', 'jeu');
      localStorage.setItem('letsplay_sablier_sound_v1', 'off');
      localStorage.setItem(key, JSON.stringify(etat));
    }, { key: RPG_STORY_STORAGE_KEY, etat: progressionJusqua(cas.cible) });
    await page.goto(url);
    await page.getByRole('button', { name: 'Histoire', exact: true }).click();
    await page.locator('[data-story-campaign]').click();
    const lecteur = page.locator('.rpg-narrative');
    await lecteur.waitFor();
    if (cas.conclure) {
      await page.locator('[data-story-summary]').click();
      await page.locator('[data-story-next]').click();
      await page.locator('.rpg-narrative__outcome').waitFor();
    }
    assert.equal(await lecteur.getAttribute('data-story-act'), cas.acte);
    assert.equal(await lecteur.getAttribute('data-story-decor'), cas.decor, `${cas.nom} : décor de son acte`);
    const image = page.locator(cas.stand
      ? `[data-personnage-stand="${cas.id}"] img[data-personnage="${cas.id}"]`
      : `.rpg-narrative__portrait img[data-personnage="${cas.id}"]`);
    await image.waitFor();
    await image.evaluate((element) => element.decode());
    assert.ok(await image.evaluate((element) => element.naturalWidth > 0), `${cas.id} : image décodée`);
    assert.ok((await image.getAttribute('src')).includes(cas.fichier), `${cas.id} : sa propre peinture`);
    if (screenshotDir) await page.screenshot({ path: join(screenshotDir, `${cas.nom}.png`) });
    if (cas.duel) {
      const portrait = await image.getAttribute('src');
      await page.locator('[data-story-start-duel]').click();
      await page.locator('.rpg-mulligan').waitFor();
      assert.equal(await page.locator('.rpg-wizard-plate--ennemi img').getAttribute('src'), portrait,
        'le Négociant garde son portrait dédié dans le duel');
    }
    if (cas.livre) {
      await page.locator('.rpg-narrative__back').click();
      await page.locator('[data-campaign-page="acte-7"]').waitFor();
      assert.deepEqual(await page.locator('[data-campaign-page="acte-7"] .rpg-campaign__cast img')
        .evaluateAll((images) => images.map((element) => element.dataset.personnage)),
      ['samurai-ronin', 'samurai-kenshi', 'samurai-daimyo'], 'le livre présente les samouraïs, pas le trio générique');
      if (screenshotDir) await page.screenshot({ path: join(screenshotDir, 'acte-7-livre.png') });
    }
    assert.deepEqual(erreurs, [], `${cas.nom} : aucune erreur JavaScript`);
    await context.close();
  }
  console.log('✓ Navigateur : actes VI–VIII, sprites dédiés, décors, Négociant, livre des samouraïs et épilogues');
} finally {
  await browser.close();
}
