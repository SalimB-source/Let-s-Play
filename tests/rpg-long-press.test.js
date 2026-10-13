import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  RPG_LONG_PRESS_MS,
  RPG_LONG_PRESS_SEUIL_PX,
  peutDemarrerAppuiLong,
  startRpgLongPress,
} from '../src/games/rpgLongPress.js';

/** Un doigt sur une carte : `pointerdown` sur le bouton, mouvements et lever
 * envoyés sur la fenêtre, comme le fait le navigateur. */
function setup(options = {}) {
  const dom = new JSDOM('<div id="table"><button data-card-id="desert"><img src="card.jpg"></button></div>');
  const { window } = dom;
  const source = window.document.querySelector('button');
  const declenchements = [];
  const cleanup = startRpgLongPress(
    { pointerType: 'touch', pointerId: 1, clientX: 50, clientY: 100, isPrimary: true, button: 0, ...options },
    { source, onTrigger: (detail) => declenchements.push(detail), duree: options.duree ?? 24 },
  );
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const send = (type, x = 50, y = 100, id = 1) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: id, clientX: x, clientY: y });
    window.dispatchEvent(event);
    return event;
  };
  const click = () => {
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    source.dispatchEvent(event);
    return event;
  };
  const contextMenu = () => {
    const event = new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    source.dispatchEvent(event);
    return event;
  };
  return { dom, window, source, declenchements, cleanup, wait, send, click, contextMenu };
}

test('une seconde de contact immobile ouvre l’aperçu, une seule fois', async () => {
  const s = setup();
  await s.wait(60);
  assert.equal(s.declenchements.length, 1, 'l’appui long déclenche l’aperçu');
  assert.equal(s.declenchements[0].source, s.source, 'la carte tenue est transmise');
  assert.equal(s.declenchements[0].event.pointerId, 1, 'le geste d’origine est transmis');
  // Le doigt peut rester posé : rien ne se répète.
  await s.wait(60);
  assert.equal(s.declenchements.length, 1, 'un seul aperçu par appui');
  s.send('pointerup');
  s.cleanup();
  s.dom.window.close();
});

test('le clic qui suit l’aperçu est avalé : la carte n’est pas jouée', async () => {
  const s = setup();
  await s.wait(60);
  assert.equal(s.declenchements.length, 1);
  s.send('pointerup');
  assert.equal(s.click().defaultPrevented, true, 'le clic synthétique ne joue pas la carte');
  s.cleanup();
  s.dom.window.close();
});

test('interrompu après le déclenchement, le clic reste avalé : l’aperçu ne se referme pas', async () => {
  // Le volet s’ouvre pendant que le doigt tient encore — puis quelque chose
  // interrompt le geste AVANT la levée : un `scroll` (autoFocus du volet, rail
  // de main qui remue), un `pointercancel` ou un `blur` de WebView. Le clic
  // synthétique qui suit doit être avalé quand même : sinon il touche le volet
  // et le referme à peine ouvert — le joueur ne voit « rien ne se passe ».
  for (const mode of ['scroll', 'pointercancel', 'blur']) {
    const s = setup();
    await s.wait(60);
    assert.equal(s.declenchements.length, 1, `${mode} : l’aperçu s’est ouvert`);
    if (mode === 'scroll') s.window.dispatchEvent(new s.window.Event('scroll'));
    else s.send(mode);
    s.send('pointerup');
    assert.equal(s.click().defaultPrevented, true,
      `${mode} post-déclenchement : le clic qui suit l’aperçu est avalé`);
    s.cleanup();
    s.dom.window.close();
  }
});

test('un appui court reste un clic : rien ne s’ouvre, le clic passe', async () => {
  const s = setup();
  s.send('pointerup');
  await s.wait(60);
  assert.deepEqual(s.declenchements, [], 'lever le doigt avant la durée annule l’appui');
  assert.equal(s.click().defaultPrevented, false, 'le clic garde son action de jeu');
  s.cleanup();
  s.dom.window.close();
});

test('le menu contextuel natif est étouffé pendant l’appui', async () => {
  const s = setup();
  assert.equal(s.contextMenu().defaultPrevented, true, 'pas de callout iOS ni de menu Android');
  await s.wait(60);
  s.send('pointerup');
  assert.equal(s.contextMenu().defaultPrevented, false, 'l’étouffement s’arrête avec le geste');
  s.cleanup();
  s.dom.window.close();
});

