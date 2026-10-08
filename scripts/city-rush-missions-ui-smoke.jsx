import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { dismissTitleMenu, openHubPage } from './vice-city-title-menu-dismiss.jsx';
import { getCityRushMission } from '../src/games/cityRushMissions.js';
import { worldProbe } from './vice-city-world-stub.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();

// Le compte à rebours (≈ 3 s) est raccourci pour ne pas ralentir la vérif.
function patchTimers() {
  const original = window.setTimeout;
  window.setTimeout = (handler, delay, ...args) => original.call(window, handler, Math.min(Number(delay) || 0, 10), ...args);
  return { restore: () => { window.setTimeout = original; } };
}

const click = (el) => act(async () => { el.click(); });
function mustFind(node, selector, label) {
  const el = node.querySelector(selector);
  if (!el) throw new Error(`élément introuvable : ${selector} (${label})`);
  return el;
}
/** Cherche un bouton par son texte (les libellés changent selon le chapitre). */
function findByText(node, selector, pattern) {
  return [...node.querySelectorAll(selector)].find((el) => pattern.test(squash(el.textContent)));
}
const settle = (ms = 20) => act(async () => { await sleep(ms); });

async function mountPage(node) {
  const root = createRoot(node);
  await act(async () => root.render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/jeu/vice-city-rush']}>
        <ViceCityRushPage />
      </MemoryRouter>
    </AuthProvider>,
  ));
  await settle(30);
  await dismissTitleMenu(node);
  return root;
}


export async function checkCityRushMissionsUi(assert) {
  window.localStorage.clear();
  const node = document.createElement('div');
  document.body.append(node);
  const root = await mountPage(node);
  const timers = patchTimers();
  try {
    await openHubPage(node, 'MISSIONS');
    await click(mustFind(node, '.cr-mission-card:not(:disabled)', 'première mission'));
    assert.match(node.querySelector('.cr-mission-briefing-facts').textContent, /INTERCEPTEUR DE POLICE/);
    const rules = getCityRushMission('dealer-pursuit').rules;
    for (let run = 0; run < 2; run++) {
      await click(findByText(node, '.city-rush-start-button', /LANCER LA MISSION/));
      for (let attempt = 0; attempt < 80 && !worldProbe.props.active; attempt++) await settle(15);
      const props = worldProbe.props;
      assert.equal(props.active, true);
      assert.equal(props.carId, rules.playerCarId);
      assert.equal(props.raceFormat, 'laps');
      for (const key of ['policePlayerLook', 'playerRole', 'weaponsEnabled', 'policeEnabled', 'startingPistolAmmo', 'missionTargetId', 'missionTargetLeadMin', 'missionTargetLeadMax']) {
        assert.equal(props.storyRules[key], rules[key], key + ' arrive jusqu’au monde');
      }
      assert.deepEqual(props.roster.map(r => r.id), ['player', 'dealer']);
      assert.equal(props.roster[0].lane, props.roster[1].lane);
      await act(async () => props.onHud({
        inventory: { pistol: 7 }, racers: [{ id: 'dealer', health: 15 }],
        playerHealth: 23, playerHealthMax: 23, police: [],
      }));
      const trigger = mustFind(node, '.city-rush-machine-gun-button', 'bouton de tir');
      assert.equal(trigger.disabled, false, 'le tir est accessible avec le chargeur de départ');
      worldProbe.actions.length = 0;
      for (const type of ['pointerdown', 'pointerup']) {
        await act(async () => trigger.dispatchEvent(new window.MouseEvent(type, { bubbles: true, button: 0 })));
      }
      assert.deepEqual(worldProbe.actions, ['pistol-down', 'pistol-up']);
      // Échec volontaire pour vérifier le même parcours lors d’un nouvel essai.
      await act(async () => props.onFinish({
        city: 'vice-city', laps: 3, distance: 4800, rank: 2, score: 0,
        racers: [{ id: 'player', health: 23 }, { id: 'dealer', health: 15 }],
      }));
      if (run === 0) {
        const retry = findByText(node, 'button', /REJOUER LE BRIEFING/);
        assert.ok(retry, 'le débrief permet de rejouer');
        await click(retry);
      }
    }
    await click(findByText(node, 'button', /RETOUR AUX MISSIONS/));
    assert.equal(worldProbe.props.storyRules, null, 'la livrée et le chargeur ne fuient pas dans les courses libres');
  } finally {
    timers.restore();
    await act(async () => root.unmount());
    node.remove();
  }
}
