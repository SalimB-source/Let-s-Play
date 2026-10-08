// Rendu réel de l'écran de combat dans jsdom : on ouvre la page, on lance le
// combat, on lit les intentions annoncées, on joue un coup et une réponse,
// puis on laisse le tour ennemi se dérouler tout seul. Les règles viennent du
// moteur (testé par ailleurs) ; ce qui est vérifié ici, c'est que la page les
// affiche et réagit — le seul endroit où React et les timers se rencontrent.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react';
import RpgBattlePage from '../src/games/RpgBattlePage.jsx';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function checkRpgBattle(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<MemoryRouter><RpgBattlePage /></MemoryRouter>);
  });

  const buttons = () => [...container.querySelectorAll('button')];
  const findButton = (label) => buttons().find((button) => button.textContent.includes(label));

  // ── L'écran d'accueil explique le contrat : rien ne dépend des réflexes ──
  assert.match(container.textContent, /SABLIER/);
  assert.match(container.textContent, /sans réflexes/);
  assert.ok(buttons().some((b) => b.className.includes('rpg-mute')),
    'le bouton son 🔊/🔇 doit exister dans l’en-tête');
  for (const level of ['Récit', 'Normale', 'Veilleur']) {
    assert.ok(findButton(level), `difficulté « ${level} » absente`);
  }
  await act(async () => { findButton('Veilleur').click(); });
  await act(async () => { findButton('Normale').click(); });

  // ── Ouverture du combat ─────────────────────────────────────────────────
  await act(async () => { findButton('Ouvrir le combat').click(); });
  await act(async () => { await wait(900); });

  assert.match(container.textContent, /Vague 1/);
  // La table de jeu est montée, cartes posées : quatre compagnons en bas,
  // au moins deux ennemis en face, chacun avec son portrait en illustration.
  assert.ok(container.querySelector('.card-table'), 'la table de jeu doit être montée');
  assert.equal(container.querySelectorAll('.rpg-card--equipe').length, 4, 'l’équipe doit être posée en cartes');
  assert.ok(container.querySelectorAll('.rpg-card--ennemi').length >= 2, 'les ennemis doivent être posés en cartes');
  assert.ok(container.querySelectorAll('.rpg-card__art img').length >= 6, 'chaque carte doit montrer son portrait');
  // Les ennemis instanciés (id suffixés) doivent tout de même pointer vers le
  // fichier de portrait de leur définition — régression du 2026-10-08.
  const foeSrcs = [...container.querySelectorAll('.rpg-card--ennemi img')].map((img) => img.getAttribute('src'));
  assert.ok(foeSrcs.length >= 2 && foeSrcs.every((s) => /portraits\/balayeur\.jpg$/.test(s)), `les ennemis doivent charger balayeur.jpg (${foeSrcs.join(', ')})`);
  assert.equal(container.querySelectorAll('.rpg-card--equipe').length, 4, 'l’équipe doit compter 4 compagnons');
  const foeCards = container.querySelectorAll('.rpg-card--ennemi');
  assert.ok(foeCards.length >= 2, `ennemis absents (${foeCards.length})`);
  // Chaque ennemi vivant annonce son prochain coup.
  assert.equal(container.querySelectorAll('.rpg-intent').length, foeCards.length,
    'chaque ennemi doit afficher son intention');
  assert.match(container.querySelector('.rpg-intent').textContent, /lourd|zone|sablier|soutien|incantation/i);
  // Étages, segments de Nom, sable au sol, Astrolabe : tout est affiché.
  assert.equal(container.querySelectorAll('.rpg-tier').length >= 6, true);
  assert.equal(container.querySelectorAll('.rpg-name-segments').length, 4);
  assert.match(container.textContent, /notre sol/);
  assert.match(container.textContent, /leur sol/);
  assert.match(container.textContent, /Astrolabe/);
  assert.ok(container.querySelectorAll('.rpg-ring__item').length >= 4, 'ordre des tours vide');
  // Les personnages sont visibles en combat : un portrait peint par acteur,
  // dans l'équipe, face à chaque ennemi et dans l'ordre des tours.
  const allyPortraits = [...container.querySelectorAll('.rpg-ally__portrait')];
  assert.equal(allyPortraits.length, 4, 'chaque compagnon doit afficher son portrait');
  assert.ok(allyPortraits.every((img) => /portraits\/.+\.(jpg|png)$/.test(img.getAttribute('src') ?? '')),
    'un portrait d’allié pointe vers un fichier manquant');
  assert.equal(container.querySelectorAll('.rpg-foe__portrait').length, foeCards.length,
    'chaque ennemi doit afficher son portrait');
  assert.ok(container.querySelectorAll('img.rpg-ring__dot').length >= 4,
    'l’ordre des tours doit montrer les visages');
  // Aucune réaction en temps réel : l'écran ne propose ni parade ni esquive.
  assert.equal(container.textContent.includes('Parade'), false, 'le prototype ne doit plus proposer de parade');

  const enemyHp = () => [...container.querySelectorAll('.rpg-foe__hp')]
    .map((node) => Number(node.textContent.split('/')[0].trim()))
    .reduce((sum, value) => sum + value, 0);
  const hpBefore = enemyHp();
  assert.ok(hpBefore > 500, `PV ennemis inattendus : ${hpBefore}`);

  // ── Le joueur joue un coup ──────────────────────────────────────────────
  let skillButton = null;
  for (let attempt = 0; attempt < 16 && !skillButton; attempt += 1) {
    await act(async () => { await wait(250); });
    skillButton = buttons().find((button) => button.className.includes('rpg-skill') && !button.disabled);
  }
  assert.ok(skillButton, 'aucune compétence jouable proposée au joueur');
  const skillName = skillButton.querySelector('.rpg-skill__name').textContent;
  await act(async () => { skillButton.click(); });
  await act(async () => { await wait(400); });

  assert.match(container.querySelector('.rpg-log').textContent, /dégâts|soigne|interrompt|monte/,
    'le journal ne trace aucune action');
  assert.ok(enemyHp() < hpBefore, `les PV ennemis n’ont pas baissé (${hpBefore} → ${enemyHp()})`);

  // La boîte de message tape le journal lettre à lettre, façon Dragon Quest.
  await act(async () => { await wait(300); });
  const msg = container.querySelector('.rpg-scene__msg span');
  assert.ok(msg && msg.textContent.length > 0, 'la boîte de message doit taper le journal');

  // ── Les quatre réponses sont proposées ──────────────────────────────────
  for (const response of ['Garde', 'Barrage', 'Récolte', 'Souffle', 'Reposition']) {
    assert.ok(findButton(response), `réponse « ${response} » absente de la barre d'actions`);
  }
  // Le barrage et la récolte exigent du sable : sans sable au sol, ils sont grisés.
  if (container.textContent.includes('notre sol 0')) {
    assert.equal(findButton('Barrage').disabled, true, 'le barrage doit être grisé sans sable');
  }

  // ── Le tour ennemi se joue seul, sans rien demander au joueur ───────────
  let waveDone = false;
  for (let attempt = 0; attempt < 220 && !waveDone; attempt += 1) {
    if (container.querySelector('.rpg-overlay')) {
      waveDone = true;
      break;
    }
    // On joue pour de vrai : une compétence dès qu'il y en a une, sinon on passe.
    const skill = buttons().find((button) => button.className.includes('rpg-skill') && !button.disabled);
    if (skill) {
      await act(async () => { skill.click(); });
    } else {
      const endTurn = findButton('Fin du tour');
      if (endTurn) await act(async () => { endTurn.click(); });
    }
    await act(async () => { await wait(180); });
  }
  assert.ok(waveDone, 'la première vague ne s’est pas terminée');
  assert.match(container.querySelector('.rpg-overlay').textContent, /Vague repoussée/);
  assert.match(container.querySelector('.rpg-log').textContent, /Balayeur|raclette|Tourbillon|Sac de sable/i);

  // ── Entre les vagues : le palier se visite avant de redescendre ─────────
  await act(async () => { findButton('Monter au palier').click(); });
  await act(async () => { await wait(400); });
  assert.ok(container.querySelector('.rpg-explore'), 'l’exploration du palier doit s’ouvrir après la vague 1');
  assert.match(container.textContent, /Heures avant le cycle/);
  assert.equal(container.querySelectorAll('.rpg-place').length >= 4, true, 'le palier doit offrir plusieurs lieux');
  // On vend la ferraille : +30 sable de poche, une heure en moins.
  await act(async () => { findButton('ferraille').click(); });
  await act(async () => { await wait(120); });
  assert.match(container.textContent, /Sable de poche 30/, 'le sable de poche doit être affiché');
  assert.match(container.querySelector('.rpg-explore__hours').textContent, /Heures avant le cycle/);
  // L'action faite est cochée et rejouable nulle part.
  const doneButton = findButton('ferraille');
  assert.equal(doneButton.disabled, true, 'une action faite ne se rejoue pas');
  // Un choix moral s'ouvre sans se trancher tant qu'on n'a pas choisi.
  await act(async () => { findButton('Affronter la Liste').click(); });
  await act(async () => { await wait(120); });
  assert.ok(findButton('Arracher la page de Salem'), 'le choix moral doit proposer ses deux options');

  // ── On descend : le sable de poche se verse au sol, la vague 2 commence ─
  await act(async () => { findButton('Descendre').click(); });
  await act(async () => { await wait(900); });
  assert.match(container.textContent, /Vague 2/);
  const notreSol = Number((container.textContent.match(/notre sol (\d+)/) ?? [null, NaN])[1]);
  assert.ok(notreSol >= 30, `le sable de poche doit être versé sur notre sol (lu : ${notreSol})`);
  assert.equal(container.querySelectorAll('.rpg-card--equipe').length, 4, 'l’équipe doit être au complet après le palier');
  // La permutation n'est proposée que pendant le tour d'un compagnon.
  let swapButton = null;
  for (let attempt = 0; attempt < 40 && !swapButton; attempt += 1) {
    await act(async () => { await wait(300); });
    swapButton = buttons().find((button) => button.textContent.includes('TAREK'));
    if (container.querySelector('.rpg-overlay')) break;
  }
  assert.ok(swapButton, 'le bouton de permutation avec la réserve est absent');

  await act(async () => { root.unmount(); });
}
