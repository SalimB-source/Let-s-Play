/**
 * La main impaire et le médaillon du joueur.
 *
 *  À la souris large, la main s'ouvre en deux autour du portrait du joueur :
 *  une cale (`.rpg-hand__ecart`) réserve la largeur du médaillon, et les cartes
 *  se rangent de part et d'autre. Or la cale se pose au milieu du **contenu**
 *  de la main. À trois ou cinq cartes, une moitié en compte une de plus : le
 *  contenu est bancal, la cale glisse d'une demi-carte hors de l'axe, et une
 *  carte venait mourir sur le visage du personnage (le portrait, lui, ne bouge
 *  pas : il est posé sur l'axe de la table).
 *
 *  La page pose donc une **carte fantôme** invisible sur la moitié la plus
 *  courte, et la main s'élargit d'une place pour l'accueillir : les deux
 *  moitiés redeviennent égales, la cale retombe sur l'axe, et les cartes ne
 *  rétrécissent pas (elles se partagent même un peu plus de largeur).
 *
 *  Le test rejoue l'arithmétique sans navigateur — les largeurs viennent des
 *  vraies valeurs du CSS — et vérifie le contrat des feuilles et de la page.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/games/rpg-avatars-plateau.css', import.meta.url), 'utf8');
const battle = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');

const sansCommentaires = (texte) => texte.replace(/\/\*[\s\S]*?\*\//g, '');
const plateau = sansCommentaires(css);

/** Le bloc `@media (min-width: 900px) and (hover: hover) and (pointer: fine)`. */
function blocRail(texte) {
  const debut = texte.indexOf('@media (min-width: 900px) and (hover: hover) and (pointer: fine)');
  assert.ok(debut >= 0, 'le bloc du rail existe');
  let profondeur = 0;
  for (let i = texte.indexOf('{', debut); i < texte.length; i += 1) {
    if (texte[i] === '{') profondeur += 1;
    else if (texte[i] === '}') {
      profondeur -= 1;
      if (profondeur === 0) return texte.slice(debut, i + 1);
    }
  }
  throw new Error('bloc du rail non refermé');
}

const rail = blocRail(plateau);
const clamp = (min, valeur, max) => Math.max(min, Math.min(valeur, max));

// ── Le modèle de la main : cale, cartes, gouttières ─────────────────────────
/**
 * Où tombe la cale par rapport au centre du contenu ?
 * `carte` : largeur d'une carte, `gouttiere` : la gouttière de la main,
 * `cale` : la largeur de la cale, `nombre` : nombre de cartes, `fantome` :
 * la carte fantôme est-elle posée à gauche ?
 */
function ecartCale({ carte, gouttiere, cale, nombre, fantome }) {
  const coupe = Math.floor(nombre / 2);
  const objets = nombre + 1 + (fantome ? 1 : 0);          // cartes + cale (+ fantôme)
  const total = (nombre + (fantome ? 1 : 0)) * carte + cale + (objets - 1) * gouttiere;
  const centreCale = (coupe + (fantome ? 1 : 0)) * (carte + gouttiere) + cale / 2;
  return { centreCale, centreContenu: total / 2, ecart: centreCale - total / 2 };
}

/** La largeur des cartes une fois la main resserrée dans sa boîte. */
function largeurCartes({ carte, gouttiere, cale, nombre, boite, fantome }) {
  const objets = nombre + 1 + (fantome ? 1 : 0);
  const besoin = (nombre + (fantome ? 1 : 0)) * carte + cale + (objets - 1) * gouttiere;
  if (besoin <= boite) return carte;
  return carte - (besoin - boite) / objets;               // part égale : même base, même facteur
}

/** Les tailles réelles du plateau, sur trois écrans larges à la souris. */
const ECRANS = [
  [1120, 720, 'portable 1120'],
  [1280, 720, 'portable 1280'],
  [1440, 800, 'écran 1440'],
  [1920, 1080, 'écran 1920'],
];

function mesures(largeur) {
  const carte = clamp(64, 0.072 * largeur, 108);          // .rpg-hand__card : flex 0 1 clamp(64px, 7.2vw, 108px)
  const gouttiere = clamp(8, 0.01 * largeur, 18);         // .rpg-hand : gap clamp(8px, 1vw, 18px)
  const avatar = clamp(84, 0.104 * largeur, 140);         // --rpg-avatar-plateau
  const vie = clamp(90, 0.1 * largeur, 140);              // --rpg-vie-bar-width
  const decalage = (clamp(220, 0.2 * largeur, 280) - clamp(150, 0.15 * largeur, 254)) / 2;
  const boite = 0.5 * largeur + decalage - Math.max(avatar, vie) / 2 - 28;
  const cale = avatar + 26;
  return { carte, gouttiere, cale, boite };
}

