/**
 * Le smoke de la bourse du Souk (lot 2) — la boucle des crédits montée pour de vrai.
 *
 * On monte une sonde qui utilise `useSablierBourse` tel quel, et on joue la
 * boucle : un duel gagné paie, un étage tombe, une créature entre, le sorcier
 * saigne. Rien n'est simulé à la main — c'est le hook, le stockage et le
 * catalogue qui travaillent. Les minuteries n'entrent pas en jeu : ce smoke ne
 * dépend d'aucune animation, donc il ne peut pas être capricieux.
 */

import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useSablierBourse } from '../src/games/useSablierBourse.js';
import { RPG_BOURSE_STORAGE_KEY } from '../src/games/rpgCredits.js';
import { RPG_GRAINE_STORAGE_KEY, RPG_QUETES_STORAGE_KEY, QUETES, queteParId } from '../src/games/rpgQuetes.js';
import { XP } from '../src/games/rpgProfil.js';
import { cardById } from '../src/games/rpgCards.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Une sonde : le hook, et de quoi déclencher ses gestes depuis le test. Elle
 * rend aussi ce que le menu affichera — le solde et la pastille.
 */
function Sonde({ surPret }) {
  const bourse = useSablierBourse({});
  surPret(bourse);
  return (
    <div
      data-bourse-solde={bourse.credits}
      data-bourse-a-reclamer={bourse.aReclamer}
      data-bourse-jour={bourse.quetes.jour}
      data-bourse-cartes={bourse.bourse.cartes.length}
    />
  );
}

