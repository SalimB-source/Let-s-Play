/**
 * Le smoke de l'écran du Souk (lot 3) — l'écran monté pour de vrai, branché sur
 * le vrai hook de bourse.
 *
 * Il ne simule rien : `RpgSouk` reçoit `useSablierBourse`, les quêtes du jour
 * sont terminées par les **gestes du contrat d'événements**, et les boutons sont
 * cliqués dans le DOM. Ce que le joueur voit — le solde qui monte, la barre qui
 * se remplit, le bouton qui s'active, la pastille qui se vide — est lu dans le
 * document, pas dans l'état interne.
 *
 * Aucune minuterie n'entre dans les assertions : le compte à rebours du cycle
 * tourne en fond (toutes les 30 s), mais rien ne dépend de lui. La graine est
 * posée à la main, sans quoi la journée changerait d'un passage à l'autre.
 */

import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useSablierBourse } from '../src/games/useSablierBourse.js';
import RpgSouk, { creditsLisible, dureeAvantMinuit } from '../src/games/RpgSouk.jsx';
import { RPG_GRAINE_STORAGE_KEY, queteParId } from '../src/games/rpgQuetes.js';
import { GAINS } from '../src/games/rpgCredits.js';
import { RPG_DUEL_CARDS, cardColors } from '../src/games/rpgCards.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** La progression du joueur du smoke : les Listes sont montées, donc les rayons ouverts. */
const PROGRESSION = { etagesVaincus: ['listes-1'] };

/** L'écran, tel que la page le monte : le hook en dessous, l'écran au-dessus. */
function Sonde({ surPret, sons }) {
  const bourse = useSablierBourse({ progression: PROGRESSION });
  surPret(bourse);
  return (
    <RpgSouk
      quetes={bourse.quetes}
      credits={bourse.credits}
      aReclamer={bourse.aReclamer}
      statutSync={bourse.statutSync}
      onReclamerQuete={(id) => bourse.reclamerUneQuete(id)}
      onReclamerCachet={() => bourse.reclamerLeCachet()}
      onPlaySfx={(nom) => { sons.push(nom); }}
      onExit={() => { sons.push('sortie'); }}
    />
  );
}

const KIND_PAR_TYPE = {
  'terrain-pose': 'terrain',
  'creature-invoquee': 'creature',
  'magie-lancee': 'magie',
  'arme-jouee': 'arme',
};

/** Un événement du contrat qui fait avancer cette quête, ou `null` s'il n'en existe pas. */
function evenementPour(quete) {
  const { type, couleur } = quete.ecoute ?? {};
  if (type === 'degats-infliges') return { type, montant: quete.objectif };
  if (type === 'duel-gagne') return { type, mode: 'libre' };
  if (type === 'etage-deblaye') return { type, etageId: 'listes-2', premiere: true };
  if (type === 'booster-ouvert') return { type, rayonId: 'sable' };
  const kind = KIND_PAR_TYPE[type];
  const carte = type === 'carte-jouee'
    ? RPG_DUEL_CARDS.find((candidat) => cardColors(candidat).includes(couleur))
    : RPG_DUEL_CARDS.find((candidat) => candidat.kind === kind);
  return carte ? { type, cardId: carte.id } : null;
}

/** La valeur d'un attribut `data-` de l'écran (jamais un `container` figé). */
const donnee = (selecteur, cle) => document.querySelector(selecteur)?.dataset?.[cle] ?? null;
const noeud = (selecteur) => document.querySelector(selecteur);

