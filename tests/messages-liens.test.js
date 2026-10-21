// Les liens dans un message — `src/messages/liensTexte.js`.
//
// Rien de visuel ici : on vérifie le découpage, c'est-à-dire les cas où une
// URL collée dans une bulle doit s'ouvrir, et ceux où elle doit rester du
// texte (ponctuation de phrase, schéma dangereux, faux positif).
//
// Lancer avec `npm run check:messages`.
import test from 'node:test';
import assert from 'node:assert/strict';

import { contientLien, decouperLiens } from '../src/messages/liensTexte.js';

/** Raccourci : la suite des types, pour lire un découpage d'un coup d'œil. */
const types = (texte) => decouperLiens(texte).map((morceau) => morceau.type);

/** Raccourci : les adresses reconnues. */
const liens = (texte) => decouperLiens(texte)
  .filter((morceau) => morceau.type === 'lien')
  .map((morceau) => morceau.href);

/** Reconstruit le message : le découpage ne doit jamais rien perdre. */
const recoller = (texte) => decouperLiens(texte).map((morceau) => morceau.valeur).join('');

test('un message sans lien reste un seul morceau de texte', () => {
  const texte = 'On se capte ce soir ?';
  assert.deepEqual(decouperLiens(texte), [{ type: 'texte', valeur: texte }]);
  assert.equal(contientLien(texte), false);
  // Les nombres, les tirets et les points d'un texte ordinaire ne font pas un lien.
  assert.deepEqual(types('Il me reste 3 cartes, 1.5 mana et des dégâts -2.'),
    ['texte']);
});

test('le lien du Sablier collé dans une bulle devient cliquable', () => {
  const lien = 'https://let-s-play.vercel.app/jeu/sablier-de-bab-el/defi/AB12CD34';
  const texte = `Viens, on joue ici ${lien}`;
  assert.deepEqual(decouperLiens(texte), [
    { type: 'texte', valeur: 'Viens, on joue ici ' },
    { type: 'lien', valeur: lien, href: lien },
  ]);
  assert.equal(contientLien(texte), true);
  assert.equal(recoller(texte), texte);
});

test('la ponctuation de fin de phrase n’entre pas dans l’URL', () => {
  assert.deepEqual(liens('Regarde https://exemple.fr/x.'), ['https://exemple.fr/x']);
  assert.deepEqual(liens('Ici https://a.fr, et là https://b.fr!'),
    ['https://a.fr', 'https://b.fr']);
  // Le texte qui suit garde sa ponctuation, mot pour mot.
  assert.equal(recoller('Ici https://a.fr, et là https://b.fr!'),
    'Ici https://a.fr, et là https://b.fr!');
});

test('les parenthèses restent dans l’URL quand elles lui appartiennent', () => {
  // Équilibrées dans l'URL : on garde.
  assert.deepEqual(liens('https://exemple.fr/a_(b)'), ['https://exemple.fr/a_(b)']);
  // Ouverte hors de l'URL (une phrase entre parenthèses) : on retire la fermeture.
  assert.deepEqual(liens('(voir https://exemple.fr/x)'), ['https://exemple.fr/x']);
  assert.equal(recoller('(voir https://exemple.fr/x)'), '(voir https://exemple.fr/x)');
});

test('une adresse sans schéma (www.) est acceptée, un schéma dangereux non', () => {
  assert.deepEqual(decouperLiens('www.exemple.fr'), [
    { type: 'lien', valeur: 'www.exemple.fr', href: 'https://www.exemple.fr' },
  ]);
  // Ce que la messagerie ne doit jamais rendre cliquable.
  for (const dangereux of [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox',
    'file:///etc/passwd',
  ]) {
    assert.deepEqual(types(dangereux), ['texte'], `${dangereux} doit rester du texte`);
    assert.equal(contientLien(dangereux), false);
  }
});

test('un schéma seul, ou une entrée vide, ne produit pas de lien', () => {
  assert.deepEqual(types('https://'), ['texte']);
  assert.deepEqual(decouperLiens(''), []);
  assert.deepEqual(decouperLiens(null), []);
  assert.deepEqual(decouperLiens(undefined), []);
  assert.deepEqual(decouperLiens(42), []);
});

test('un message qui n’est qu’un lien est bien un lien', () => {
  // Le piège du rendu : un unique morceau n'est pas forcément du texte.
  assert.deepEqual(decouperLiens('https://exemple.fr'), [
    { type: 'lien', valeur: 'https://exemple.fr', href: 'https://exemple.fr' },
  ]);
});

test('le même message, avec plusieurs liens, garde son ordre', () => {
  const texte = 'A https://a.fr puis B www.b.fr puis C';
  assert.deepEqual(decouperLiens(texte), [
    { type: 'texte', valeur: 'A ' },
    { type: 'lien', valeur: 'https://a.fr', href: 'https://a.fr' },
    { type: 'texte', valeur: ' puis B ' },
    { type: 'lien', valeur: 'www.b.fr', href: 'https://www.b.fr' },
    { type: 'texte', valeur: ' puis C' },
  ]);
  assert.equal(recoller(texte), texte);
});

test('les accents et les retours à la ligne survivent au découpage', () => {
  const texte = 'Défi reçu :\nhttps://exemple.fr/défi/AB12CD34\nÀ tout de suite !';
  assert.equal(recoller(texte), texte);
  assert.deepEqual(liens(texte), ['https://exemple.fr/défi/AB12CD34']);
});