test('la cale fantôme porte exactement la largeur d’une carte, et se resserre comme elle', () => {
  const fantome = rail.match(/\.rpg-hand__cale-fantome \{([\s\S]*?)\}/)?.[1] ?? '';
  assert.ok(fantome, 'la carte fantôme a ses styles');
  assert.match(fantome, /display:\s*block/);
  assert.match(fantome, /flex:\s*0 1 clamp\(64px, 7\.2vw, 108px\);/,
    'même base et même facteur de resserrement que les cartes');
  assert.match(fantome, /min-width:\s*0;/, 'elle se resserre au lieu de bloquer la main');
  assert.match(fantome, /visibility:\s*hidden;/, 'elle est invisible : elle ne compte pas comme une carte');
  assert.match(fantome, /pointer-events:\s*none;/, 'et elle ne capte aucun clic');
  // La base est celle des cartes de la main : une copie qui divergerait
  // casserait l'équilibre d'une demi-carte.
  assert.match(sansCommentaires(battle),
    /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-hand__card \{[^}]*flex: 0 1 clamp\(64px, 7\.2vw, 108px\);/s,
    'la base de la fantôme est celle des cartes de la main (rpg-battle.css)');
});

test('la carte fantôme n’existe qu’au rail : la tablette et le doigt gardent leur main', () => {
  assert.ok(!plateau.slice(0, plateau.indexOf('@media (min-width: 900px)')).includes('cale-fantome'),
    'aucune trace de la fantôme hors du rail');
  // Au doigt, la main défile et n'a pas de cale : la fantôme doit disparaître.
  assert.doesNotMatch(rail.replace(/\.rpg-hand__cale-fantome \{[\s\S]*?\}/, ''), /cale-fantome/);
});

test('la main impaire s’élargit d’une place : les cartes ne rétrécissent pas', () => {
  assert.match(plateau, /--rpg-main-slot: calc\(clamp\(64px, 7\.2vw, 108px\) \+ clamp\(8px, 1vw, 18px\)\);/,
    'une place = une carte + une gouttière');
  assert.match(plateau, /\.rpg-hand\.is-main-impaire \{\s*width: calc\(var\(--rpg-main-boite\) \+ var\(--rpg-main-slot\)\);/,
    'la main impaire ajoute une place à sa boîte');
  for (const [largeur, , nom] of ECRANS) {
    const m = mesures(largeur);
    for (const nombre of [1, 3, 5, 7, 9]) {
      const avant = largeurCartes({ ...m, nombre, fantome: false, boite: m.boite });
      const apres = largeurCartes({ ...m, nombre, fantome: true, boite: m.boite + m.carte + m.gouttiere });
      assert.ok(apres >= avant - 0.001,
        `${nom}, ${nombre} cartes : les cartes gardent leur taille (${avant.toFixed(1)} → ${apres.toFixed(1)} px)`);
      // Une main chargée resserre les cartes, ici comme avant ; seule la
      // fantôme ne doit rien coûter. En deçà de huit cartes, la carte reste
      // franchement lisible.
      if (nombre <= 7) {
        assert.ok(apres >= 40,
          `${nom}, ${nombre} cartes : une carte reste lisible (${apres.toFixed(1)} px)`);
      }
    }
  }
});

test('la cale retombe sur l’axe avec la fantôme, et une demi-carte à côté sans elle', () => {
  for (const [largeur, , nom] of ECRANS) {
    const m = mesures(largeur);
    for (let nombre = 0; nombre <= 12; nombre += 1) {
      const fantome = nombre % 2 === 1;
      const avec = ecartCale({ ...m, nombre, fantome });
      assert.ok(Math.abs(avec.ecart) < 0.001,
        `${nom}, ${nombre} cartes : la cale tombe sur l'axe du contenu (${avec.ecart.toFixed(2)} px)`);
      if (fantome) {
        // Sans la fantôme, la cale s'écarte d'une demi-carte : c'est le défaut
        // corrigé — une carte venait sous le portrait du joueur.
        const sans = ecartCale({ ...m, nombre, fantome: false });
        const demiCarte = (m.carte + m.gouttiere) / 2;
        assert.ok(Math.abs(sans.ecart + demiCarte) < 0.001,
          `${nom}, ${nombre} cartes : sans fantôme, la cale glisse de ${demiCarte.toFixed(1)} px`);
      }
    }
  }
});

test('la page pose la fantôme et la classe de parité', () => {
  assert.match(page, /const coupeMain = Math\.floor\(groupesMain\.length \/ 2\);/);
  assert.match(page, /const caleFantome = groupesMain\.length % 2 === 1;/,
    'la parité décide de la fantôme');
  assert.match(page, /className=\{`rpg-hand\$\{caleFantome \? ' is-main-impaire' : ''\}`\}/);
  assert.match(page, /\{caleFantome && <span className="rpg-hand__cale-fantome" aria-hidden="true" \/>\}/,
    'la fantôme ouvre la main, avant la première carte');
  // Elle précède la première carte : c'est la moitié gauche qu'elle complète.
  const fantome = page.indexOf('rpg-hand__cale-fantome');
  const premiereCarte = page.indexOf('groupesMain.map((groupe, position)');
  assert.ok(fantome > 0 && premiereCarte > fantome, 'la fantôme est le premier enfant de la main');
});
