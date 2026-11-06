import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { LIMITE_RESUME, resumeCarte, simplifierRegleCarte, regleCarteLongue, conditionEmbuscadePourApercu, conditionEmbuscadeCourtePourApercu, texteApercuSansDoublons } from '../src/games/rpgCardResume.js';
import { cardById, RPG_DUEL_CARDS, cardHasPrintedType } from '../src/games/rpgCards.js';
import { effetsDetailles } from '../src/games/effetIcons.js';

/**
 * L'aperçu d'une carte ne peut pas réciter trois lignes de règles.
 * `rpgCardResume.js` raccourcit les mots-clés connus ; ces tests les tiennent
 * fixés sur les textes réellement imprimés — un raccourci qui ne mord plus ne
 * se voit nulle part ailleurs (le jeu et les fiches lisent la règle entière).
 */

test('la Contre-attaque se raccourcit dans les deux formulations du catalogue', () => {
  // « quand c’est un sort qui le cible » — Tojiro, Kusayla.
  for (const id of ['tojiro-le-pourfendeur', 'kusayla-roi-des-imazighen']) {
    const court = simplifierRegleCarte(cardById(id));
    // Le nettoyage des blancs colle les deux-points (`\s+([.;:,])` → `$1`).
    assert.match(court, /Contre-attaque ?: riposte aux coups et aux sorts\./u, id);
    assert.doesNotMatch(court, /lui inflige ses dégâts d’attaque/u, id);
  }
  // « quand c’est un sort — ciblé ou de zone — qui l’atteint » — Eirik.
  const eirik = simplifierRegleCarte(cardById('eirik-du-premier-serment'));
  assert.match(eirik, /Contre-attaque ?: riposte aux coups et aux sorts\./u);
  assert.doesNotMatch(eirik, /ciblé ou de zone/u, 'la définition complète reste sur la fiche');
});

test('la Compagnie d’Eirik tient en une ligne dans l’aperçu', () => {
  const court = simplifierRegleCarte(cardById('eirik-du-premier-serment'));
  assert.match(court, /Compagnie ?: \+1\/\+1 par autre Viking de son camp\./u);
  const resume = resumeCarte(cardById('eirik-du-premier-serment'));
  assert.ok(resume.length <= LIMITE_RESUME + 1, `résumé trop long (${resume.length})`);
  assert.match(resume, /^Contre-attaque/u, 'le résumé commence par le mot-clé, pas par sa définition');
});

test('la règle complète reste entière sur la carte', () => {
  const carte = cardById('eirik-du-premier-serment');
  assert.equal(regleCarteLongue(carte), true, 'l’aperçu sait qu’il doit ajouter le bloc défilant');
  assert.match(carte.text, /quand c’est un sort — ciblé ou de zone — qui l’atteint/u);
  assert.match(carte.text, /Compagnie — Tant qu’il est en jeu/u);
});

test('les previews ne répètent pas la règle déjà décrite par une pastille jaune', () => {
  const texte = (id) => texteApercuSansDoublons(effetsDetailles(cardById(id)));
  assert.equal(texte('feriel'), '', 'les deux capacités sont intégralement dans les pastilles');
  assert.equal(texte('faucon-du-zenith'), '', 'le Bouclier imprimé rejoint aussi sa pastille');
  assert.equal(texte('ifrit-al-ahmar'), '', 'le Bouclier élémentaire ne se répète pas');
  assert.equal(texte('reanimation'), '', 'la même Réanimation, écrite dans un autre ordre, ne se répète pas');
  assert.equal(texte('nom-efface'), '', 'une phrase incluse dans la bulle Défausse disparaît');
  assert.equal(texte('maitre-du-marteau'), 'Quand il arrive : son marteau frappe — 3 dégâts à une créature ou au sorcier adverse, au choix.',
    'la Furie prêtant Envol et Overkill est déjà signalée par leurs pastilles');
  assert.equal(texte('salem'), 'Quand Salem arrive : il reçoit un bouclier. Il riposte même si le coup le détruit.',
    'le déclencheur et la précision non couverte restent, pas la règle du Bouclier');
  assert.equal(texte('gardienne-du-croissant'),
    'À son arrivée : une créature alliée ciblée gagne +0/+2 et reçoit un bouclier.',
    'le bénéfice distinct et la cible restent, pas la mécanique du Bouclier');
  assert.match(texte('vampire-des-braises'), /Quand elle bloque une créature/u,
    'les blessures préalables sans pastille restent visibles');
  assert.match(texte('lame-de-mer'), /^Cible : une créature\. Si sa défense.*Avec Le Seigneur des mâchoires en jeu : -4\/-4/u,
    'le chiffre de base passe dans la pastille, mais l’exil et le Lien restent');
  assert.equal(texte('ecueil'), 'Cible : une créature adverse.', 'le Contresort explique déjà l’annulation');
  assert.match(texte('serment-de-la-forge'), /^Vos créatures gagnent aussi Attaque ciblée/u,
    'le Renfort chiffré n’est pas écrit deux fois, le mot-clé supplémentaire reste');
  assert.equal(texte('mur-de-boucliers'), 'Jusqu’à la fin du tour, ces effets s’appliquent à vos créatures.',
    'la portée et la durée restent, les nombres et Overkill sont dans les deux pastilles');
  assert.match(texte('le-grand-debarquement'), /créatures qui détient une créature en sa cale/u,
    'la condition de portée reste visible sans répéter le Renfort et l’Overkill');
});

