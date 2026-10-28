/**
 * La victoire sur la table : le camp vaincu s'efface en sable, l'indicateur se
 * fige sur « DUEL TERMINÉ » et le bilan s'ouvre par-dessus sans couper la scène.
 * node scripts/rpg-victoire-table-check.mjs
 *
 * Pratiquement aucun JS nouveau : la table porte déjà `data-territoire-termine`
 * et le panneau de fin existe ; il manquait le nom du vainqueur
 * (`data-vainqueur`) et la mise en scène. Tout le geste est donc en CSS,
 * piloté par attributs — transform et opacity seulement, une seconde environ,
 * et en mouvement réduit le camp perdant est simplement atténué, sans geste.
 * Le moteur et ses règles de victoire ne sont pas touchés.
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

// ── 1. La table nomme son vainqueur, sans nouveau état ni porte ────────────
assert.match(page, /data-territoire-termine=\{vainqueur \? 'true' : undefined\}\s*\n\s*data-vainqueur=\{vainqueur \?\? undefined\}/,
  'la table reçoit le nom du vainqueur dès que le duel bascule, rien avant');
assert.match(page, /const indicateurTour = vainqueur\s*\?\s*'DUEL TERMINÉ'/,
  'l’Astrolabe affiche « DUEL TERMINÉ » au tour exact de la victoire');
assert.match(page, /const classeIndicateurTour = vainqueur \? 'is-finished'/,
  'l’indicateur prend sa classe de fin, support du geste de figeage');
assert.match(page, /className=\{`rpg-overlay\$\{vainqueur === 'joueur' \? ' rpg-overlay--win' : ' rpg-overlay--loss'\}`\}/,
  'le bilan s’ouvre en panneau de victoire ou en voile de défaite, par-dessus la table');

// ── 2. La feuille : le camp vaincu s'affaisse, le gagnant reste ────────────
const positionBloc = css.indexOf('.card-table[data-vainqueur="joueur"]');
assert.ok(positionBloc > css.indexOf("Les flèches d'attaque et de blocage"),
  'le bloc est dans la zone FX gardée, après les flèches');
assert.ok(positionBloc < css.indexOf('LA TEMPÊTE DE SABLE'),
  'et avant la tempête, hors des slices des autres checks');
const selecteursPerdants = css.slice(positionBloc, css.indexOf('@keyframes rpg-victoire-sable'));
assert.match(selecteursPerdants, /\.card-table\[data-vainqueur="joueur"\] \.card-row--ennemi,/,
  'quand le joueur gagne, la rangée ennemie s’efface');
assert.match(selecteursPerdants, /\.card-table\[data-vainqueur="joueur"\] \.rpg-wizard-plate--ennemi,/,
  'et la plaque du sorcier avec elle');
assert.match(selecteursPerdants, /\.card-table\[data-vainqueur="sorcier"\] \.card-row--equipe,/,
  'quand le sorcier gagne, c’est votre rangée qui se dépose en sable');
assert.match(selecteursPerdants, /\.card-table\[data-vainqueur="sorcier"\] \.rpg-wizard-plate--joueur\s*\{/,
  'et votre plaque (dernier sélecteur de la règle)');
assert.match(selecteursPerdants, /animation:\s*rpg-victoire-sable calc\(1s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.4, \.1, \.6, 1\) both;/,
  'l’affaissement dure une seconde, en une seule fois');
const keyframesSable = extraireBloc(css, '@keyframes rpg-victoire-sable');
assert.doesNotMatch(keyframesSable, /(top|left|right|bottom|width|height|margin|padding):/,
  'l’effacement n’anime aucune propriété de mise en page');
assert.match(keyframesSable, /100% \{ opacity: \.22; transform: translateY\(12px\) scale\(\.96\); \}/,
  'le camp perdant se tasse vers le bas et pâlit, il ne s’envole pas');

// ── 3. L'Astrolabe se fige, puis le bilan entre en scène ───────────────────
// Plusieurs règles portent ces sélecteurs : la règle statique historique, celle
// de la zone FX, et désormais la surcharge `.rpg-battle.is-reduced`. On cherche
// donc la règle de geste strictement à l'intérieur de la slice victoire, pour ne
// pas récupérer la surcharge du mode réduit (placée plus bas dans la feuille).
const debutVictoire = css.indexOf('LA VICTOIRE SUR LA TABLE');
const finVictoire = css.indexOf('LA CARTE DÉLITÉE');
const zoneVictoire = css.slice(debutVictoire, finVictoire);
const positionIndicateurFx = debutVictoire + zoneVictoire.indexOf('.rpg-turn-indicator.is-finished {');
assert.ok(positionIndicateurFx > debutVictoire && positionIndicateurFx < finVictoire,
  'le geste de figeage vit dans la zone FX de la victoire');
const blocIndicateur = extraireBloc(css.slice(positionIndicateurFx), '.rpg-turn-indicator.is-finished {');
assert.match(blocIndicateur, /animation:\s*rpg-victoire-indicateur calc\(\.55s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.3, \.7, \.3, 1\) both;/,
  'l’indicateur se fige en un mouvement sec de 550 ms');
const keyframesIndicateur = extraireBloc(css, '@keyframes rpg-victoire-indicateur');
assert.match(keyframesIndicateur, /0% \{ opacity: \.3; transform: translateY\(-6px\) scale\(\.95\); \}/,
  'l’arrêt part d’un dernier tressaillement');
assert.match(keyframesIndicateur, /100% \{ opacity: 1; transform: none; \}/, 'et se stabilise nettement');

// Même prudence : la règle structurelle du panneau (centrage) existe plus
// haut dans la feuille ; on extrait la règle d’animation de la zone FX. La
// surcharge is-reduced utilise une liste de sélecteurs (`...--win,`), pas la
// forme `.rpg-overlay--win {`, donc la seule occurrence dans la slice est la bonne.
const positionWinFx = debutVictoire + zoneVictoire.indexOf('.rpg-overlay--win {');
assert.ok(positionWinFx > debutVictoire && positionWinFx < finVictoire,
  'l’entrée en scène du panneau vit dans la zone FX de la victoire');
const blocWin = extraireBloc(css.slice(positionWinFx), '.rpg-overlay--win {');
assert.match(blocWin, /animation:\s*rpg-victoire-panneau-win calc\(\.48s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.25, \.7, \.3, 1\) calc\(\.12s \* var\(--rpg-anim-scale, 1\)\) both;/,
  'le panneau de victoire s’ouvre après un court silence de mise en scène');
const keyframesWin = extraireBloc(css, '@keyframes rpg-victoire-panneau-win');
assert.match(keyframesWin, /100% \{ opacity: 1; transform: translate\(-50%, -50%\) scale\(1\); \}/,
  'l’image finale conserve le centrage translate(-50%, -50%) du panneau borné');
const keyframesLoss = extraireBloc(css, '@keyframes rpg-victoire-panneau-loss');
assert.match(keyframesLoss, /0% \{ opacity: 0; transform: translateY\(14px\) scale\(\.97\); \}/,
  'le voile de défaite monte depuis le bas');
assert.match(keyframesLoss, /100% \{ opacity: 1; transform: none; \}/, 'et se pose sans décalage');
for (const keyframes of [keyframesIndicateur, keyframesWin, keyframesLoss]) {
  assert.doesNotMatch(keyframes, /(top|left|right|bottom|width|height|margin|padding):/,
    'aucune propriété de mise en page dans les entrées en scène');
}
// Les règles structurelles existantes restent intactes (le check battle-ui les
// garde) : l’animation s’ajoute, elle ne remplace pas le centrage.
assert.match(css, /\.rpg-overlay--win\s*\{[^}]*inset:\s*auto;[^}]*left:\s*50%;[^}]*top:\s*50%;/s,
  'le panneau de victoire reste borné et centré comme avant');

// ── 4. Mouvement réduit : une atténuation statique, aucun geste ────────────
const mediaReduit = css.slice(css.indexOf('LA VICTOIRE SUR LA TABLE'), css.indexOf('LA CARTE DÉLITÉE'));
const blocReduit = mediaReduit.slice(mediaReduit.indexOf('@media (prefers-reduced-motion: reduce)'));
assert.match(blocReduit, /\.rpg-overlay--win,\s*\n\s*\.rpg-overlay--loss \{ animation: none; \}/,
  'le bilan ne fait pas d’entrée en mouvement réduit');
assert.match(blocReduit, /\.card-table\[data-vainqueur="sorcier"\] \.rpg-wizard-plate--joueur \{ opacity: \.35; \}/,
  'le camp vaincu reste désigné par une atténuation figée');
assert.match(blocReduit, /\.rpg-turn-indicator\.is-finished,/, 'l’indicateur aussi se tait');

// ── 5. Le moteur reste la source de vérité, sans mise en scène ─────────────
assert.equal(engine.includes('data-vainqueur'), false, 'aucun attribut de scène dans le moteur');
assert.equal(engine.includes('rpg-victoire'), false, 'aucune classe d’animation dans le moteur');
assert.match(engine, /export function rpgVainqueur\(duel\)/, 'le moteur continue de décider seul du vainqueur');

console.log('✓ Victoire sur la table : data-vainqueur bascule la scène — le camp perdant s’affaisse et pâlit en sable (1 s, transform/opacity), l’indicateur se fige sur « DUEL TERMINÉ » en 550 ms, le bilan borné s’ouvre par-dessus en 480 ms sans perdre son centrage ; mouvement réduit = simple atténuation statique, moteur et règles de victoire intacts');
