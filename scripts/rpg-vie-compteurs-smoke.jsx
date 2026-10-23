// La vie et les compteurs du Sablier, rendus dans jsdom.
//
// Ce que l'on vérifie, et qui ne se lit pas dans le code : la plaque de vie
// garde la valeur vraie même pendant le roulage, la jauge de sable suit la part
// de vie de base, les PV bonus gardent le rond plein, les grains
// tombent à chaque perte, et le losange des compteurs passe par la pose, la
// perte, la veille de la dernière Heure — puis se tait en mouvement réduit.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CompteurCarte, PlaqueVie } from '../src/games/RpgVieCompteurs.jsx';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Le mouvement réduit simulé, le temps d'une vérification. */
function reglerMouvementReduit(actif) {
  if (!actif) {
    delete window.matchMedia;
    return;
  }
  window.matchMedia = (requete) => ({
    matches: true,
    media: requete,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; },
  });
}

export async function checkRpgVieCompteurs(assert) {
  reglerMouvementReduit(false);
  const conteneur = document.createElement('div');
  document.body.append(conteneur);
  let racine = createRoot(conteneur);
  const rendre = async (element) => {
    await act(async () => { racine.render(element); });
  };
  const plaque = () => conteneur.querySelector('.rpg-wizard-plate__pv');
  const valeur = () => conteneur.querySelector('.rpg-wizard-plate__hp-value');
  const roule = () => conteneur.querySelector('.rpg-jauge-vie__roule');
  const part = () => plaque()?.style.getPropertyValue('--rpg-jauge-part');
  let conteneurReduit = null;

  try {
    // ── 1. Une plaque pleine : pas de réserve, pas de trait, pas de grains ──
    await rendre(<PlaqueVie pv={25} pvMax={25} base={25} />);
    assert.ok(plaque()?.classList.contains('rpg-jauge-vie'),
      'la plaque de vie porte sa jauge de sable');
    assert.equal(valeur()?.textContent, '25', 'le chiffre vrai est là dès la première image');
    assert.equal(part(), '1.0000', 'à pleine vie, le sable remplit le verre');
    assert.equal(conteneur.querySelector('.rpg-jauge-vie__reserve'), null,
      'sans réserve, aucune bande d’or');
    assert.equal(conteneur.querySelector('.rpg-jauge-vie__trait'), null,
      'sans réserve ouverte, aucun trait de maximum d’origine');
    assert.equal(conteneur.querySelector('.rpg-wizard-plate__hp-max'), null,
      'à 25 PV, la plaque n’affiche toujours aucun maximum');
    assert.equal(conteneur.querySelector('.rpg-jauge-vie__grains'), null,
      'une plaque neuve ne perd rien : aucun grain');
    assert.equal(roule(), null, 'rien à rouler sur une première image');

    // ── 2. Une perte : le chiffre vrai tombe tout de suite, le roulage
    //       l’accompagne, six grains quittent la plaque ────────────────────
    await rendre(<PlaqueVie pv={22} pvMax={25} base={25} />);
    assert.equal(valeur()?.textContent, '22',
      'la valeur vraie est immédiate : les lecteurs d’écran et les tests ne lisent jamais un chiffre intermédiaire');
    assert.ok(plaque()?.classList.contains('is-roulage'),
      'la plaque sait qu’elle est en train de rouler');
    assert.equal(roule()?.getAttribute('aria-hidden'), 'true',
      'le calque qui compte est décoratif');
    assert.equal(roule()?.textContent, '25',
      'le roulage part de la valeur affichée avant le coup');
    assert.match(plaque()?.className ?? '', /\bis-perte is-perte--[ab]\b/,
      'la perte porte une variante, pour rejouer même deux coups rapprochés');
    assert.equal(conteneur.querySelectorAll('.rpg-jauge-vie__grain').length, 6,
      'six grains quittent la plaque à chaque perte');
    assert.equal(part(), '0.8800', 'le sable descend à la nouvelle part de vie');
    await act(async () => { await wait(900); });
    assert.equal(roule(), null, 'le roulage s’efface de lui-même');
    assert.equal(valeur()?.textContent, '22', 'et le chiffre vrai reste seul, intact');
    assert.equal(plaque()?.classList.contains('is-roulage'), false);

    // ── 3. Les bonus ne changent ni le plein ni la structure du rond ───────
    for (const [pv, pvMax, attendu] of [[28, 29, '1.0000'], [50, 50, '1.0000'],
      [25, 50, '1.0000'], [20, 50, '0.8000']]) {
      await rendre(<PlaqueVie pv={pv} pvMax={pvMax} base={25} />);
      assert.equal(valeur()?.textContent, String(pv), 'les PV réels restent lisibles');
      assert.equal(part(), attendu, 'plein dès 25 PV, quel que soit le record');
      assert.equal(conteneur.querySelector('.rpg-wizard-plate__hp-max'), null,
        'aucun maximum ajouté à côté du rond');
      assert.equal(conteneur.querySelector('.rpg-jauge-vie__reserve'), null,
        'pas de bande qui transforme le visuel plein');
      assert.equal(conteneur.querySelector('.rpg-jauge-vie__trait'), null);
    }

    // ── 4. Le seuil : à 5 PV, la jauge veille ───────────────────────────────
    await rendre(<PlaqueVie pv={4} pvMax={25} base={25} />);
    assert.ok(plaque()?.classList.contains('is-critique'),
      'à 4 PV, la jauge passe en veille');
    await rendre(<PlaqueVie pv={6} pvMax={25} base={25} />);
    assert.equal(plaque()?.classList.contains('is-critique'), false,
      'au-dessus du seuil, la veille s’éteint');

    // ── 5. Les compteurs de carte : pose, perte, dernière Heure, gain ──────
    await rendre(<CompteurCarte type="heures" valeur={3} />);
    const compteur = () => conteneur.querySelector('[data-compteur="heures"]');
    assert.equal(compteur()?.textContent, '3', 'le losange porte le nombre d’Heures');
    assert.ok(compteur()?.classList.contains('rpg-card__compteur--heures'),
      'la couleur du losange reste celle des Heures');
    assert.ok(compteur()?.classList.contains('is-pose'), 'à son apparition, le compteur se pose');
    assert.ok(compteur()?.querySelector('.rpg-compteur__passe'),
      'le grain du compteur est présent, prêt à tomber');
    await act(async () => { await wait(500); });
    assert.equal(compteur()?.classList.contains('is-pose'), false,
      'la pose ne dure pas : elle laisse le compteur au repos');

    await rendre(<CompteurCarte type="heures" valeur={2} />);
    assert.equal(compteur()?.textContent, '2');
    assert.match(compteur()?.className ?? '', /\bis-perte is-perte--[ab]\b/,
      'une Heure qui tombe déclenche le geste de perte');
    assert.equal(compteur()?.classList.contains('is-derniere'), false,
      'à deux Heures, rien ne veille encore');

    await rendre(<CompteurCarte type="heures" valeur={1} />);
    assert.equal(compteur()?.textContent, '1');
    assert.ok(compteur()?.classList.contains('is-derniere'),
      'à une Heure, le verre se fêle et veille : l’effet va tomber');

    await rendre(<CompteurCarte type="sable" valeur={3} />);
    const sable = () => conteneur.querySelector('[data-compteur="sable"]');
    assert.equal(sable()?.textContent, '3', 'le sable d’une arme a son propre losange');
    assert.ok(sable()?.classList.contains('rpg-card__compteur--sable'));
    await rendre(<CompteurCarte type="sable" valeur={2} />);
    assert.match(sable()?.className ?? '', /\bis-perte\b/,
      'un compteur de sable dépensé tombe aussi');

    // ── 6. Mouvement réduit : plus de roulage, plus de grains, plus de geste ──
    await act(async () => { racine.unmount(); });
    conteneur.remove();
    reglerMouvementReduit(true);
    conteneurReduit = document.createElement('div');
    document.body.append(conteneurReduit);
    racine = createRoot(conteneurReduit);
    await act(async () => { racine.render(<PlaqueVie pv={25} pvMax={25} base={25} />); });
    await act(async () => { racine.render(<PlaqueVie pv={10} pvMax={25} base={25} />); });
    const plaqueReduite = conteneurReduit.querySelector('.rpg-wizard-plate__pv');
    assert.equal(conteneurReduit.querySelector('.rpg-wizard-plate__hp-value')?.textContent, '10',
      'en mouvement réduit, la vie est juste et immédiate');
    assert.equal(conteneurReduit.querySelector('.rpg-jauge-vie__roule'), null,
      'aucun roulage en mouvement réduit');
    assert.equal(conteneurReduit.querySelectorAll('.rpg-jauge-vie__grain').length, 0,
      'aucun grain en mouvement réduit');
    assert.doesNotMatch(plaqueReduite?.className ?? '', /\bis-perte/,
      'aucune variante de perte posée quand le mouvement est réduit');
    assert.equal(plaqueReduite?.style.getPropertyValue('--rpg-jauge-part'), '0.4000',
      'la jauge, elle, dit toujours la vérité');
    await act(async () => { racine.unmount(); });
    conteneurReduit.remove();
    racine = null;
  } finally {
    reglerMouvementReduit(false);
    if (racine) await act(async () => { racine.unmount(); });
    conteneurReduit?.remove();
    conteneur.remove();
  }
}

/** Plaques statiques pour vérifier leur géométrie dans un vrai navigateur. */
export async function plaquesViePourLayout() {
  const { renderToStaticMarkup } = await import('react-dom/server');
  return renderToStaticMarkup(<>
    {[['25', 25, 25], ['bonus', 30, 50], ['record', 25, 50], ['100', 100, 100], ['blesse', 20, 50]]
      .flatMap(([id, pv, pvMax]) => ['joueur', 'ennemi'].map(camp => (
        <div key={`${id}-${camp}`} data-cas={`${id}-${camp}`} className={`rpg-wizard-plate rpg-wizard-plate--${camp}`}>
          <PlaqueVie pv={pv} pvMax={pvMax} base={25} />
        </div>
      )))}
  </>);
}
