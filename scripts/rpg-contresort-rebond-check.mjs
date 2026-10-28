/**
 * Le rebond du contresort : la réponse heurte le sort adverse, s'écrase au
 * centre de la table et le renvoie, avant de se stabiliser.
 * node scripts/rpg-contresort-rebond-check.mjs
 *
 * Aucun changement de composant ni de moteur : la fiche centrale du sort joué
 * porte déjà sa variante `rpg-spell-played--contre` quand l'annonce est un
 * contre. Le geste est donc 100 % CSS — une animation dédiée remplace
 * l'arrivée tranquille, pilotée par une variable de sens `--rebond` (1 joueur,
 * -1 sorcier). Transform et opacity seulement, 520 ms, fiche stable à l'arrivée
 * et immobile en mouvement réduit.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

function extraireBloc(texte, marqueur) {
  const debut = texte.indexOf(marqueur);
  assert.ok(debut >= 0, `${marqueur} existe`);
  let profondeur = 0;
  let fin = -1;
  for (let i = texte.indexOf('{', debut); i < texte.length; i += 1) {
    if (texte[i] === '{') profondeur += 1;
    if (texte[i] === '}') {
      profondeur -= 1;
      if (profondeur === 0) { fin = i; break; }
    }
  }
  assert.ok(fin > debut, `${marqueur} forme un bloc fermé`);
  return texte.slice(debut, fin + 1);
}

// ── 1. La variante contre porte son propre geste, orienté selon le camp ─────
const blocContre = extraireBloc(css, '.rpg-spell-played--contre {');
assert.match(blocContre, /--rebond:\s*1;/, 'le contresort du joueur pousse le geste vers le haut');
assert.match(blocContre, /animation:\s*rpg-contresort-rebond calc\(\.52s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.35, \.7, \.3, 1\) both;/,
  'la fiche contre remplace l’arrivée tranquille par le rebond de 520 ms');
assert.match(blocContre, /border-color:\s*rgba\(255, 206, 110, \.9\);/, 'la bordure dorée reconnaissable reste en place');
const blocSensAdverse = extraireBloc(css, '.rpg-spell-played--sorcier.rpg-spell-played--contre {');
assert.match(blocSensAdverse, /--rebond:\s*-1;/,
  'un contre du sorcier inverse le sens : sa réponse vient du haut et repart vers le bas');

// ── 2. Les images clés racontent le choc, sans une seule propriété de layout ─
const positionKeyframes = css.indexOf('@keyframes rpg-contresort-rebond');
assert.ok(positionKeyframes > css.indexOf("Les flèches d'attaque et de blocage"),
  'les images clés sont dans la zone FX gardée, après les flèches');
assert.ok(positionKeyframes < css.indexOf('LA TEMPÊTE DE SABLE'),
  'et avant la tempête, hors des slices des autres checks');
const keyframes = extraireBloc(css, '@keyframes rpg-contresort-rebond');
assert.doesNotMatch(keyframes, /(top|left|right|bottom|width|height|margin|padding):/,
  'le rebond n’anime aucune propriété de mise en page');
assert.match(keyframes, /translateY\(calc\(var\(--rebond, 1\) \* 28px\)\)/,
  'la fiche bondit depuis le camp du répondant');
assert.match(keyframes, /44% \{[^}]*scale\(1\.07, \.91\)/s, 'à l’impact, la fiche s’aplatit (squash)');
assert.match(keyframes, /58% \{[^}]*translateY\(calc\(var\(--rebond, 1\) \* -12px\)\)/s,
  'le choc la renvoie vers l’origine du sort contré');
assert.match(keyframes, /100% \{[^}]*opacity: 1;[^}]*transform: none;/s,
  'la fiche se stabilise au repos : ses informations restent lisibles jusqu’à sa disparition programmée');

// ── 3. Mouvement réduit : la bordure dorée suffit, la fiche ne rebondit pas ─
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-spell-played \{ animation: none; \}[\s\S]*?\.rpg-spell-played--contre \{ animation: none; \}\s*\}/,
  'en mouvement réduit, le contresort garde son arrivée instantanée et son code couleur, sans rebond');
// La fiche normale, elle, garde son arrivée d’origine : le geste est bien
// limité à la variante contre.
const blocBase = extraireBloc(css, '.rpg-spell-played {');
assert.match(blocBase, /animation:\s*rpg-spell-arrival \.28s ease-out both;/,
  'les autres fiches conservent leur animation d’arrivée habituelle');
assert.doesNotMatch(blocBase, /rpg-contresort-rebond/, 'le rebond ne déborde jamais hors de la variante contre');

// ── 4. Le câblage existant identifie bien les contres des deux camps ────────
assert.match(page, /\$\{contre \? ' rpg-spell-played--contre' : ''\}/,
  'la fiche reçoit sa variante seulement quand l’annonce est un contre');
assert.match(page, /const contre = Boolean\(annonce\.contre\);/, 'la variante dérive du drapeau porté par l’annonce');
assert.match(page, /annoncerMagieSorcier\(contre, \{[\s\S]{0,220}?\}, \{ contre: true \}\);/,
  'le contresort du sorcier (réponse à votre annonce) allume la variante');
assert.match(page, /annoncerMagie\(carte, cibleDecrite, \{ contre: true \}\);/,
  'votre contresort aussi');
assert.match(page, /if \(contre\) \{\s*jouerSfx\('card_countered'\);/,
  'le son du contresort reste joué : le geste s’ajoute au retour sonore, il ne le remplace pas');

// ── 5. Le moteur reste une source de vérité sans habillage visuel ──────────
assert.equal(engine.includes('rpg-contresort'), false, 'aucune classe d’animation dans le moteur');
assert.equal(engine.includes('rpg-spell-played'), false, 'le moteur ne connaît pas la fiche');
assert.match(engine, /return \{ ok: true, contre: true, parIA: cote === 'sorcier', carteContree: annonce\.carteId, carteContre: carte\.id \};/,
  'le moteur se contente de dire qu’un contre a eu lieu : la page l’illustre');

console.log('✓ Rebond du contresort : la fiche dorée bondit depuis le camp du répondant (520 ms, --rebond 1/-1), s’écrase au centre en squash, encaisse le choc en arrière puis se stabilise au repos — geste 100 % CSS sur la variante existante, transform/opacity seulement, fiche normale inchangée, immobilisé en mouvement réduit, son conservé et moteur vierge de tout visuel');
