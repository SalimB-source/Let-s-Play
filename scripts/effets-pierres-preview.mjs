/**
 * La page de revue des pierres d'effets — `scripts/effets-pierres-preview.mjs`
 *
 * Assemble, sans navigateur ni React, le balisage réel des emblèmes (sprite des
 * symboles + `plaqueSvg`) et la feuille `effet-icons.css` dans une page unique :
 * une face de carte, les pastilles d'une fiche, toutes les pierres rangées par
 * famille, l'échelle des tailles et les états (dépensée, en attente).
 *
 *   node scripts/effets-pierres-preview.mjs
 *   node scripts/effets-pierres-preview.mjs --out /tmp/pierres.html
 *
 * Par défaut la page s'écrit dans `public/preview-effets-pierres.html`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { EFFETS_SPRITE, EFFET_LIBELLES, pastillesPourCarte } from '../src/games/effetIcons.js';
import { cardById } from '../src/games/rpgCards.js';
import {
  PLAQUE_FAMILLES,
  PLAQUE_FAMILLE_EFFET,
  PLAQUE_PIERRES,
  plaqueSvg,
} from '../src/games/effetPlaques.js';

const racine = new URL('../', import.meta.url);
const lire = (chemin) => readFileSync(new URL(chemin, racine), 'utf8');
const css = lire('src/games/effet-icons.css');

const argument = process.argv.indexOf('--out');
const sortie = argument > -1
  ? process.argv[argument + 1]
  : fileURLToPath(new URL('public/preview-effets-pierres.html', racine));

const echapper = (texte) => String(texte)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const pastille = (cle, libelle, { epuise = false, inactif = false, valeur = null } = {}) => `
        <span class="rpg-pastille${epuise ? ' is-epuisee' : ''}${inactif ? ' is-inactif' : ''}" data-pastille="${cle}">
          ${plaqueSvg(cle, { size: 20 })}
          <span>${echapper(libelle)}${valeur != null ? ` ${valeur}` : ''}</span>
        </span>`;

const badge = (cle, valeur = null, etat = '') => `
          <span class="rpg-card-icone${etat ? ` ${etat}` : ''}" data-effet="${cle}">
            ${plaqueSvg(cle, { size: 18 })}
            ${valeur != null ? `<small>${valeur}</small>` : ''}
          </span>`;

/** Les pastilles réelles d'une fiche : la revue ne montre pas des exemples inventés. */
function pastillesDe(id) {
  return pastillesPourCarte(cardById(id))
    .map((p) => pastille(p.cle, p.label, { valeur: p.valeur }))
    .join('');
}

const familles = Object.entries(PLAQUE_FAMILLES).map(([famille, { forme, pierre, libelle }]) => {
  const cles = Object.keys(PLAQUE_FAMILLE_EFFET).filter((cle) => PLAQUE_FAMILLE_EFFET[cle] === famille);
  const pierres = PLAQUE_PIERRES[pierre];
  const pierresHtml = cles.map((cle) => `
          <li class="pierre">
            ${plaqueSvg(cle, { size: 40, titre: EFFET_LIBELLES[cle] ?? cle })}
            <b>${echapper(EFFET_LIBELLES[cle] ?? cle)}</b>
            <i>${echapper(cle)}</i>
          </li>`).join('');
  return `
      <section class="famille" data-famille="${famille}">
        <header>
          <span class="teinte" style="background: ${pierres.fond}; box-shadow: inset 0 1px 0 ${pierres.lueur}"></span>
          <h2>${echapper(libelle)}</h2>
          <p>${forme} · ${pierre} · ${cles.length} effets</p>
        </header>
        <ul class="pierres">${pierresHtml}
        </ul>
      </section>`;
}).join('');

const tailles = [12, 14, 16, 18, 20, 24, 32]
  .map((taille) => `
        <figure class="taille">
          ${plaqueSvg('furie', { size: taille })}
          ${plaqueSvg('bouclier', { size: taille })}
          ${plaqueSvg('pioche', { size: taille })}
          <figcaption>${taille} px</figcaption>
        </figure>`)
  .join('');

