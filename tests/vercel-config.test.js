/**
 * `vercel.json` — les routes du site déployé.
 *
 * Le 29 octobre, la règle SPA a été écrite `/((?!api/|version.json).*)` : le `|`
 * dans le groupe de tête de lecture ne passe pas la compilation des routes de
 * Vercel, et **toutes** les URL du site se sont mises à répondre 500 — pendant
 * que le build, le déploiement et le statut Vercel restaient verts. Rien dans
 * le dépôt ne l'avait vu : aucun test ne lisait ce fichier.
 *
 * Ces vérifications tiennent la règle qui marchait. Elles n'atteignent pas le
 * réseau (impossible en test) : elles gardent la forme du fichier, celle dont
 * dépend le routage de la production.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brut = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8');
const config = JSON.parse(brut);

/** La source de la réécriture, telle que Vercel la compile. */
const sourceSpa = config.rewrites?.[0]?.source || '';
const motifSpa = new RegExp(`^${sourceSpa}$`);

test('vercel.json est du JSON strict', () => {
  // `JSON.parse`, plus haut, a déjà échoué si le fichier n'était pas du JSON :
  // c'est exactement ce que Vercel exige. On refuse en plus les commentaires en
  // début de ligne, que certains éditeurs ajoutent sans qu'on le voie.
  assert.equal(typeof config, 'object');
  assert.ok(!/^\s*(\/\/|\/\*)/m.test(brut), 'aucun commentaire dans vercel.json');
});

test('la réécriture SPA renvoie les pages vers /index.html', () => {
  assert.equal(config.rewrites?.length, 1, 'une seule réécriture : le reste est servi tel quel');
  assert.equal(config.rewrites[0].destination, '/index.html');
});

test('la source de la réécriture ne contient pas d’alternative « | »', () => {
  // C'est exactement ce qui a mis le site à genoux : `(?!api/|version.json)`.
  assert.ok(
    !sourceSpa.includes('|'),
    'le « | » dans le groupe de tête de lecture casse la compilation des routes Vercel → 500 sur tout le site',
  );
});

test('la réécriture attrape le site et laisse passer l’API', () => {
  for (const chemin of ['/', '/index.html', '/jeu/sablier-de-bab-el', '/jeu/sablier-de-bab-el/defi/ABC', '/profile/42']) {
    assert.ok(motifSpa.test(chemin), `${chemin} doit être servi par l’application`);
  }
  assert.ok(!motifSpa.test('/api/sablier-duel'), 'l’API ne doit pas être réécrite vers index.html');
});

test('version.json n’est jamais mis en cache', () => {
  const regle = (config.headers || []).find((entree) => entree.source === '/version.json');
  assert.ok(regle, 'une règle d’en-têtes doit viser /version.json');
  const cache = regle.headers.find((entree) => entree.key.toLowerCase() === 'cache-control');
  assert.ok(cache, 'Cache-Control manquant sur /version.json');
  assert.match(cache.value, /no-store/);
});

test('les en-têtes de sécurité sont complets et bien formés', () => {
  const globaux = (config.headers || []).find((entree) => entree.source === '/(.*)');
  assert.ok(globaux, 'la règle d’en-têtes globale a disparu');
  const parCle = new Map(globaux.headers.map((entree) => [entree.key.toLowerCase(), entree.value]));
  for (const cle of [
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'x-frame-options',
    'strict-transport-security',
  ]) {
    assert.ok(parCle.get(cle), `en-tête ${cle} manquant`);
    assert.ok(String(parCle.get(cle)).trim().length > 0, `en-tête ${cle} vide`);
  }

  for (const entree of config.headers || []) {
    assert.ok(entree.source?.startsWith('/'), `source d’en-têtes invalide : ${entree.source}`);
    for (const { key, value } of entree.headers) {
      assert.ok(key && typeof value === 'string' && value.length > 0, `${key} : valeur manquante`);
    }
  }
});