test('les conditions d’Embuscade ont une version courte avec des mots clés à mettre en gras', () => {
  const embuscades = RPG_DUEL_CARDS.filter((carte) => carte.reactionTourAdverse && carte.conditionEmbuscade);
  assert.equal(embuscades.length, 16);
  for (const carte of embuscades) {
    const morceaux = conditionEmbuscadeCourtePourApercu(carte);
    assert.ok(morceaux?.length >= 2, carte.id);
    assert.ok(morceaux[1], `${carte.id} : repère en gras`);
    assert.ok(morceaux.join('').length < conditionEmbuscadePourApercu(carte).length + 12, `${carte.id} : condition concise`);
  }
  const tojiro = cardById('tojiro-le-pourfendeur');
  assert.deepEqual(conditionEmbuscadeCourtePourApercu(tojiro), ['il y a un ', 'Djinn', ' en face']);
  assert.equal(conditionEmbuscadeCourtePourApercu(cardById('chien-du-guet')), null);
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  assert.match(css, /\.rpg-hover-card-preview__embuscade\s*\{[^}]*border-left: 3px solid #f4a9eb;[^}]*background: linear-gradient\(110deg, rgba\(98, 33, 92/s,
    'le cadre explicatif reste violet');
  assert.match(css, /\.rpg-hover-card-preview__embuscade b \{[^}]*font-weight: 800;/,
    'les repères de la condition ressortent en gras');
});

test('la condition d’Embuscade de chaque Vampire provient du texte imprimé et reste limitée au tour adverse', () => {
  const vampires = RPG_DUEL_CARDS.filter((carte) => carte.reactionTourAdverse
    && cardHasPrintedType(carte, 'Vampire'));
  assert.equal(vampires.length, 16);
  for (const carte of vampires) {
    const condition = conditionEmbuscadePourApercu(carte);
    assert.ok(condition, `condition de ${carte.id} absente`);
    assert.ok(carte.text.includes(`seulement si ${condition}.`), carte.id);
  }
  assert.equal(conditionEmbuscadePourApercu(cardById('chien-du-guet')), null);
  assert.equal(conditionEmbuscadePourApercu(cardById('embuscade')), null,
    'la Sorcellerie Embuscade n’est pas une créature jouable en réaction');
});

test('toutes les variantes de preview ne redisent pas les effets de leurs pastilles', async () => {
  const { build } = await import('vite');
  const { default: React } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { JSDOM } = await import('jsdom');

  const env = process.env.NODE_ENV;
  try {
    await build({
      logLevel: 'error',
      build: {
        ssr: 'src/games/RpgDuelPage.jsx',
        outDir: 'node_modules/.cache/rpg-embuscade-preview',
        emptyOutDir: true,
      },
    });
  } finally {
    if (env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = env;
  }
  const { HoverCardPreview } = await import('../node_modules/.cache/rpg-embuscade-preview/RpgDuelPage.js');
  const vampires = RPG_DUEL_CARDS.filter((carte) => carte.reactionTourAdverse
    && cardHasPrintedType(carte, 'Vampire'));
  for (const variante of ['', 'appui-long', 'catalogue', 'annonce', 'graveyard']) {
    for (const carte of vampires) {
      const markup = renderToStaticMarkup(React.createElement(HoverCardPreview, { carte, variante }));
      const dom = new JSDOM(markup);
      const condition = conditionEmbuscadeCourtePourApercu(carte);
      const pastille = dom.window.document.querySelector('.rpg-pastille[data-pastille="reactionTourAdverse"]');
      const cadre = dom.window.document.querySelector('.rpg-hover-card-preview__embuscade');
      assert.ok(pastille?.getAttribute('aria-label')?.includes('pendant le tour adverse'), `${carte.id} : pastille de mécanique`);
      assert.ok(!pastille?.getAttribute('aria-label')?.includes(conditionEmbuscadePourApercu(carte)),
        `${carte.id} : la pastille ne répète pas la condition`);
      assert.equal(cadre?.dataset.conditionEmbuscade, carte.conditionEmbuscade, `${carte.id} : ${variante || 'survol'}`);
      assert.equal(cadre?.textContent, `EmbuscadeCondition : ${condition.join('')}.`);
      assert.deepEqual([...cadre.querySelectorAll('b')].map((mot) => mot.textContent), condition.filter((_, i) => i % 2),
        `${carte.id} : les mots clés ressortent en gras`);
      dom.window.close();
    }
    const ordinaire = renderToStaticMarkup(React.createElement(HoverCardPreview, {
      carte: cardById('chien-du-guet'), variante,
    }));
    assert.doesNotMatch(ordinaire, /rpg-hover-card-preview__embuscade/);
    const rendre = (id) => new JSDOM(renderToStaticMarkup(React.createElement(HoverCardPreview, {
      carte: cardById(id), variante,
    }))).window.document;
    const renaissance = rendre('reanimation');
    assert.ok(renaissance.querySelector('[data-pastille="reanimation"]'));
    assert.equal(renaissance.querySelector('.rpg-hover-card-preview__rules'), null, 'la Réanimation ne se réécrit pas sous sa pastille');
    const salem = rendre('salem');
    assert.match(salem.querySelector('.rpg-hover-card-preview__rules')?.textContent ?? '', /Quand Salem arrive/u);
    assert.doesNotMatch(salem.querySelector('.rpg-hover-card-preview__rules')?.textContent ?? '', /le prochain sort/u);
    const lame = rendre('lame-de-mer');
    assert.ok(lame.querySelector('[data-pastille="debuff"]'));
    assert.equal(lame.querySelector('.rpg-hover-card-preview__stats--modif'), null, 'les chiffres du malus sont sur la pastille');
    const vampire = rendre('vampire-des-braises');
    assert.match(vampire.querySelector('.rpg-hover-card-preview__rules')?.textContent ?? '', /avant les blessures de combat/u,
      'un effet non expliqué par la pastille reste visible');
  }
});