export async function checkRpgSoukEcran(assert) {
  // ── Les règles d'affichage, sans DOM ──────────────────────────────────────
  assert.equal(creditsLisible(1240), '1\u202f240', 'les milliers se lisent avec une espace fine');
  assert.equal(creditsLisible(0), '0');
  assert.equal(creditsLisible(undefined), '0', 'un solde illisible s’affiche zéro, pas NaN');
  assert.equal(dureeAvantMinuit(7 * 3600 + 12 * 60), '7 h 12', 'le cycle se compte en heures et minutes');
  assert.equal(dureeAvantMinuit(43 * 60), '43 min', 'et en minutes sous l’heure');
  assert.match(dureeAvantMinuit(30), /^moins d/, 'et se tait poliment sous la minute');

  window.localStorage.clear();
  window.localStorage.setItem(RPG_GRAINE_STORAGE_KEY, 'graine-du-smoke-souk');
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const root = createRoot(conteneur);
  const sons = [];
  let bourse = null;
  try {
    await act(async () => root.render(<Sonde surPret={(valeur) => { bourse = valeur; }} sons={sons} />));

    // ── L'écran est là, et il dit ce qu'il a ────────────────────────────────
    assert.ok(noeud('[data-souk]'), 'l’écran du Souk se rend');
    assert.equal(donnee('[data-souk-solde]', 'soukSolde'), '0', 'un joueur neuf n’a pas un crédit');
    assert.equal(Number(donnee('[data-souk-quetes]', 'soukQuetes')), 3, 'la journée propose trois quêtes');
    assert.ok(noeud('[data-souk-quetes]')?.children?.length === 3, 'et trois cartes sont peintes');
    assert.equal(donnee('[data-souk-cachet]', 'soukCachet'), 'attente',
      'le Cachet attend ses trois quêtes');
    assert.equal(donnee('[data-souk-rayons]', 'soukRayons'), 'bientot',
      'les rayons annoncent le lot suivant au lieu de mentir');
    assert.equal(noeud('[data-souk-attente]'), null, 'rien à réclamer : pas de bandeau');

    // ── Ce qui n'est pas terminé ne se réclame pas ──────────────────────────
    const jour = bourse.quetes.quetes.map((id) => queteParId(id));
    assert.ok(jour.every(Boolean), 'les quêtes du jour sont de vraies quêtes du pool');
    for (const quete of jour) {
      assert.equal(donnee(`[data-souk-quete="${quete.id}"]`, 'soukQueteEtat'), 'encours',
        `${quete.id} commence en cours`);
      const bouton = noeud(`[data-souk-reclamer="${quete.id}"]`);
      assert.ok(bouton, `${quete.id} a son bouton Réclamer`);
      assert.ok(bouton.disabled, 'désactivé tant que l’objectif n’est pas atteint');
      assert.match(bouton.title, /^Il reste \d+/, 'et il dit ce qu’il reste');
      assert.ok(noeud(`[data-souk-quete="${quete.id}"] [data-souk-reste]`) !== null,
        'la carte écrit aussi ce qu’il reste');
    }

    // ── Jouer remplit la barre, et le bouton s'ouvre ────────────────────────
    const premiere = jour[0];
    const geste = evenementPour(premiere);
    assert.ok(geste, `« ${premiere.id} » écoute un geste du contrat`);
    const coups = premiere.ecoute.montant ? 1 : premiere.objectif;
    for (let coup = 0; coup < coups; coup += 1) {
      await act(async () => bourse.noterEvenementDuel(geste));
    }
    assert.equal(donnee(`[data-souk-quete="${premiere.id}"] [data-souk-progres]`, 'soukProgres'),
      `${premiere.objectif}/${premiere.objectif}`, 'la barre atteint son objectif');
    assert.equal(donnee(`[data-souk-quete="${premiere.id}"]`, 'soukQueteEtat'), 'terminee');
    assert.equal(noeud(`[data-souk-reclamer="${premiere.id}"]`).disabled, false,
      'le bouton s’active quand l’objectif est atteint');
    assert.match(noeud(`[data-souk-reclamer="${premiere.id}"]`).textContent, new RegExp(String(premiere.recompense)),
      'et il annonce le montant qu’il paie');

    // ── Réclamer paie, une seule fois ───────────────────────────────────────
    // Le solde est relevé juste avant le clic : les gestes qui ont rempli la
    // barre ont pu payer eux aussi (un duel gagné vaut 8 ◈), et c'est le
    // paiement de la quête qu'on isole ici.
    const avantReclamation = Number(donnee('[data-souk-solde]', 'soukSolde'));
    await act(async () => noeud(`[data-souk-reclamer="${premiere.id}"]`).click());
    assert.equal(Number(donnee('[data-souk-solde]', 'soukSolde')), avantReclamation + premiere.recompense,
      'la réclamation encaisse la récompense annoncée');
    assert.equal(donnee(`[data-souk-quete="${premiere.id}"]`, 'soukQueteEtat'), 'reclamee');
    assert.equal(noeud(`[data-souk-reclamer="${premiere.id}"]`), null, 'le bouton disparaît une fois payé');
    if (bourse.aReclamer > 0) {
      assert.equal(Number(donnee('[data-souk-attente]', 'soukAttente')), bourse.aReclamer,
        'le bandeau compte ce qui reste à réclamer');
    } else {
      assert.equal(noeud('[data-souk-attente]'), null, 'plus rien à réclamer : le bandeau s’efface');
    }
    assert.ok(sons.includes('bell'), 'encaisser sonne');

    // ── Les trois quêtes réclamées ouvrent le Cachet ────────────────────────
    for (const quete of jour.slice(1)) {
      const gesteSuivant = evenementPour(quete);
      assert.ok(gesteSuivant, `« ${quete.id} » écoute un geste du contrat`);
      const repetitions = quete.ecoute.montant ? 1 : quete.objectif;
      for (let coup = 0; coup < repetitions; coup += 1) {
        await act(async () => bourse.noterEvenementDuel(gesteSuivant));
      }
      const avant = Number(donnee('[data-souk-solde]', 'soukSolde'));
      await act(async () => noeud(`[data-souk-reclamer="${quete.id}"]`)?.click());
      assert.equal(donnee(`[data-souk-quete="${quete.id}"]`, 'soukQueteEtat'), 'reclamee',
        `${quete.id} est réclamée`);
      assert.equal(Number(donnee('[data-souk-solde]', 'soukSolde')), avant + quete.recompense,
        `${quete.id} paie les ${quete.recompense} ◈ qu’elle annonce`);
    }
    assert.equal(donnee('[data-souk-cachet]', 'soukCachet'), 'disponible',
      'les trois réclamées : le Cachet s’ouvre');
    assert.ok(noeud('[data-souk-cachet-reclamer]'), 'et son bouton est là');

    const avantCachet = Number(donnee('[data-souk-solde]', 'soukSolde'));
    await act(async () => noeud('[data-souk-cachet-reclamer]').click());
    assert.equal(Number(donnee('[data-souk-solde]', 'soukSolde')), avantCachet + GAINS.cachetDuCycle,
      `le Cachet paie ${GAINS.cachetDuCycle} ◈`);
    assert.equal(donnee('[data-souk-cachet]', 'soukCachet'), 'pris', 'et il ne se réclame plus');
    assert.equal(noeud('[data-souk-cachet-reclamer]'), null, 'son bouton disparaît');
    assert.equal(Number(donnee('[data-souk-attente]', 'soukAttente')) || 0, 0,
      'plus rien n’attend : le bandeau s’efface');
    assert.ok(sons.includes('victoire'), 'le Cachet sonne sa victoire');

    // ── Le retour rend la main ──────────────────────────────────────────────
    await act(async () => noeud('[data-souk-retour]').click());
    assert.ok(sons.includes('sortie'), 'le bouton Menu sort de l’écran');

    await act(async () => root.unmount());
    conteneur.remove();
    await wait(20);
  } finally {
    try { await act(async () => root.unmount()); } catch { /* déjà démonté */ }
    conteneur.remove();
  }
}