const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Le Sablier — les pierres d'effets</title>
<style>
${css}
</style>
<style>
  :root { color-scheme: dark; --sans: system-ui, -apple-system, 'Segoe UI', sans-serif; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 32px clamp(16px, 4vw, 56px) 72px;
    background: radial-gradient(1200px 620px at 50% -10%, #2a2018 0%, #14100e 55%, #0b0908 100%);
    color: #efe4cf;
    font: 400 15px/1.6 var(--sans);
  }
  h1 { margin: 0 0 6px; font: 800 clamp(24px, 3.4vw, 38px)/1.1 var(--sans); letter-spacing: -.01em; }
  .chapeau { max-width: 72ch; margin: 0 0 34px; color: #c9bda8; }
  .chapeau b { color: #edcb8b; }
  h2 { margin: 0; font: 750 17px/1.2 var(--sans); letter-spacing: .02em; }
  section { margin-bottom: 44px; }
  .titre-section { display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px; }
  .titre-section p { margin: 0; color: #a2957f; font-size: 13px; }

  /* La face de carte factice : fond sombre, illustration de fortune, et la
     rangée d'emblèmes à sa place réelle (bas de l'illustration). */
  .face {
    position: relative;
    width: 260px;
    aspect-ratio: 5 / 7;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid rgba(237, 203, 139, .35);
    background:
      radial-gradient(120% 80% at 50% 0%, #4a3a29 0%, #2a211a 45%, #14100e 100%),
      #14100e;
    box-shadow: 0 18px 40px rgba(0, 0, 0, .55);
  }
  .face__coins { display: flex; gap: 16px; padding: 12px; }
  .face__coins div { width: 26px; height: 34px; border-radius: 6px; background: #1d1712; border: 1px solid rgba(237, 203, 139, .28); }
  .face__nom {
    position: absolute; inset: auto 0 76px; text-align: center;
    font: 800 14px/1.2 var(--sans); letter-spacing: .06em; text-transform: uppercase; color: #f3e7cf;
  }
  .face .rpg-card-icones { bottom: 44px; }
  .galerie-faces { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start; }

  .pastilles-demo { display: flex; gap: 28px; flex-wrap: wrap; }
  .fiche {
    min-width: 240px; max-width: 320px; padding: 16px 18px; border-radius: 12px;
    border: 1px solid rgba(237, 203, 139, .22); background: rgba(10, 12, 15, .72);
  }
  .fiche h3 { margin: 0 0 10px; font: 750 13px/1.2 var(--sans); letter-spacing: .08em; text-transform: uppercase; color: #edcb8b; }

  .famille {
    padding: 16px 18px 6px; border-radius: 14px;
    border: 1px solid rgba(237, 203, 139, .16); background: rgba(9, 11, 14, .6);
  }
  .famille header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .famille header p { margin: 0 0 0 auto; color: #93866f; font-size: 12px; }
  .teinte { width: 14px; height: 14px; border-radius: 4px; }
  .pierres { display: flex; flex-wrap: wrap; gap: 6px 4px; margin: 0 0 12px; padding: 0; list-style: none; }
  .pierre { width: 92px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 4px; text-align: center; }
  .pierre b { font: 650 11.5px/1.25 var(--sans); color: #f0e6d3; }
  .pierre i { font: 400 10px/1.2 ui-monospace, 'SFMono-Regular', Menlo, monospace; color: #8d8171; font-style: normal; }

  .echelle { display: flex; gap: 22px; flex-wrap: wrap; align-items: flex-end; }
  .taille { margin: 0; display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-radius: 10px; background: rgba(9, 11, 14, .6); }
  .taille figcaption { margin-left: 4px; color: #93866f; font-size: 12px; }

  .etats { display: flex; gap: 28px; flex-wrap: wrap; }
  .etats > div { padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(237, 203, 139, .16); background: rgba(9, 11, 14, .6); }
  .etats p { margin: 8px 0 0; color: #a2957f; font-size: 12.5px; }
</style>
</head>
<body>
${EFFETS_SPRITE}
  <h1>Les pierres d'effets</h1>
  <p class="chapeau">
    Le pictogramme ne flotte plus sur le texte : il se pose sur une <b>pierre taillée</b> —
    fond saturé, biseau clair en haut, ombre en bas, liseré sombre, symbole en blanc.
    Les <b>effets</b> sont tous dans un hexagone ; couleur, type et coût utilisent un losange.
  </p>

  <section>
    <div class="titre-section"><h2>Sur une face de carte</h2><p>la pierre est le badge — plus de pastille ronde, le chiffre garde la sienne</p></div>
    <div class="galerie-faces">
      <div class="face">
        <div class="face__coins"><div></div><div></div></div>
        <div class="face__nom">Jarl au marteau de guerre</div>
        <span class="rpg-card-icones rpg-card-icones--catalogue">
          ${badge('provocation')}${badge('overkill')}${badge('furie', 2)}
        </span>
      </div>
      <div class="face">
        <div class="face__coins"><div></div><div></div></div>
        <div class="face__nom">Maître du marteau</div>
        <span class="rpg-card-icones rpg-card-icones--catalogue">
          ${badge('envol')}${badge('overkill')}${badge('furie', 3)}${badge('tenacite')}
        </span>
      </div>
      <div class="face">
        <div class="face__coins"><div></div><div></div></div>
        <div class="face__nom">Maître du marteau — en attente</div>
        <span class="rpg-card-icones rpg-card-icones--catalogue">
          ${badge('envol', null, 'is-inactif')}${badge('overkill', null, 'is-inactif')}${badge('furie', 3)}
        </span>
      </div>
    </div>
  </section>

  <section>
    <div class="titre-section"><h2>Les pastilles d'une fiche</h2><p>l'emblème ouvre le mot, le mot reste écrit</p></div>
    <div class="pastilles-demo">
      <div class="fiche"><h3>Jarl au marteau de guerre</h3><span class="rpg-pastilles">${pastillesDe('jarl-au-marteau-de-guerre')}
        </span></div>
      <div class="fiche"><h3>Salem</h3><span class="rpg-pastilles">${pastillesDe('salem')}
        </span></div>
      <div class="fiche"><h3>Lionne du Midi ardent</h3><span class="rpg-pastilles">${pastillesDe('lionne-du-midi-ardent')}
        </span></div>
      <div class="fiche"><h3>Onna Musha des cendres</h3><span class="rpg-pastilles">${pastillesDe('onna-musha-des-cendres')}
        </span></div>
    </div>
  </section>

  <section>
    <div class="titre-section"><h2>Toutes les pierres</h2><p>rangées par famille, avec leur clé de code</p></div>
    ${familles}
  </section>

  <section>
    <div class="titre-section"><h2>L'échelle</h2><p>12 px dans une main mobile, 18 px sur une face, 20 px dans une pastille</p></div>
    <div class="echelle">${tailles}
    </div>
  </section>

  <section>
    <div class="titre-section"><h2>Les états</h2><p>une pierre dépensée reste à sa place, éteinte</p></div>
    <div class="etats">
      <div>
        <span class="rpg-pastilles">
          ${pastille('tenacite', 'Ténacité')}
          ${pastille('tenacite', 'Ténacité', { epuise: true })}
        </span>
        <p>Ténacité prête, puis dépensée.</p>
      </div>
      <div>
        <span class="rpg-pastilles">
          ${pastille('bouclier', 'Bouclier')}
          ${pastille('bouclier', 'Bouclier', { epuise: true })}
        </span>
        <p>Parade en place, puis tombée.</p>
      </div>
      <div>
        <span class="rpg-pastilles">
          ${pastille('envol', 'Envol (furie)')}
          ${pastille('envol', 'Envol (furie)', { inactif: true })}
        </span>
        <p>Gain de Furie activé, puis encore en attente.</p>
      </div>
      <div>
        <span class="rpg-pastilles">
          ${pastille('protection', 'Bouclier Braise')}
          ${pastille('protection', 'Bouclier Neige')}
          ${pastille('malediction', 'Malédiction')}
        </span>
        <p>La Protection élémentaire teinte sa pierre de l'élément repoussé.</p>
      </div>
    </div>
  </section>
</body>
</html>
`;

writeFileSync(sortie, page);
console.log(`✓ Pierres d'effets : ${Object.keys(PLAQUE_FAMILLE_EFFET).length} effets, `
  + `${Object.keys(PLAQUE_FAMILLES).length} familles — page écrite dans ${sortie}`);