export async function checkRpgSouk(assert) {
  window.localStorage.clear();
  // La graine du joueur est tirée au hasard à la première visite — c'est la
  // règle : deux joueurs n'ont pas les mêmes quêtes du jour. Le smoke, lui, a
  // besoin d'une journée prévisible : il pose donc la sienne. Sans ça, il
  // passait ou échouait selon le tirage (et c'est exactement comme ça qu'un
  // test devient capricieux).
  window.localStorage.setItem(RPG_GRAINE_STORAGE_KEY, 'graine-du-smoke-souk');
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let bourse = null;
  try {
    await act(async () => root.render(<Sonde surPret={(valeur) => { bourse = valeur; }} />));

    // ── L'ouverture : le jour est posé, le solde est vide ───────────────────
    // La sonde est relue dans le document : elle change de conteneur au
    // rechargement, et un `container` figé pointerait dans le vide.
    const sonde = () => document.querySelector('[data-bourse-solde]')?.dataset ?? {};
    const solde = () => Number(sonde().bourseSolde ?? 0);
    assert.equal(solde(), 0, 'un joueur neuf n’a pas un crédit');
    assert.match(sonde().bourseJour ?? '', /^\d{4}-\d{2}-\d{2}$/, 'la journée est ouverte dès le premier rendu');
    assert.ok(window.localStorage.getItem(RPG_QUETES_STORAGE_KEY), 'et elle est écrite sur l’appareil');
    assert.ok(queteParId(bourse.quetes.quetes[0]), 'les quêtes du jour sont de vraies quêtes du pool');

    // ── Poser des cartes ne paie rien mais fait avancer les quêtes ──────────
    await act(async () => bourse.noterEvenementDuel({ type: 'creature-invoquee', cardId: 'desert' }));
    assert.equal(solde(), 0, 'invoquer une créature ne rapporte aucun crédit');
    const progres = bourse.quetes.progres;
    assert.ok(Object.values(progres).some((valeur) => valeur > 0) || !bourse.quetes.quetes.includes('creatures-10'),
      'la journée a bien enregistré la créature si elle l’écoutait');

    // ── Un duel libre gagné paie 8 ◈ ────────────────────────────────────────
    // Les montants sont écrits en clair : c'est le contrat public du dossier 13,
    // pas un détail que le module pourrait changer tout seul. Le geste **rend**
    // ce qu'il paie (`gain`, `xp`, `niveaux`) : c'est sur ce rendu que le smoke
    // se règle. Le solde, lui, peut monter d'autant plus — un palier franchi
    // offre un paquet du Souk (lot 6), et un paquet rend ses doublons.
    const libre = await act(async () => bourse.noterEvenementDuel({ type: 'duel-gagne', mode: 'libre' }));
    assert.equal(libre.gain, 8, 'un duel libre gagné paie 8 ◈');
    assert.equal(libre.xp, XP.duelLibre, 'et verse son XP dans la barre');
    assert.equal(libre.niveaux, 0, 'huit duels libres ne font pas encore un palier');
    assert.equal(solde(), libre.gain, 'le solde encaisse exactement le gain');

    // ── Un premier étage paie 50 ◈, un rejeu 10 ◈ ───────────────────────────
    const premier = await act(async () => bourse.noterEvenementDuel({
      type: 'duel-gagne', mode: 'histoire', etageId: 'listes-1', tourId: 'tour-des-listes', premiere: true,
    }));
    assert.equal(premier.gain, 50, 'le premier déblayage paie 50 ◈');
    assert.equal(premier.xp, XP.etagePremiere, 'et verse l’XP du récit');
    assert.equal(premier.niveaux, 1, 'le niveau 2 sonne du même coup');
    assert.ok(bourse.monteeNiveau?.ouverture, 'un palier franchi ouvre un paquet du comptoir');
    assert.equal(bourse.monteeNiveau.ouverture.prix, 0, 'offert : aucun crédit débité');
    assert.equal(bourse.monteeNiveau.ouverture.cartes.length, 5, 'et c’est un vrai paquet de cinq cartes');
    assert.ok(solde() >= libre.gain + premier.gain,
      'le solde encaisse les gains — les doublons du paquet offert rendent le reste');

    const soldeAvantRejeu = solde();
    const rejeu = await act(async () => bourse.noterEvenementDuel({
      type: 'duel-gagne', mode: 'histoire', etageId: 'listes-1', tourId: 'tour-des-listes', premiere: false,
    }));
    assert.equal(rejeu.gain, 10, 'le rejeu paie 10 ◈');
    assert.equal(rejeu.xp, XP.etageRejoue, 'et bien moins d’XP que le récit');
    assert.ok(solde() >= soldeAvantRejeu + rejeu.gain, 'le solde suit');

    const soldeAvantDeblaye = solde();
    await act(async () => bourse.noterEvenementDuel({ type: 'etage-deblaye', etageId: 'listes-1', premiere: true }));
    assert.equal(solde(), soldeAvantDeblaye, '« etage-deblaye » ne paie pas une deuxième fois');

    // ── Un geste inconnu ne casse rien ──────────────────────────────────────
    const avantInconnu = solde();
    await act(async () => bourse.noterEvenementDuel({ type: 'geste-qui-nexiste-pas' }));
    assert.equal(solde(), avantInconnu, 'un événement hors contrat est ignoré en silence');
    await act(async () => bourse.noterEvenementDuel(null));
    assert.equal(solde(), avantInconnu);

    // ── Le solde survit au rechargement, et la journée avec ─────────────────
    const jourAvant = bourse.quetes.jour;
    await act(async () => root.unmount());
    container.remove();
    const conteneur2 = document.createElement('div');
    document.body.appendChild(conteneur2);
    const root2 = createRoot(conteneur2);
    await act(async () => root2.render(<Sonde surPret={(valeur) => { bourse = valeur; }} />));
    // Un paquet dû peut se régler au montage (la dette attendait derrière la
    // cérémonie du palier précédent) : il rend ses doublons, donc le solde relu
    // vaut au moins ce qui était écrit.
    assert.ok(solde() >= avantInconnu, 'le solde est relu sur l’appareil');
    assert.equal(sonde().bourseJour, jourAvant, 'la journée en cours est conservée, pas retirée');
    assert.ok(window.localStorage.getItem(RPG_BOURSE_STORAGE_KEY), 'la bourse est écrite sur l’appareil');

    // ── Une journée finie se réclame : la quête, puis le Cachet ─────────────
    // On force une quête du jour à son objectif par les gestes du contrat.
    const cible = bourse.quetes.quetes
      .map((id) => queteParId(id))
      .find((quete) => quete.ecoute.type === 'duel-gagne');
    assert.ok(cible, `une quête de duel est au programme du jour (${bourse.quetes.quetes.join(', ')})`);
    for (let coup = 0; coup < cible.objectif; coup += 1) {
      await act(async () => bourse.noterEvenementDuel({ type: 'duel-gagne', mode: 'libre' }));
    }
    assert.ok(bourse.aReclamer >= 1, `la pastille signale ${bourse.aReclamer} réclamation(s)`);
    assert.equal(Number(sonde().bourseAReclamer), bourse.aReclamer, 'et le menu affiche le même chiffre');

    const soldeAvantReclamation = solde();
    let encaisse = 0;
    await act(async () => { encaisse = bourse.reclamerUneQuete(cible.id); });
    assert.equal(encaisse, cible.recompense, 'la quête paie son montant annoncé');
    assert.ok(solde() >= soldeAvantReclamation + cible.recompense, 'et le solde monte d’autant');
    const soldeApresReclamation = solde();
    await act(async () => bourse.reclamerUneQuete(cible.id));
    assert.equal(solde(), soldeApresReclamation, 'on ne paie jamais deux fois la même quête');

    // ── Les cartes du Souk vivent dans le portefeuille ──────────────────────
    // Elles viennent du comptoir (lot 4) **et** des paquets offerts par les
    // paliers (lot 6) : la liste n'est plus vide par construction, mais chaque
    // entrée est une vraie carte du catalogue.
    const cartesRangees = bourse.bourse.cartes;
    assert.equal(Number(sonde().bourseCartes), cartesRangees.length, 'le menu compte les cartes du portefeuille');
    assert.ok(cartesRangees.length >= 5, 'au moins le paquet du premier palier est rangé');
    assert.ok(cartesRangees.every((id) => cardById(id)), 'et chaque carte existe au catalogue');

    // ── Toutes les quêtes du pool sont au contrat ───────────────────────────
    for (const quete of QUETES) {
      assert.ok(quete.ecoute?.type, `${quete.id} écoute un événement du contrat`);
    }

    await act(async () => root2.unmount());
    conteneur2.remove();
    await wait(20);
  } finally {
    try { await act(async () => root.unmount()); } catch { /* déjà démonté */ }
    container.remove();
  }
}
