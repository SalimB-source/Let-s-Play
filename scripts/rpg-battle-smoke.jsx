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
  for (const level of ['Récit', 'Normale', 'Veilleur']) {
    assert.ok(findButton(level), `difficulté « ${level} » absente`);
  }
  await act(async () => { findButton('Veilleur').click(); });
  await act(async () => { findButton('Normale').click(); });

  // ── Ouverture du combat ─────────────────────────────────────────────────
  await act(async () => { findButton('Ouvrir le combat').click(); });
  await act(async () => { await wait(900); });

  assert.match(container.textContent, /Vague 1/);
  // La scène 3D (équipe face aux ennemis) est montée ; sans WebGL elle se
  // déclare en repli, mais elle doit toujours être là.
  assert.ok(container.querySelector('.rpg-scene'), 'la scène 3D doit être montée pendant le combat');
  assert.equal(container.querySelectorAll('.rpg-ally').length, 4, 'l’équipe doit compter 4 compagnons');
  const foeCards = container.querySelectorAll('.rpg-foe');
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

  // ── On enchaîne sur la vague suivante ───────────────────────────────────
  await act(async () => { findButton('continuer').click(); });
  await act(async () => { await wait(900); });
  assert.match(container.textContent, /Vague 2/);
  assert.equal(container.querySelectorAll('.rpg-ally').length, 4, 'l’équipe doit être au complet après le palier');
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