test('un déplacement au-delà du seuil annule : défilement ou glisser-déposer', async () => {
  const s = setup();
  s.send('pointermove', 50 + RPG_LONG_PRESS_SEUIL_PX, 100);
  await s.wait(60);
  assert.deepEqual(s.declenchements, [], 'le rail de main qui défile n’ouvre pas d’aperçu');
  s.send('pointerup');
  assert.equal(s.click().defaultPrevented, false, 'le geste redevenu clic garde son action');
  s.cleanup();
  s.dom.window.close();
});

test('un tremblement sous le seuil ne coupe pas l’appui', async () => {
  const s = setup();
  s.send('pointermove', 52, 98);
  await s.wait(60);
  assert.equal(s.declenchements.length, 1, 'le doigt qui tremble légèrement ouvre l’aperçu');
  s.send('pointerup');
  s.cleanup();
  s.dom.window.close();
});

test('une fois l’aperçu ouvert, le doigt peut bouger sans le refermer', async () => {
  const s = setup();
  await s.wait(60);
  s.send('pointermove', 240, 40);
  s.send('pointerup');
  assert.equal(s.declenchements.length, 1, 'l’aperçu ouvert ne dépend plus du doigt');
  s.cleanup();
  s.dom.window.close();
});

test('interruption, second doigt, page cachée, défilement et démontage annulent', async () => {
  for (const mode of ['pointercancel', 'blur', 'scroll', 'cache', 'démontage']) {
    const s = setup();
    if (mode === 'scroll') s.window.dispatchEvent(new s.window.Event('scroll'));
    else if (mode === 'cache') {
      Object.defineProperty(s.window.document, 'hidden', { value: true, configurable: true });
      s.window.document.dispatchEvent(new s.window.Event('visibilitychange'));
    } else if (mode === 'démontage') s.cleanup();
    else s.send(mode);
    await s.wait(60);
    assert.deepEqual(s.declenchements, [], `${mode} : aucun aperçu`);
    s.cleanup();
    s.dom.window.close();
  }
});

test('un autre doigt ne déclenche ni n’achève l’appui', async () => {
  const s = setup();
  s.send('pointerup', 50, 100, 2);
  await s.wait(60);
  assert.equal(s.declenchements.length, 1, 'le premier doigt garde la main sur son appui');
  s.send('pointerup');
  s.cleanup();
  s.dom.window.close();
});

test('la souris et les arguments manquants sont ignorés', async () => {
  const souris = setup({ pointerType: 'mouse' });
  assert.equal(souris.declenchements.length, 0);
  await souris.wait(60);
  assert.deepEqual(souris.declenchements, [], 'la souris a déjà le survol');
  souris.cleanup?.();
  souris.dom.window.close();

  const second = setup({ isPrimary: false });
  await second.wait(60);
  assert.deepEqual(second.declenchements, [], 'un second pointeur simultané est ignoré');
  second.cleanup?.();
  second.dom.window.close();

  assert.equal(startRpgLongPress(null, { source: null, onTrigger() {} }), null);
  assert.equal(startRpgLongPress({ pointerType: 'touch' }, {}), null, 'sans carte ni rappel, rien à armer');

  // Le prédicat partage les mêmes règles : la page ne désarme un geste en
  // cours que pour un `pointerdown` qui armerait vraiment un appui long.
  assert.equal(peutDemarrerAppuiLong({ pointerType: 'touch', isPrimary: true, button: 0 }), true);
  assert.equal(peutDemarrerAppuiLong({ pointerType: 'mouse', isPrimary: true, button: 0 }), false);
  assert.equal(peutDemarrerAppuiLong({ pointerType: 'touch', isPrimary: false, button: 0 }), false);
  assert.equal(peutDemarrerAppuiLong({ pointerType: 'touch', isPrimary: true, button: 2 }), false);
  assert.equal(peutDemarrerAppuiLong(null), false);
});

test('la durée par défaut est bien une seconde, comme annoncé au joueur', () => {
  assert.equal(RPG_LONG_PRESS_MS, 1000, 'une seconde d’appui');
  assert.equal(RPG_LONG_PRESS_SEUIL_PX, 10, 'le seuil de déplacement suit le glisser-déposer');
});
